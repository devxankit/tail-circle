import { useState } from 'react';
import { BottomSheet } from './BottomSheet';

/**
 * What `window.prompt` becomes: the same question over a textarea.
 *
 * Submit hands the typed string to the handler exactly as `prompt` would —
 * including an empty string — and Cancel hands it `null`, so the caller's own
 * "too short / cancelled" checks keep working unchanged.
 *
 * Prefer `usePrompt()` from VendorDialogs: `const reason = await prompt({...})`.
 */
export function ReasonSheet({
  open,
  title = 'Add a reason',
  message,
  placeholder = '',
  defaultValue = '',
  submitLabel = 'Submit',
  danger = false,
  multiline = true,
  onSubmit,
  onCancel,
}) {
  // The dialog host re-keys this per prompt, so each starts from its default.
  const [value, setValue] = useState(defaultValue || '');

  const submit = (e) => {
    e?.preventDefault?.();
    onSubmit?.(value);
  };

  return (
    <BottomSheet
      open={open}
      onClose={onCancel}
      title={title}
      zIndex={95}
      footer={(
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-12 rounded-2xl bg-bg-secondary text-text-primary text-[15px] font-bold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className={`flex-1 h-12 rounded-2xl text-white text-[15px] font-bold ${danger ? 'bg-error' : 'bg-primary-main'}`}
          >
            {submitLabel}
          </button>
        </div>
      )}
    >
      <form onSubmit={submit}>
        {message && <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line mb-3">{message}</p>}
        {multiline ? (
          <textarea
            autoFocus
            rows={4}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-border-light bg-white px-4 py-3 text-[16px] text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-accent-teal focus:ring-2 focus:ring-accent-teal/20 resize-none"
          />
        ) : (
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full h-12 rounded-xl border border-border-light bg-white px-4 text-[16px] text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-accent-teal focus:ring-2 focus:ring-accent-teal/20"
          />
        )}
      </form>
    </BottomSheet>
  );
}

export default ReasonSheet;
