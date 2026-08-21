import { api } from './api';

/**
 * Social service: community feed, match deck/swipes and chat.
 * Chat live-delivery subscribes to Firebase RTDB (via firebase.js custom-token
 * sign-in); message history and sends always go through the backend API.
 */

/* ── community ────────────────────────────────────────── */

const timeAgo = (iso) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export async function fetchPosts(category) {
  const [{ data: posts }, likedIds] = await Promise.all([
    api.get('/community/posts', { params: category && category !== 'All' ? { category } : undefined }),
    api.get('/community/posts/mine/likes').then((r) => r.data).catch(() => []),
  ]);
  const liked = new Set(likedIds.map(String));
  return posts.map((p) => ({
    id: p._id,
    author: p.authorName,
    authorAvatar: p.authorAvatar || p.authorId?.avatarUrl || null,
    authorId: p.authorId?._id || p.authorId || null,
    category: p.category,
    location: p.location || null,
    time: timeAgo(p.createdAt),
    content: p.content,
    image: p.image,
    likes: p.likesCount,
    comments: p.commentsCount,
    isLiked: liked.has(String(p._id)),
  }));
}

export async function fetchMyPosts() {
  const { data: posts } = await api.get('/community/posts/mine');
  return posts.map((p) => ({
    id: p._id,
    author: p.authorName,
    authorAvatar: p.authorAvatar || p.authorId?.avatarUrl || null,
    category: p.category,
    location: p.location || null,
    time: timeAgo(p.createdAt),
    content: p.content,
    image: p.image,
    likes: p.likesCount,
    comments: p.commentsCount,
  }));
}

export async function createPost({ content, category, location, image }) {
  const { data } = await api.post('/community/posts', { content, category, location, image });
  return data;
}

export async function deletePost(postId) {
  await api.delete(`/community/posts/${postId}`);
}

export async function toggleLike(postId) {
  const { data } = await api.post(`/community/posts/${postId}/like`);
  return data; // { liked, likesCount }
}

export async function fetchComments(postId) {
  const { data } = await api.get(`/community/posts/${postId}/comments`);
  return data.map((c) => ({
    id: c._id,
    author: c.authorName,
    authorAvatar: c.authorAvatar || null,
    text: c.text,
    time: timeAgo(c.createdAt),
  }));
}

export async function addComment(postId, text) {
  const { data } = await api.post(`/community/posts/${postId}/comments`, { text });
  return data;
}

export async function reportPost(postId, reason) {
  await api.post(`/community/posts/${postId}/report`, { reason });
}

/* ── matches ──────────────────────────────────────────── */

export async function fetchMatchDeck(filters = {}) {
  const { data } = await api.get('/matches/deck', { params: filters });
  return data.map((p) => ({ ...p, id: p._id || p.id }));
}

export async function swipeProfile(profileId, action) {
  const { data } = await api.post('/matches/swipe', { profileId, action });
  return data; // { matched, conversationId? }
}

export async function fetchMatches() {
  const { data } = await api.get('/matches');
  return data;
}

/** Report a swipe-deck profile — also passes them permanently. */
export async function reportProfile(profileId, reason = '') {
  await api.post(`/matches/${profileId}/report`, { reason });
}

/* ── chat ─────────────────────────────────────────────── */

export async function fetchConversations() {
  const { data } = await api.get('/chat/conversations');
  return data;
}

/** Single conversation (includes real `unreadCount` / `muted`) — used to seed the chat header's menu state. */
export async function fetchConversation(conversationId) {
  const { data } = await api.get(`/chat/conversations/${conversationId}`);
  return data;
}

/** Clears my unread badge for this conversation — call when the room opens. */
export async function markConversationRead(conversationId) {
  await api.post(`/chat/conversations/${conversationId}/read`);
}

export async function ensureAdoptionConversation(listingId) {
  const { data } = await api.post('/chat/conversations', { context: 'adoption', listingId: String(listingId) });
  return data;
}

export async function fetchMessages(conversationId) {
  const { data } = await api.get(`/chat/conversations/${conversationId}/messages`);
  return data;
}

export async function sendChatMessage(conversationId, { type = 'text', text = '', mediaUrl = null, meta = null }) {
  const { data } = await api.post(`/chat/conversations/${conversationId}/messages`, { type, text, mediaUrl, meta });
  return data;
}

export async function reactToChatMessage(conversationId, messageId, emoji) {
  const { data } = await api.post(`/chat/conversations/${conversationId}/messages/${messageId}/react`, { emoji });
  return data;
}

export async function deleteChatMessage(conversationId, messageId, mode = 'everyone') {
  const { data } = await api.delete(`/chat/conversations/${conversationId}/messages/${messageId}?mode=${mode}`);
  return data;
}

export async function sendTypingSignal(conversationId, participantIds, isTyping) {
  try {
    const { connectSocket } = await import('./socket');
    const socket = connectSocket();
    const eventName = isTyping ? 'chat:typing:start' : 'chat:typing:stop';
    socket.emit(eventName, { conversationId, participantIds });
  } catch {
    /* socket fallback */
  }
}

