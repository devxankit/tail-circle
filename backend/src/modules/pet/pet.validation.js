import { z } from 'zod';
import { PET_TYPES } from './pet.model.js';

const url = z.string().max(2000000);

const petFields = {
  name: z.string().trim().min(1).max(40),
  type: z.enum(PET_TYPES),
  typeText: z.string().trim().max(40),
  breed: z.string().trim().min(1).max(60),
  gender: z.enum(['male', 'female', 'unknown']),
  dob: z.coerce.date().max(new Date()),
  ageText: z.string().trim().max(20),
  weightKg: z.coerce.number().min(0).max(200),
  avatarUrl: url,
  photos: z.array(url).max(6),
  bio: z.string().trim().max(500),
  temperament: z.array(z.string().trim().max(30)).max(10),
  diet: z.string().trim().max(100),
  mood: z.string().trim().max(40),
  health: z
    .object({
      vaccinated: z.boolean().optional(),
      dewormed: z.boolean().optional(),
      neutered: z.boolean().optional(),
      allergies: z.array(z.string().trim().max(60)).max(20).optional(),
      conditions: z.array(z.string().trim().max(60)).max(20).optional(),
      lastVetVisit: z.coerce.date().max(new Date()).optional(),
    })
    .strict(),
  isMatchProfile: z.boolean(),
  activityLevel: z.enum(['low', 'medium', 'high']),
  size: z.enum(['small', 'medium', 'large']),
};

// Staged onboarding: only the name is mandatory to create.
export const createPetSchema = z
  .object({ ...petFields, name: petFields.name })
  .partial()
  .required({ name: true })
  .strict();

export const updatePetSchema = z.object(petFields).partial().strict();

export const addVaccinationSchema = z.object({
  vaccine: z.string().trim().min(2).max(80),
  date: z.coerce.date().max(new Date()),
  nextDueDate: z.coerce.date().optional(),
  docUrl: url.optional(),
});
