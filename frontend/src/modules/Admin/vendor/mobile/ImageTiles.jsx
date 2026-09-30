import { useId } from 'react';
import { X, ArrowLeft, ArrowRight, Camera, Loader2 } from 'lucide-react';
import { cn } from '../../../user/utils/cn';

/**
 * A tile-grid photo uploader (the onboarding Step2Media look), driven entirely
 * by the screen's existing handlers — this only draws the grid.
 *
 *   photos     — array of URLs, in order
 *   onRemove   — (index) => void
 *   onMove     — (from, to) => void          (omit to hide reordering)
 *   onFiles    — native file-input change handler (the screen's own upload)
 *   showCover  — label the first tile "Cover"
 *
 * Remove, cover and reorder controls are always visible (no hover) and 36px.
 */
export function ImageTiles({
  photos = [],
  onRemove,
  onMove,
  onFiles,
  uploading = false,
  showCover = false,
  accept = 'image/*',
  multiple = true,
  addLabel = 'Add photo',
  max,
  className,
  capture,
}) {
  const inputId = useId();
  const canAdd = onFiles && (!max || photos.length < max);

  return (
    <div className={cn('grid grid-cols-2 gap-3', className)}>
      {photos.map((src, i) => (
        <div key={`${src}-${i}`} className="relative aspect-square rounded-[20px] overflow-hidden border border-border-light bg-bg-primary shadow-sm">
          <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />

          {showCover && i === 0 && (
            <span className="absolute top-2 left-2 bg-accent-teal text-white text-[10px] font-bold px-2 py-1 rounded-full">
              Cover
            </span>
          )}

          {onRemove && (
            <button
              type="button"
              aria-label="Remove photo"
              onClick={() => onRemove(i)}
              className="absolute top-2 right-2 w-9 h-9 bg-white/95 rounded-full flex items-center justify-center text-error shadow-sm active:scale-95"
            >
              <X size={16} strokeWidth={3} />
            </button>
          )}

          {onMove && (
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
              <button
                type="button"
                aria-label="Move earlier"
                onClick={() => onMove(i, i - 1)}
                disabled={i === 0}
                className="w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center disabled:opacity-30"
              >
                <ArrowLeft size={16} />
              </button>
              <span className="text-[11px] font-bold text-white bg-black/60 px-2 py-0.5 rounded-full">{i + 1}</span>
              <button
                type="button"
                aria-label="Move later"
                onClick={() => onMove(i, i + 1)}
                disabled={i === photos.length - 1}
                className="w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center disabled:opacity-30"
              >
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      ))}

      {canAdd && (
        <label
          htmlFor={inputId}
          className={cn(
            'aspect-square rounded-[20px] border-2 border-dashed border-accent-teal bg-bg-primary/60 flex flex-col items-center justify-center cursor-pointer active:bg-bg-primary',
            uploading && 'opacity-60 pointer-events-none'
          )}
        >
          <input
            id={inputId}
            type="file"
            accept={accept}
            multiple={multiple}
            capture={capture}
            className="hidden"
            onChange={onFiles}
            disabled={uploading}
          />
          {uploading ? <Loader2 size={28} className="text-accent-teal animate-spin mb-2" /> : <Camera size={28} className="text-accent-teal mb-2" />}
          <span className="text-accent-teal font-bold text-sm text-center px-2 leading-tight">
            {uploading ? 'Uploading…' : addLabel}
          </span>
        </label>
      )}
    </div>
  );
}

export default ImageTiles;
