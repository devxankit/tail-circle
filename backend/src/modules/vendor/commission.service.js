import { PlatformSetting } from '../admin/admin.models.js';
import { VendorProfile } from './vendor.models.js';
import { VENDOR_TYPE_LABEL } from './vendorTypeLabels.js';
import { ApiError } from '../../utils/ApiError.js';

/**
 * The one place a commission rate is decided.
 *
 * Three levels, most specific first:
 *
 *   1. Vendor override  — VendorProfile.commissionRate, per business line.
 *                         `null` means "inherit", which is what every profile
 *                         starts as. This is how one grooming partner can be
 *                         on 10% while the category sits at 20%.
 *   2. Category default — PlatformSetting `commission.<vendorType>`.
 *   3. Global default   — PlatformSetting `commission.default`.
 *
 * `HARD_FLOOR` is the last resort if the settings rows are missing entirely,
 * so a wiped settings collection can never silently bill 0% and give the
 * platform's cut away.
 *
 * Rates are fractions (0.2 === 20%), never percentages. Everything that
 * crosses an API boundary as a percentage is converted at the edge by
 * `rateFromPercent` / `percentFromRate`, never by hand.
 */

export const HARD_FLOOR = 0.15;
export const GLOBAL_KEY = 'commission.default';
export const VENDOR_TYPES = Object.keys(VENDOR_TYPE_LABEL);

/* Payout tax, and the guardrails on what a commission rate may be set to. */
export const TAX_KEY = 'tax.gst';
export const MIN_KEY = 'commission.minPercent';
export const MAX_KEY = 'commission.maxPercent';
/** Used only if the settings rows are missing; matches what was hardcoded before. */
export const DEFAULT_TAX_RATE = 0.05;
export const DEFAULT_MIN_PERCENT = 5;
export const DEFAULT_MAX_PERCENT = 40;

/** Settings key holding a category's default rate. */
export const categoryKey = (vendorType) => `commission.${vendorType}`;

/*
 * Settings are read on every settleable transaction, so they are memoised for
 * a few seconds rather than fetched per ledger write. The TTL is short and
 * `clearCommissionCache()` runs on every admin write, so an operator never
 * waits to see a rate change take effect.
 */
const CACHE_TTL_MS = 10_000;
let cache = { at: 0, rates: null };

export function clearCommissionCache() {
  cache = { at: 0, rates: null };
}

/**
 * A rate that is safe to multiply money by, or null if the stored value is
 * unusable. Rejecting rather than coercing matters here: a settings row that
 * somehow holds "20" (a percentage) must not be read as 2000% commission.
 */
export function sanitizeRate(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  if (n < 0 || n > 1) return null;
  return n;
}

/** Percentage from a UI field (0–100) to a stored fraction, without float drift. */
export function rateFromPercent(percent) {
  const n = typeof percent === 'number' ? percent : Number(percent);
  if (!Number.isFinite(n)) throw ApiError.badRequest('Commission must be a number');
  if (n < 0 || n > 100) throw ApiError.badRequest('Commission must be between 0 and 100 percent');
  // Two decimal places of a percent (12.34%) is the finest the UI offers.
  // Going through integers avoids 0.1 + 0.2 style drift on the stored value.
  return Math.round(n * 100) / 10000;
}

/** The inverse, for sending a stored rate back to a screen. */
export function percentFromRate(rate) {
  const safe = sanitizeRate(rate);
  return safe === null ? null : Math.round(safe * 10000) / 100;
}

/**
 * A percentage bound (0–100) from settings, or the built-in default.
 *
 * Separate from `sanitizeRate` because these are percentages, not fractions:
 * a minimum of 5 means 5%, and running it through the fraction validator
 * would reject it.
 */
function sanitizePercent(value, fallback) {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 100) return fallback;
  return n;
}

