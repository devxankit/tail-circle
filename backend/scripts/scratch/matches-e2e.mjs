/**
 * End-to-end check of the match engine, chat and stories.
 *
 * Two real owners with two real pets, so reciprocity is exercised for what it
 * actually claims to do: only a mutual like should ever produce a match.
 */
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import http from 'http';
import app from '../../src/app.js';
import { User } from '../../src/modules/user/user.model.js';
import { Pet } from '../../src/modules/pet/pet.model.js';
import {
  MatchProfile, Swipe, Match, Conversation, Message, Story, StoryView,
  Post, PostLike,
} from '../../src/modules/social/social.models.js';

const SECRET = process.env.JWT_ACCESS_SECRET || 'tailcircle-access-secret-key-32chars!';
const API = 'http://localhost:5969/api';
const tok = (id) => jwt.sign({ sub: String(id), role: 'user' }, SECRET, { expiresIn: '1h' });

let pass = 0;
let fail = 0;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}${detail ? ` -- ${detail}` : ''}`);
  if (ok) pass += 1;
  else fail += 1;
};

async function call(path, { token, method = 'GET', body } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ...json };
}

const TAG = 'E2E-MATCH';

async function makeOwner(suffix, petName) {
  const user = await User.findOneAndUpdate(
    { email: `e2e.match.${suffix}@tailcircle.test` },
    { $set: { name: `${TAG} ${suffix}`, phone: `90000009${suffix}`, role: 'user' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const pet = await Pet.findOneAndUpdate(
    { ownerId: user._id, name: petName },
    { $set: { species: 'dog', breed: 'Beagle', deletedAt: null } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const profile = await MatchProfile.findOneAndUpdate(
    { ownerId: user._id, name: petName },
    {
      $set: {
        petId: pet._id, type: 'Dog', gender: 'Male', breed: 'Beagle',
        distance: 3, temperament: ['Playful'], purpose: 'Playdate',
        activityLevel: 'High', active: true, autoLikesBack: false,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return { user, pet, profile, token: tok(user._id) };
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const server = http.createServer(app);
  await new Promise((r) => server.listen(5969, r));

  // clean slate
  const olds = await User.find({ email: /^e2e\.match\./ }).distinct('_id');
  const oldProfiles = await MatchProfile.find({ ownerId: { $in: olds } }).distinct('_id');
  await Swipe.deleteMany({ $or: [{ userId: { $in: olds } }, { profileId: { $in: oldProfiles } }] });
  await Match.deleteMany({ $or: [{ userId: { $in: olds } }, { profileId: { $in: oldProfiles } }] });
  await Conversation.deleteMany({ participants: { $in: olds } });
  await Story.deleteMany({ userId: { $in: olds } });

  const A = await makeOwner('01', `${TAG} Alfie`);
  const B = await makeOwner('02', `${TAG} Bella`);
  const C = await makeOwner('03', `${TAG} Coco`);

  /* 1. the deck */
  console.log('\n1. Discovery deck');
  const deck = await call('/matches/deck', { token: A.token });
  check('deck loads', deck.status === 200, `${deck.data?.length} profiles`);
  check('my own pet is not in my deck',
    !(deck.data || []).some((p) => String(p.ownerId) === String(A.user._id)),
    'own profile excluded');
  check('every card carries a compatibility score',
    (deck.data || []).every((p) => typeof p.compatibilityScore === 'number'),
    `e.g. ${deck.data?.[0]?.compatibilityScore}`);
  check('deck is ranked best-first',
    (deck.data || []).every((p, i, arr) => i === 0 || arr[i - 1].compatibilityScore >= p.compatibilityScore));

  /* 2. passing */
  console.log('\n2. Passing');
  const passed = await call('/matches/swipe', {
    token: A.token, method: 'POST', body: { profileId: String(C.profile._id), action: 'pass' },
  });
  check('a pass never matches', passed.data?.matched === false, JSON.stringify(passed.data));
  const deck2 = await call('/matches/deck', { token: A.token });
  check('a passed profile leaves the deck',
    !(deck2.data || []).some((p) => p.id === String(C.profile._id)));

  /* 3. THE RECIPROCITY RULE */
  console.log('\n3. Reciprocity — a match needs BOTH sides to like each other');
  // C likes someone unrelated (A's pet was passed on, so use B).
  await call('/matches/swipe', {
    token: C.token, method: 'POST', body: { profileId: String(B.profile._id), action: 'like' },
  });

  // A now likes C. C has liked *B*, never A — so this must NOT be a match.
  const shouldNotMatch = await call('/matches/swipe', {
    token: A.token, method: 'POST', body: { profileId: String(C.profile._id), action: 'like' },
  });
  check('liking someone who liked a DIFFERENT pet does not match',
    shouldNotMatch.data?.matched === false,
    shouldNotMatch.data?.matched ? 'FALSE MATCH — reciprocity ignores who was liked' : 'correctly no match');

  // B likes A's pet, then A likes B's pet → genuine mutual like.
  await call('/matches/swipe', {
    token: B.token, method: 'POST', body: { profileId: String(A.profile._id), action: 'like' },
  });
  const mutual = await call('/matches/swipe', {
    token: A.token, method: 'POST', body: { profileId: String(B.profile._id), action: 'like' },
  });
  check('a genuine mutual like DOES match', mutual.data?.matched === true,
    JSON.stringify(mutual.data?.matched));
  check('the match opens a conversation', Boolean(mutual.data?.conversationId),
    String(mutual.data?.conversationId));

  /* 4. both sides should see it */
  console.log('\n4. Both owners see the match');
  const convId = mutual.data?.conversationId;
  const aMatches = await call('/matches', { token: A.token });
  const bMatches = await call('/matches', { token: B.token });
  check('the swiper sees the match',
    (aMatches.data || []).some((m) => String(m.conversationId) === String(convId)),
    `${aMatches.data?.length} matches`);
  // Assert on THIS conversation: "has at least one match" passed for the wrong
  // reason while false matches were being created.
  check('the person who liked first also sees the same match',
    (bMatches.data || []).some((m) => String(m.conversationId) === String(convId)),
    bMatches.data?.length ? `${bMatches.data.length} matches, none for this conversation` : 'B sees NO match');

  const bConvos = await call('/chat/conversations', { token: B.token });
  check('and can open the shared chat',
    (bConvos.data || []).some((c) => String(c._id || c.id) === String(convId)),
    `${bConvos.data?.length} conversations`);

  const bOpens = await call(`/chat/conversations/${convId}`, { token: B.token });
  check('the counterpart is a real participant', bOpens.status === 200, `status ${bOpens.status}`);

  // The match notification and the matches list both deep-link to
  // /app/chat/room/<conversationId>, so that id must resolve on its own —
  // with a counterpart the header can render without any router state.
  const deepLink = await call(`/chat/conversations/${convId}`, { token: A.token });
  check('a deep link to the conversation resolves', deepLink.status === 200,
    `status ${deepLink.status}`);
  check('the conversation names who it is with',
    Boolean(deepLink.data?.counterpart?.name),
    `counterpart "${deepLink.data?.counterpart?.name}"`);

  const strayA = (aMatches.data || []).filter((m) => String(m.conversationId) !== String(convId));
  check('no phantom matches were created along the way', strayA.length === 0,
    strayA.length ? `${strayA.length} unexplained match(es) for A` : 'clean');

  /* 5. chat */
  console.log('\n5. Chat');
  const sent = await call(`/chat/conversations/${convId}/messages`, {
    token: A.token, method: 'POST', body: { text: 'Hello from Alfie!' },
  });
  check('a message sends', sent.status === 200 || sent.status === 201, `status ${sent.status}`);

  const msgs = await call(`/chat/conversations/${convId}/messages`, { token: A.token });
  check('it reads back', (msgs.data || []).some((m) => m.text === 'Hello from Alfie!'),
    `${msgs.data?.length} messages`);

  const bView = await call('/chat/conversations', { token: B.token });
  const bConv = (bView.data || []).find((c) => String(c._id || c.id) === String(convId));
  check('the recipient gets an unread count', (bConv?.unreadCount || 0) > 0,
    `unread ${bConv?.unreadCount}`);

  await call(`/chat/conversations/${convId}/read`, { token: B.token, method: 'POST' });
  const bAfter = await call('/chat/conversations', { token: B.token });
  const bConv2 = (bAfter.data || []).find((c) => String(c._id || c.id) === String(convId));
  check('reading clears it', (bConv2?.unreadCount || 0) === 0, `unread ${bConv2?.unreadCount}`);

  const stranger = await call(`/chat/conversations/${convId}/messages`, { token: C.token });
  check('an outsider cannot read the conversation', stranger.status >= 400, `status ${stranger.status}`);

  /* 6. stories */
  console.log('\n6. Stories');
  const story = await call('/stories', {
    token: A.token, method: 'POST',
    body: { mediaUrl: 'https://example.com/story.jpg', caption: 'Beach day' },
  });
  check('a story publishes', story.status === 201, `status ${story.status} ${story.message || ''}`);
  const storyId = story.data?._id;

  const feedB = await call('/stories', { token: B.token });
  const seen = (feedB.data || []).find((s) => String(s._id) === String(storyId));
  check('it appears in another user\'s feed', Boolean(seen));
  check('and starts unviewed for them', seen?.viewed === false, `viewed=${seen?.viewed}`);

  await call(`/stories/${storyId}/view`, { token: B.token, method: 'POST' });
  const feedB2 = await call('/stories', { token: B.token });
  check('watching marks it viewed',
    (feedB2.data || []).find((s) => String(s._id) === String(storyId))?.viewed === true);

  // /viewers now returns { viewers, viewsCount, likesCount } so the owner's
  // panel can show views and likes from one call -- see story-like-e2e.mjs.
  const viewers = await call(`/stories/${storyId}/viewers`, { token: A.token });
  check('the owner sees who watched', (viewers.data?.viewers || []).length === 1,
    `${viewers.data?.viewers?.length} viewer(s)`);
  check('and the like tally alongside it', typeof viewers.data?.likesCount === 'number',
    `likesCount=${viewers.data?.likesCount}`);

  const nosy = await call(`/stories/${storyId}/viewers`, { token: B.token });
  check('nobody else can see the viewer list', nosy.status >= 400, `status ${nosy.status}`);

  const ownFeed = await call('/stories', { token: A.token });
  check('my own story never shows as unwatched',
    (ownFeed.data || []).find((s) => String(s._id) === String(storyId))?.viewed === true);

  /* 7. engine config */
  console.log('\n7. Match engine configuration');
  const cfg = await call('/matches/engine/config', { token: A.token });
  check('config is readable', cfg.status === 200, JSON.stringify(cfg.data).slice(0, 80));

  const tamper = await call('/matches/engine/config', {
    token: A.token, method: 'PATCH', body: { weightProximity: 999, enableAutoReciprocity: false },
  });
  check('an ordinary user cannot retune the global engine', tamper.status >= 400,
    tamper.status < 400 ? 'ANY LOGGED-IN USER CAN CHANGE IT FOR EVERYONE' : `status ${tamper.status}`);

  // put it back if it was changed
  if (tamper.status < 400) {
    await call('/matches/engine/config', {
      token: A.token, method: 'PATCH',
      body: { weightProximity: 30, enableAutoReciprocity: true },
    });
  }

  /* 8. community likes */
  console.log('\n8. Community likes');
  const post = await call('/community/posts', {
    token: A.token, method: 'POST', body: { content: `${TAG} anyone else's dog hate the rain?`, category: 'Advice' },
  });
  check('a post publishes', post.status === 201 || post.status === 200, `status ${post.status}`);
  const postId = post.data?._id || post.data?.id;

  const liked = await call(`/community/posts/${postId}/like`, { token: B.token, method: 'POST' });
  check('liking works', liked.data?.liked === true && liked.data?.likesCount === 1,
    `liked=${liked.data?.liked} count=${liked.data?.likesCount}`);

  // A double-tap, or a retried request, must not double-count or 500.
  const [r1, r2] = await Promise.all([
    call(`/community/posts/${postId}/like`, { token: C.token, method: 'POST' }),
    call(`/community/posts/${postId}/like`, { token: C.token, method: 'POST' }),
  ]);
  check('a racing double-like never errors', r1.status < 400 && r2.status < 400,
    `${r1.status} / ${r2.status}`);
  const afterRace = await Post.findById(postId);
  const realLikes = await PostLike.countDocuments({ postId });
  check('the counter matches the rows that exist', afterRace.likesCount === realLikes,
    `counter ${afterRace.likesCount}, rows ${realLikes}`);

  // Unlike twice in parallel — the old code drove this negative.
  await Promise.all([
    call(`/community/posts/${postId}/like`, { token: B.token, method: 'POST' }),
    call(`/community/posts/${postId}/like`, { token: B.token, method: 'POST' }),
  ]);
  const afterUnlike = await Post.findById(postId);
  check('the counter never goes negative', afterUnlike.likesCount >= 0,
    `likesCount ${afterUnlike.likesCount}`);

  /* cleanup */
  await PostLike.deleteMany({ postId });
  await Post.deleteMany({ content: new RegExp(`^${TAG}`) });
  const ids = [A.user._id, B.user._id, C.user._id];
  const profIds = [A.profile._id, B.profile._id, C.profile._id];
  await Swipe.deleteMany({ $or: [{ userId: { $in: ids } }, { profileId: { $in: profIds } }] });
  await Match.deleteMany({ $or: [{ userId: { $in: ids } }, { profileId: { $in: profIds } }] });
  await Message.deleteMany({ conversationId: convId });
  await Conversation.deleteMany({ participants: { $in: ids } });
  await StoryView.deleteMany({ storyId });
  await Story.deleteMany({ userId: { $in: ids } });
  await MatchProfile.deleteMany({ _id: { $in: profIds } });
  await Pet.deleteMany({ ownerId: { $in: ids } });
  await User.deleteMany({ _id: { $in: ids } });

  console.log(`\n${pass} passed, ${fail} failed`);
  server.close();
  await mongoose.disconnect();
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
