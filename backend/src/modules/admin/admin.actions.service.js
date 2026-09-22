import mongoose from 'mongoose';
import { ApiError } from '../../utils/ApiError.js';
import { logger } from '../../utils/logger.js';
import { AdminActionItem } from './admin.models.js';
import { writeAudit, approveVendor, rejectVendor, suspendVendor } from './admin.service.js';

/**
 * Making the Action Required Center actually DO something.
 *
 * Resolving an item used to flip a flag on the item itself and write an audit
 * row — nothing else. The vendor stayed unapproved, the support ticket stayed
 * open, the failed refund stayed failed. Since every item is derived from live
 * data, the collector then legitimately re-emitted it on the next read, so the
 * card an admin had just approved reappeared seconds later. Approving looked
 * broken because, underneath, it *was* doing nothing.
 *
 * Each handler performs the real operation on the real entity. The item is only
 * marked resolved once that succeeded — a handler that throws leaves the item
 * pending, which is the honest outcome: nothing happened, so the queue should
 * still show it.
 *
 * Handlers are keyed by the prefix of `sourceKey` ("vendor:<profileId>"), which
 * is the same key the collectors mint, so adding a collector and adding its
 * handler stay next to each other.
 */

/**
 * What Approve and Reject mean for each kind of item.
 *
 * Spelled out because the two buttons are not universally obvious — on a
 * moderation card "approve" means the CONTENT is fine, not that the report was
 * correct. These strings are returned to the UI so it can say what it did.
 */
export const ACTION_SEMANTICS = {
  vendor: { approve: 'Partner approved', reject: 'Partner application rejected' },
  support: { approve: 'Ticket marked resolved', reject: 'Ticket closed' },
  post_report: { approve: 'Report dismissed — post kept', reject: 'Post hidden' },
  return: { approve: 'Return approved and customer refunded', reject: 'Return rejected' },
  refund_failed: { approve: 'Refund retried', reject: 'Refund cancelled' },
  refund_unreversed: { approve: 'Partner earning clawed back', reject: 'Left as is' },
  compliance_breach: { approve: 'Business line suspended', reject: 'Left trading' },
  booking_unanswered: { approve: 'Acknowledged', reject: 'Dismissed' },
  undelivered: { approve: 'Acknowledged', reject: 'Dismissed' },
  stalled_order: { approve: 'Acknowledged', reject: 'Dismissed' },
};

const oid = (v) => (mongoose.isValidObjectId(v) ? v : null);

