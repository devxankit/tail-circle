import { Provider } from '../../src/modules/provider/provider.model.js';
import { ServiceOffering } from '../../src/modules/provider/serviceOffering.model.js';
import { Doctor } from '../../src/modules/provider/doctor.model.js';
import { Event, EventMeta } from '../../src/modules/provider/event.model.js';

/**
 * This seeder is the canonical holder of the migrated mock data — the
 * original mock files (`mockDaycareApi.js`, `mockGroomingApi.js`, inline
 * component arrays) were deleted after the UI moved to the API, so all raw
 * records live here verbatim to keep re-runs idempotent.
 */
const MOCK_DAYCARES = [
  {
    id: 'dc_1', name: 'TailCircle Daycare Center', verified: true, rating: 4.9, reviews: 230,
    distance: '3.2 km', isOpen: true, openTime: '7:00 AM', closeTime: '7:00 PM',
    pricePerDay: 899, pricePerWeek: 4499, pricePerMonth: 14999,
    image: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=600&q=80',
    facilities: ['Indoor & Outdoor Play', '24x7 Supervision', 'Trained Caretakers', 'Nutritious Meals', 'Photo & Video Updates'],
    about: 'We provide a safe, fun and loving environment where your pet can play, learn and relax while you are away. Our certified caregivers ensure round the clock attention with personalized care plans tailored for every dog.',
    rules: ['Vaccination is mandatory', 'Please inform about allergies', 'Aggressive pets require trial'],
    badge: 'Popular', allowedPets: ['Dogs', 'Cats'],
    gallery: [
      'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1591160690555-5debfba289f0?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?auto=format&fit=crop&w=600&q=80',
    ],
    host: { name: 'Anjali Sharma', role: 'Certified Pet Handler', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80', experience: '5+ Years Exp.' },
    stats: [
      { label: 'Caregiver Ratio', value: '1:5' },
      { label: 'Play Area', value: '2500 sq.ft' },
      { label: 'Vet Distance', value: 'In-house' },
    ],
    activities: [
      { name: 'Agility Training', time: '10:00 AM' },
      { name: 'Social Play Time', time: '02:00 PM' },
      { name: 'Nap & Relaxation', time: '04:00 PM' },
    ],
  },
  {
    id: 'dc_2', name: 'Paws & Play Daycare', verified: true, rating: 4.8, reviews: 180,
    distance: '2.1 km', isOpen: true, openTime: '8:00 AM', closeTime: '8:00 PM',
    pricePerDay: 999, pricePerWeek: 4999, pricePerMonth: 16999,
    image: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=600&q=80',
    facilities: ['Indoor Play Area', 'Trained Caretakers', 'Supervised Playtime', 'Nutritious Meals', 'Photo & Video Updates'],
    about: "Your pet's second home. We specialize in small breeds and provide special dietary meals.",
    rules: ['Vaccination is mandatory', 'Bring your own leash'],
    badge: 'Premium', allowedPets: ['Dogs', 'Cats'],
    gallery: ['https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=600&q=80'],
  },
  {
    id: 'dc_3', name: 'Happy Tails Daycare', verified: true, rating: 4.6, reviews: 98,
    distance: '1.8 km', isOpen: true, openTime: '7:30 AM', closeTime: '6:30 PM',
    pricePerDay: 749, pricePerWeek: 3799, pricePerMonth: 12999,
    image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=600&q=80',
    facilities: ['Outdoor Play', 'CCTV Monitored', 'Trained Staff', 'Nutritious Meals', 'Photo Updates'],
    about: 'Premium daycare facility with overnight boarding options and 24/7 vet access.',
    rules: ['All ages accepted', 'Mandatory tick treatment'],
    badge: 'Budget Friendly', allowedPets: ['Dogs', 'Cats'],
    gallery: ['https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=600&q=80'],
  },
];

const MOCK_DAYCARE_PLANS = [
  { id: 'plan_day', name: 'Day Pass', price: 499, unit: 'day', description: 'Perfect for single day care.', includes: ['Playtime', 'Rest Area', 'Basic Care'], badge: null },
  { id: 'plan_week', name: 'Weekly Care', price: 2499, unit: 'week', description: '6 days daycare. Best for working pet parents.', includes: ['6 Days Access', 'Priority Slots', 'Playtime', 'Rest Area'], badge: 'Most Popular' },
  { id: 'plan_month', name: 'Monthly Care', price: 7999, unit: 'month', description: 'Priority slots + discount. Best value.', includes: ['Unlimited Access', 'Priority Slots', 'Special Discounts', 'Extra Playtime'], badge: 'Best Value' },
];

const MOCK_DAYCARE_ADDONS = [
  { id: 'addon_1', name: 'Pickup & Drop', price: 150, unit: 'day' },
  { id: 'addon_2', name: 'Meal', price: 100, unit: 'day' },
  { id: 'addon_3', name: 'Bath', price: 200, unit: 'day' },
  { id: 'addon_4', name: 'Grooming', price: 250, unit: 'day' },
  { id: 'addon_5', name: 'Extra Playtime (1 hr)', price: 120, unit: 'day' },
];

const MOCK_GROOMING_SHOPS = [
  {
    id: 'gshop_1', name: 'ClipPaw Grooming Studio', rating: 4.9, reviews: 341,
    distance: 'Bandra West, Mumbai', visitTypes: ['Salon Visit'], startingPrice: 499, availability: 'Open Now',
    image: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=600&q=80',
    about: 'Award-winning grooming studio with certified breed specialists. Stress-free environment with no kennels between appointments.',
    experience: '7+ Years', hygiene: '100% Sanitized Tools, UV sterilization',
    cancellation: 'Free cancellation up to 4 hours before slot.', supportedPets: ['Dogs', 'Cats'],
    servicesList: [
      { name: 'Full Grooming', startsAt: 800 }, { name: 'Bath & Blow Dry', startsAt: 250 },
      { name: 'Nail Trim', startsAt: 200 }, { name: 'Ear Cleaning', startsAt: 150 }, { name: 'Teeth Brushing', startsAt: 150 },
    ],
  },
  {
    id: 'gshop_2', name: 'Fancy Furz', rating: 4.7, reviews: 218,
    distance: 'Andheri West, Mumbai', visitTypes: ['Home Visit', 'Salon Visit'], startingPrice: 399, availability: 'Open Now',
    image: 'https://images.unsplash.com/photo-1593134257782-e89567b7718a?auto=format&fit=crop&w=600&q=80',
    about: 'Specialized in home visits and quick salon trims. We bring the luxury right to your doorstep for a stress-free grooming experience.',
    experience: '5+ Years', hygiene: 'Disposable Towels Used, Fresh water supply',
    cancellation: 'Free cancellation up to 2 hours before slot.', supportedPets: ['Dogs', 'Cats'],
    servicesList: [
      { name: 'Breed-Specific Cuts', startsAt: 699 }, { name: 'De-shedding Treatment', startsAt: 1499 },
      { name: 'Paw Massage', startsAt: 399 }, { name: 'Flea Treatment', startsAt: 499 },
    ],
  },
  {
    id: 'gshop_3', name: 'Bark & Bubbles Luxury Spa', rating: 4.9, reviews: 521,
    distance: 'Juhu, Mumbai', visitTypes: ['Salon Visit'], startingPrice: 899, availability: 'Closes at 9 PM',
    image: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=600&q=80',
    about: 'Luxury pet spa offering aromatherapy, blueberry facials, and premium coat treatments for your furry VIPs.',
    experience: '10+ Years', hygiene: 'Hospital-grade Disinfectant',
    cancellation: 'Free cancellation up to 12 hours before slot.', supportedPets: ['Dogs'],
    servicesList: [
      { name: 'Premium Spa', startsAt: 1499 }, { name: 'Aromatherapy Bath', startsAt: 899 }, { name: 'Show Dog Styling', startsAt: 2499 },
    ],
  },
  {
    id: 'gshop_4', name: 'The Happy Hound Groomers', rating: 4.5, reviews: 89,
    distance: 'Powai, Mumbai', visitTypes: ['Salon Visit', 'Home Visit'], startingPrice: 399, availability: 'Open Now',
    image: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=600&q=80',
    about: 'Affordable and reliable grooming services. We love what we do, and it shows in every wagging tail!',
    experience: '3+ Years', hygiene: 'Daily Deep Cleaning',
    cancellation: 'Free cancellation up to 24 hours before slot.', supportedPets: ['Dogs'],
    servicesList: [
      { name: 'Basic Bath', startsAt: 399 }, { name: 'Tick Treatment', startsAt: 599 }, { name: 'Nail Clipping', startsAt: 149 },
    ],
  },
  {
    id: 'gshop_5', name: 'Purrfect Paws Cat Salon', rating: 4.8, reviews: 210,
    distance: 'Colaba, Mumbai', visitTypes: ['Salon Visit'], startingPrice: 549, availability: 'Closes at 8 PM',
    image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=600&q=80',
    about: 'Specialized grooming exclusively for cats. Quiet zones for felines to reduce stress.',
    experience: '8+ Years', hygiene: 'Feline-friendly sanitizers used',
    cancellation: 'Free cancellation up to 4 hours before slot.', supportedPets: ['Cats'],
    servicesList: [
      { name: 'Cat Dry Bath', startsAt: 549 }, { name: 'Lion Cut', startsAt: 1299 }, { name: 'Ear Cleaning', startsAt: 199 },
    ],
  },
];

const MOCK_GROOMING_PACKAGES = {
  gshop_1: [
    { id: 'pkg_1', name: 'Basic Bath & Brush', price: 499, includes: ['Organic Bath', 'Blow Dry', 'Nail Trim', 'Ear Cleaning'] },
    { id: 'pkg_2', name: 'Standard Full Grooming', price: 999, includes: ['Organic Bath', 'Breed Specific Haircut', 'Nail Trim', 'Ear Cleaning', 'Paw Balm'], isPopular: true },
    { id: 'pkg_3', name: 'Premium De-shedding Spa', price: 1499, includes: ['Deshedding Shampoo', 'Deep Brushing', 'Haircut', 'Paw Massage', 'Teeth Brushing', 'Perfume'] },
  ],
  gshop_2: [
    { id: 'pkg_4', name: 'Home Basic Bath', price: 699, includes: ['Mobile Van Bath', 'Towel Dry', 'Ear Cleaning'] },
    { id: 'pkg_5', name: 'Home Full Grooming', price: 1499, includes: ['Mobile Van Bath', 'Full Body Haircut', 'Nail Trim', 'Paw Cleaning', 'Sanitary Trim'], isPopular: true },
  ],
  gshop_3: [
    { id: 'pkg_6', name: 'Aromatherapy Bath', price: 899, includes: ['Lavender Infused Bath', 'Blow Dry', 'Coat Conditioning'] },
    { id: 'pkg_7', name: 'Ultimate Spa Day', price: 2499, includes: ['Aromatherapy Bath', 'Show Dog Styling', 'Blueberry Facial', 'Teeth Brushing', 'Nail Painting'], isPopular: true },
  ],
  gshop_4: [
    { id: 'pkg_8', name: 'Quick Wash', price: 399, includes: ['Basic Bath', 'Towel Dry'] },
    { id: 'pkg_9', name: 'Neat & Tidy', price: 799, includes: ['Basic Bath', 'Face & Paws Trim', 'Nail Clipping'], isPopular: true },
  ],
  gshop_5: [
    { id: 'pkg_10', name: 'Cat Waterless Bath', price: 549, includes: ['Foam Bath', 'Brushing', 'Ear Cleaning'] },
    { id: 'pkg_11', name: 'Purrfect Grooming', price: 1199, includes: ['Water Bath (if allowed)', 'Lion Cut', 'Nail Trim', 'Ear Cleaning'], isPopular: true },
    { id: 'pkg_12', name: 'Dog Bath & Brush', price: 799, includes: ['Bath', 'Brush', 'Nail Trim'] },
  ],
};

const MOCK_GROOMING_ADDONS = [
  { id: 'addon_1', name: 'Anti Tick Treatment', price: 299, category: 'Treatments' },
  { id: 'addon_2', name: 'Teeth Cleaning', price: 199, category: 'Hygiene' },
  { id: 'addon_3', name: 'De-shedding', price: 399, category: 'Grooming' },
  { id: 'addon_4', name: 'Paw Massage', price: 149, category: 'Spa' },
  { id: 'addon_5', name: 'Perfume', price: 99, category: 'Finishing' },
];

const MOCK_GROOMING_MENUS = {
  gshop_1: [
    { category: 'Bathing & Drying', items: [
      { id: 'm1', name: 'Quick Wash (Waterless)', price: 199, desc: 'Waterless foaming bath for quick cleaning.' },
      { id: 'm2', name: 'Organic Bath', price: 399, desc: 'Deep cleansing using 100% organic shampoo.' },
      { id: 'm3', name: 'Flea & Tick Bath', price: 499, desc: 'Special medicated bath to remove pests.' },
    ]},
    { category: 'Haircuts & Styling', items: [
      { id: 'm4', name: 'Basic Trim', price: 499, desc: 'Trimming of face, paws, and sanitary areas.' },
      { id: 'm5', name: 'Full Body Haircut', price: 899, desc: 'Breed specific full body styling.' },
    ]},
    { category: 'Hygiene Essentials', items: [
      { id: 'm6', name: 'Nail Clipping', price: 149, desc: 'Safe nail trimming and filing.' },
      { id: 'm7', name: 'Ear Cleaning', price: 149, desc: 'Gentle ear wax removal and cleaning.' },
      { id: 'm8', name: 'Teeth Brushing', price: 199, desc: 'Brushing with pet-safe enzymatic toothpaste.' },
    ]},
  ],
  default: [
    { category: 'Wash & Dry', items: [
      { id: 'm9', name: 'Basic Bath', price: 299, desc: 'Refreshing bath and towel dry.' },
      { id: 'm10', name: 'Premium Wash & Blow Dry', price: 499, desc: 'Deep wash with blow drying for fluffy coat.' },
    ]},
    { category: 'Grooming Basics', items: [
      { id: 'm11', name: 'Nail Trim', price: 150, desc: 'Painless nail clipping.' },
      { id: 'm12', name: 'Ear Cleaning', price: 150, desc: 'Cleaning of outer ear canal.' },
      { id: 'm13', name: 'Sanitary Trim', price: 250, desc: 'Trimming around sanitary areas.' },
    ]},
    { category: 'Special Treatments', items: [
      { id: 'm14', name: 'Anti-Tick Treatment', price: 499, desc: 'Tick removal and prevention spray.' },
      { id: 'm15', name: 'Paw Massage & Balm', price: 299, desc: 'Relaxing paw massage with healing balm.' },
    ]},
  ],
};
const MOCK_DOCTORS = [
  { id: 1, name: 'Dr. Ananya Krishnan', spec: 'Small Animals & Surgery', clinic: 'Petcare Clinic', exp: '12 years exp', rating: 4.9, reviews: 412, location: 'Bandra West', price: 500, nextAvailable: 'Today, 4:00 PM', availability: 'Available', img: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=200&q=80' },
  { id: 2, name: 'Dr. Rohan Patel', spec: 'Dermatology & Internal Medicine', clinic: 'Mumbai Pet Hospital', exp: '9 years exp', rating: 4.8, reviews: 287, location: 'Andheri East', price: 600, nextAvailable: 'Today, 6:30 PM', availability: 'Available', img: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=200&q=80' },
  { id: 3, name: 'Dr. Priya Mehta', spec: 'Dental & Nutrition', clinic: 'Paws & Claws Care', exp: '6 years exp', rating: 4.7, reviews: 156, location: 'Juhu', price: 450, nextAvailable: 'Tomorrow, 10:00 AM', availability: 'Busy', img: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80' },
];

const MOCK_EVENTS = [
  { id: 1, title: 'Dog Birthday Party', emoji: '🎂', img: '/assets/events/event_birthday.png', date: '25', month: 'MAY', time: '4:00 PM - 7:00 PM', location: 'Puppy Planet, Indore', price: 699, category: 'birthday', going: 28, desc: "Celebrate your dog's special day with games, cake & fun!", avatars: ['https://randomuser.me/api/portraits/men/32.jpg', 'https://randomuser.me/api/portraits/women/44.jpg', 'https://randomuser.me/api/portraits/men/46.jpg'] },
  { id: 2, title: 'Pool Pawty', emoji: '🏊', img: '/assets/events/event_pool.png', date: '02', month: 'JUN', time: '11:00 AM - 2:00 PM', location: 'Woof Water Park, Indore', price: 499, category: 'pool', going: 22, desc: 'Beat the heat with a splash! Pool party for dogs.', avatars: ['https://randomuser.me/api/portraits/women/65.jpg', 'https://randomuser.me/api/portraits/men/55.jpg', 'https://randomuser.me/api/portraits/women/33.jpg'] },
  { id: 3, title: 'Pet Sports Day', emoji: '🏆', img: '/assets/events/event_sports.png', date: '08', month: 'JUN', time: '9:00 AM - 12:00 PM', location: 'Pet Playground, Indore', price: 399, category: 'sports', going: 35, desc: 'Fun sports & agility games for your furry champion!', avatars: ['https://randomuser.me/api/portraits/men/22.jpg', 'https://randomuser.me/api/portraits/women/12.jpg', 'https://randomuser.me/api/portraits/men/34.jpg'] },
  { id: 4, title: 'Paw Fashion Show', emoji: '👑', img: '/assets/events/event_fashion.png', date: '15', month: 'JUN', time: '5:00 PM - 8:00 PM', location: 'Town Hall Mall, Indore', price: 799, category: 'fashion', going: 41, desc: 'Let your pet strut the runway in style!', avatars: ['https://randomuser.me/api/portraits/men/11.jpg', 'https://randomuser.me/api/portraits/women/19.jpg', 'https://randomuser.me/api/portraits/men/78.jpg'] },
  { id: 5, title: 'Pet Meetup', emoji: '🐾', img: '/assets/events/event_meetup.png', date: '20', month: 'JUN', time: '10:00 AM - 1:00 PM', location: 'Central Park, Indore', price: 299, category: 'meetup', going: 50, desc: 'Meet, play, and make friends with other pets!', avatars: ['https://randomuser.me/api/portraits/men/5.jpg', 'https://randomuser.me/api/portraits/women/8.jpg', 'https://randomuser.me/api/portraits/men/15.jpg'] },
];

const MOCK_EVENT_CATEGORIES = [
  { id: 'all', name: 'All Events', emoji: '🎟️' },
  { id: 'birthday', name: 'Birthday Party', emoji: '🎂', img: '/assets/events/event_birthday.png' },
  { id: 'pool', name: 'Pool Party', emoji: '🏊', img: '/assets/events/event_pool.png' },
  { id: 'meetup', name: 'Pet Meetup', emoji: '🐾', img: '/assets/events/event_meetup.png' },
  { id: 'training', name: 'Training Camp', emoji: '🎓', img: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=150&q=80' },
  { id: 'fashion', name: 'Pet Fashion Show', emoji: '👑', img: '/assets/events/event_fashion.png' },
  { id: 'sports', name: 'Pet Sports Day', emoji: '🏆', img: '/assets/events/event_sports.png' },
  { id: 'adoption', name: 'Adoption Drive', emoji: '❤️', img: 'https://images.unsplash.com/photo-1534361960057-19889db9621e?auto=format&fit=crop&w=150&q=80' },
  { id: 'spa', name: 'Spa Day', emoji: '✨', img: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=150&q=80' },
  { id: 'cat', name: 'Cat Events', emoji: '🐱', img: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=150&q=80' },
  { id: 'dog', name: 'Dog Events', emoji: '🐶', img: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=150&q=80' },
];

const MOCK_PACKAGE_TEMPLATES = [
  { id: 'pkg-birthday', title: 'Dog Birthday Package', emoji: '🎂', img: '/assets/events/package_birthday.png', price: '4,999+', type: 'Birthday', features: ['Decoration', 'Cake', 'Photography', 'Games', 'Coordinator'] },
  { id: 'pkg-pool', title: 'Pool Party Package', emoji: '🏊', img: '/assets/events/event_pool.png', price: '7,999+', type: 'Pool Party', features: ['Decoration', 'Cake', 'Photography', 'Games', 'Coordinator'] },
  { id: 'pkg-cat', title: 'Cat Birthday Package', emoji: '🐱', img: '/assets/events/package_cat.png', price: '4,999+', type: 'Birthday', features: ['Decoration', 'Cake', 'Photography', 'Games', 'Coordinator'] },
  { id: 'pkg-meetup', title: 'Pet Meetup Package', emoji: '🐾', img: '/assets/events/event_meetup.png', price: '7,999+', type: 'Meetup', features: ['Decoration', 'Cake', 'Photography', 'Games', 'Coordinator'] },
  { id: 'pkg-wedding', title: 'Pet Wedding Package', emoji: '💍', img: '/assets/events/package_wedding.png', price: '12,999+', type: 'Wedding', features: ['Decoration', 'Cake', 'Photography', 'Games', 'Coordinator'] },
];

// Grooming slot template (mockSlots in mockGroomingApi.js — not exported).
const GROOMING_SLOT_TEMPLATE = [
  { time: '09:00 AM', period: 'Morning' },
  { time: '10:00 AM', period: 'Morning' },
  { time: '11:00 AM', period: 'Morning' },
  { time: '12:00 PM', period: 'Afternoon' },
  { time: '01:00 PM', period: 'Afternoon' },
  { time: '02:00 PM', period: 'Afternoon' },
  { time: '03:00 PM', period: 'Afternoon' },
  { time: '05:00 PM', period: 'Evening' },
  { time: '06:00 PM', period: 'Evening' },
  { time: '07:00 PM', period: 'Evening' },
];

async function upsertOffering(fields) {
  await ServiceOffering.updateOne(
    { legacyId: fields.legacyId, providerId: fields.providerId ?? null, providerType: fields.providerType },
    { $set: { ...fields, active: true } },
    { upsert: true }
  );
}

export async function seedProviders() {
  let providers = 0;
  let offerings = 0;

  // ── Daycare ────────────────────────────────────────────
  for (const d of MOCK_DAYCARES) {
    await Provider.updateOne(
      { legacyId: d.id },
      {
        $set: {
          legacyId: d.id,
          type: 'daycare',
          name: d.name,
          verified: d.verified,
          rating: d.rating,
          ratingCount: d.reviews,
          image: d.image,
          gallery: d.gallery || [],
          about: d.about || '',
          badge: d.badge || null,
          isOpen: d.isOpen,
          openTime: d.openTime,
          closeTime: d.closeTime,
          startingPrice: d.pricePerDay,
          supportedPets: d.allowedPets || [],
          distanceText: d.distance || '',
          details: {
            pricePerDay: d.pricePerDay,
            pricePerWeek: d.pricePerWeek,
            pricePerMonth: d.pricePerMonth,
            facilities: d.facilities || [],
            rules: d.rules || [],
            host: d.host || null,
            stats: d.stats || [],
            activities: d.activities || [],
          },
          active: true,
        },
      },
      { upsert: true }
    );
    providers++;
  }
  // Daycare plans + addons are platform-wide in the mock.
  for (const p of MOCK_DAYCARE_PLANS) {
    await upsertOffering({
      legacyId: p.id, providerId: null, providerType: 'daycare', kind: 'plan',
      name: p.name, price: p.price, unit: p.unit, description: p.description || '',
      includes: p.includes || [], badge: p.badge || null,
    });
    offerings++;
  }
  for (const a of MOCK_DAYCARE_ADDONS) {
    await upsertOffering({
      legacyId: a.id, providerId: null, providerType: 'daycare', kind: 'addon',
      name: a.name, price: a.price, unit: a.unit || null,
    });
    offerings++;
  }

  // ── Grooming ───────────────────────────────────────────
  for (const s of MOCK_GROOMING_SHOPS) {
    await Provider.updateOne(
      { legacyId: s.id },
      {
        $set: {
          legacyId: s.id,
          type: 'grooming',
          name: s.name,
          rating: s.rating,
          ratingCount: s.reviews,
          image: s.image,
          about: s.about || '',
          startingPrice: s.startingPrice,
          supportedPets: s.supportedPets || [],
          visitTypes: s.visitTypes || [],
          distanceText: s.distance || '',
          details: {
            availability: s.availability,
            experience: s.experience,
            hygiene: s.hygiene,
            cancellation: s.cancellation,
            servicesList: s.servicesList || [],
            slotTemplate: GROOMING_SLOT_TEMPLATE,
          },
          active: true,
        },
      },
      { upsert: true }
    );
    providers++;

    const shop = await Provider.findOne({ legacyId: s.id });
    for (const pkg of MOCK_GROOMING_PACKAGES[s.id] || MOCK_GROOMING_PACKAGES.gshop_1) {
      await upsertOffering({
        legacyId: pkg.id, providerId: shop._id, providerType: 'grooming', kind: 'package',
        name: pkg.name, price: pkg.price, includes: pkg.includes || [], isPopular: Boolean(pkg.isPopular),
      });
      offerings++;
    }
    for (const section of MOCK_GROOMING_MENUS[s.id] || MOCK_GROOMING_MENUS.default) {
      for (const item of section.items) {
        await upsertOffering({
          legacyId: item.id, providerId: shop._id, providerType: 'grooming', kind: 'menu_item',
          name: item.name, price: item.price, description: item.desc || '', category: section.category,
        });
        offerings++;
      }
    }
  }
  for (const a of MOCK_GROOMING_ADDONS) {
    await upsertOffering({
      legacyId: a.id, providerId: null, providerType: 'grooming', kind: 'addon',
      name: a.name, price: a.price, category: a.category || null,
    });
    offerings++;
  }

  // ── Doctors ────────────────────────────────────────────
  for (const d of MOCK_DOCTORS) {
    await Doctor.updateOne(
      { legacyId: d.id },
      {
        $set: {
          legacyId: d.id, name: d.name, spec: d.spec, clinic: d.clinic, expText: d.exp,
          rating: d.rating, reviews: d.reviews, location: d.location, price: d.price,
          img: d.img, nextAvailable: d.nextAvailable, availability: d.availability, active: true,
        },
      },
      { upsert: true }
    );
  }

  // ── Events ─────────────────────────────────────────────
  for (const e of MOCK_EVENTS) {
    await Event.updateOne(
      { legacyId: e.id },
      {
        $set: {
          legacyId: e.id, title: e.title, emoji: e.emoji, img: e.img, dateDay: e.date,
          monthText: e.month, timeText: e.time, location: e.location, price: e.price,
          category: e.category, going: e.going, desc: e.desc, avatars: e.avatars,
          capacity: 100, status: 'published',
        },
        $setOnInsert: { sold: 0 },
      },
      { upsert: true }
    );
  }
  for (const [i, c] of MOCK_EVENT_CATEGORIES.entries()) {
    await EventMeta.updateOne(
      { kind: 'category', legacyId: c.id },
      { $set: { data: c, sort: i } },
      { upsert: true }
    );
  }
  for (const [i, t] of MOCK_PACKAGE_TEMPLATES.entries()) {
    await EventMeta.updateOne(
      { kind: 'package_template', legacyId: t.id },
      { $set: { data: t, sort: i } },
      { upsert: true }
    );
  }

  // ── Memorial ───────────────────────────────────────────
  await Provider.updateOne(
    { legacyId: 'memorial_1' },
    {
      $set: {
        legacyId: 'memorial_1', type: 'memorial', name: 'TailCircle Memorial Center',
        verified: true, about: 'The Last Drive — dignified farewell services.',
        details: {}, active: true,
      },
    },
    { upsert: true }
  );
  providers++;

  return `${providers} providers, ${offerings} offerings, ${MOCK_DOCTORS.length} doctors, ${MOCK_EVENTS.length} events (+meta) upserted`;
}
