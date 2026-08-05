import { ApiError } from '../../utils/ApiError.js';
import { emitToUser } from '../../sockets/index.js';
import { SOCKET_EVENTS } from '../../sockets/events.js';
import { Conversation, Message } from './social.models.js';

/**
 * Chat live layer runs on Socket.IO (not Firebase RTDB). MongoDB stays the
 * source of truth (history / search / moderation); on each send we fan the new
 * message out to every participant's private `user:<id>` room so connected
 * clients see it instantly. If no socket is connected the chat still works —
 * clients read history from the REST API.
 */

/** Create (or return) a conversation for a user + context. */
export async function ensureConversation({ userId, context, refId, counterpart }) {
  let conversation = await Conversation.findOne({
    participants: userId,
    context,
    refId: refId ?? null,
  });
  if (!conversation) {
    conversation = await Conversation.create({
      participants: [userId],
      context,
      refId: refId ?? null,
      counterpart: counterpart || {},
    });
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
export async function sendMessage(user, conversationId, { type = 'text', text = '', mediaUrl = null }) {
  const conversation = await getOwnedConversation(user.id, conversationId);

  const message = await Message.create({
    conversationId: conversation.id,
    senderId: user.id,
    type,
    text,
    mediaUrl,
  });

  conversation.lastMessage = type === 'image' ? '📷 Photo' : text;
  conversation.lastMessageAt = new Date();
  await conversation.save();

  // Live fan-out. Shape mirrors what the client subscription expects
  // (key / senderId / type / text / mediaUrl / at) plus conversationId so the
  // client can filter to the open thread.
  const payload = {
    conversationId: String(conversation.id),
    key: String(message.id),
    senderId: String(user.id),
    type,
    text: text || null,
    mediaUrl: mediaUrl || null,
    at: message.createdAt ? message.createdAt.getTime() : Date.now(),
  };
  for (const participantId of conversation.participants) {
    emitToUser(participantId, SOCKET_EVENTS.CHAT_MESSAGE_NEW, payload);
  }

  return message;
}
