import { ApiError } from '../../utils/ApiError.js';
import { emitToUser, isUserOnline } from '../../sockets/index.js';
import { SOCKET_EVENTS } from '../../sockets/events.js';
import { Conversation, Message, MatchProfile, ChatReport, Swipe } from './social.models.js';
import { AdoptionListing } from '../adoption/adoption.models.js';
import { User } from '../user/user.model.js';

/**
 * Chat live layer runs on Socket.IO (not Firebase RTDB). MongoDB stays the
 * source of truth (history / search / moderation); on each send we fan the new
 * message out to every participant's private `user:<id>` room so connected
 * clients see it instantly. If no socket is connected the chat still works —
 * clients read history from the REST API.
 */

/** Create (or return) a conversation for a user + context. */
/**
 * Find or open a conversation.
 *
 * `alsoInclude` carries the other real accounts that belong in the room — a
 * matched pet owner, for instance. Everything downstream keys off
 * `participants`: delivery, unread counts, and `getOwnedConversation`, which
 * 404s for anyone not listed. Rooms were always created with a single
 * participant, which is invisible when the counterpart is a seeded profile but
 * silently locks a real person out of their own match.
 */
export async function ensureConversation({ userId, context, refId, counterpart, alsoInclude = [] }) {
  const everyone = [...new Set([String(userId), ...alsoInclude.map(String)])];

  let conversation = await Conversation.findOne({
    participants: userId,
    context,
    refId: refId ?? null,
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: everyone,
      context,
      refId: refId ?? null,
      counterpart: counterpart || {},
    });
    return conversation;
  }

  // An existing room may predate the counterpart joining, or have been opened
  // before they had an account — add anyone missing rather than leaving them out.
  const present = new Set(conversation.participants.map(String));
  const missing = everyone.filter((id) => !present.has(id));
  if (missing.length) {
    conversation.participants.push(...missing);
    await conversation.save();
  }
  return conversation;
}

export async function getOwnedConversation(userId, conversationId) {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  });
  if (!conversation) throw ApiError.notFound('Conversation not found');
  return conversation;
}

/**
 * Send a message: persist to Mongo (authoritative), then push it live to every
 * participant over Socket.IO. Live delivery is best-effort — a missing socket
 * never blocks the send.
 */
export async function sendMessage(user, conversationId, { type = 'text', text = '', mediaUrl = null, meta = null }) {
  const conversation = await getOwnedConversation(user.id, conversationId);

  const message = await Message.create({
    conversationId: conversation.id,
    senderId: user.id,
    type,
    text,
    mediaUrl,
    meta: (type === 'location' || type === 'document' || type === 'story_reply' || meta) ? meta : undefined,
    readBy: [user.id],
  });

  const snippet = type === 'image' ? '📷 Photo' 
    : type === 'location' ? '📍 Location' 
    : type === 'document' ? `📄 ${meta?.fileName || 'Document'}`
    : type === 'story_reply' ? '💬 Story Reply' 
    : text;

  conversation.lastMessage = snippet;
  conversation.lastMessageAt = new Date();

  for (const participantId of conversation.participants) {
    const key = String(participantId);
    conversation.unread.set(key, key === String(user.id) ? 0 : (conversation.unread.get(key) || 0) + 1);
  }
  await conversation.save();

  const payload = {
    conversationId: String(conversation.id),
    key: String(message.id),
    senderId: String(user.id),
    type,
    text: text || null,
    mediaUrl: mediaUrl || null,
    meta: message.meta || null,
    reactions: [],
    readBy: [String(user.id)],
    at: message.createdAt ? message.createdAt.getTime() : Date.now(),
  };
  for (const participantId of conversation.participants) {
    emitToUser(participantId, SOCKET_EVENTS.CHAT_MESSAGE_NEW, payload);
  }

  return message;
}

/**
 * Real presence for a conversation's counterpart — replaces the frontend's
 * old hardcoded "Online" label. A conversation only ever has one real logged
 * -in participant (the current user); the other side is either:
 *  - a real account we can check a live socket for (a match whose profile is
 *    owned by another registered user, or an adoption listing someone posted), or
 *  - a seeded/demo profile with no real second user at all, in which case the
 *    only honest source of truth is that profile's own `online` field in Mongo
 *    (admin-controlled, not a string baked into the UI).
 */
export async function getConversationPresence(userId, conversationId) {
  const conversation = await getOwnedConversation(userId, conversationId);

  const resolveForUser = async (realUserId) => {
    if (!realUserId) return null;
    const online = isUserOnline(realUserId);
    if (online) return { online: true, lastSeenAt: null };
    const user = await User.findById(realUserId).select('lastSeenAt').lean();
    return { online: false, lastSeenAt: user?.lastSeenAt || null };
  };

  if (conversation.context === 'match' && conversation.refId) {
    const profile = await MatchProfile.findById(conversation.refId).select('ownerId online').lean();
    if (profile?.ownerId) {
      const presence = await resolveForUser(profile.ownerId);
      if (presence) return { ...presence, source: 'user', userId: String(profile.ownerId) };
    }
    return { online: Boolean(profile?.online), lastSeenAt: null, source: 'profile' };
  }

  if (conversation.context === 'adoption' && conversation.refId) {
    const listing = await AdoptionListing.findById(conversation.refId).select('postedBy').lean();
    const presence = await resolveForUser(listing?.postedBy);
    if (presence) return { ...presence, source: 'user', userId: String(listing.postedBy) };
    return { online: false, lastSeenAt: null, source: 'shelter' };
  }

  // support / vendor contexts have no second real account modeled yet.
  return { online: false, lastSeenAt: null, source: 'unknown' };
}

