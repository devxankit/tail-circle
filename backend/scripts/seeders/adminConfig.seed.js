import { AdminConfig } from '../../src/modules/admin/admin.models.js';

/**
 * Seeds the super-admin "services" config datasets VERBATIM from the admin
 * mock views (Product Categories, Doctor Services, Add-ons & Amenities,
 * Memorial Packages, Event Categories, Grooming & Day Care). React icon
 * elements become `iconName` strings; every other field is copied 1:1 so the
 * screens render pixel-identically once wired. Idempotent via `seedKey`.
 */

const GROUPS = {
  /* ── Product Categories ─────────────────────────────────── */
  product_category: [
    { name: 'Pet Food', products: 412, vendors: 48, subcategories: ['Dry Food', 'Wet Food', 'Treats', 'Supplements', 'Special Diet'], status: 'Active', iconName: 'Box', iconColor: 'text-[#599D9A]', iconBg: 'bg-[#FAF7F2]' },
    { name: 'Accessories', products: 289, vendors: 41, subcategories: ['Collars', 'Leashes', 'Bowls', 'Beds', 'Carriers', 'Crates'], status: 'Active', iconName: 'ShoppingBag', iconColor: 'text-[#599D9A]', iconBg: 'bg-[#FAF7F2]' },
    { name: 'Toys', products: 198, vendors: 38, subcategories: ['Chew Toys', 'Interactive', 'Plush', 'Fetch', 'Puzzle'], status: 'Active', iconName: 'Package', iconColor: 'text-[#D96B5B]', iconBg: 'bg-[#FAF7F2]' },
    { name: 'Grooming', products: 174, vendors: 31, subcategories: ['Shampoo', 'Brush/Comb', 'Nail Tools', 'Dental Care', 'Cologne'], status: 'Active', iconName: 'Scissors', iconColor: 'text-[#599D9A]', iconBg: 'bg-[#FAF7F2]' },
    { name: 'Medicines', products: 156, vendors: 28, subcategories: ['Deworming', 'Tick Control', 'Antibiotics', 'Eye/Ear Drops'], status: 'Active', iconName: 'Activity', iconColor: 'text-[#D96B5B]', iconBg: 'bg-[#FAF7F2]' },
    { name: 'Supplements', products: 89, vendors: 22, subcategories: ['Joint Care', 'Skin & Coat', 'Digestive', 'Immunity', 'Multivitamins'], status: 'Active', iconName: 'HeartPulse', iconColor: 'text-[#599D9A]', iconBg: 'bg-[#FAF7F2]' },
    { name: 'Housing & Travel', products: 67, vendors: 19, subcategories: ['Kennels', 'Crates', 'Carriers', 'Travel Bags', 'Seat Covers'], status: 'Active', iconName: 'Home', iconColor: 'text-[#5A5552]', iconBg: 'bg-[#FAF7F2]' },
    { name: 'Training Aids', products: 55, vendors: 14, subcategories: ['Clickers', 'Training Treats', 'Puppy Pads', 'Leashes', 'Whistles'], status: 'Inactive', iconName: 'BookOpen', iconColor: 'text-gray-400', iconBg: 'bg-gray-100' },
  ],

  /* ── Doctor Services: consultation types ────────────────── */
  doctor_consultation: [
    { type: 'Clinic Visit', iconName: 'Building2', iconColor: 'text-[#66B4B1]', sessions: '1,240', avgFee: '₹520', commission: '12%', surcharge: 'N/A', status: 'Active' },
    { type: 'Home Visit', iconName: 'Home', iconColor: 'text-indigo-500', sessions: '384', avgFee: '₹720', commission: '12%', surcharge: '+ ₹150', status: 'Active' },
    { type: 'Video Call', iconName: 'Video', iconColor: 'text-blue-500', sessions: '892', avgFee: '₹380', commission: '10%', surcharge: 'N/A', status: 'Active' },
    { type: 'Emergency', iconName: 'AlertCircle', iconColor: 'text-red-500', sessions: '124', avgFee: '₹950', commission: '15%', surcharge: '+ ₹300', status: 'Active' },
  ],

  /* ── Doctor Services: specializations ───────────────────── */
  doctor_specialization: [
    { name: 'General Vet', iconName: 'HeartPulse', doctors: 8, avgFee: '₹450', rating: 4.3, commission: '12%', status: 'Active' },
    { name: 'Dermatology', iconName: 'Microscope', doctors: 3, avgFee: '₹520', rating: 4.6, commission: '12%', status: 'Active' },
    { name: 'Surgery', iconName: 'Scissors', doctors: 2, avgFee: '₹850', rating: 4.8, commission: '12%', status: 'Active' },
    { name: 'Nutrition', iconName: 'Salad', doctors: 3, avgFee: '₹380', rating: 4.2, commission: '10%', status: 'Active' },
    { name: 'Emergency', iconName: 'AlertCircle', doctors: 4, avgFee: '₹900', rating: 4.7, commission: '15%', status: 'Active' },
    { name: 'Dentistry', iconName: 'Activity', doctors: 1, avgFee: '₹600', rating: 4.5, commission: '12%', status: 'Active' },
  ],

  /* ── Add-ons & Amenities: service add-ons ───────────────── */
  service_addon: [
    { name: 'Pick & Drop', services: ['Day Care', 'Grooming', 'Training'], price: '₹200 - ₹500', providers: 48, used: 842, status: 'Active', iconName: 'Truck' },
    { name: 'Special Diet', services: ['Day Care'], price: '₹150 - ₹300', providers: 32, used: 412, status: 'Active', iconName: 'Utensils' },
    { name: 'Photo Updates', services: ['Day Care', 'Training'], price: '₹100 / day', providers: 56, used: 1105, status: 'Active', iconName: 'Camera' },
    { name: 'Premium Bedding', services: ['Day Care'], price: '₹200 / night', providers: 24, used: 318, status: 'Active', iconName: 'BedDouble' },
    { name: 'Extra Play Time', services: ['Day Care'], price: '₹150 / hr', providers: 41, used: 689, status: 'Active', iconName: 'Activity' },
  ],

  /* ── Add-ons & Amenities: facility amenities ────────────── */
  facility_amenity: [
    { name: 'Swimming Pool', category: 'Recreation', facilities: 12, status: 'Active', iconName: 'Ship' },
    { name: 'AC Enclosures', category: 'Comfort', facilities: 38, status: 'Active', iconName: 'Snowflake' },
    { name: '24/7 Vet On Call', category: 'Medical', facilities: 24, status: 'Active', iconName: 'Stethoscope' },
    { name: 'Live CCTV Access', category: 'Security', facilities: 45, status: 'Active', iconName: 'Video' },
    { name: 'Large Play Area', category: 'Recreation', facilities: 52, status: 'Active', iconName: 'Move' },
    { name: 'Agility Course', category: 'Recreation', facilities: 18, status: 'Active', iconName: 'Goal' },
  ],

  /* ── Memorial: service types ────────────────────────────── */
  memorial_service: [
    { name: 'Burial Service', desc: 'Professional team visits and handles complete burial arrangements', requests: 18, avgPrice: '₹2,800', commission: '8%', providers: 10, status: 'Active', iconName: 'Box', iconColor: 'text-slate-500' },
    { name: 'Cremation Support', desc: 'Dignified cremation with optional ash preservation services', requests: 12, avgPrice: '₹3,500', commission: '8%', providers: 8, status: 'Active', iconName: 'Flower2', iconColor: 'text-slate-500' },
    { name: 'Tree Plantation', desc: 'Living memorial — plant a tree in memory of your beloved pet', requests: 8, avgPrice: '₹1,200', commission: '8%', providers: 6, status: 'Active', iconName: 'Trees', iconColor: 'text-[#66B4B1]' },
    { name: 'Memory Kit', desc: 'Keepsake package: framed photo, certificate, and remembrance card', requests: 22, avgPrice: '₹800', commission: '8%', providers: 10, status: 'Active', iconName: 'Heart', iconColor: 'text-slate-400' },
    { name: 'Memory Stone', desc: 'Custom engraved stone for home garden or burial site', requests: 6, avgPrice: '₹1,500', commission: '8%', providers: 4, status: 'Active', iconName: 'ImageIcon', iconColor: 'text-slate-500' },
    { name: 'Digital Memory Page', desc: 'Online memorial page with photos, tributes, and memories', requests: 4, avgPrice: '₹500', commission: '5%', providers: 3, status: 'Active', iconName: 'Laptop', iconColor: 'text-slate-400' },
  ],

  /* ── Memorial: packages ─────────────────────────────────── */
  memorial_package: [
    { name: 'Basic Farewell', services: 'Burial + Memory Kit', indPrice: '₹3,600', pkgPrice: '₹3,400', savings: 'Save ₹200', bookings: 14, status: 'Active' },
    { name: 'Premium Memorial', services: 'All 5 services', indPrice: '₹10,300', pkgPrice: '₹9,200', savings: 'Save ₹1,100', bookings: 8, status: 'Active' },
    { name: "Nature's Return", services: 'Cremation + Tree', indPrice: '₹4,700', pkgPrice: '₹4,500', savings: 'Save ₹200', bookings: 11, status: 'Active' },
    { name: 'Memory Forever', services: 'Memory Kit + Stone + Digital', indPrice: '₹2,800', pkgPrice: '₹2,500', savings: 'Save ₹300', bookings: 6, status: 'Active' },
  ],

  /* ── Event Categories ───────────────────────────────────── */
  event_category: [
    { name: 'Pet Birthday', desc: 'Celebrations for pet birthdays with decorations, cakes, photography', events: 18, bookings: 487, revenue: '₹1,24,000', organizers: 8, status: 'Active', iconName: 'Cake', iconColor: 'text-amber-500', iconBg: 'bg-amber-100' },
    { name: 'Adoption Event', desc: 'Community adoption drives connecting pets with loving families', events: 6, bookings: 198, revenue: '₹28,000', organizers: 4, status: 'Active', iconName: 'HeartHandshake', iconColor: 'text-rose-500', iconBg: 'bg-rose-100' },
    { name: 'Training Camps', desc: 'Professional pet training sessions for obedience and skill building', events: 8, bookings: 312, revenue: '₹89,000', organizers: 6, status: 'Active', iconName: 'Dumbbell', iconColor: 'text-blue-500', iconBg: 'bg-blue-100' },
    { name: 'Competitions', desc: 'Talent shows and competitive events for pets and their owners', events: 4, bookings: 124, revenue: '₹44,000', organizers: 3, status: 'Active', iconName: 'Trophy', iconColor: 'text-yellow-500', iconBg: 'bg-yellow-100' },
    { name: 'Social Meetups', desc: 'Community gatherings for pet owners to connect and socialize', events: 12, bookings: 119, revenue: '₹43,000', organizers: 7, status: 'Active', iconName: 'Users', iconColor: 'text-purple-500', iconBg: 'bg-purple-100' },
  ],

  /* ── Event add-on services ──────────────────────────────── */
  event_addon: [
    { name: 'Cake', iconName: 'ShoppingBag', price: '₹500–₹2,000', vendors: 14, used: 124, revenue: '₹98,000', status: 'Active' },
    { name: 'Photography', iconName: 'Camera', price: '₹1,500–₹5,000', vendors: 18, used: 89, revenue: '₹2,12,000', status: 'Active' },
    { name: 'Decoration', iconName: 'Paintbrush', price: '₹2,000–₹8,000', vendors: 16, used: 112, revenue: '₹3,84,000', status: 'Active' },
    { name: 'Pet Grooming', iconName: 'Scissors', price: '₹500–₹1,500', vendors: 12, used: 67, revenue: '₹72,000', status: 'Active' },
    { name: 'Return Gifts', iconName: 'Gift', price: '₹200–₹800', vendors: 9, used: 78, revenue: '₹46,000', status: 'Active' },
    { name: 'Pet Costume', iconName: 'Shirt', price: '₹300–₹1,200', vendors: 11, used: 54, revenue: '₹38,000', status: 'Active' },
  ],

  /* ── Event pending approvals ────────────────────────────── */
  event_pending: [
    { code: 'EVT-902', name: 'Summer Dog Pool Party', organizer: 'Pawsome Events', date: '15 Jun 2025', capacity: '50 pets', fee: '₹800' },
    { code: 'EVT-903', name: 'Cat Agility Championship', organizer: 'Feline Friends', date: '22 Jun 2025', capacity: '30 pets', fee: '₹500' },
    { code: 'EVT-904', name: 'Puppy Socialization Basics', organizer: 'K9 Trainers Hub', date: '10 Jun 2025', capacity: '15 pets', fee: '₹1,200' },
  ],

  /* ── Grooming services ──────────────────────────────────── */
  grooming_service: [
    { name: 'Basic Bath', duration: '45 mins', price: '₹400', commission: '10%', facilities: 38, status: 'Active' },
    { name: 'Full Grooming', duration: '120 mins', price: '₹1,200', commission: '12%', facilities: 42, status: 'Active' },
    { name: 'Nail Clipping', duration: '15 mins', price: '₹150', commission: '5%', facilities: 40, status: 'Active' },
    { name: 'Ear Cleaning', duration: '20 mins', price: '₹200', commission: '5%', facilities: 39, status: 'Active' },
    { name: 'Hair Styling', duration: '60 mins', price: '₹800', commission: '15%', facilities: 24, status: 'Active' },
    { name: 'Spa Treatment', duration: '90 mins', price: '₹1,500', commission: '15%', facilities: 18, status: 'Active' },
  ],

  /* ── Day-care / boarding packages ───────────────────────── */
  daycare_package: [
    { name: 'Half Day', duration: 'Up to 5 hrs', price: '₹300', commission: '10%', facilities: 28, status: 'Active' },
    { name: 'Full Day', duration: 'Up to 10 hrs', price: '₹500', commission: '10%', facilities: 32, status: 'Active' },
    { name: 'Overnight Boarding', duration: '24 hrs', price: '₹800', commission: '12%', facilities: 22, status: 'Active' },
    { name: 'Weekly Package', duration: '7 days', price: '₹4,500', commission: '15%', facilities: 18, status: 'Active' },
    { name: 'Monthly Package', duration: '30 days', price: '₹15,000', commission: '15%', facilities: 12, status: 'Active' },
  ],

  /* ── Grooming/day-care partner facilities ───────────────── */
  grooming_facility: [
    { name: 'Happy Paws Grooming', city: 'Mumbai', rating: 4.8, services: ['Grooming'], bookings: 12, status: 'Active' },
    { name: 'Tail Waggers Retreat', city: 'Delhi', rating: 4.6, services: ['Day Care', 'Grooming'], bookings: 28, status: 'Active' },
    { name: 'Fluffy Spa & Boarding', city: 'Bangalore', rating: 4.9, services: ['Grooming', 'Day Care'], bookings: 34, status: 'Active' },
    { name: 'Pet Haven', city: 'Pune', rating: 4.4, services: ['Day Care'], bookings: 18, status: 'Active' },
    { name: 'Sparkle Pets', city: 'Chennai', rating: 4.7, services: ['Grooming'], bookings: 15, status: 'Inactive' },
  ],
};

export async function seedAdminConfig() {
  let count = 0;
  for (const [group, rows] of Object.entries(GROUPS)) {
    for (let i = 0; i < rows.length; i++) {
      const seedKey = `cfg:${group}:${i}`;
      await AdminConfig.updateOne(
        { seedKey },
        { $set: { group, sort: i + 1, data: rows[i], seedKey } },
        { upsert: true }
      );
      count++;
    }
  }
  return `${count} config rows across ${Object.keys(GROUPS).length} groups`;
}
