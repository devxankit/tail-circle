/**
 * Phase 7 exit-criteria check. Run with the dev server already up:
 *   node src/server.js   (in another terminal)
 *   node scripts/phase7-check.js
 */
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { normalizePhone } from '../src/utils/phone.js';
import { User } from '../src/modules/user/user.model.js';
import { Otp } from '../src/modules/auth/otp.model.js';
import {
  Post,
  PostLike,
  PostComment,
  Swipe,
  Match,
  Conversation,
  Message,
  Story,
} from '../src/modules/social/social.models.js';
import { initFirebase } from '../src/config/firebase.js';

const BASE = `http://localhost:${env.port}${env.apiPrefix}`;
let pass = 0;
let fail = 0;
const check = (name, ok, extra = '') => {
  if (ok) pass++;
  else fail++;
  console.log(`  ${ok ? '✅' : '❌'} ${name}${extra ? ` — ${extra}` : ''}`);
};
const json = (res) => res.json().catch(() => ({}));
const authed = (t) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${t}` });

await mongoose.connect(env.mongoUri);
const { connectRedis, disconnectRedis } = await import('../src/config/redis.js');
const { invalidate } = await import('../src/services/cache.service.js');
await connectRedis();
await new Promise((r) => setTimeout(r, 400));
await invalidate('rl:auth:*');
await invalidate('rl:api:*');
await invalidate('otp:*');
await invalidate('community:*');
initFirebase();

async function loginAs(rawPhone) {
  const phone = normalizePhone(rawPhone);
  await Otp.deleteMany({ phone });
  await Otp.create({
    phone,
    codeHash: await bcrypt.hash('1234', 10),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });
  const res = await fetch(`${BASE}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: rawPhone, code: '1234' }),
  });
  return (await json(res)).data;
}

const PHONES = ['9999900013', '9999900014'];
for (const p of PHONES.map(normalizePhone)) {
  const u = await User.findOne({ phone: p });
  if (u) {
    await Promise.all([
      PostLike.deleteMany({ userId: u._id }),
      PostComment.deleteMany({ userId: u._id }),
      Post.deleteMany({ authorId: u._id }),
      Swipe.deleteMany({ userId: u._id }),
      Match.deleteMany({ userId: u._id }),
      Conversation.deleteMany({ participants: u._id }),
      Story.deleteMany({ userId: u._id }),
      User.deleteOne({ _id: u._id }),
    ]);
  }
}
const [a, b] = await Promise.all(PHONES.map(loginAs));

// ── 1. Community ─────────────────────────────────────────
const feed = await json(await fetch(`${BASE}/community/posts`));
check('8 seeded posts in feed', feed.data?.length === 8 && feed.data.some((p) => p.authorName === 'Sarah M.'));

const created = await json(
  await fetch(`${BASE}/community/posts`, {
    method: 'POST',
    headers: authed(a.accessToken),
    body: JSON.stringify({ content: 'Phase 7 check post!', category: 'Advice' }),
  })
);
check('post created with author from account', created.data?.authorName?.length > 0);

const like1 = await json(
  await fetch(`${BASE}/community/posts/${created.data._id}/like`, { method: 'POST', headers: authed(b.accessToken) })
);
const like2 = await json(
  await fetch(`${BASE}/community/posts/${created.data._id}/like`, { method: 'POST', headers: authed(b.accessToken) })
);
check('like toggles on/off', like1.data?.liked === true && like1.data?.likesCount === 1 && like2.data?.liked === false && like2.data?.likesCount === 0);

const comment = await json(
  await fetch(`${BASE}/community/posts/${created.data._id}/comments`, {
    method: 'POST',
    headers: authed(b.accessToken),
    body: JSON.stringify({ text: 'Nice one!' }),
  })
);
check('comment persists + count bumps', comment.data?.text === 'Nice one!' && (await Post.findById(created.data._id)).commentsCount === 1);

// ── 2. Matches ───────────────────────────────────────────
const deck = await json(await fetch(`${BASE}/matches/deck`, { headers: authed(a.accessToken) }));
check('deck has 5 seeded profiles', deck.data?.length === 5);

const bella = deck.data.find((p) => p.name === 'Bella'); // offline → no auto-like-back
const luna = deck.data.find((p) => p.name === 'Luna'); // online → matches

const passSwipe = await json(
  await fetch(`${BASE}/matches/swipe`, {
    method: 'POST',
    headers: authed(a.accessToken),
    body: JSON.stringify({ profileId: bella._id, action: 'like' }),
  })
);
check('like on non-reciprocating profile → no match', passSwipe.data?.matched === false);

const matchSwipe = await json(
  await fetch(`${BASE}/matches/swipe`, {
    method: 'POST',
    headers: authed(a.accessToken),
    body: JSON.stringify({ profileId: luna._id, action: 'like' }),
  })
);
check('mutual like → match + conversation', matchSwipe.data?.matched === true && matchSwipe.data?.conversationId);

