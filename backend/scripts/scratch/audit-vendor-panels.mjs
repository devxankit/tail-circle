/**
 * Exercise every vendor panel against a real logged-in account.
 *
 * Reads the GET endpoints straight out of vendor.routes.js (grouped by the
 * `requireType` guard each one sits behind), logs in as the seeded partner for
 * that type, and calls every one. Anything that is not a 2xx is a panel screen
 * that would break for a real vendor.
 *
 * Read-only: no POST/PATCH/DELETE is issued.
 */
import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import http from 'http';
import app from '../../src/app.js';
import { User } from '../../src/modules/user/user.model.js';
import { VendorProfile, VendorLedgerEntry } from '../../src/modules/vendor/vendor.models.js';
import { Provider } from '../../src/modules/provider/provider.model.js';
import { VENDOR_TYPE_LABEL } from '../../src/modules/vendor/vendorTypeLabels.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROUTES_FILE = path.join(here, '..', '..', 'src', 'modules', 'vendor', 'vendor.routes.js');

/** Seeded demo logins, one per partner type. */
const ACCOUNTS = {
  shop: 'hello@pawsandclaws.com',
  grooming: 'partner@clippaw.com',
  daycare: 'partner@happytails.com',
  clinic: 'partner@happypaws.com',
  meal_subscription: 'partner@wholesomebowl.com',
  events: 'partner@pawfectevents.com',
  memorial: 'partner@rainbowbridge.com',
  adoption: 'partner@secondchance.com',
};
const PASSWORD = 'vendor123';

/** Endpoints whose 4xx is the correct answer without a specific record. */
const NEEDS_A_RECORD = /:id|:index|:date/;

/**
 * Pull `router.get('<path>', ...guardName` out of the routes file and bucket
 * each by the guard that precedes it, so we only call a panel's own endpoints.
 */
