import mongoose from 'mongoose';
import { ApiError } from '../../utils/ApiError.js';
import { logger } from '../../utils/logger.js';
import { notify } from '../../services/notify.js';
import { VendorProfile } from '../vendor/vendor.models.js';
import { AdminActionItem } from '../admin/admin.models.js';
import {
  VendorViolation,
  CompliancePolicy,
  VIOLATION_CATALOGUE,
  VIOLATION_TYPES,
  defaultRules,
} from './compliance.models.js';

/**
 * Partner compliance engine.
 *
 * Records what went wrong, scores it against a policy an operator controls, and
 * raises the right alarm when a business line crosses the line. Deliberately
 * conservative in two ways:
 *
 *   - Recording a violation never throws into the operation that caused it. A
 *     partner cancelling a booking must still cancel it cleanly even if the
 *     compliance write fails; the customer's refund is not held hostage to
 *     bookkeeping.
 *   - Crossing the threshold does not, by default, suspend anybody. It raises an
 *     Urgent item for a human, because supply is thin at launch and an automated
 *     suspension of a good partner over a bad week is worse than a slow one.
 *     Operators flip `actionAtThreshold` to `suspend` when they are ready.
 */

/* ── Policy ───────────────────────────────────────────────────────── */

/** The policy document, created from catalogue defaults on first read. */
export async function getPolicy() {
  let policy = await CompliancePolicy.findOne({ singleton: 'policy' });
  if (!policy) {
    policy = await CompliancePolicy.create({ singleton: 'policy', rules: defaultRules() });
  }
  // A rule added to the catalogue after the policy was created must not be
  // silently unscored — backfill it at its default rather than counting zero.
  const known = new Set(policy.rules.map((r) => r.type));
  const missing = VIOLATION_TYPES.filter((t) => !known.has(t));
  if (missing.length) {
    policy.rules.push(
      ...missing.map((type) => ({ type, points: VIOLATION_CATALOGUE[type].defaultPoints, enabled: true }))
    );
    await policy.save();
  }
  return policy;
}

/** Policy shaped for the Admin screen, with the catalogue text joined in. */
export async function getPolicyView() {
  const policy = await getPolicy();
  return {
    threshold: policy.threshold,
    windowDays: policy.windowDays,
    actionAtThreshold: policy.actionAtThreshold,
    warnAtPoints: policy.warnAtPoints,
    enforcementStartsAt: policy.enforcementStartsAt,
    sla: policy.sla,
    updatedByName: policy.updatedByName,
    updatedAt: policy.updatedAt,
    rules: policy.rules.map((r) => ({
      type: r.type,
      points: r.points,
      enabled: r.enabled,
      label: VIOLATION_CATALOGUE[r.type]?.label || r.type,
      description: VIOLATION_CATALOGUE[r.type]?.description || '',
      severity: VIOLATION_CATALOGUE[r.type]?.severity || 'medium',
      autoDetected: VIOLATION_CATALOGUE[r.type]?.autoDetected ?? false,
    })),
  };
}

/** Update the policy. Existing violations keep the points they were scored at. */
export async function updatePolicy(actor, patch) {
  const policy = await getPolicy();
  const before = {
    threshold: policy.threshold,
    windowDays: policy.windowDays,
    actionAtThreshold: policy.actionAtThreshold,
  };

  if (patch.threshold != null) policy.threshold = patch.threshold;
  if (patch.windowDays != null) policy.windowDays = patch.windowDays;
  if (patch.actionAtThreshold) policy.actionAtThreshold = patch.actionAtThreshold;
  if (patch.warnAtPoints != null) policy.warnAtPoints = patch.warnAtPoints;
  if (patch.enforcementStartsAt) policy.enforcementStartsAt = new Date(patch.enforcementStartsAt);
  if (patch.sla) policy.sla = { ...policy.sla.toObject(), ...patch.sla };

  if (Array.isArray(patch.rules)) {
    const byType = new Map(patch.rules.map((r) => [r.type, r]));
    policy.rules = policy.rules.map((r) => {
      const incoming = byType.get(r.type);
      if (!incoming) return r;
      return {
        type: r.type,
        points: incoming.points != null ? incoming.points : r.points,
        enabled: incoming.enabled != null ? incoming.enabled : r.enabled,
      };
    });
  }

  policy.updatedByName = actor?.name || actor?.email || 'admin';
  await policy.save();
  return { before, policy: await getPolicyView() };
}

