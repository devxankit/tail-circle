/**
 * Doctor Vendor Panel — Unified Design System Tokens
 * 
 * Philosophy: Premium, calm, medical SaaS aesthetic.
 * Orange = primary CTA only. Green = success/live. Red = emergency only.
 * Neutral slate-blue for informational states. No purple.
 */

// ─── Appointment Type ──────────────────────────────────────────────────────────
export const typeStyles = {
  'Clinic Visit': {
    dot: 'bg-blue-400',
    bar: 'bg-blue-400',
    badge: 'bg-blue-50 text-blue-700 border-blue-100',
    icon: 'text-blue-500',
  },
  'Video Consultation': {
    dot: 'bg-slate-400',
    bar: 'bg-slate-400',
    badge: 'bg-slate-100 text-slate-600 border-slate-200',
    icon: 'text-slate-500',
  },
  'Home Visit': {
    dot: 'bg-teal-400',
    bar: 'bg-teal-400',
    badge: 'bg-teal-50 text-teal-700 border-teal-100',
    icon: 'text-teal-500',
  },
  'Emergency': {
    dot: 'bg-red-400 animate-pulse',
    bar: 'bg-red-400',
    badge: 'bg-red-50 text-red-700 border-red-100',
    icon: 'text-red-500',
  },
};

// ─── Appointment Status ────────────────────────────────────────────────────────
export const statusStyles = {
  Pending:   'bg-amber-50 text-amber-700 border-amber-100',
  Confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  Completed: 'bg-slate-100 text-slate-600 border-slate-200',
  Cancelled: 'bg-gray-50 text-gray-500 border-gray-200',
};

// ─── Common component classes ──────────────────────────────────────────────────
export const card = 'bg-white border border-slate-200 rounded-2xl shadow-sm';
export const cardHover = 'bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200';
export const tableHeader = 'bg-slate-50 border-b border-slate-100';

// ─── Button Hierarchy ──────────────────────────────────────────────────────────
export const btn = {
  primary:   'bg-slate-800 hover:bg-slate-900 text-white font-bold transition shadow-sm',
  secondary: 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold transition',
  ghost:     'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-semibold transition',
  danger:    'bg-red-500 hover:bg-red-600 text-white font-bold transition shadow-sm',
  success:   'bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition shadow-sm',
  video:     'bg-slate-800 hover:bg-slate-900 text-white font-bold transition shadow-sm',
  accent:    'text-[#F05A2A] hover:text-[#E04D1F] font-bold transition',
};

// ─── KPI Card Accent ───────────────────────────────────────────────────────────
export const kpiAccent = {
  appointments: { icon: 'text-blue-500',    bg: 'bg-blue-50',    bar: 'bg-blue-400' },
  emergency:    { icon: 'text-red-500',     bg: 'bg-red-50',     bar: 'bg-red-400'  },
  video:        { icon: 'text-slate-500',   bg: 'bg-slate-100',  bar: 'bg-slate-400' },
  earnings:     { icon: 'text-emerald-600', bg: 'bg-emerald-50', bar: 'bg-emerald-400' },
};
