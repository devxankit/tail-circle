/**
 * Arithmetic and precedence checks for commission resolution.
 *
 * Pure functions only — no database, so this is safe to run anywhere and
 * cheap enough to run before every deploy that touches settlement.
 *
 *   node scripts/check-commission-math.mjs
 */
import {
  resolveRate,
  sanitizeRate,
  rateFromPercent,
  percentFromRate,
  splitAmount,
  splitPayout,
  assertWithinBounds,
  HARD_FLOOR,
  DEFAULT_TAX_RATE,
} from '../src/modules/vendor/commission.service.js';

let failures = 0;
const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    failures += 1;
    console.log(`  FAIL ${name}\n       expected ${JSON.stringify(expected)}\n       actual   ${JSON.stringify(actual)}`);
  }
  return ok;
};
const section = (t) => console.log(`\n${t}`);

/* ── 1. Precedence: vendor beats category beats global beats floor ── */
section('1. Resolution precedence');
const rates = { global: 0.15, categories: { grooming: 0.2, shop: null } };

check('vendor override wins over category', resolveRate({ override: 0.1, vendorType: 'grooming', rates }), { rate: 0.1, source: 'vendor' });
check('category wins when no override', resolveRate({ override: null, vendorType: 'grooming', rates }), { rate: 0.2, source: 'category' });
check('global when category unset', resolveRate({ override: null, vendorType: 'shop', rates }), { rate: 0.15, source: 'global' });
check('global for unknown category', resolveRate({ override: null, vendorType: 'nope', rates }), { rate: 0.15, source: 'global' });
check('floor when nothing configured', resolveRate({ override: null, vendorType: 'shop', rates: { global: null, categories: {} } }), { rate: HARD_FLOOR, source: 'floor' });
// A deliberate 0% override must survive, not be mistaken for "unset".
check('zero override is honoured', resolveRate({ override: 0, vendorType: 'grooming', rates }), { rate: 0, source: 'vendor' });
check('zero category is honoured', resolveRate({ override: null, vendorType: 'x', rates: { global: 0.15, categories: { x: 0 } } }), { rate: 0, source: 'category' });

/* ── 2. sanitizeRate rejects anything that is not a usable fraction ── */
section('2. Rate sanitising');
check('null stays null', sanitizeRate(null), null);
check('undefined stays null', sanitizeRate(undefined), null);
check('empty string stays null', sanitizeRate(''), null);
// The dangerous one: a percentage that leaked into a fraction field.
check('20 (a percentage) is rejected', sanitizeRate(20), null);
check('1.01 is rejected', sanitizeRate(1.01), null);
check('negative is rejected', sanitizeRate(-0.1), null);
check('NaN is rejected', sanitizeRate(NaN), null);
check('garbage string is rejected', sanitizeRate('abc'), null);
check('0 is valid', sanitizeRate(0), 0);
check('1 is valid', sanitizeRate(1), 1);
check('numeric string is accepted', sanitizeRate('0.2'), 0.2);

/* ── 3. Percent conversion round-trips without float drift ── */
section('3. Percent conversion');
for (const pct of [0, 1, 2.5, 7.35, 10, 12.34, 15, 18.75, 20, 33.33, 50, 99.99, 100]) {
  const rate = rateFromPercent(pct);
  check(`${pct}% round-trips`, percentFromRate(rate), pct);
}
check('10% is exactly 0.1', rateFromPercent(10), 0.1);
check('20% is exactly 0.2', rateFromPercent(20), 0.2);
check('12.5% is exactly 0.125', rateFromPercent(12.5), 0.125);
let threw = false;
try { rateFromPercent(101); } catch { threw = true; }
check('101% is rejected', threw, true);
threw = false;
try { rateFromPercent(-1); } catch { threw = true; }
check('-1% is rejected', threw, true);