const handlers = {
  /* ── Partner approvals ─────────────────────────────────────────── */
  vendor: async (id, action, { actor, ip, force }) => {
    if (!oid(id)) throw ApiError.badRequest('This item points at a partner record that no longer exists');
    if (action === 'approve') {
      await approveVendor(actor, id, ip, { force: Boolean(force) });
      return { targetType: 'vendor', targetId: id };
    }
    await rejectVendor(actor, id, ip);
    return { targetType: 'vendor', targetId: id };
  },

  /* ── Support ───────────────────────────────────────────────────── */
  support: async (id, action, { actor }) => {
    const { SupportTicket } = await import('../support/supportTicket.model.js');
    const ticket = await SupportTicket.findById(oid(id));
    if (!ticket) throw ApiError.notFound('That support ticket no longer exists');
    ticket.status = action === 'approve' ? 'resolved' : 'closed';
    await ticket.save();

    const { notify } = await import('../../services/notify.js');
    await notify(ticket.userId, {
      title: action === 'approve' ? 'Your support ticket is resolved' : 'Your support ticket was closed',
      body: `Ticket ${ticket.ticketNo || ''} — ${ticket.subject}`,
      type: 'system',
      link: '/app/profile/support',
      data: { ticketId: String(ticket._id) },
    }).catch(() => {});

    return { targetType: 'support_ticket', targetId: id };
  },

  /* ── Moderation ────────────────────────────────────────────────── */
  post_report: async (id, action, { actor, ip }) => {
    const { Post, PostReport } = await import('../social/social.models.js');
    const post = await Post.findById(oid(id));
    if (!post) throw ApiError.notFound('That post no longer exists');

    if (action === 'approve') {
      // The content is fine. Clear the reports so it stops being re-collected.
      post.status = 'visible';
      await post.save();
      await PostReport.deleteMany({ postId: post._id });
    } else {
      post.status = 'hidden';
      await post.save();
    }
    await writeAudit(actor, {
      action: `post.${action === 'approve' ? 'restore' : 'hide'}`,
      targetType: 'post',
      targetId: id,
      after: { status: post.status },
      ip,
    });
    return { targetType: 'post', targetId: id };
  },

  /* ── Returns ───────────────────────────────────────────────────── */
  return: async (id, action, { actor, ip, note }) => {
    const { resolveReturn } = await import('./admin.ops.service.js');
    const res = await resolveReturn(actor, id, action === 'approve' ? 'approve' : 'reject', ip, {
      reason: note || '',
    });
    return { targetType: 'order', targetId: id, detail: res };
  },

  /* ── Money that did not move ───────────────────────────────────── */
  refund_failed: async (id, action, { actor }) => {
    const { retryRefund } = await import('../payment/refund.service.js');
    const { Refund } = await import('../payment/refund.model.js');

    if (action !== 'approve') {
      /*
       * Cancelling a failed refund is a deliberate write-off of money the
       * customer is owed, so it is recorded as such rather than quietly
       * dismissed from the queue.
       */
      const refund = await Refund.findById(oid(id));
      if (!refund) throw ApiError.notFound('That refund no longer exists');
      refund.status = 'cancelled';
      await refund.save();
      return { targetType: 'refund', targetId: id, detail: { status: 'cancelled' } };
    }

    const refund = await retryRefund(id, actor);
    if (refund.status !== 'processed') {
      // Still failing — leave the item pending so somebody looks at it again.
      throw ApiError.serviceUnavailable(
        refund.failureReason || 'The refund failed again at the payment gateway'
      );
    }
    return { targetType: 'refund', targetId: id, detail: { status: refund.status } };
  },

  refund_unreversed: async (id, action) => {
    if (action !== 'approve') return { targetType: 'refund', targetId: id };
    const { retryLedgerReversal } = await import('../payment/refund.service.js');
    const refund = await retryLedgerReversal(id);
    if (!refund.ledgerReversed) {
      throw ApiError.serviceUnavailable(refund.ledgerReversalError || 'The ledger reversal failed again');
    }
    return { targetType: 'refund', targetId: id, detail: { ledgerReversed: true } };
  },

  /* ── Compliance ────────────────────────────────────────────────── */
  compliance_breach: async (rest, action, { actor, ip, note }) => {
    if (action !== 'approve') return { targetType: 'vendor', targetId: rest };

    // sourceKey is `compliance_breach:<vendorUserId>:<vendorType>`.
    const [vendorUserId, vendorType] = String(rest).split(':');
    const { VendorProfile } = await import('../vendor/vendor.models.js');
    const profile = await VendorProfile.findOne({
      userId: oid(vendorUserId),
      ...(vendorType && vendorType !== 'account' ? { vendorType } : {}),
    }).select('_id userId vendorType businessName');
    if (!profile) throw ApiError.notFound('That partner business line no longer exists');

    await suspendVendor(actor, profile._id, ip);

    const { notify } = await import('../../services/notify.js');
    await notify(profile.userId, {
      title: 'Your account has been suspended',
      body: `${profile.businessName || 'Your business'} (${profile.vendorType}) is suspended for repeated service failures.${note ? ` ${note}` : ''} Contact support to appeal.`,
      type: 'system',
      link: '/vendor/compliance',
      data: { kind: 'suspended', vendorType: profile.vendorType || '' },
    }).catch(() => {});

    return { targetType: 'vendor', targetId: String(profile._id) };
  },

  /*
   * Operational items nobody can fix with one click — an undelivered service
   * needs a phone call, not a button. Resolving them is an explicit
   * acknowledgement, which is worth recording: it says a human looked.
   */
  booking_unanswered: async (id) => ({ targetType: 'booking', targetId: id, acknowledged: true }),
  undelivered: async (id) => ({ targetType: 'booking', targetId: id, acknowledged: true }),
  stalled_order: async (id) => ({ targetType: 'order', targetId: id, acknowledged: true }),
};

