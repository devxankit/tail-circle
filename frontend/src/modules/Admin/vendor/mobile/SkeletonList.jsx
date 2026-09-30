import { cn } from '../../../user/utils/cn';

/** Pulsing placeholder cards while a list loads (the PetListing skeleton). */
export function SkeletonList({ rows = 3, className, withMedia = false }) {
  return (
    <div className={cn('space-y-3', className)} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-white p-4 rounded-[20px] flex gap-4 border border-border-light animate-pulse">
          {withMedia && <div className="w-16 h-16 bg-gray-100 rounded-2xl shrink-0" />}
          <div className="flex-1 space-y-3 py-1">
            <div className="w-1/3 h-3.5 bg-gray-100 rounded" />
            <div className="w-2/3 h-4 bg-gray-100 rounded" />
            <div className="w-1/2 h-3.5 bg-gray-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default SkeletonList;