/** Global + per-category defaults, payout tax and bounds, memoised together. */
async function loadRates() {
  if (cache.rates && Date.now() - cache.at < CACHE_TTL_MS) return cache.rates;
  const rows = await PlatformSetting.find({
    $or: [{ group: 'commission' }, { key: TAX_KEY }],
  }).lean();
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  const rates = {
    global: sanitizeRate(byKey.get(GLOBAL_KEY)),
    categories: Object.fromEntries(
      VENDOR_TYPES.map((t) => [t, sanitizeRate(byKey.get(categoryKey(t)))])
    ),
    // Falls back rather than throwing: a payout must still be computable if an
    // operator deletes the row, and 5% is what the code hardcoded before.
    tax: sanitizeRate(byKey.get(TAX_KEY)) ?? DEFAULT_TAX_RATE,
    minPercent: sanitizePercent(byKey.get(MIN_KEY), DEFAULT_MIN_PERCENT),
    maxPercent: sanitizePercent(byKey.get(MAX_KEY), DEFAULT_MAX_PERCENT),
  };
  cache = { at: Date.now(), rates };
  return rates;
}

/**
 * Resolve a rate from already-loaded settings.
 *
 * Split out from the async lookup so the decision itself is a pure function —
 * it is the part worth testing, and the part a report must reuse rather than
 * reimplement.
 */
export function resolveRate({ override, vendorType, rates }) {
  const vendorRate = sanitizeRate(override);
  if (vendorRate !== null) return { rate: vendorRate, source: 'vendor' };

  const categoryRate = sanitizeRate(rates?.categories?.[vendorType]);
  if (categoryRate !== null) return { rate: categoryRate, source: 'category' };

  const globalRate = sanitizeRate(rates?.global);
  if (globalRate !== null) return { rate: globalRate, source: 'global' };

  return { rate: HARD_FLOOR, source: 'floor' };
}

/**
 * The rate to bill this vendor's business line right now, with the reason.
 *
 * `profile` may be passed in by a caller that already loaded it, to avoid a
 * second query on the settlement path.
 */
export async function commissionRateFor(userId, vendorType, { profile } = {}) {
  const [rates, resolvedProfile] = await Promise.all([
    loadRates(),
    profile !== undefined ? Promise.resolve(profile) : findProfile(userId, vendorType),
  ]);
  return resolveRate({ override: resolvedProfile?.commissionRate, vendorType, rates });
}

/**
 * The profile whose rate applies.
 *
 * Mirrors `profileFor` in vendor.service.js but lives here to keep this module
 * importable from it without a cycle: an exact business-line match wins, and a
 * vendor with exactly one profile falls back to it so pre-migration rows and
 * renamed lines keep settling.
 */
async function findProfile(userId, vendorType) {
  if (!userId) return null;
  const exact = await VendorProfile.findOne({ userId, vendorType }).select('commissionRate').lean();
  if (exact) return exact;
  const all = await VendorProfile.find({ userId }).select('commissionRate').limit(2).lean();
  return all.length === 1 ? all[0] : null;
}

/**
 * Split a gross amount into the platform's cut and the vendor's share.
 *
 * The only place this arithmetic is written. `net` is subtracted rather than
 * computed from the rate, so `commission + net === gross` holds exactly at
 * every rate — computing both by multiplication lets rounding lose or invent
 * a paisa on roughly half of all transactions.
 */
export function splitAmount(gross, rate) {
  const safeGross = Math.round(Number(gross) || 0);
  const safeRate = sanitizeRate(rate) ?? HARD_FLOOR;
  const commission = Math.round(safeGross * safeRate);
  return { gross: safeGross, commission, net: safeGross - commission, rate: safeRate };
}

/**
 * Everything the admin Commission screen needs, in one round trip: the global
 * default, every category's effective rate, and which vendors override theirs.
 */
