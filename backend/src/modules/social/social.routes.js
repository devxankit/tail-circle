import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { emitToUser } from '../../sockets/index.js';
import { SOCKET_EVENTS } from '../../sockets/events.js';
import { notify } from '../../services/notify.js';
import { MatchProfile, Swipe, Match, Conversation, Message, Story } from './social.models.js';
import { AdoptionListing } from '../adoption/adoption.models.js';
import { ensureConversation, getOwnedConversation, sendMessage } from './chat.service.js';

import { getMatchDeck, processSwipe, MATCH_ENGINE_CONFIG, updateEngineConfig } from './matchEngine.service.js';

/* ── matches ──────────────────────────────────────────── */

export const matchRouter = Router();
matchRouter.use(authenticate);

/** GET /matches/engine/config — engine settings. */
matchRouter.get('/engine/config', (_req, res) => {
  sendSuccess(res, { data: MATCH_ENGINE_CONFIG });
});

/** PATCH /matches/engine/config — update engine parameters. */
matchRouter.patch('/engine/config', (req, res) => {
  const updated = updateEngineConfig(req.body);
  sendSuccess(res, { message: 'Match engine updated', data: updated });
});

/** GET /matches/deck — profiles not yet swiped (with match score & query filters). */
matchRouter.get(
  '/deck',
  asyncHandler(async (req, res) => {
    const filters = req.query || {};
    const deck = await getMatchDeck({ userId: req.user.id, filters });
    sendSuccess(res, { data: deck });
  })
);

/** POST /matches/swipe — like/pass; reciprocating profiles create a match. */
matchRouter.post(
  '/swipe',
  validate(
    z.object({
      profileId: z.string().regex(/^[0-9a-fA-F]{24}$/),
      action: z.enum(['like', 'pass', 'superlike']),
    })
  ),
  asyncHandler(async (req, res) => {
    const result = await processSwipe({
      userId: req.user.id,
      profileId: req.body.profileId,
      action: req.body.action,
    });
    sendSuccess(res, { data: result });
  })
);

/** GET /matches — my matches. */
matchRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const matches = await Match.find({ userId: req.user.id })
      .sort({ matchedAt: -1 })
      .populate('profileId');
    sendSuccess(res, { data: matches });
  })
);

/* ── chat ─────────────────────────────────────────────── */

export const chatRouter = Router();
chatRouter.use(authenticate);

/** GET /chat/conversations */
chatRouter.get(
  '/conversations',
  asyncHandler(async (req, res) => {
    const conversations = await Conversation.find({ participants: req.user.id }).sort({
      lastMessageAt: -1,
      updatedAt: -1,
    });
    sendSuccess(res, { data: conversations });
  })
);

/** POST /chat/conversations — ensure one for an adoption listing (ShelterChat). */
chatRouter.post(
  '/conversations',
  validate(
    z.object({
      context: z.enum(['adoption']),
      listingId: z.string().max(60),
    })
  ),
  asyncHandler(async (req, res) => {
    const or = [{ legacyId: req.body.listingId }];
    if (/^[0-9a-f]{24}$/i.test(req.body.listingId)) or.push({ _id: req.body.listingId });
    const listing = await AdoptionListing.findOne({ $or: or });
    if (!listing) throw ApiError.notFound('Listing not found');

    const conversation = await ensureConversation({
      userId: req.user.id,
      context: 'adoption',
      refId: listing.id,
      counterpart: {
        name: listing.shelter?.name || 'Shelter',
        image: listing.shelter?.image || '',
        subtitle: `About ${listing.name}`,
      },
    });
    sendSuccess(res, { data: conversation });
  })
);

/** GET /chat/conversations/:id/messages — history from the Mongo mirror. */
chatRouter.get(
  '/conversations/:id/messages',
  asyncHandler(async (req, res) => {
    await getOwnedConversation(req.user.id, req.params.id);
    const messages = await Message.find({ conversationId: req.params.id })
      .sort({ createdAt: 1 })
      .limit(200);
    sendSuccess(res, { data: messages });
  })
);

/** POST /chat/conversations/:id/messages — send (Mongo + RTDB live). */
chatRouter.post(
  '/conversations/:id/messages',
  validate(
    z.object({
      type: z.enum(['text', 'image']).default('text'),
      text: z.string().trim().max(2000).default(''),
      mediaUrl: z.string().max(1_000_000).nullable().optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    if (req.body.type === 'text' && !req.body.text) throw ApiError.badRequest('Message is empty');
    const message = await sendMessage(req.user, req.params.id, req.body);
    sendSuccess(res, { statusCode: 201, data: message });
  })
);

/* ── stories ──────────────────────────────────────────── */

export const storyRouter = Router();
storyRouter.use(authenticate);

/** GET /stories — active stories (mine + others). */
storyRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const stories = await Story.find({ expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 })
      .limit(50);
    sendSuccess(res, { data: stories });
  })
);

/** POST /stories — publish (24h TTL). */
storyRouter.post(
  '/',
  validate(
    z.object({
      mediaUrl: z.string().min(10).max(2_000_000),
      caption: z.string().trim().max(200).default(''),
    })
  ),
  asyncHandler(async (req, res) => {
    const story = await Story.create({
      userId: req.user.id,
      userName: req.user.name || 'Pet Parent',
      mediaUrl: req.body.mediaUrl,
      caption: req.body.caption,
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
    });
    sendSuccess(res, { statusCode: 201, data: story });
  })
);

export default { matchRouter, chatRouter, storyRouter };
