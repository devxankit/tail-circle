import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import * as authService from './auth.service.js';
import { unregisterDeviceToken } from '../../services/fcm.service.js';

/** POST /auth/request-otp */
export const requestOtp = asyncHandler(async (req, res) => {
  const result = await authService.requestOtp(req.body.phone);
  sendSuccess(res, { message: 'OTP sent', data: result });
});

/** POST /auth/verify-otp */
export const verifyOtp = asyncHandler(async (req, res) => {
  const { user, tokens, isNewUser } = await authService.verifyOtp(
    req.body.phone,
    req.body.code
  );
  sendSuccess(res, {
    statusCode: isNewUser ? 201 : 200,
    message: isNewUser ? 'Account created' : 'Logged in',
    data: { user, ...tokens, isNewUser },
  });
});

/** POST /auth/refresh */
export const refresh = asyncHandler(async (req, res) => {
  const { user, tokens } = await authService.refreshTokens(req.body.refreshToken);
  sendSuccess(res, { message: 'Token refreshed', data: { user, ...tokens } });
});

/**
 * POST /auth/logout — revokes the refresh token server-side (and the FCM
 * device token if the client sends one); client discards both tokens.
 */
export const logout = asyncHandler(async (req, res) => {
  await authService.revokeRefreshToken(req.body?.refreshToken);
  if (req.body?.fcmToken) await unregisterDeviceToken(req.body.fcmToken);
  sendSuccess(res, { message: 'Logged out' });
});

