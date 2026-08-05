import {
  AdoptionListing,
  AdoptionBreed,
  MarketplaceListing,
} from '../../src/modules/adoption/adoption.models.js';

/**
 * Canonical holder of the adoption mock data — the deterministic generator
 * from `mockAdoptApi.js` (deleted after wiring) reproduced verbatim, plus
 * the Marketplace seed listings from `Marketplace.jsx`.
 */
const breedImages = {
  'Golden Retriever': [
    'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=500&q=80',
    'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=500&q=80',
    'https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?auto=format&fit=crop&w=500&q=80',
    'https://images.unsplash.com/photo-1507146426996-ef05306b995a?auto=format&fit=crop&w=500&q=80',
    'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=500&q=80',
  ],
  'Labrador Retriever': [
    'https://images.unsplash.com/photo-1534361960057-19889db9621e?auto=format&fit=crop&w=500&q=80',
    'https://images.unsplash.com/photo-1591768793355-74d71896088a?auto=format&fit=crop&w=500&q=80',
    'https://images.unsplash.com/photo-1553882809-a4f57e59501d?auto=format&fit=crop&w=500&q=80',
    'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=500&q=80',
  ],
  'German Shepherd': [
    'https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?auto=format&fit=crop&w=500&q=80',
    'https://images.unsplash.com/photo-1551818255-e6e10975bc17?auto=format&fit=crop&w=500&q=80',
    'https://images.unsplash.com/photo-1579722820308-d74e571900a9?auto=format&fit=crop&w=500&q=80',
  ],
  'Siberian Husky': [
    'https://images.unsplash.com/photo-1531804055935-76f44d7c3621?auto=format&fit=crop&w=500&q=80',
    'https://images.unsplash.com/photo-1605568427561-40dd23c2acf9?auto=format&fit=crop&w=500&q=80',
    'https://images.unsplash.com/photo-1547407139-3c921a66005c?auto=format&fit=crop&w=500&q=80',
  ],
  Beagle: [
    'https://images.unsplash.com/photo-1505628346881-b72b27e84530?auto=format&fit=crop&w=500&q=80',
    'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=500&q=80',
  ],
  Pug: [
    'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=500&q=80',
    'https://images.unsplash.com/photo-1523626797181-8c57db7a403b?auto=format&fit=crop&w=500&q=80',
  ],
  Rottweiler: [
    'https://images.unsplash.com/photo-1568572933382-74d440642117?auto=format&fit=crop&w=500&q=80',
    'https://images.unsplash.com/photo-1598133894008-61f7fdb8cc3a?auto=format&fit=crop&w=500&q=80',
  ],
  Doberman: [
    'https://images.unsplash.com/photo-1555685812-4b943f1cb0eb?auto=format&fit=crop&w=500&q=80',
    'https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?auto=format&fit=crop&w=500&q=80',
  ],
  'Shih Tzu': [
    'https://images.unsplash.com/photo-1583511655826-05700d52f4d9?auto=format&fit=crop&w=500&q=80',
    'https://images.unsplash.com/photo-1601758124096-1fd661873b95?auto=format&fit=crop&w=500&q=80',
  ],
  Pomeranian: [
    'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=500&q=80',
    'https://images.unsplash.com/photo-1605568427561-40dd23c2acf9?auto=format&fit=crop&w=500&q=80',
  ],
  'Great Dane': [
    'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=500&q=80',
    'https://images.unsplash.com/photo-1507146426996-ef05306b995a?auto=format&fit=crop&w=500&q=80',
  ],
  'Saint Bernard': ['https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=500&q=80'],
  Chihuahua: ['https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?auto=format&fit=crop&w=500&q=80'],
  'Border Collie': ['https://images.unsplash.com/photo-1503256207526-0d5d80fa2f47?auto=format&fit=crop&w=500&q=80'],
  'Cocker Spaniel': ['https://images.unsplash.com/photo-1583511655826-05700d52f4d9?auto=format&fit=crop&w=500&q=80'],
  Boxer: ['https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=500&q=80'],
  Dalmatian: ['https://images.unsplash.com/photo-1502673530728-f79b4cbd315c?auto=format&fit=crop&w=500&q=80'],
  'Indian Pariah': ['https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=500&q=80'],
  'Belgian Malinois': ['https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?auto=format&fit=crop&w=500&q=80'],
  Samoyed: ['https://images.unsplash.com/photo-1529429617329-84d1ec5d523d?auto=format&fit=crop&w=500&q=80'],
};

