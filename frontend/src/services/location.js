import { api } from './api';
import { storeUser, getStoredUser } from './auth';
import { reverseGeocodeCoords } from './googleMaps';

/**
 * The user's home location — one place that owns it.
 *
 * Location used to be captured only by the match deck, into `sessionStorage`,
 * on a screen a new user reaches after onboarding. Onboarding read that key to
 * place the pet it was creating, so it was always empty and every pet was
 * created with no location at all. Nothing else could write one either: the
 * profile API rejected the field outright.
 *
 * So it lives here now, saved to the account, and both places that create a
 * pet ask this module rather than a cache another screen might have filled.
 */

/** A place, as the pickers and the API both understand it. */
export const toPlace = (raw) =>
  raw && raw.lat != null && raw.lng != null
    ? {
        name: raw.name || raw.city || 'Current Location',
        state: raw.state || '',
        lat: Number(raw.lat),
        lng: Number(raw.lng),
      }
    : null;

/** The saved account location, from the cached user. */
export function getSavedLocation() {
  const user = getStoredUser();
  return toPlace({ ...user?.location, name: user?.city, state: user?.state });
}

/**
 * Persist a place to the account.
 *
 * Kept quiet on failure by the callers that use it as a side effect: a pet
 * being created should not fail because the account's city could not be
 * updated. The pet carries its own copy regardless.
 */
export async function saveMyLocation(place) {
  const p = toPlace(place);
  if (!p) return null;
  const { data } = await api.patch('/users/me', {
    city: p.name,
    ...(p.state ? { state: p.state } : {}),
    location: { lat: p.lat, lng: p.lng },
  });
  storeUser(data);
  return data;
}

/**
 * Ask the browser where we are, and name it.
 *
 * Rejects rather than resolving to a default. A caller that wants to fall back
 * to a hand-picked city should do that visibly, not be handed a guess.
 */
export function detectLocation({ timeout = 8000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('This browser cannot share your location.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Math.round(pos.coords.latitude * 10000) / 10000;
        const lng = Math.round(pos.coords.longitude * 10000) / 10000;
        try {
          resolve(toPlace(await reverseGeocodeCoords(lat, lng)));
        } catch {
          // Coordinates without a name are still exact, which is the part that
          // matters for distance. The label can stay generic.
          resolve({ name: 'Current Location', state: '', lat, lng });
        }
      },
      (err) => {
        reject(
          new Error(
            err?.code === 1
              ? 'Location permission denied. You can pick your city instead.'
              : 'Could not get your location. You can pick your city instead.'
          )
        );
      },
      { timeout, enableHighAccuracy: true }
    );
  });
}
