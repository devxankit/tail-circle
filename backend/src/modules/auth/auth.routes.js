import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { authLimiter } from '../../middleware/rateLimiter.js';
import {
  requestOtpSchema,
  verifyOtpSchema,
  refreshSchema,
} from './auth.validation.js';
import {
  requestOtp,
  verifyOtp,
  refresh,
  logout,
} from './auth.controller.js';

const router = Router();

router.post('/request-otp', authLimiter, validate(requestOtpSchema), requestOtp);
router.post('/verify-otp', authLimiter, validate(verifyOtpSchema), verifyOtp);
router.post('/refresh', validate(refreshSchema), refresh);
router.post('/logout', logout);

export default router;
