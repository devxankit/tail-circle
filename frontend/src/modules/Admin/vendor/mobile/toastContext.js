import { createContext, useContext } from 'react';

/**
 * The partner app's toast API (the host lives in VendorToast.jsx).
 *
 * It is Shop's original one — `addToast({ message, type, duration })` — so the
 * screens that already call it keep their calls; `useToast` is the old name.
 * Outside a provider it is a silent no-op rather than a crash.
 */
export const ToastContext = createContext(null);

const NOOP = { addToast: () => null, removeToast: () => {} };

export function useVendorToast() {
  const ctx = useContext(ToastContext);
  return ctx ? { addToast: ctx.addToast, removeToast: ctx.removeToast } : NOOP;
}

export const useToast = useVendorToast;

/*
 * A toast from outside the provider. The data contexts (ShopVendorProvider,
 * MemorialProviderProvider, …) sit above the partner shell, so they cannot
 * reach its toast context; a failed save there would otherwise be silent.
 * They fire this event and the shell's toast host shows it.
 */
export const VENDOR_TOAST_EVENT = 'tc:vendor-toast';

export function emitVendorToast(toast) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(VENDOR_TOAST_EVENT, { detail: toast }));
}

/** The server's message for a failed request, or `fallback`. */
export function errorMessage(err, fallback = 'Something went wrong. Please try again.') {
  return err?.response?.data?.message || err?.data?.message || (typeof err?.message === 'string' && err.message) || fallback;
}

/** Toast a failed save from a context: the reason, or `fallback`. */
export function reportVendorError(err, fallback) {
  emitVendorToast({ message: errorMessage(err, fallback), type: 'error', duration: 5000 });
}
