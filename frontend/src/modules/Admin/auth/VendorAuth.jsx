import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, Upload, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '../../../modules/user/utils/cn';
import {
  registerVendor,
  loginVendorPassword,
  requestVendorOtp,
  loginVendorOtp,
} from '../../../services/vendor';

const ROLE_ROUTES = {
  doctor: '/vendor/doctor/consultations',
  meal: '/vendor/meal/plans',
  event: '/vendor/events-organizer',
  memorial: '/vendor/memorial-provider',
  shop: '/vendor/shop-provider',
  grooming: '/vendor/grooming-provider',
  daycare: '/vendor/daycare-provider',
};

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
    businessName: '', email: '', phone: '', city: 'Indore', address: '',
    role: 'shop',
    licenseFile: null, ownerIdFile: null,
    bankName: '', accountHolder: '', accountNumber: '', ifscCode: '', accountType: 'Saving', hasGst: false, gstNumber: '',
    // Veterinary signup only — creates the professional record the user app
    // lists from. It stays unlisted until an admin verifies the credentials.
    vetTitle: 'Dr.', vetFullName: '', registrationNumber: '', council: '', registrationYear: '',
    clinicName: '', pincode: '', consultFee: '', totalYears: '',
    primarySpecialties: '', speciesTreated: '', languages: '',
    degreeFile: null, clinicAuthFile: null,
    loginEmail: '', loginPassword: '', loginRegisterNo: '', loginOtp: '', loginRole: 'shop'
  });

  const [errors, setErrors] = useState({});
  const [successSignup, setSuccessSignup] = useState(false);
  const [toast, setToast] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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

  const validateStep1 = () => {
    const errs = {};
    if (!formData.businessName) errs.businessName = 'Required';
    if (!formData.email) errs.email = 'Required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errs.email = 'Invalid email';
    if (!formData.phone) errs.phone = 'Required';
    if (!formData.address) errs.address = 'Required';
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      showToast('Please fill all required fields correctly.');
    }
    return Object.keys(errs).length === 0;
  };

  const handleSendOtp = async () => {
    if (!formData.loginRegisterNo) return showToast('Enter registration number');
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
      if (!formData.loginRegisterNo || !formData.loginOtp) return showToast('Enter reg no and OTP');
    }
    try {
      const { profile } = loginMethod === 'password'
        ? await loginVendorPassword(formData.loginEmail, formData.loginPassword)
        : await loginVendorOtp(formData.loginRegisterNo, formData.loginOtp);
      showToast('Login successful!', 'success');
      // Route by the vendor's real type; fall back to the picker selection.
      const typeToSlug = { shop: 'shop', clinic: 'doctor', meal_subscription: 'meal', events: 'event', memorial: 'memorial', grooming: 'grooming', daycare: 'daycare' };
      const slug = typeToSlug[profile?.vendorType] || formData.loginRole;
      setTimeout(() => navigate(ROLE_ROUTES[slug] || '/vendor/login'), 800);
    } catch (err) {
      showToast(err.message || 'Login failed');
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1 && validateStep1()) setCurrentStep(2);
    else if (currentStep === 2) setCurrentStep(3);
    else if (currentStep === 3) setCurrentStep(4);
    else if (currentStep === 4) {
      if (!formData.bankName || !formData.accountNumber || !formData.ifscCode) {
        showToast('Please enter required bank details');
        return;
      }
      setCurrentStep(5);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const handleFileUpload = (field, e) => {
    if (e.target.files[0]) handleInputChange(field, e.target.files[0].name);
  };

  /** "a, b, c" → ['a','b','c'] — the API takes arrays for these. */
  const toList = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);
  const toNum = (s) => (s === '' || s === null || s === undefined ? undefined : Number(s));

  /**
   * The file pickers here only capture a filename — nothing is uploaded, because
   * the upload endpoint needs a logged-in session and signup is pre-auth.
   *
   * Sending a bare filename as a document URL would register an unreviewable
   * "document" that satisfies the admin completeness check, so only real URLs
   * are forwarded. Anything else is dropped and the vet uploads it properly from
   * the dashboard, which keeps approval correctly blocked until they do.
   */
  const asDocumentUrl = (v) => (/^https?:\/\//i.test(String(v || '')) ? v : undefined);

  const handleSignupComplete = async () => {
    // A vet application is useless to a reviewer without these.
    if (formData.role === 'doctor') {
      if (!formData.vetFullName || !formData.registrationNumber || !formData.council) {
        showToast('Enter your name, registration number and issuing council');
        setCurrentStep(3);
        return;
      }
    }

    try {
      await registerVendor({
        businessName: formData.businessName,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        city: formData.address || formData.city,
        address: formData.address,
        licenseUrl: formData.licenseFile || undefined,
        ownerIdUrl: formData.ownerIdFile || undefined,
        bankName: formData.bankName,
        accountHolder: formData.accountHolder || formData.businessName,
        accountNumber: formData.accountNumber,
        ifscCode: formData.ifscCode,
        accountType: formData.accountType,
        hasGst: formData.hasGst,
        gstNumber: formData.gstNumber,

        // Veterinary professional record — ignored by the API for other roles.
        ...(formData.role === 'doctor' ? {
          vetTitle: formData.vetTitle || 'Dr.',
          vetFullName: formData.vetFullName,
          registrationNumber: formData.registrationNumber,
          council: formData.council,
          registrationYear: toNum(formData.registrationYear),
          clinicName: formData.clinicName || formData.businessName,
          pincode: formData.pincode || undefined,
          consultFee: toNum(formData.consultFee),
          totalYears: toNum(formData.totalYears),
          primarySpecialties: toList(formData.primarySpecialties),
          speciesTreated: toList(formData.speciesTreated),
          languages: toList(formData.languages),
          degreeUrl: asDocumentUrl(formData.degreeFile),
          clinicAuthUrl: asDocumentUrl(formData.clinicAuthFile),
        } : {}),
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
                  
                  {/* Custom Category Dropdown */}
                  <div className="relative z-10">
                    <div 
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className={cn(inputClass, "flex items-center justify-between cursor-pointer")}
                    >
                      <span className="truncate">
                        {formData.loginRole === 'shop' && 'Store Shop Vendor'}
                        {formData.loginRole === 'grooming' && 'Pet Grooming & Spa Provider'}
                        {formData.loginRole === 'doctor' && 'Clinic Veterinary Doctor'}
                        {formData.loginRole === 'meal' && 'Meal Subscription Provider'}
                        {formData.loginRole === 'event' && 'Pet Events Organizer'}
                        {formData.loginRole === 'memorial' && 'Memorial End-of-Life Provider'}
                      </span>
                      <ChevronDown size={16} className={cn("text-gray-400 transition-transform duration-200 shrink-0", isDropdownOpen && "rotate-180")} />
                    </div>
                    
                    {isDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                        <div className="absolute top-full left-0 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 py-2">
                          {[
                            { val: 'shop', label: 'Store Shop Vendor' },
                            { val: 'grooming', label: 'Pet Grooming & Spa Provider' },
                            { val: 'doctor', label: 'Clinic Veterinary Doctor' },
                            { val: 'meal', label: 'Meal Subscription Provider' },
                            { val: 'event', label: 'Pet Events Organizer' },
                            { val: 'memorial', label: 'Memorial End-of-Life Provider' }
                          ].map(role => (
                            <div
                              key={role.val}
                              onClick={() => {
                                handleInputChange('loginRole', role.val);
                                setIsDropdownOpen(false);
                              }}
                              className={cn(
                                "px-5 py-3 text-sm cursor-pointer transition-colors flex items-center justify-between",
                                formData.loginRole === role.val ? "bg-[#40716F]/10 text-[#40716F] font-bold" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium"
                              )}
                            >
                              {role.label}
                              {formData.loginRole === role.val && <Check size={14} className="text-[#40716F]" />}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

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
                        <input type="text" placeholder="Register number" required value={formData.loginRegisterNo} onChange={e => handleInputChange('loginRegisterNo', e.target.value.toUpperCase())} className={inputClass} />
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
                            <input type="text" placeholder="Business Name" value={formData.businessName} onChange={e => handleInputChange('businessName', e.target.value)} className={inputClass} />
                            <input type="email" placeholder="Business Email" value={formData.email} onChange={e => handleInputChange('email', e.target.value)} className={inputClass} />
                            <div className="grid grid-cols-2 gap-4">
                              <input type="text" placeholder="Phone Number" maxLength={10} value={formData.phone} onChange={e => handleInputChange('phone', e.target.value.replace(/\D/g, ''))} className={inputClass} />
                              <input type="text" placeholder="City (Indore)" value={formData.address} onChange={e => handleInputChange('address', e.target.value)} className={inputClass} />
                            </div>
                          </div>
                        )}

                        {currentStep === 2 && (
                          <div className="space-y-3 animate-in slide-in-from-right-4 duration-300">
                            <p className="text-xs text-gray-500 font-medium mb-3">Select Partner Category</p>
                            {['shop', 'grooming', 'daycare', 'doctor', 'meal', 'event', 'memorial'].map(r => (
                              <label key={r} className={cn("flex items-center gap-4 cursor-pointer p-3 rounded-lg border transition-colors", formData.role === r ? "border-[#40716F] bg-[#40716F]/5" : "border-gray-200 hover:border-gray-300")}>
                                <input type="radio" name="role" checked={formData.role === r} onChange={() => handleInputChange('role', r)} className="hidden" />
                                <div className={cn("w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center", formData.role === r ? "border-[#40716F] bg-[#40716F]" : "border-gray-300")}>
                                  {formData.role === r && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                                </div>
                                <span className={cn("text-sm font-medium transition-colors", formData.role === r ? "text-gray-900" : "text-gray-600")}>
                                  {r === 'shop' && 'Store Shop Vendor'}
                                  {r === 'grooming' && 'Pet Grooming & Spa Provider'}
                                  {r === 'daycare' && 'Pet Daycare & Boarding Centre'}
                                  {r === 'doctor' && 'Clinic Veterinary Doctor'}
                                  {r === 'meal' && 'Meal Subscription Provider'}
                                  {r === 'event' && 'Pet Events Organizer'}
                                  {r === 'memorial' && 'Memorial Provider'}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}

                        {currentStep === 3 && (
                          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div>
                              <p className="text-xs text-gray-500 font-medium mb-2">Business Registration</p>
                              <label className="flex items-center gap-3 text-sm text-gray-900 font-medium cursor-pointer w-max hover:text-gray-600 transition p-4 border border-dashed border-gray-300 rounded-lg w-full justify-center hover:bg-gray-50">
                                <Upload size={16} className="text-[#40716F]"/> {formData.licenseFile || 'Upload Document'}
                                <input type="file" className="hidden" onChange={e => handleFileUpload('licenseFile', e)} />
                              </label>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 font-medium mb-2">Owner Identity Card</p>
                              <label className="flex items-center gap-3 text-sm text-gray-900 font-medium cursor-pointer w-max hover:text-gray-600 transition p-4 border border-dashed border-gray-300 rounded-lg w-full justify-center hover:bg-gray-50">
                                <Upload size={16} className="text-[#40716F]"/> {formData.ownerIdFile || 'Upload Document'}
                                <input type="file" className="hidden" onChange={e => handleFileUpload('ownerIdFile', e)} />
                              </label>
                            </div>

                            {/* ── Veterinary credentials ──────────────────────
                                Only what a vet can give before logging in. The
                                rest of the profile (availability, per-mode fees,
                                bio, facilities) is completed from the dashboard,
                                where document uploads are authenticated. */}
                            {formData.role === 'doctor' && (
                              <div className="space-y-4 pt-5 border-t border-gray-200">
                                <p className="text-xs font-bold text-[#40716F] uppercase tracking-wide">
                                  Veterinary credentials
                                </p>

                                <div className="grid grid-cols-3 gap-3">
                                  <input type="text" placeholder="Title" value={formData.vetTitle}
                                    onChange={e => handleInputChange('vetTitle', e.target.value)} className={inputClass} />
                                  <input type="text" placeholder="Full name (as shown publicly)" value={formData.vetFullName}
                                    onChange={e => handleInputChange('vetFullName', e.target.value)} className={cn(inputClass, 'col-span-2')} />
                                </div>

                                <input type="text" placeholder="Registration / licence number" value={formData.registrationNumber}
                                  onChange={e => handleInputChange('registrationNumber', e.target.value)} className={inputClass} />
                                <input type="text" placeholder="Issuing veterinary council" value={formData.council}
                                  onChange={e => handleInputChange('council', e.target.value)} className={inputClass} />

                                <div className="grid grid-cols-2 gap-3">
                                  <input type="number" placeholder="Year registered" value={formData.registrationYear}
                                    onChange={e => handleInputChange('registrationYear', e.target.value)} className={inputClass} />
                                  <input type="number" placeholder="Years of experience" value={formData.totalYears}
                                    onChange={e => handleInputChange('totalYears', e.target.value)} className={inputClass} />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <input type="text" placeholder="Clinic / hospital name" value={formData.clinicName}
                                    onChange={e => handleInputChange('clinicName', e.target.value)} className={inputClass} />
                                  <input type="text" placeholder="Pin code" value={formData.pincode}
                                    onChange={e => handleInputChange('pincode', e.target.value)} className={inputClass} />
                                </div>

                                <input type="number" placeholder="In-clinic consultation fee (₹)" value={formData.consultFee}
                                  onChange={e => handleInputChange('consultFee', e.target.value)} className={inputClass} />

                                <input type="text" placeholder="Specialties — comma separated" value={formData.primarySpecialties}
                                  onChange={e => handleInputChange('primarySpecialties', e.target.value)} className={inputClass} />
                                <input type="text" placeholder="Species treated — dogs, cats, exotic_pets…" value={formData.speciesTreated}
                                  onChange={e => handleInputChange('speciesTreated', e.target.value)} className={inputClass} />
                                <input type="text" placeholder="Languages spoken — comma separated" value={formData.languages}
                                  onChange={e => handleInputChange('languages', e.target.value)} className={inputClass} />

                                <div>
                                  <p className="text-xs text-gray-500 font-medium mb-2">Degree Certificate</p>
                                  <label className="flex items-center gap-3 text-sm text-gray-900 font-medium cursor-pointer transition p-4 border border-dashed border-gray-300 rounded-lg w-full justify-center hover:bg-gray-50">
                                    <Upload size={16} className="text-[#40716F]"/> {formData.degreeFile || 'Upload Document'}
                                    <input type="file" className="hidden" onChange={e => handleFileUpload('degreeFile', e)} />
                                  </label>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 font-medium mb-2">Clinic Authorization Proof</p>
                                  <label className="flex items-center gap-3 text-sm text-gray-900 font-medium cursor-pointer transition p-4 border border-dashed border-gray-300 rounded-lg w-full justify-center hover:bg-gray-50">
                                    <Upload size={16} className="text-[#40716F]"/> {formData.clinicAuthFile || 'Upload Document'}
                                    <input type="file" className="hidden" onChange={e => handleFileUpload('clinicAuthFile', e)} />
                                  </label>
                                </div>

                                <p className="text-[11px] text-gray-400 leading-relaxed">
                                  Documents are re-uploaded securely from your dashboard after you log in —
                                  admin approval stays pending until they are. Availability, video consults
                                  and fees per consultation type are also set there.
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {currentStep === 4 && (
                          <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                            <input type="text" placeholder="Bank Name" value={formData.bankName} onChange={e => handleInputChange('bankName', e.target.value)} className={inputClass} />
                            <input type="text" placeholder="Account Number" value={formData.accountNumber} onChange={e => handleInputChange('accountNumber', e.target.value)} className={inputClass} />
                            <input type="text" placeholder="IFSC Code" value={formData.ifscCode} onChange={e => handleInputChange('ifscCode', e.target.value)} className={inputClass} />
                            <label className="flex items-center gap-3 text-sm text-gray-600 cursor-pointer pt-2 font-medium">
                              <input type="checkbox" checked={formData.hasGst} onChange={e => handleInputChange('hasGst', e.target.checked)} className="accent-[#40716F] w-4 h-4" />
                              I possess a GSTIN number
                            </label>
                            {formData.hasGst && <input type="text" placeholder="GSTIN Number" value={formData.gstNumber} onChange={e => handleInputChange('gstNumber', e.target.value)} className={inputClass} />}
                          </div>
                        )}

                        {currentStep === 5 && (
                          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <p className="text-sm text-gray-600 leading-relaxed bg-[#40716F]/5 p-4 rounded-xl border border-[#40716F]/20">
                              By finalizing registration, you agree to TailCircle's standard commission rules and escrow settlement terms.
                            </p>
                            <label className="flex items-center gap-3 text-sm text-gray-600 cursor-pointer">
                              <input type="checkbox" required className="accent-[#40716F] w-4 h-4" />
                              I agree to the <span className="text-[#40716F] underline">Terms & Privacy Policy</span>
                            </label>
                          </div>
                        )}
                      </div>

                      {/* Step Navigation */}
                      <div className="pt-6 flex flex-col gap-4">
                        {currentStep < 5 ? (
                          <button type="button" onClick={handleNextStep} className="w-full py-3.5 bg-[#40716F] text-white rounded-lg text-sm font-medium hover:bg-[#335A58] transition-all cursor-pointer shadow-sm active:scale-95 text-center">
                            Continue
                          </button>
                        ) : (
                          <button type="button" onClick={handleSignupComplete} className="w-full py-3.5 bg-[#40716F] text-white rounded-lg text-sm font-medium hover:bg-[#335A58] transition-all cursor-pointer shadow-sm active:scale-95 text-center">
                            Sign Up
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