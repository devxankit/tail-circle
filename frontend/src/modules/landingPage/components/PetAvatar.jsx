import React from 'react';

/**
 * Curated high quality avatars for floating pet portraits (Dogs, Cats, Bunny)
 */
export const AVATARS = {
  husky: 'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?w=150&auto=format&fit=crop&q=80',
  frenchie: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=150&auto=format&fit=crop&q=80',
  catGinger: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=150&auto=format&fit=crop&q=80',
  corgi: 'https://images.unsplash.com/photo-1612536057832-2ff7ead58194?w=150&auto=format&fit=crop&q=80',
  catTabby: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=150&auto=format&fit=crop&q=80',
  goldenPuppy: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=150&auto=format&fit=crop&q=80',
  bunny: 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=150&auto=format&fit=crop&q=80',
  pug: 'https://images.unsplash.com/photo-1517423440428-a5a00ad493e8?w=150&auto=format&fit=crop&q=80',
  borderCollie: 'https://images.unsplash.com/photo-1568640347023-a616a30bc3bd?w=150&auto=format&fit=crop&q=80',
  rottweiler: 'https://images.unsplash.com/photo-1567752881298-894bb81f9379?w=150&auto=format&fit=crop&q=80',
  fluffyWhite: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=150&auto=format&fit=crop&q=80',
  brownLab: 'https://images.unsplash.com/photo-1579202673506-ca3ce28943ef?w=150&auto=format&fit=crop&q=80',
  shiba: 'https://images.unsplash.com/photo-1583512603805-3cc6b41f3edb?w=150&auto=format&fit=crop&q=80',
};

/**
 * Floating Pet Avatar Circle with subtle float keyframes, interactive click & active state.
 */
export function PetAvatar({
  src,
  alt = 'Happy pet',
  size = 56,
  floatType = 'lp-float-1',
  style = {},
  className = '',
  borderColor = '#FFFFFF',
  isActive = false,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`lp-pet-avatar ${floatType} ${isActive ? 'active-avatar' : ''} ${className} cursor-pointer focus:outline-none p-0 border-0`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderColor: isActive ? '#36B4AB' : borderColor,
        ...style,
      }}
      aria-label={alt}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={(e) => {
          // Graceful fallback to inline friendly svg pet icon if image fails
          e.currentTarget.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%23FED034"><circle cx="50" cy="50" r="48" fill="%2344A6EE"/><text x="50" y="62" font-size="40" text-anchor="middle" fill="white">🐾</text></svg>`;
        }}
      />
    </button>
  );
}

export default PetAvatar;
