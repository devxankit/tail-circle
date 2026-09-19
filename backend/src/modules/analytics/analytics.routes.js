import { Router } from 'express';
import { z } from 'zod';
import { optionalAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import { EVENT_TYPES, ITEM_REF_TYPES } from './analytics.models.js';
import { recordConsent, getConsent, recordEvents, POLICY_VERSION } from './analytics.service.js';

/**
 * Public tracking endpoints, mounted at /analytics.
 *
 * `optionalAuth` throughout: a visitor's consent decision and their browsing
 * both happen before they log in, and often continue across a sign-in within
 * the same visit. Requiring a token would mean tracking only the tail of every
 * customer journey — and refusing to record a guest's refusal of cookies,
 * which is the one decision that must always be recorded.
 */
const router = Router();

const deviceId = z.string().trim().min(8).max(64);

/* ── Consent ──────────────────────────────────────────────────────── */

/** What this device has already decided, so the banner knows whether to show. */
router.get(
  '/consent',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const current = await getConsent(String(req.query.deviceId || ''));
    sendSuccess(res, {
      data: {
        consent: current,
        policyVersion: POLICY_VERSION,
        /*
         * The banner shows when there is no decision, or when the decision
         * predates the current policy version. Re-prompting on a policy change
         * is what a material change legally requires.
         */
        mustAsk: !current || current.policyVersion !== POLICY_VERSION,
      },
    });
  })
);

/** Record an accept or a decline. Declining also erases anything collected. */
router.post(
  '/consent',
  optionalAuth,
  validate(
    z.object({
      deviceId,
      analytics: z.boolean(),
      source: z.enum(['banner', 'settings', 'withdrawn']).optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    const record = await recordConsent({
      deviceId: req.body.deviceId,
      userId: req.user?.id || null,
      analytics: req.body.analytics,
      source: req.body.source || 'banner',
      ip: req.ip,
      userAgent: String(req.headers['user-agent'] || '').slice(0, 300),
    });
    sendSuccess(res, { message: 'Preference saved', data: record });
  })
);

/* ── Ingest ───────────────────────────────────────────────────────── */

const eventSchema = z.object({
  type: z.enum(EVENT_TYPES),
  path: z.string().max(300).optional(),
  screen: z.string().max(80).optional(),
  durationMs: z.number().nonnegative().optional(),
  query: z.string().max(200).optional(),
  resultCount: z.number().int().nonnegative().optional(),
  refType: z.enum(ITEM_REF_TYPES).optional(),
  refId: z.string().max(64).optional(),
  refName: z.string().max(120).optional(),
  category: z.string().max(60).optional(),
  meta: z.record(z.any()).optional(),
  occurredAt: z.string().datetime().optional(),
});

/**
 * Batched event ingest.
 *
 * Always answers 200, even when nothing was written. A visitor who declined
 * must not be able to tell the difference from the response, and a client whose
 * tracking is silently dropped must never retry or surface an error — analytics
 * is the least important thing riding on any request.
 */
router.post(
  '/events',
  optionalAuth,
  validate(
    z.object({
      deviceId,
      sessionId: z.string().trim().min(8).max(64),
      city: z.string().max(60).optional(),
      platform: z.string().max(20).optional(),
      referrer: z.string().max(300).optional(),
      events: z.array(eventSchema).min(1).max(200),
    })
  ),
  asyncHandler(async (req, res) => {
    const result = await recordEvents({
      deviceId: req.body.deviceId,
      userId: req.user?.id || null,
      sessionId: req.body.sessionId,
      events: req.body.events,
      city: req.body.city || req.user?.city || '',
      platform: req.body.platform || 'web',
      referrer: req.body.referrer || '',
    }).catch(() => ({ written: 0 }));

    sendSuccess(res, { data: { accepted: result.written } });
  })
);

export default router;
