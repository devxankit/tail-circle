/**
 * Which matches have already been celebrated in this session.
 *
 * A match reaches the client twice: in the swipe response (reliable, and the
 * only copy the swiper is guaranteed to get) and over the `match:new` socket
 * (the only copy the *other* owner gets). Both are worth keeping — dropping
 * the socket would leave half of all matches with no celebration, dropping the
 * response would make the swiper's depend on socket connectivity — so the two
 * are de-duplicated here instead, on conversation id.
 *
 * Session-scoped: a reload at worst costs one repeated modal, which is far
 * better than a match that is never celebrated at all.
 */

const KEY = 'tc_celebrated_matches';

function read() {
  try {
    const raw = sessionStorage.getItem(KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function wasCelebrated(conversationId) {
  if (!conversationId) return false;
  return read().has(String(conversationId));
}

export function markCelebrated(conversationId) {
  if (!conversationId) return;
  try {
    const seen = read();
    seen.add(String(conversationId));
    // Only ever a handful per session; no pruning needed.
    sessionStorage.setItem(KEY, JSON.stringify([...seen]));
  } catch {
    /* private mode — the worst case is one duplicate modal */
  }
}
