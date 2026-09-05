import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Check } from 'lucide-react';
import { cn } from '../../../modules/user/utils/cn';
import { VENDOR_CATEGORIES, postLoginPath } from '../../../constants/vendorTypes';
import {
  registerVendor,
  loginVendorPassword,
  requestVendorOtp,
  loginVendorOtp,
} from '../../../services/vendor';


export function VendorAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  const isSignupPath = location.pathname === '/vendor/signup';
  
  const [isLogin, setIsLogin] = useState(!isSignupPath);
  const [currentStep, setCurrentStep] = useState(1);
  const [loginMethod, setLoginMethod] = useState('password'); 
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  const [formData, setFormData] = useState({
    businessName: '', email: '', phone: '', password: '', city: 'Indore', address: '',
    // A vendor may serve several categories from one account — a grooming salon
    // that also runs daycare — so signup collects a set, not a single choice.
    roles: ['shop'],
    loginEmail: '', loginPassword: '', loginRegisterNo: '', loginOtp: ''
  });

  const [errors, setErrors] = useState({});
  const [successSignup, setSuccessSignup] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let timer;
    if (otpCountdown > 0) {
      timer = setInterval(() => setOtpCountdown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [otpCountdown]);

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleInputChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
    if (errors[field]) {
      setErrors(prev => { const next = { ...prev }; delete next[field]; return next; });
    }
  };

  /** Toggle one partner category on the signup form. */
  const toggleRole = (slug) => {
    setFormData((prev) => {
      const has = prev.roles.includes(slug);
      // Never let the last one be removed — an application with no category is
      // not a thing the backend can create.
      if (has && prev.roles.length === 1) return prev;
      return { ...prev, roles: has ? prev.roles.filter((r) => r !== slug) : [...prev.roles, slug] };
    });
  };

  const validateStep1 = () => {
    const errs = {};
    if (!formData.businessName) errs.businessName = 'Required';
    if (!formData.email) errs.email = 'Required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errs.email = 'Invalid email';
    if (!formData.phone) errs.phone = 'Required';
    if (!formData.password) errs.password = 'Required';
    if (!formData.address) errs.address = 'Required';
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      showToast('Please fill all required basic fields correctly.');
    }
    return Object.keys(errs).length === 0;
  };

  const handleSendOtp = async () => {
    if (!formData.loginRegisterNo) return showToast('Enter registered mobile number or registration number');
    try {
      await requestVendorOtp(formData.loginRegisterNo);
      setOtpSent(true); setOtpCountdown(30); showToast('OTP sent!', 'success');
    } catch (err) {
      showToast(err.message || 'Could not send OTP');
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (loginMethod === 'password') {
      if (!formData.loginEmail || !formData.loginPassword) return showToast('Enter email and password');
    } else {
      if (!formData.loginRegisterNo || !formData.loginOtp) return showToast('Enter mobile/reg number and OTP');
    }
    try {
      // No category is sent. The account's business lines come back with the
      // credentials, which is the only place they were ever really known.
      const { profiles } = loginMethod === 'password'
        ? await loginVendorPassword(formData.loginEmail, formData.loginPassword)
        : await loginVendorOtp(formData.loginRegisterNo, formData.loginOtp);

      showToast('Login successful!', 'success');

      // One business goes straight to its panel; several go to the hub to pick.
      const targetPath = postLoginPath((profiles || []).map((p) => p.vendorType));
      setTimeout(() => navigate(targetPath), 800);
    } catch (err) {
      showToast(err.message || 'Login failed');
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1 && validateStep1()) setCurrentStep(2);
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const handleSignupComplete = async () => {
    if (!validateStep1()) {
      setCurrentStep(1);
      return;
    }

    try {
      await registerVendor({
        businessName: formData.businessName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        roles: formData.roles,
        city: formData.address || formData.city,
        address: formData.address,
      });
      setSuccessSignup(true);
      setTimeout(() => { setSuccessSignup(false); setIsLogin(true); setCurrentStep(1); }, 3000);
    } catch (err) {
      showToast(err.message || 'Registration failed');
    }
  };

  // Replicating the soft boxed inputs from the reference image, enforcing 16px font and 48px min-height on mobile
  const inputClass = "w-full py-3 px-4 sm:py-3.5 bg-white border border-gray-200 rounded-lg focus:border-[#40716F] focus:ring-4 focus:ring-[#40716F]/10 focus:outline-none transition-all text-[16px] sm:text-sm text-gray-900 placeholder-gray-400 font-medium min-h-[48px] sm:min-h-0";

  return (
    <div className="h-screen w-full flex bg-[#FAF7F2] font-sans selection:bg-[#40716F]/30 overflow-hidden">
      {toast && (
        <div className={cn("fixed bottom-5 right-5 z-50 px-6 py-3 rounded-lg text-white text-sm shadow-xl font-medium", toast.type === 'success' ? 'bg-[#40716F]' : 'bg-red-600')}>
          {toast.message}
        </div>
      )}

      {/* Main Full Screen Card */}
      <div className="w-full h-full relative flex flex-col lg:flex-row">
        
        {/* Left Side / Mobile Top: Real Photo Background */}
        <div className="flex w-full h-[35vh] min-h-[320px] lg:min-h-0 lg:h-full lg:w-[55%] relative p-6 lg:p-12 flex-col justify-between overflow-hidden bg-gray-50 shrink-0">
          
          {/* Background Image (No color overlay) */}
          <img 
            src="/media/tail_circle_auth_banner.png" 
            alt="Vendor illustration" 
            className="absolute inset-0 w-full h-full object-cover object-[center_30%] lg:object-center"
          />
          
          {/* Subtle gradient to ensure white text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40 pointer-events-none" />

          {/* Top Content: Just Logo */}
          <div className="z-10 relative flex flex-col">
            <h1 className="text-2xl lg:text-3xl font-serif text-white tracking-tight drop-shadow-md">
              TailCircle
            </h1>
          </div>

          {/* Bottom Content: Text Group & Footer */}
          <div className="z-10 relative hidden lg:flex flex-col justify-end">
            <div className="max-w-[400px] mb-8">
              <h2 className="text-4xl lg:text-5xl font-serif text-white leading-tight font-light mb-4 drop-shadow-md">
                Scale Your Pet Business
              </h2>
              <p className="text-white/90 font-medium text-sm leading-relaxed drop-shadow-sm">
                Join the TailCircle ecosystem. Connect with thousands of pet parents looking for top-tier services.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side / Mobile Bottom: Clean Creamy Curved Panel */}
        {/* Overlaps the image on mobile with -mt-8 and rounded top corners */}
        <div className="w-full flex-1 lg:flex-none lg:w-[52%] lg:absolute lg:right-0 lg:top-0 lg:bottom-0 bg-[#FAF7F2] rounded-t-[40px] lg:rounded-t-none lg:rounded-l-[80px] -mt-8 lg:mt-0 z-20 p-6 sm:p-10 lg:p-20 flex flex-col lg:justify-center overflow-y-auto shadow-[0_-10px_40px_rgb(0,0,0,0.1)] lg:shadow-[-20px_0_40px_rgb(0,0,0,0.1)]">
          
          <div className="max-w-[420px] w-full mx-auto">
            {isLogin ? (
              /* ================= LOGIN FORM ================= */
              <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                
                <div className="mb-8">
                  <h2 className="text-3xl font-serif text-gray-900 leading-tight mb-2">
                    Welcome to TailCircle.
                  </h2>
                  <p className="text-gray-500 text-sm font-medium">
                    Let's help you get started.
                  </p>
                </div>

                <div className="mb-8 text-sm">
                  <span className="text-gray-500">Don't have an account? </span>
                  <button 
                    onClick={() => { setIsLogin(false); setCurrentStep(1); setSuccessSignup(false); }}
                    className="text-[#40716F] font-medium hover:underline ml-1"
                  >
                    Sign up
                  </button>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-6">
                  
                  {/* The partner-category dropdown that used to sit here is
                      gone. A vendor's business lines are derived from their
                      credentials — and a vendor who runs both grooming and
                      daycare had no single right answer to give it. */}

                  {/* Login Method Toggle */}
                  <div className="flex gap-6 pt-2 pb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={loginMethod === 'password'} onChange={() => setLoginMethod('password')} className="hidden" />
                      <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center transition-colors", loginMethod === 'password' ? "border-[#40716F] bg-[#40716F]" : "border-gray-300")}>
                        {loginMethod === 'password' && <span className="w-1.5 h-1.5 bg-white rounded-full"/>}
                      </div>
                      <span className={cn("text-sm transition-colors", loginMethod === 'password' ? "text-gray-900 font-medium" : "text-gray-500")}>Password</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={loginMethod === 'otp'} onChange={() => setLoginMethod('otp')} className="hidden" />
                      <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center transition-colors", loginMethod === 'otp' ? "border-[#40716F] bg-[#40716F]" : "border-gray-300")}>
                        {loginMethod === 'otp' && <span className="w-1.5 h-1.5 bg-white rounded-full"/>}
                      </div>
                      <span className={cn("text-sm transition-colors", loginMethod === 'otp' ? "text-gray-900 font-medium" : "text-gray-500")}>OTP Login</span>
                    </label>
                  </div>

                  {/* Inputs */}
                  {loginMethod === 'password' ? (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      <input type="email" placeholder="Email address" required value={formData.loginEmail} onChange={e => handleInputChange('loginEmail', e.target.value)} className={inputClass} />
                      <input type="password" placeholder="Password" required value={formData.loginPassword} onChange={e => handleInputChange('loginPassword', e.target.value)} className={inputClass} />
                    </div>
                  ) : (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          placeholder="Registered mobile number / Reg no"
                          required
                          value={formData.loginRegisterNo}
                          onChange={e => handleInputChange('loginRegisterNo', e.target.value)}
                          className={inputClass}
                        />
                        <button type="button" onClick={handleSendOtp} disabled={otpCountdown > 0} className="absolute right-4 text-xs text-[#40716F] font-bold uppercase tracking-wider disabled:opacity-50 cursor-pointer transition">
                          {otpCountdown > 0 ? `Wait ${otpCountdown}s` : 'Send OTP'}
                        </button>
                      </div>
                      <input type="text" placeholder="6-Digit OTP" maxLength={6} required value={formData.loginOtp} onChange={e => handleInputChange('loginOtp', e.target.value.replace(/\D/g, ''))} className={inputClass} />
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-6">
                    <button type="submit" className="w-full px-6 py-3.5 bg-[#40716F] text-white rounded-lg text-sm font-medium hover:bg-[#335A58] transition-all cursor-pointer shadow-sm active:scale-95">
                      Log In
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* ================= SIGNUP FORM ================= */
              <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                {successSignup ? (
                  <div className="text-center py-10 space-y-5 animate-in fade-in zoom-in duration-500">
                    <div className="w-16 h-16 bg-[#40716F]/10 rounded-full flex items-center justify-center mx-auto">
                      <Check size={32} className="text-[#40716F]" />
                    </div>
                    <h2 className="text-3xl font-serif text-gray-900 tracking-tight">Application Submitted</h2>
                    <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
                      We will review your business credentials and email you within 24-48 hours.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mb-8">
                      <h2 className="text-3xl font-serif text-gray-900 leading-tight mb-2">
                        Become a Partner.
                      </h2>
                      <p className="text-gray-500 text-sm font-medium">
                        Register your business on TailCircle.
                      </p>
                    </div>

                    <div className="mb-8 text-sm">
                      <span className="text-gray-500">Already have an account? </span>
                      <button 
                        onClick={() => setIsLogin(true)}
                        className="text-[#40716F] font-medium hover:underline ml-1"
                      >
                        Log in
                      </button>
                    </div>

                    <div className="space-y-6">
                      {/* Dynamic Step Content */}
                      <div className="min-h-[220px]">
                        {currentStep === 1 && (
                          <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                            <input type="text" placeholder="Business / Clinic Name" value={formData.businessName} onChange={e => handleInputChange('businessName', e.target.value)} className={inputClass} />
                            <input type="email" placeholder="Business Email" value={formData.email} onChange={e => handleInputChange('email', e.target.value)} className={inputClass} />
                            <div className="grid grid-cols-2 gap-4">
                              <input type="text" placeholder="Phone Number" maxLength={10} value={formData.phone} onChange={e => handleInputChange('phone', e.target.value.replace(/\D/g, ''))} className={inputClass} />
                              <input type="password" placeholder="Account Password" value={formData.password} onChange={e => handleInputChange('password', e.target.value)} className={inputClass} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <input type="text" placeholder="City (e.g. Mumbai, Indore)" value={formData.city} onChange={e => handleInputChange('city', e.target.value)} className={inputClass} />
                              <input type="text" placeholder="Shop Area / Address" value={formData.address} onChange={e => handleInputChange('address', e.target.value)} className={inputClass} />
                            </div>
                          </div>
                        )}

                        {currentStep === 2 && (
                          <div className="animate-in slide-in-from-right-4 duration-300">
                            {/* Heading and live count share a row: the count was
                                a separate paragraph, which put a third block of
                                text above the list and pushed it off screen. */}
                            <div className="flex items-baseline justify-between gap-3 mb-1">
                              <p className="text-xs text-gray-500 font-medium">Select Partner Categories</p>
                              {formData.roles.length > 1 && (
                                <span className="text-[11px] font-semibold text-[#40716F] shrink-0">
                                  {formData.roles.length} selected
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-400 mb-3">
                              Pick every service you offer — each gets its own panel.
                            </p>

                            {/* ~4.5 rows visible, so the list reads as
                                scrollable rather than truncated. */}
                            <div className="space-y-2 max-h-[228px] overflow-y-auto overscroll-contain pr-1 -mr-1">
                              {VENDOR_CATEGORIES.map(({ slug: r, label }) => {
                                const checked = formData.roles.includes(r);
                                return (
                                  <label key={r} className={cn("flex items-center gap-3 cursor-pointer p-3 rounded-lg border transition-colors", checked ? "border-[#40716F] bg-[#40716F]/5" : "border-gray-200 hover:border-gray-300")}>
                                    <input type="checkbox" name="roles" checked={checked} onChange={() => toggleRole(r)} className="hidden" />
                                    <div className={cn("w-4 h-4 rounded border-2 transition-all flex items-center justify-center shrink-0", checked ? "border-[#40716F] bg-[#40716F]" : "border-gray-300")}>
                                      {checked && <Check size={11} className="text-white" strokeWidth={3} />}
                                    </div>
                                    <span className={cn("text-sm font-medium transition-colors", checked ? "text-gray-900" : "text-gray-600")}>
                                      {label}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>

                            {/* One hint box, not two. The multi-business note
                                and the KYC note were separate panels with
                                identical styling, which read as a glitch. */}
                            <p className="text-[11px] text-gray-400 leading-relaxed bg-[#40716F]/5 p-3 rounded-lg border border-[#40716F]/10 mt-3">
                              {formData.roles.length > 1 && (
                                <span className="text-[#40716F] font-medium">
                                  Each business is reviewed separately, so one may go live before another.{' '}
                                </span>
                              )}
                              KYC documents and bank account details are configured in your dashboard after registering.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Step Navigation */}
                      <div className="pt-6 flex flex-col gap-4">
                        {currentStep === 1 ? (
                          <button type="button" onClick={handleNextStep} className="w-full py-3.5 bg-[#40716F] text-white rounded-lg text-sm font-medium hover:bg-[#335A58] transition-all cursor-pointer shadow-sm active:scale-95 text-center">
                            Continue
                          </button>
                        ) : (
                          <button type="button" onClick={handleSignupComplete} className="w-full py-3.5 bg-[#40716F] text-white rounded-lg text-sm font-medium hover:bg-[#335A58] transition-all cursor-pointer shadow-sm active:scale-95 text-center">
                            Register Account
                          </button>
                        )}

                        {currentStep > 1 && (
                          <button type="button" onClick={handlePrevStep} className="w-full py-3.5 bg-white text-gray-600 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition cursor-pointer text-center">
                            Back
                          </button>
                        )}
                      </div>

                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
export default VendorAuth;