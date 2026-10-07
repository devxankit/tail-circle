import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  Lock, 
  Eye, 
  UserCheck, 
  FileText, 
  Mail, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Cookie, 
  Smartphone, 
  HeartHandshake,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { PublicHeader } from '../components/PublicHeader';
import { LandingFooter } from '../../landingPage/components/LandingFooter';

export function PrivacyPolicy() {
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    document.title = 'Privacy Policy — Tail Circle';
    window.scrollTo(0, 0);
  }, []);

  const sections = [
    { id: 'overview', title: '1. Introduction & Overview' },
    { id: 'data-collected', title: '2. Information We Collect' },
    { id: 'data-usage', title: '3. How We Use Your Data' },
    { id: 'cookies', title: '4. Cookies & Tracking Choices' },
    { id: 'data-sharing', title: '5. Sharing & Third Parties' },
    { id: 'security', title: '6. Data Security & Retention' },
    { id: 'user-rights', title: '7. Your Rights & Choices' },
    { id: 'grievance', title: '8. Contact & Grievance Officer' },
  ];

  const scrollToSection = (id) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -100;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-[#151817] flex flex-col font-sans selection:bg-[#E2F7F3] selection:text-[#087F78]">
      <PublicHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#E2F7F3]/40 via-[#FAFAF7] to-[#FAFAF7] border-b border-[#E0E1DC]/60 pt-12 pb-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#BFE5DF] shadow-xs text-[12px] font-bold text-[#087F78] uppercase tracking-wider">
            <Shield size={14} className="text-[#087F78]" />
            <span>Privacy &amp; Data Transparency</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#151817] leading-tight">
            Tail Circle Privacy Policy
          </h1>

          <p className="text-base sm:text-lg text-[#69716E] max-w-2xl mx-auto leading-relaxed">
            We cherish your trust just as much as you cherish your pets. Learn how we collect, safeguard, and respect your personal information and pet profiles across our platform.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-[#69716E]">
            <span className="bg-white/80 px-3 py-1.5 rounded-lg border border-[#E0E1DC]">Effective Date: October 1, 2026</span>
            <span className="bg-white/80 px-3 py-1.5 rounded-lg border border-[#E0E1DC]">Last Revised: October 2026</span>
            <span className="bg-[#E2F7F3] text-[#087F78] px-3 py-1.5 rounded-lg font-bold border border-[#BFE5DF]">Version 2.4</span>
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-12 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Sticky Quick Nav Sidebar (Desktop) */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-28 space-y-4">
            <div className="bg-white rounded-2xl border border-[#E0E1DC] p-5 shadow-xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#69716E] mb-3 flex items-center gap-2">
                <FileText size={14} />
                <span>Policy Contents</span>
              </h2>
              <nav className="space-y-1">
                {sections.map((sec) => (
                  <button
                    key={sec.id}
                    onClick={() => scrollToSection(sec.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                      activeSection === sec.id
                        ? 'bg-[#E2F7F3] text-[#087F78] font-bold translate-x-1'
                        : 'text-[#5A5552] hover:bg-gray-50 hover:text-[#151817]'
                    }`}
                  >
                    <span>{sec.title}</span>
                    {activeSection === sec.id && <ArrowRight size={12} className="text-[#087F78]" />}
                  </button>
                ))}
              </nav>

              <div className="mt-6 pt-5 border-t border-gray-100 space-y-3">
                <div className="p-3.5 rounded-xl bg-[#FFF0ED] border border-[#fcc8c3]">
                  <div className="flex items-center gap-2 text-[#F45B4B] font-bold text-xs mb-1">
                    <Cookie size={14} />
                    <span>Your Cookie Settings</span>
                  </div>
                  <p className="text-[11.5px] text-[#5A5552] leading-snug">
                    You can manage or revoke activity analytics at any time directly in your account.
                  </p>
                  <Link
                    to="/app/profile/privacy"
                    className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-[#F45B4B] hover:underline"
                  >
                    <span>Manage Privacy in App</span>
                    <ExternalLink size={11} />
                  </Link>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#087F78] to-[#006963] text-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-sm mb-1">Have a Privacy Question?</h3>
              <p className="text-xs text-white/80 leading-relaxed mb-4">
                Reach out to our Data Protection and Grievance desk at any time.
              </p>
              <a
                href="mailto:privacy@tailcircle.in"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white text-[#087F78] font-bold text-xs hover:bg-[#E2F7F3] transition-colors shadow-xs"
              >
                <Mail size={13} />
                <span>privacy@tailcircle.in</span>
              </a>
            </div>
          </aside>

          {/* Document Content */}
          <article className="lg:col-span-8 bg-white rounded-3xl border border-[#E0E1DC] p-6 sm:p-10 shadow-xs space-y-10 leading-relaxed text-[#5A5552]">
            
            {/* Section 1: Introduction */}
            <section id="overview" className="space-y-4 scroll-mt-28">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E2F7F3] text-[#087F78] flex items-center justify-center shrink-0 font-bold">
                  1
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[#151817] tracking-tight">
                  Introduction &amp; Overview
                </h2>
              </div>
              <p className="text-[14.5px]">
                Welcome to <strong>Tail Circle</strong> (referred to as <em>"Tail Circle"</em>, <em>"we"</em>, <em>"us"</em>, or <em>"our"</em>). Tail Circle operates the mobile web and desktop platform connecting pet owners with companion matches, licensed veterinarians, pet grooming salons, boarding &amp; daycare facilities, fresh pet nutrition kitchens, adoption shelters, memorial providers, and curated pet retail products.
              </p>
              <p className="text-[14.5px]">
                This Privacy Policy describes our practices concerning the collection, use, retention, disclosure, and protection of information obtained from visitors, registered pet owners, and service partners across our web domains (including <span className="text-[#087F78] font-mono font-semibold">tailcircle.in</span>) and native applications.
              </p>
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3">
                <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900 leading-relaxed">
                  <strong>Key Commitment:</strong> Tail Circle does not sell, rent, or trade your personal data or your pet’s health records to third-party data brokers or marketing aggregators. Information is used exclusively to facilitate pet care, social matching, safety, and order fulfillment.
                </p>
              </div>
            </section>

            <hr className="border-gray-100" />

            {/* Section 2: Information We Collect */}
            <section id="data-collected" className="space-y-4 scroll-mt-28">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E2F7F3] text-[#087F78] flex items-center justify-center shrink-0 font-bold">
                  2
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[#151817] tracking-tight">
                  Information We Collect
                </h2>
              </div>
              <p className="text-[14.5px]">
                To deliver a tailored, secure, and seamless experience for you and your pets, we collect the following categories of data:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-[#FAFAF7] border border-[#E0E1DC]">
                  <h3 className="font-bold text-sm text-[#151817] flex items-center gap-2 mb-2">
                    <UserCheck size={16} className="text-[#087F78]" />
                    <span>User Profile Information</span>
                  </h3>
                  <ul className="text-xs space-y-1.5 list-disc list-inside text-[#69716E]">
                    <li>Full name, mobile telephone number, email address</li>
                    <li>Residential addresses for delivery &amp; home visits</li>
                    <li>Account authentication credentials &amp; OTP tokens</li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAFAF7] border border-[#E0E1DC]">
                  <h3 className="font-bold text-sm text-[#151817] flex items-center gap-2 mb-2">
                    <HeartHandshake size={16} className="text-[#F45B4B]" />
                    <span>Pet Identity &amp; Health Records</span>
                  </h3>
                  <ul className="text-xs space-y-1.5 list-disc list-inside text-[#69716E]">
                    <li>Pet name, species, breed, age, gender, microchip ID</li>
                    <li>Vaccination certificates, medical history, dietary allergies</li>
                    <li>Temperament notes, playdate bio, and uploaded photos</li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAFAF7] border border-[#E0E1DC]">
                  <h3 className="font-bold text-sm text-[#151817] flex items-center gap-2 mb-2">
                    <MapPin size={16} className="text-[#087F78]" />
                    <span>Location &amp; Geo-Matching</span>
                  </h3>
                  <ul className="text-xs space-y-1.5 list-disc list-inside text-[#69716E]">
                    <li>Approximate location for nearby park playdates &amp; matches</li>
                    <li>Live GPS tracking during pet transit &amp; meal deliveries</li>
                    <li>Saved veterinary clinic &amp; grooming salon radiuses</li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAFAF7] border border-[#E0E1DC]">
                  <h3 className="font-bold text-sm text-[#151817] flex items-center gap-2 mb-2">
                    <Lock size={16} className="text-[#087F78]" />
                    <span>Transactions &amp; Payments</span>
                  </h3>
                  <ul className="text-xs space-y-1.5 list-disc list-inside text-[#69716E]">
                    <li>Order histories, service booking timestamps &amp; invoices</li>
                    <li>Tokenized payment gateway IDs (Razorpay/Stripe)</li>
                    <li><em>We do NOT store credit/debit card numbers or CVVs</em></li>
                  </ul>
                </div>
              </div>
            </section>

            <hr className="border-gray-100" />

            {/* Section 3: How We Use Your Data */}
            <section id="data-usage" className="space-y-4 scroll-mt-28">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E2F7F3] text-[#087F78] flex items-center justify-center shrink-0 font-bold">
                  3
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[#151817] tracking-tight">
                  How We Use Your Data
                </h2>
              </div>
              <p className="text-[14.5px]">
                Every data point collected serves an explicit operational purpose for the welfare and convenience of pets and pet owners:
              </p>
              <div className="space-y-2.5">
                {[
                  'Facilitating social pet compatibility matches, mutual chats, and community events.',
                  'Enabling telehealth video consults with certified veterinary surgeons and generating digital prescriptions.',
                  'Dispatching freshly formulated pet meals according to breed, age, weight, and allergy parameters.',
                  'Coordinating grooming, daycare, and boarding appointments with verified partner centers.',
                  'Screening adoption applicants to prevent neglect, abuse, or unauthorized commercial breeding.',
                  'Fraud prevention, platform integrity, and resolving transaction disputes.',
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm">
                    <CheckCircle2 size={16} className="text-[#087F78] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <hr className="border-gray-100" />

            {/* Section 4: Cookies & Tracking Choices */}
            <section id="cookies" className="space-y-4 scroll-mt-28">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E2F7F3] text-[#087F78] flex items-center justify-center shrink-0 font-bold">
                  4
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[#151817] tracking-tight">
                  Cookies &amp; Tracking Choices
                </h2>
              </div>
              <p className="text-[14.5px]">
                Tail Circle adopts an ethical, consent-first stance regarding cookies and tracking pixels:
              </p>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-[#151817]">Essential Cookies (Always Active)</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 uppercase">Non-Optional</span>
                  </div>
                  <p className="text-xs text-[#69716E]">
                    Required to keep you logged in securely, remember items in your shopping bag, and preserve your payment sessions. Without these, Tail Circle cannot function.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#E2F7F3]/40 border border-[#BFE5DF]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-[#087F78]">Activity &amp; Analytics (User Choice)</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#087F78] text-white uppercase">Opt-In Only</span>
                  </div>
                  <p className="text-xs text-[#5A5552]">
                    Understands feature popularity, search inquiries, and page latency so our engineering team can improve the app. <strong>We do not track analytics unless you actively click "Accept all" on our cookie banner.</strong>
                  </p>
                  <p className="text-xs text-[#087F78] font-bold mt-2">
                    You can toggle this off at any time under Settings &gt; Privacy &amp; Cookies, which immediately deletes historical device telemetry.
                  </p>
                </div>
              </div>
            </section>

            <hr className="border-gray-100" />

            {/* Section 5: Sharing & Third Parties */}
            <section id="data-sharing" className="space-y-4 scroll-mt-28">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E2F7F3] text-[#087F78] flex items-center justify-center shrink-0 font-bold">
                  5
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[#151817] tracking-tight">
                  Sharing &amp; Third Parties
                </h2>
              </div>
              <p className="text-[14.5px]">
                We share selective data only with verified partners strictly necessary to fulfill your booked services:
              </p>
              <ul className="text-xs sm:text-sm space-y-2 list-disc list-inside text-[#5A5552]">
                <li><strong>Veterinarians &amp; Clinics:</strong> Pet clinical records, symptoms, and consultation histories so the doctor can make informed medical judgments.</li>
                <li><strong>Groomers &amp; Daycares:</strong> Pet name, breed size, behavioral notes, and rabies vaccination status for handler safety.</li>
                <li><strong>Delivery &amp; Logistics Partners:</strong> Delivery address and recipient contact number for meal boxes and pet supplies.</li>
                <li><strong>Legal &amp; Animal Welfare Authorities:</strong> If required by court order, law enforcement, or Prevention of Cruelty to Animals (PCA) statutes.</li>
              </ul>
            </section>

            <hr className="border-gray-100" />

            {/* Section 6: Data Security & Retention */}
            <section id="security" className="space-y-4 scroll-mt-28">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E2F7F3] text-[#087F78] flex items-center justify-center shrink-0 font-bold">
                  6
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[#151817] tracking-tight">
                  Data Security &amp; Retention
                </h2>
              </div>
              <p className="text-[14.5px]">
                We employ industry-leading technical measures including TLS 1.3 encryption for data in transit, encrypted document storage for vaccination certificates, and role-based access control.
              </p>
              <p className="text-[14.5px]">
                We retain your account and pet information as long as your account remains active. If you request account closure, all profile pictures, social chats, and personal identifiers are permanently scrubbed within 30 days, retaining only legally mandated fiscal tax transaction records.
              </p>
            </section>

            <hr className="border-gray-100" />

            {/* Section 7: Your Rights & Choices */}
            <section id="user-rights" className="space-y-4 scroll-mt-28">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E2F7F3] text-[#087F78] flex items-center justify-center shrink-0 font-bold">
                  7
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[#151817] tracking-tight">
                  Your Rights &amp; Choices
                </h2>
              </div>
              <p className="text-[14.5px]">
                Under applicable digital personal data protection laws, you possess the right to:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-[#FAFAF7] border border-[#E0E1DC]">
                  <strong>1. Right to Access:</strong> Request a digital copy of all data and pet records stored on Tail Circle.
                </div>
                <div className="p-3.5 rounded-xl bg-[#FAFAF7] border border-[#E0E1DC]">
                  <strong>2. Right to Correction:</strong> Update outdated addresses, phone numbers, or pet medical history.
                </div>
                <div className="p-3.5 rounded-xl bg-[#FAFAF7] border border-[#E0E1DC]">
                  <strong>3. Right to Erasure:</strong> Delete your profile, pet listings, and historical match logs.
                </div>
                <div className="p-3.5 rounded-xl bg-[#FAFAF7] border border-[#E0E1DC]">
                  <strong>4. Right to Withdraw Consent:</strong> Revoke permission for marketing notifications and location tracking.
                </div>
              </div>
            </section>

            <hr className="border-gray-100" />

            {/* Section 8: Grievance Officer & Contact */}
            <section id="grievance" className="space-y-4 scroll-mt-28">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E2F7F3] text-[#087F78] flex items-center justify-center shrink-0 font-bold">
                  8
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[#151817] tracking-tight">
                  Contact &amp; Grievance Redressal
                </h2>
              </div>
              <p className="text-[14.5px]">
                In compliance with the Information Technology Act and Digital Personal Data Protection (DPDP) standards, the contact details of our Grievance Officer are set forth below:
              </p>

              <div className="p-5 rounded-2xl bg-[#FAFAF7] border border-[#E0E1DC] space-y-3 text-xs sm:text-sm">
                <div>
                  <h4 className="font-bold text-[#151817]">Grievance Officer: Legal &amp; Compliance Team</h4>
                  <p className="text-[#69716E]">Tail Circle Pet Care Private Limited</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-[#087F78]" />
                    <span><strong>Email:</strong> <a href="mailto:privacy@tailcircle.in" className="text-[#087F78] underline">privacy@tailcircle.in</a></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={16} className="text-[#087F78]" />
                    <span><strong>Phone:</strong> +91 90000 00000</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 pt-1 text-[#69716E]">
                  <MapPin size={16} className="text-[#087F78] shrink-0 mt-0.5" />
                  <span>Koramangala, Bengaluru, Karnataka 560034, India</span>
                </div>
              </div>
            </section>

            {/* Bottom Navigation */}
            <div className="pt-6 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
              <Link
                to="/terms"
                className="inline-flex items-center gap-2 text-xs font-bold text-[#087F78] hover:underline"
              >
                <span>Read our Terms &amp; Conditions</span>
                <ArrowRight size={14} />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 text-xs font-bold text-[#F45B4B] hover:underline"
              >
                <span>Contact Tail Circle Support</span>
                <ArrowRight size={14} />
              </Link>
            </div>

          </article>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}

export default PrivacyPolicy;
