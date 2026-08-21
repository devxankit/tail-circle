/**
 * Story likes end to end: like -> owner gets an in-app Notification row (which
 * is also what fires the FCM push) -> counts surface where the view count is
 * shown.
 */
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import http from 'http';
import app from '../../src/app.js';
import { User } from '../../src/modules/user/user.model.js';
import { Story, StoryView, StoryLike } from '../../src/modules/social/social.models.js';
import { Notification } from '../../src/modules/notification/notification.model.js';

const PORT = 5967;
const BASE = `http://localhost:${PORT}/api`;
let pass = 0;
let fail = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` -- ${detail}` : ''}`);
  if (ok) pass += 1;
  else fail += 1;
};

const mkUser = (email, name, phone) =>
  User.findOneAndUpdate(
    { email },
    { $set: { name, phone, role: 'user' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

const tok = (u) =>
  jwt.sign({ sub: String(u._id), role: 'user' }, process.env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
const H = (u) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${tok(u)}` });
const call = async (m, p, u, body) => {
  const r = await fetch(BASE + p, {
    method: m,
    headers: H(u),
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => null) };
};

await mongoose.connect(process.env.MONGODB_URI);
const server = http.createServer(app);
await new Promise((r) => server.listen(PORT, r));

const owner = await mkUser('e2e.like.owner@tailcircle.test', 'Story Owner', '9000009911');
const fanA = await mkUser('e2e.like.a@tailcircle.test', 'Fan A', '9000009912');
const fanB = await mkUser('e2e.like.b@tailcircle.test', 'Fan B', '9000009913');
const ids = [owner._id, fanA._id, fanB._id];
await Story.deleteMany({ userId: { $in: ids } });
await Notification.deleteMany({ userId: { $in: ids } });

console.log('\n1. Publish + like');
const pub = await call('POST', '/stories', owner, { mediaUrl: 'https://example.com/s.jpg', caption: 'hi' });
const story = pub.body.data;
check('story publishes', pub.status === 201 && Boolean(story && story._id));
check('starts at zero likes', (story.likesCount || 0) === 0, `likesCount=${story.likesCount || 0}`);

await call('POST', `/stories/${story._id}/view`, fanA);
const like1 = await call('POST', `/stories/${story._id}/like`, fanA);
check(
  'a like registers',
  like1.status === 200 && like1.body.data.liked === true,
  `liked=${like1.body?.data?.liked} count=${like1.body?.data?.likesCount}`
);
check('count reflects it', like1.body?.data?.likesCount === 1);

console.log('\n2. The owner is notified (in-app + push)');
await new Promise((r) => setTimeout(r, 500));
const notes = await Notification.find({ userId: owner._id }).lean();
const n = notes.find((x) => x.data?.kind === 'story_like');
check('an in-app notification row exists', Boolean(n), n ? `"${n.title}: ${n.body}"` : 'none');
check('it names the liker', Boolean(n && n.body.includes('Fan A')), n?.body);
check('it carries the story id for deep-link', String(n?.data?.storyId) === String(story._id));
check('it opens the right screen', n?.link === '/app/chat', n?.link);
check('typed for the social bucket', n?.type === 'match', n?.type);
const feed = await call('GET', '/notifications', owner);
const items = feed.body?.data?.items || feed.body?.data || [];
check(
  'it shows in the notifications API the UI reads',
  Array.isArray(items) && items.some((x) => x?.data?.kind === 'story_like'),
  `status ${feed.status}, ${Array.isArray(items) ? items.length : 0} item(s)`
);

console.log('\n3. Idempotency and counter integrity');
const [r1, r2] = await Promise.all([
  call('POST', `/stories/${story._id}/like`, fanB),
  call('POST', `/stories/${story._id}/like`, fanB),
]);
check('a racing double-tap never errors', r1.status === 200 && r2.status === 200, `${r1.status} / ${r2.status}`);
const rows = await StoryLike.countDocuments({ storyId: story._id });
const fresh = await Story.findById(story._id).lean();
check('counter matches the rows that exist', fresh.likesCount === rows, `counter ${fresh.likesCount}, rows ${rows}`);

const noteCount = () => Notification.countDocuments({ userId: owner._id, 'data.kind': 'story_like' });
const before = await noteCount();
const un = await call('POST', `/stories/${story._id}/like`, fanA);
check('unliking works', un.body?.data?.liked === false, `count=${un.body?.data?.likesCount}`);
const afterUnlike = await Story.findById(story._id).lean();
const rowsAfter = await StoryLike.countDocuments({ storyId: story._id });
check('counter still matches after unlike', afterUnlike.likesCount === rowsAfter,
  `counter ${afterUnlike.likesCount}, rows ${rowsAfter}`);
