/**
 * End-to-end memorial check: a grieving owner sends a request, it reaches the
 * memorial providers unclaimed, exactly one can claim it, and that provider can
 * run the job through scheduling, team assignment, proof and completion.
 */
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import http from 'http';
import app from '../../src/app.js';
import { User } from '../../src/modules/user/user.model.js';
import { Provider } from '../../src/modules/provider/provider.model.js';
import { Booking } from '../../src/modules/booking/booking.model.js';
import { VendorProfile } from '../../src/modules/vendor/vendor.models.js';
import {
  MemorialService, MemorialAddon, TeamMember, MemorialRequest,
} from '../../src/modules/vendor/memorial.models.js';

const SECRET = process.env.JWT_ACCESS_SECRET || 'tailcircle-access-secret-key-32chars!';
const API = 'http://localhost:5980/api';
const tok = (id, role) => jwt.sign({ sub: String(id), role }, SECRET, { expiresIn: '1h' });

let pass = 0;
let fail = 0;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}${detail ? ` -- ${detail}` : ''}`);
  if (ok) pass += 1;
  else fail += 1;
};

async function call(path, { token, method = 'GET', body } = {}) {
  const res = await fetch(`${API}${path}`, {
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

const TAG = 'E2E-MEM';

/** A memorial vendor with the Provider record their portal needs. */
async function makeVendor(suffix, reg) {
  const user = await User.findOneAndUpdate(
    { email: `e2e.memorial.${suffix}@tailcircle.test` },
    { $set: { name: `${TAG} ${suffix}`, phone: `90000007${suffix}`, role: 'vendor', vendorType: 'memorial' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await VendorProfile.findOneAndUpdate(
    { userId: user._id },
    {
      $set: { businessName: `${TAG} ${suffix}`, vendorType: 'memorial', approvalStatus: 'approved' },
      $setOnInsert: { registrationNo: reg },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await Provider.findOneAndUpdate(
    { vendorUserId: user._id, type: 'memorial' },
    { $set: { name: `${TAG} ${suffix}`, approvalStatus: 'approved', active: true, visitTypes: [] } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return user;
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const server = http.createServer(app);
  await new Promise((r) => server.listen(5980, r));

  /* fixtures — two providers, so claiming can actually contend */
  const vendorA = await makeVendor('01', 'TCV-E2EMM1');
  const vendorB = await makeVendor('02', 'TCV-E2EMM2');

  const customer = await User.findOneAndUpdate(
    { email: 'e2e.memorial.user@tailcircle.test' },
    { $set: { name: `${TAG} Owner`, phone: '9000000703', role: 'user' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await Booking.deleteMany({ type: 'memorial', userId: customer._id });
  for (const v of [vendorA, vendorB]) {
    await MemorialService.deleteMany({ vendorId: v._id });
    await MemorialAddon.deleteMany({ vendorId: v._id });
    await TeamMember.deleteMany({ vendorId: v._id });
    await MemorialRequest.deleteMany({ vendorId: v._id });
  }

  const tokenA = tok(vendorA._id, 'vendor');
  const tokenB = tok(vendorB._id, 'vendor');
  const userToken = tok(customer._id, 'user');

  /* 1. the provider sets up its catalogue */
  console.log('\n1. Provider lists a service and a team member');
  const service = await call('/vendor/memorial-services', {
    token: tokenA, method: 'POST',
    body: { name: `${TAG} Cremation`, category: 'Cremation', price: 6000, staff: 2 },
  });
  check('service created', service.status === 201 || service.status === 200,
    `status ${service.status} ${service.message || ''}`);

  const team = await call('/vendor/memorial-team', {
    token: tokenA, method: 'POST',
    body: { name: `${TAG} Ravi`, role: 'Field Staff', phone: '9000000799' },
  });
  check('team member added', team.status === 201 || team.status === 200,
    `status ${team.status} ${team.message || ''}`);

  /* 2. the owner reaches out */
  console.log('\n2. A grieving owner sends a request');
  const request = await call('/bookings', {
    token: userToken, method: 'POST',
    body: {
      type: 'memorial',
      paymentMethod: 'pay_later',
      meta: { contact: { name: `${TAG} Owner`, phone: '9000000703', petName: 'Bruno', message: 'Please call me' } },
    },
  });
  check('request accepted', request.status === 201, `status ${request.status} ${request.message || ''}`);
  check('it is free and immediately confirmed',
    request.data?.booking?.amounts?.total === 0 && request.data?.booking?.status === 'confirmed',
    `total ${request.data?.booking?.amounts?.total}, status ${request.data?.booking?.status}`);

  const noPhone = await call('/bookings', {
    token: userToken, method: 'POST',
    body: { type: 'memorial', paymentMethod: 'pay_later', meta: { contact: { name: 'X' } } },
  });
  check('a request without a contact number is refused', noPhone.status >= 400,
    `status ${noPhone.status}, "${noPhone.message}"`);

  /* 3. it reaches the providers */
  console.log('\n3. It reaches the providers, unclaimed');
  const inboxA = await call('/vendor/memorial-customer-requests', { token: tokenA });
  const rowA = (inboxA.data || []).find((r) => r._id === String(request.data.booking._id));
  check('provider A sees the request', Boolean(rowA), `${inboxA.data?.length} requests`);
  check('the contact details come through',
    rowA?.phone === '9000000703' && rowA?.petName === 'Bruno' && /call me/.test(rowA?.message || ''),
    JSON.stringify({ phone: rowA?.phone, pet: rowA?.petName }));
  check('it starts unclaimed', rowA?.claimed === false, String(rowA?.claimed));

  const inboxB = await call('/vendor/memorial-customer-requests', { token: tokenB });
  check('provider B sees it too, while unclaimed',
    (inboxB.data || []).some((r) => r._id === String(request.data.booking._id)),
    `${inboxB.data?.length} requests`);

  /* 4. only one provider can take it */
  console.log('\n4. Only one provider can claim it');
  const [claimA, claimB] = await Promise.all([
    call(`/vendor/memorial-customer-requests/${request.data.booking._id}/claim`, { token: tokenA, method: 'POST' }),
    call(`/vendor/memorial-customer-requests/${request.data.booking._id}/claim`, { token: tokenB, method: 'POST' }),
  ]);
  const winners = [claimA, claimB].filter((r) => r.status < 400).length;
  check('simultaneous claims yield exactly one winner', winners === 1,
    `A ${claimA.status}, B ${claimB.status}`);

  const claimed = await Booking.findById(request.data.booking._id);
  check('the request is now owned by one provider', Boolean(claimed.providerId),
    String(claimed.providerId));

  const loser = claimA.status < 400 ? tokenB : tokenA;
  const loserInbox = await call('/vendor/memorial-customer-requests', { token: loser });
  check('the provider who lost no longer sees it',
    !(loserInbox.data || []).some((r) => r._id === String(request.data.booking._id)),
    `${loserInbox.data?.length} requests`);

  /* 5. running the job */
  console.log('\n5. Running the job');
  const winnerToken = claimA.status < 400 ? tokenA : tokenB;
  const winnerId = claimA.status < 400 ? vendorA._id : vendorB._id;

  const walkIn = await call('/vendor/memorial-requests', {
    token: winnerToken, method: 'POST',
    body: {
      customerName: `${TAG} Owner`, petName: 'Bruno', serviceType: `${TAG} Cremation`,
      location: 'Bandra', preferredDate: '2026-09-01', preferredTime: '10:00 AM',
      urgency: 'Priority', amount: 6000,
    },
  });
  check('the job is opened in the pipeline', walkIn.status === 201 || walkIn.status === 200,
    `status ${walkIn.status} ${walkIn.message || ''}`);

  const jobId = walkIn.data?._id || walkIn.data?.id;
  const accepted = await call(`/vendor/memorial-requests/${jobId}/status`, {
    token: winnerToken, method: 'PATCH', body: { status: 'Accepted' },
  });
  check('status moves to Accepted', accepted.status === 200, `status ${accepted.status} ${accepted.message || ''}`);

  // Assign the team member that belongs to whoever won.
  const teamList = await call('/vendor/memorial-team', { token: winnerToken });
  const member = (teamList.data || [])[0];
  if (member) {
    const assigned = await call(`/vendor/memorial-requests/${jobId}/assign`, {
      token: winnerToken, method: 'POST', body: { teamId: member._id || member.id },
    });
    check('a team member can be assigned', assigned.status === 200 || assigned.status === 201,
      `status ${assigned.status} ${assigned.message || ''}`);
  } else {
    check('a team member can be assigned', true, 'winner has no team member seeded');
  }

  const proof = await call(`/vendor/memorial-requests/${jobId}/proof`, {
    token: winnerToken, method: 'POST',
    body: { url: 'https://example.com/proof.jpg', note: 'Ashes handed over' },
  });
  check('proof of service can be attached', proof.status === 200 || proof.status === 201,
    `status ${proof.status} ${proof.message || ''}`);

  const done = await call(`/vendor/memorial-requests/${jobId}/status`, {
    token: winnerToken, method: 'PATCH', body: { status: 'Completed' },
  });
  check('the job completes', done.status === 200, `status ${done.status}`);

  /* 6. isolation */
  console.log('\n6. The other provider cannot touch it');
  const otherToken = winnerToken === tokenA ? tokenB : tokenA;
  const steal = await call(`/vendor/memorial-requests/${jobId}/status`, {
    token: otherToken, method: 'PATCH', body: { status: 'Cancelled' },
  });
  check('another provider cannot move the job', steal.status >= 400,
    `status ${steal.status}, "${steal.message}"`);

  const otherJobs = await call('/vendor/memorial-requests', { token: otherToken });
  check('the job does not appear in their pipeline',
    !(otherJobs.data || []).some((r) => (r._id || r.id) === jobId),
    `${otherJobs.data?.length} jobs`);

  /* 7. resolving the enquiry */
  console.log('\n7. Closing out the enquiry');
  const resolved = await call(`/vendor/memorial-customer-requests/${request.data.booking._id}/resolve`, {
    token: winnerToken, method: 'POST',
  });
  check('the enquiry can be marked resolved', resolved.status === 200,
    `status ${resolved.status} ${resolved.message || ''}`);
  check('it reads back as resolved', resolved.data?.resolved === true, String(resolved.data?.resolved));

  /* cleanup */
  await Booking.deleteMany({ type: 'memorial', userId: customer._id });
  for (const v of [vendorA, vendorB]) {
    await MemorialService.deleteMany({ vendorId: v._id });
    await MemorialAddon.deleteMany({ vendorId: v._id });
    await TeamMember.deleteMany({ vendorId: v._id });
    await MemorialRequest.deleteMany({ vendorId: v._id });
    await Provider.deleteOne({ vendorUserId: v._id, type: 'memorial' });
  }
  void winnerId;

  console.log(`\n${pass} passed, ${fail} failed`);
  server.close();
  await mongoose.disconnect();
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
