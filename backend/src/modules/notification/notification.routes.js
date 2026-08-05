import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import { listForUser, unreadCount, markRead, markAllRead } from '../../services/notify.js';

const router = Router();
router.use(authenticate);

/** GET /notifications — my notifications (newest first) + unread count. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [items, unread] = await Promise.all([
      listForUser(req.user.id),
      unreadCount(req.user.id),
    ]);
    sendSuccess(res, { data: { items, unread } });
  })
);

/** GET /notifications/unread-count — badge count only (cheap poll/refresh). */
router.get(
  '/unread-count',
  asyncHandler(async (req, res) => {
    sendSuccess(res, { data: { unread: await unreadCount(req.user.id) } });
  })
);

/** POST /notifications/read-all — mark every notification read. */
router.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    await markAllRead(req.user.id);
    sendSuccess(res, { message: 'All notifications marked read' });
  })
);

/** POST /notifications/:id/read — mark one read (on tap). */
router.post(
  '/:id/read',
  asyncHandler(async (req, res) => {
    await markRead(req.user.id, req.params.id);
    sendSuccess(res, { message: 'Marked read' });
  })
);

export default router;
