import { logger } from '../../utils/logger.js';
import { notify } from '../../services/notify.js';
import { Booking } from '../booking/booking.model.js';
import { Order } from '../order/order.model.js';
import { AdminActionItem } from '../admin/admin.models.js';
import { getPolicy, recordViolation } from './compliance.service.js';

/**
 * Scheduled detection of partners who took a customer's money and then did
 * nothing with it.
 *
 * These are the cases nobody was watching: a request left unanswered, a paid
 * booking that sails past its service date still sitting on `confirmed`, an
 * order that never ships. Each was invisible until a customer complained,
 * which meant the platform always found out last.
 *
 * Run from `server.js` on the same interval-and-claim pattern the commission
 * scheduler already uses. Each sweep is idempotent — the unique index on
 * (vendor, type, ref) means re-running cannot double-count a partner — so a
 * missed tick or an overlapping run on another instance is harmless.
 */

/** Expire booking requests the partner never answered, and refund the customer. */
export async function sweepUnansweredBookings() {
  const { expireUnansweredBookings } = await import('../booking/booking.service.js');
  const { resolveBookingVendor } = await import('../booking/booking.service.js');

  // Capture who owned each one BEFORE expiry rewrites the booking.
  const pending = await Booking.find({
    status: 'awaiting_vendor',
    vendorRespondBy: { $ne: null, $lt: new Date() },
  })
    .limit(200)
    .lean();

  const owners = new Map();
  for (const b of pending) {
    const { vendorId, vendorType } = await resolveBookingVendor(b);
    if (vendorId) owners.set(String(b._id), { vendorId, vendorType, bookingNo: b.bookingNo });
  }

  const results = await expireUnansweredBookings();

  for (const [bookingId, owner] of owners) {
    await recordViolation({
      vendorId: owner.vendorId,
      vendorType: owner.vendorType,
      type: 'no_response',
      refType: 'booking',
      refId: bookingId,
      refLabel: `Booking ${owner.bookingNo}`,
      reason: 'Did not respond to a booking request in time',
      detail: 'The request expired unanswered and the customer was refunded automatically.',
      customerImpact: 'Customer waited, then had their booking cancelled and refunded.',
      source: 'auto',
    });
  }

  return { expired: results.length, violations: owners.size };
}

/**
 * Paid bookings that passed their service date and were never started or
 * completed — the "vendor took the booking and did nothing" case.
 *
 * Deliberately measured from the service date plus a configurable grace period,
 * not from booking time, so a partner who is simply slow to update their panel
 * on the day is not punished for it.
 */
