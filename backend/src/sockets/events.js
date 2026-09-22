/**
 * Central registry of Socket.IO event names — always emit/listen via these
 * constants so client and server never drift on strings.
 */
export const SOCKET_EVENTS = {
  // Server → client
  NOTIFICATION_NEW: 'notification:new',
  MATCH_NEW: 'match:new',
  STORY_LIKED: 'story:liked',
  ORDER_STATUS: 'order:status',
  BOOKING_STATUS: 'booking:status',
  WALLET_UPDATED: 'wallet:updated',
  CHAT_MESSAGE_NEW: 'chat:message:new',
  CHAT_CONVERSATION_UPDATED: 'chat:conversation:updated',
  CHAT_TYPING: 'chat:typing',
  CHAT_REACTION: 'chat:message:react',
  CHAT_READ: 'chat:messages:read',
  CHAT_DELETE: 'chat:message:delete',
  PRESENCE_UPDATE: 'presence:update',
  /*
   * New work landing on a partner's panel — a booking request, a paid booking
   * or a new order. Separate from NOTIFICATION_NEW because the partner panel
   * treats it as an ALERT: it rings, and keeps ringing, until acknowledged.
   * A silent badge was never going to get a salon to answer within two hours.
   */
  VENDOR_WORK_NEW: 'vendor:work:new',
  /* Withdraws a ring when the work is answered elsewhere (another tab, the
   * phone, or an admin acting on the partner's behalf). */
  VENDOR_WORK_RESOLVED: 'vendor:work:resolved',
  /* A compliance warning the partner must see immediately. */
  VENDOR_COMPLIANCE_ALERT: 'vendor:compliance:alert',

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