export async function commissionMatrix() {
  clearCommissionCache();
  const rates = await loadRates();
  const profiles = await VendorProfile.find({})
    .select('userId vendorType businessName commissionRate approvalStatus')
    .lean();

  const overrideCounts = Object.fromEntries(VENDOR_TYPES.map((t) => [t, 0]));
  const vendors = profiles.map((p) => {
    const resolved = resolveRate({ override: p.commissionRate, vendorType: p.vendorType, rates });
    if (resolved.source === 'vendor') overrideCounts[p.vendorType] = (overrideCounts[p.vendorType] || 0) + 1;
    return {
      id: String(p._id),
      userId: String(p.userId),
      businessName: p.businessName || 'Unnamed vendor',
      vendorType: p.vendorType,
      vendorTypeLabel: VENDOR_TYPE_LABEL[p.vendorType] || 'Partner',
      approvalStatus: p.approvalStatus,
      // null means "inherits"; the screen shows the inherited number greyed out.
      overridePercent: percentFromRate(p.commissionRate),
      effectivePercent: percentFromRate(resolved.rate),
      source: resolved.source,
    };
  });

  const categories = VENDOR_TYPES.map((t) => {
    const resolved = resolveRate({ override: null, vendorType: t, rates });
    return {
      vendorType: t,
      label: VENDOR_TYPE_LABEL[t],
      // null when the category has no row of its own and falls through.
      categoryPercent: percentFromRate(rates.categories[t]),
      effectivePercent: percentFromRate(resolved.rate),
      source: resolved.source,
      vendorCount: profiles.filter((p) => p.vendorType === t).length,
      overrideCount: overrideCounts[t] || 0,
    };
  });

  return {
    globalPercent: percentFromRate(rates.global ?? HARD_FLOOR),
    globalIsDefault: rates.global === null,
    categories,
    vendors: vendors.sort(
      (a, b) => a.vendorTypeLabel.localeCompare(b.vendorTypeLabel) || a.businessName.localeCompare(b.businessName)
    ),
  };
}

/* ── Payout tax ───────────────────────────────────────────────────── */

/**
 * The tax fraction applied to a vendor's net earnings at settlement.
 *
 * Read from the `tax.gst` setting, which the payout and tax-report code used
 * to ignore in favour of a hardcoded 0.05 in two separate files. Changing the
 * setting moved neither of them, so the number on the Settings screen was
 * decorative.
 */
export async function taxRate() {
  const rates = await loadRates();
  return rates.tax;
}

/**
 * Split a vendor's net earnings into the tax withheld and what they are paid.
 *
 * Same invariant as `splitAmount`: `tax + payable === net` exactly, because
 * payable is subtracted rather than independently computed.
 */
export function splitPayout(net, rate) {
  const safeNet = Math.round(Number(net) || 0);
  const safeRate = sanitizeRate(rate) ?? DEFAULT_TAX_RATE;
  const tax = Math.round(safeNet * safeRate);
  return { net: safeNet, tax, payable: safeNet - tax, rate: safeRate };
}

/* ── Guardrails ───────────────────────────────────────────────────── */

/** The percentage range a commission rate may be set to. */
export async function commissionBounds() {
  const rates = await loadRates();
  const min = Math.min(rates.minPercent, rates.maxPercent);
  const max = Math.max(rates.minPercent, rates.maxPercent);
  return { minPercent: min, maxPercent: max };
}

/**
 * Reject a rate outside the configured range.
 *
 * The point is to make a costly slip impossible rather than merely
 * discouraged: a mistyped 2 instead of 20, or a 0 that hands a vendor the
 * platform's entire cut, is refused by the API and not just by the screen.
 * `allowZero` exists for the deliberate case of a genuinely free category,
 * which an operator has to opt into explicitly.
 */
export function assertWithinBounds(percent, bounds, { allowZero = false } = {}) {
  const n = Number(percent);
  if (!Number.isFinite(n)) throw ApiError.badRequest('Commission must be a number');
  if (n === 0 && allowZero) return n;
  if (n < bounds.minPercent || n > bounds.maxPercent) {
    throw ApiError.badRequest(
      `Commission must be between ${bounds.minPercent}% and ${bounds.maxPercent}%. ` +
        `Adjust the limits on the Commission screen to go outside that range.`
    );
  }
  return n;
}
