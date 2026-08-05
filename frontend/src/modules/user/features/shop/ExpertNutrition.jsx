import React, { useState } from 'react';
import { ArrowLeft, PhoneCall, Stethoscope, FileText, TrendingUp, CheckCircle2, PawPrint } from 'lucide-react';

export function ExpertNutrition({ onClose }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleBookCall = (e) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.length < 10) return;
    
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 1500);
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-[#FAF7F2] animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
          {/* Confetti / bg elements */}
          <div className="absolute top-1/4 left-4 text-green-400/20 rotate-12"><PawPrint size={40} /></div>
          <div className="absolute bottom-1/3 right-8 text-green-400/20 -rotate-12"><PawPrint size={32} /></div>

          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-[0_8px_30px_rgba(74,222,128,0.3)] border-[4px] border-white relative z-10">
            <CheckCircle2 size={48} className="text-green-500" />
          </div>
          <h2 className="text-[28px] font-black text-gray-900 mb-3 tracking-tight relative z-10">Call Booked!</h2>
          <p className="text-[15px] font-medium text-gray-500 leading-relaxed max-w-[280px] relative z-10">
            Our expert will call you shortly on <span className="font-bold text-gray-800 border-b-2 border-green-200">{phoneNumber}</span> to discuss your pet's health.
          </p>
        </div>
        <div className="p-4 pb-8 border-t border-gray-100 bg-white">
          <button 
            onClick={onClose}
            className="w-full h-14 bg-[#66B4B1] text-white rounded-2xl font-black text-[16px] shadow-[0_4px_14px_rgba(102,180,177,0.4)] active:scale-[0.98] transition-transform"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#FAF7F2] animate-in slide-in-from-bottom-full duration-300">
      
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center sticky top-0 z-10 border-b border-gray-100 shadow-sm">
        <button 
          onClick={onClose}
          className="w-10 h-10 rounded-full flex items-center justify-center text-[#5A5552] hover:bg-[#5A5552]/5 active:scale-95 transition-all"
        >
          <ArrowLeft size={24} strokeWidth={2.5} />
        </button>
        <span className="font-extrabold text-[16px] text-[#5A5552] tracking-tight ml-2">
          Expert Nutrition Plan
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pb-52 bg-white">
        {/* Hero Banner Section */}
        <div className="relative">
          <div className="w-full h-[320px] bg-[#FAF7F2]">
            <img 
              src="/media/expert-nutrition-hero.png" 
              alt="Expert Nutrition" 
              className="w-full h-full object-cover object-top mix-blend-multiply" 
            />
            {/* Gradient overlay to smoothly transition to white content */}
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent"></div>
          </div>

          <div className="relative -mt-24 px-6 z-10 pb-6">
            <div className="inline-block px-3 py-1.5 bg-white shadow-sm border border-gray-100 rounded-xl text-[#F87B68] text-[10px] font-black uppercase tracking-widest mb-4">
              Premium Care
            </div>
            <h1 className="text-[32px] font-black leading-[1.1] text-gray-900 mb-3 tracking-tight">
              Speak to an expert,<br/>get a custom diet.
            </h1>
            <p className="text-gray-500 text-[14.5px] font-medium max-w-[90%] leading-relaxed">
              Give your pet a healthier, longer life with a diet plan crafted exactly for their needs.
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="p-5 pt-6">
          <h3 className="font-black text-gray-900 text-[18px] mb-6 tracking-tight flex items-center gap-2">
            How it works
          </h3>
          
          <div className="relative space-y-7 ml-1">
            {/* Connecting Line - precisely centered behind 48px icons */}
            <div className="absolute top-6 left-[23px] w-0 h-[calc(100%-48px)] border-l-2 border-dashed border-gray-300/70 z-0"></div>

            <div className="relative z-10 flex gap-4 items-start">
              <div className="w-12 h-12 rounded-[16px] bg-white border border-gray-100 shadow-[0_4px_10px_rgba(0,0,0,0.03)] flex items-center justify-center shrink-0">
                <PhoneCall size={22} className="text-[#66B4B1]" strokeWidth={2.5} />
              </div>
              <div className="pt-1.5">
                <h4 className="font-bold text-gray-900 text-[15px] mb-1 leading-none tracking-tight">Consultation Call</h4>
                <p className="text-[13px] text-gray-500 font-medium leading-relaxed">Our veterinary nutritionist will call you directly to start the process.</p>
              </div>
            </div>

            <div className="relative z-10 flex gap-4 items-start">
              <div className="w-12 h-12 rounded-[16px] bg-white border border-gray-100 shadow-[0_4px_10px_rgba(0,0,0,0.03)] flex items-center justify-center shrink-0">
                <Stethoscope size={22} className="text-[#F87B68]" strokeWidth={2.5} />
              </div>
              <div className="pt-1.5">
                <h4 className="font-bold text-gray-900 text-[15px] mb-1 leading-none tracking-tight">Medical Assessment</h4>
                <p className="text-[13px] text-gray-500 font-medium leading-relaxed">We understand their full medical condition including hereditary diseases, allergies, and body weight.</p>
              </div>
            </div>

            <div className="relative z-10 flex gap-4 items-start">
              <div className="w-12 h-12 rounded-[16px] bg-white border border-gray-100 shadow-[0_4px_10px_rgba(0,0,0,0.03)] flex items-center justify-center shrink-0">
                <FileText size={22} className="text-amber-500" strokeWidth={2.5} />
              </div>
              <div className="pt-1.5">
                <h4 className="font-bold text-gray-900 text-[15px] mb-1 leading-none tracking-tight">Custom Diet Chart</h4>
                <p className="text-[13px] text-gray-500 font-medium leading-relaxed">Get a personalized food chart along with required vitamins and supplements.</p>
              </div>
            </div>

            <div className="relative z-10 flex gap-4 items-start">
              <div className="w-12 h-12 rounded-[16px] bg-white border border-gray-100 shadow-[0_4px_10px_rgba(0,0,0,0.03)] flex items-center justify-center shrink-0">
                <TrendingUp size={22} className="text-purple-500" strokeWidth={2.5} />
              </div>
              <div className="pt-1.5">
                <h4 className="font-bold text-gray-900 text-[15px] mb-1 leading-none tracking-tight">Monthly Monitoring</h4>
                <p className="text-[13px] text-gray-500 font-medium leading-relaxed">We will track their progress every month and adjust the diet as needed.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Form CTA at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 p-4 pt-5 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <form onSubmit={handleBookCall} className="flex flex-col gap-3.5">
          
          <div className="relative flex items-center bg-[#FAF7F2] border border-gray-200 rounded-[16px] focus-within:border-[#F87B68] focus-within:ring-4 focus-within:ring-[#F87B68]/10 transition-all overflow-hidden">
            <div className="px-4 text-gray-500 font-extrabold text-[15px] border-r border-gray-200 bg-gray-50/50 py-3.5">
              +91
            </div>
            <input 
              type="tel" 
              placeholder="Enter mobile number" 
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
              maxLength={10}
              required
              className="w-full bg-transparent border-none py-3.5 px-4 font-bold text-gray-900 focus:outline-none focus:ring-0 text-[15px] placeholder:text-gray-400 placeholder:font-medium"
            />
          </div>

          <button 
            type="submit"
            disabled={isSubmitting || phoneNumber.length < 10}
            className="w-full h-14 bg-[#F87B68] hover:bg-[#F87B68]/90 disabled:bg-[#F87B68]/40 disabled:text-white/80 disabled:cursor-not-allowed disabled:shadow-none text-white rounded-[16px] font-black text-[16px] shadow-[0_8px_20px_rgba(248,123,104,0.3)] flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            {isSubmitting ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              "Book Plan • ₹299"
            )}
          </button>

        </form>
      </div>

    </div>
  );
}