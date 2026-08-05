import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { updateMeSchema, fcmTokenSchema, removeFcmTokenSchema } from './user.validation.js';
import {
  getMe,
  getMyStats,
  updateMe,
  addFcmToken,
  removeFcmToken,
  getUserById,
} from './user.controller.js';

const router = Router();

router.use(authenticate);

router.get('/me', getMe);
router.get('/me/stats', getMyStats);
router.patch('/me', validate(updateMeSchema), updateMe);
router.post('/me/fcm-token', validate(fcmTokenSchema), addFcmToken);
router.delete('/me/fcm-token', validate(removeFcmTokenSchema), removeFcmToken);
router.get('/:id', authorize('admin'), getUserById);

export default router;
