/**
 * End-to-end adoption check with the new shelter vendor.
 *
 * A shelter lists a pet, two adopters apply, the shelter — not the applicant —
 * runs the vetting, one is approved and the other is closed out, and the pet
 * can only go home once.
 */
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import http from 'http';
import app from '../../src/app.js';
import { User } from '../../src/modules/user/user.model.js';
import { VendorProfile, VendorLedgerEntry } from '../../src/modules/vendor/vendor.models.js';
import { AdoptionListing, AdoptionApplication } from '../../src/modules/adoption/adoption.models.js';

const SECRET = process.env.JWT_ACCESS_SECRET || 'tailcircle-access-secret-key-32chars!';
const API = 'http://localhost:5979/api';
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

const TAG = 'E2E-ADOPT';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const server = http.createServer(app);
  await new Promise((r) => server.listen(5979, r));

  /* fixtures */
  const shelter = await User.findOneAndUpdate(
    { email: 'e2e.adopt.vendor@tailcircle.test' },
    { $set: { name: `${TAG} Shelter`, phone: '9000000801', role: 'vendor', vendorType: 'adoption' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await VendorProfile.findOneAndUpdate(
    { userId: shelter._id },
    {
      $set: {
        businessName: `${TAG} Happy Tails Rescue`, vendorType: 'adoption',
        approvalStatus: 'approved', commissionRate: 0.1,
      },
      $setOnInsert: { registrationNo: 'TCV-E2EADP' },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const adopterA = await User.findOneAndUpdate(
    { email: 'e2e.adopt.a@tailcircle.test' },
    { $set: { name: `${TAG} Asha`, phone: '9000000802', role: 'user' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const adopterB = await User.findOneAndUpdate(
    { email: 'e2e.adopt.b@tailcircle.test' },
    { $set: { name: `${TAG} Bilal`, phone: '9000000803', role: 'user' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const oldListings = await AdoptionListing.find({ name: { $regex: `^${TAG}` } }).distinct('_id');
  await AdoptionApplication.deleteMany({ listingId: { $in: oldListings } });
  await AdoptionListing.deleteMany({ name: { $regex: `^${TAG}` } });
  await VendorLedgerEntry.deleteMany({ vendorId: shelter._id });

  const shelterToken = tok(shelter._id, 'vendor');
  const tokenA = tok(adopterA._id, 'user');
  const tokenB = tok(adopterB._id, 'user');

  /* 1. the shelter lists a pet */
  console.log('\n1. Shelter lists a pet');
  const created = await call('/vendor/adoption-listings', {
    token: shelterToken, method: 'POST',
    body: {
      name: `${TAG} Rocky`, type: 'Dog', breed: 'Indie', age: '1 year',
      gender: 'Male', price: 1500, location: 'Indore',
      vaccinated: true, dewormed: true, about: 'Gentle rescue pup.',
    },
  });
  check('listing created', created.status === 201, `status ${created.status} ${created.message || ''}`);

  const listing = await AdoptionListing.findOne({ name: `${TAG} Rocky` });
  check('the listing belongs to the shelter', String(listing?.vendorId) === String(shelter._id),
    `vendorId ${listing?.vendorId}`);
  check('it is marked as a shelter listing, and verified',
    listing?.sourceType === 'vendor' && listing?.shelter?.verified === true,
    `sourceType ${listing?.sourceType}, verified ${listing?.shelter?.verified}`);

  /* 2. an individual's listing is not "verified" */
  console.log('\n2. A private rehoming is not badged as a verified shelter');
  const ownerListing = await call('/adoption/pets', {
    token: tokenA, method: 'POST',
    body: { name: `${TAG} Private Pup`, breed: 'Indie', price: 0 },
  });
  check('an owner can still rehome a pet', ownerListing.status === 201, `status ${ownerListing.status}`);
  check('but carries no verified badge', ownerListing.data?.shelter?.verified === false,
    `verified ${ownerListing.data?.shelter?.verified}`);

  /* 3. two adopters apply */
  console.log('\n3. Two adopters apply for the same pet');
  const appA = await call('/adoption/applications', {
    token: tokenA, method: 'POST',
    body: { listingId: String(listing._id), form: { home: 'Apartment', experience: 'First-time' } },
  });
  const appB = await call('/adoption/applications', {
    token: tokenB, method: 'POST',
    body: { listingId: String(listing._id), form: { home: 'House with garden' } },
  });
  check('both applications are accepted', appA.status === 201 && appB.status === 201,
    `A ${appA.status}, B ${appB.status}`);
  check('each application knows which shelter must review it',
    String(appA.data?.vendorId) === String(shelter._id),
    `vendorId ${appA.data?.vendorId}`);

  /* 4. the applicant can no longer approve themselves */
  console.log('\n4. An applicant cannot vet their own application');
  for (const step of ['home_check_scheduled', 'approved', 'meet_scheduled']) {
    const selfServe = await call(`/adoption/applications/${appA.data._id}/advance`, {
      token: tokenA, method: 'POST', body: { step },
    });
    check(`an adopter cannot self-serve "${step}"`, selfServe.status >= 400,
      `status ${selfServe.status}`);
  }

  /* 5. the shelter reviews */
  console.log('\n5. The shelter runs the vetting');
  const inbox = await call('/vendor/adoption-applications', { token: shelterToken });
  check('both applications reach the shelter inbox', (inbox.data || []).length === 2,
    `${inbox.data?.length} applications`);
  const inboxA = (inbox.data || []).find((a) => a._id === String(appA.data._id));
  check('the shelter sees the applicant and their answers',
    inboxA?.applicant === `${TAG} Asha` && Boolean(inboxA?.form?.home),
    JSON.stringify({ who: inboxA?.applicant, home: inboxA?.form?.home }));
  check('the portal is told which step is the shelter\'s next',
    inboxA?.nextStep === 'home_check_scheduled', String(inboxA?.nextStep));

  const homeCheck = await call(`/vendor/adoption-applications/${appA.data._id}/review`, {
    token: shelterToken, method: 'POST',
    body: { step: 'home_check_scheduled', scheduledAt: '2026-09-05', notes: 'Visiting Saturday' },
  });
  check('shelter schedules the home check', homeCheck.status === 200,
    `status ${homeCheck.status} ${homeCheck.message || ''}`);

  const skipAhead = await call(`/vendor/adoption-applications/${appA.data._id}/review`, {
    token: shelterToken, method: 'POST', body: { step: 'meet_scheduled' },
  });
  check('steps cannot be skipped', skipAhead.status >= 400,
    `status ${skipAhead.status}, "${skipAhead.message}"`);

  const approved = await call(`/vendor/adoption-applications/${appA.data._id}/review`, {
    token: shelterToken, method: 'POST', body: { step: 'approved', notes: 'Great fit' },
  });
  check('shelter approves', approved.status === 200, `status ${approved.status} ${approved.message || ''}`);

  const reserved = await AdoptionListing.findById(listing._id);
  check('approving reserves the pet', reserved.status === 'Pending', `status ${reserved.status}`);

  /* 6. the second applicant cannot also be approved */
  console.log('\n6. The pet can only be promised to one home');
  const approveB = await call(`/vendor/adoption-applications/${appB.data._id}/review`, {
    token: shelterToken, method: 'POST', body: { step: 'home_check_scheduled' },
  });
  check('the second applicant can still be progressed to a home check',
    approveB.status === 200, `status ${approveB.status}`);
  const doubleApprove = await call(`/vendor/adoption-applications/${appB.data._id}/review`, {
    token: shelterToken, method: 'POST', body: { step: 'approved' },
  });
  check('but cannot also be approved for the same pet', doubleApprove.status >= 400,
    `status ${doubleApprove.status}, "${doubleApprove.message}"`);

  /* 7. the adopter finishes their own part */
  console.log('\n7. The adopter signs and pays');
  const meet = await call(`/vendor/adoption-applications/${appA.data._id}/review`, {
    token: shelterToken, method: 'POST', body: { step: 'meet_scheduled', scheduledAt: '2026-09-10' },
  });
  check('shelter schedules the meet', meet.status === 200, `status ${meet.status}`);

  const shelterSigns = await call(`/vendor/adoption-applications/${appA.data._id}/review`, {
    token: shelterToken, method: 'POST', body: { step: 'agreement_signed' },
  });
  check('the shelter cannot sign the adopter\'s agreement', shelterSigns.status >= 400,
    `status ${shelterSigns.status}`);

  const signed = await call(`/adoption/applications/${appA.data._id}/advance`, {
    token: tokenA, method: 'POST', body: { step: 'agreement_signed' },
  });
  check('the adopter signs the agreement', signed.status === 200,
    `status ${signed.status} ${signed.message || ''}`);

  const wrongPayer = await call(`/adoption/applications/${appA.data._id}/pay-fee`, {
    token: tokenB, method: 'POST',
  });
  check('another user cannot pay someone else\'s fee', wrongPayer.status >= 400,
    `status ${wrongPayer.status}`);

  // Complete the paid adoption the way the payment dispatcher does.
  const finalApp = await AdoptionApplication.findById(appA.data._id);
  finalApp.status = 'agreement_signed';
  await finalApp.save();
  const { default: adoptionRoutes } = await import('../../src/modules/adoption/adoption.routes.js');
  void adoptionRoutes;
  await call(`/adoption/applications/${appA.data._id}/pay-fee`, { token: tokenA, method: 'POST' });

  /* 8. completion closes everyone else out */
  console.log('\n8. Completion closes the other applicant out');
  // The fee is non-zero, so drive completion directly (Razorpay is not live here).
  const { AdoptionApplication: AppModel } = await import('../../src/modules/adoption/adoption.models.js');
  const winner = await AppModel.findById(appA.data._id);
  if (winner.status !== 'completed') {
    winner.feePaise = 0; // free completion path
    await winner.save();
    await call(`/adoption/applications/${appA.data._id}/pay-fee`, { token: tokenA, method: 'POST' });
  }

  const done = await AppModel.findById(appA.data._id);
  check('the adoption completes', done.status === 'completed', `status ${done.status}`);

  const adoptedPet = await AdoptionListing.findById(listing._id);
  check('the pet is marked adopted', adoptedPet.status === 'Adopted', `status ${adoptedPet.status}`);

  const loser = await AppModel.findById(appB.data._id);
  check('the other applicant is closed out, not left hanging',
    loser.status === 'rejected', `status ${loser.status}`);
  check('and told why', /adopted/i.test(loser.decision?.reason || ''), loser.decision?.reason);

  /* 9. declining frees the pet again */
  console.log('\n9. Declining an application frees the pet');
  const second = await call('/vendor/adoption-listings', {
    token: shelterToken, method: 'POST',
    body: { name: `${TAG} Luna`, breed: 'Indie', price: 0, location: 'Indore' },
  });
  const lunaId = second.data?._id;
  const lunaApp = await call('/adoption/applications', {
    token: tokenB, method: 'POST', body: { listingId: lunaId, form: {} },
  });
  await call(`/vendor/adoption-applications/${lunaApp.data._id}/review`, {
    token: shelterToken, method: 'POST', body: { step: 'home_check_scheduled' },
  });
  await call(`/vendor/adoption-applications/${lunaApp.data._id}/review`, {
    token: shelterToken, method: 'POST', body: { step: 'approved' },
  });
  const declined = await call(`/vendor/adoption-applications/${lunaApp.data._id}/decline`, {
    token: shelterToken, method: 'POST', body: { reason: 'Home not suitable for a high-energy dog' },
  });
  check('the shelter can decline', declined.status === 200, `status ${declined.status} ${declined.message || ''}`);
  const luna = await AdoptionListing.findById(lunaId);
  check('the declined pet goes back on the market', luna.status === 'Available', `status ${luna.status}`);

  /* 10. listing guards */
  console.log('\n10. Listing guards');
  const withdrawBusy = await call(`/vendor/adoption-listings/${lunaId}`, {
    token: shelterToken, method: 'DELETE',
  });
  check('a pet with no open applications can be withdrawn', withdrawBusy.status === 200,
    `status ${withdrawBusy.status} ${withdrawBusy.message || ''}`);

  const relist = await call(`/vendor/adoption-listings/${listing._id}`, {
    token: shelterToken, method: 'PATCH', body: { status: 'Available' },
  });
  check('an adopted pet cannot be silently re-listed', relist.status >= 400,
    `status ${relist.status}, "${relist.message}"`);

  /* 11. isolation */
  console.log('\n11. Another shelter sees none of it');
  const { listVendorApplications } = await import('../../src/modules/vendor/adoption.vendor.service.js');
  const stranger = await listVendorApplications(new mongoose.Types.ObjectId());
  check('an unrelated shelter sees no applications', stranger.length === 0, `${stranger.length} visible`);

  /* 12. the dashboard */
  console.log('\n12. Shelter dashboard');
  const summary = await call('/vendor/adoption-summary', { token: shelterToken });
  check('the dashboard reports completed adoptions',
    summary.data?.completedAdoptions === 1, String(summary.data?.completedAdoptions));
  check('and how many applications await review',
    typeof summary.data?.awaitingYourReview === 'number', String(summary.data?.awaitingYourReview));

  /* cleanup */
  const mineIds = await AdoptionListing.find({ name: { $regex: `^${TAG}` } }).distinct('_id');
  await AdoptionApplication.deleteMany({ listingId: { $in: mineIds } });
  await AdoptionListing.deleteMany({ name: { $regex: `^${TAG}` } });
  await VendorLedgerEntry.deleteMany({ vendorId: shelter._id });

  console.log(`\n${pass} passed, ${fail} failed`);
  server.close();
  await mongoose.disconnect();
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
