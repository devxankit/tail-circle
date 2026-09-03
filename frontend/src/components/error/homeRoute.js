import { isLoggedIn } from '../../services/api';

/**
 * Where "home" is for a dead end at `pathname`.
 *
 * Errors and 404s happen in all three portals, and a partner who hits one
 * should not be dropped into the pet-owner app — so the way out is chosen from
 * the URL that failed rather than from a single global default.
 */
export function homeFor(pathname = '') {
  if (pathname.startsWith('/vendor')) return '/vendor/login';
  if (pathname.startsWith('/admin')) return '/admin/login';
  return isLoggedIn() ? '/app/home' : '/splash';
}
