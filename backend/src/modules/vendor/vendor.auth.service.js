import bcrypt from 'bcryptjs';
import { ApiError } from '../../utils/ApiError.js';
import { normalizePhone } from '../../utils/phone.js';
import { encryptField } from '../../utils/fieldCrypto.js';
import { issueTokens, requestOtp, verifyOtp } from '../auth/auth.service.js';
import { User } from '../user/user.model.js';
import { Doctor } from '../provider/doctor.model.js';
import { VendorProfile } from './vendor.models.js';
import { vendorTypeLabel } from './vendorTypeLabels.js';

/** Frontend role slug → User/VendorProfile vendorType. */
const TYPE_MAP = {
  shop: 'shop',
  doctor: 'clinic',
  clinic: 'clinic',
  meal: 'meal_subscription',
  meal_subscription: 'meal_subscription',
  event: 'events',
  events: 'events',
  memorial: 'memorial',
  grooming: 'grooming',
  daycare: 'daycare',
  adopt: 'adoption',
  adoption: 'adoption',
};

/**
 * Vendor types whose catalog is a `Provider` record rather than a dedicated
 * model — the salon or daycare centre customers actually browse and book.
 * Created at registration so the vendor never has to "claim" an existing one.
 */
const PROVIDER_BACKED = {
  grooming: 'grooming',
  daycare: 'daycare',
  memorial: 'memorial',
};

export function resolveVendorType(slug) {
  const type = TYPE_MAP[slug] || slug;
  if (!Object.values(TYPE_MAP).includes(type)) throw ApiError.badRequest('Invalid vendor category');
  return type;
}

/**
 * The business lines a signup asked for, de-duplicated and validated.
 *
 * Accepts the modern `roles: []` and the original single `role`, so an older
 * client (or a saved cURL) keeps working unchanged.
 */
export function resolveVendorTypes(payload) {
  const raw = Array.isArray(payload.roles) && payload.roles.length
    ? payload.roles
    : [payload.role].filter(Boolean);
  if (!raw.length) throw ApiError.badRequest('Select at least one partner category');
  return [...new Set(raw.map(resolveVendorType))];
}

/**
 * KYC registration → a pending vendor User plus one VendorProfile per business
 * line the applicant selected.
 *
 * One account can serve several lines (a grooming salon that also runs
 * daycare). Each gets its own profile so it carries its own registration
 * number, KYC documents, commission rate and approval state — admin reviews
 * and approves them independently. Login stays blocked until at least one is
 * approved.
 */
export async function registerVendor(payload) {
  const vendorTypes = resolveVendorTypes(payload);
  const email = payload.email?.toLowerCase().trim();
  const phone = normalizePhone(payload.phone);

  if (await User.findOne({ email })) throw ApiError.conflict('An account with this email already exists');

  const user = await User.create({
    name: payload.businessName,
    email,
    phone,
    role: 'vendor',
    // The first selected line is the primary: the panel their login opens on.
    vendorType: vendorTypes[0],
    vendorTypes,
    isPhoneVerified: false,
    ...(payload.password ? { passwordHash: await bcrypt.hash(payload.password, 10) } : {}),
  });

  const created = [];
  for (const vendorType of vendorTypes) {
    created.push(await createVendorLine(user, vendorType, payload));
  }

  return {
    // Single-line signups keep the exact response they had — the success screen
    // and any saved integration still read `registrationNo`.
    registrationNo: created[0].registrationNo,
    registrationNos: created.map((p) => ({ vendorType: p.vendorType, registrationNo: p.registrationNo })),
    vendorTypes,
    approvalStatus: created[0].approvalStatus,
  };
}

/**
 * Add a business line to an account that already exists.
 *
 * Without this a groomer who later wants to offer daycare would have to
 * register a whole second account under a different email, splitting their
 * earnings, reviews and support history in two. The new line starts `pending`
 * and goes through the same admin review as a fresh signup — adding a line is
 * not a way around approval.
 */