/**
 * Resolve one action item, performing the real work behind it.
 *
 * `force` is passed through to partner approval so an operator can wave through
 * incomplete KYC deliberately — it lands in the audit trail as a forced
 * approval, exactly as it does from the Vendors screen.
 */
export async function resolveActionItem(actor, actionId, { action = 'approve', note = '', force = false } = {}, ip = '') {
  /*
   * Lookup is by id or `sourceKey` only. It used to fall back to matching a
   * hardcoded seed list and INSERT a resolved copy of a fabricated item, so
   * resolving something that did not exist quietly created a record saying an
   * admin had approved it.
   */
  let item = null;
  if (mongoose.isValidObjectId(actionId)) item = await AdminActionItem.findById(actionId);
  if (!item) item = await AdminActionItem.findOne({ sourceKey: actionId });
  if (!item) item = await AdminActionItem.findOne({ targetId: String(actionId) });
  if (!item) throw ApiError.notFound(`Action item '${actionId}' not found`);

  /*
   * Claim it atomically before doing any work.
   *
   * The handlers below move real money — retrying a failed refund is not
   * idempotent — so two operators clicking Approve at the same moment must not
   * both get through. Whoever loses the race is told, rather than silently
   * running the operation a second time.
   */
  const claimed = await AdminActionItem.findOneAndUpdate(
    { _id: item._id, status: 'pending' },
    { $set: { status: 'processing' } },
    { new: true }
  );
  if (!claimed) {
    const current = await AdminActionItem.findById(item._id);
    throw ApiError.conflict(
      current?.status === 'processing'
        ? 'Another admin is handling this item right now'
        : `This item was already ${current?.status || 'handled'} by ${current?.resolvedBy || 'an admin'}`
    );
  }
  item = claimed;

  const [prefix, ...restParts] = String(item.sourceKey || '').split(':');
  const rest = restParts.join(':');
  const handler = handlers[prefix];

  let outcome = null;
  if (handler) {
    /*
     * The error is re-thrown, never swallowed. If the underlying operation
     * fails the caller has to know and the item has to go back in the queue —
     * the whole bug this replaces was an item reporting success while nothing
     * happened underneath it.
     */
    try {
      outcome = await handler(rest, action, { actor, ip, note, force });
    } catch (err) {
      await AdminActionItem.updateOne({ _id: item._id }, { $set: { status: 'pending' } });
      throw err;
    }
  } else if (item.sourceKey) {
    logger.warn(`resolveActionItem: no handler for source '${prefix}' — resolving the item only`);
  }

  item.status = action === 'approve' ? 'approved' : 'rejected';
  item.resolvedBy = actor?.name || actor?.email || 'admin';
  item.resolvedAt = new Date();
  if (note) item.note = note;
  await item.save();

  const semantics = ACTION_SEMANTICS[prefix]?.[action];

  await writeAudit(actor, {
    action: `action_item.${action}`,
    targetType: outcome?.targetType || item.category.toLowerCase().replace(/\s+/g, '_'),
    targetId: outcome?.targetId || String(item._id),
    before: { status: 'pending' },
    after: { status: item.status, note, effect: semantics || null },
    ip,
  });

  return {
    id: String(item._id),
    status: item.status,
    effect: semantics || null,
    /* What actually happened, so the UI can say it rather than guess. */
    message: semantics
      ? `${item.title}: ${semantics}`
      : `Action item '${item.title}' ${item.status} successfully`,
  };
}

export default resolveActionItem;
