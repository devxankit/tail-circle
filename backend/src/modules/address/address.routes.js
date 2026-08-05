import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { createAddressSchema, updateAddressSchema } from './address.validation.js';
import { list, create, update, remove } from './address.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', list);
router.post('/', validate(createAddressSchema), create);
router.patch('/:id', validate(updateAddressSchema), update);
router.delete('/:id', remove);

export default router;
