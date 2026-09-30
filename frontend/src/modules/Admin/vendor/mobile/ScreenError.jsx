import { cn } from '../../../user/utils/cn';
import { ErrorState } from '../../../../components/error/ErrorState';

/** Wraps the app's ErrorState so a failed screen keeps its nav and can retry. */
export function ScreenError({ error, message, title, onRetry, retrying, className }) {
  return (
    <div className={cn('bg-white rounded-[20px] border border-border-light', className)}>
      <ErrorState
        error={typeof error === 'string' ? undefined : error}
        title={title}
        message={message ?? (typeof error === 'string' ? error : undefined)}
        onRetry={onRetry}
        retrying={retrying}
        compact
      />
    </div>
  );
}

export default ScreenError;
