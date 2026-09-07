import React from 'react';
import { Heart, Crown } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * The "7 likes left" chip in the swipe header.
 *
 * Deliberately quiet until it matters: neutral while there is plenty left,
 * warm amber on the last few, and red once the allowance is gone — so the
 * paywall is never the first the user hears of a limit. Unlimited plans show a
 * crown instead of a number, because counting to infinity reads as a bug.
 */
export function LikeQuotaPill({ entitlement, onClick, className }) {
  if (!entitlement) return null;

  const { unlimited, remaining, planName } = entitlement;

  if (unlimited) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={`${planName || 'Premium'} · unlimited likes`}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11.5px] font-extrabold',
          'bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white shadow-sm',
          className
        )}
      >
        <Crown size={13} strokeWidth={2.5} />
        Unlimited
      </button>
    );
  }

  const left = Math.max(0, remaining ?? 0);
  const tone =
    left === 0
      ? 'bg-red-50 text-red-600 border-red-200'
      : left <= 3
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-white/90 text-[#5A5552] border-[#F0EAE1]';

  return (
    <button
      type="button"
      onClick={onClick}
      title={
        left === 0
          ? 'You are out of likes — tap to see plans'
          : `${left} of ${entitlement.limit} likes left today`
      }
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[11.5px] font-extrabold shadow-sm transition-colors',
        tone,
        className
      )}
    >
      <Heart
        size={13}
        strokeWidth={2.5}
        className={left === 0 ? 'text-red-500' : 'text-[#F87B68]'}
        fill={left === 0 ? 'none' : '#F87B68'}
      />
      {left === 0 ? 'Get more' : `${left} left`}
    </button>
  );
}
