/**
 * HeroFeatureOrbit — Interactive Hotspot Overlay for the TailCircle Video Hero
 *
 * The background video (/video/hero-walk.mp4) already contains the running
 * Saint Bernard dog, the 10 orbiting feature cards, the center play button,
 * the decorative motion lines, and the handwritten "Happier Pets, Happier People" note.
 *
 * This component provides precision interactive touch hotspots directly over the video's
 * cards and play button, ensuring:
 * 1. Zero duplicate cards or double-rendered elements
 * 2. Full interactivity: clicking any card triggers onServiceClick(id)
 * 3. Tapping the play button toggles video play/pause
 * 4. Responsive adaptation across all screen sizes without covering the dog or text
 */

const HOTSPOTS = [
  {
    id: 'match',
    label: 'Match & Meet',
    style: { left: '50%', top: '6%', width: '136px', height: '42px', transform: 'translate(-50%, -50%)', borderRadius: '9999px' },
  },
  {
    id: 'meals',
    label: 'Fresh Meals',
    style: { left: '80%', top: '21%', width: '70px', height: '70px', transform: 'translate(-50%, -50%)', borderRadius: '18px' },
  },
  {
    id: 'shop',
    label: 'Shop',
    style: { left: '87%', top: '44%', width: '70px', height: '70px', transform: 'translate(-50%, -50%)', borderRadius: '18px' },
  },
  {
    id: 'boarding',
    label: 'Boarding',
    style: { left: '84%', top: '66%', width: '70px', height: '70px', transform: 'translate(-50%, -50%)', borderRadius: '18px' },
  },
  {
    id: 'adopt',
    label: 'Adopt',
    style: { left: '76%', top: '82%', width: '70px', height: '70px', transform: 'translate(-50%, -50%)', borderRadius: '18px' },
  },
  {
    id: 'community',
    label: 'Community',
    style: { left: '50%', top: '91%', width: '118px', height: '44px', transform: 'translate(-50%, -50%)', borderRadius: '9999px' },
  },
  {
    id: 'events',
    label: 'Events',
    style: { left: '24%', top: '82%', width: '70px', height: '70px', transform: 'translate(-50%, -50%)', borderRadius: '18px' },
  },
  {
    id: 'daycare',
    label: 'Daycare',
    style: { left: '16%', top: '66%', width: '70px', height: '70px', transform: 'translate(-50%, -50%)', borderRadius: '18px' },
  },
  {
    id: 'vets',
    label: 'Vets',
    style: { left: '13%', top: '44%', width: '70px', height: '70px', transform: 'translate(-50%, -50%)', borderRadius: '18px' },
  },
  {
    id: 'grooming',
    label: 'Grooming',
    style: { left: '20%', top: '21%', width: '70px', height: '70px', transform: 'translate(-50%, -50%)', borderRadius: '18px' },
  },
];

export function HeroFeatureOrbit({
  onServiceClick,
  isPlaying = true,
  onTogglePlay,
}) {
  return (
    <div
      className="tc-hero-orbit-stage"
      aria-label="Interactive Pet Orbit Stage"
    >
      {/* ── Interactive Card Hotspots (Invisible over video cards) ─────── */}
      {HOTSPOTS.map((spot) => (
        <button
          key={spot.id}
          type="button"
          className="tc-hero-hotspot-btn"
          style={spot.style}
          onClick={() => onServiceClick && onServiceClick(spot.id)}
          aria-label={`Open ${spot.label} service`}
          title={spot.label}
        >
          <span className="tc-hotspot-ripple" aria-hidden="true" />
        </button>
      ))}

      {/* ── Center Play Button Hotspot (Directly over dog chest) ──────── */}
      <button
        type="button"
        className={`tc-hero-play-hotspot ${!isPlaying ? 'tc-is-paused' : ''}`}
        onClick={onTogglePlay}
        aria-label={isPlaying ? 'Pause video' : 'Play video'}
        title={isPlaying ? 'Click to pause' : 'Click to play'}
      >
        <span className="tc-play-hotspot-indicator" aria-hidden="true" />
      </button>
    </div>
  );
}

export default HeroFeatureOrbit;