function readGetRoutes() {
  const src = fs.readFileSync(ROUTES_FILE, 'utf8');
  const guardOf = {};
  for (const m of src.matchAll(/const (\w+) = \[withVendor, requireType\('([\w_]+)'\)/g)) {
    guardOf[m[1]] = m[2];
  }
  const byType = {};
  for (const m of src.matchAll(/router\.get\(\s*'([^']+)'\s*,\s*\.\.\.(\w+)/g)) {
    const [, route, guard] = m;
    const type = guardOf[guard];
    if (!type) continue;
    (byType[type] ||= []).push(route);
  }
  return byType;
}

/** Endpoints on the shared provider router, which grooming and daycare use. */
const PROVIDER_ROUTES = ['/profile', '/services', '/slots', '/bookings', '/summary'];

const API = 'http://localhost:5971/api';
const findings = [];

async function call(p, token) {
  const res = await fetch(API + p, { headers: { Authorization: `Bearer ${token}` } });
  let body = null;
  try { body = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, body };
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const server = http.createServer(app);
  await new Promise((r) => server.listen(5971, r));

  const byType = readGetRoutes();
  const tokens = {};

  console.log('═══ 1. LOGIN ═══');
  for (const [type, email] of Object.entries(ACCOUNTS)) {
    const res = await fetch(`${API}/vendor/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: PASSWORD }),
    });
    const j = await res.json().catch(() => ({}));
    const token = j.data?.accessToken || j.data?.tokens?.accessToken;
    tokens[type] = token;
    const label = VENDOR_TYPE_LABEL[type].padEnd(22);
    if (!token) {
      console.log(`  FAIL  ${label} ${res.status} ${j.message || ''}`);
      findings.push({ sev: 'HIGH', area: VENDOR_TYPE_LABEL[type], what: `cannot log in (${res.status} ${j.message || ''})` });
    } else {
      console.log(`  ok    ${label} ${email}`);
    }
  }

  console.log('\n═══ 2. PANEL ENDPOINTS ═══');
  for (const [type, token] of Object.entries(tokens)) {
    if (!token) continue;
    const label = VENDOR_TYPE_LABEL[type];
    const routes = type === 'grooming' || type === 'daycare'
      ? PROVIDER_ROUTES.map((r) => `/vendor/${type === 'grooming' ? 'grooming' : 'daycare'}${r}`)
      : (byType[type] || []).map((r) => `/vendor${r}`);

    if (!routes.length) {
      findings.push({ sev: 'MED', area: label, what: 'no GET endpoints found for this panel' });
      continue;
    }

    /*
     * The clinic panel is per-vet: its screens always pass a `doctorId` picked
     * by `useVetSelection` (which defaults to the first vet). Calling these
     * without it 400s by design, so supply one — otherwise the audit reports a
     * break the UI never actually hits.
     */
    let suffix = '';
    if (type === 'clinic') {
      const vetsRes = await call('/vendor/vets', token);
      const list = vetsRes.body?.data?.vets || vetsRes.body?.data || [];
      const firstVet = list[0]?.id || list[0]?._id;
      if (firstVet) suffix = `?doctorId=${firstVet}&date=${new Date().toISOString().slice(0, 10)}`;
    }

    const broken = [];
    for (const route of routes) {
      if (NEEDS_A_RECORD.test(route)) continue;
      const url = route + (route.startsWith('/vendor/vet') ? suffix : '');
      const { status, body } = await call(url, token);
      if (status >= 400) broken.push(`${route} → ${status} ${body?.message || ''}`);
    }
    console.log(`  ${label.padEnd(22)} ${routes.length} routes, ${broken.length} failing`);
    for (const b of broken) {
      console.log(`      FAIL  ${b}`);
      findings.push({ sev: 'HIGH', area: label, what: b });
    }
  }

  console.log('\n═══ 3. CROSS-PANEL ISOLATION ═══');
  const probes = [
    ['shop', '/vendor/orders'],
    ['meal_subscription', '/vendor/kitchen-queue'],
    ['events', '/vendor/event-bookings'],
    ['adoption', '/vendor/adoption-applications'],
    ['memorial', '/vendor/memorial-requests'],
    ['clinic', '/vendor/appointments'],
  ];
  for (const [ownerType, route] of probes) {
    for (const [otherType, token] of Object.entries(tokens)) {
      if (otherType === ownerType || !token) continue;
      const { status } = await call(route, token);
      if (status < 400) {
        console.log(`  LEAK  ${VENDOR_TYPE_LABEL[otherType]} can read ${route}`);
        findings.push({ sev: 'HIGH', area: 'isolation', what: `${VENDOR_TYPE_LABEL[otherType]} can read ${route} (${status})` });
      }
    }
  }
  console.log('  checked', probes.length * (Object.keys(tokens).length - 1), 'cross-type combinations');

  console.log('\n═══ 4. STRUCTURAL ═══');
  // provider-backed types must own a Provider record
  for (const type of ['grooming', 'daycare', 'memorial']) {
    const profiles = await VendorProfile.find({ vendorType: type }).select('userId businessName');
    for (const p of profiles) {
      const prov = await Provider.findOne({ vendorUserId: p.userId, type });
      if (!prov) {
        console.log(`  MISSING  ${p.businessName} (${type}) has no Provider record`);
        findings.push({ sev: 'HIGH', area: VENDOR_TYPE_LABEL[type], what: `${p.businessName} has no Provider record — its portal cannot load` });
      }
    }
  }
  // approved vendors with no payout details cannot be settled
  const approved = await VendorProfile.find({ approvalStatus: 'approved' }).select('businessName vendorType bank');
  const noBank = approved.filter((p) => !p.bank?.ifsc);
  if (noBank.length) {
    console.log(`  ${noBank.length} approved vendor(s) with no bank details`);
    findings.push({ sev: 'LOW', area: 'payouts', what: `${noBank.length} approved vendors have no bank details, so payouts cannot be settled` });
  }
  // which types have ever been credited
  const credited = await VendorLedgerEntry.distinct('vendorId');
  const creditedTypes = new Set();
  for (const id of credited) {
    const p = await VendorProfile.findOne({ userId: id }).select('vendorType');
    if (p) creditedTypes.add(p.vendorType);
  }
  const never = Object.keys(VENDOR_TYPE_LABEL).filter((t) => !creditedTypes.has(t));
  console.log('  vendor types ever credited :', [...creditedTypes].map((t) => VENDOR_TYPE_LABEL[t]).join(', ') || 'none');
  console.log('  never credited             :', never.map((t) => VENDOR_TYPE_LABEL[t]).join(', ') || 'none');

  console.log('\n=== 5. APPROVAL GATING ===');
  {
    // A vendor awaiting review, or suspended, must not reach a panel.
    const pending = await VendorProfile.findOne({ approvalStatus: { $in: ['pending', 'rejected', 'suspended'] } })
      .select('userId businessName approvalStatus vendorType');
    if (!pending) {
      console.log('  no pending/suspended vendor in this database to test with');
    } else {
      const u = await User.findById(pending.userId).select('email');
      const res = await fetch(`${API}/vendor/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: u?.email, password: PASSWORD }),
      });
      const j = await res.json().catch(() => ({}));
      const gotIn = Boolean(j.data?.accessToken || j.data?.tokens?.accessToken);
      console.log(`  ${pending.businessName} (${pending.approvalStatus}) login -> ${res.status}${gotIn ? '  TOKEN ISSUED' : ''}`);
      if (gotIn) {
        findings.push({ sev: 'HIGH', area: 'approval gating', what: `${pending.approvalStatus} vendor "${pending.businessName}" can still log in` });
      }
    }
  }

  console.log('\n=== 6. LEDGER REACHABILITY ===');
  {
    const src = (rel) => {
      const abs = path.join(here, '..', '..', 'src', 'modules', rel);
      return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
    };
    const paths = {
      'Shop Partner': 'order/order.service.js',
      'Fresh Meals Partner': 'meal/meal.service.js',
      'Grooming / Day Care / Vet / Events': 'booking/booking.service.js',
      'Adoption Partner': 'adoption/adoption.routes.js',
      'Last Ride Partner': 'vendor/memorial.vendor.service.js',
    };
    for (const [label, rel] of Object.entries(paths)) {
      const has = src(rel).includes('postLedgerEntry');
      console.log(`  ${label.padEnd(36)} ${has ? 'has a credit path' : 'NO CREDIT PATH'}`);
      if (!has) findings.push({ sev: 'MED', area: label, what: `no postLedgerEntry in ${rel} — this vertical can never pay its vendor` });
    }
  }

  console.log('\n═══ FINDINGS ═══');
  if (!findings.length) console.log('  none');
  for (const f of findings) console.log(`  [${f.sev}] ${f.area}: ${f.what}`);
  console.log(`\n${findings.length} finding(s)`);

  server.close();
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
