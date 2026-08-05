/**
 * Central registry of Socket.IO event names — always emit/listen via these
 * constants so client and server never drift on strings.
 */
export const SOCKET_EVENTS = {
  // Server → client
  NOTIFICATION_NEW: 'notification:new',
  MATCH_NEW: 'match:new',
  ORDER_STATUS: 'order:status',
  BOOKING_STATUS: 'booking:status',
  WALLET_UPDATED: 'wallet:updated',
  CHAT_MESSAGE_NEW: 'chat:message:new',
  CHAT_CONVERSATION_UPDATED: 'chat:conversation:updated',
  PRESENCE_UPDATE: 'presence:update',

  // Client → server
  JOIN_ROOM: 'room:join',
  LEAVE_ROOM: 'room:leave',
};

/** Room name helpers — one place to change naming. */
export const rooms = {
  user: (userId) => `user:${userId}`,
  vendor: (vendorId) => `vendor:${vendorId}`,
  admins: () => 'admins',
  conversation: (conversationId) => `conversation:${conversationId}`,
  // Every authenticated socket joins this — the cheapest way to fan out
  // online/offline flips to whoever happens to have someone's chat open,
  // without the server tracking who's watching whom.
  presence: () => 'presence:all',
};
