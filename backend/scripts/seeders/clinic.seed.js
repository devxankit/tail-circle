import { User } from '../../src/modules/user/user.model.js';
import { Doctor } from '../../src/modules/provider/doctor.model.js';
import { Booking } from '../../src/modules/booking/booking.model.js';
import {
  PatientRecord,
  MedicalRecord,
  LabReport,
  FollowUp,
  VaccineReminder,
  EmergencyRequest,
} from '../../src/modules/vendor/clinic.models.js';

/**
 * Clinic suite seed — mirrors the DoctorManagement mock 1:1 so the veterinary
 * portal shows the same appointments, patients, records, labs, follow-ups,
 * vaccinations and emergencies it always did. The clinic vendor
 * (partner@happypaws.com, seeded by `vendors`) gets a dedicated Doctor row;
 * appointments ride on the shared Booking model (type `doctor`).
 */

const APPTS = [
  { key: 'A1', petName: 'Max', species: 'Dog', breed: 'Golden Retriever', owner: 'Rahul Kumar', phone: '+91-98765-43210', consultType: 'clinic', visitType: 'clinic', issue: 'Vaccination Due', clinicStatus: 'Pending', fee: 500, time: '10:00 AM' },
  { key: 'A2', petName: 'Fluffy', species: 'Cat', breed: 'Persian', owner: 'Aisha Khan', phone: '+91-98765-12345', consultType: 'video', visitType: 'video', issue: 'Skin condition follow-up', clinicStatus: 'Confirmed', fee: 400, time: '12:00 PM' },
  { key: 'A3', petName: 'Luna', species: 'Dog', breed: 'Labrador', owner: 'Priya Sharma', phone: '+91-98765-67890', consultType: 'home', visitType: 'home', issue: 'Post-surgery checkup', clinicStatus: 'Completed', fee: 800, time: '02:30 PM' },
  { key: 'A4', petName: 'Rocky', species: 'Dog', breed: 'German Shepherd', owner: 'Amit Patel', phone: '+91-98765-43211', consultType: 'emergency', visitType: 'clinic', issue: 'Sudden lethargy & vomiting', clinicStatus: 'Pending', fee: 1000, time: '04:00 PM' },
];

const PATIENTS = [
  { name: 'Max', species: 'Dog', breed: 'Golden Retriever', owner: 'Rahul Kumar', phone: '+91-98765-43210', age: '3 years', gender: 'Male', weight: '28 kg', lastVisit: 'May 25, 2026', status: 'Healthy ✓', vaccinations: 'Up to date', visits: 5 },
  { name: 'Fluffy', species: 'Cat', breed: 'Persian', owner: 'Aisha Khan', phone: '+91-98765-12345', age: '2 years', gender: 'Female', weight: '4.5 kg', lastVisit: 'May 22, 2026', status: 'Under treatment ⚠️', vaccinations: 'Due next month', visits: 3 },
  { name: 'Luna', species: 'Dog', breed: 'Labrador', owner: 'Priya Sharma', phone: '+91-98765-67890', age: '5 years', gender: 'Female', weight: '30 kg', lastVisit: 'May 20, 2026', status: 'Recovery ongoing 🏥', vaccinations: 'Up to date', visits: 8 },
];

