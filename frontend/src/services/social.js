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

/* ── chat ─────────────────────────────────────────────── */

export async function fetchConversations() {
  const { data } = await api.get('/chat/conversations');
  return data;
}

export async function ensureAdoptionConversation(listingId) {
  const { data } = await api.post('/chat/conversations', { context: 'adoption', listingId: String(listingId) });
  return data;
}

export async function fetchMessages(conversationId) {
  const { data } = await api.get(`/chat/conversations/${conversationId}/messages`);
  return data;
}

export async function sendChatMessage(conversationId, { type = 'text', text = '', mediaUrl = null }) {
  const { data } = await api.post(`/chat/conversations/${conversationId}/messages`, { type, text, mediaUrl });
  return data;
}

/**
 * Live subscription to a conversation over Socket.IO.
 * Calls `onMessage` for each new live message; returns an unsubscribe fn.
 * History is loaded separately via `fetchMessages` (Mongo). Falls back to a
 * no-op if the socket can't be established — the UI still shows REST history.
 */
export async function subscribeToConversation(conversationId, onMessage) {
  try {
    const { connectSocket } = await import('./socket');
    const socket = connectSocket();
    const handler = (payload) => {
      if (!payload || String(payload.conversationId) !== String(conversationId)) return;
      onMessage(payload); // { key, senderId, type, text, mediaUrl, at }
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
