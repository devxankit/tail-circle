import bcrypt from 'bcryptjs';
import { ApiError } from '../../utils/ApiError.js';
import { normalizePhone } from '../../utils/phone.js';
import { encryptField } from '../../utils/fieldCrypto.js';
import { issueTokens, requestOtp, verifyOtp } from '../auth/auth.service.js';
import { User } from '../user/user.model.js';
import { Doctor } from '../provider/doctor.model.js';
import { VendorProfile } from './vendor.models.js';

/** Frontend role slug → User/VendorProfile vendorType. */
const TYPE_MAP = {
  shop: 'shop',
  doctor: 'clinic',
  meal: 'meal_subscription',
  event: 'events',
  memorial: 'memorial',
  grooming: 'grooming',
  daycare: 'daycare',
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
 * 5-step KYC registration → creates a pending vendor User + VendorProfile.
 * Login stays blocked until an admin approves (Phase 11 / approve script).
 */
export async function registerVendor(payload) {
  const vendorType = resolveVendorType(payload.role);
  const email = payload.email?.toLowerCase().trim();
  const phone = normalizePhone(payload.phone);

  if (await User.findOne({ email })) throw ApiError.conflict('An account with this email already exists');

  const user = await User.create({
    name: payload.businessName,
    email,
    phone,
    role: 'vendor',
    vendorType,
    isPhoneVerified: false,
    ...(payload.password ? { passwordHash: await bcrypt.hash(payload.password, 10) } : {}),
  });

  const documents = [];
  if (payload.licenseUrl) documents.push({ kind: 'license', url: payload.licenseUrl });
  if (payload.ownerIdUrl) documents.push({ kind: 'owner_id', url: payload.ownerIdUrl });
  if (payload.gstNumber) documents.push({ kind: 'gst', url: '' });

  const profile = await VendorProfile.create({
    userId: user._id,
    businessName: payload.businessName,
    vendorType,
    email,
    phone,
    city: payload.city || '',
    address: payload.address || '',
    documents,
    bank: {
      bankName: payload.bankName || '',
      accountHolder: payload.accountHolder || payload.businessName,
      accountNumberEnc: encryptField(payload.accountNumber),
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

  return { registrationNo: profile.registrationNo, approvalStatus: profile.approvalStatus };
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
  return Provider.create({
    vendorUserId: user._id,
    type: providerType,
    name: payload.businessName,
    about: payload.about || '',
    image: payload.logoUrl || '',
    startingPrice: Number(payload.startingPrice) || 0,
    supportedPets: payload.supportedPets || ['Dogs', 'Cats'],
    visitTypes: isDaycare ? [] : ['Salon Visit', 'Home Visit'],
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

/** Approval-gated: only approved vendors receive tokens. */
function assertApproved(profile) {
  if (!profile) throw ApiError.forbidden('No vendor profile found');
  if (profile.approvalStatus === 'approved') return;
  const messages = {
    pending: 'Your application is under review. We will email you within 24–48 hours.',
    rejected: 'Your vendor application was rejected.',
    suspended: 'Your vendor account is suspended. Contact support.',
  };
  throw new ApiError(403, messages[profile.approvalStatus] || 'Vendor not approved', {
    details: { approvalStatus: profile.approvalStatus },
  });
}

/** Email + password login (role vendor only). */
export async function vendorPasswordLogin(email, password) {
  const user = await User.findOne({ email: email.toLowerCase().trim(), role: 'vendor' }).select('+passwordHash');
  if (!user || !user.passwordHash) throw ApiError.unauthorized('Invalid email or password');
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  const profile = await VendorProfile.findOne({ userId: user._id }).select('+bank.accountNumberEnc');
  assertApproved(profile);

  user.lastLoginAt = new Date();
  await user.save();
  const tokens = await issueTokens(user);
  return { user, profile, tokens };
}

/** Registration-no OR registered Mobile Number → send OTP to the vendor's registered phone. */
export async function vendorRequestOtp(identifier) {
  const trimmed = identifier.trim();
  const rawDigits = trimmed.replace(/\D/g, '');
  
  let profile = await VendorProfile.findOne({ registrationNo: trimmed.toUpperCase() });
  
  if (!profile && rawDigits.length >= 7) {
    const normalized = normalizePhone(trimmed);
    const last10 = rawDigits.slice(-10);
    const phoneRegex = new RegExp(last10 + '$');
    
    profile = await VendorProfile.findOne({
      $or: [
        { phone: normalized },
        { phone: trimmed },
        { phone: phoneRegex }
      ]
    });
    
    if (!profile) {
      const user = await User.findOne({
        role: 'vendor',
        $or: [
          { phone: normalized },
          { phone: trimmed },
          { phone: phoneRegex }
        ]
      });
      if (user) {
        profile = await VendorProfile.findOne({ userId: user._id });
      }
    }
  }
  
  if (!profile) throw ApiError.notFound('No vendor found with that registration number or mobile number');
  
  const vendorUser = await User.findById(profile.userId);
  const phoneToUse = (rawDigits.length >= 7 ? normalizePhone(trimmed) : (profile.phone || vendorUser?.phone));
  await requestOtp(phoneToUse);
  return { expiresInMinutes: 5 };
}

/** Registration-no OR registered Mobile Number + OTP login. */
export async function vendorVerifyOtp(identifier, code) {
  const trimmed = identifier.trim();
  const rawDigits = trimmed.replace(/\D/g, '');

  let profile = await VendorProfile.findOne({ registrationNo: trimmed.toUpperCase() }).select('+bank.accountNumberEnc');

  if (!profile && rawDigits.length >= 7) {
    const normalized = normalizePhone(trimmed);
    const last10 = rawDigits.slice(-10);
    const phoneRegex = new RegExp(last10 + '$');

    profile = await VendorProfile.findOne({
      $or: [
        { phone: normalized },
        { phone: trimmed },
        { phone: phoneRegex }
      ]
    }).select('+bank.accountNumberEnc');

    if (!profile) {
      const user = await User.findOne({
        role: 'vendor',
        $or: [
          { phone: normalized },
          { phone: trimmed },
          { phone: phoneRegex }
        ]
      });
      if (user) {
        profile = await VendorProfile.findOne({ userId: user._id }).select('+bank.accountNumberEnc');
      }
    }
  }

  if (!profile) throw ApiError.notFound('No vendor found with that registration number or mobile number');
  assertApproved(profile);

  // Find the exact User owning this vendor profile
  let vendorUser = await User.findById(profile.userId);
  const phoneToUse = (rawDigits.length >= 7 ? normalizePhone(trimmed) : (profile.phone || vendorUser?.phone));

  const { user, tokens } = await verifyOtp(phoneToUse, code);

  // If user account wasn't set to vendor, set it now
  if (user.role !== 'vendor') {
    user.role = 'vendor';
    if (profile.vendorType) user.vendorType = profile.vendorType;
    await user.save();
  }

  return { user, profile, tokens };
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
