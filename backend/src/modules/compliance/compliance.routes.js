import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { VendorProfile } from '../vendor/vendor.models.js';
import { writeAudit, suspendVendor, approveVendor } from '../admin/admin.service.js';
import { VIOLATION_TYPES } from './compliance.models.js';
import {
  listViolations,
  complianceLeaderboard,
  complianceSummary,
  getPolicyView,
  updatePolicy,
  forgiveViolation,
  upholdViolation,
  recordViolation,
  evaluateStanding,
} from './compliance.service.js';
import { runComplianceSweeps } from './compliance.sweeps.js';

/**
 * Admin-facing compliance control. Mounted under `/admin/compliance` by
 * admin.routes.js, so it inherits the admin authentication guard there.
 *
 * Everything that changes a partner's standing or their ability to trade is
 * audited, and every suspension or reinstatement carries a written reason —
 * these are decisions that cost a partner money, and "who decided this and
 * why?" has to be answerable months later.
 */
export function complianceAdminRouter() {
  const router = Router();
  const reason = z.string().trim().min(3).max(500);

  /* ── Overview ───────────────────────────────────────────── */
  router.get('/summary', asyncHandler(async (_req, res) => sendSuccess(res, { data: await complianceSummary() })));

  router.get(
    '/vendors',
    asyncHandler(async (req, res) =>
      sendSuccess(res, { data: await complianceLeaderboard({ limit: Number(req.query.limit) || 100 }) })
    )
  );

  router.get(
    '/vendors/:vendorId/standing',
    asyncHandler(async (req, res) =>
      sendSuccess(res, {
        data: await evaluateStanding(req.params.vendorId, req.query.vendorType || null),
      })
    )
  );

  /* ── Violations ─────────────────────────────────────────── */
  router.get(
    '/violations',
    asyncHandler(async (req, res) =>
      sendSuccess(res, {
        data: await listViolations({
          vendorId: req.query.vendorId,
          vendorType: req.query.vendorType,
          type: req.query.type,
          status: req.query.status,
          severity: req.query.severity,
          from: req.query.from,
          to: req.query.to,
          page: req.query.page,
          limit: req.query.limit,
        }),
      })
    )
  );

  /** Record a violation by hand — a no-show or quality complaint nothing can detect. */
  router.post(
    '/violations',
    validate(
      z.object({
        vendorId: z.string().min(1),
        vendorType: z.string().optional(),
        type: z.enum(VIOLATION_TYPES),
        reason,
        detail: z.string().max(1000).optional(),
        customerImpact: z.string().max(500).optional(),
        refType: z.enum(['booking', 'order', 'dispute', 'manual']).optional(),
        refId: z.string().optional(),
        refLabel: z.string().max(120).optional(),
      })
    ),
    asyncHandler(async (req, res) => {
      const result = await recordViolation({ ...req.body, source: 'admin', actor: req.user });
      if (!result) {
        throw ApiError.badRequest('Violation not recorded — the rule is disabled or already logged for this reference');
      }
      await writeAudit(req.user, {
        action: 'compliance.violation_add',
        targetType: 'vendor',
        targetId: req.body.vendorId,
        after: { type: req.body.type, points: result.violation.points, reason: req.body.reason },
        ip: req.ip,
      });
      return sendSuccess(res, { statusCode: 201, data: result });
    })
  );

  router.post(
    '/violations/:id/forgive',
    validate(z.object({ note: z.string().trim().max(500).optional() })),
    asyncHandler(async (req, res) => {
      const result = await forgiveViolation(req.user, req.params.id, req.body.note || '');
      await writeAudit(req.user, {
        action: 'compliance.violation_forgive',
        targetType: 'violation',
        targetId: req.params.id,
        after: { note: req.body.note || '', standingPoints: result.standing.points },
        ip: req.ip,
      });
      return sendSuccess(res, { data: result });
    })
  );

  router.post(
    '/violations/:id/uphold',
    validate(z.object({ note: z.string().trim().max(500).optional() })),
    asyncHandler(async (req, res) => {
      const result = await upholdViolation(req.user, req.params.id, req.body.note || '');
      await writeAudit(req.user, {
        action: 'compliance.violation_uphold',
        targetType: 'violation',
        targetId: req.params.id,
        after: { note: req.body.note || '' },
        ip: req.ip,
      });
      return sendSuccess(res, { data: result });
    })
  );

  /* ── Policy ─────────────────────────────────────────────── */
  router.get('/policy', asyncHandler(async (_req, res) => sendSuccess(res, { data: await getPolicyView() })));

  router.put(
    '/policy',
    validate(
      z.object({
        threshold: z.number().int().min(1).max(100).optional(),
        windowDays: z.number().int().min(1).max(730).optional(),
        actionAtThreshold: z.enum(['flag', 'suspend']).optional(),
        warnAtPoints: z.number().int().min(0).max(100).optional(),
        enforcementStartsAt: z.string().datetime().optional(),
        rules: z
          .array(
            z.object({
              type: z.enum(VIOLATION_TYPES),
              points: z.number().int().min(0).max(100).optional(),
              enabled: z.boolean().optional(),
            })
          )
          .optional(),
        sla: z
          .object({
            vendorResponseHours: z.number().int().min(1).max(168).optional(),
            serviceCompletionGraceDays: z.number().int().min(0).max(30).optional(),
            orderFulfilmentDays: z.number().int().min(1).max(60).optional(),
            lastMinuteCancelHours: z.number().int().min(1).max(168).optional(),
          })
          .optional(),
      })
    ),
    asyncHandler(async (req, res) => {
      const { before, policy } = await updatePolicy(req.user, req.body);
      await writeAudit(req.user, {
        action: 'compliance.policy_update',
        targetType: 'policy',
        targetId: 'compliance',
        before,
        after: {
          threshold: policy.threshold,
          windowDays: policy.windowDays,
          actionAtThreshold: policy.actionAtThreshold,
        },
        ip: req.ip,
      });
      return sendSuccess(res, { message: 'Policy updated', data: policy });
    })
  );

  /* ── Enforcement ────────────────────────────────────────── */

  /**
   * Suspend one business line. Reuses the ordinary vendor status setter, which
   * already scopes to a single line and only blocks the login when every line
   * the account owns is suspended.
   */
  router.post(
    '/vendors/:profileId/suspend',
    validate(z.object({ reason })),
    asyncHandler(async (req, res) => {
      const profile = await VendorProfile.findById(req.params.profileId).select('userId vendorType businessName');
      if (!profile) throw ApiError.notFound('Vendor business line not found');

      const data = await suspendVendor(req.user, req.params.profileId, req.ip);
      await writeAudit(req.user, {
        action: 'compliance.suspend',
        targetType: 'vendor',
        targetId: req.params.profileId,
        after: { reason: req.body.reason, vendorType: profile.vendorType },
        ip: req.ip,
      });

      const { notify } = await import('../../services/notify.js');
      await notify(profile.userId, {
        title: 'Your account has been suspended',
        body: `${profile.businessName || 'Your business'} (${profile.vendorType}) is suspended: ${req.body.reason}. Contact Tail Circle support to appeal.`,
        type: 'system',
        link: '/vendor/compliance',
        data: { kind: 'suspended', vendorType: profile.vendorType || '' },
      }).catch(() => {});

      return sendSuccess(res, { message: 'Business line suspended', data });
    })
  );

  /** Lift a suspension. `forgiveAll` wipes the slate so they do not re-trip instantly. */
  router.post(
    '/vendors/:profileId/reinstate',
    validate(z.object({ reason, forgiveAll: z.boolean().optional() })),
    asyncHandler(async (req, res) => {
      const profile = await VendorProfile.findById(req.params.profileId).select('userId vendorType businessName');
      if (!profile) throw ApiError.notFound('Vendor business line not found');

      const data = await approveVendor(req.user, req.params.profileId, req.ip, { force: true });

      let forgiven = 0;
      if (req.body.forgiveAll) {
        /*
         * Without this a reinstated partner is still sitting on the points that
         * suspended them, so the very next violation trips them again and the
         * reinstatement is meaningless.
         */
        const { VendorViolation } = await import('./compliance.models.js');
        const result = await VendorViolation.updateMany(
          { vendorId: profile.userId, vendorType: profile.vendorType, status: { $in: ['active', 'upheld'] } },
          {
            $set: {
              status: 'forgiven',
              reviewedByName: req.user?.name || 'admin',
              reviewedAt: new Date(),
              reviewNote: `Cleared on reinstatement: ${req.body.reason}`,
            },
          }
        );
        forgiven = result.modifiedCount;
      }

      const { AdminActionItem } = await import('../admin/admin.models.js');
      await AdminActionItem.deleteOne({
        sourceKey: `compliance_breach:${profile.userId}:${profile.vendorType || 'account'}`,
      });

      await writeAudit(req.user, {
        action: 'compliance.reinstate',
        targetType: 'vendor',
        targetId: req.params.profileId,
        after: { reason: req.body.reason, forgiven, vendorType: profile.vendorType },
        ip: req.ip,
      });

      const { notify } = await import('../../services/notify.js');
      await notify(profile.userId, {
        title: 'Your account has been reinstated',
        body: `${profile.businessName || 'Your business'} (${profile.vendorType}) is active again.${forgiven ? ' Your previous warnings have been cleared.' : ''}`,
        type: 'system',
        link: '/vendor/compliance',
        data: { kind: 'reinstated', vendorType: profile.vendorType || '' },
      }).catch(() => {});

      return sendSuccess(res, { message: 'Business line reinstated', data: { profile: data, forgiven } });
    })
  );

  /** Run the detection sweeps by hand. They also run on a timer in server.js. */
  router.post(
    '/sweep',
    asyncHandler(async (req, res) => {
      const results = await runComplianceSweeps();
      await writeAudit(req.user, {
        action: 'compliance.sweep',
        targetType: 'compliance',
        after: results,
        ip: req.ip,
      });
      return sendSuccess(res, { data: results });
    })
  );

  return router;
}
