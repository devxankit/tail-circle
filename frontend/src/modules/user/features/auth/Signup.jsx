import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Phone, Hash } from 'lucide-react';
import { requestOtp, verifyOtp } from '../../../../services/auth';

export function Signup() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const otpRefs = useRef([]);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const t = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendIn > 0]);

  const sendOtp = async () => {
    setIsLoading(true);
    setError('');
    try {
      await requestOtp(phoneNumber);
      setOtpSent(true);
      setResendIn(60); // matches the server-side per-phone cooldown
      setOtp(['', '', '', '']);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneChange = (e) => {
    const cleaned = e.target.value.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      setPhoneNumber(cleaned);
    }
  };

  const handleOtpChange = (index, value) => {
    const cleanValue = value.replace(/\D/g, '');
    if (!cleanValue && value !== '') return;

    const newOtp = [...otp];
    newOtp[index] = cleanValue;
    setOtp(newOtp);

    // Auto-focus next input if a number is entered
    if (cleanValue && index < 3) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        otpRefs.current[index - 1]?.focus();
      } else if (otp[index]) {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!otpSent) {
      if (phoneNumber.length !== 10) {
        setError('Enter your 10-digit phone number');
        return;
      }
      await sendOtp();
      return;
    }

    const code = otp.join('');
    if (code.length < 4) {
      setError('Please enter the complete 4-digit OTP');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const { isNewUser } = await verifyOtp(phoneNumber, code);
      navigate(isNewUser ? '/onboarding/step1' : '/app/home');
    } catch (err) {
      setError(err.message);
      setOtp(['', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[#FAF7F2] relative overflow-hidden font-sans">
      
      {/* HD Background Image (Dog, Yellow Circle, Treats) */}
      <div className="absolute -top-[10%] left-0 w-full h-[120%] z-0 pointer-events-none">
        <img 
          src="/assets/onboarding/signup_bg_hd.png" 
          alt="Premium Background" 
          className="w-full h-full object-cover object-top mix-blend-multiply opacity-95"
        />
      </div>

      {/* Back button */}
      <div className="absolute top-6 left-5 z-30 shrink-0">
        <button 
          onClick={() => navigate(-1)} 
          className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-[12px] shadow-[0_4px_15px_rgba(0,0,0,0.08)] flex items-center justify-center text-[#4C8684] active:scale-95 transition-transform"
        >
          <span className="text-[1.4rem] font-bold leading-none -translate-y-[2px] -translate-x-[1px]">&#8249;</span>
        </button>
      </div>

      {/* Push content to bottom */}
      <div className="flex-1 shrink-0"></div>

      {/* Floating White Card Section */}
      <div className="bg-white/95 backdrop-blur-md rounded-[2.2rem] w-[92%] mx-auto mb-5 px-6 py-5 shadow-[0_15px_40px_rgba(22,121,107,0.15)] flex flex-col relative z-20 shrink-0">
        
        <h3 className="text-[1.5rem] font-bold text-[#599D9A] mb-3">Sign up</h3>
        
        {/* Social Logins */}
        <div className="flex justify-center gap-4 mb-3 shrink-0">
          <button type="button" className="w-[2.8rem] h-[2.8rem] bg-white rounded-[14px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] flex items-center justify-center active:scale-95 transition-transform border border-gray-100 hover:bg-[#FAF7F2]">
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
          </button>
          <button type="button" className="w-[2.8rem] h-[2.8rem] bg-white rounded-[14px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] flex items-center justify-center active:scale-95 transition-transform border border-gray-100 hover:bg-[#FAF7F2]">
            <img src="https://www.svgrepo.com/show/475647/facebook-color.svg" className="w-5 h-5" alt="Facebook" />
          </button>
          <button type="button" className="w-[2.8rem] h-[2.8rem] bg-white rounded-[14px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] flex items-center justify-center active:scale-95 transition-transform border border-gray-100 hover:bg-[#FAF7F2]">
            <img src="https://www.svgrepo.com/show/511330/apple-173.svg" className="w-5 h-5" alt="Apple" />
          </button>
        </div>

        {/* Divider Text */}
        <div className="text-center mb-2 shrink-0">
          <p className="text-[11px] font-bold tracking-wide text-[#F87B68]">Or, register with phone number</p>
        </div>

        {/* Signup Form */}
        <form onSubmit={handleSignup} className="flex flex-col gap-2.5 shrink-0">
          {/* Phone Input */}
          <div className="relative flex items-center">
            <Phone size={16} className="absolute left-5 text-[#5A5552]" />
            <div className="absolute left-[2.8rem] text-[#4C8684] font-bold text-[14px] border-r border-[#FAF7F2] pr-2">+91</div>
            <input 
              type="tel" 
              placeholder="Phone Number" 
              required
              value={phoneNumber}
              onChange={handlePhoneChange}
              disabled={otpSent}
              className={`w-full pl-[5.5rem] pr-4 py-[0.9rem] rounded-[1rem] border-[1.5px] border-[#FAF7F2] outline-none text-[#4C8684] font-semibold placeholder-[#5A5552] transition-all text-[14px] bg-white ${otpSent ? 'opacity-70 bg-gray-50' : 'focus:border-[#599D9A] focus:bg-[#FAF7F2] focus:shadow-[0_0_0_4px_rgba(22,121,107,0.12)]'}`}
            />
            {otpSent && (
              <button type="button" onClick={() => setOtpSent(false)} className="absolute right-4 text-[12px] font-bold text-[#599D9A] hover:underline">
                Edit
              </button>
            )}
          </div>

          {/* OTP Input */}
          {otpSent && (
            <div className="flex flex-col gap-2 my-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-[12px] font-bold text-[#599D9A] tracking-wide text-center mb-1">
                Enter 4-digit OTP
              </label>
              <div className="flex justify-center gap-4">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => otpRefs.current[index] = el}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-12 h-12 text-center text-[1.4rem] font-bold rounded-[1rem] border-[1.5px] border-[#FAF7F2] focus:border-[#599D9A] focus:bg-[#FAF7F2] focus:shadow-[0_0_0_4px_rgba(22,121,107,0.12)] outline-none transition-all text-[#4C8684] bg-white shadow-sm"
                  />
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-center text-[12px] font-bold text-[#F87B68] animate-in fade-in duration-200">
              {error}
            </p>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-1 py-[0.95rem] rounded-[1rem] font-bold text-white text-[15px] bg-[#599D9A] shadow-[0_8px_25px_rgba(22,121,107,0.35)] active:scale-95 transition-all hover:bg-[#599D9A] shrink-0 disabled:opacity-70"
          >
            {isLoading ? 'Please wait...' : (!otpSent ? 'Send OTP' : 'Verify & Register')}
          </button>

          {otpSent && !isLoading && (
            <p className="text-center text-[12px] text-[#66B4B1] mt-1 font-medium animate-in fade-in duration-300">
              Didn't receive code?
              {resendIn > 0 ? (
                <span className="text-[#4C8684] font-bold ml-1">Resend in {resendIn}s</span>
              ) : (
                <button type="button" onClick={sendOtp} className="text-[#4C8684] font-bold ml-1">Resend</button>
              )}
            </p>
          )}
        </form>

        <div className="text-center mt-3 mb-1 shrink-0 pb-safe">
          <p className="text-[12px] font-medium text-[#66B4B1]">
            Already have an account? <Link to="/auth/login" className="text-[#599D9A] font-bold ml-1 hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
