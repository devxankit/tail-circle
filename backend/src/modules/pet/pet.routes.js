import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  createPetSchema,
  updatePetSchema,
  addVaccinationSchema,
} from './pet.validation.js';
import {
  listPets,
  createPet,
  getPet,
  updatePet,
  deletePet,
  listVaccinations,
  addVaccination,
} from './pet.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', listPets);
router.post('/', validate(createPetSchema), createPet);
router.get('/:id', getPet);
router.patch('/:id', validate(updatePetSchema), updatePet);
router.delete('/:id', deletePet);
router.get('/:id/vaccinations', listVaccinations);
router.post('/:id/vaccinations', validate(addVaccinationSchema), addVaccination);

export default router;
