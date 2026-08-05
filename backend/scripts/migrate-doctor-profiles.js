/**
 * Backfill the structured vet-profile fields on existing Doctor rows.
 *
 *   node scripts/migrate-doctor-profiles.js            # apply
 *   node scripts/migrate-doctor-profiles.js --dry-run  # report only
 *
 * Maps the old flat display fields onto the Phase-1 structured schema:
 *
 *   name         → identity.title + identity.fullName
 *   img          → identity.profilePhoto
 *   spec         → practice.primarySpecialties[]
 *   clinic       → clinicInfo.clinicName
 *   location     → clinicInfo.address.locality / .city
 *   expText      → experience.totalYears
 *   price        → modes.inClinic { enabled: true, fee }
 *   videoPrice   → modes.video    { enabled: videoPrice != null, fee }
 *
 * Idempotent: rows that already carry `identity.fullName` are skipped, so
 * re-running after a partial failure is safe. Legacy seed rows keep their
 * `legacyId` and their display fields untouched.
 */
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { Doctor } from '../src/modules/provider/doctor.model.js';

const DRY_RUN = process.argv.includes('--dry-run');

/** "Dr. Meera Iyer" → { title: 'Dr.', fullName: 'Meera Iyer' } */
function splitName(name = '') {
  const match = String(name).trim().match(/^(Dr\.?|Prof\.?|Mr\.?|Mrs\.?|Ms\.?)\s+(.*)$/i);
  if (match) return { title: match[1].replace(/\.?$/, '.'), fullName: match[2].trim() };
  return { title: 'Dr.', fullName: String(name).trim() };
}

/** "8+ yrs exp" / "12 years" → 8 / 12. Returns 0 when nothing numeric is present. */
function parseYears(expText = '') {
  const match = String(expText).match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

/** "Bandra, Mumbai" → { locality: 'Bandra', city: 'Mumbai' } */
function splitLocation(location = '') {
  const parts = String(location).split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { locality: '', city: '' };
  if (parts.length === 1) return { locality: '', city: parts[0] };
  return { locality: parts[0], city: parts[parts.length - 1] };
}

/** "Dermatology, Surgery" → ['Dermatology', 'Surgery'] */
const splitSpecs = (spec = '') =>
  String(spec).split(/[,/|]/).map((s) => s.trim()).filter(Boolean);

async function main() {
  await mongoose.connect(env.mongoUri);

  const doctors = await Doctor.find({});
  let migrated = 0;
  let skipped = 0;

  for (const doc of doctors) {
    if (doc.identity?.fullName) {
      skipped += 1;
      continue;
    }

    const { title, fullName } = splitName(doc.name);
    const { locality, city } = splitLocation(doc.location);

    doc.identity = {
      title,
      fullName,
      profilePhoto: doc.img || '',
    };
    doc.practice = {
      ...(doc.practice?.toObject?.() || {}),
      primarySpecialties: splitSpecs(doc.spec),
      // Sensible default — every legacy row is a small-animal practice.
      speciesTreated: doc.practice?.speciesTreated?.length
        ? doc.practice.speciesTreated
        : ['dogs', 'cats'],
    };
    doc.experience = {
      totalYears: parseYears(doc.expText),
      yearsInCurrentClinic: 0,
    };
    doc.clinicInfo = {
      ...(doc.clinicInfo?.toObject?.() || {}),
      clinicName: doc.clinic || '',
      address: { ...(doc.clinicInfo?.address?.toObject?.() || {}), locality, city },
    };
    doc.modes = {
      inClinic: {
        enabled: true,
        fee: doc.price || 0,
        followUpFee: null,
        durationMinutes: 15,
      },
      video: {
        // `videoPrice == null` was the old signal for "no video consults".
        enabled: doc.videoPrice != null,
        fee: doc.videoPrice ?? doc.price ?? 0,
        followUpFee: null,
        durationMinutes: 15,
      },
      homeVisit: { enabled: false, fee: 0, followUpFee: null, durationMinutes: 30 },
      emergency: { enabled: false, fee: 0, followUpFee: null, durationMinutes: 20 },
    };
    // Legacy rows predate the verification flow; they are already live, so mark
    // them approved rather than knocking them off the listing.
    doc.credentials = {
      ...(doc.credentials?.toObject?.() || {}),
      verification: { status: 'approved', reviewedAt: new Date() },
    };

    if (!DRY_RUN) await doc.save();
    migrated += 1;
  }

  const verb = DRY_RUN ? 'would migrate' : 'migrated';
  console.log(`\n${'='.repeat(52)}`);
  console.log(`${DRY_RUN ? '🔍 DRY RUN — no writes' : '✅ Doctor profile migration complete'}`);
  console.log('='.repeat(52));
  console.log(`  Total doctors : ${doctors.length}`);
  console.log(`  ${verb.padEnd(13)} : ${migrated}`);
  console.log(`  skipped       : ${skipped} (already migrated)`);
  console.log(`${'='.repeat(52)}\n`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