/** Toggle mute for the chat header's "Mute Notifications" button. */
export async function setConversationMuted(userId, conversationId, muted) {
  const conversation = await getOwnedConversation(userId, conversationId);
  const already = conversation.mutedBy.some((id) => String(id) === String(userId));
  if (muted && !already) conversation.mutedBy.push(userId);
  if (!muted && already) conversation.mutedBy = conversation.mutedBy.filter((id) => String(id) !== String(userId));
  await conversation.save();
  return { muted };
}

/** "Clear Chat" — hides history before now for me only; the record stays intact server-side. */
export async function clearConversationForUser(userId, conversationId) {
  const conversation = await getOwnedConversation(userId, conversationId);
  conversation.clearedAt.set(String(userId), new Date());
  await conversation.save();
  return { clearedAt: conversation.clearedAt.get(String(userId)) };
}

/**
 * "Report / Block" — logs the report, hides the conversation from this
 * user's list, and (for a match) registers a permanent pass so that profile
 * never resurfaces in their deck again.
 */
export async function reportAndBlockConversation(userId, conversationId, reason) {
  const conversation = await getOwnedConversation(userId, conversationId);

  await ChatReport.create({ conversationId: conversation.id, reporterId: userId, reason: reason || '' });

  if (!conversation.blockedBy.some((id) => String(id) === String(userId))) {
    conversation.blockedBy.push(userId);
    await conversation.save();
  }

  if (conversation.context === 'match' && conversation.refId) {
    await Swipe.updateOne(
      { userId, profileId: conversation.refId },
      { $set: { action: 'pass' } },
      { upsert: true }
    );
  }

  return { blocked: true };
}

/**
 * Toggle emoji reaction on a message & push live update over Socket.IO.
 */
export async function reactToMessage(userId, conversationId, messageId, emoji) {
  const conversation = await getOwnedConversation(userId, conversationId);
  const message = await Message.findOne({ _id: messageId, conversationId: conversation.id });
  if (!message) throw ApiError.notFound('Message not found');

  const existingIndex = message.reactions.findIndex((r) => String(r.userId) === String(userId) && r.emoji === emoji);
  if (existingIndex > -1) {
    message.reactions.splice(existingIndex, 1);
  } else {
    // Remove any previous reaction from same user (single reaction per user)
    message.reactions = message.reactions.filter((r) => String(r.userId) !== String(userId));
    message.reactions.push({ userId, emoji, createdAt: new Date() });
  }

  await message.save();

  const payload = {
    conversationId: String(conversation.id),
    messageId: String(message.id),
    userId: String(userId),
    emoji,
    reactions: message.reactions.map((r) => ({ userId: String(r.userId), emoji: r.emoji })),
  };

  for (const pid of conversation.participants) {
    emitToUser(pid, SOCKET_EVENTS.CHAT_REACTION, payload);
  }

  return payload;
}

/**
 * Delete a message (for me or for everyone) & push live update over Socket.IO.
 */
export async function deleteMessage(userId, conversationId, messageId, mode = 'everyone') {
  const conversation = await getOwnedConversation(userId, conversationId);
  const message = await Message.findOne({ _id: messageId, conversationId: conversation.id });
  if (!message) throw ApiError.notFound('Message not found');

  if (mode === 'everyone' && String(message.senderId) === String(userId)) {
    await Message.deleteOne({ _id: message.id });
  } else {
    if (!message.deletedFor.some((id) => String(id) === String(userId))) {
      message.deletedFor.push(userId);
      await message.save();
    }
  }

  const payload = {
    conversationId: String(conversation.id),
    messageId: String(message.id),
    userId: String(userId),
    mode,
  };

  for (const pid of conversation.participants) {
    emitToUser(pid, SOCKET_EVENTS.CHAT_DELETE, payload);
  }

  return payload;
}

/**
 * Mark messages as read by current user & notify participants via Socket.IO.
 */
export async function markMessagesAsRead(userId, conversationId) {
  const conversation = await getOwnedConversation(userId, conversationId);
  
  // Bump readBy array on messages
  await Message.updateMany(
    { conversationId: conversation.id, readBy: { $ne: userId } },
    { $addToSet: { readBy: userId } }
  );

  // Clear unread map counter for this user
  conversation.unread.set(String(userId), 0);
  await conversation.save();

  const payload = {
    conversationId: String(conversation.id),
    userId: String(userId),
    readAt: Date.now(),
  };

  for (const pid of conversation.participants) {
    emitToUser(pid, SOCKET_EVENTS.CHAT_READ, payload);
  }

  return payload;
}
