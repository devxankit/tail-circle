import React, { useState } from 'react';
import { cn } from '../../../user/utils/cn';

/**
 * Profile picture with an honest fallback.
 *
 * Most accounts sign up with phone + OTP and never upload a picture. The admin
 * API used to paper over that by handing back a random stock portrait from
 * pravatar.cc, so the panel showed strangers' faces beside real people's phone
 * numbers. Here a missing — or broken — image becomes the account's own
 * initials over a colour derived from its id: stable across reloads, and never
 * pretending to be a photograph of anyone.
 */

const TONES = [
  'bg-teal-100 text-teal-700',
  'bg-amber-100 text-amber-700',
  'bg-blue-100 text-blue-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-orange-100 text-orange-700',
  'bg-cyan-100 text-cyan-700',
];

const toneFor = (seed) => {
  const key = String(seed || '');
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) % 100000;
  return TONES[hash % TONES.length];
};

const initialsOf = (name) => {
  const words = String(name || '').trim().split(' ').filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

export function Avatar({ src, name, seed, className, textClassName = 'text-[13px]' }) {
  const [broken, setBroken] = useState(false);

  if (src && !broken) {
    return (
      <img
        src={src}
        alt={name || 'Profile picture'}
        onError={() => setBroken(true)}
        className={cn('object-cover bg-slate-100', className)}
      />
    );
  }

  return (
    <div
      aria-label={name || 'No profile picture'}
      className={cn(
        'flex items-center justify-center font-black uppercase select-none',
        textClassName,
        toneFor(seed || name),
        className
      )}
    >
      {initialsOf(name)}
    </div>
  );
}

export default Avatar;
