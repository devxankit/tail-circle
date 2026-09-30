import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft } from 'lucide-react';
import { cn } from '../../../user/utils/cn';
import { getOverlayRoot } from './overlayRoot';

/**
 * The partner app's sheet: grabber, title, close, a body that scrolls on its
 * own, and an optional footer that sits on the safe area.
 *
 * `fullScreen` turns it into a full-height page-style sheet (a Back chevron
 * instead of the grabber) for forms too long for a half sheet.
 *
 * Uses the app's `.tc-sheet-*` keyframes; the `animate-in` utilities some
 * older screens reach for are not installed here and do nothing.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  fullScreen = false,
  className,
  bodyClassName,
  hideClose = false,
  zIndex = 80,
}) {
  const panelRef = useRef(null);

  // Escape closes, like the backdrop does.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Lock whatever is scrolling underneath. The shell's content pane is the
  // scroller in the partner app, not the body, so lock both.
  useEffect(() => {
    if (!open) return undefined;
    const panes = [...document.querySelectorAll('[data-vendor-scroll]')];
    const prevPanes = panes.map((el) => el.style.overflowY);
    const prevBody = document.body.style.overflow;
    panes.forEach((el) => { el.style.overflowY = 'hidden'; });
    document.body.style.overflow = 'hidden';
    return () => {
      panes.forEach((el, i) => { el.style.overflowY = prevPanes[i] || ''; });
      document.body.style.overflow = prevBody;
    };
  }, [open]);

  if (!open) return null;

  const sheet = (
    <div className="fixed inset-0 flex items-end justify-center" style={{ zIndex }} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="tc-sheet-backdrop absolute inset-0 bg-black/50 backdrop-blur-[2px] cursor-default"
      />

      <div
        ref={panelRef}
        className={cn(
          'tc-sheet-panel relative w-full bg-white shadow-2xl flex flex-col',
          fullScreen ? 'h-full' : 'rounded-t-[28px] max-h-[92%]',
          className
        )}
        style={fullScreen ? { paddingTop: 'env(safe-area-inset-top, 0px)' } : undefined}
      >
        {fullScreen ? (
          <div className="shrink-0 flex items-center gap-2 px-2 h-14 border-b border-border-light">
            <button
              type="button"
              onClick={onClose}
              aria-label="Back"
              className="w-11 h-11 rounded-full flex items-center justify-center text-text-primary active:bg-bg-secondary"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-text-primary truncate leading-tight">{title}</h2>
              {subtitle && <p className="text-xs text-text-secondary truncate">{subtitle}</p>}
            </div>
          </div>
        ) : (
          <div className="shrink-0 relative pt-3 px-5">
            <div className="mx-auto h-1.5 w-10 rounded-full bg-gray-200" />
            {(title || !hideClose) && (
              <div className="flex items-start gap-3 pt-3 pb-3">
                <div className="min-w-0 flex-1">
                  {title && <h2 className="text-lg font-bold text-text-primary leading-tight">{title}</h2>}
                  {subtitle && <p className="text-xs text-text-secondary mt-1">{subtitle}</p>}
                </div>
                {!hideClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="-mr-2 -mt-1 w-11 h-11 rounded-full flex items-center justify-center text-text-secondary active:bg-bg-secondary shrink-0"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div
          className={cn(
            'flex-1 min-h-0 overflow-y-auto overscroll-contain hide-scrollbar px-5',
            fullScreen ? 'pt-4' : '',
            footer ? 'pb-4' : '',
            bodyClassName
          )}
          style={footer ? undefined : { paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))' }}
        >
          {children}
        </div>

        {footer && (
          <div
            className="shrink-0 border-t border-border-light bg-white px-5 pt-3"
            style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  const root = getOverlayRoot();
  return root ? createPortal(sheet, root) : sheet;
}

export default BottomSheet;
