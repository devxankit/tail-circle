import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { createOrderSchema, verifySchema } from './payment.validation.js';
import { createOrder, verify } from './payment.controller.js';

const router = Router();

// NOTE: the webhook is NOT here — it needs the raw body, so it is mounted
// directly in app.js before the JSON parser.
router.post('/create-order', authenticate, validate(createOrderSchema), createOrder);
router.post('/verify', authenticate, validate(verifySchema), verify);

export default router;
