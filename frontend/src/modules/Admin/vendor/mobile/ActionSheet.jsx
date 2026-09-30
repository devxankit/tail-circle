import { cn } from '../../../user/utils/cn';
import { BottomSheet } from './BottomSheet';

/**
 * A list of actions plus Cancel — what a kebab or dropdown menu becomes on a
 * phone. Each action closes the sheet, then runs its own handler unchanged.
 *
 *   actions: [{ label, icon, onClick, danger, disabled, hint }]
 */
export function ActionSheet({ open, onClose, title, subtitle, actions = [] }) {
  return (
    <BottomSheet open={open} onClose={onClose} title={title} subtitle={subtitle} hideClose>
      <div className="bg-bg-primary rounded-[20px] border border-border-light overflow-hidden">
        {actions.filter(Boolean).map((a, i) => {
          const Icon = a.icon;
          return (
            <button
              key={a.key || a.label}
              type="button"
              disabled={a.disabled}
              onClick={(e) => { onClose?.(); a.onClick?.(e); }}
              className={cn(
                'w-full min-h-[52px] flex items-center gap-3 px-4 py-3 text-left bg-white active:bg-bg-secondary disabled:opacity-40',
                i > 0 && 'border-t border-border-light',
                a.danger ? 'text-error' : 'text-text-primary'
              )}
            >
              {Icon && <Icon size={20} className={a.danger ? 'text-error' : 'text-text-secondary'} />}
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-semibold">{a.label}</span>
                {a.hint && <span className="block text-xs text-text-secondary mt-0.5">{a.hint}</span>}
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="mt-3 w-full h-12 rounded-2xl bg-bg-secondary text-text-primary text-[15px] font-bold"
      >
        Cancel
      </button>
    </BottomSheet>
  );
}

export default ActionSheet;