const RECORDS = [
  { recordNo: 'REC-001', date: 'May 25, 2026', petName: 'Max', owner: 'Rahul Kumar', phone: '+91-98765-43210', type: 'Clinical Visit', diagnosis: 'Acute Gastroenteritis', treatment: 'IV fluids, antiemetics, fasting for 24 hrs. Follow-up in 5 days.', fileAvailable: true, weight: '28 kg', temp: '102.4°F' },
  { recordNo: 'REC-002', date: 'May 20, 2026', petName: 'Luna', owner: 'Priya Sharma', phone: '+91-98765-67890', type: 'Surgery', diagnosis: 'Spay Procedure', treatment: 'Successful ovariohysterectomy. Post-op care: collar, restricted movement for 10 days.', fileAvailable: true, weight: '4.2 kg', temp: '101.1°F' },
  { recordNo: 'REC-003', date: 'May 18, 2026', petName: 'Fluffy', owner: 'Aisha Khan', phone: '+91-98765-12345', type: 'Video Consult', diagnosis: 'Flea Allergy Dermatitis', treatment: 'Prescribed topical flea treatment and antihistamine. Monthly Bravecto recommended.', fileAvailable: false, weight: '3.1 kg', temp: '101.8°F' },
  { recordNo: 'REC-004', date: 'May 10, 2026', petName: 'Rocky', owner: 'Amit Patel', phone: '+91-98765-43210', type: 'Emergency', diagnosis: 'Tick Fever', treatment: 'Doxycycline 10mg/kg BID for 21 days. CBC repeat after 2 weeks.', fileAvailable: true, weight: '34 kg', temp: '104.2°F' },
];

const LABS = [
  { reportNo: 'LAB-901', date: 'May 26, 2026', patient: 'Max', owner: 'Rahul Kumar', testType: 'Complete Blood Count (CBC)', status: 'Ready' },
  { reportNo: 'LAB-902', date: 'May 25, 2026', patient: 'Luna', owner: 'Priya Sharma', testType: 'Biochemistry Panel', status: 'Ready' },
  { reportNo: 'LAB-903', date: 'May 27, 2026', patient: 'Rocky', owner: 'Amit Patel', testType: 'Urinalysis', status: 'Processing' },
];

const FOLLOWUPS = [
  { fuNo: 'FU-001', petName: 'Fluffy', owner: 'Aisha Khan', phone: '+91-98765-12345', reason: 'Post-Surgery Check (Spay)', dueDate: 'Today', status: 'Pending Call', priority: 'High' },
  { fuNo: 'FU-002', petName: 'Luna', owner: 'Priya Sharma', phone: '+91-98765-67890', reason: 'Tick Fever Medication Progress', dueDate: 'Tomorrow', status: 'Scheduled', priority: 'Medium' },
  { fuNo: 'FU-003', petName: 'Max', owner: 'Rahul Kumar', phone: '+91-98765-43210', reason: 'Diet Change Review', dueDate: 'May 30, 2026', status: 'Scheduled', priority: 'Low' },
];

const VACCINES = [
  { petName: 'Max', owner: 'Rahul Kumar', vaccine: 'Rabies Booster', date: 'May 30, 2026', status: 'Due Soon' },
  { petName: 'Luna', owner: 'Priya Sharma', vaccine: 'DHPPi', date: 'June 05, 2026', status: 'Scheduled' },
  { petName: 'Fluffy', owner: 'Aisha Khan', vaccine: 'FVRCP', date: 'May 15, 2026', status: 'Overdue' },
  { petName: 'Rocky', owner: 'Amit Patel', vaccine: 'Anti-Rabies', date: 'May 20, 2026', status: 'Completed' },
];

const EMERGENCIES = [
  { emNo: 'EM-001', petName: 'Rocky', species: 'Dog', breed: 'German Shepherd', ownerName: 'Amit Patel', phone: '+91-98765-43210', location: '12 Kms away (Vijay Nagar)', severity: 'Critical', issue: 'Sudden lethargy & severe vomiting, unable to stand.' },
  { emNo: 'EM-002', petName: 'Luna', species: 'Cat', breed: 'Persian', ownerName: 'Neha Sharma', phone: '+91-98765-11111', location: '3 Kms away (Palasia)', severity: 'High', issue: 'Bleeding from paw after accident.' },
];