await new Promise((r) => setTimeout(r, 400));
const afterUnlikeNotes = await noteCount();
check('unliking sends no notification', afterUnlikeNotes === before, `${before} -> ${afterUnlikeNotes}`);

await call('POST', `/stories/${story._id}/like`, fanA);
await new Promise((r) => setTimeout(r, 400));
const afterRelike = await noteCount();
check('re-liking notifies again', afterRelike === before + 1, `${before} -> ${afterRelike}`);

for (let i = 0; i < 5; i += 1) await call('POST', `/stories/${story._id}/like`, fanA);
const bounced = await Story.findById(story._id).lean();
check('counter never goes negative after rapid toggling', bounced.likesCount >= 0, `likesCount=${bounced.likesCount}`);
check('and still matches the rows', bounced.likesCount === (await StoryLike.countDocuments({ storyId: story._id })));

console.log('\n4. Liking my own story is refused');
const selfBefore = await Notification.countDocuments({ userId: owner._id });
const self = await call('POST', `/stories/${story._id}/like`, owner);
check('the API rejects a self-like', self.status === 400, `status ${self.status}`);
check('and it never counts', (await StoryLike.countDocuments({ storyId: story._id, userId: owner._id })) === 0);
await new Promise((r) => setTimeout(r, 300));
check('no self-notification', (await Notification.countDocuments({ userId: owner._id })) === selfBefore);

console.log('\n5. Counts land where the view count is shown');
// fanB never called /view -- liking alone must still put them in Viewed By.
await StoryLike.deleteMany({ storyId: story._id });
await StoryView.deleteMany({ storyId: story._id });
await Story.updateOne({ _id: story._id }, { $set: { likesCount: 0 } });
await call('POST', `/stories/${story._id}/like`, fanB);
const viewers = await call('GET', `/stories/${story._id}/viewers`, owner);
check('owner gets viewers + likes in one call',
  viewers.status === 200 && Array.isArray(viewers.body?.data?.viewers)
    && typeof viewers.body?.data?.likesCount === 'number',
  `views=${viewers.body?.data?.viewsCount} likes=${viewers.body?.data?.likesCount}`);
check('a viewer who liked is flagged', viewers.body.data.viewers.some((v) => v.liked === true));
check('every liker appears in Viewed By, not just in the tally',
  viewers.body.data.viewers.filter((v) => v.liked).length === viewers.body.data.likesCount,
  `flagged=${viewers.body.data.viewers.filter((v) => v.liked).length} likes=${viewers.body.data.likesCount}`);
const forbidden = await call('GET', `/stories/${story._id}/viewers`, fanA);
check('still owner-only', forbidden.status === 403, `status ${forbidden.status}`);

const deck = await call('GET', '/stories', fanB);
const seen = (deck.body?.data || []).find((x) => String(x._id) === String(story._id));
check('the rail gets likesCount', seen?.likesCount === 1, `likesCount=${seen?.likesCount}`);
check('and my own like state', seen?.likedByMe === true, `likedByMe=${seen?.likedByMe}`);
const deckA = await call('GET', '/stories', fanA);
const seenA = (deckA.body?.data || []).find((x) => String(x._id) === String(story._id));
check('like state is per-user, not global',
  seenA?.likedByMe === false && seenA?.likesCount === 1,
  `fanA likedByMe=${seenA?.likedByMe} count=${seenA?.likesCount}`);

console.log('\n6. Bad input');
const gone = await call('POST', '/stories/6a000000000000000000dead/like', fanA);
check('liking a missing story 404s', gone.status === 404, `status ${gone.status}`);
const bad = await call('POST', '/stories/undefined/like', fanA);
check('a malformed id is rejected, not crashed', bad.status >= 400 && bad.status < 500, `status ${bad.status}`);

await StoryLike.deleteMany({ storyId: story._id });
await StoryView.deleteMany({ storyId: story._id });
await Story.deleteMany({ userId: { $in: ids } });
await Notification.deleteMany({ userId: { $in: ids } });
await User.deleteMany({ _id: { $in: ids } });

console.log(`\n${pass} passed, ${fail} failed`);
server.close();
await mongoose.disconnect();
process.exit(fail ? 1 : 0);
