import { api } from './api';

/**
 * Pet + breed helpers shared by onboarding, profile and every booking flow's
 * pet picker. Replaces the old `tailcircle_pets` / `tailcircle_breeds`
 * localStorage stores.
 */

export async function fetchMyPets() {
  const { data } = await api.get('/pets');
  return data;
}

export async function createPet(fields) {
  const { data } = await api.post('/pets', fields);
  return data;
}

export async function updatePet(petId, fields) {
  const { data } = await api.patch(`/pets/${petId}`, fields);
  return data;
}

export async function deletePet(petId) {
  await api.delete(`/pets/${petId}`);
}

export async function fetchBreeds(petType) {
  const { data } = await api.get('/breeds', { params: petType ? { petType } : undefined });
  return data;
}

/** Upload image files → array of Cloudinary URLs. */
export async function uploadPetPhotos(files, folder = 'pets') {
  if (!files.length) return [];
  const form = new FormData();
  files.forEach((f) => form.append('files', f));
  form.append('folder', folder);
  const { data } = await api.post('/uploads/files', form);
  return data.map((a) => a.url || a.secure_url);
}

/* ── display helpers (UI shows "2 Years", "8.4 Kg" style strings) ── */

export function petAgeText(pet) {
  if (pet.ageText) return pet.ageText;
  if (!pet.dob) return '';
  const years = (Date.now() - new Date(pet.dob).getTime()) / (365.25 * 24 * 3600 * 1000);
  return years >= 1 ? `${Math.round(years * 10) / 10} Years` : `${Math.round(years * 12)} Months`;
}

export function petVaccinatedText(pet) {
  return pet.health?.vaccinated ? 'Fully Vaccinated' : 'Not Vaccinated';
}

/** Map an API pet to the shape legacy screens expect (id/image/age/weight…). */
export function toLegacyPet(pet) {
  return {
    id: pet._id,
    _id: pet._id,
    name: pet.name,
    breed: pet.breed,
    species: pet.type,
    gender: pet.gender,
    image: pet.avatarUrl || pet.photos?.[0] || null,
    mediaGallery: pet.photos || [],
    age: petAgeText(pet) || '—',
    weight: pet.weightKg ? `${pet.weightKg} Kg` : '—',
    vaccinated: petVaccinatedText(pet),
    neutered: pet.health?.neutered ? 'Yes' : 'No',
    mood: pet.mood || 'Happy 😊',
    diet: pet.diet || 'General Diet Plan',
    bio: pet.bio,
    behaviours: pet.temperament || [],
  };
}
