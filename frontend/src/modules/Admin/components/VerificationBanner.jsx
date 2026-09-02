import React from 'react';
import { AlertTriangle, ArrowRight, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function VerificationBanner({ approvalStatus, onOpenKyc, kycPath }) {
  const navigate = useNavigate();

  if (approvalStatus === 'approved') return null;

  return (
    <div className="w-full bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 sm:p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-300">
      <div className="flex items-start gap-3.5">
        <div className="p-2.5 bg-amber-500/20 text-amber-600 rounded-lg shrink-0 mt-0.5 sm:mt-0">
          <ShieldAlert size={20} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-gray-900">Account Verification Pending</h4>
            <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 rounded-md">
              Action Required
            </span>
          </div>
          <p className="text-xs text-gray-600 font-medium mt-1 leading-relaxed max-w-2xl">
            Your vendor profile is currently under review by Super Admin. Please fill out your bank details and upload all required category KYC verification documents in your Profile Settings to get approved.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          if (onOpenKyc) onOpenKyc();
          else if (kycPath) navigate(kycPath);
        }}
        className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-2 shrink-0 shadow-sm cursor-pointer active:scale-95"
      >
        Complete KYC Documents <ArrowRight size={14} />
      </button>
    </div>
  );
}
export default VerificationBanner;