const breedSpecs = {
  'Golden Retriever': { count: 12, size: 'Large', traits: 'Friendly • Intelligent' },
  'Labrador Retriever': { count: 18, size: 'Large', traits: 'Loyal • Energetic' },
  'German Shepherd': { count: 15, size: 'Large', traits: 'Smart • Protective' },
  'Siberian Husky': { count: 9, size: 'Large', traits: 'Energetic • Playful' },
  Beagle: { count: 11, size: 'Medium', traits: 'Curious • Friendly' },
  Pug: { count: 7, size: 'Small', traits: 'Charming • Playful' },
  Rottweiler: { count: 6, size: 'Large', traits: 'Confident • Loyal' },
  Doberman: { count: 5, size: 'Large', traits: 'Alert • Intelligent' },
  'Shih Tzu': { count: 6, size: 'Small', traits: 'Affectionate • Cute' },
  Pomeranian: { count: 8, size: 'Small', traits: 'Lively • Smart' },
  'Great Dane': { count: 4, size: 'Giant', traits: 'Gentle • Friendly' },
  'Saint Bernard': { count: 3, size: 'Giant', traits: 'Calm • Protective' },
  Chihuahua: { count: 6, size: 'Small', traits: 'Lively • Alert' },
  'Border Collie': { count: 8, size: 'Medium', traits: 'Smart • Energetic' },
  'Cocker Spaniel': { count: 5, size: 'Medium', traits: 'Gentle • Playful' },
  Boxer: { count: 7, size: 'Large', traits: 'Playful • Active' },
  Dalmatian: { count: 4, size: 'Large', traits: 'Energetic • Outgoing' },
  'Indian Pariah': { count: 10, size: 'Medium', traits: 'Intelligent • Hardy' },
  'Belgian Malinois': { count: 6, size: 'Large', traits: 'Watchful • Hardworking' },
  Samoyed: { count: 5, size: 'Medium', traits: 'Friendly • Playful' },
};

const namesPool = [
  'Bruno', 'Max', 'Charlie', 'Cooper', 'Rocky', 'Buddy', 'Leo', 'Simba', 'Jack', 'Oscar',
  'Bella', 'Daisy', 'Luna', 'Molly', 'Coco', 'Lucy', 'Zara', 'Nala', 'Sasha', 'Nova',
  'Kira', 'Ghost', 'Snow', 'Wolf', 'Loki', 'Blue', 'Aurora', 'Sky', 'Elsa', 'Snoopy',
  'Rosie', 'Lily', 'Oreo', 'Mochi', 'Teddy', 'Lola', 'Ruby', 'Tyson', 'Zeus', 'Thor',
];

const agesPool = [
  '3 Months', '5 Months', '8 Months', '10 Months', '1 Year', '1.2 Years', '1.5 Years', '2 Years', '2.5 Years', '3 Years',
];

function generatePets() {
  const generated = [];
  let idCounter = 101;
  Object.entries(breedSpecs).forEach(([breed, spec]) => {
    for (let i = 0; i < spec.count; i++) {
      const name = namesPool[(i + breed.charCodeAt(0)) % namesPool.length];
      const gender = i % 2 === 0 ? 'Male' : 'Female';
      const age = agesPool[(i + breed.charCodeAt(1)) % agesPool.length];
      const price = i % 3 === 0 ? 0 : 15000 + i * 2000;
      const imagesList = breedImages[breed] || [
        'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=500&q=80',
      ];
      const img = imagesList[i % imagesList.length];
      generated.push({
        legacyId: `ADOPT-${idCounter++}`,
        name, type: 'Dog', breed, age, gender, price,
        distance: `${(1.2 + i * 0.3).toFixed(1)} km away`,
        weight: `${(8 + i * 2).toFixed(1)} kg`,
        location: 'Bangalore',
        vaccinated: i % 2 === 0,
        dewormed: i % 3 !== 0,
        neutered: i % 4 === 0,
        images: [img, ...imagesList.slice(0, 3).filter((x) => x !== img)],
        about: `${name} is a wonderful ${breed} representing the breed's standard qualities. Highly ${spec.traits.toLowerCase()}, great with families and searching for a warm home.`,
        traits: spec.traits.split(' • '),
        shelter: {
          name: i % 2 === 0 ? 'Happy Paws Shelter' : 'Pawsome Rescues',
          verified: true,
          image: i % 2 === 0
            ? 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=200&q=80'
            : 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=200&q=80',
        },
      });
    }
  });
  return generated;
}

