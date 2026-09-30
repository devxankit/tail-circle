import { useCallback, useContext, useEffect, useState } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { cn } from '../../../user/utils/cn';
import { ToastContext, VENDOR_TOAST_EVENT } from './toastContext';

/**
 * One toast host for the whole partner app: a centred pill that floats above
 * the bottom nav (or the sticky action bar). It replaces the bottom-right
 * toasts each panel grew on its own.
 *
 * The API is Shop's original one — `addToast({ message, type, duration })` —
 * so the screens that already call it keep their calls (hooks in
 * toastContext.js). `ShopVendor/components/Toast.jsx` re-exports both under
 * their old names.
 */

const ICONS = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
};

const TONE = {
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
  info: 'text-accent-teal',
};

export function VendorToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ message, type = 'success', duration = 3500 } = {}) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Toasts raised outside the provider (see emitVendorToast).
  useEffect(() => {
    const onToast = (e) => addToast(e.detail || {});
    window.addEventListener(VENDOR_TOAST_EVENT, onToast);
    return () => window.removeEventListener(VENDOR_TOAST_EVENT, onToast);
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, toasts }}>
      {children}
    </ToastContext.Provider>
  );
}

/**
 * Where the toasts render. The shell places it; `bottom` is the offset above
 * whatever is docked at the bottom of the screen.
 */
export function VendorToastHost({ bottom = 'calc(96px + env(safe-area-inset-bottom, 0px))' }) {
  const ctx = useContext(ToastContext);
  if (!ctx || !ctx.toasts.length) return null;
  return (
    <div
      className="absolute left-0 right-0 z-[90] flex flex-col items-center gap-2 px-4 pointer-events-none"
      style={{ bottom }}
    >
      {ctx.toasts.map((t) => <ToastPill key={t.id} toast={t} onRemove={ctx.removeToast} />)}
    </div>
  );
}

function ToastPill({ toast, onRemove }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = setTimeout(() => setVisible(true), 10);
    const hide = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(toast.id), 400);
    }, toast.duration);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, [toast.id, toast.duration, onRemove]);

  const Icon = ICONS[toast.type] || Info;

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto max-w-full flex items-center gap-2.5 bg-text-primary text-white rounded-full shadow-xl pl-4 pr-2 py-2',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      )}
      style={{ transition: 'opacity 0.3s ease, transform 0.3s ease' }}
    >
      <Icon size={18} className={cn('shrink-0', TONE[toast.type])} />
      <p className="text-[13px] font-semibold leading-snug flex-1 min-w-0">{toast.message}</p>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => { setVisible(false); setTimeout(() => onRemove(toast.id), 400); }}
        className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}

/* Shop's original provider name. */
export const ToastProvider = VendorToastProvider;