/* ── Recording ────────────────────────────────────────────────────── */

/**
 * Record a violation against one of a partner's business lines.
 *
 * Returns the violation and the line's resulting standing, or `null` when the
 * rule is switched off or the violation was already recorded for this
 * reference. Never throws — see the note at the top of the file.
 */
export async function recordViolation({
  vendorId,
  vendorType = null,
  type,
  refType = 'manual',
  refId = null,
  refLabel = '',
  reason,
  detail = '',
  customerImpact = '',
  source = 'auto',
  actor = null,
  occurredAt = null,
}) {
  if (!vendorId || !VIOLATION_CATALOGUE[type]) return null;

  try {
    const policy = await getPolicy();
    const rule = policy.rules.find((r) => r.type === type);
    if (rule && rule.enabled === false) return null; // operator switched it off

    // Never score something that predates the rules — see `enforcementStartsAt`.
    const when = occurredAt ? new Date(occurredAt) : new Date();
    if (policy.enforcementStartsAt && when < policy.enforcementStartsAt) return null;

    const points = rule?.points ?? VIOLATION_CATALOGUE[type].defaultPoints;
    const profile = vendorType
      ? await VendorProfile.findOne({ userId: vendorId, vendorType }).select('_id businessName')
      : null;

    const violation = await VendorViolation.create({
      vendorId,
      vendorType,
      vendorProfileId: profile?._id || null,
      type,
      points,
      severity: VIOLATION_CATALOGUE[type].severity,
      refType,
      refId,
      refLabel,
      reason,
      detail,
      customerImpact,
      source,
      raisedByName: actor?.name || actor?.email || 'System',
      occurredAt: occurredAt || new Date(),
    });

    const standing = await evaluateStanding(vendorId, vendorType, { policy });
    await warnVendor(violation, standing, profile);
    if (standing.breached) await handleBreach(vendorId, vendorType, standing, policy, profile);

    return { violation, standing };
  } catch (err) {
    // Duplicate means the sweep already recorded this one — expected, not an error.
    if (err.code === 11000) return null;
    logger.error(`recordViolation(${type}) failed for vendor ${vendorId}: ${err.message}`);
    return null;
  }
}

/* ── Standing ─────────────────────────────────────────────────────── */

/**
 * A business line's current compliance position: active points inside the
 * rolling window, how much headroom is left, and whether it has tripped.
 */
export async function evaluateStanding(vendorId, vendorType = null, { policy = null } = {}) {
  const p = policy || (await getPolicy());
  const since = new Date(Date.now() - p.windowDays * 86_400_000);

  const filter = {
    vendorId,
    status: { $in: ['active', 'upheld'] },
    occurredAt: { $gte: since },
  };
  if (vendorType) filter.vendorType = vendorType;

  const violations = await VendorViolation.find(filter).sort({ occurredAt: -1 }).lean();
  const points = violations.reduce((sum, v) => sum + (v.points || 0), 0);

  return {
    vendorId: String(vendorId),
    vendorType,
    points,
    threshold: p.threshold,
    remaining: Math.max(0, p.threshold - points),
    breached: points >= p.threshold,
    shouldWarn: points >= p.warnAtPoints,
    windowDays: p.windowDays,
    actionAtThreshold: p.actionAtThreshold,
    count: violations.length,
    violations: violations.map(serializeViolation),
  };
}

/** What the partner sees in their own panel. */
export async function vendorStanding(vendorId, vendorType = null) {
  const policy = await getPolicy();
  const standing = await evaluateStanding(vendorId, vendorType, { policy });
  const unacknowledged = standing.violations.filter((v) => !v.acknowledgedAt && v.status !== 'forgiven');

  /*
   * Every business line on the account, each with its own standing.
   *
   * A partner running grooming AND daycare has two independent records, and
   * showing only the line whose panel they happen to have open would hide a
   * suspension on the other one. They need to see both on their own page.
   */
  const profiles = await VendorProfile.find({ userId: vendorId })
    .select('vendorType businessName approvalStatus')
    .lean();

  const lines = await Promise.all(
    profiles.map(async (p) => {
      const lineStanding = await evaluateStanding(vendorId, p.vendorType, { policy });
      return {
        vendorType: p.vendorType,
        businessName: p.businessName || '',
        approvalStatus: p.approvalStatus,
        suspended: p.approvalStatus === 'suspended',
        points: lineStanding.points,
        threshold: lineStanding.threshold,
        remaining: lineStanding.remaining,
        breached: lineStanding.breached,
        count: lineStanding.count,
        warning: buildWarningText(lineStanding),
      };
    })
  );

  const active = vendorType ? profiles.find((p) => p.vendorType === vendorType) : profiles[0];

  return {
    ...standing,
    unacknowledgedCount: unacknowledged.length,
    /*
     * The partner-facing message. Blunt on purpose: a warning nobody reads as a
     * warning does not change behaviour, and the point of this system is that
     * partners understand the consequence BEFORE they lose their account.
     */
    warning: buildWarningText(standing),
    profile: active
      ? {
          vendorType: active.vendorType,
          businessName: active.businessName || '',
          approvalStatus: active.approvalStatus,
          suspended: active.approvalStatus === 'suspended',
        }
      : null,
    lines,
    enforcementStartsAt: policy.enforcementStartsAt,
  };
}

