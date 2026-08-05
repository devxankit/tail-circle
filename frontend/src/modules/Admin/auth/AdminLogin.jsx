import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Shield, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import { cn } from '../../../modules/user/utils/cn';
import { adminLogin, adminLogout } from '../../../services/admin';

export function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    // Clear any stale session on arriving at login page — always log in fresh.
    adminLogout();
  }, []);

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      showToast('Please enter both administrative email and access key.');
      return;
    }

    setIsLoading(true);
    try {
      await adminLogin(email.trim(), password);
      showToast('Secure Session Initiated!', 'success');
      setTimeout(() => navigate('/admin/dashboard'), 800);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Invalid credentials';
      showToast(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#BFE0DF] md:bg-white font-sans overflow-x-hidden select-text relative">
      
      {toast && (
        <div className={cn(
          "fixed top-5 right-5 z-50 p-4 rounded-xl shadow-lg text-white font-semibold text-sm transition-all duration-300 animate-slide-in-right flex items-center gap-2",
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
        )}>
          {toast.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      {/* Left Side: 50% screen width, image covers full screen background */}
      <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-between min-h-[50vh] md:min-h-screen relative overflow-hidden select-none">
         
         {/* Background Image: covers full container, dimmed and slightly desaturated for premium look */}
         <img 
           src="/media/admin_login_illustration.png" 
           alt="TailCircle Admin Background" 
           className="absolute inset-0 w-full h-full object-cover z-0 filter brightness-[0.82] contrast-[0.92] saturate-[0.9]"
         />

         {/* Dark overlay to dim the lighting and ensure high readability of text */}
         <div className="absolute inset-0 bg-black/15 z-1" />

         {/* Header Logo */}
         <div className="flex items-center gap-2.5 z-10">
            <div className="w-9 h-9 rounded-xl bg-white/95 flex items-center justify-center text-slate-900 font-black text-sm shadow-md">
               TC
            </div>
            <div>
               <p className="text-white font-black text-base tracking-tight leading-none">TailCircle</p>
               <p className="text-[#66B4B1] text-[9px] font-bold uppercase tracking-wider leading-none mt-1">Super Admin</p>
            </div>
         </div>

         {/* Brand Footer */}
         <div className="max-w-md space-y-2 z-10">
            <h3 className="text-lg font-black text-white tracking-tight drop-shadow-sm">Platform Command Center</h3>
            <p className="text-xs text-slate-200/90 font-semibold leading-relaxed drop-shadow-sm">
               Access unified operations panel. Monitor commissions, platform payouts, vendor vetting, and community moderations securely.
            </p>
         </div>
      </div>

      {/* Right Side: Clean White Login Card (Covers exactly 50% screen with overlap curves) */}
      <div className="w-full md:w-1/2 bg-white p-8 sm:p-12 md:p-20 flex flex-col justify-between min-h-[50vh] md:min-h-screen rounded-t-[2.5rem] md:rounded-t-none md:rounded-tl-[3.5rem] md:rounded-bl-none -mt-8 md:mt-0 md:-ml-12 z-20 shadow-2xl md:shadow-none">
         
         <div className="my-auto max-w-md w-full mx-auto space-y-8">
            
            {/* Header Title */}
            <div className="space-y-2">
               <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                  Sign In
               </h2>
               <p className="text-xs text-gray-400 font-bold">
                  Provide credentials to initiate administrative session
               </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
               
               {/* Email Input */}
               <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Admin Email</label>
                  <div className="relative">
                     <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                     <input 
                       type="email" 
                       value={email}
                       onChange={(e) => setEmail(e.target.value)}
                       placeholder="admin@tailcircle.com"
                       className="w-full pl-11 pr-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#66B4B1] bg-white font-medium text-slate-800 transition"
                       required
                     />
                  </div>
               </div>

               {/* Password Input */}
               <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Access Key</label>
                  <div className="relative">
                     <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                     <input 
                       type={showPassword ? 'text' : 'password'}
                       value={password}
                       onChange={(e) => setPassword(e.target.value)}
                       placeholder="••••••••••••"
                       className="w-full pl-11 pr-11 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#66B4B1] bg-white font-medium text-slate-800 transition"
                       required
                     />
                     <button 
                       type="button" 
                       onClick={() => setShowPassword(!showPassword)}
                       className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                     >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                     </button>
                  </div>
               </div>

               {/* Remember & Options */}
               <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-xs text-gray-600 font-semibold cursor-pointer select-none">
                     <input 
                       type="checkbox" 
                       checked={rememberMe}
                       onChange={() => setRememberMe(!rememberMe)}
                       className="rounded text-[#66B4B1] focus:ring-[#66B4B1] cursor-pointer" 
                    />
                    Keep active
                 </label>
                 <button type="button" className="text-xs font-bold text-[#66B4B1] hover:underline" onClick={() => showToast('Please contact the IT Administrator to recover keys.', 'info')}>
                    Forgot Key?
                 </button>
              </div>

              {/* Security Notice Box */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100/60 flex gap-3">
                 <Shield size={18} className="text-gray-400 shrink-0 mt-0.5" />
                 <p className="text-[11px] text-gray-400 leading-normal font-semibold">
                    Access logs and IP addresses are recorded dynamically. Misuse is subject to automatic network block.
                 </p>
              </div>

              {/* Submit Button */}
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#66B4B1] hover:bg-[#66B4B1] disabled:opacity-50 text-slate-900 text-sm font-extrabold uppercase rounded-xl transition duration-200 shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                 {isLoading ? (
                    <span className="w-5 h-5 rounded-full border-2 border-slate-900 border-t-transparent animate-spin"></span>
                 ) : (
                    <span>Initiate Terminal</span>
                 )}
              </button>

           </form>

           {/* Vendor Login Redirection */}
           <div className="text-center pt-6 border-t border-gray-100 mt-6">
              <button 
                type="button" 
                onClick={() => navigate('/vendor/login')}
                className="text-xs font-extrabold text-[#66B4B1] hover:text-[#599D9A] transition cursor-pointer uppercase tracking-wider"
              >
                 Looking for Vendor Portal? Sign In
              </button>
           </div>

        </div>

      </div>

    </div>
  );
}

export default AdminLogin;