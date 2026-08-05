import { api, setTokens, clearTokens, isLoggedIn } from './api';
import { disconnectSocket } from './socket';

/**
 * Auth flows shared by Login/Signup and the profile screens.
 * The current user object is cached in localStorage under `tc_user`
 * and refreshed from GET /users/me after profile edits.
 */

const USER_KEY = 'tc_user';

export { isLoggedIn };

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY)) || null;
  } catch {
    return null;
  }
}

export function storeUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/** Step 1 — send the OTP. Throws ApiClientError (429 carries cooldown message). */
export async function requestOtp(phone) {
  return api.post('/auth/request-otp', { phone });
}

/**
 * Step 2 — verify the OTP. Stores tokens + user and returns
 * `{ user, isNewUser }` so the screen can route to onboarding or home.
 */
export async function verifyOtp(phone, code) {
  const { data } = await api.post('/auth/verify-otp', { phone, code });
  setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  storeUser(data.user);
  return { user: data.user, isNewUser: data.isNewUser };
}

/** Re-fetch the profile (after edits) and refresh the cache. */
export async function fetchMe() {
  const { data } = await api.get('/users/me');
  storeUser(data);
  return data;
}

export async function logout() {
  const refreshToken = localStorage.getItem('tc_refresh_token');
  await api.post('/auth/logout', { refreshToken }).catch(() => {});
  clearTokens();
  localStorage.removeItem(USER_KEY);
  disconnectSocket();
}
