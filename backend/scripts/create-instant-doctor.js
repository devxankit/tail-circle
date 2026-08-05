import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../src/config/env.js';
import { User } from '../src/modules/user/user.model.js';
import { VendorProfile } from '../src/modules/vendor/vendor.models.js';
import { Doctor } from '../src/modules/provider/doctor.model.js';
import { Availability } from '../src/modules/provider/availability.model.js';

const EMAIL = 'doctor.instant@tailcircle.com';
const PASSWORD = 'Doctor123!';
const LEGACY_ID = 999;

async function main() {
  await mongoose.connect(env.mongoUri);
  console.log('Connected to MongoDB');

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // 1. User Account
  let user = await User.findOne({ email: EMAIL });
  if (user) {
    user.passwordHash = passwordHash;
    user.role = 'vendor';
    user.vendorType = 'clinic';
    user.isPhoneVerified = true;
    user.isBlocked = false;
    await user.save();
  } else {
    user = await User.create({
      name: 'Dr. Sarah Jenkins',
      email: EMAIL,
      phone: '+919888877777',
      passwordHash,
      role: 'vendor',
      vendorType: 'clinic',
      isPhoneVerified: true,
    });
  }

  // 2. Vendor Profile
  await VendorProfile.findOneAndUpdate(
    { userId: user._id },
    {
      $set: {
        businessName: 'TailCircle Instant Tele-Vet Care',
        vendorType: 'clinic',
        email: EMAIL,
        phone: '+919888877777',
        city: 'Bengaluru',
        address: 'Indiranagar, Bengaluru',
        approvalStatus: 'approved',
      },
    },
    { upsert: true, new: true }
  );

  // 3. Doctor Record
  let doctor = await Doctor.findOne({ legacyId: LEGACY_ID });
  const doctorData = {
    legacyId: LEGACY_ID,
    userId: user._id,
    clinicVendorId: user._id,
    name: 'Dr. Sarah Jenkins',
    spec: 'Tele-Vet Specialist, Small Animals',
    clinic: 'TailCircle Instant Tele-Vet Care',
    expText: '10+ yrs exp',
    location: 'Indiranagar, Bengaluru',
    rating: 4.9,
    reviews: 128,
    price: 500,
    videoPrice: 499,
    img: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300',
    availability: 'Available Now',
    nextAvailable: 'Instant Call (Anytime)',
    identity: {
      title: 'Dr.',
      fullName: 'Sarah Jenkins',
      profilePhoto: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300',
    },
    practice: {
      primarySpecialties: ['Tele-Vet Specialist', 'Small Animals'],
      speciesTreated: ['dogs', 'cats', 'rabbits'],
      languages: ['English', 'Hindi'],
    },
    experience: {
      totalYears: 10,
      yearsInCurrentClinic: 5,
    },
    clinicInfo: {
      clinicName: 'TailCircle Instant Tele-Vet Care',
      address: {
        locality: 'Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560038',
      },
    },
    modes: {
      inClinic: { enabled: true, fee: 500, durationMinutes: 15 },
      video: { enabled: true, fee: 499, durationMinutes: 15 },
      instantVideo: { enabled: true, fee: 499, durationMinutes: 15 },
      homeVisit: { enabled: false, fee: 800 },
      emergency: { enabled: true, fee: 999 },
    },
    video: {
      digitalPrescription: true,
      overagePerMinute: 20,
      graceMinutes: 2,
      maxOverageMinutes: 30,
    },
    credentials: {
      registrationNumber: 'KVC-998822',
      council: 'Karnataka Veterinary Council',
      verification: { status: 'approved' },
    },
    active: true,
  };

  if (doctor) {
    Object.assign(doctor, doctorData);
    await doctor.save();
  } else {
    doctor = await Doctor.create(doctorData);
  }

  // 4. Availability 24/7
  await Availability.findOneAndUpdate(
    { doctorId: doctor._id },
    {
      $set: {
        weekly: Array.from({ length: 7 }, (_, day) => ({
          day,
          enabled: true,
          blocks: [{ start: '00:00', end: '23:59', modes: ['inClinic', 'video', 'instantVideo'], capacity: 10 }],
        })),
        slotMinutes: 15,
        bufferMinutes: 0,
        leadTimeMinutes: 0,
        horizonDays: 30,
        timezone: 'Asia/Kolkata',
        active: true,
      },
    },
    { upsert: true, new: true }
  );

  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ INSTANT CALL DOCTOR ACCOUNT READY');
  console.log('='.repeat(60));
  console.log(`  Doctor Name  : Dr. Sarah Jenkins`);
  console.log(`  Email        : ${EMAIL}`);
  console.log(`  Password     : ${PASSWORD}`);
  console.log(`  Login URL    : /admin/login (Vendor/Doctor Portal)`);
  console.log(`  Doctor ID    : ${doctor._id}`);
  console.log(`  Features     : ⚡ Instant Video Call / Call Anytime ON`);
  console.log(`${'='.repeat(60)}\n`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Failed to create instant doctor:', err);
  process.exit(1);
});