const deckAfter = await json(await fetch(`${BASE}/matches/deck`, { headers: authed(a.accessToken) }));
check('swiped profiles leave the deck', deckAfter.data?.length === 3);

const myMatches = await json(await fetch(`${BASE}/matches`, { headers: authed(a.accessToken) }));
check('matches list populated', myMatches.data?.length === 1 && myMatches.data[0].profileId?.name === 'Luna');

// ── 3. Chat (Mongo mirror + RTDB live layer) ─────────────
const convId = matchSwipe.data.conversationId;
const sent = await json(
  await fetch(`${BASE}/chat/conversations/${convId}/messages`, {
    method: 'POST',
    headers: authed(a.accessToken),
    body: JSON.stringify({ text: 'Hi Luna! Park tomorrow?' }),
  })
);
check('message stored in Mongo mirror', sent.data?.text === 'Hi Luna! Park tomorrow?');

const history = await json(
  await fetch(`${BASE}/chat/conversations/${convId}/messages`, { headers: authed(a.accessToken) })
);
check('history readable', history.data?.length === 1);

const convs = await json(await fetch(`${BASE}/chat/conversations`, { headers: authed(a.accessToken) }));
check('conversation list shows counterpart + last message', convs.data?.[0]?.counterpart?.name === 'Luna' && convs.data[0].lastMessage.includes('Park'));

const idorMsg = await fetch(`${BASE}/chat/conversations/${convId}/messages`, { headers: authed(b.accessToken) });
check('cross-user conversation blocked (IDOR)', idorMsg.status === 404);

// Live delivery now runs on Socket.IO (Firebase RTDB removed from chat).
// Conversations are participant-scoped; connect as the participant (A), send a
// message, and verify it fans out live to that participant's socket.
{
  const { io: ioClient } = await import('socket.io-client');
  const ORIGIN = `http://localhost:${env.port}`;
  const clientA = ioClient(ORIGIN, { auth: { token: a.accessToken }, transports: ['websocket'], reconnection: false });
  try {
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('socket connect timeout')), 5000);
      clientA.on('connect', () => { clearTimeout(t); resolve(); });
      clientA.on('connect_error', (e) => { clearTimeout(t); reject(e); });
    });
    const livePromise = new Promise((resolve) => {
      const t = setTimeout(() => resolve(null), 4000);
      clientA.on('chat:message:new', (p) => { if (String(p?.conversationId) === String(convId)) { clearTimeout(t); resolve(p); } });
    });
    await json(await fetch(`${BASE}/chat/conversations/${convId}/messages`, {
      method: 'POST', headers: authed(a.accessToken), body: JSON.stringify({ text: 'See you at 5!' }),
    }));
    const live = await livePromise;
    check('message delivered live over Socket.IO', live?.text === 'See you at 5!' && live.senderId === String(a.user._id || a.user.id));
  } catch (err) {
    check('message delivered live over Socket.IO', false, err.message);
  } finally {
    clientA.close();
  }
  const history2 = await json(await fetch(`${BASE}/chat/conversations/${convId}/messages`, { headers: authed(a.accessToken) }));
  check('chat persists in Mongo without Firebase RTDB', history2.data?.length === 2);
}

// ── 4. Adoption conversation (ShelterChat) ───────────────
const shelterConv = await json(
  await fetch(`${BASE}/chat/conversations`, {
    method: 'POST',
    headers: authed(b.accessToken),
    body: JSON.stringify({ context: 'adoption', listingId: 'ADOPT-103' }),
  })
);
check('adoption conversation with shelter counterpart', shelterConv.data?.context === 'adoption' && shelterConv.data?.counterpart?.name?.length > 0);
const shelterConvAgain = await json(
  await fetch(`${BASE}/chat/conversations`, {
    method: 'POST',
    headers: authed(b.accessToken),
    body: JSON.stringify({ context: 'adoption', listingId: 'ADOPT-103' }),
  })
);
check('conversation ensure is idempotent', shelterConvAgain.data?._id === shelterConv.data._id);

// ── 5. Stories ───────────────────────────────────────────
const story = await json(
  await fetch(`${BASE}/stories`, {
    method: 'POST',
    headers: authed(a.accessToken),
    body: JSON.stringify({ mediaUrl: 'https://res.cloudinary.com/demo/image/upload/story.jpg' }),
  })
);
const ttlOk = new Date(story.data?.expiresAt) - Date.now();
check('story published with 24h TTL', ttlOk > 23 * 3600 * 1000 && ttlOk <= 24 * 3600 * 1000);
const activeStories = await json(await fetch(`${BASE}/stories`, { headers: authed(b.accessToken) }));
check('active stories visible to others', activeStories.data?.some((s) => s._id === story.data._id));

console.log(`\n${pass} passed, ${fail} failed`);
await mongoose.disconnect();
await disconnectRedis();
process.exit(fail ? 1 : 0);