export async function addVendorLine(userId, payload) {
  const vendorType = resolveVendorType(payload.role || payload.vendorType);

  const user = await User.findById(userId);
  if (!user || user.role !== 'vendor') throw ApiError.notFound('Vendor account not found');

  if (await VendorProfile.findOne({ userId: user._id, vendorType })) {
    throw ApiError.conflict(`You already run a ${vendorTypeLabel(vendorType)} business on this account`);
  }

  // Details default to the account's first line, so a vendor adding a second
  // business only has to fill in what actually differs.
  const primary = await VendorProfile.findOne({ userId: user._id }).sort({ createdAt: 1 }).select('+bank.accountNumberEnc');
  const merged = {
    city: primary?.city ?? '',
    address: primary?.address ?? '',
    bankName: primary?.bank?.bankName ?? '',
    accountHolder: primary?.bank?.accountHolder ?? '',
    ifscCode: primary?.bank?.ifsc ?? '',
    accountType: primary?.bank?.accountType ?? 'Saving',
    hasGst: primary?.gst?.hasGst ?? false,
    gstNumber: primary?.gst?.number ?? '',
    ...payload,
    businessName: payload.businessName || primary?.businessName || user.name,
  };
  // The bank account number is stored encrypted and never decrypted for
  // display, so it can only be carried over as ciphertext, not re-derived.
  const inheritedBankEnc = payload.accountNumber ? null : primary?.bank?.accountNumberEnc ?? null;

  const profile = await createVendorLine(user, vendorType, merged, { inheritedBankEnc });

  user.vendorTypes = [...new Set([...(user.vendorTypes || []), vendorType])];
  await user.save();

  return {
    registrationNo: profile.registrationNo,
    vendorType,
    approvalStatus: profile.approvalStatus,
  };
}

/**
 * Create one business line: its VendorProfile plus whatever customer-facing
 * record that vertical is backed by.
 *
 * Shared by signup and by adding a line later, so the two can never drift — a
 * daycare line added from the dashboard gets the same Provider a daycare
 * signup would have got.
 */
async function createVendorLine(user, vendorType, payload, { inheritedBankEnc = null } = {}) {
  const documents = [];
  if (payload.licenseUrl) documents.push({ kind: 'license', url: payload.licenseUrl });
  if (payload.ownerIdUrl) documents.push({ kind: 'owner_id', url: payload.ownerIdUrl });
  if (payload.gstNumber) documents.push({ kind: 'gst', url: '' });

  const profile = await VendorProfile.create({
    userId: user._id,
    businessName: payload.businessName,
    vendorType,
    email: user.email,
    phone: user.phone,
    city: payload.city || '',
    address: payload.address || '',
    documents,
    bank: {
      bankName: payload.bankName || '',
      accountHolder: payload.accountHolder || payload.businessName,
      accountNumberEnc: payload.accountNumber ? encryptField(payload.accountNumber) : inheritedBankEnc,
      ifsc: payload.ifscCode || '',
      accountType: payload.accountType || 'Saving',
    },
    gst: { hasGst: Boolean(payload.hasGst), number: payload.gstNumber || '' },
    approvalStatus: 'pending',
  });

  // A veterinary signup also creates the professional record the user app lists
  // from. It stays unverified (and therefore unlisted) until an admin reviews
  // the credentials — the rest of the profile is completed from the dashboard.
  if (vendorType === 'clinic') {
    await createVetProfile(user, payload);
  }

  // Grooming / daycare vendors get their own Provider (salon or centre) up
  // front, owned by this account. Creating it here — rather than lazily on
  // first dashboard visit — is what stops one vendor ever adopting another's.
  if (PROVIDER_BACKED[vendorType]) {
    await createProviderForVendor(user, PROVIDER_BACKED[vendorType], payload);
  }

  return profile;
}

/**
 * The customer-facing Provider behind a grooming salon or daycare centre.
 *
 * `approvalStatus: 'pending'` keeps it off the public listings until an admin
 * approves the vendor — `GET /providers` filters on it.
 */