export async function sweepUndeliveredServices() {
  const { resolveBookingVendor } = await import('../booking/booking.service.js');
  const policy = await getPolicy();
  const graceMs = policy.sla.serviceCompletionGraceDays * 86_400_000;
  const cutoff = new Date(Date.now() - graceMs);
  const cutoffYmd = cutoff.toISOString().slice(0, 10);

  /*
   * Match on `startAt` where the vertical sets it (doctor bookings resolve a
   * real UTC instant) and fall back to the date string otherwise. Daycare and
   * grooming only carry `schedule.startDate`.
   */
  /*
   * Bounded below by `enforcementStartsAt` as well as above by the grace
   * period. Without the lower bound, switching compliance on would scan the
   * entire history — every abandoned test booking and every pre-launch row —
   * and fire a "we are checking on your booking" notification at customers
   * about bookings from months ago.
   */
  const stale = await Booking.find({
    status: { $in: ['confirmed', 'awaiting_vendor'] },
    createdAt: { $gte: policy.enforcementStartsAt },
    $or: [
      { 'schedule.startAt': { $ne: null, $lt: cutoff } },
      { 'schedule.startAt': null, 'schedule.startDate': { $ne: null, $lt: cutoffYmd } },
    ],
  })
    .populate('userId', 'name phone')
    .limit(200);

  let flagged = 0;
  for (const booking of stale) {
    const { vendorId, vendorType } = await resolveBookingVendor(booking);
    if (!vendorId) continue;

    const recorded = await recordViolation({
      vendorId,
      vendorType,
      type: 'service_not_delivered',
      refType: 'booking',
      refId: booking._id,
      refLabel: `Booking ${booking.bookingNo}`,
      reason: 'Paid booking passed its service date with no service recorded',
      detail: `Scheduled ${booking.schedule?.startDate || 'unknown'} ${booking.schedule?.time || ''}. Still "${booking.status}" ${policy.sla.serviceCompletionGraceDays} day(s) later.`,
      customerImpact: 'Customer paid and may have received nothing.',
      source: 'auto',
      occurredAt: booking.schedule?.startAt || new Date(),
    });
    if (!recorded) continue;
    flagged += 1;

    /*
     * Admin is told about the BOOKING as well as the partner. The partner's
     * standing is a trend; this is a specific customer who is out of pocket
     * right now and needs somebody to intervene today.
     */
    const sourceKey = `undelivered:${booking._id}`;
    await AdminActionItem.updateOne(
      { sourceKey },
      {
        $set: {
          sourceKey,
          category: 'Operations',
          type: 'Service Not Delivered',
          title: `${booking.bookingNo} — paid but not delivered`,
          subtitle: `${booking.userId?.name || 'Customer'} · ${booking.type} · ${booking.schedule?.startDate || ''}`,
          details:
            'This booking passed its service date without being started or completed. Contact the partner, or cancel and refund the customer.',
          priority: 'Urgent',
          status: 'pending',
          targetId: String(booking._id),
          navPath: '/admin/operations/bookings',
          amount: `Rs ${Math.round((booking.amounts?.total || 0) / 100).toLocaleString('en-IN')}`,
          applicant: booking.userId?.name || '',
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );

    await notify(booking.userId?._id || booking.userId, {
      title: 'We are checking on your booking',
      body: `Your ${booking.type} booking ${booking.bookingNo} has not been marked complete. Our team is following up with the partner.`,
      type: 'booking',
      link: '/app/profile/bookings',
      data: { bookingId: String(booking._id) },
    }).catch(() => {});
  }

  return { checked: stale.length, flagged };
}

/** Paid orders sitting unshipped past the fulfilment window. */
export async function sweepStalledOrders() {
  const policy = await getPolicy();
  const cutoff = new Date(Date.now() - policy.sla.orderFulfilmentDays * 86_400_000);

  const stalled = await Order.find({
    status: { $in: ['placed', 'confirmed', 'packed'] },
    createdAt: { $lt: cutoff, $gte: policy.enforcementStartsAt },
  })
    .populate('userId', 'name')
    .limit(200);

  let flagged = 0;
  for (const order of stalled) {
    if (!order.vendorId) continue; // platform-fulfilled, nobody to score

    const recorded = await recordViolation({
      vendorId: order.vendorId,
      vendorType: 'shop',
      type: 'order_not_fulfilled',
      refType: 'order',
      refId: order._id,
      refLabel: `Order ${order.orderNo}`,
      reason: 'Paid order not shipped within the fulfilment window',
      detail: `Placed ${new Date(order.createdAt).toLocaleDateString('en-IN')}, still "${order.status}" after ${policy.sla.orderFulfilmentDays} day(s).`,
      customerImpact: 'Customer paid and is still waiting for dispatch.',
      source: 'auto',
    });
    if (!recorded) continue;
    flagged += 1;

    const sourceKey = `stalled_order:${order._id}`;
    await AdminActionItem.updateOne(
      { sourceKey },
      {
        $set: {
          sourceKey,
          category: 'Operations',
          type: 'Order Not Fulfilled',
          title: `${order.orderNo} — unshipped past SLA`,
          subtitle: `${order.userId?.name || 'Customer'} · ${order.status}`,
          details: 'This paid order has not shipped inside the fulfilment window. Chase the seller or cancel and refund.',
          priority: 'High',
          status: 'pending',
          targetId: String(order._id),
          navPath: '/admin/operations/orders',
          amount: `Rs ${Math.round((order.amounts?.total || 0) / 100).toLocaleString('en-IN')}`,
          applicant: order.userId?.name || '',
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
  }

  return { checked: stalled.length, flagged };
}

/** Everything, in one call. Safe to run repeatedly. */
export async function runComplianceSweeps() {
  const out = {};
  for (const [name, fn] of [
    ['unansweredBookings', sweepUnansweredBookings],
    ['undeliveredServices', sweepUndeliveredServices],
    ['stalledOrders', sweepStalledOrders],
  ]) {
    try {
      out[name] = await fn();
    } catch (err) {
      out[name] = { error: err.message };
      logger.warn(`Compliance sweep ${name} failed: ${err.message}`);
    }
  }
  return out;
}
