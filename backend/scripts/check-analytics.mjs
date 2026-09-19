/**
 * Behavioural check for customer activity tracking and cookie consent.
 *
 *   node scripts/check-analytics.mjs
 *
 * Runs against an ISOLATED scratch database (`<dbname>_checks`) and drops it
 * afterwards.
 *
 * The rule that matters most here is the consent gate: a visitor who declined
 * must generate NO rows. That is a legal position, not a preference, so it is
 * asserted from several angles — before any decision, after a decline, and
 * after a withdrawal that must also erase what was already collected.
 */

import mongoose from 'mongoose';
import { env } from '../src/config/env.js';

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

async function main() {
  const scratchUri = env.mongoUri.replace(/\/([^/?]+)(\?|$)/, (_m, n, t) => `/${n}_checks${t}`);
  await mongoose.connect(scratchUri, { serverSelectionTimeoutMS: 10000 });
  console.log(`\nScratch database: ${mongoose.connection.name}\n`);

  const { ConsentRecord, UserSession, ActivityEvent } =
    await import('../src/modules/analytics/analytics.models.js');
  const svc = await import('../src/modules/analytics/analytics.service.js');

  for (const M of [ConsentRecord, UserSession, ActivityEvent]) await M.deleteMany({});

  const DEV_YES = 'device-consenting-0001';
  const DEV_NO = 'device-declining-0002';
  const userId = new mongoose.Types.ObjectId();

  const evts = (n, over = {}) =>
    Array.from({ length: n }, (_, i) => ({
      type: 'screen_view', path: `/app/screen-${i}`, screen: `Screen ${i}`,
      durationMs: 5000, ...over,
    }));

  /* ── 1. No decision yet = no tracking ────────────────────────────── */
  let r = await svc.recordEvents({ deviceId: DEV_YES, sessionId: 's-pre', events: evts(3) });
  check('nothing recorded before a decision is made', r.written === 0, r.reason || '');
  check('no events written', (await ActivityEvent.countDocuments()) === 0);

  /* ── 2. Decline = still nothing ──────────────────────────────────── */
  await svc.recordConsent({ deviceId: DEV_NO, analytics: false });
  r = await svc.recordEvents({ deviceId: DEV_NO, sessionId: 's-no', events: evts(5) });
  check('a declining visitor records nothing', r.written === 0, r.reason || '');
  check('decline is itself recorded', (await ConsentRecord.countDocuments({ deviceId: DEV_NO })) === 1);
  check('hasAnalyticsConsent is false after decline', (await svc.hasAnalyticsConsent(DEV_NO)) === false);

  /* ── 3. Accept = tracking works ──────────────────────────────────── */
  await svc.recordConsent({ deviceId: DEV_YES, userId, analytics: true });
  check('hasAnalyticsConsent is true after accept', (await svc.hasAnalyticsConsent(DEV_YES)) === true);

  r = await svc.recordEvents({
    deviceId: DEV_YES, userId, sessionId: 's-1', city: 'Mumbai',
    events: [
      { type: 'screen_view', path: '/app/home', screen: 'Home', durationMs: 4000 },
      { type: 'search', query: '  Dog Grooming  ', resultCount: 7 },
      { type: 'item_view', refType: 'provider', refId: 'p1', refName: 'ClipPaw', durationMs: 9000, category: 'grooming' },
      { type: 'checkout_start', path: '/app/checkout' },
      { type: 'booking', refType: 'provider', refId: 'p1' },
    ],
  });
  check('consenting visitor is tracked', r.written === 5, `${r.written} events`);

  const search = await ActivityEvent.findOne({ type: 'search' });
  check('search text is normalised', search.query === 'dog grooming', `"${search.query}"`);

  /* ── 4. Session rollup ───────────────────────────────────────────── */
  const s1 = await UserSession.findOne({ sessionId: 's-1' });
  check('session created from the events', !!s1);
  check('session counts screens and searches', s1.screenCount === 1 && s1.searchCount === 1,
        `screens=${s1.screenCount} searches=${s1.searchCount}`);
  check('session marked converted on booking', s1.converted === true && s1.conversionType === 'booking');
  check('session records entry and exit path', s1.entryPath === '/app/home' && s1.exitPath === '');

  /* ── 5. Query strings are never stored ───────────────────────────── */
  await svc.recordEvents({
    deviceId: DEV_YES, userId, sessionId: 's-2',
    events: [{ type: 'screen_view', path: '/app/reset?token=SECRET123&x=1', screen: 'Reset' }],
  });
  const leaked = await ActivityEvent.findOne({ path: /SECRET123/ });
  check('query strings are stripped from paths', leaked === null);
  const stored = await ActivityEvent.findOne({ sessionId: 's-2' });
  check('path kept without the query', stored.path === '/app/reset', stored.path);

  /* ── 6. Reports ──────────────────────────────────────────────────── */
  const searches = await svc.topSearches({});
  check('top searches reports the query', searches[0]?.query === 'dog grooming', searches[0]?.query);

  const viewed = await svc.topViewedItems({});
  check('top viewed reports the item', viewed[0]?.name === 'ClipPaw', viewed[0]?.name);

  const funnel = await svc.conversionFunnel({});
  const stageOf = (n) => funnel.stages.find((s) => s.stage.startsWith(n))?.sessions;
  check('funnel counts distinct sessions per stage',
        stageOf('Visited') === 2 && stageOf('Viewed') === 1 && stageOf('Completed') === 1,
        `visited=${stageOf('Visited')} viewed=${stageOf('Viewed')} completed=${stageOf('Completed')}`);

  const locs = await svc.browsingByLocation({});
  check('browsing by location reports the city', locs.some((l) => l.city === 'Mumbai'));

  const journey = await svc.customerActivity(userId, {});
  check('customer journey groups events into visits', journey.sessions.length === 2,
        `${journey.sessions.length} sessions`);
  check('journey reports totals', journey.totals.searches === 1 && journey.totals.conversions === 1);

  const summary = await svc.behaviourSummary({});
  check('summary reports the consent opt-in rate',
        summary.consent.asked === 2 && summary.consent.granted === 1 && summary.consent.grantRate === 50,
        `${summary.consent.granted}/${summary.consent.asked} = ${summary.consent.grantRate}%`);

  /* ── 7. Withdrawal erases what was collected ─────────────────────── */
  const before = await ActivityEvent.countDocuments({ deviceId: DEV_YES });
  await svc.recordConsent({ deviceId: DEV_YES, userId, analytics: false, source: 'withdrawn' });
  const after = await ActivityEvent.countDocuments({ deviceId: DEV_YES });
  const sessionsAfter = await UserSession.countDocuments({ deviceId: DEV_YES });
  check('withdrawal erases collected events', before > 0 && after === 0, `${before} -> ${after}`);
  check('withdrawal erases sessions too', sessionsAfter === 0);
  check('tracking stops after withdrawal',
        (await svc.recordEvents({ deviceId: DEV_YES, sessionId: 's-3', events: evts(2) })).written === 0);
  check('the withdrawal decision itself is retained',
        (await ConsentRecord.countDocuments({ deviceId: DEV_YES })) === 2, 'grant + withdrawal both kept');

  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();

  const failed = results.filter((x) => !x.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log('\nFailed:');
    failed.forEach((f) => console.log(`  - ${f.name} ${f.detail}`));
    process.exit(1);
  }
  console.log('Scratch database dropped. Real data untouched.\n');
}

main().catch((err) => {
  console.error('\ncheck FAILED to run:', err);
  process.exit(1);
});
