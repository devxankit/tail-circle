import React, { useState } from 'react';
import { ArrowLeft, Truck, Heart, Image, MessageSquare, Send, CheckCircle2, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function MemorialService() {
  const navigate = useNavigate();
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [petName, setPetName] = useState('');
  const [userName, setUserName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const servicesList = [
    {
      title: 'Home Pickup',
      desc: 'We come to you with care and dignity. Our team handles everything with the utmost respect for your family.',
      icon: <Truck size={22} className="text-[#599D9A]" />
    },
    {
      title: 'Cremation Services',
      desc: 'Peaceful, dignified cremation with your choice of private or communal service. Ashes returned in a keepsake urn.',
      icon: <Heart size={22} className="text-[#599D9A]" />
    },
    {
      title: 'Memorial Keepsakes',
      desc: 'Paw prints, portraits, and personalised urns to help you hold onto the memories that matter most.',
      icon: <Image size={22} className="text-[#599D9A]" />
    },
    {
      title: 'Grief Support',
      desc: 'Losing a companion is incredibly hard. Connect with support groups or counselors who specialize in pet loss.',
      icon: <MessageSquare size={22} className="text-[#599D9A]" />
    }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { api } = await import('../../../../services/api');
      await api.post('/bookings', {
        type: 'memorial',
        paymentMethod: 'pay_later',
        meta: {
          contact: { name: userName, phone, petName, message },
        },
      });
      setSubmissionSuccess(true);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not send your request — please try again or call us directly.');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#FAF7F2] absolute inset-0 z-50 animate-in slide-in-from-bottom-full text-[#4C8684]">
      {/* Top Header */}
      <div className="flex justify-between items-center px-5 py-4 sticky top-0 bg-[#FAF7F2]/90 backdrop-blur-md z-10 border-b border-gray-100/50">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors text-gray-900">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-[17px] font-black text-gray-900 tracking-tight">The Last Drive</h1>
        <button className="text-gray-400 hover:text-gray-700 p-2"><Info size={22} /></button>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar pb-10 px-5">
        
        {/* Banner Section */}
        <div className="mt-5 w-full bg-[#EFF7F7] rounded-[28px] p-6 relative overflow-hidden shadow-sm border border-slate-100/50">
          <div className="relative z-10 w-[70%]">
            <h2 className="text-[20px] font-black text-gray-900 leading-tight mb-2">Saying goodbye is never easy.</h2>
            <p className="text-[11.5px] min-[360px]:text-[12px] text-gray-600 font-extrabold leading-relaxed">
              Compassionate farewell services for your beloved pet — handled with love, dignity, and care. You only need to reach out, we take care of the rest.
            </p>
          </div>
          <div className="absolute right-0 bottom-0 w-[45%] h-full opacity-10 pointer-events-none">
            <Heart size={120} className="text-[#599D9A] absolute -bottom-6 -right-6" strokeWidth={1} />
          </div>
        </div>

        {/* Our Services List */}
        <div className="mt-8">
          <h3 className="text-lg font-black text-gray-900 mb-4 tracking-tight">Our Services</h3>
          <div className="flex flex-col gap-4">
            {servicesList.map((service, idx) => (
              <div 
                key={idx}
                className="bg-white rounded-[24px] p-5 flex gap-4 border border-slate-100/60 shadow-[0_4px_16px_rgba(0,0,0,0.02)]"
              >
                {/* Icon Wrapper */}
                <div className="w-12 h-12 rounded-[18px] bg-[#EFF7F7] flex items-center justify-center shrink-0">
                  {service.icon}
                </div>
                {/* Text Content */}
                <div className="flex flex-col justify-center">
                  <h4 className="text-base font-black text-gray-900 leading-none mb-1.5">{service.title}</h4>
                  <p className="text-[12px] text-gray-500 font-bold leading-normal">{service.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Talk to Us Form */}
        <div className="mt-10 bg-white rounded-[28px] p-6 border border-slate-100/60 shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
          <div className="mb-5">
            <h3 className="text-[20px] font-black text-gray-900 leading-none">Talk to Us</h3>
            <p className="text-[12px] text-gray-500 font-bold mt-2 leading-relaxed">
              Provide details below and our care team will contact you shortly.
            </p>
          </div>

          {submissionSuccess ? (
            <div className="py-8 flex flex-col items-center text-center animate-in zoom-in duration-300">
              <div className="w-16 h-16 rounded-full bg-[#599D9A]/10 text-[#599D9A] flex items-center justify-center mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h4 className="text-[18px] font-black text-gray-900">Request Sent Successfully</h4>
              <p className="text-[12.5px] text-gray-600 font-bold mt-2 leading-relaxed px-4">
                Thank you for reaching out. Our support team responds with deep care and will contact you shortly.
              </p>
              <button 
                onClick={() => {
                  setSubmissionSuccess(false);
                  setPetName('');
                  setUserName('');
                  setPhone('');
                  setMessage('');
                }}
                className="mt-6 w-full py-3.5 bg-[#599D9A] hover:bg-[#4C8684] text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer"
              >
                Send Another Request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Pet Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-black text-gray-700">Pet Name (optional)</label>
                <input 
                  type="text"
                  placeholder="e.g. Bruno"
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  className="w-full bg-[#F5F6FA] border border-transparent focus:border-[#599D9A] focus:bg-white rounded-xl py-3.5 px-4 outline-none text-[13px] font-bold placeholder:text-gray-400 placeholder:font-semibold transition-all"
                />
              </div>

              {/* Your Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-black text-gray-700">Your Name *</label>
                <input 
                  type="text"
                  required
                  placeholder="Your full name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-[#F5F6FA] border border-transparent focus:border-[#599D9A] focus:bg-white rounded-xl py-3.5 px-4 outline-none text-[13px] font-bold placeholder:text-gray-400 placeholder:font-semibold transition-all"
                />
              </div>

              {/* Phone Number */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-black text-gray-700">Phone Number *</label>
                <input 
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#F5F6FA] border border-transparent focus:border-[#599D9A] focus:bg-white rounded-xl py-3.5 px-4 outline-none text-[13px] font-bold placeholder:text-gray-400 placeholder:font-semibold transition-all"
                />
              </div>

              {/* Message */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-black text-gray-700">Message (optional)</label>
                <textarea 
                  rows={3}
                  placeholder="Anything you'd like us to know..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-[#F5F6FA] border border-transparent focus:border-[#599D9A] focus:bg-white rounded-xl py-3.5 px-4 outline-none text-[13px] font-bold placeholder:text-gray-400 placeholder:font-semibold transition-all resize-none"
                />
              </div>

              {error && (
                <p className="text-[12px] text-red-600 font-bold bg-red-50 border border-red-100 rounded-xl p-3 text-center">{error}</p>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="mt-2 w-full py-3.5 bg-[#EAE6DF] hover:bg-[#DED9CE] text-[#8C8476] font-black text-[13px] rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <Send size={15} className="rotate-45" />
                <span>Send Support Request</span>
              </button>

              {/* Privacy Footer */}
              <p className="text-[11px] text-gray-400 text-center leading-normal mt-2 px-4 font-semibold">
                All conversations are kept private. Our team is trained in pet loss support and will respond with empathy and care.
              </p>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
