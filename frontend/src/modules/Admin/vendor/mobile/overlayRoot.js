/**
 * The node sheets, sticky bars and dialogs are portalled into.
 *
 * It sits inside the phone column (see MobileWrapper's vendor frame) but
 * outside the shell's scroll container, so `position: fixed` resolves against
 * the 430px column — not the desktop window — and a wheel or drag on a sheet's
 * backdrop cannot scroll the page underneath it.
 *
 * Falls back to rendering in place when the frame is not mounted.
 */
export const OVERLAY_ROOT_ID = 'vendor-overlay-root';

export function getOverlayRoot() {
  if (typeof document === 'undefined') return null;
  return document.getElementById(OVERLAY_ROOT_ID);
}
