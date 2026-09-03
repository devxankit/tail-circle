import { useEffect, useState } from 'react';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

/**
 * Illustration for the error surfaces.
 *
 * Renders a hand-drawn SVG immediately, then upgrades to the matching Lottie
 * once the player and animation data have loaded. That upgrade is deliberately
 * lazy and failure-tolerant: these screens are the ones shown when a chunk
 * fails to download, so the artwork must never itself depend on a chunk
 * arriving. If the import fails we keep the SVG, which is a complete
 * illustration in its own right rather than a placeholder.
 *
 * Motion is dropped entirely when the user asks for reduced motion.
 */

const ANIMATIONS = {
  notFound: () => import('./animations/paw-trail.json'),
  crash: () => import('./animations/yarn-wobble.json'),
  offline: () => import('./animations/cloud-offline.json'),
};

/**
 * Dig the component out of the lottie-react namespace.
 *
 * Vite resolves the package through its `browser` field to a UMD build, so
 * interop hands back a namespace whose `default` is the entire module.exports
 * — the component sits one level further down at `.default.default`. Under
 * plain CJS it is at `.default` instead, and a future ESM build would put it
 * at `.default` too, so probe rather than assume, and return null if none of
 * them is callable.
 */
function resolvePlayer(mod) {
  const candidates = [mod?.default?.default, mod?.default, mod?.LottiePlayer, mod];
  return candidates.find((c) => typeof c === 'function') ?? null;
}

/** JSON imports arrive under `default`; verify it really is animation data. */
function resolveAnimation(mod) {
  const data = mod?.default ?? mod;
  return Array.isArray(data?.layers) ? data : null;
}

