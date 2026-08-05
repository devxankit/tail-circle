import React, { useState } from 'react';
import { MoreVertical, Download, Maximize2, FileText } from 'lucide-react';

// ─── Shared color palette ────────────────────────────────────────────────────
export const COLORS = {
  teal:   '#00C896',
  blue:   '#4F8EF7',
  amber:  '#F7A44F',
  red:    '#F76F6F',
  purple: '#9B8EF7',
  gray:   '#CBD5E0',
};

// ─── ChartCard ────────────────────────────────────────────────────────────────
/**
 * White chart wrapper with consistent border-radius, padding and shadow.
 * Props:
 *   title      – string shown as header label
 *   className  – extra Tailwind classes for the outer div
 *   children   – chart content
 *   style      – optional inline style overrides
 */
export function ChartCard({ title, subtitle, options, children, className = '', style = {} }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const defaultOptions = options || [
    { label: 'Download CSV', icon: Download, onClick: () => alert('Downloading CSV...') },
    { label: 'Export PDF', icon: FileText, onClick: () => alert('Exporting PDF...') },
    { label: 'View Full Screen', icon: Maximize2, onClick: () => alert('Entering full screen...') }
  ];

  return (
    <div
      className={`bg-white flex flex-col ${className}`}
      style={{
        borderRadius: 16,
        padding: 20,
        boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
        ...style,
      }}
    >
      {(title || subtitle) && (
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && <h3 className="text-[15px] font-bold text-gray-900 leading-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-gray-500 font-medium mt-0.5">{subtitle}</p>}
          </div>
          <div className="relative shrink-0 ml-4">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              onBlur={() => setTimeout(() => setMenuOpen(false), 200)}
              className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              <MoreVertical size={16} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-gray-100 z-50 py-1 overflow-hidden">
                {defaultOptions.map((opt, i) => (
                  <button
                    key={i}
                    onClick={opt.onClick}
                    className="w-full text-left px-4 py-2 text-[13px] font-medium flex items-center gap-2 hover:bg-gray-50 transition text-gray-700"
                  >
                    {opt.icon && <opt.icon size={14} />}
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

// ─── ChartSkeleton ────────────────────────────────────────────────────────────
/**
 * Shimmer placeholder the same size as the real chart while data loads.
 * Props:
 *   height – px height of the shimmer box (default 260)
 */
export function ChartSkeleton({ height = 260 }) {
  return (
    <div
      className="w-full rounded-xl overflow-hidden relative"
      style={{ height, background: '#F0F4F8' }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.4s infinite',
        }}
      />
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>
    </div>
  );
}

// ─── EmptyChart ───────────────────────────────────────────────────────────────
/**
 * Gray icon + label shown when there is no data.
 */
export function EmptyChart({ height = 260 }) {
  return (
    <div
      className="w-full flex flex-col items-center justify-center gap-2"
      style={{ height }}
    >
      {/* Simple bar-chart outline icon */}
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#CBD5E0"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="12" width="4" height="8" rx="1" />
        <rect x="10" y="7"  width="4" height="13" rx="1" />
        <rect x="17" y="3"  width="4" height="17" rx="1" />
      </svg>
      <p className="text-gray-400 text-xs font-semibold">No data available</p>
    </div>
  );
}

// ─── CustomTooltip ────────────────────────────────────────────────────────────
/**
 * Drop-in Recharts custom tooltip.
 * Recharts injects: active, payload, label
 */
export function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
        padding: '10px 14px',
        fontSize: 12,
        minWidth: 120,
      }}
    >
      {label !== undefined && (
        <p style={{ fontWeight: 700, color: '#374151', marginBottom: 6 }}>{label}</p>
      )}
      {payload.map((entry, i) => {
        const displayValue = typeof formatter === 'function'
          ? formatter(entry.value, entry.name, entry)
          : typeof entry.value === 'number'
            ? entry.value.toLocaleString()
            : (entry.value ?? '');
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: entry.color || entry.stroke || '#ccc',
                flexShrink: 0,
              }}
            />
            <span style={{ color: '#6B7280', fontWeight: 600 }}>{entry.name}:</span>
            <span style={{ color: '#111827', fontWeight: 700 }}>{displayValue}</span>
          </div>
        );
      })}
    </div>
  );
}
