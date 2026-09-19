import React from 'react';

export function PawDecoration({ className = '', style = {}, color = '#12263A', opacity = 0.12, size = 32 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      style={{ opacity, ...style }}
      className={`pointer-events-none select-none ${className}`}
      aria-hidden="true"
    >
      {/* Main Paw Pad */}
      <path d="M12 10.5c-2.4 0-4.2 1.8-4.2 3.8 0 1.8 1.5 3.7 4.2 3.7s4.2-1.9 4.2-3.7c0-2-1.8-3.8-4.2-3.8z" />
      {/* Top Left Toe */}
      <ellipse cx="6.8" cy="8.5" rx="1.8" ry="2.4" transform="rotate(-18 6.8 8.5)" />
      {/* Top Center-Left Toe */}
      <ellipse cx="10.2" cy="5.8" rx="1.8" ry="2.6" transform="rotate(-6 10.2 5.8)" />
      {/* Top Center-Right Toe */}
      <ellipse cx="13.8" cy="5.8" rx="1.8" ry="2.6" transform="rotate(6 13.8 5.8)" />
      {/* Top Right Toe */}
      <ellipse cx="17.2" cy="8.5" rx="1.8" ry="2.4" transform="rotate(18 17.2 8.5)" />
    </svg>
  );
}
