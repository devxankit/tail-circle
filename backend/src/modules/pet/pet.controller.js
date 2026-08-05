import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { Pet } from './pet.model.js';
import { PetVaccination } from './petVaccination.model.js';

const MAX_PETS = 20;
const MAX_PHOTOS = 6;

async function getOwnedPet(userId, petId) {
  const pet = await Pet.findOne({ _id: petId, ownerId: userId, deletedAt: null });
  if (!pet) throw ApiError.notFound('Pet not found');
  return pet;
}

/** GET /pets — my pets. */
export const listPets = asyncHandler(async (req, res) => {
  const pets = await Pet.find({ ownerId: req.user.id, deletedAt: null }).sort({ createdAt: -1 });
  sendSuccess(res, { data: pets });
});

/** POST /pets — add a pet (onboarding step 1 / AddPet screen). */
export const createPet = asyncHandler(async (req, res) => {
  const count = await Pet.countDocuments({ ownerId: req.user.id, deletedAt: null });
  if (count >= MAX_PETS) throw ApiError.badRequest(`You can have up to ${MAX_PETS} pets`);

  const pet = await Pet.create({ ...req.body, ownerId: req.user.id });
  sendSuccess(res, { statusCode: 201, message: 'Pet added', data: pet });
});

/** GET /pets/:id */
export const getPet = asyncHandler(async (req, res) => {
  const pet = await getOwnedPet(req.user.id, req.params.id);
  sendSuccess(res, { data: pet });
});

/** PATCH /pets/:id — onboarding steps 2–3 and edits. */
export const updatePet = asyncHandler(async (req, res) => {
  const pet = await getOwnedPet(req.user.id, req.params.id);

  if (req.body.photos && req.body.photos.length > MAX_PHOTOS) {
    throw ApiError.badRequest(`A pet can have up to ${MAX_PHOTOS} photos`);
  }

  Object.assign(pet, req.body);
  // First photo doubles as the avatar unless one is set explicitly.
  if (!pet.avatarUrl && pet.photos.length) pet.avatarUrl = pet.photos[0];
  await pet.save();
  sendSuccess(res, { message: 'Pet updated', data: pet });
});

/** DELETE /pets/:id — soft delete. */
export const deletePet = asyncHandler(async (req, res) => {
  const pet = await getOwnedPet(req.user.id, req.params.id);
  pet.deletedAt = new Date();
  await pet.save();
  sendSuccess(res, { message: 'Pet removed' });
});

/** GET /pets/:id/vaccinations */
export const listVaccinations = asyncHandler(async (req, res) => {
  await getOwnedPet(req.user.id, req.params.id);
  const records = await PetVaccination.find({ petId: req.params.id }).sort({ date: -1 });
  sendSuccess(res, { data: records });
});

/** POST /pets/:id/vaccinations */
export const addVaccination = asyncHandler(async (req, res) => {
  const pet = await getOwnedPet(req.user.id, req.params.id);
  const record = await PetVaccination.create({ ...req.body, petId: pet.id });
  // Keep the summary flag in sync for quick display.
  if (!pet.health.vaccinated) {
    pet.health.vaccinated = true;
    await pet.save();
  }
  sendSuccess(res, { statusCode: 201, message: 'Vaccination recorded', data: record });
});
