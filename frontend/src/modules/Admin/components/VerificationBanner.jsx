import React from 'react';
import { AlertTriangle, ArrowRight, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function VerificationBanner({ approvalStatus, onOpenKyc, kycPath }) {
  const navigate = useNavigate();

  if (approvalStatus === 'approved') return null;

  // A compact card in the partner app's column: same copy, same KYC route.
  return (
    <div className="w-full bg-white border border-warning/30 rounded-[20px] p-3.5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 bg-warning/10 text-warning rounded-xl flex items-center justify-center shrink-0">
          <ShieldAlert size={18} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-x-2 gap-y-0.5 flex-wrap">
            <h4 className="text-[13px] font-bold text-text-primary">Account Verification Pending</h4>
            <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider bg-warning/10 text-warning rounded-md">
              Action Required
            </span>
          </div>
          <p className="text-[11.5px] text-text-secondary font-medium mt-1 leading-snug">
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
        className="mt-3 w-full h-10 bg-warning text-white rounded-xl text-[13px] font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-[0.98]"
      >
        Complete KYC Documents <ArrowRight size={16} />
      </button>
    </div>
  );
}
export default VerificationBanner;