/**
 * The partner's compliance correspondence: warnings, withdrawals, suspensions
 * and reinstatements, newest first.
 *
 * Read back out of their notifications rather than kept in a second log — these
 * are exactly the messages that were already sent to them, so the page shows
 * what they were actually told rather than a parallel reconstruction of it.
 */
export async function vendorComplianceUpdates(vendorId, { limit = 30 } = {}) {
  const { Notification } = await import('../notification/notification.model.js');
  const rows = await Notification.find({
    userId: vendorId,
    'data.kind': { $in: ['compliance_warning', 'compliance_forgiven', 'suspended', 'reinstated'] },
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return rows.map((n) => ({
    id: String(n._id),
    kind: n.data?.kind || 'compliance_warning',
    title: n.title,
    body: n.body,
    read: n.read,
    vendorType: n.data?.vendorType || null,
    createdAt: n.createdAt,
  }));
}

function buildWarningText(standing) {
  if (!standing.count) return null;
  if (standing.breached) {
    return standing.actionAtThreshold === 'suspend'
      ? 'Your account has been suspended for repeated service failures. Contact Tail Circle support.'
      : 'You have reached the service-failure limit. Your account is under review and may be suspended.';
  }
  if (!standing.shouldWarn) return null;
  const left = standing.remaining;
  return `Service warning: ${standing.points} of ${standing.threshold} points recorded in the last ${standing.windowDays} days. ${left} more and your account goes under review for suspension.`;
}

/* ── Consequences ─────────────────────────────────────────────────── */

/** Tell the partner, in their panel and on their phone, the moment it happens. */
async function warnVendor(violation, standing, profile) {
  const cat = VIOLATION_CATALOGUE[violation.type];
  const headline = standing.breached
    ? 'Account under review — service failure limit reached'
    : `Service warning: ${cat.label}`;

  await notify(violation.vendorId, {
    title: headline,
    body: standing.breached
      ? `${violation.reason}. You have reached ${standing.points}/${standing.threshold} points and your account is now under review.`
      : `${violation.reason}. ${standing.points}/${standing.threshold} points in the last ${standing.windowDays} days — ${standing.remaining} more triggers a review.`,
    type: 'system',
    link: '/vendor/compliance',
    data: {
      violationId: String(violation._id),
      kind: 'compliance_warning',
      points: String(standing.points),
      threshold: String(standing.threshold),
      breached: String(standing.breached),
    },
  }).catch(() => {});

  logger.warn(
    `Compliance: ${profile?.businessName || violation.vendorId} (${violation.vendorType || 'account'}) ` +
      `+${violation.points}pt ${violation.type} -> ${standing.points}/${standing.threshold}`
  );
}

/**
 * Threshold crossed.
 *
 * Under the default `flag` policy this raises an Urgent item in Admin's queue
 * with everything needed to decide, and leaves the partner trading. Under
 * `suspend` it stops the line immediately and tells Admin it did.
 */
async function handleBreach(vendorId, vendorType, standing, policy, profile) {
  const name = profile?.businessName || 'Partner';
  const sourceKey = `compliance_breach:${vendorId}:${vendorType || 'account'}`;

  if (policy.actionAtThreshold === 'suspend' && profile?._id) {
    try {
      const { suspendVendor } = await import('../admin/admin.service.js');
      await suspendVendor(
        { name: 'Compliance system' },
        profile._id,
        'system',
      );
      logger.warn(`Compliance: auto-suspended ${name} (${vendorType}) at ${standing.points} points`);
    } catch (err) {
      logger.error(`Compliance auto-suspend failed for ${vendorId}: ${err.message}`);
    }
  }

  const suspended = policy.actionAtThreshold === 'suspend';
  await AdminActionItem.updateOne(
    { sourceKey },
    {
      $set: {
        sourceKey,
        category: 'Compliance',
        type: suspended ? 'Auto-Suspended Partner' : 'Partner Under Review',
        title: `${name} — ${standing.points}/${standing.threshold} service-failure points`,
        subtitle: `${vendorType || 'account'} · ${standing.count} violation(s) in ${standing.windowDays} days`,
        details: suspended
          ? `This business line has been automatically suspended. Review the violations and reinstate if the suspension is not warranted.`
          : `This business line has reached the service-failure limit. Review the violations and decide whether to suspend.`,
        priority: 'Urgent',
        status: 'pending',
        targetId: String(vendorId),
        navPath: '/admin/vendors/compliance',
        applicant: name,
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );
}

/* ── Admin review ─────────────────────────────────────────────────── */

/** Stop a violation counting — a genuine emergency, or the customer at fault. */
export async function forgiveViolation(actor, violationId, note = '') {
  return reviewViolation(actor, violationId, 'forgiven', note);
}

/** Confirm a violation after review. It keeps counting, but on the record. */
export async function upholdViolation(actor, violationId, note = '') {
  return reviewViolation(actor, violationId, 'upheld', note);
}

async function reviewViolation(actor, violationId, status, note) {
  if (!mongoose.isValidObjectId(violationId)) throw ApiError.badRequest('Invalid violation id');
  const violation = await VendorViolation.findById(violationId);
  if (!violation) throw ApiError.notFound('Violation not found');

  violation.status = status;
  violation.reviewedById = actor?.id || actor?._id || null;
  violation.reviewedByName = actor?.name || actor?.email || 'admin';
  violation.reviewedAt = new Date();
  violation.reviewNote = note;
  await violation.save();

  const standing = await evaluateStanding(violation.vendorId, violation.vendorType);

  // Forgiving may take a line back under the limit; withdraw the breach flag.
  if (!standing.breached) {
    await AdminActionItem.deleteOne({
      sourceKey: `compliance_breach:${violation.vendorId}:${violation.vendorType || 'account'}`,
      status: 'pending',
    });
  }

  if (status === 'forgiven') {
    await notify(violation.vendorId, {
      title: 'Service warning withdrawn',
      body: `A recorded service failure (${VIOLATION_CATALOGUE[violation.type]?.label}) has been withdrawn after review.`,
      type: 'system',
      link: '/vendor/compliance',
      data: { violationId: String(violation._id), kind: 'compliance_forgiven' },
    }).catch(() => {});
  }

  return { violation: serializeViolation(violation.toObject()), standing };
}

/** Partner acknowledges the warnings in their panel. */
export async function acknowledgeViolations(vendorId, vendorType = null) {
  const filter = { vendorId, acknowledgedAt: null };
  if (vendorType) filter.vendorType = vendorType;
  const res = await VendorViolation.updateMany(filter, { $set: { acknowledgedAt: new Date() } });
  return { acknowledged: res.modifiedCount };
}

/* ── Listing ──────────────────────────────────────────────────────── */

export async function listViolations({
  vendorId,
  vendorType,
  type,
  status,
  severity,
  from,
  to,
  page = 1,
  limit = 50,
} = {}) {
  const filter = {};
  if (vendorId && mongoose.isValidObjectId(vendorId)) filter.vendorId = vendorId;
  if (vendorType && vendorType !== 'All') filter.vendorType = vendorType;
  if (type && type !== 'All') filter.type = type;
  if (status && status !== 'All') filter.status = status;
  if (severity && severity !== 'All') filter.severity = severity;
  if (from || to) {
    filter.occurredAt = {};
    if (from) filter.occurredAt.$gte = new Date(from);
    if (to) filter.occurredAt.$lte = new Date(`${to}T23:59:59.999Z`);
  }

  const perPage = Math.min(200, Math.max(1, Number(limit) || 50));
  const current = Math.max(1, Number(page) || 1);

  const [rows, total] = await Promise.all([
    VendorViolation.find(filter)
      .populate('vendorId', 'name phone email')
      .sort({ occurredAt: -1 })
      .skip((current - 1) * perPage)
      .limit(perPage)
      .lean(),
    VendorViolation.countDocuments(filter),
  ]);

  return {
    rows: rows.map((v) => ({
      ...serializeViolation(v),
      vendorName: v.vendorId?.name || 'Partner',
      vendorPhone: v.vendorId?.phone || '—',
    })),
    total,
    page: current,
    pages: Math.ceil(total / perPage) || 1,
  };
}

/**
 * Every business line ranked by compliance risk — the screen an operator opens
 * to answer "which partners are about to become a problem?".
 */
export async function complianceLeaderboard({ limit = 100 } = {}) {
  const policy = await getPolicy();
  const since = new Date(Date.now() - policy.windowDays * 86_400_000);

  const grouped = await VendorViolation.aggregate([
    { $match: { status: { $in: ['active', 'upheld'] }, occurredAt: { $gte: since } } },
    {
      $group: {
        _id: { vendorId: '$vendorId', vendorType: '$vendorType' },
        points: { $sum: '$points' },
        count: { $sum: 1 },
        lastAt: { $max: '$occurredAt' },
        types: { $addToSet: '$type' },
      },
    },
    { $sort: { points: -1, lastAt: -1 } },
    { $limit: limit },
  ]);
  if (!grouped.length) return { rows: [], threshold: policy.threshold, windowDays: policy.windowDays };

  const vendorIds = grouped.map((g) => g._id.vendorId);
  const profiles = await VendorProfile.find({ userId: { $in: vendorIds } })
    .select('userId vendorType businessName approvalStatus rating')
    .lean();
  const byKey = new Map(profiles.map((p) => [`${p.userId}:${p.vendorType}`, p]));

  return {
    threshold: policy.threshold,
    windowDays: policy.windowDays,
    actionAtThreshold: policy.actionAtThreshold,
    rows: grouped.map((g) => {
      const profile = byKey.get(`${g._id.vendorId}:${g._id.vendorType}`);
      return {
        vendorId: String(g._id.vendorId),
        vendorType: g._id.vendorType,
        vendorProfileId: profile ? String(profile._id) : null,
        businessName: profile?.businessName || 'Partner',
        approvalStatus: profile?.approvalStatus || 'unknown',
        rating: profile?.rating || 0,
        points: g.points,
        count: g.count,
        threshold: policy.threshold,
        remaining: Math.max(0, policy.threshold - g.points),
        breached: g.points >= policy.threshold,
        lastViolationAt: g.lastAt,
        types: g.types,
      };
    }),
  };
}

/** Headline compliance numbers for the Admin dashboard. */
export async function complianceSummary() {
  const policy = await getPolicy();
  const since = new Date(Date.now() - policy.windowDays * 86_400_000);
  const [agg] = await VendorViolation.aggregate([
    { $match: { occurredAt: { $gte: since } } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        forgiven: { $sum: { $cond: [{ $eq: ['$status', 'forgiven'] }, 1, 0] } },
        critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
        unreviewed: { $sum: { $cond: [{ $eq: ['$reviewedAt', null] }, 1, 0] } },
      },
    },
  ]);
  const board = await complianceLeaderboard({ limit: 500 });
  return {
    windowDays: policy.windowDays,
    threshold: policy.threshold,
    actionAtThreshold: policy.actionAtThreshold,
    totalViolations: agg?.total || 0,
    activeViolations: agg?.active || 0,
    forgivenViolations: agg?.forgiven || 0,
    criticalViolations: agg?.critical || 0,
    unreviewedViolations: agg?.unreviewed || 0,
    breachedLines: board.rows.filter((r) => r.breached).length,
    atRiskLines: board.rows.filter((r) => !r.breached && r.remaining <= 1).length,
  };
}

function serializeViolation(v) {
  const cat = VIOLATION_CATALOGUE[v.type] || {};
  return {
    _id: String(v._id),
    vendorId: String(v.vendorId?._id || v.vendorId),
    vendorType: v.vendorType,
    vendorProfileId: v.vendorProfileId ? String(v.vendorProfileId) : null,
    type: v.type,
    label: cat.label || v.type,
    description: cat.description || '',
    points: v.points,
    severity: v.severity,
    refType: v.refType,
    refId: v.refId ? String(v.refId) : null,
    refLabel: v.refLabel,
    reason: v.reason,
    detail: v.detail,
    customerImpact: v.customerImpact,
    source: v.source,
    raisedByName: v.raisedByName,
    status: v.status,
    reviewedByName: v.reviewedByName,
    reviewedAt: v.reviewedAt,
    reviewNote: v.reviewNote,
    acknowledgedAt: v.acknowledgedAt,
    occurredAt: v.occurredAt,
  };
}
