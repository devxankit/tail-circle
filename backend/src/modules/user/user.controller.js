import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { registerDeviceToken, unregisterDeviceToken } from '../../services/fcm.service.js';
import { User } from './user.model.js';
import { Pet } from '../pet/pet.model.js';
import { Booking } from '../booking/booking.model.js';
import { Order } from '../order/order.model.js';
import { Match, Post } from '../social/social.models.js';
import { SavedItem } from '../savedItem/savedItem.routes.js';

/** GET /users/me — current authenticated user. */
export const getMe = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: req.user });
});

/** GET /users/me/stats — live profile engagement statistics. */
export const getMyStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userName = req.user.name;
  const [petsCount, bookingsCount, ordersCount, matchesCount, savesCount, postsCount] = await Promise.all([
    Pet.countDocuments({ ownerId: userId, deletedAt: null }),
    Booking.countDocuments({ userId }),
    Order.countDocuments({ userId }),
    Match.countDocuments({ userId }),
    SavedItem.countDocuments({ userId }),
    Post.countDocuments({
      $or: [{ authorId: userId }, ...(userName ? [{ authorName: userName }] : [])],
      deletedAt: null,
    }),
  ]);

  const points = (req.user.points || 0) + (petsCount * 100) + (bookingsCount * 50) + (ordersCount * 25) + (postsCount * 15);
  const level = Math.floor(points / 100) + 1;

  sendSuccess(res, {
    data: {
      points,
      level,
      matchesCount,
      savesCount,
      petsCount,
      bookingsCount,
      ordersCount,
      postsCount,
    },
  });
});

/** PATCH /users/me — update own profile (fields whitelisted by zod schema). */
export const updateMe = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.user.id, req.body, {
    new: true,
    runValidators: true,
  });
  sendSuccess(res, { message: 'Profile updated', data: user });
});

/** POST /users/me/fcm-token — register this device for push. */
export const addFcmToken = asyncHandler(async (req, res) => {
  await registerDeviceToken(req.user.id, req.body.token, req.body.platform);
  sendSuccess(res, { message: 'Device registered for notifications' });
});

/** DELETE /users/me/fcm-token — remove device on logout. */
export const removeFcmToken = asyncHandler(async (req, res) => {
  await unregisterDeviceToken(req.body.token);
  sendSuccess(res, { message: 'Device unregistered' });
});

/** GET /users/:id — admin only. */
export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  sendSuccess(res, { data: user });
});
