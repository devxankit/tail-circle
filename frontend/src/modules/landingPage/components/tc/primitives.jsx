import React from 'react';
import { ArrowRight } from 'lucide-react';

/* ──────────────────────────────────────────────────────────────────────────
   Button — renders as <a> when href is given, otherwise <button>
   ────────────────────────────────────────────────────────────────────────── */
export function Button({
  as,
  href,
  variant = 'primary',
  icon = null,
  iconRight = true,
  children,
  className = '',
  ...rest
}) {
  const Tag = as || (href ? 'a' : 'button');
  const classes = `tc-btn tc-btn--${variant}${className ? ` ${className}` : ''}`;
  const glyph = icon === null ? <ArrowRight size={17} aria-hidden="true" /> : icon;

  return (
    <Tag
      className={classes}
      href={href}
      {...(Tag === 'button' ? { type: 'button' } : {})}
      {...rest}
    >
      {glyph && !iconRight && <span className="tc-btn__icon">{glyph}</span>}
      <span>{children}</span>
      {glyph && iconRight && <span className="tc-btn__icon">{glyph}</span>}
    </Tag>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   SectionLabel — small uppercase eyebrow
   ────────────────────────────────────────────────────────────────────────── */
export function SectionLabel({ children, id }) {
  return (
    <span className="tc-eyebrow" id={id}>
      {children}
    </span>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   HandDrawnUnderline — the swoosh under "one circle"
   ────────────────────────────────────────────────────────────────────────── */
export function Underlined({ children, color = '#FFC72C' }) {
  return (
    <span className="tc-underline">
      {children}
      <svg viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M2 8.5C38 3.4 84 2 116 3.2c26 1 56 3.4 82 6.1"
          fill="none"
          stroke={color}
          strokeWidth="4.5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   FloatingServiceBubble — circular icon bubble placed on an orbit
   x / y are percentages of the parent square container
   ────────────────────────────────────────────────────────────────────────── */
export function FloatingServiceBubble({ icon: Icon, label, color, x, y, delay = 0 }) {
  return (
    <div
      className="tc-bubble"
      style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${delay}s` }}
    >
      <span className="tc-bubble__icon" style={{ color }} aria-hidden="true">
        <Icon size={19} strokeWidth={2.2} />
      </span>
      <span className="tc-bubble__label">{label}</span>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   PawPrint / Heart / Star / CurvedArrow — decorative SVGs
   ────────────────────────────────────────────────────────────────────────── */
export function Paw({ size = 26, color = '#FFC72C', opacity = 0.5, rotate = 0 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      style={{ opacity, transform: `rotate(${rotate}deg)` }}
    >
      <ellipse cx="10" cy="8.5" rx="3.2" ry="4.3" fill={color} />
      <ellipse cx="16" cy="6.4" rx="3.1" ry="4.5" fill={color} />
      <ellipse cx="22" cy="8.8" rx="3.2" ry="4.3" fill={color} />
      <ellipse cx="26" cy="14.8" rx="2.8" ry="3.6" fill={color} />
      <path
        d="M16 14.5c4.4 0 8.2 3.3 8.2 7 0 2.9-2.4 4.6-5.2 4.3-1.1-.1-2-.5-3-.5s-1.9.4-3 .5c-2.8.3-5.2-1.4-5.2-4.3 0-3.7 3.8-7 8.2-7Z"
        fill={color}
      />
    </svg>
  );
}

export function CurvedArrow({ width = 78, color = '#0FA39A', flip = false }) {
  return (
    <svg
      width={width}
      height={width * 0.56}
      viewBox="0 0 80 45"
      fill="none"
      aria-hidden="true"
      style={{ transform: flip ? 'scaleX(-1)' : 'none' }}
    >
      <path
        d="M4 6c18 2 34 10 44 24"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="0 0"
        fill="none"
      />
      <path
        d="M42 22l7 9-11 2"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function Sparkle({ size = 16, color = '#FFC72C' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 0.8l2.1 5.9 6 2.1-6 2.1L10 19.2l-2.1-6.3-6-2.1 6-2.1L10 .8Z"
        fill={color}
      />
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   PhoneMockup — a real, styled phone frame. Children render the screen UI.
   ────────────────────────────────────────────────────────────────────────── */
export function PhoneMockup({ children, small = false, time = '9:41', className = '', style }) {
  return (
    <div
      className={`tc-phone${small ? ' tc-phone--sm' : ''}${className ? ` ${className}` : ''}`}
      style={style}
      aria-hidden="true"
    >
      <span className="tc-phone__notch" />
      <div className="tc-phone__screen">
        <div className="tc-phone__status">
          <span>{time}</span>
          <span style={{ display: 'inline-flex', gap: 2, alignItems: 'center' }}>
            <svg width="11" height="8" viewBox="0 0 14 10" fill="currentColor">
              <rect x="0" y="7" width="2.4" height="3" rx="0.8" />
              <rect x="3.6" y="5" width="2.4" height="5" rx="0.8" />
              <rect x="7.2" y="2.6" width="2.4" height="7.4" rx="0.8" />
              <rect x="10.8" y="0" width="2.4" height="10" rx="0.8" />
            </svg>
            <svg width="11" height="8" viewBox="0 0 14 10" fill="currentColor">
              <path d="M7 9.4 5 7.1a3 3 0 0 1 4 0L7 9.4ZM7 5.2c-1.4 0-2.7.5-3.7 1.4L2 5.2a7.5 7.5 0 0 1 10 0L10.7 6.6A5.4 5.4 0 0 0 7 5.2Z" />
            </svg>
            <svg width="15" height="8" viewBox="0 0 20 10" fill="none">
              <rect x="0.6" y="0.6" width="16" height="8.8" rx="2.6" stroke="currentColor" strokeWidth="1.2" />
              <rect x="2.2" y="2.2" width="12" height="5.6" rx="1.4" fill="currentColor" />
              <rect x="18" y="3.4" width="1.6" height="3.2" rx="0.8" fill="currentColor" />
            </svg>
          </span>
        </div>
        <div className="tc-phone__body">{children}</div>
      </div>
    </div>
  );
}
