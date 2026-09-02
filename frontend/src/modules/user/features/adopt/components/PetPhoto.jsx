import { PawPrint } from 'lucide-react';

/**
 * A listing photo, or a neutral placeholder when there is none.
 *
 * Listings are not guaranteed to have a photo -- the server stores what the
 * poster uploaded and nothing more -- so every place that shows one needs a
 * real empty state. Rendering `images[0]` straight into `src` gave a broken
 * image icon, which is what a stock photo of an unrelated pet was papering
 * over.
 */
export function PetPhoto({ src, alt, className = '', iconSize = 28 }) {
  if (src) {
    return <img src={src} alt={alt} className={className} />;
  }
  return (
    <div
      className={`${className} bg-[#FAF7F2] flex items-center justify-center text-[#66B4B1]/40`}
      role="img"
      aria-label={`${alt || 'Pet'} — no photo`}
    >
      <PawPrint size={iconSize} strokeWidth={1.5} />
    </div>
  );
}
