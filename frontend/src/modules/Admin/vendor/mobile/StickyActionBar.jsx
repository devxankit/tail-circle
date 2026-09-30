import { useContext, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../../user/utils/cn';
import { VendorShellContext } from './VendorShellContext';

/**
 * The bar docked to the bottom of a form or detail screen, holding its
 * primary action (Save, Next, Confirm). While it shows, the bottom nav hides
 * and the content pads itself so nothing sits underneath the bar.
 *
 * `aboveNav` keeps the nav on a tab-root screen and docks the bar on top of
 * it instead (Payouts' Request payout).
 *
 * Portalled into the shell's bottom slot, outside the scrolling (and
 * animating) content, so it never jumps during a page transition.
 */
export function StickyActionBar({ children, className, note, aboveNav = false }) {
  const shell = useContext(VendorShellContext);
  const id = useId();
  const ref = useRef(null);

  const register = shell?.registerSticky;
  const unregister = shell?.unregisterSticky;

  useEffect(() => {
    if (!register) return undefined;
    const el = ref.current;
    const report = () => register(id, el?.offsetHeight || 0, aboveNav);
    report();
    let ro;
    if (el && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(report);
      ro.observe(el);
    }
    return () => {
      ro?.disconnect();
      unregister(id);
    };
  }, [register, unregister, id, aboveNav]);

  const bar = (
    <div
      ref={ref}
      className={cn(
        'bg-white/95 backdrop-blur-md border-t border-border-light px-4 pt-3 shadow-[0_-4px_15px_rgba(0,0,0,0.05)]',
        !shell?.bottomSlot && 'fixed bottom-0 inset-x-0 z-40',
        className
      )}
      style={{ paddingBottom: shell?.bottomSlot && shell?.navShown ? '12px' : 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
    >
      {note && <div className="mb-2 text-center">{note}</div>}
      <div className="flex gap-2 items-center">{children}</div>
    </div>
  );

  return shell?.bottomSlot ? createPortal(bar, shell.bottomSlot) : bar;
}

/** The full-width primary button that usually fills the bar. */
export function PrimaryButton({ children, className, tone = 'primary', icon: Icon, loading, ...rest }) {
  const tones = {
    primary: 'bg-primary-main text-white shadow-lg shadow-primary-main/25',
    teal: 'bg-accent-teal text-white shadow-lg shadow-accent-teal/25',
    dark: 'bg-text-primary text-white',
    danger: 'bg-error text-white',
    soft: 'bg-bg-secondary text-text-primary',
    outline: 'bg-white border border-border-light text-text-primary',
  };
  return (
    <button
      type="button"
      className={cn(
        'flex-1 h-12 rounded-2xl text-[15px] font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99] transition',
        tones[tone] || tones.primary,
        className
      )}
      {...rest}
    >
      {loading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : Icon ? <Icon size={18} /> : null}
      {children}
    </button>
  );
}

export default StickyActionBar;
