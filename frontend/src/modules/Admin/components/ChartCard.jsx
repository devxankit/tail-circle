import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BarChart2, MoreVertical, Download, FileText, Maximize2 } from 'lucide-react';

// ─── Color Palette ────────────────────────────────────────────────────────────
export const COLORS = {
  teal:   '#00C896',
  blue:   '#4F8EF7',
  amber:  '#F7A44F',
  red:    '#F76F6F',
  purple: '#9B8EF7',
};

// ─── Shimmer keyframes (injected once) ────────────────────────────────────────
const SHIMMER_ID = '__chart_shimmer_style__';
if (typeof document !== 'undefined' && !document.getElementById(SHIMMER_ID)) {
  const style = document.createElement('style');
  style.id = SHIMMER_ID;
  style.textContent = `
    @keyframes chartShimmer {
      0%   { background-position: -600px 0; }
      100% { background-position:  600px 0; }
    }
    .chart-shimmer {
      background: linear-gradient(
        90deg,
        #F0F4F8 25%,
        #E2E8F0 50%,
        #F0F4F8 75%
      );
      background-size: 600px 100%;
      animation: chartShimmer 1.4s infinite linear;
      border-radius: 8px;
    }
    .chart-card-dropdown {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      background: #fff;
      border: 1px solid #E8EDF3;
      border-radius: 10px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.10);
      min-width: 160px;
      z-index: 100;
      overflow: hidden;
      animation: dropIn 0.15s ease;
    }
    @keyframes dropIn {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0);    }
    }
    .chart-card-dropdown button {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 9px 14px;
      border: none;
      background: transparent;
      font-size: 13px;
      color: #4A5568;
      cursor: pointer;
      transition: background 0.12s;
      text-align: left;
    }
    .chart-card-dropdown button:hover {
      background: #F7F9FC;
      color: #1A202C;
    }
    .toggle-group-btn {
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 500;
      border: none;
      background: transparent;
      cursor: pointer;
      border-radius: 20px;
      transition: background 0.15s, color 0.15s;
      line-height: 1.6;
      white-space: nowrap;
    }
    .toggle-group-btn.active {
      background: #00C896;
      color: #fff;
    }
    .toggle-group-btn.inactive {
      background: transparent;
      color: #718096;
    }
    .toggle-group-btn.inactive:hover {
      background: #F0F4F8;
      color: #4A5568;
    }
  `;
  document.head.appendChild(style);
}

// ─── ChartSkeleton ────────────────────────────────────────────────────────────
export function ChartSkeleton({ height = 200 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* fake header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="chart-shimmer" style={{ width: 140, height: 14 }} />
          <div className="chart-shimmer" style={{ width: 90, height: 11 }} />
        </div>
        <div className="chart-shimmer" style={{ width: 96, height: 26, borderRadius: 20 }} />
      </div>
      {/* fake chart body */}
      <div className="chart-shimmer" style={{ width: '100%', height }} />
    </div>
  );
}

// ─── EmptyChart ───────────────────────────────────────────────────────────────
export function EmptyChart({ height = 200 }) {
  return (
    <div
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        height,
        gap:            10,
        color:          '#CBD5E0',
        userSelect:     'none',
      }}
    >
      <BarChart2 size={40} strokeWidth={1.5} color="#CBD5E0" />
      <span style={{ fontSize: 13, color: '#A0AEC0', fontWeight: 500 }}>
        No data available
      </span>
    </div>
  );
}