/** Mute/unmute — real toggle persisted on the conversation. */
export async function setConversationMuted(conversationId, muted) {
  const { data } = await api.post(`/chat/conversations/${conversationId}/mute`, { muted });
  return data;
}

/** Clears chat history for me only; the other side (if any) still has it. */
export async function clearConversation(conversationId) {
  const { data } = await api.post(`/chat/conversations/${conversationId}/clear`);
  return data;
}

/** Reports + blocks — hides the conversation and (for a match) passes it permanently. */
export async function reportAndBlockConversation(conversationId, reason = '') {
  const { data } = await api.post(`/chat/conversations/${conversationId}/report`, { reason });
  return data;
}

/** Real online/last-seen for the chat header — see chat.service.js::getConversationPresence. */
export async function fetchConversationPresence(conversationId) {
  const { data } = await api.get(`/chat/conversations/${conversationId}/presence`);
  return data; // { online, lastSeenAt, source, userId? }
}

export async function subscribeToPresence(onUpdate) {
  try {
    const { connectSocket } = await import('./socket');
    const socket = connectSocket();
    socket.on('presence:update', onUpdate);
    return () => socket.off('presence:update', onUpdate);
  } catch {
    return () => {};
  }
}

export async function subscribeToTyping(conversationId, onTyping) {
  try {
    const { connectSocket } = await import('./socket');
    const socket = connectSocket();
    const handler = (payload) => {
      if (!payload || String(payload.conversationId) !== String(conversationId)) return;
      onTyping(payload); // { conversationId, userId, isTyping }
    };
    socket.on('chat:typing', handler);
    return () => socket.off('chat:typing', handler);
  } catch {
    return () => {};
  }
}

export async function subscribeToReactions(conversationId, onReaction) {
  try {
    const { connectSocket } = await import('./socket');
    const socket = connectSocket();
    const handler = (payload) => {
      if (!payload || String(payload.conversationId) !== String(conversationId)) return;
      onReaction(payload); // { conversationId, messageId, userId, emoji, reactions }
    };
    socket.on('chat:message:react', handler);
    return () => socket.off('chat:message:react', handler);
  } catch {
    return () => {};
  }
}

export async function subscribeToReadReceipts(conversationId, onRead) {
  try {
    const { connectSocket } = await import('./socket');
    const socket = connectSocket();
    const handler = (payload) => {
      if (!payload || String(payload.conversationId) !== String(conversationId)) return;
      onRead(payload); // { conversationId, userId, readAt }
    };
    socket.on('chat:messages:read', handler);
    return () => socket.off('chat:messages:read', handler);
  } catch {
    return () => {};
  }
}

export async function subscribeToDeletions(conversationId, onDelete) {
  try {
    const { connectSocket } = await import('./socket');
    const socket = connectSocket();
    const handler = (payload) => {
      if (!payload || String(payload.conversationId) !== String(conversationId)) return;
      onDelete(payload); // { conversationId, messageId, userId, mode }
    };
    socket.on('chat:message:delete', handler);
    return () => socket.off('chat:message:delete', handler);
  } catch {
    return () => {};
  }
}

/**
 * Live subscription to a conversation over Socket.IO.
 * Calls `onMessage` for each new live message; returns an unsubscribe fn.
 */
export async function subscribeToConversation(conversationId, onMessage) {
  try {
    const { connectSocket } = await import('./socket');
    const socket = connectSocket();
    const handler = (payload) => {
      if (!payload || String(payload.conversationId) !== String(conversationId)) return;
      onMessage(payload); // { key, senderId, type, text, mediaUrl, meta, reactions, readBy, at }
    };
    socket.on('chat:message:new', handler);
    return () => socket.off('chat:message:new', handler);
  } catch {
    return () => {};
  }
}

/* ── stories ──────────────────────────────────────────── */

export async function fetchStories() {
  const { data } = await api.get('/stories');
  return data;
}

export async function publishStory(mediaUrl, caption = '') {
  const { data } = await api.post('/stories', { mediaUrl, caption });
  return data;
}

/** Records that I watched someone else's story (skips my own, server-side). */
export async function viewStory(storyId) {
  await api.post(`/stories/${storyId}/view`).catch(() => {});
}

/**
 * Real "Viewed By" list for one of MY stories, plus the like tally shown
 * beside it. Each viewer carries a `liked` flag so the panel can mark the
 * people who did both without a second request.
 */
export async function fetchStoryViewers(storyId) {
  const { data } = await api.get(`/stories/${storyId}/viewers`);
  return {
    viewers: data?.viewers || [],
    viewsCount: data?.viewsCount || 0,
    likesCount: data?.likesCount || 0,
  };
}

/**
 * Toggle a like on someone's story. The server notifies the owner in-app and
 * by push on a new like, and returns the authoritative count so the UI never
 * has to guess.
 */
export async function toggleStoryLike(storyId) {
  const { data } = await api.post(`/stories/${storyId}/like`);
  return { liked: Boolean(data?.liked), likesCount: data?.likesCount || 0 };
}
