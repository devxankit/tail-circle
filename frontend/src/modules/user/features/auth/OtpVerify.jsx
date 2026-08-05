import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { ArrowLeft } from 'lucide-react';

export function OtpVerify() {
  const navigate = useNavigate();
  const [otp, setOtp] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = [useRef(), useRef(), useRef(), useRef()];

  const handleChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1); // Prevent multiple chars
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs[index + 1].current.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1].current.focus();
    }
  };

  const handleVerify = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      navigate('/onboarding/step1'); // Proceed to Pet Onboarding
    }, 1500);
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
          We've sent a 4-digit code to <span className="font-semibold text-text-primary">+1 234 567 8900</span>
        </p>
      </div>

      <div className="flex justify-between gap-4 py-8 px-2">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={inputRefs[index]}
            type="number"
            className="w-14 h-16 text-center text-2xl font-bold rounded-2xl border border-border-light focus:border-primary-main focus:ring-2 focus:ring-primary-main/20 outline-none transition-all"
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            maxLength={1}
          />
        ))}
      </div>

      <Button onClick={handleVerify} isLoading={isLoading} className="w-full">
        Verify & Continue
      </Button>

      <div className="flex justify-center pt-6">
        <button className="text-sm font-medium text-text-secondary hover:text-text-primary">
          Resend code in <span className="text-primary-main">00:30</span>
        </button>
      </div>
    </div>
  );
}
