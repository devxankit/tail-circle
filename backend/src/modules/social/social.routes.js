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
import { MatchProfile, Swipe, Match, Conversation, Message, Story, StoryView, ProfileReport } from './social.models.js';
import { AdoptionListing } from '../adoption/adoption.models.js';
import {
  ensureConversation,
  getOwnedConversation,
  sendMessage,
  getConversationPresence,
  setConversationMuted,
  clearConversationForUser,
  reportAndBlockConversation,
} from './chat.service.js';

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

/** POST /matches/:profileId/report — real "Report {name}"; also passes them permanently. */
matchRouter.post(
  '/:profileId/report',
  validate(z.object({ reason: z.string().trim().max(500).default('') })),
  asyncHandler(async (req, res) => {
    const { profileId } = req.params;
    if (!/^[0-9a-fA-F]{24}$/.test(profileId)) throw ApiError.badRequest('Invalid profile id');
    await ProfileReport.create({ profileId, reporterId: req.user.id, reason: req.body.reason });
    await Swipe.updateOne(
      { userId: req.user.id, profileId },
      { $set: { action: 'pass' } },
      { upsert: true }
    );
    sendSuccess(res, { statusCode: 201, message: 'Profile reported' });
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

/** GET /chat/conversations — includes each conversation's real unread count for me. */
chatRouter.get(
  '/conversations',
  asyncHandler(async (req, res) => {
    const conversations = await Conversation.find({
      participants: req.user.id,
      blockedBy: { $ne: req.user.id },
    }).sort({ lastMessageAt: -1, updatedAt: -1 });
    const data = conversations.map((c) => {
      const obj = c.toJSON();
      obj.unreadCount = c.unread?.get(String(req.user.id)) || 0;
      obj.muted = c.mutedBy.some((id) => String(id) === String(req.user.id));
      return obj;
    });
    sendSuccess(res, { data });
  })
);

/** GET /chat/conversations/:id — one conversation, incl. real unreadCount/muted. */
chatRouter.get(
  '/conversations/:id',
  asyncHandler(async (req, res) => {
    const conversation = await getOwnedConversation(req.user.id, req.params.id);
    const obj = conversation.toJSON();
    obj.unreadCount = conversation.unread.get(String(req.user.id)) || 0;
    obj.muted = conversation.mutedBy.some((id) => String(id) === String(req.user.id));
    sendSuccess(res, { data: obj });
  })
);

/** POST /chat/conversations/:id/read — clears my unread count on open. */
chatRouter.post(
  '/conversations/:id/read',
  asyncHandler(async (req, res) => {
    const conversation = await getOwnedConversation(req.user.id, req.params.id);
    conversation.unread.set(String(req.user.id), 0);
    await conversation.save();
    sendSuccess(res, { data: { unreadCount: 0 } });
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

/** GET /chat/conversations/:id/messages — history from the Mongo mirror, minus anything I've "cleared". */
chatRouter.get(
  '/conversations/:id/messages',
  asyncHandler(async (req, res) => {
    const conversation = await getOwnedConversation(req.user.id, req.params.id);
    const clearedAt = conversation.clearedAt.get(String(req.user.id));
    const query = { conversationId: req.params.id };
    if (clearedAt) query.createdAt = { $gt: clearedAt };
    const messages = await Message.find(query).sort({ createdAt: 1 }).limit(200);
    sendSuccess(res, { data: messages });
  })
);

/** POST /chat/conversations/:id/messages — send (Mongo + RTDB live). */
chatRouter.post(
  '/conversations/:id/messages',
  validate(
    z.object({
      type: z.enum(['text', 'image', 'location']).default('text'),
      text: z.string().trim().max(2000).default(''),
      mediaUrl: z.string().max(1_000_000).nullable().optional(),
      meta: z
        .object({ lat: z.number(), lng: z.number() })
        .nullable()
        .optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    if (req.body.type === 'text' && !req.body.text) throw ApiError.badRequest('Message is empty');
    if (req.body.type === 'location' && !req.body.meta) throw ApiError.badRequest('Location coordinates required');
    const message = await sendMessage(req.user, req.params.id, req.body);
    sendSuccess(res, { statusCode: 201, data: message });
  })
);

/** POST /chat/conversations/:id/mute — real "Mute Notifications" toggle. */
chatRouter.post(
  '/conversations/:id/mute',
  validate(z.object({ muted: z.boolean() })),
  asyncHandler(async (req, res) => {
    const result = await setConversationMuted(req.user.id, req.params.id, req.body.muted);
    sendSuccess(res, { data: result });
  })
);

/** POST /chat/conversations/:id/clear — real "Clear Chat" (hides history for me only). */
chatRouter.post(
  '/conversations/:id/clear',
  asyncHandler(async (req, res) => {
    const result = await clearConversationForUser(req.user.id, req.params.id);
    sendSuccess(res, { data: result });
  })
);

/** POST /chat/conversations/:id/report — real "Report / Block". */
chatRouter.post(
  '/conversations/:id/report',
  validate(z.object({ reason: z.string().trim().max(500).default('') })),
  asyncHandler(async (req, res) => {
    const result = await reportAndBlockConversation(req.user.id, req.params.id, req.body.reason);
    sendSuccess(res, { data: result });
  })
);

/** GET /chat/conversations/:id/presence — real online/last-seen for the header. */
chatRouter.get(
  '/conversations/:id/presence',
  asyncHandler(async (req, res) => {
    const presence = await getConversationPresence(req.user.id, req.params.id);
    sendSuccess(res, { data: presence });
  })
);

/* ── stories ──────────────────────────────────────────── */

export const storyRouter = Router();
storyRouter.use(authenticate);

/** GET /stories — active stories (mine + others), flagged with whether I've viewed each. */
storyRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const stories = await Story.find({ expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    const viewedIds = await StoryView.find({
      viewerId: req.user.id,
      storyId: { $in: stories.map((s) => s._id) },
    }).distinct('storyId');
    const viewedSet = new Set(viewedIds.map(String));
    const data = stories.map((s) => ({
      ...s,
      viewed: viewedSet.has(String(s._id)) || String(s.userId) === String(req.user.id),
    }));
    sendSuccess(res, { data });
  })
);

/** POST /stories/:id/view — record that I watched someone else's story. */
storyRouter.post(
  '/:id/view',
  asyncHandler(async (req, res) => {
    const story = await Story.findById(req.params.id);
    if (!story) throw ApiError.notFound('Story not found');
    if (String(story.userId) !== String(req.user.id)) {
      await StoryView.updateOne(
        { storyId: story.id, viewerId: req.user.id },
        { $setOnInsert: { viewerName: req.user.name || 'Pet Parent', viewerAvatar: req.user.avatarUrl || null } },
        { upsert: true }
      );
    }
    sendSuccess(res, { data: { ok: true } });
  })
);

/** GET /stories/:id/viewers — real "Viewed By" list; story owner only. */
storyRouter.get(
  '/:id/viewers',
  asyncHandler(async (req, res) => {
    const story = await Story.findById(req.params.id);
    if (!story) throw ApiError.notFound('Story not found');
    if (String(story.userId) !== String(req.user.id)) throw ApiError.forbidden('Not your story');
    const viewers = await StoryView.find({ storyId: story.id }).sort({ createdAt: -1 });
    sendSuccess(res, { data: viewers });
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
