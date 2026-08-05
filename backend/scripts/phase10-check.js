/**
 * Phase 10 verification — Clinic / Veterinary Doctor suite.
 * Seeds (idempotent) then drives the clinic service directly: appointments feed,
 * status/notes lifecycle (→ medical record), patients, records, prescriptions,
 * labs, follow-ups, vaccinations, emergencies (first-wins accept), video rooms,
 * and vendor scoping. Run: node scripts/phase10-check.js
 */
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { User } from '../src/modules/user/user.model.js';
import { Doctor } from '../src/modules/provider/doctor.model.js';
import { Booking } from '../src/modules/booking/booking.model.js';
import {
  MedicalRecord,
  Prescription,
  FollowUp,
  EmergencyRequest,

} from '../src/modules/vendor/clinic.models.js';
import { seedVendors } from './seeders/vendors.seed.js';
import { seedClinic } from './seeders/clinic.seed.js';
import * as clinic from '../src/modules/vendor/clinic.vendor.service.js';

let pass = 0;
let fail = 0;
const ok = (cond, label) => {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label}`); }
};

async function main() {
  await mongoose.connect(env.mongoUri);
  console.log(`Connected to ${mongoose.connection.name}\n`);

  console.log('— Seeding (idempotent) —');
  console.log('  ' + (await seedVendors()));
  console.log('  ' + (await seedClinic()) + '\n');

  const clinicVendor = await User.findOne({ email: 'partner@happypaws.com' });
  const shopVendor = await User.findOne({ email: 'hello@pawsandclaws.com' });
  const demo = await User.findOne({ phone: '+919000000001' });
  const cid = clinicVendor?._id;

  console.log('— Doctor link & appointments feed —');
  const doctor = await Doctor.findOne({ clinicVendorId: cid });
  ok(!!doctor, 'clinic vendor has a linked Doctor row');

  let appts = await clinic.listAppointments(cid);
  ok(appts.length === 4, `4 seeded appointments in queue (got ${appts.length})`);
  const fluffy = appts.find((a) => a.petName === 'Fluffy');
  const rocky = appts.find((a) => a.petName === 'Rocky');
  ok(fluffy?.type === 'Video Consultation' && fluffy?.status === 'Confirmed', 'Fluffy = confirmed video consult');
  ok(rocky?.type === 'Emergency' && rocky?.owner === 'Amit Patel', 'Rocky = emergency, owner denormalized');
  ok(appts.find((a) => a.petName === 'Max')?.fee === 500, 'fee converted paise→rupees (₹500)');

  console.log('\n— Real user booking surfaces in the queue —');
  await Booking.deleteOne({ bookingNo: 'TCGCLINTEST' });
  await Booking.create({
    bookingNo: 'TCGCLINTEST',
    type: 'doctor',
    doctorId: doctor._id,
    userId: demo._id,
    petSnapshot: { name: 'Bruno', species: 'Dog', breed: 'Beagle' },
    schedule: { startDate: '2026-05-26', time: '05:00 PM' },
    visitType: 'video',
    items: [{ kind: 'consultation', name: 'Video Consultation — Bruno', price: 400, qty: 1 }],
    amounts: { base: 40000, total: 40000 },
    paymentMethod: 'razorpay',
    status: 'confirmed',
    meta: { symptoms: 'Coughing at night' },
  });
  appts = await clinic.listAppointments(cid);
  const bruno = appts.find((a) => a.petName === 'Bruno');
  ok(bruno?.type === 'Video Consultation', 'real booking maps visitType→Video Consultation');
  ok(bruno?.status === 'Pending' && bruno?.owner === 'Demo Parent', 'real booking defaults to Pending, owner from user');
  ok(bruno?.issue === 'Coughing at night', 'issue falls back to meta.symptoms');

  console.log('\n— Appointment lifecycle —');
  const maxAppt = appts.find((a) => a.petName === 'Max');
  const confirmed = await clinic.updateAppointmentStatus(cid, maxAppt.id, 'Confirmed');
  ok(confirmed.status === 'Confirmed', 'confirm appointment → Confirmed');

  const recBefore = await MedicalRecord.countDocuments({ clinicVendorId: cid });
  const completed = await clinic.addConsultationNotes(cid, bruno.id, 'Dx: kennel cough. Rx cough syrup 5ml BID.');
  const recAfter = await MedicalRecord.countDocuments({ clinicVendorId: cid });
  ok(completed.status === 'Completed', 'add notes → appointment Completed');
  ok(recAfter === recBefore + 1, 'completing an appointment creates a medical record');

  console.log('\n— Patients —');
  const patients = await clinic.listPatients(cid);
  ok(patients.length === 3, `3 seeded patients (got ${patients.length})`);
  const maxPatient = patients.find((p) => p.name === 'Max');
  ok(maxPatient?.visits === 5 && maxPatient?.status.includes('Healthy'), 'Max patient record intact (5 visits)');

  console.log('\n— Medical records —');
  const records = await clinic.listMedicalRecords(cid);
  ok(records.length >= 4, `seeded medical records present (got ${records.length})`);
  ok(records.some((r) => r.id === 'REC-001' && r.diagnosis === 'Acute Gastroenteritis'), 'REC-001 diagnosis intact');
  const newRec = await clinic.createMedicalRecord(cid, { petName: 'ZZTest', diagnosis: 'Test dx', type: 'Clinical Visit' });
  ok(!!newRec.id && newRec.diagnosis === 'Test dx', 'createMedicalRecord returns a record');

  console.log('\n— Prescriptions —');
  const rx = await clinic.createPrescription(cid, {
    patientId: String(maxPatient.id),
    diagnosis: 'Gastroenteritis',
    medicines: [{ name: 'Metronidazole', dosage: '50mg', frequency: '1-0-1', duration: '5 Days' }, { name: '', dosage: '' }],
    notes: 'Bland diet',
    followUpDate: '2026-05-31',
  });
  ok(rx.petName === 'Max' && rx.items.length === 1, 'prescription resolves patient + drops blank medicine rows');
  const rxList = await clinic.listPrescriptions(cid);
  ok(rxList.some((r) => r.id === rx.id), 'new prescription appears in history');

  console.log('\n— Lab reports —');
  const labs = await clinic.listLabReports(cid);
  ok(labs.length >= 3, `seeded lab reports present (got ${labs.length})`);
  ok(labs.some((l) => l.id === 'LAB-901' && l.status === 'Ready'), 'LAB-901 ready');

  console.log('\n— Follow-ups —');
  const fus = await clinic.listFollowUps(cid);
  ok(fus.length >= 3, `seeded follow-ups present (got ${fus.length})`);
  const newFu = await clinic.createFollowUp(cid, { petName: 'ZZTest', reason: 'test', dueDate: 'Today', priority: 'High' });
  const doneFu = await clinic.updateFollowUp(cid, newFu._id, { status: 'Completed', notes: 'called' });
  ok(doneFu.status === 'Completed' && doneFu.notes === 'called', 'follow-up update (status + notes)');

  console.log('\n— Vaccinations —');
  const vax = await clinic.listVaccinations(cid);
  ok(vax.upcoming.length === 2, `2 upcoming vaccines (got ${vax.upcoming.length})`);
  ok(vax.missed.length === 1 && vax.completed.length === 1, '1 missed + 1 completed vaccine');

  console.log('\n— Emergencies (first-wins accept) —');
  let ems = await clinic.listEmergencies();
  ok(ems.length >= 2, `open emergencies broadcast (got ${ems.length})`);
  const em1 = ems.find((e) => e.id === 'EM-001');
  const accepted = await clinic.acceptEmergency(cid, em1._id);
  ok(accepted.status === 'accepted', 'accept emergency (first clinic wins)');
  let raced = false;
  try { await clinic.acceptEmergency(String(shopVendor._id), em1._id); } catch { raced = true; }
  ok(raced, 'second accept on same emergency is rejected (race guard)');
  const em2 = ems.find((e) => e.id === 'EM-002');
  await clinic.declineEmergency(cid, em2._id);
  ok((await clinic.listEmergencies()).every((e) => e.id !== 'EM-002'), 'declined emergency leaves the open list');

  console.log('\n— User raises an emergency —');
  const reported = await clinic.reportEmergency(demo._id, { petName: 'Bruno', species: 'Dog', issue: 'Hit by bike', severity: 'Critical' });
  ok(!!reported.id, 'user reportEmergency creates an open request');
  ok((await clinic.listEmergencies()).some((e) => e.id === reported.id), 'reported emergency reaches the clinic list');

  console.log('\n— Video consultations (LiveKit) —');
  // The old fake-token endpoint is retired; it now points callers at the real
  // flow rather than handing out a token no media server would accept.
  let deprecated = null;
  try {
    await clinic.createVideoRoom(cid, fluffy.id);
  } catch (err) {
    deprecated = err.message;
  }
  ok(/\/consults\/.+\/start/.test(deprecated || ''), 'legacy createVideoRoom redirects to the consult endpoint');

  // Authorization is the security boundary: a stranger must never get a token.
  const consult = await import('../src/modules/consult/consult.service.js');
  let denied = null;
  try {
    await consult.authorizeCall({ id: String(shopVendor._id) }, fluffy.id, { enforceWindow: false });
  } catch (err) {
    denied = err.message;
  }
  ok(/not a participant/i.test(denied || ''), 'a non-participant cannot authorize into a consultation');

  // Billable time is the overlap while BOTH parties are connected.
  const t = (m) => new Date(Date.parse('2026-01-01T10:00:00Z') + m * 60000);
  const overlap = consult.computeBilledSeconds({
    participants: [
      { role: 'vet', joinedAt: t(0), leftAt: t(30) },
      { role: 'patient', joinedAt: t(5), leftAt: t(30) },
    ],
  });
  ok(overlap === 25 * 60, `billable time is the both-connected overlap (got ${overlap / 60} min, want 25)`);

  console.log('\n— Vendor scoping —');
  const shopAppts = await clinic.listAppointments(shopVendor._id);
  ok(shopAppts.length === 0, 'a non-clinic vendor sees no clinic appointments');

  // Cleanup test-created rows so counts stay stable across re-runs.
  await Promise.all([
    Booking.deleteOne({ bookingNo: 'TCGCLINTEST' }),
    MedicalRecord.deleteMany({ petName: 'ZZTest' }),
    MedicalRecord.deleteMany({ appointmentId: null, treatment: /kennel cough/ }),
    Prescription.deleteMany({ _id: rx.id }),
    FollowUp.deleteMany({ petName: 'ZZTest' }),
    EmergencyRequest.deleteMany({ _id: reported._id }),

  ]);
  // Reset the emergency statuses we flipped and the Bruno-derived record.
  await EmergencyRequest.updateMany({ emNo: { $in: ['EM-001', 'EM-002'] } }, { $set: { status: 'open', clinicVendorId: null, acceptedAt: null } });
  await MedicalRecord.deleteMany({ diagnosis: /kennel cough/i });

  console.log(`\n${'='.repeat(48)}`);
  console.log(`Phase 10 checks: ${pass} passed, ${fail} failed`);
  console.log('='.repeat(48));

  await mongoose.disconnect();
  process.exit(fail ? 1 : 0);
}

main().catch((err) => {
  console.error('Check failed:', err);
  process.exit(1);
});
