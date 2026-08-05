import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../../modules/user/utils/cn';

export function Modal({ 
  isOpen = false, 
  onClose = () => {}, 
  title = '', 
  children = null, 
  footer = null,
  size = 'md'
}) {
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-xl',
    lg: 'sm:max-w-3xl',
    xl: 'sm:max-w-5xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/60 backdrop-blur-xs transition duration-200">
      {/* Overlay click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Box */}
      <div 
        className={cn(
          "bg-white w-full flex flex-col relative z-10 overflow-hidden transform transition duration-300 animate-in fade-in slide-in-from-bottom-full sm:slide-in-from-bottom-4",
          "rounded-t-[16px] sm:rounded-xl max-h-[90vh] sm:max-h-[85vh]",
          sizes[size] || sizes.md
        )}
      >
        {/* Handle Bar (Mobile only) */}
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 py-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-white sm:bg-gray-50/50">
          <h3 className="text-[18px] sm:text-lg font-bold text-gray-900">{title}</h3>
          <button 
            onClick={onClose} 
            className="p-2 sm:p-1.5 rounded-full sm:rounded-lg text-gray-400 bg-gray-100 sm:bg-transparent hover:text-gray-600 hover:bg-gray-200 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 text-[16px] sm:text-sm text-gray-700 custom-scrollbar">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-4 sm:p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-end gap-3 bg-white sm:bg-gray-50/30">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}