import { useCallback, useRef, useState } from 'react';
import { ConfirmSheet } from './ConfirmSheet';
import { ReasonSheet } from './ReasonSheet';
import { DialogContext } from './dialogContext';

/**
 * Hosts the confirm and prompt sheets behind `useConfirm()` / `usePrompt()`
 * (see dialogContext.js). Mounted once by the partner app shell.
 */

/** "Remove this? It can't be undone." → title "Remove this?", message the rest. */
function splitQuestion(text) {
  const s = String(text || '').trim();
  const q = s.indexOf('?');
  if (q > 0 && q < 90) {
    const rest = s.slice(q + 1).trim();
    return { title: s.slice(0, q + 1), message: rest || undefined };
  }
  return { title: 'Please confirm', message: s };
}

const normalise = (opts) => (typeof opts === 'string' ? splitQuestion(opts) : opts || {});

export function VendorDialogProvider({ children }) {
  const [confirmState, setConfirmState] = useState(null);
  const [promptState, setPromptState] = useState(null);
  const [promptKey, setPromptKey] = useState(0);
  const resolver = useRef(null);

  const confirm = useCallback((opts) => new Promise((resolve) => {
    resolver.current = resolve;
    setConfirmState(normalise(opts));
  }), []);

  const prompt = useCallback((opts) => new Promise((resolve) => {
    resolver.current = resolve;
    setPromptKey((k) => k + 1);
    setPromptState(normalise(opts));
  }), []);

  const settleConfirm = (answer) => {
    setConfirmState(null);
    resolver.current?.(answer);
    resolver.current = null;
  };

  const settlePrompt = (answer) => {
    setPromptState(null);
    resolver.current?.(answer);
    resolver.current = null;
  };

  return (
    <DialogContext.Provider value={{ confirm, prompt }}>
      {children}
      <ConfirmSheet
        open={!!confirmState}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmLabel={confirmState?.confirmLabel}
        cancelLabel={confirmState?.cancelLabel}
        danger={confirmState?.danger}
        onConfirm={() => settleConfirm(true)}
        onCancel={() => settleConfirm(false)}
      />
      {/* Keyed per prompt so each one starts from its own default text. */}
      <ReasonSheet
        key={promptKey}
        open={!!promptState}
        title={promptState?.title}
        message={promptState?.message}
        placeholder={promptState?.placeholder}
        defaultValue={promptState?.defaultValue}
        submitLabel={promptState?.submitLabel}
        danger={promptState?.danger}
        multiline={promptState?.multiline !== false}
        onSubmit={(v) => settlePrompt(v)}
        onCancel={() => settlePrompt(null)}
      />
    </DialogContext.Provider>
  );
}

export default VendorDialogProvider;
