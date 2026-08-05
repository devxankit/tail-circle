import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Phone, Hash } from 'lucide-react';
import { requestOtp, verifyOtp } from '../../../../services/auth';

export function Login() {
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

  const handleLogin = async (e) => {
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
    <div className="flex flex-col min-h-[100dvh] w-full bg-[#FAF7F2] relative overflow-hidden font-sans">
      
      {/* Top Image - Anchored to top right */}
      <div className="absolute -top-8 -right-8 w-[90%] max-w-[400px] z-0 pointer-events-none">
        <img 
          src="/assets/onboarding/dog_food_bowl.png" 
          alt="Dog food" 
          className="w-full h-auto object-contain mix-blend-multiply opacity-90"
          style={{
            WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 75%)',
            maskImage: 'radial-gradient(circle at center, black 40%, transparent 75%)'
          }}
        />
      </div>

      {/* Back button */}
      <div className="pt-8 px-6 relative z-20 shrink-0">
        <button 
          onClick={() => navigate(-1)} 
          className="w-10 h-10 bg-white/80 backdrop-blur-md rounded-[12px] border border-white/40 shadow-[0_4px_15px_rgba(0,0,0,0.05)] flex items-center justify-center text-[#4C8684] active:scale-95 transition-all hover:bg-white"
        >
          <span className="text-[1.4rem] font-bold leading-none -translate-y-[2px] -translate-x-[1px]">&#8249;</span>
        </button>
      </div>

      {/* Welcome Back Text */}
      <div className="mt-8 mb-4 px-8 relative z-10 shrink-0">
        <h1 className="text-[2.2rem] min-[360px]:text-[2.6rem] min-[385px]:text-[3rem] font-black tracking-tight leading-[1.05] text-[#4C8684]">
          Welcome<br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#599D9A] to-[#80C1BF]">Back!</span>
        </h1>
        <p className="text-[#66B4B1] font-medium text-[14px] mt-3 max-w-[75%] leading-relaxed">
          Log in to continue managing your pet's wonderful journey.
        </p>
      </div>

      {/* Main Content Area - Taking remaining space */}
      <div className="w-full px-8 pb-6 flex flex-col flex-1 relative z-20">
        
        {/* Spacer that pushes everything below it DOWN */}
        <div className="flex-1 min-h-[1rem]"></div>

        {/* Login Form Wrapper */}
        <div className="shrink-0 mb-10">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[1.5rem] font-bold text-[#599D9A]">Login</h3>
          </div>
          
          <form onSubmit={handleLogin} className="flex flex-col gap-3 shrink-0">
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
                className={`w-full pl-[5.5rem] pr-4 py-[0.85rem] rounded-xl border-[1.5px] border-[#FAF7F2] outline-none text-[#4C8684] font-semibold placeholder-[#5A5552] transition-all text-[14px] bg-white shadow-sm ${otpSent ? 'opacity-70 bg-gray-50' : 'focus:border-[#599D9A] focus:bg-[#FAF7F2] focus:shadow-[0_0_0_4px_rgba(22,121,107,0.12)]'}`}
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
                      className="w-12 h-12 text-center text-[1.4rem] font-bold rounded-xl border-[1.5px] border-[#FAF7F2] focus:border-[#599D9A] focus:bg-[#FAF7F2] focus:shadow-[0_0_0_4px_rgba(22,121,107,0.12)] outline-none transition-all text-[#4C8684] bg-white shadow-sm"
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
              className="w-full mt-3 py-[0.9rem] rounded-xl font-bold text-white text-[15px] bg-[#599D9A] shadow-[0_6px_20px_rgba(22,121,107,0.25)] active:scale-95 transition-all hover:bg-[#599D9A] hover:shadow-[0_4px_15px_rgba(22,121,107,0.25)] shrink-0 disabled:opacity-70"
            >
              {isLoading ? 'Please wait...' : (!otpSent ? 'Send OTP' : 'Verify & Log In')}
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
        </div>

        {/* Social Logins */}
        <div className="flex flex-col items-center shrink-0 mb-6 mt-auto">
          <div className="flex items-center gap-3 w-full mb-4 opacity-70">
            <div className="flex-1 h-[1px] bg-gray-300"></div>
            <p className="text-[12px] font-bold tracking-widest text-gray-500 uppercase">Or login with</p>
            <div className="flex-1 h-[1px] bg-gray-300"></div>
          </div>
          <div className="flex justify-center gap-5">
            <button type="button" className="w-[3.5rem] h-[3.5rem] bg-white rounded-full shadow-[0_4px_15px_rgba(0,0,0,0.06)] flex items-center justify-center active:scale-95 transition-transform border border-gray-100 hover:bg-[#FAF7F2]">
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-6 h-6" alt="Google" />
            </button>
            <button type="button" className="w-[3.5rem] h-[3.5rem] bg-white rounded-full shadow-[0_4px_15px_rgba(0,0,0,0.06)] flex items-center justify-center active:scale-95 transition-transform border border-gray-100 hover:bg-[#FAF7F2]">
              <img src="https://www.svgrepo.com/show/475647/facebook-color.svg" className="w-6 h-6" alt="Facebook" />
            </button>
            <button type="button" className="w-[3.5rem] h-[3.5rem] bg-white rounded-full shadow-[0_4px_15px_rgba(0,0,0,0.06)] flex items-center justify-center active:scale-95 transition-transform border border-gray-100 hover:bg-[#FAF7F2]">
              <img src="https://www.svgrepo.com/show/511330/apple-173.svg" className="w-6 h-6" alt="Apple" />
            </button>
          </div>
        </div>

        <div className="text-center shrink-0 pb-safe">
          <p className="text-[14px] font-medium text-[#66B4B1]">
            New to TailCircle? <Link to="/auth/signup" className="text-[#599D9A] font-bold ml-1 hover:underline">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