export async function seedClinic() {
  const vendorUser = await User.findOne({ email: 'partner@happypaws.com' });
  if (!vendorUser) return 'clinic vendor missing — run the `vendors` seeder first';
  const clinicVendorId = vendorUser._id;

  // Dedicated doctor row that represents this clinic.
  const doctor = await Doctor.findOneAndUpdate(
    { clinicVendorId },
    {
      $set: {
        clinicVendorId,
        name: 'Dr. Aakash Gogale',
        spec: 'General Veterinary Surgeon',
        clinic: 'Happy Paws Veterinary Clinic',
        expText: '10+ yrs experience',
        location: 'Indore',
        price: 500,
        videoPrice: 400,
        availability: 'Available',
        active: true,
      },
    },
    { upsert: true, returnDocument: 'after' }
  );

  const demo = await User.findOne({ phone: '+919000000001' });

  // Appointments (bookings). Owner display comes from meta.ownerName; userId is
  // the demo parent so the notify/video flow has a real target.
  for (const a of APPTS) {
    await Booking.updateOne(
      { bookingNo: `TCGCLIN${a.key}` },
      {
        $set: {
          type: 'doctor',
          doctorId: doctor._id,
          userId: demo?._id || clinicVendorId,
          petSnapshot: { name: a.petName, species: a.species, breed: a.breed },
          schedule: { startDate: '2026-05-26', time: a.time },
          visitType: a.visitType,
          items: [{ kind: 'consultation', refId: String(doctor._id), name: `Consultation — ${a.petName}`, price: a.fee, qty: 1 }],
          amounts: { base: a.fee * 100, addons: 0, discount: 0, tax: 0, total: a.fee * 100 },
          paymentMethod: 'razorpay',
          status: a.clinicStatus === 'Completed' ? 'completed' : 'confirmed',
          meta: { consultType: a.consultType, clinicStatus: a.clinicStatus, issue: a.issue, ownerName: a.owner, ownerPhone: a.phone },
        },
        $setOnInsert: { bookingNo: `TCGCLIN${a.key}` },
      },
      { upsert: true }
    );
  }

  for (const p of PATIENTS) {
    await PatientRecord.updateOne(
      { seedKey: `clinic:patient:${p.name}:${p.owner}` },
      { $set: { clinicVendorId, ...p, seedKey: `clinic:patient:${p.name}:${p.owner}` } },
      { upsert: true }
    );
  }

  for (const r of RECORDS) {
    await MedicalRecord.updateOne(
      { seedKey: `clinic:record:${r.recordNo}` },
      { $set: { clinicVendorId, doctorId: doctor._id, doctorName: doctor.name, ...r, seedKey: `clinic:record:${r.recordNo}` } },
      { upsert: true }
    );
  }

  for (const l of LABS) {
    await LabReport.updateOne(
      { seedKey: `clinic:lab:${l.reportNo}` },
      { $set: { clinicVendorId, doctorId: doctor._id, doctorName: doctor.name, ...l, seedKey: `clinic:lab:${l.reportNo}` } },
      { upsert: true }
    );
  }

  for (const f of FOLLOWUPS) {
    await FollowUp.updateOne(
      { seedKey: `clinic:fu:${f.fuNo}` },
      { $set: { clinicVendorId, ...f, notes: '', seedKey: `clinic:fu:${f.fuNo}` } },
      { upsert: true }
    );
  }

  for (const v of VACCINES) {
    await VaccineReminder.updateOne(
      { seedKey: `clinic:vax:${v.petName}:${v.vaccine}` },
      { $set: { clinicVendorId, ...v, seedKey: `clinic:vax:${v.petName}:${v.vaccine}` } },
      { upsert: true }
    );
  }

  for (const e of EMERGENCIES) {
    await EmergencyRequest.updateOne(
      { seedKey: `clinic:em:${e.emNo}` },
      { $set: { ...e, status: 'open', seedKey: `clinic:em:${e.emNo}` } },
      { upsert: true }
    );
  }

  return `clinic ready: 1 doctor, ${APPTS.length} appts, ${PATIENTS.length} patients, ${RECORDS.length} records, ${LABS.length} labs, ${FOLLOWUPS.length} follow-ups, ${VACCINES.length} vaccines, ${EMERGENCIES.length} emergencies`;
}
