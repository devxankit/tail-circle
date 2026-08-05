import { api } from './api';
import { payWithRazorpay } from './payments';

/**
 * Real adoption API — same catalog exports the old `mockAdoptApi.js` had,
 * plus the application pipeline. `adoptionFee` is populated from the listing
 * price (the mock referenced it but never set it).
 */

function toLegacyPet(p) {
  return {
    id: p.legacyId || p._id,
    _id: p._id,
    name: p.name,
    type: p.type,
    breed: p.breed,
    age: p.age,
    gender: p.gender,
    price: p.price,
    adoptionFee: p.price,
    distance: p.distance,
    weight: p.weight,
    location: p.location,
    status: p.status,
    vaccinated: p.vaccinated,
    dewormed: p.dewormed,
    neutered: p.neutered,
    images: p.images || [],
    about: p.about,
    traits: p.traits || [],
    shelter: p.shelter || {},
  };
}

export async function getPets() {
  const { data } = await api.get('/adoption/pets');
  return data.map(toLegacyPet);
}

export async function getPetById(id) {
  const { data } = await api.get(`/adoption/pets/${id}`);
  return toLegacyPet(data);
}

export async function getRecommendedPets() {
  const pets = await getPets();
  return pets.slice(0, 4);
}

export async function getPetsByBreed(breedName) {
  const { data } = await api.get('/adoption/pets', { params: { breed: breedName } });
  return data.map(toLegacyPet);
}

/** Breed rail cards with live availability counts (async now). */
export async function getBreedsList() {
  const { data } = await api.get('/adoption/breeds');
  return data;
}

/* ── user pet listing management ─────────────── */

export async function createAdoptionListing(listingData) {
  const { data } = await api.post('/adoption/pets', listingData);
  return toLegacyPet(data);
}

export async function getMyAdoptionListings() {
  const { data } = await api.get('/adoption/my-listings');
  return data.map(toLegacyPet);
}

export async function updateAdoptionListing(id, updates) {
  const { data } = await api.patch(`/adoption/my-listings/${id}`, updates);
  return toLegacyPet(data);
}

export async function deleteAdoptionListing(id) {
  const { data } = await api.delete(`/adoption/my-listings/${id}`);
  return data;
}

/* ── application pipeline ─────────────────────────────── */

let activeApplication = null; // survives step navigation within the session

export async function applyForAdoption(listingId, form) {
  const { data } = await api.post('/adoption/applications', { listingId: String(listingId), form });
  activeApplication = data;
  return data;
}

async function resolveApplication(listingLegacyId) {
  if (activeApplication) return activeApplication;
  const { data } = await api.get('/adoption/applications');
  activeApplication =
    data.find(
      (a) =>
        a.listingId?.legacyId === String(listingLegacyId) &&
        !['rejected', 'cancelled', 'completed'].includes(a.status)
    ) || null;
  if (!activeApplication) throw new Error('Start the application first');
  return activeApplication;
}

export async function advanceApplication(listingLegacyId, step, opts = {}) {
  const application = await resolveApplication(listingLegacyId);
  const { data } = await api.post(`/adoption/applications/${application._id}/advance`, {
    step,
    ...opts,
  });
  activeApplication = data;
  return data;
}

/** Pay the adoption fee (Razorpay sheet for paid pets, instant for free). */
export async function payAdoptionFee(listingLegacyId, petName) {
  const application = await resolveApplication(listingLegacyId);
  const { data } = await api.post(`/adoption/applications/${application._id}/pay-fee`);
  if (data.razorpay) {
    await payWithRazorpay(data.razorpay, { description: `Adoption fee — ${petName || 'pet'}` });
  }
  activeApplication = null;
  return data.application;
}

/** MyAdoptions rows in the legacy display shape. */
export async function getMyAdoptions() {
  const { data } = await api.get('/adoption/applications');
  return data.map((a) => ({
    id: a.applicationNo,
    _id: a._id,
    petName: a.listingId?.name || 'Pet',
    breed: a.listingId?.breed || '',
    age: a.listingId?.age || '',
    gender: a.listingId?.gender || '',
    date: new Date(a.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    status: a.status === 'completed' ? 'Completed' : ['rejected', 'cancelled'].includes(a.status) ? 'Closed' : 'Ongoing',
    stage: a.status,
    shelter: a.listingId?.shelter?.name || '',
    image: a.listingId?.images?.[0] || '',
  }));
}
