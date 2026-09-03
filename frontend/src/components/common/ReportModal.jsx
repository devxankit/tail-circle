import React, { useState } from 'react';
import { X, AlertTriangle, Check, ShieldAlert } from 'lucide-react';
import { cn } from '../../modules/user/utils/cn';

const DEFAULT_REASONS = [
  'Inappropriate or offensive content',
  'Fake or commercial profile',
  'Aggressive or unsafe pet behavior',
  'Harassment or spam messages',
  'Scam or suspicious activity',
  'Other issue',
];

export function ReportModal({
  isOpen,
  onClose,
  title = 'Report Profile',
  subtitle = 'Help us keep TailCircle safe for everyone',
  onSubmit,
}) {
  const [selectedReason, setSelectedReason] = useState(DEFAULT_REASONS[0]);
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalReason = additionalDetails.trim()
      ? `${selectedReason}: ${additionalDetails.trim()}`
      : selectedReason;

    setIsSubmitting(true);
    try {
      await onSubmit(finalReason);
      onClose();
    } catch {
      /* handled in caller */
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[28px] w-full max-w-md p-6 shadow-2xl relative border border-slate-100 animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
          type="button"
        >
          <X size={18} strokeWidth={2.5} />
        </button>

        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <ShieldAlert size={26} strokeWidth={2.2} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 leading-tight">{title}</h2>
            <p className="text-xs font-bold text-slate-400 mt-0.5">{subtitle}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
              Reason for reporting
            </label>
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 hide-scrollbar">
              {DEFAULT_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setSelectedReason(reason)}
                  className={cn(
                    'w-full text-left px-4 py-3 rounded-2xl text-xs font-bold transition flex items-center justify-between border',
                    selectedReason === reason
                      ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100/80'
                  )}
                >
                  <span>{reason}</span>
                  {selectedReason === reason && <Check size={16} strokeWidth={3} className="text-rose-600" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
              Additional Info <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              value={additionalDetails}
              onChange={(e) => setAdditionalDetails(e.target.value)}
              placeholder="Describe the issue in detail..."
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3.5 rounded-2xl font-bold text-white bg-rose-600 hover:bg-rose-700 transition text-xs shadow-lg shadow-rose-200 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
