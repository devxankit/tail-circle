import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { ArrowLeft } from 'lucide-react';
import { requestOtp, verifyOtp } from '../../../../services/auth';

/**
 * Standalone OTP step, for flows that collect the phone number on a previous
 * screen and navigate here with `{ state: { phone } }`.
 *
 * Login/Signup verify inline and never route here, so reaching this screen
 * without a phone in route state means someone opened /auth/otp directly —
 * there is nothing to verify against, so send them back to login rather than
 * letting the screen advance on its own.
 */
export function OtpVerify() {
  const navigate = useNavigate();
  const location = useLocation();
  const phone = location.state?.phone || '';

  const [otp, setOtp] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendIn, setResendIn] = useState(60); // matches the per-phone cooldown
  const inputRefs = [useRef(), useRef(), useRef(), useRef()];

  useEffect(() => {
    if (!phone) navigate('/auth/login', { replace: true });
  }, [phone, navigate]);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const t = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendIn > 0]);

  if (!phone) return null;

  const handleChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    if (!digit && value !== '') return;
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto-focus next input
    if (digit && index < 3) {
      inputRefs[index + 1].current.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1].current.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 4) {
      setError('Please enter the complete 4-digit OTP');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const { isNewUser } = await verifyOtp(phone, code);
      navigate(isNewUser ? '/onboarding/step1' : '/app/home', { replace: true });
    } catch (err) {
      setError(err.message);
      setOtp(['', '', '', '']);
      inputRefs[0].current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    try {
      await requestOtp(phone);
      setResendIn(60);
      setOtp(['', '', '', '']);
      inputRefs[0].current?.focus();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-8 animate-in slide-in-from-right duration-300">
      <div className="flex items-center space-x-2">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-bg-secondary transition-colors">
          <ArrowLeft size={24} className="text-text-primary" />
        </button>
      </div>

      <div className="flex flex-col space-y-2">
        <h1 className="text-2xl font-bold text-text-primary">Verify OTP</h1>
        <p className="text-text-secondary text-sm">
          We've sent a 4-digit code to <span className="font-semibold text-text-primary">{phone}</span>
        </p>
      </div>

      <div className="flex justify-between gap-4 py-8 px-2">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={inputRefs[index]}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="w-14 h-16 text-center text-2xl font-bold rounded-2xl border border-border-light focus:border-primary-main focus:ring-2 focus:ring-primary-main/20 outline-none transition-all"
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            maxLength={1}
          />
        ))}
      </div>

      {error && (
        <p className="text-center text-sm font-bold text-error animate-in fade-in duration-200">
          {error}
        </p>
      )}

      <Button onClick={handleVerify} isLoading={isLoading} className="w-full">
        Verify & Continue
      </Button>

      <div className="flex justify-center pt-6">
        {resendIn > 0 ? (
          <span className="text-sm font-medium text-text-secondary">
            Resend code in <span className="text-primary-main">
              00:{String(resendIn).padStart(2, '0')}
            </span>
          </span>
        ) : (
          <button
            onClick={handleResend}
            className="text-sm font-medium text-text-secondary hover:text-text-primary"
          >
            Didn't get it? <span className="text-primary-main font-bold">Resend code</span>
          </button>
        )}
      </div>
    </div>
  );
}
