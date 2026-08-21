import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { emitToUser } from '../../sockets/index.js';
import { SOCKET_EVENTS } from '../../sockets/events.js';
import { notify } from '../../services/notify.js';
import { MatchProfile, Swipe, Match, Conversation, Message, Story, StoryView, StoryLike, ProfileReport } from './social.models.js';
import { AdoptionListing } from '../adoption/adoption.models.js';
import {
  ensureConversation,
  getOwnedConversation,
  sendMessage,
  getConversationPresence,
  setConversationMuted,
  clearConversationForUser,
  reportAndBlockConversation,
  reactToMessage,
  deleteMessage,
  markMessagesAsRead,
} from './chat.service.js';

import { getMatchDeck, processSwipe, MATCH_ENGINE_CONFIG, updateEngineConfig } from './matchEngine.service.js';

/* ── matches ──────────────────────────────────────────── */

export const matchRouter = Router();
matchRouter.use(authenticate);

/** GET /matches/engine/config — engine settings. */
matchRouter.get('/engine/config', (_req, res) => {
  sendSuccess(res, { data: MATCH_ENGINE_CONFIG });
});

/**
 * PATCH /matches/engine/config — retune the engine. Admins only.
 *
 * This sat behind `authenticate` alone, so any signed-in pet owner could
 * rewrite the scoring weights, the distance ceiling, or switch off reciprocity
 * — for every user on the platform, since the config is a single module-level
 * object. The body was passed through unvalidated too, so arbitrary keys landed
 * in it.
 */
matchRouter.patch(
  '/engine/config',
  authorize('admin', 'super_admin'),
  validate(
    z.object({
      weightProximity: z.number().min(0).max(100).optional(),
      weightTemperament: z.number().min(0).max(100).optional(),
      weightPurpose: z.number().min(0).max(100).optional(),
      weightActivity: z.number().min(0).max(100).optional(),
      defaultMaxDistanceKm: z.number().min(1).max(1000).optional(),
      enableAutoReciprocity: z.boolean().optional(),
    }).strict()
  ),
  (req, res) => {
    const updated = updateEngineConfig(req.body);
    sendSuccess(res, { message: 'Match engine updated', data: updated });
  }
);

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

/** POST /chat/conversations/:id/read — clears my unread count & updates readBy on messages. */
chatRouter.post(
  '/conversations/:id/read',
  asyncHandler(async (req, res) => {
    const data = await markMessagesAsRead(req.user.id, req.params.id);
    sendSuccess(res, { data });
  })
);