const localBreedImg = {
  'Labrador Retriever': '/assets/breeds/labrador.png',
  'German Shepherd': '/assets/breeds/german_shepherd.png',
  'Golden Retriever': '/assets/breeds/golden_retriever.png',
  'Siberian Husky': '/assets/breeds/husky.png',
  Beagle: '/assets/breeds/beagle.png',
  Pug: '/assets/breeds/pug.png',
};

const MOCK_MARKETPLACE = [
  { id: 'm1', name: 'Muffin', species: 'Dog', breed: 'Samoyed', age: '3 Months', gender: 'Male', price: '45000', vaccinated: 'Fully Vaccinated', img: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=300&q=80', location: 'Delhi NCR', verification: true, cert: 'Verified Health Certificate Approved', seller: 'Aakash Sharma' },
  { id: 'm2', name: 'Simba', species: 'Cat', breed: 'Persian', age: '6 Months', gender: 'Female', price: '25000', vaccinated: 'Fully Vaccinated', img: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=300&q=80', location: 'Mumbai, Maharashtra', verification: true, cert: 'Feline Registry Certificate Validated', seller: 'Pooja Roy' },
  { id: 'm3', name: 'Kiwi', species: 'Bird', breed: 'Cockatiel', age: '1 Year', gender: 'Male', price: '6000', vaccinated: 'Not Vaccinated', img: 'https://images.unsplash.com/photo-1522276498395-ce8f5bc14013?auto=format&fit=crop&w=300&q=80', location: 'Bangalore, Karnataka', verification: false, cert: 'General Breeder Record', seller: 'Rohan Sen' },
  { id: 'm4', name: 'Bella', species: 'Rabbit', breed: 'Angora', age: '8 Months', gender: 'Female', price: '3000', vaccinated: 'Fully Vaccinated', img: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=300&q=80', location: 'Pune, Maharashtra', verification: true, cert: 'Vaccination Slip Attached', seller: 'Nisha Mehta' },
];

export async function seedAdoption() {
  const pets = generatePets();
  for (const p of pets) {
    await AdoptionListing.updateOne(
      { legacyId: p.legacyId },
      { $set: p, $setOnInsert: { status: 'Available' } },
      { upsert: true }
    );
  }

  let i = 0;
  for (const [name, spec] of Object.entries(breedSpecs)) {
    await AdoptionBreed.updateOne(
      { name },
      {
        $set: {
          name,
          image: localBreedImg[name] || (breedImages[name] || [])[0] || '',
          size: spec.size,
          traits: spec.traits,
          sort: i++,
        },
      },
      { upsert: true }
    );
  }

  for (const m of MOCK_MARKETPLACE) {
    await MarketplaceListing.updateOne(
      { legacyId: m.id },
      {
        $set: {
          legacyId: m.id, name: m.name, species: m.species, breed: m.breed, age: m.age,
          gender: m.gender, price: m.price, vaccinated: m.vaccinated, img: m.img,
          location: m.location, verification: m.verification, cert: m.cert, seller: m.seller,
        },
        $setOnInsert: { status: 'active' },
      },
      { upsert: true }
    );
  }

  return `${pets.length} adoption listings, ${Object.keys(breedSpecs).length} breed cards, ${MOCK_MARKETPLACE.length} marketplace listings upserted`;
}
