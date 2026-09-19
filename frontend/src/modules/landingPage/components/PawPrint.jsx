import React from 'react';

/**
 * Reusable SVG Paw Print component for subtle background decorations.
 * Matches the reference design with organic paw pads and customizable color/opacity/rotation.
 */
export function PawPrint({
  size = 36,
  color = '#42BDB5',
  opacity = 0.15,
  rotation = 0,
  style = {},
  className = '',
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`lp-paw ${className}`}
      style={{
        opacity,
        transform: `rotate(${rotation}deg)`,
        ...style,
      }}
      aria-hidden="true"
    >
      {/* Main bottom pad */}
      <path
        d="M24 20C17.5 20 13 24.5 14 31C14.8 36.2 19 40 24 40C29 40 33.2 36.2 34 31C35 24.5 30.5 20 24 20Z"
        fill={color}
      />
      {/* Toe 1 - Left */}
      <ellipse cx="11.5" cy="18.5" rx="4.5" ry="6" transform="rotate(-25 11.5 18.5)" fill={color} />
      {/* Toe 2 - Mid Left */}
      <ellipse cx="19.5" cy="11.5" rx="4.5" ry="6.5" transform="rotate(-8 19.5 11.5)" fill={color} />
      {/* Toe 3 - Mid Right */}
      <ellipse cx="28.5" cy="11.5" rx="4.5" ry="6.5" transform="rotate(8 28.5 11.5)" fill={color} />
      {/* Toe 4 - Right */}
      <ellipse cx="36.5" cy="18.5" rx="4.5" ry="6" transform="rotate(25 36.5 18.5)" fill={color} />
    </svg>
  );
}

export default PawPrint;