async function createProviderForVendor(user, providerType, payload) {
  const { Provider } = await import('../provider/provider.model.js');

  const isDaycare = providerType === 'daycare';
  // Only grooming offers a salon/home choice. Daycare and memorial were both
  // handled by the same `isDaycare` ternary, so memorial providers were created
  // advertising "Salon Visit / Home Visit" — options that mean nothing for an
  // end-of-life service.
  const isGrooming = providerType === 'grooming';
  return Provider.create({
    vendorUserId: user._id,
    type: providerType,
    name: payload.businessName,
    about: payload.about || '',
    image: payload.logoUrl || '',
    startingPrice: Number(payload.startingPrice) || 0,
    supportedPets: payload.supportedPets || ['Dogs', 'Cats'],
    visitTypes: isGrooming ? ['Salon Visit', 'Home Visit'] : [],
    openTime: payload.openTime || '09:00',
    closeTime: payload.closeTime || '20:00',
    distanceText: payload.city || '',
    details: {
      // Booking screens read the slot template from here; a vendor edits it
      // from their dashboard once approved.
      slotTemplate: [],
      ...(isDaycare ? { pricePerDay: Number(payload.startingPrice) || 0 } : {}),
    },
    approvalStatus: 'pending',
    active: true,
  });
}

/**
 * The Doctor row behind a veterinary vendor signup.
 *
 * Only the fields a vet can sensibly give before logging in are captured here;
 * documents, availability, per-mode fees and the long-form bio are filled in
 * from the dashboard, where uploads are authenticated.
 *
 * `verification.status` starts `pending`, and `provider.routes.js` only lists
 * approved vets — so an unreviewed registration is never bookable.
 */
async function createVetProfile(user, payload) {
  const fullName = (payload.vetFullName || payload.businessName || '').trim();
  const title = payload.vetTitle || 'Dr.';
  const inClinicFee = Number(payload.consultFee) || 0;

  const documents = [];
  if (payload.licenseUrl) documents.push({ kind: 'license', url: payload.licenseUrl });
  if (payload.ownerIdUrl) documents.push({ kind: 'id_proof', url: payload.ownerIdUrl });
  if (payload.degreeUrl) documents.push({ kind: 'degree', url: payload.degreeUrl });
  if (payload.clinicAuthUrl) documents.push({ kind: 'clinic_auth', url: payload.clinicAuthUrl });

  await Doctor.create({
    // The vet's own login and their clinic tenant are the same account at
    // signup; extra vets are added later from the dashboard.
    userId: user._id,
    clinicVendorId: user._id,
    name: `${title} ${fullName}`.trim(),
    price: inClinicFee,
    identity: { title, fullName, profilePhoto: payload.photoUrl || '' },
    credentials: {
      registrationNumber: payload.registrationNumber || '',
      council: payload.council || '',
      registrationYear: payload.registrationYear || null,
      documents,
      verification: { status: 'pending' },
    },
    practice: {
      primarySpecialties: payload.primarySpecialties || [],
      speciesTreated: payload.speciesTreated || [],
      languages: payload.languages || [],
    },
    experience: { totalYears: Number(payload.totalYears) || 0 },
    clinicInfo: {
      clinicName: payload.clinicName || payload.businessName || '',
      address: {
        line1: payload.address || '',
        city: payload.city || '',
        pincode: payload.pincode || '',
      },
    },
    modes: {
      inClinic: { enabled: true, fee: inClinicFee, durationMinutes: 15 },
      // Video stays off until the vet turns it on and sets a fee — the whole
      // point of the mode gate is that it is an explicit opt-in.
      video: { enabled: false, fee: 0, durationMinutes: 15 },
    },
    active: true,
  });
}

/**
 * Approval gate for the account as a whole.
 *
 * A vendor gets in if *any* of their business lines is approved or pending —
 * one rejected line must not lock them out of a business they are already
 * trading through. Which lines they can actually open is then decided per line
 * by `requireType` in the vendor guard.
 */
function assertApproved(profiles) {
  const lines = Array.isArray(profiles) ? profiles : [profiles].filter(Boolean);
  if (!lines.length) throw ApiError.forbidden('No vendor profile found');
  if (lines.some((p) => p.approvalStatus === 'approved' || p.approvalStatus === 'pending')) return;

  const messages = {
    rejected: 'Your vendor application was rejected.',
    suspended: 'Your vendor account is suspended. Contact support.',
  };
  // Every line is blocked; report the first one's reason.
  const worst = lines[0].approvalStatus;
  throw new ApiError(403, messages[worst] || 'Vendor account inactive', {
    details: { approvalStatus: worst },
  });
}

/** All business lines on an account, oldest (primary) first. */
async function linesFor(userId) {
  return VendorProfile.find({ userId }).select('+bank.accountNumberEnc').sort({ createdAt: 1 });
}

