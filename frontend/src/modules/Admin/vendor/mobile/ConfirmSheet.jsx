import { AlertTriangle } from 'lucide-react';
import { cn } from '../../../user/utils/cn';
import { BottomSheet } from './BottomSheet';

/**
 * What `window.confirm` becomes: the same question, a confirm button (red for
 * destructive ones) and Cancel. Whatever called it gets the same yes/no.
 *
 * Prefer `useConfirm()` from VendorDialogs, which returns a promise so the
 * calling handler keeps its shape: `if (!(await confirm(msg))) return;`
 */
export function ConfirmSheet({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}) {
  return (
    <BottomSheet open={open} onClose={onCancel} hideClose zIndex={95}>
      <div className="text-center pt-1">
        <div className={cn(
          'mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-3',
          danger ? 'bg-error/10 text-error' : 'bg-primary-light/40 text-primary-main'
        )}>
          <AlertTriangle size={26} />
        </div>
        <h2 className="text-lg font-bold text-text-primary">{title}</h2>
        {message && (
          <p className="mt-2 text-sm text-text-secondary leading-relaxed whitespace-pre-line">{message}</p>
        )}
      </div>
      <div className="mt-6 flex flex-col gap-2">
        <button
          type="button"
          onClick={onConfirm}
          className={cn(
            'w-full h-12 rounded-2xl text-white text-[15px] font-bold',
            danger ? 'bg-error' : 'bg-primary-main'
          )}
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full h-12 rounded-2xl bg-bg-secondary text-text-primary text-[15px] font-bold"
        >
          {cancelLabel}
        </button>
      </div>
    </BottomSheet>
  );
}

export default ConfirmSheet;