// ─── ToggleGroup ──────────────────────────────────────────────────────────────
export function ToggleGroup({ options = ['7D', '1M', '3M'], value, onChange }) {
  return (
    <div className="flex sm:inline-flex w-full sm:w-auto border border-gray-200 rounded-[20px] p-[2px] bg-white gap-0.5">
      {options.map((opt) => (
        <button
          key={opt}
          className={`flex-1 sm:flex-none px-2.5 py-1 sm:py-1 text-[12px] sm:text-[11px] font-medium rounded-full transition-colors leading-relaxed whitespace-nowrap min-h-[36px] sm:min-h-[auto] ${
            value === opt 
              ? 'bg-[#66B4B1] text-white' 
              : 'bg-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700'
          }`}
          onClick={() => onChange && onChange(opt)}
          type="button"
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ─── CustomTooltip ────────────────────────────────────────────────────────────
export function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div
      style={{
        background:   '#fff',
        border:       '1px solid #E8EDF3',
        borderRadius: 8,
        boxShadow:    '0 4px 14px rgba(0,0,0,0.09)',
        padding:      '10px 14px',
        minWidth:     120,
      }}
    >
      {label !== undefined && (
        <p
          style={{
            margin:     '0 0 6px',
            fontSize:   12,
            fontWeight: 600,
            color:      '#2D3748',
          }}
        >
          {label}
        </p>
      )}
      {payload.map((entry, idx) => {
        const displayValue = typeof formatter === 'function'
          ? formatter(entry.value, entry.name, entry)
          : typeof entry.value === 'number'
            ? entry.value.toLocaleString()
            : (entry.value ?? '');

        return (
          <div
            key={idx}
            style={{
              display:     'flex',
              alignItems:  'center',
              gap:         6,
              fontSize:    12,
              color:       '#4A5568',
              marginTop:   idx > 0 ? 4 : 0,
            }}
          >
            <span
              style={{
                display:      'inline-block',
                width:        8,
                height:       8,
                borderRadius: '50%',
                background:   entry.color || entry.fill || COLORS.teal,
                flexShrink:   0,
              }}
            />
            <span style={{ color: '#718096' }}>{entry.name}:</span>
            <span style={{ fontWeight: 600, color: '#1A202C', marginLeft: 'auto', paddingLeft: 8 }}>
              {displayValue}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── More-menu (internal) ─────────────────────────────────────────────────────
function MoreMenu({ chartRef }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleDownloadPNG = useCallback(async () => {
    setOpen(false);
    const node = chartRef?.current;
    if (!node) return;
    try {
      let html2canvasFn = window.html2canvas;
      if (!html2canvasFn) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load html2canvas'));
          document.head.appendChild(script);
        });
        html2canvasFn = window.html2canvas;
      }
      if (!html2canvasFn) return;
      const canvas = await html2canvasFn(node, { backgroundColor: '#fff', scale: 2 });
      const link = document.createElement('a');
      link.download = 'chart.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      // html2canvas not available – silently skip
    }
  }, [chartRef]);

  const handleFullscreen = useCallback(() => {
    setOpen(false);
    const node = chartRef?.current;
    if (!node) return;
    if (node.requestFullscreen) node.requestFullscreen();
    else if (node.webkitRequestFullscreen) node.webkitRequestFullscreen();
  }, [chartRef]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-label="More options"
        className="flex items-center justify-center w-7 h-7 sm:w-7 sm:h-7 min-h-[36px] min-w-[36px] sm:min-h-0 sm:min-w-0 border border-gray-200 rounded-lg bg-white text-gray-500 hover:bg-gray-50 transition-colors shrink-0"
      >
        <MoreVertical size={14} />
      </button>

      {open && (
        <div className="chart-card-dropdown">
          <button type="button" onClick={handleDownloadPNG}>
            <Download size={13} /> Download PNG
          </button>
          <button type="button" onClick={() => setOpen(false)}>
            <FileText size={13} /> Export CSV
          </button>
          <button type="button" onClick={handleFullscreen}>
            <Maximize2 size={13} /> Fullscreen
          </button>
        </div>
      )}
    </div>
  );
}

// ─── ChartCard ────────────────────────────────────────────────────────────────
export function ChartCard({
  title,
  subtitle,
  children,
  toggle,
  headerRight,
  className = "",
}) {
  const cardRef = useRef(null);

  return (
    <div
      ref={cardRef}
      className={`bg-white rounded-2xl p-4 sm:p-5 shadow-[0_1px_4px_rgba(0,0,0,0.07)] border border-gray-100 flex flex-col gap-4 ${className}`}
    >
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
        {/* Left: title + subtitle */}
        <div className="flex flex-col gap-0.5 min-w-0">
          {title && (
            <span className="text-[15px] font-bold text-gray-900 leading-tight truncate">
              {title}
            </span>
          )}
          {subtitle && (
            <span className="text-xs text-gray-400 leading-snug">
              {subtitle}
            </span>
          )}
        </div>

        {/* Right: optional toggle + optional headerRight + ⋮ menu */}
        <div className="flex flex-row items-center gap-2 w-full sm:w-auto shrink-0 mt-2 sm:mt-0 justify-end">
          {toggle && <div className="flex-1 sm:flex-none flex justify-end">{toggle}</div>}
          {headerRight && <div className="shrink-0">{headerRight}</div>}
          <MoreMenu chartRef={cardRef} />
        </div>
      </div>

      {/* ── Body ── */}
      <div className="min-w-0 flex-1">
        {children}
      </div>
    </div>
  );
}

export default ChartCard;
