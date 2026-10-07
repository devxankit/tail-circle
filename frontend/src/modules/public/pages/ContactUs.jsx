import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  Send, 
  CheckCircle2, 
  Sparkles, 
  MessageSquare, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Building2, 
  HeartHandshake, 
  ExternalLink,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { PublicHeader } from '../components/PublicHeader';
import { LandingFooter } from '../../landingPage/components/LandingFooter';

export function ContactUs() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    category: 'general',
    subject: '',
    message: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketRef, setTicketRef] = useState('');
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    document.title = 'Contact Us — Tail Circle';
    window.scrollTo(0, 0);
  }, []);

  const categories = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'booking', label: 'Booking or Service Help' },
    { value: 'partner', label: 'Vendor & Clinic Partnership' },
    { value: 'adoption', label: 'Adoption & Rescue Support' },
    { value: 'meals', label: 'Fresh Meal Plans & Allergies' },
    { value: 'feedback', label: 'Feedback & Suggestions' },
  ];

  const faqs = [
    {
      q: 'How do I book a telehealth vet consultation or grooming slot?',
      a: 'You can browse verified doctors or grooming packages right within the TailCircle mobile web app. Pick an available date and time slot, select your pet profile, and confirm checkout via UPI, card, or wallet.',
    },
    {
      q: 'Can I customize meal subscriptions for pets with strict allergies?',
      a: 'Yes! Our pet nutrition engine lets you exclude gluten, poultry, dairy, or specific protein sources. When subscribing to daily fresh meals, simply input your pet’s allergy details and our culinary team formulates meals accordingly.',
    },
    {
      q: 'How does our clinic, grooming salon, or shelter join TailCircle as a partner?',
      a: 'We welcome qualified veterinary surgeons, certified grooming stylists, daycare owners, and verified animal rescue shelters. Email partner@tailcircle.in or register via our vendor portal at /vendor/signup to start the verification process.',
    },
    {
      q: 'What is your refund policy if I need to cancel an appointment?',
      a: 'Appointments canceled at least 24 hours prior to the scheduled slot receive an immediate 100% full refund. You can request cancellations in your account under Profile > Bookings.',
    },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;

    setSubmitting(true);
    // Simulate server ingestion and ticket generation
    setTimeout(() => {
      const generatedCode = 'TC-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      setTicketRef(generatedCode);
      setSubmitting(false);
      setSubmitted(true);
    }, 900);
  };

  const handleReset = () => {
    setForm({
      name: '',
      email: '',
      phone: '',
      category: 'general',
      subject: '',
      message: '',
    });
    setSubmitted(false);
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-[#151817] flex flex-col font-sans selection:bg-[#E2F7F3] selection:text-[#087F78]">
      <PublicHeader />

      {/* Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#E2F7F3]/50 via-[#FAFAF7] to-[#FAFAF7] border-b border-[#E0E1DC]/60 pt-12 pb-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#BFE5DF] shadow-xs text-[12px] font-bold text-[#087F78] uppercase tracking-wider">
            <HeartHandshake size={14} className="text-[#087F78]" />
            <span>We&apos;re Here To Help</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#151817] leading-tight">
            Get in touch with Tail Circle
          </h1>

          <p className="text-base sm:text-lg text-[#69716E] max-w-2xl mx-auto leading-relaxed">
            Have questions about pet matchmaking, veterinary bookings, meal plans, or partnerships? Our dedicated pet care support team is ready to assist.
          </p>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-12 w-full space-y-14">
        
        {/* Direct Contact Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Customer Care */}
          <div className="bg-white rounded-3xl border border-[#E0E1DC] p-6 shadow-xs hover:border-[#BFE5DF] transition-all flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#E2F7F3] text-[#087F78] flex items-center justify-center group-hover:scale-105 transition-transform">
                <Mail size={22} />
              </div>
              <h3 className="font-extrabold text-lg text-[#151817]">Pet Parent Support</h3>
              <p className="text-xs text-[#69716E] leading-relaxed">
                For order updates, vet triage questions, booking inquiries, or app assistance.
              </p>
            </div>
            <div className="pt-5 mt-4 border-t border-gray-100 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#69716E]">Email Directly</span>
              <a 
                href="mailto:Contact@tailcircle.in" 
                className="block text-sm font-bold text-[#087F78] hover:underline"
              >
                Contact@tailcircle.in
              </a>
              <span className="text-[11px] text-gray-400 block">Avg. response within 2 hours</span>
            </div>
          </div>

          {/* Card 2: Partner / Business */}
          <div className="bg-white rounded-3xl border border-[#E0E1DC] p-6 shadow-xs hover:border-[#fcc8c3] transition-all flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#FFF0ED] text-[#F45B4B] flex items-center justify-center group-hover:scale-105 transition-transform">
                <Building2 size={22} />
              </div>
              <h3 className="font-extrabold text-lg text-[#151817]">Partner &amp; Vendors</h3>
              <p className="text-xs text-[#69716E] leading-relaxed">
                For veterinary clinics, certified groomers, daycares, animal shelters, and pet food kitchens.
              </p>
            </div>
            <div className="pt-5 mt-4 border-t border-gray-100 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#69716E]">Partner Desk</span>
              <a 
                href="mailto:Partner@tailcircle.in" 
                className="block text-sm font-bold text-[#F45B4B] hover:underline"
              >
                Partner@tailcircle.in
              </a>
              <span className="text-[11px] text-gray-400 block">Mon – Fri, 9:30 AM – 6:30 PM IST</span>
            </div>
          </div>

          {/* Card 3: Phone Helpline */}
          <div className="bg-white rounded-3xl border border-[#E0E1DC] p-6 shadow-xs hover:border-[#BFE5DF] transition-all flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#E2F7F3] text-[#087F78] flex items-center justify-center group-hover:scale-105 transition-transform">
                <Phone size={22} />
              </div>
              <h3 className="font-extrabold text-lg text-[#151817]">Call &amp; WhatsApp</h3>
              <p className="text-xs text-[#69716E] leading-relaxed">
                Speak directly with our concierge team for urgent booking assistance.
              </p>
            </div>
            <div className="pt-5 mt-4 border-t border-gray-100 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#69716E]">Helpline</span>
              <a 
                href="tel:+919000000000" 
                className="block text-sm font-bold text-[#087F78] hover:underline"
              >
                +91 90000 00000
              </a>
              <span className="text-[11px] text-gray-400 block">7 Days a week, 9 AM – 8 PM IST</span>
            </div>
          </div>

        </div>

        {/* Contact Form & Office Location Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Form Container */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-[#E0E1DC] p-6 sm:p-10 shadow-xs">
            <div className="mb-6">
              <h2 className="text-2xl font-black text-[#151817] tracking-tight">
                Send us a message
              </h2>
              <p className="text-xs sm:text-sm text-[#69716E] mt-1">
                Fill in the details below and our team will get back to you shortly.
              </p>
            </div>

            {submitted ? (
              <div className="p-8 text-center space-y-4 rounded-2xl bg-[#E2F7F3]/40 border border-[#BFE5DF] animate-in fade-in zoom-in-95 duration-200">
                <div className="w-14 h-14 rounded-full bg-[#087F78] text-white flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 size={28} />
                </div>
                <h3 className="text-xl font-black text-[#151817]">Message Received!</h3>
                <p className="text-xs sm:text-sm text-[#5A5552] max-w-md mx-auto leading-relaxed">
                  Thank you for reaching out. A confirmation has been registered with reference ID:
                </p>
                <div className="inline-block px-4 py-2 rounded-xl bg-white border border-[#BFE5DF] font-mono text-sm font-bold text-[#087F78] tracking-wider shadow-xs">
                  {ticketRef}
                </div>
                <p className="text-xs text-[#69716E]">
                  Our pet care specialists will respond to <strong>{form.email}</strong> within 2 hours.
                </p>
                <div className="pt-2">
                  <button
                    onClick={handleReset}
                    className="px-6 py-2.5 rounded-full bg-[#087F78] hover:bg-[#006963] text-white text-xs font-bold transition-all shadow-xs"
                  >
                    Send Another Message
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#151817] mb-1.5">
                      Your Full Name <span className="text-[#F45B4B]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full bg-[#FAFAF7] border border-[#E0E1DC] focus:border-[#087F78] rounded-xl px-4 py-3 text-xs sm:text-sm outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#151817] mb-1.5">
                      Email Address <span className="text-[#F45B4B]">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. rahul@example.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full bg-[#FAFAF7] border border-[#E0E1DC] focus:border-[#087F78] rounded-xl px-4 py-3 text-xs sm:text-sm outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#151817] mb-1.5">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. +91 98765 43210"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full bg-[#FAFAF7] border border-[#E0E1DC] focus:border-[#087F78] rounded-xl px-4 py-3 text-xs sm:text-sm outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#151817] mb-1.5">
                      Inquiry Category
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full bg-[#FAFAF7] border border-[#E0E1DC] focus:border-[#087F78] rounded-xl px-4 py-3 text-xs sm:text-sm outline-none transition-colors cursor-pointer"
                    >
                      {categories.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#151817] mb-1.5">
                    Subject
                  </label>
                  <input
                    type="text"
                    placeholder="Brief summary of your question"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full bg-[#FAFAF7] border border-[#E0E1DC] focus:border-[#087F78] rounded-xl px-4 py-3 text-xs sm:text-sm outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#151817] mb-1.5">
                    Your Message <span className="text-[#F45B4B]">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Tell us how we can help you and your pet..."
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full bg-[#FAFAF7] border border-[#E0E1DC] focus:border-[#087F78] rounded-xl px-4 py-3 text-xs sm:text-sm outline-none transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 rounded-2xl bg-[#087F78] hover:bg-[#006963] disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Sending Message...</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Send Message</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Right Info Sidebar */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Headquarters Card */}
            <div className="bg-white rounded-3xl border border-[#E0E1DC] p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FFF0ED] text-[#F45B4B] flex items-center justify-center shrink-0">
                  <MapPin size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#151817]">Corporate Headquarters</h3>
                  <span className="text-[11px] text-[#69716E]">Tail Circle Pet Care Pvt. Ltd.</span>
                </div>
              </div>

              <p className="text-xs text-[#5A5552] leading-relaxed">
                4th Block, 80 Feet Road, Koramangala,<br />
                Bengaluru, Karnataka 560034, India
              </p>

              <div className="pt-2 border-t border-gray-100 flex items-center gap-2 text-xs text-[#69716E]">
                <Clock size={14} className="text-[#087F78]" />
                <span>Office Hours: Mon – Fri, 9:00 AM – 6:00 PM IST</span>
              </div>
            </div>

            {/* In-App Support Prompt Card */}
            <div className="bg-gradient-to-br from-[#087F78] to-[#006963] text-white rounded-3xl p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-[#FFD54F]" />
                <h3 className="font-extrabold text-sm">Already a Registered User?</h3>
              </div>
              <p className="text-xs text-white/80 leading-relaxed">
                If you have an active booking or order, raise an in-app support ticket for instant dispatch tracking and live veterinarian consultation logs.
              </p>
              <Link
                to="/app/profile/support"
                className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-white text-[#087F78] font-bold text-xs hover:bg-[#E2F7F3] transition-colors shadow-xs"
              >
                <span>Go to In-App Support</span>
                <ExternalLink size={13} />
              </Link>
            </div>

            {/* Privacy & Legal Assurance */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex items-start gap-3">
              <ShieldCheck size={18} className="text-[#087F78] shrink-0 mt-0.5" />
              <div className="text-[11.5px] text-[#69716E] leading-relaxed">
                We never share your contact details or address with unverified parties. Review our{' '}
                <Link to="/privacy" className="text-[#087F78] font-semibold underline">
                  Privacy Policy
                </Link>{' '}
                and{' '}
                <Link to="/terms" className="text-[#087F78] font-semibold underline">
                  Terms of Service
                </Link>.
              </div>
            </div>

          </div>

        </div>

        {/* Frequently Asked Questions */}
        <div className="bg-white rounded-3xl border border-[#E0E1DC] p-6 sm:p-10 shadow-xs space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E2F7F3] text-[#087F78] text-[11px] font-bold">
              <HelpCircle size={13} />
              <span>Quick Answers</span>
            </div>
            <h2 className="text-2xl font-black text-[#151817]">Frequently Asked Questions</h2>
            <p className="text-xs sm:text-sm text-[#69716E]">
              Find quick answers to common questions about Tail Circle services.
            </p>
          </div>

          <div className="max-w-3xl mx-auto divide-y divide-gray-100">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="py-4">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between text-left gap-4 group focus:outline-none"
                  >
                    <span className="font-bold text-sm text-[#151817] group-hover:text-[#087F78] transition-colors">
                      {faq.q}
                    </span>
                    <span className="p-1 rounded-lg bg-gray-50 text-gray-400 group-hover:text-[#087F78] shrink-0">
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                  </button>
                  {isOpen && (
                    <p className="text-xs sm:text-sm text-[#5A5552] mt-3 leading-relaxed animate-in fade-in duration-200">
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </main>

      <LandingFooter />
    </div>
  );
}

export default ContactUs;
