import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ErrorArt } from './ErrorArt';
import { Button } from '../../modules/user/components/ui/Button';

/**
 * Full-screen error surface: the illustrated, calm version of a dead end.
 *
 * Used by the error boundary and the 404 page. It fills whatever container it
 * is dropped into, so it works inside the phone shell and across the full
 * width of the vendor and admin portals without a variant of its own — those
 * areas re-point the same theme tokens in MobileWrapper.
 *
 * The technical detail is dev-only by design. In production a user sees the
 * illustration, one sentence, and a way out; the stack lives in the console
 * and, when one is given, behind a short reference code.
 */
export function ErrorScreen({
  variant = 'crash',
  title,
  message,
  actions = [],
  reference,
  error,
  className = '',
}) {
  const [showDetail, setShowDetail] = useState(false);
  const detail = import.meta.env.DEV ? error : null;

  return (
    <div
      role="alert"
      className={`flex-1 flex flex-col items-center justify-center w-full min-h-full px-7 py-10 bg-bg-primary text-center ${className}`}
    >
      <ErrorArt variant={variant} size={196} className="mb-1" />

      <h1 className="text-[21px] leading-tight font-extrabold text-text-primary mt-2">{title}</h1>

      <p className="mt-2.5 max-w-[300px] text-[14px] leading-relaxed text-text-secondary">
        {message}
      </p>

      {actions.length > 0 && (
        <div className="mt-7 w-full max-w-[280px] flex flex-col gap-2.5">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant={action.variant ?? 'primary'}
              size="default"
              onClick={action.onClick}
              className="w-full font-semibold"
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}

      {reference && (
        <p className="mt-6 text-[11px] font-medium tracking-wide text-text-disabled">
          Reference {reference}
        </p>
      )}

      {detail && (
        <div className="mt-6 w-full max-w-[380px] text-left">
          <button
            type="button"
            onClick={() => setShowDetail((open) => !open)}
            className="flex items-center gap-1 mx-auto text-[11px] font-semibold text-text-disabled hover:text-text-secondary transition-colors"
          >
            <ChevronDown
              size={13}
              className={`transition-transform ${showDetail ? 'rotate-180' : ''}`}
            />
            Developer detail
          </button>

          {showDetail && (
            <pre className="mt-2 max-h-52 overflow-auto rounded-xl bg-bg-secondary p-3 text-[10.5px] leading-relaxed text-text-secondary whitespace-pre-wrap break-words">
              {detail.stack || String(detail)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export default ErrorScreen;