/** POST /chat/conversations — ensure one for an adoption listing (ShelterChat) or general counterpart. */
chatRouter.post(
  '/conversations',
  validate(
    z.object({
      context: z.enum(['adoption', 'match', 'support', 'vendor']).default('match'),
      listingId: z.string().max(60).optional(),
      counterpartId: z.string().max(60).optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    if (req.body.context === 'adoption' && req.body.listingId) {
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
      return sendSuccess(res, { data: conversation });
    }

    const conversation = await ensureConversation({
      userId: req.user.id,
      context: req.body.context || 'match',
      refId: req.body.counterpartId || null,
    });
    sendSuccess(res, { data: conversation });
  })
);

/** GET /chat/conversations/:id/messages — history from Mongo, excluding cleared/deleted for me. */
chatRouter.get(
  '/conversations/:id/messages',
  asyncHandler(async (req, res) => {
    const conversation = await getOwnedConversation(req.user.id, req.params.id);
    const clearedAt = conversation.clearedAt.get(String(req.user.id));
    const query = { 
      conversationId: req.params.id,
      deletedFor: { $ne: req.user.id }
    };
    if (clearedAt) query.createdAt = { $gt: clearedAt };
    const messages = await Message.find(query).sort({ createdAt: 1 }).limit(200);
    sendSuccess(res, { data: messages });
  })
);

/** POST /chat/conversations/:id/messages — send (text, image, location, document, story_reply). */
chatRouter.post(
  '/conversations/:id/messages',
  validate(
    z.object({
      type: z.enum(['text', 'image', 'location', 'document', 'story_reply']).default('text'),
      text: z.string().trim().max(2000).default(''),
      mediaUrl: z.string().max(1_000_000).nullable().optional(),
      meta: z
        .object({ 
          lat: z.number().optional(), 
          lng: z.number().optional(),
          fileName: z.string().optional(),
          fileSize: z.number().optional(),
          fileType: z.string().optional(),
          storyMediaUrl: z.string().optional(),
          storyCaption: z.string().optional()
        })
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

/** POST /chat/conversations/:id/messages/:messageId/react — toggle emoji reaction. */
chatRouter.post(
  '/conversations/:id/messages/:messageId/react',
  validate(z.object({ emoji: z.string().min(1).max(10) })),
  asyncHandler(async (req, res) => {
    const result = await reactToMessage(req.user.id, req.params.id, req.params.messageId, req.body.emoji);
    sendSuccess(res, { data: result });
  })
);

/** DELETE /chat/conversations/:id/messages/:messageId — delete message. */
chatRouter.delete(
  '/conversations/:id/messages/:messageId',
  asyncHandler(async (req, res) => {
    const mode = req.query.mode === 'me' ? 'me' : 'everyone';
    const result = await deleteMessage(req.user.id, req.params.id, req.params.messageId, mode);
    sendSuccess(res, { data: result });
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
    const likedIds = await StoryLike.find({
      userId: req.user.id,
      storyId: { $in: stories.map((s) => s._id) },
    }).distinct('storyId');
    const likedSet = new Set(likedIds.map(String));
    const data = stories.map((s) => ({
      ...s,
      viewed: viewedSet.has(String(s._id)) || String(s.userId) === String(req.user.id),
      likesCount: s.likesCount || 0,
      likedByMe: likedSet.has(String(s._id)),
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
    const [viewers, likes] = await Promise.all([
      StoryView.find({ storyId: story.id }).sort({ createdAt: -1 }).lean(),
      StoryLike.find({ storyId: story.id }).sort({ createdAt: -1 }).lean(),
    ]);
    // A like can only come from someone who opened the story, so flag the
    // viewer rows rather than making the UI cross-reference two lists.
    const likerIds = new Set(likes.map((l) => String(l.userId)));
    sendSuccess(res, {
      data: {
        viewers: viewers.map((v) => ({ ...v, liked: likerIds.has(String(v.viewerId)) })),
        viewsCount: viewers.length,
        likesCount: story.likesCount || 0,
      },
    });
  })
);

/**
 * POST /stories/:id/like — toggle a like, and tell the owner about it.
 *
 * The unique (storyId, userId) index is the concurrency guard: a racing
 * double-tap makes the second insert throw E11000 instead of inserting a
 * second row, so `likesCount` can never run ahead of the rows. The owner is
 * notified only on a genuine new like — never on an unlike, and never when
 * someone likes their own story.
 */
storyRouter.post(
  '/:id/like',
  asyncHandler(async (req, res) => {
    const story = await Story.findById(req.params.id);
    if (!story) throw ApiError.notFound('Story not found');
    // Self-likes inflated the owner's own tally and, since we never record a
    // view for your own story, left a like with nobody behind it in the
    // "Viewed By" panel. The UI doesn't offer the button on your own story
    // either — this closes the API behind it.
    if (String(story.userId) === String(req.user.id)) {
      throw ApiError.badRequest('You cannot like your own story');
    }

    const existing = await StoryLike.findOneAndDelete({ storyId: story.id, userId: req.user.id });

    if (existing) {
      // Guard the decrement so an already-zero counter cannot go negative.
      await Story.updateOne({ _id: story.id, likesCount: { $gt: 0 } }, { $inc: { likesCount: -1 } });
      const fresh = await Story.findById(story.id).select('likesCount').lean();
      return sendSuccess(res, { data: { liked: false, likesCount: fresh?.likesCount || 0 } });
    }

    // Liking implies watching. Recording the view here as well keeps the
    // owner's panel coherent: every liker is guaranteed to appear in the
    // "Viewed By" list they are flagged inside, rather than only counting
    // toward a total with no row behind it.
    await StoryView.updateOne(
      { storyId: story.id, viewerId: req.user.id },
      { $setOnInsert: { viewerName: req.user.name || 'Pet Parent', viewerAvatar: req.user.avatarUrl || null } },
      { upsert: true }
    );

    let inserted = true;
    try {
      await StoryLike.create({
        storyId: story.id,
        userId: req.user.id,
        userName: req.user.name || 'Pet Parent',
        userAvatar: req.user.avatarUrl || null,
      });
    } catch (err) {
      if (err?.code !== 11000) throw err;
      inserted = false; // lost the race against another tap; the row already exists
    }

    if (inserted) {
      await Story.updateOne({ _id: story.id }, { $inc: { likesCount: 1 } });

      // notify() is one call for all three channels: it writes the in-app
      // Notification row, emits `notification:new` to any open tab, and fires
      // the FCM push. Best-effort by design — a push failure must not fail the
      // like, so it is never awaited into the response.
      notify(story.userId, {
        title: 'New story like',
        body: `${req.user.name || 'Someone'} liked your story`,
        type: 'match',
        link: '/app/chat',
        data: { storyId: String(story._id), likedBy: String(req.user.id), kind: 'story_like' },
      }).catch(() => {});

      // Live badge on the story itself for an owner who is watching it now.
      emitToUser(story.userId, SOCKET_EVENTS.STORY_LIKED, {
        storyId: String(story._id),
        userId: String(req.user.id),
        userName: req.user.name || 'Pet Parent',
        userAvatar: req.user.avatarUrl || null,
      });
    }

    const fresh = await Story.findById(story.id).select('likesCount').lean();
    sendSuccess(res, { data: { liked: true, likesCount: fresh?.likesCount || 0 } });
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