export function ErrorArt({ variant = 'crash', size = 190, className = '' }) {
  const reduceMotion = usePrefersReducedMotion();
  const [lottie, setLottie] = useState(null);

  useEffect(() => {
    if (reduceMotion) return undefined;
    let cancelled = false;

    Promise.all([import('lottie-react'), ANIMATIONS[variant]()])
      .then(([player, data]) => {
        const Player = resolvePlayer(player);
        const animation = resolveAnimation(data);
        // Anything unexpected in either import leaves the SVG in place rather
        // than handing React something it cannot render.
        if (!cancelled && Player && animation) setLottie({ Player, data: animation });
      })
      // Offline, or the chunk 404s after a redeploy — the SVG stands in.
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [variant, reduceMotion]);

  const Static = STATIC_ART[variant] ?? STATIC_ART.crash;
  // Guarded again at render: this component draws the crash screen itself, so a
  // bad value here would make the boundary catch its own output in a loop.
  const Player = typeof lottie?.Player === 'function' ? lottie.Player : null;

  return (
    <div
      className={`shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {Player ? (
        <Player animationData={lottie.data} loop autoplay style={{ width: '100%', height: '100%' }} />
      ) : (
        <Static animate={!reduceMotion} />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Static SVG counterparts — the same illustrations, CSS-animated.
   ══════════════════════════════════════════════════════════════ */

const svgProps = { viewBox: '0 0 240 240', width: '100%', height: '100%', fill: 'none' };

/** One paw print: pad plus four toes, drawn around a local origin. */
function Paw({ fill }) {
  return (
    <g fill={fill}>
      <ellipse cx="0" cy="16" rx="25" ry="20.5" />
      <ellipse cx="-24" cy="-10" rx="8.5" ry="10.5" />
      <ellipse cx="-8" cy="-23" rx="9" ry="11.5" />
      <ellipse cx="9" cy="-23" rx="9" ry="11.5" />
      <ellipse cx="24" cy="-10" rx="8.5" ry="10.5" />
    </g>
  );
}

const PAW_STEPS = [
  { x: 56, y: 196, r: -12, s: 0.72, c: '#F87B68' },
  { x: 92, y: 160, r: 10, s: 0.68, c: '#F87B68' },
  { x: 122, y: 124, r: -8, s: 0.63, c: '#F87B68' },
  { x: 156, y: 90, r: 12, s: 0.58, c: '#FFCCBC' },
  { x: 190, y: 56, r: -9, s: 0.53, c: '#FFCCBC' },
];

function NotFoundArt({ animate }) {
  return (
    <svg {...svgProps} role="img">
      <style>{`
        @keyframes tcPawStep {
          0%   { opacity: 0; }
          8%   { opacity: 1; }
          62%  { opacity: 1; }
          76%  { opacity: 0; }
          100% { opacity: 0; }
        }
        .tc-paw--anim { animation: tcPawStep 3.4s cubic-bezier(0.16,1,0.3,1) infinite; }
      `}</style>
      {PAW_STEPS.map((step, i) => (
        <g
          key={i}
          className={animate ? 'tc-paw--anim' : undefined}
          style={animate ? { animationDelay: `${i * 0.18}s` } : undefined}
          transform={`translate(${step.x} ${step.y}) rotate(${step.r}) scale(${step.s})`}
        >
          <Paw fill={step.c} />
        </g>
      ))}
    </svg>
  );
}

function CrashArt({ animate }) {
  return (
    <svg {...svgProps} role="img">
      <style>{`
        @keyframes tcYarnRock {
          0%, 100% { transform: rotate(-13deg) translateY(0px); }
          50%      { transform: rotate(13deg) translateY(-8px); }
        }
        @keyframes tcYarnShadow {
          0%, 100% { transform: scaleX(1); opacity: 0.13; }
          50%      { transform: scaleX(0.84); opacity: 0.09; }
        }
        .tc-yarn   { transform-origin: 120px 120px; transform: rotate(-13deg); }
        .tc-shadow { transform-origin: 120px 188px; opacity: 0.13; }
        .tc-yarn--anim   { animation: tcYarnRock 4s ease-in-out infinite; }
        .tc-shadow--anim { animation: tcYarnShadow 4s ease-in-out infinite; }
      `}</style>

      <ellipse
        className={animate ? 'tc-shadow tc-shadow--anim' : 'tc-shadow'}
        cx="120"
        cy="188"
        rx="48"
        ry="7.5"
        fill="#5A5552"
      />

      <g className={animate ? 'tc-yarn tc-yarn--anim' : 'tc-yarn'}>
        {/* the thread that has come undone */}
        <path
          d="M166 110 C 182 110, 190 132, 184 148 C 178 164, 190 178, 216 194"
          stroke="#F87B68"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <circle cx="120" cy="120" r="49" fill="#FFCCBC" />
        <ellipse cx="120" cy="120" rx="48" ry="25" stroke="#F87B68" strokeWidth="5" />
        <ellipse
          cx="120"
          cy="120"
          rx="25"
          ry="48"
          stroke="#F87B68"
          strokeWidth="5"
          transform="rotate(32 120 120)"
        />
      </g>
    </svg>
  );
}

function OfflineArt({ animate }) {
  return (
    <svg {...svgProps} role="img">
      <style>{`
        @keyframes tcCloudBob {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(-14px); }
        }
        @keyframes tcBoltPulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.3; }
        }
        @keyframes tcDotPulse {
          0%, 100% { opacity: 0.26; }
          30%      { opacity: 1; }
        }
        .tc-dot { opacity: 0.26; }
        .tc-cloud--anim { animation: tcCloudBob 4s ease-in-out infinite; }
        .tc-bolt--anim  { animation: tcBoltPulse 2s ease-in-out infinite; }
        .tc-dot--anim   { animation: tcDotPulse 1.35s ease-in-out infinite; }
      `}</style>

      <g className={animate ? 'tc-cloud--anim' : undefined} fill="#D1CBC7">
        <circle cx="92" cy="104" r="24" />
        <circle cx="122" cy="86" r="33" />
        <circle cx="154" cy="106" r="22" />
        <rect x="74" y="106" width="100" height="28" rx="14" />
      </g>

      {/* the broken link to the server */}
      <path
        className={animate ? 'tc-bolt--anim' : undefined}
        d="M126 128 L112 152 L124 152 L114 174"
        stroke="#F87B68"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {[0, 1, 2].map((i) => (
        <circle
          key={i}
          className={animate ? 'tc-dot tc-dot--anim' : 'tc-dot'}
          style={animate ? { animationDelay: `${i * 0.18}s` } : undefined}
          cx={98 + i * 22}
          cy="200"
          r="8.5"
          fill="#66B4B1"
        />
      ))}
    </svg>
  );
}

const STATIC_ART = {
  notFound: NotFoundArt,
  crash: CrashArt,
  offline: OfflineArt,
};

export default ErrorArt;
