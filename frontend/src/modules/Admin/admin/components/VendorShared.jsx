import React, { useState } from 'react';
import { MoreVertical, Check, X, Search, Download, Edit, Trash2, Ban, Shield, ExternalLink, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { cn } from '../../../user/utils/cn';

export const StatusBadge = ({ status }) => {
  const styles = {
    Active: 'bg-[#66B4B1] text-white',
    Pending: 'bg-[#F87B68] text-gray-900',
    Suspended: 'bg-[#F87B68] text-white',
    Blocked: 'bg-gray-800 text-white',
    Verified: 'bg-teal-100 text-teal-800 border border-teal-200',
    Rejected: 'bg-red-100 text-red-800 border border-red-200'
  };

  const icons = {
    Verified: <Check size={12} className="mr-1" />,
    Rejected: <X size={12} className="mr-1" />
  };

  const defaultStyle = 'bg-gray-100 text-gray-600';
  const appliedStyle = styles[status] || defaultStyle;

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase', appliedStyle)}>
      {icons[status]}
      {status}
    </span>
  );
};

export const ServiceBadge = ({ service }) => {
  const styles = {
    Burial: 'bg-blue-100 text-blue-700',
    Cremation: 'bg-purple-100 text-purple-700',
    'Tree Plantation': 'bg-green-100 text-green-700',
    'Memory Kit': 'bg-amber-100 text-amber-700',
    'Memory Stone': 'bg-rose-100 text-rose-700'
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold mr-1 mb-1', styles[service] || 'bg-gray-100 text-gray-600')}>
      {service}
    </span>
  );
}

export const ActionMenu = ({ options }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button 
        onClick={() => setOpen(!open)} 
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 py-1 overflow-hidden">
          {options.map((opt, i) => (
            <button
              key={i}
              onClick={opt.onClick}
              className={cn(
                "w-full text-left px-4 py-2 text-[13px] font-medium flex items-center gap-2 hover:bg-gray-50 transition",
                opt.danger ? "text-[#F87B68] hover:bg-red-50" : opt.warning ? "text-[#F87B68] hover:bg-amber-50" : "text-gray-700"
              )}
            >
              {opt.icon && <opt.icon size={14} />}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const Pagination = ({ current, total, pages, onPageChange }) => {
  const getPageNumbers = () => {
    let pagesArray = [];
    for (let i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || (i >= current - 1 && i <= current + 1)) {
        pagesArray.push(i);
      } else if (pagesArray[pagesArray.length - 1] !== '...') {
        pagesArray.push('...');
      }
    }
    return pagesArray;
  };

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white rounded-b-xl">
      <p className="text-sm text-gray-500 font-medium">Showing {(current - 1) * 5 + 1} to {Math.min(current * 5, total)} of <span className="font-bold text-gray-900">{total}</span> entries</p>
      <div className="flex items-center gap-1">
        <button 
          onClick={() => onPageChange(Math.max(1, current - 1))}
          disabled={current === 1}
          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition disabled:opacity-50"
        >
          <ChevronLeft size={16} />
        </button>
        {getPageNumbers().map((p, i) => (
          p === '...' ? (
            <span key={`dots-${i}`} className="px-1 text-gray-400">...</span>
          ) : (
            <button 
              key={p}
              onClick={() => onPageChange(p)}
              className={cn(
                "w-8 h-8 rounded-lg text-sm font-medium transition",
                current === p 
                  ? "bg-[#66B4B1] text-white font-bold shadow-sm shadow-[#66B4B1]/30" 
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              {p}
            </button>
          )
        ))}
        <button 
          onClick={() => onPageChange(Math.min(pages, current + 1))}
          disabled={current === pages}
          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition disabled:opacity-50"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export const EmptyState = ({ message }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
      <Search size={24} className="text-gray-300" />
    </div>
    <p className="text-gray-500 font-medium text-sm mb-4">{message}</p>
    <button className="text-sm font-bold text-[#66B4B1] hover:underline">Clear Filters</button>
  </div>
);

export const PageHeader = ({ title, subtitle, action }) => (
  <div className="flex flex-row items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
    <div className="flex-1">
      <h1 className="text-xl sm:text-[28px] font-black text-gray-900 tracking-tight leading-tight">{title}</h1>
      {subtitle && <p className="hidden sm:block text-sm text-gray-500 font-medium mt-1">{subtitle}</p>}
    </div>
    {action && (
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button 
          onClick={action.onClick}
          className="bg-[#66B4B1] hover:bg-[#66B4B1] text-white px-3 sm:px-5 py-2.5 rounded-xl text-[11px] sm:text-sm font-bold shadow-sm shadow-[#66B4B1]/10 transition flex items-center gap-1.5 whitespace-nowrap"
        >
          {action.label}
        </button>
      </div>
    )}
  </div>
);

export const StatCard = ({ title, value, subtitle }) => (
  <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100/50">
    <p className="text-gray-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1.5 sm:mb-2 line-clamp-1">{title}</p>
    <div className="flex items-end gap-2">
      <h3 className="text-xl sm:text-2xl font-black text-gray-900 leading-none">{value}</h3>
      {subtitle && <span className="text-[10px] sm:text-xs font-semibold text-gray-400 pb-0.5">{subtitle}</span>}
    </div>
  </div>
);
