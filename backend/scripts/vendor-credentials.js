/**
 * Print login credentials for every vendor account, and verify each one works.
 *
 *   node scripts/vendor-credentials.js           # seed + verify + print
 *   node scripts/vendor-credentials.js --no-seed # just print what exists
 *
 * Run the API first (`npm run dev`) so logins can be verified for real rather
 * than assumed — a printed credential that does not actually work is worse
 * than none.
 */
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { User } from '../src/modules/user/user.model.js';
import { VendorProfile } from '../src/modules/vendor/vendor.models.js';
import { Provider } from '../src/modules/provider/provider.model.js';
import { Doctor } from '../src/modules/provider/doctor.model.js';
import { VENDOR_TYPE_LABEL } from '../src/modules/vendor/vendorTypeLabels.js';

const NO_SEED = process.argv.includes('--no-seed');
const PASSWORD = 'vendor123';
const BASE = `http://localhost:${env.port}${env.apiPrefix}`;

/** Where each vendorType lands after login (mirrors ROLE_ROUTES in VendorAuth). */
const PORTAL = {
  shop: '/vendor/shop-provider',
  clinic: '/vendor/doctor/consultations',
  meal_subscription: '/vendor/meal-provider/dashboard',
  events: '/vendor/events-organizer',
  memorial: '/vendor/memorial-provider',
  grooming: '/vendor/grooming-provider',
  daycare: '/vendor/daycare-provider',
  adoption: '/vendor/adoption-partner',
};

// Shared labels — this map was another private copy, and it had no entry for
// adoption partners at all.
const LABEL = VENDOR_TYPE_LABEL;

/** The seeded demo accounts — one per vertical. */
const SEEDED = [
  'hello@pawsandclaws.com',
  'partner@happypaws.com',
  'partner@wholesomebowl.com',
  'partner@pawfectevents.com',
  'partner@rainbowbridge.com',
  'partner@clippaw.com',
  'partner@happytails.com',
];

async function tryLogin(email) {
  try {
    const res = await fetch(`${BASE}/vendor/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: PASSWORD }),
    });
    const body = await res.json().catch(() => ({}));
    if (body.success) return { ok: true };
    return { ok: false, reason: body.message || `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, reason: `API unreachable (${err.message})` };
  }
}

async function main() {
  await mongoose.connect(env.mongoUri);

  if (!NO_SEED) {
    const { seedVendors } = await import('./seeders/vendors.seed.js');
    console.log(`\n  seed: ${await seedVendors()}`);
  }

  // Clear the auth rate limiter so a batch of verification logins isn't
  // throttled into false failures.
  try {
    const { connectRedis } = await import('../src/config/redis.js');
    const { invalidate } = await import('../src/services/cache.service.js');
    await connectRedis();
    await new Promise((r) => setTimeout(r, 400));
    await invalidate('rl:auth:*');
  } catch {
    /* Redis optional */
  }

  const users = await User.find({ role: 'vendor' }).sort({ vendorType: 1 });
  const rows = [];

  for (const u of users) {
    const profile = await VendorProfile.findOne({ userId: u._id });
    const type = u.vendorType;
    let owns = '';
    if (type === 'grooming' || type === 'daycare') {
      const p = await Provider.findOne({ vendorUserId: u._id });
      owns = p ? `${p.name} (${p.approvalStatus})` : '⚠ no provider';
    } else if (type === 'clinic') {
      const d = await Doctor.countDocuments({ clinicVendorId: u._id });
      owns = `${d} vet${d === 1 ? '' : 's'}`;
    }

    // Rate limiter is per-IP; space the checks out a little.
    // eslint-disable-next-line no-await-in-loop
    const login = await tryLogin(u.email);
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 250));

    rows.push({
      seeded: SEEDED.includes(u.email),
      type,
      label: LABEL[type] || type || '(none)',
      email: u.email,
      regNo: profile?.registrationNo || '—',
      approval: profile?.approvalStatus || '—',
      portal: PORTAL[type] || '/vendor/dashboard',
      owns,
      login,
    });
  }

  const pad = (s, n) => String(s ?? '').padEnd(n);
  const line = (ch = '─') => console.log(ch.repeat(112));

  const render = (title, list) => {
    if (!list.length) return;
    console.log(`\n${title}`);
    line();
    console.log(
      `  ${pad('VERTICAL', 20)}${pad('EMAIL', 34)}${pad('REG NO', 13)}${pad('PORTAL', 32)}LOGIN`
    );
    line();
    for (const r of list) {
      console.log(
        `  ${pad(r.label, 20)}${pad(r.email, 34)}${pad(r.regNo, 13)}${pad(r.portal, 32)}` +
          (r.login.ok ? '✅' : `❌ ${r.login.reason}`)
      );
      if (r.owns) console.log(`  ${pad('', 20)}└─ ${r.owns}`);
    }
    line();
  };

  console.log(`\n  Password for every account below: ${PASSWORD}`);
  console.log(`  Login page: /vendor/login   ·   API: ${BASE}/vendor/login`);

  render('SEEDED DEMO VENDORS — one per vertical', rows.filter((r) => r.seeded));
  render('OTHER VENDOR ACCOUNTS (not seeded — password may differ)', rows.filter((r) => !r.seeded));

  const broken = rows.filter((r) => r.seeded && !r.login.ok);
  console.log(
    broken.length
      ? `\n  ⚠ ${broken.length} seeded account(s) could not log in — see above.\n`
      : `\n  ✅ all ${rows.filter((r) => r.seeded).length} seeded vendors verified logging in.\n`
  );

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
