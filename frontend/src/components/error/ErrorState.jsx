import { RefreshCw } from 'lucide-react';
import { ErrorArt } from './ErrorArt';
import { classifyError } from './errorCopy';

/**
 * In-page failure block — for when one section could not load but the rest of
 * the screen is fine (a feed that 500s, a list that timed out).
 *
 * Prefer this over letting a request error bubble to the boundary: the user
 * keeps their nav and context, and retries in place.
 *
 *   const [error, setError] = useState(null);
 *   ...
 *   if (error) return <ErrorState error={error} onRetry={load} />;
 *
 * `error` is anything thrown by services/api — the status on ApiClientError
 * picks the wording. Pass `title` / `message` to override for a specific spot.
 */
export function ErrorState({
  error,
  onRetry,
  retrying = false,
  title,
  message,
  compact = false,
  className = '',
}) {
  const copy = classifyError(error);

  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center text-center w-full ${
        compact ? 'py-7 px-5' : 'py-12 px-6'
      } ${className}`}
    >
      <ErrorArt variant={copy.variant} size={compact ? 96 : 138} />

      <p className="mt-1 text-[15px] font-bold text-text-primary">{title ?? copy.title}</p>

      <p className="mt-1.5 max-w-[270px] text-[12.5px] leading-relaxed text-text-secondary">
        {message ?? copy.message}
      </p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary-light px-4 py-2 text-[12.5px] font-semibold text-primary-dark transition-colors hover:bg-primary-main/30 disabled:opacity-60"
        >
          <RefreshCw size={13} strokeWidth={2.6} className={retrying ? 'animate-spin' : undefined} />
          {retrying ? 'Retrying…' : copy.primary}
        </button>
      )}
    </div>
  );
}

export default ErrorState;