/**
 * The session payload every login path returns.
 *
 * `profile` stays the primary line so existing screens that read a single
 * profile keep working; `profiles` is the full set the panel switcher and the
 * hub are built on.
 */
function sessionFor(user, profiles) {
  return {
    user,
    profile: profiles[0],
    profiles,
    vendorTypes: profiles.map((p) => p.vendorType),
  };
}

/**
 * Email + password login (role vendor only).
 *
 * The vendor's business lines are derived from their credentials — they are
 * never asked to pick a category at login. A vendor who runs both grooming and
 * daycare has one password, so making them choose a category up front could
 * only ever be a way to get it wrong.
 */
export async function vendorPasswordLogin(email, password) {
  const user = await User.findOne({ email: email.toLowerCase().trim(), role: 'vendor' }).select('+passwordHash');
  if (!user || !user.passwordHash) throw ApiError.unauthorized('Invalid email or password');
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  const profiles = await linesFor(user._id);
  assertApproved(profiles);

  user.lastLoginAt = new Date();
  await syncUserLines(user, profiles);
  const tokens = await issueTokens(user);
  return { ...sessionFor(user, profiles), tokens };
}

/**
 * Keep `User.vendorTypes` in step with the profiles that actually exist.
 *
 * Self-healing on login covers rows written before multi-line support and any
 * line added directly in the database — the panel switcher reads this list, so
 * a stale one would hide a business the vendor really does run.
 */
async function syncUserLines(user, profiles) {
  const types = profiles.map((p) => p.vendorType);
  const current = user.vendorTypes || [];
  const stale = types.length !== current.length || types.some((t) => !current.includes(t));
  if (stale) user.vendorTypes = types;
  if (types.length && !types.includes(user.vendorType)) user.vendorType = types[0];
  await user.save();
}

/**
 * Find the account behind a registration number or mobile number.
 *
 * Any one of a multi-line vendor's registration numbers identifies the same
 * account, so a groomer who also runs daycare can type either and still reach
 * their own login.
 */
async function findVendorByIdentifier(identifier) {
  const trimmed = identifier.trim();
  const rawDigits = trimmed.replace(/\D/g, '');

  let profile = await VendorProfile.findOne({ registrationNo: trimmed.toUpperCase() });

  if (!profile && rawDigits.length >= 7) {
    const normalized = normalizePhone(trimmed);
    const last10 = rawDigits.slice(-10);
    const phoneRegex = new RegExp(last10 + '$');
    const byPhone = { $or: [{ phone: normalized }, { phone: trimmed }, { phone: phoneRegex }] };

    profile = await VendorProfile.findOne(byPhone);
    if (!profile) {
      const user = await User.findOne({ role: 'vendor', ...byPhone });
      if (user) profile = await VendorProfile.findOne({ userId: user._id });
    }
  }

  if (!profile) throw ApiError.notFound('No vendor found with that registration number or mobile number');

  const user = await User.findById(profile.userId);
  const profiles = await linesFor(profile.userId);
  const phone = rawDigits.length >= 7 ? normalizePhone(trimmed) : profile.phone || user?.phone;
  return { user, profiles, phone };
}

/** Registration-no OR registered Mobile Number → send OTP to the vendor's registered phone. */
export async function vendorRequestOtp(identifier) {
  const { phone } = await findVendorByIdentifier(identifier);
  await requestOtp(phone);
  return { expiresInMinutes: 5 };
}

/** Registration-no OR registered Mobile Number + OTP login. */
export async function vendorVerifyOtp(identifier, code) {
  const { profiles, phone } = await findVendorByIdentifier(identifier);
  assertApproved(profiles);

  const { user, tokens } = await verifyOtp(phone, code);

  // If the account wasn't marked a vendor, mark it now, and either way make
  // sure its line list matches the profiles that exist.
  if (user.role !== 'vendor') user.role = 'vendor';
  await syncUserLines(user, profiles);

  return { ...sessionFor(user, profiles), tokens };
}

/** Change the vendor's own login password (requires the current one). */
export async function changeVendorPassword(userId, currentPassword, newPassword) {
  const user = await User.findOne({ _id: userId, role: 'vendor' }).select('+passwordHash');
  if (!user) throw ApiError.notFound('Vendor account not found');
  if (!user.passwordHash || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw ApiError.unauthorized('Current password is incorrect');
  }
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
  return { ok: true };
}
