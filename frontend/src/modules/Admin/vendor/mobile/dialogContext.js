import { createContext, useContext } from 'react';

/**
 * Promise-based replacements for `window.confirm` and `window.prompt`
 * (the sheets themselves live in VendorDialogs.jsx).
 *
 *   if (!window.confirm(msg)) return;        →  if (!(await confirm(msg))) return;
 *   const reason = window.prompt(msg);       →  const reason = await prompt(msg);
 *
 * `confirm` resolves true/false; `prompt` resolves the typed string ('' when
 * submitted empty) or null when cancelled — exactly what the browser returned.
 * Outside the provider both fall back to the browser dialogs.
 */
export const DialogContext = createContext(null);

const asText = (opts) => (typeof opts === 'string' ? opts : [opts?.title, opts?.message].filter(Boolean).join('\n\n'));

export function useConfirm() {
  const ctx = useContext(DialogContext);
  return ctx?.confirm || ((opts) => Promise.resolve(window.confirm(asText(opts))));
}

export function usePrompt() {
  const ctx = useContext(DialogContext);
  return ctx?.prompt || ((opts) => Promise.resolve(window.prompt(asText(opts), opts?.defaultValue || '')));
}
