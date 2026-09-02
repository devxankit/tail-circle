import bcrypt from 'bcryptjs';
import { User } from '../../src/modules/user/user.model.js';
import { VendorProfile } from '../../src/modules/vendor/vendor.models.js';
import { Product } from '../../src/modules/shop/product.model.js';
import { MealPlan, Meal } from '../../src/modules/meal/meal.models.js';
import { Event } from '../../src/modules/provider/event.model.js';
import { EventPackage, EventAddon, CustomerRequest } from '../../src/modules/vendor/event.models.js';
import { MemorialService, MemorialAddon, TeamMember, MemorialRequest } from '../../src/modules/vendor/memorial.models.js';
import { Provider } from '../../src/modules/provider/provider.model.js';
import { encryptField } from '../../src/utils/fieldCrypto.js';

/**
 * One approved vendor of each of the eight partner types, so every portal runs
 * against a real account.
 * All share the demo password `vendor123`; each has a stable phone for the
 * registration-no + OTP login path. The shop vendor owns a slice of the
 * Phase 3 catalog so its dashboard/products views show real numbers.
 */
const VENDORS = [
  { key: 'shop', vendorType: 'shop', businessName: 'Paws & Claws Pet Store', email: 'hello@pawsandclaws.com', phone: '+919000001001', regNo: 'TCV-SHOP01', city: 'Indore', logo: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=200&auto=format&fit=crop&q=60' },
  { key: 'grooming', vendorType: 'grooming', businessName: 'ClipPaw Pet Grooming & Spa', email: 'partner@clippaw.com', phone: '+919000001006', regNo: 'TCV-GROOM01', city: 'Indore', logo: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=200&auto=format&fit=crop&q=60' },
  { key: 'meal', vendorType: 'meal_subscription', businessName: 'Wholesome Bowl Kitchen', email: 'partner@wholesomebowl.com', phone: '+919000001002', regNo: 'TCV-MEAL01', city: 'Indore' },
  { key: 'events', vendorType: 'events', businessName: 'Pawfect Events Co.', email: 'partner@pawfectevents.com', phone: '+919000001003', regNo: 'TCV-EVNT01', city: 'Indore' },
  { key: 'memorial', vendorType: 'memorial', businessName: 'Rainbow Bridge Memorials', email: 'partner@rainbowbridge.com', phone: '+919000001004', regNo: 'TCV-MEMO01', city: 'Indore' },
  { key: 'clinic', vendorType: 'clinic', businessName: 'Happy Paws Veterinary Clinic', email: 'partner@happypaws.com', phone: '+919000001005', regNo: 'TCV-CLIN01', city: 'Indore' },
  { key: 'daycare', vendorType: 'daycare', businessName: 'Happy Tails Daycare', email: 'partner@happytails.com', phone: '+919000001007', regNo: 'TCV-DAYC01', city: 'Indore', logo: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=200&auto=format&fit=crop&q=60' },
  { key: 'adoption', vendorType: 'adoption', businessName: 'Second Chance Pet Rescue', email: 'partner@secondchance.com', phone: '+919000001008', regNo: 'TCV-ADOP01', city: 'Indore', logo: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=200&auto=format&fit=crop&q=60' },
];

/**
 * Grooming and daycare vendors own a `Provider` (the salon/centre customers
 * browse), matched by name. Ownership is exclusive: any other provider of that
 * type wrongly pointing at this vendor is released first.
 *
 * This also repairs damage from the old unguarded grooming router, which let
 * whoever called first adopt a salon that wasn't theirs.
 */
const PROVIDER_OWNERS = [
  { email: 'partner@clippaw.com', type: 'grooming', providerName: 'ClipPaw Grooming Studio' },
  { email: 'partner@happytails.com', type: 'daycare', providerName: 'Happy Tails Daycare' },
];

export async function seedVendors() {
  const passwordHash = await bcrypt.hash('vendor123', 10);
  let shopVendorId = null;
  let mealVendorId = null;
  let eventsVendorId = null;
  let memorialVendorId = null;

  for (const v of VENDORS) {
    const user = await User.findOneAndUpdate(
      { email: v.email },
      {
        $set: {
          name: v.businessName,
          phone: v.phone,
          role: 'vendor',
          vendorType: v.vendorType,
          passwordHash,
          isPhoneVerified: true,
        },
      },
      { upsert: true, returnDocument: 'after' }
    );

    await VendorProfile.updateOne(
      { userId: user._id },
      {
        $set: {
          businessName: v.businessName,
          vendorType: v.vendorType,
          email: v.email,
          phone: v.phone,
          city: v.city,
          logo: v.logo || '',
          approvalStatus: 'approved',
          commissionRate: 0.15,
          rating: 4.7,
          'bank.bankName': 'HDFC Bank',
          'bank.accountHolder': v.businessName,
          'bank.accountNumberEnc': encryptField('50100' + v.phone.slice(-7)),
          'bank.ifsc': 'HDFC0001234',
          'bank.accountType': 'Current',
          documents: [
            { kind: 'license', url: 'https://res.cloudinary.com/demo/image/upload/license.pdf', status: 'Verified', verifiedBy: 'Admin', verifiedAt: new Date() },
            { kind: 'owner_id', url: 'https://res.cloudinary.com/demo/image/upload/id.jpg', status: 'Pending', verifiedBy: '', verifiedAt: null },
            { kind: 'gst', url: 'https://res.cloudinary.com/demo/image/upload/gst.pdf', status: 'Pending', verifiedBy: '', verifiedAt: null },
          ],
        },
        $setOnInsert: { registrationNo: v.regNo },
      },
      { upsert: true }
    );

    if (v.key === 'shop') shopVendorId = user._id;
    if (v.key === 'meal') mealVendorId = user._id;
    if (v.key === 'events') eventsVendorId = user._id;
    if (v.key === 'memorial') memorialVendorId = user._id;
  }

  // Memorial vendor: seed services, add-ons, team, and a request pipeline.
  let memorialSeeded = 0;
  if (memorialVendorId) {
    const services = [
      { name: 'Dignified Pet Burial', category: 'Burial', description: 'Respectful burial with grave preparation and basic marker.', price: 4500, duration: '2 Hours', distance: '15 km limit', staff: 2, status: 'Active' },
      { name: 'Eco-friendly Cremation Support', category: 'Cremation', description: 'End-to-end cremation support incl. transport and ash collection.', price: 3000, duration: '3 Hours', distance: '20 km limit', staff: 1, status: 'Active' },
      { name: 'Tree Plantation Memorial', category: 'Tree Plantation', description: 'Memorial tree over the burial site with a commemorative plaque.', price: 1500, duration: '1 Hour', distance: 'N/A', staff: 1, status: 'Inactive' },
    ];
    for (const s of services) await MemorialService.updateOne({ vendorId: memorialVendorId, name: s.name }, { $set: { vendorId: memorialVendorId, ...s } }, { upsert: true });

    const addons = [
      { name: 'Custom Engraved Memory Stone', description: 'Granite stone engraved with the pet’s name and dates.', price: 1200, status: 'Active' },
      { name: 'Pet Paw Print Clay Kit', description: 'Capture their paw print in a premium clay mold kit.', price: 800, status: 'Active' },
      { name: 'Memorial Flower Arrangement', description: 'A wreath of fresh white lilies and roses.', price: 600, status: 'Inactive' },
    ];
    for (const a of addons) await MemorialAddon.updateOne({ vendorId: memorialVendorId, name: a.name }, { $set: { vendorId: memorialVendorId, ...a } }, { upsert: true });

    const team = [
      { name: 'Ravi Kumar', role: 'Driver & Field Staff', phone: '9888800001', status: 'Available' },
      { name: 'Sunita Mishra', role: 'Coordinator', phone: '9888800002', status: 'Assigned' },
      { name: 'Amit Sharma', role: 'Burial Support', phone: '9888800003', status: 'On Route' },
    ];
    for (const t of team) await TeamMember.updateOne({ vendorId: memorialVendorId, name: t.name }, { $set: { vendorId: memorialVendorId, active: true, ...t } }, { upsert: true });

    const requests = [
      { customerName: 'Aarti Sharma', petName: 'Max (Golden Retriever)', serviceType: 'Burial Service', location: 'Whitefield Pet Cemetery', preferredDate: '2026-08-20', preferredTime: '14:00', urgency: 'Priority', paymentStatus: 'Paid', status: 'Pending', notes: 'Handle with care; Max loved his red blanket.', addons: ['Memory Stone', 'Flower Arrangement'], amount: 450000 },
      { customerName: 'Rahul Desai', petName: 'Bella (Persian Cat)', serviceType: 'Cremation Support', location: 'HSR Layout Crematorium', preferredDate: '2026-08-20', preferredTime: '16:30', urgency: 'Normal', paymentStatus: 'Pending', status: 'Accepted', assignedTeam: 'Sunita Mishra', addons: ['Pet Paw Print Kit'], amount: 300000 },
    ];
    for (const r of requests) await MemorialRequest.updateOne({ vendorId: memorialVendorId, customerName: r.customerName, serviceType: r.serviceType }, { $set: { vendorId: memorialVendorId, ...r } }, { upsert: true });

    memorialSeeded = services.length + addons.length + team.length + requests.length;
  }

  // The events vendor owns all seeded events + a starter package/addon/request set.
  let eventsOwned = 0;
  if (eventsVendorId) {
    const ev = await Event.updateMany({}, { $set: { vendorId: eventsVendorId } });
    eventsOwned = ev.modifiedCount || 0;
    const pkgs = [
      { name: 'Basic Birthday Package', price: 8000, duration: '2 Hours', maxPets: 5, status: 'Active' },
      { name: 'Premium Pool Party', price: 25000, duration: '4 Hours', maxPets: 15, status: 'Active' },
    ];
    for (const p of pkgs) {
      await EventPackage.updateOne({ vendorId: eventsVendorId, name: p.name }, { $set: { vendorId: eventsVendorId, ...p } }, { upsert: true });
    }
    const addons = [
      { name: 'Pet-Friendly Cake', price: 1500, status: 'Active' },
      { name: 'Professional Photographer', price: 4000, status: 'Active' },
    ];
    for (const a of addons) {
      await EventAddon.updateOne({ vendorId: eventsVendorId, name: a.name }, { $set: { vendorId: eventsVendorId, ...a } }, { upsert: true });
    }
    await CustomerRequest.updateOne(
      { vendorId: eventsVendorId, customer: 'Amit Patel', type: 'Birthday' },
      { $set: { vendorId: eventsVendorId, customer: 'Amit Patel', pet: 'Simba (Lab)', type: 'Birthday', date: '2026-07-10', budget: '₹15,000', message: 'Private birthday setup with cake and decor.', status: 'New' } },
      { upsert: true }
    );
  }

  // The meal vendor owns the entire seeded meal catalog (plans + recipes).
  let mealOwned = 0;
  if (mealVendorId) {
    const [plans, meals] = await Promise.all([
      MealPlan.updateMany({}, { $set: { providerId: mealVendorId } }),
      Meal.updateMany({}, { $set: { providerId: mealVendorId } }),
    ]);
    mealOwned = (plans.modifiedCount || 0) + (meals.modifiedCount || 0);
  }

  // Give the shop vendor a slice of the catalog (first 8 products by legacyId).
  let ownedCount = 0;
  if (shopVendorId) {
    const docs = await Product.find({ deletedAt: null }).sort({ legacyId: 1 }).limit(8).select('_id');
    const productIds = docs.map((d) => d._id);
    // Idempotent: release any previously over-assigned products, then claim the 8.
    await Product.updateMany({ vendorId: shopVendorId, _id: { $nin: productIds } }, { $set: { vendorId: null } });
    await Product.updateMany({ _id: { $in: productIds } }, { $set: { vendorId: shopVendorId } });
    ownedCount = productIds.length;
  }

  // Grooming / daycare: bind each vendor to exactly one Provider, and strip any
  // stray ownership (see PROVIDER_OWNERS).
  let providersBound = 0;
  let providersReleased = 0;
  for (const po of PROVIDER_OWNERS) {
    const owner = await User.findOne({ email: po.email });
    if (!owner) continue;

    const provider = await Provider.findOne({ type: po.type, name: po.providerName });
    if (!provider) continue;

    // Release anything else of this type wrongly attributed to this vendor,
    // and release this provider from any other owner.
    const released = await Provider.updateMany(
      { type: po.type, vendorUserId: owner._id, _id: { $ne: provider._id } },
      { $set: { vendorUserId: null } }
    );
    providersReleased += released.modifiedCount || 0;

    provider.vendorUserId = owner._id;
    provider.approvalStatus = 'approved';
    provider.active = true;
    await provider.save();
    providersBound += 1;
  }

  // A vendor account must never own a Provider of a type it is not.
  const strays = await Provider.find({ vendorUserId: { $ne: null } }).select('type vendorUserId');
  for (const p of strays) {
    const u = await User.findById(p.vendorUserId).select('vendorType');
    if (u && u.vendorType !== p.type) {
      await Provider.updateOne({ _id: p._id }, { $set: { vendorUserId: null } });
      providersReleased += 1;
    }
  }

  return `${VENDORS.length} approved vendors ready; shop ${ownedCount} products, meal ${mealOwned} plans+recipes, events ${eventsOwned} events, memorial ${memorialSeeded} records, ${providersBound} providers bound (${providersReleased} stray links released)`;
}