/* ── 4. The money invariant: commission + net === gross, exactly ── */
section('4. Split invariant (commission + net === gross)');
const amounts = [0, 1, 3, 7, 99, 100, 101, 999, 1000, 1234, 9999, 100000, 123456789];
const testRates = [0, 0.01, 0.05, 0.1, 0.1234, 0.15, 0.2, 0.3333, 0.5, 0.75, 0.9999, 1];
let splitChecked = 0;
let worstDrift = 0;
for (const gross of amounts) {
  for (const rate of testRates) {
    const r = splitAmount(gross, rate);
    splitChecked += 1;
    if (r.commission + r.net !== r.gross) {
      failures += 1;
      console.log(`  FAIL gross=${gross} rate=${rate} -> ${r.commission} + ${r.net} = ${r.commission + r.net}`);
    }
    if (r.commission < 0 || r.net < 0) {
      failures += 1;
      console.log(`  FAIL negative split at gross=${gross} rate=${rate}: ${JSON.stringify(r)}`);
    }
    if (r.commission > r.gross) {
      failures += 1;
      console.log(`  FAIL commission exceeds gross at gross=${gross} rate=${rate}`);
    }
    // Rounding must never move the cut by more than half a paisa.
    worstDrift = Math.max(worstDrift, Math.abs(r.commission - gross * rate));
  }
}
// Fuzz the same invariant over random values, which is where odd paise appear.
for (let i = 0; i < 20000; i += 1) {
  const gross = Math.floor(Math.random() * 5_000_000);
  const rate = Math.round(Math.random() * 10000) / 10000;
  const r = splitAmount(gross, rate);
  splitChecked += 1;
  if (r.commission + r.net !== r.gross) {
    failures += 1;
    console.log(`  FAIL fuzz gross=${gross} rate=${rate}`);
    break;
  }
  worstDrift = Math.max(worstDrift, Math.abs(r.commission - gross * rate));
}
console.log(`  ${splitChecked.toLocaleString()} splits checked, max rounding drift ${worstDrift.toFixed(4)} paise`);
check('rounding never exceeds half a paisa', worstDrift <= 0.5, true);

/* ── 5. Bad input must fall back, never bill 0% ── */
section('5. Fallback on unusable input');
check('null rate falls back to floor', splitAmount(1000, null).rate, HARD_FLOOR);
check('percentage-shaped rate falls back to floor', splitAmount(1000, 20).rate, HARD_FLOOR);
check('negative rate falls back to floor', splitAmount(1000, -1).rate, HARD_FLOOR);
check('zero gross stays zero', splitAmount(0, 0.2), { gross: 0, commission: 0, net: 0, rate: 0.2 });
check('fractional paise gross is rounded', splitAmount(100.6, 0.2).gross, 101);

/* ── 6. Payout tax: tax + payable === net, exactly ── */
section('6. Payout split (tax + payable === net)');
let payoutChecked = 0;
for (let i = 0; i < 20000; i += 1) {
  const net = Math.floor(Math.random() * 5_000_000);
  const rate = Math.round(Math.random() * 2000) / 10000; // 0–20%
  const r = splitPayout(net, rate);
  payoutChecked += 1;
  if (r.tax + r.payable !== r.net) {
    failures += 1;
    console.log(`  FAIL net=${net} rate=${rate} -> ${r.tax} + ${r.payable} != ${r.net}`);
    break;
  }
  if (r.tax < 0 || r.payable < 0) {
    failures += 1;
    console.log(`  FAIL negative payout split at net=${net} rate=${rate}`);
    break;
  }
}
console.log(`  ${payoutChecked.toLocaleString()} payout splits checked`);
check('5% of 100000 is 5000', splitPayout(100000, 0.05), { net: 100000, tax: 5000, payable: 95000, rate: 0.05 });
check('unusable tax rate falls back', splitPayout(100000, 'nonsense').rate, DEFAULT_TAX_RATE);
check('zero net stays zero', splitPayout(0, 0.05), { net: 0, tax: 0, payable: 0, rate: 0.05 });

/* ── 7. Guardrails reject costly slips ── */
section('7. Commission bounds');
const bounds = { minPercent: 5, maxPercent: 40 };
const rejects = (pct, opts) => {
  try { assertWithinBounds(pct, bounds, opts); return false; } catch { return true; }
};
check('20% is inside the range', rejects(20), false);
check('5% (the minimum) is allowed', rejects(5), false);
check('40% (the maximum) is allowed', rejects(40), false);
// The slip this exists to stop: 2 typed instead of 20.
check('2% is rejected as below the minimum', rejects(2), true);
check('0% is rejected by default', rejects(0), true);
check('0% is allowed when opted into', rejects(0, { allowZero: true }), false);
check('95% is rejected as above the maximum', rejects(95), true);
check('non-numeric is rejected', rejects('abc'), true);

section(failures === 0 ? 'All commission checks passed.' : `${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
