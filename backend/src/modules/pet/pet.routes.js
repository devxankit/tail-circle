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

import { BEHAVIOUR_OPTIONS } from '../social/behaviour.service.js';
import { sendSuccess } from '../../utils/ApiResponse.js';

const router = Router();

router.use(authenticate);

/*
 * GET /pets/behaviours — the behaviour chips the profile screen offers.
 *
 * Served from the match engine's own taxonomy rather than duplicated in the
 * client: a trait the UI offers but the taxonomy does not know scores as
 * unknown and quietly weakens every match it appears in, and two hand-edited
 * lists drift the moment one of them is touched. Declared above `/:id` so the
 * param route does not swallow it.
 */
router.get('/behaviours', (_req, res) => sendSuccess(res, { data: BEHAVIOUR_OPTIONS }));

router.get('/', listPets);
router.post('/', validate(createPetSchema), createPet);
router.get('/:id', getPet);
router.patch('/:id', validate(updatePetSchema), updatePet);
router.delete('/:id', deletePet);
router.get('/:id/vaccinations', listVaccinations);
router.post('/:id/vaccinations', validate(addVaccinationSchema), addVaccination);

export default router;
