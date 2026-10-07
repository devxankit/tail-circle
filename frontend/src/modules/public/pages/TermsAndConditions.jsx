import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  ShieldCheck, 
  AlertTriangle, 
  Heart, 
  Stethoscope, 
  ShoppingBag, 
  Home, 
  RotateCcw, 
  Scale, 
  ArrowRight,
  Mail,
  Phone,
  HelpCircle
} from 'lucide-react';
import { PublicHeader } from '../components/PublicHeader';
import { LandingFooter } from '../../landingPage/components/LandingFooter';

export function TermsAndConditions() {
  const [activeSection, setActiveSection] = useState('acceptance');

  useEffect(() => {
    document.title = 'Terms & Conditions — Tail Circle';
    window.scrollTo(0, 0);
  }, []);

  const sections = [
    { id: 'acceptance', title: '1. Acceptance & Eligibility' },
    { id: 'accounts', title: '2. Accounts & Pet Information' },
    { id: 'social', title: '3. Social Matchmaking & Community' },
    { id: 'vet', title: '4. Veterinary Telehealth Disclaimer' },
    { id: 'services', title: '5. Grooming, Daycare & Boarding' },
    { id: 'meals-shop', title: '6. TailShop & Meal Plans' },
    { id: 'adoption', title: '7. Adoption & Animal Welfare' },
    { id: 'payments', title: '8. Payments, Cancellations & Refunds' },
    { id: 'liability', title: '9. Limitation of Liability' },
    { id: 'governing-law', title: '10. Governing Law & Dispute Resolution' },
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

      {/* Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#FFF0ED]/40 via-[#FAFAF7] to-[#FAFAF7] border-b border-[#E0E1DC]/60 pt-12 pb-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#fcc8c3] shadow-xs text-[12px] font-bold text-[#F45B4B] uppercase tracking-wider">
            <Scale size={14} className="text-[#F45B4B]" />
            <span>Platform Service Agreement</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#151817] leading-tight">
            Terms &amp; Conditions
          </h1>

          <p className="text-base sm:text-lg text-[#69716E] max-w-2xl mx-auto leading-relaxed">
            Please read these terms carefully before exploring Tail Circle. They govern our relationship with pet parents, verified partners, and our community.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-[#69716E]">
            <span className="bg-white/80 px-3 py-1.5 rounded-lg border border-[#E0E1DC]">Effective Date: October 1, 2026</span>
            <span className="bg-white/80 px-3 py-1.5 rounded-lg border border-[#E0E1DC]">Last Revised: October 2026</span>
            <span className="bg-[#FFF0ED] text-[#F45B4B] px-3 py-1.5 rounded-lg font-bold border border-[#fcc8c3]">Version 3.1</span>
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-12 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Quick Navigation Sidebar */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-28 space-y-4">
            <div className="bg-white rounded-2xl border border-[#E0E1DC] p-5 shadow-xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#69716E] mb-3 flex items-center gap-2">
                <FileText size={14} />
                <span>Agreement Sections</span>
              </h2>
              <nav className="space-y-1">
                {sections.map((sec) => (
                  <button
                    key={sec.id}
                    onClick={() => scrollToSection(sec.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                      activeSection === sec.id
                        ? 'bg-[#FFF0ED] text-[#F45B4B] font-bold translate-x-1'
                        : 'text-[#5A5552] hover:bg-gray-50 hover:text-[#151817]'
                    }`}
                  >
                    <span>{sec.title}</span>
                    {activeSection === sec.id && <ArrowRight size={12} className="text-[#F45B4B]" />}
                  </button>
                ))}
              </nav>

              <div className="mt-6 pt-5 border-t border-gray-100 space-y-3">
                <div className="p-3.5 rounded-xl bg-[#E2F7F3] border border-[#BFE5DF]">
                  <div className="flex items-center gap-2 text-[#087F78] font-bold text-xs mb-1">
                    <ShieldCheck size={14} />
                    <span>Pet Welfare Standards</span>
                  </div>
                  <p className="text-[11.5px] text-[#5A5552] leading-snug">
                    Tail Circle strictly enforces the Prevention of Cruelty to Animals (PCA) guidelines across all vendors.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#2D3142] to-[#151817] text-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-sm mb-1">Questions on our terms?</h3>
              <p className="text-xs text-white/70 leading-relaxed mb-4">
                Our legal and customer grievance team responds within 24 hours.
              </p>
              <a
                href="mailto:legal@tailcircle.in"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white text-[#2D3142] font-bold text-xs hover:bg-gray-100 transition-colors shadow-xs"
              >
                <Mail size={13} />
                <span>legal@tailcircle.in</span>
              </a>
            </div>
          </aside>

          {/* Legal Agreement Content */}
          <article className="lg:col-span-8 bg-white rounded-3xl border border-[#E0E1DC] p-6 sm:p-10 shadow-xs space-y-10 leading-relaxed text-[#5A5552]">
            
            {/* Section 1 */}
            <section id="acceptance" className="space-y-4 scroll-mt-28">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFF0ED] text-[#F45B4B] flex items-center justify-center shrink-0 font-bold">
                  1
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[#151817] tracking-tight">
                  Acceptance of Terms &amp; Eligibility
                </h2>
              </div>
              <p className="text-[14.5px]">
                These Terms and Conditions constitute a legally binding agreement between you (whether individually or representing a pet household) and <strong>Tail Circle Pet Care Private Limited</strong> (<em>"Tail Circle"</em>, <em>"we"</em>, <em>"us"</em>).
              </p>
              <p className="text-[14.5px]">
                By registering, accessing, downloading, or using the Tail Circle platform, you confirm that:
              </p>
              <ul className="text-xs sm:text-sm space-y-2 list-disc list-inside text-[#69716E]">
                <li>You are at least 18 years of age and legally competent to enter into binding agreements.</li>
                <li>You are the lawful custodian, owner, or authorized foster guardian of the pets listed on your account.</li>
                <li>You agree to comply with all applicable local municipal pet registrations, immunization regulations, and animal welfare statutes.</li>
              </ul>
            </section>

            <hr className="border-gray-100" />

            {/* Section 2 */}
            <section id="accounts" className="space-y-4 scroll-mt-28">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFF0ED] text-[#F45B4B] flex items-center justify-center shrink-0 font-bold">
                  2
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[#151817] tracking-tight">
                  User Accounts &amp; Pet Profiles
                </h2>
              </div>
              <p className="text-[14.5px]">
                You are responsible for maintaining the confidentiality of your mobile OTP logins and account security. You agree to provide true, accurate, and current information regarding:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-[#FAFAF7] border border-[#E0E1DC]">
                  <strong>Accurate Health Records:</strong> Vaccinations (Rabies, DHPPi, Tricat) must be up-to-date and truthfully documented prior to booking daycare, boarding, or grooming.
                </div>
                <div className="p-3.5 rounded-xl bg-[#FAFAF7] border border-[#E0E1DC]">
                  <strong>Behavioral Disclosure:</strong> Any known aggression, leash reactivity, biting history, or medical conditions must be explicitly stated to protect handlers and other animals.
                </div>
              </div>
            </section>

            <hr className="border-gray-100" />

            {/* Section 3 */}
            <section id="social" className="space-y-4 scroll-mt-28">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFF0ED] text-[#F45B4B] flex items-center justify-center shrink-0 font-bold">
                  3
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[#151817] tracking-tight">
                  Social Matchmaking &amp; Community Rules
                </h2>
              </div>
              <p className="text-[14.5px]">
                Tail Circle provides interactive matching ("Swipes, Sniffs, and Soulmates") and community discussion feeds to help pet parents connect for playdates, park walks, and pet advice.
              </p>
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2 text-xs text-amber-900">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                  <span>Pet Meeting Safety Mandate:</span>
                </div>
                <p>
                  In-person playdates organized via our chat must always occur under direct, uninterrupted adult human supervision in secure or leashed public environments. Tail Circle is not responsible for behavioral disputes, pet fights, or injuries arising between pets during user-organized gatherings.
                </p>
              </div>
            </section>

            <hr className="border-gray-100" />

            {/* Section 4 */}
            <section id="vet" className="space-y-4 scroll-mt-28">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFF0ED] text-[#F45B4B] flex items-center justify-center shrink-0 font-bold">
                  4
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[#151817] tracking-tight">
                  Veterinary Telehealth Disclaimer
                </h2>
              </div>
              <div className="p-4 rounded-2xl bg-[#E2F7F3]/50 border border-[#BFE5DF] space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-[#087F78]">
                  <Stethoscope size={18} />
                  <span>Important Medical Notice</span>
                </div>
                <p className="text-xs text-[#5A5552] leading-relaxed">
                  Video and remote consultations provided by licensed veterinarians on Tail Circle are intended for general health triage, wellness assessments, behavioral counseling, and preventative dietary advice. <strong>Telehealth does not replace hands-on emergency veterinary intensive care.</strong> If your pet exhibits severe trauma, acute respiratory distress, severe bleeding, or poisoning, transport them immediately to a physical emergency animal hospital.
                </p>
              </div>
            </section>

            <hr className="border-gray-100" />

            {/* Section 5 */}
            <section id="services" className="space-y-4 scroll-mt-28">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFF0ED] text-[#F45B4B] flex items-center justify-center shrink-0 font-bold">
                  5
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[#151817] tracking-tight">
                  Grooming, Daycare &amp; Boarding Services
                </h2>
              </div>
              <p className="text-[14.5px]">
                Appointments scheduled with salon groomers, mobile grooming vans, and boarding stays are subject to vendor confirmation and facility rules:
              </p>
              <ul className="text-xs sm:text-sm space-y-2 list-disc list-inside text-[#69716E]">
                <li><strong>Vaccination Checks:</strong> Proof of current anti-rabies vaccination is mandatory prior to drop-off or home visit arrival.</li>
                <li><strong>Matting &amp; Flea Policies:</strong> Heavily matted coats or unmanaged flea/tick infestations may incur standard hygienic treatment surcharges agreed prior to service.</li>
                <li><strong>Late Pickups:</strong> Daycare facilities may assess customary hourly boarding fees for delayed pickups after scheduled closing hours.</li>
              </ul>
            </section>

            <hr className="border-gray-100" />

            {/* Section 6 */}
            <section id="meals-shop" className="space-y-4 scroll-mt-28">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFF0ED] text-[#F45B4B] flex items-center justify-center shrink-0 font-bold">
                  6
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[#151817] tracking-tight">
                  TailShop Products &amp; Fresh Meal Plans
                </h2>
              </div>
              <p className="text-[14.5px]">
                All fresh food subscription recipes are formulated using human-grade ingredients tailored to your pet's reported weight, breed, and age.
              </p>
              <p className="text-[14.5px]">
                You may modify dietary preferences, pause subscriptions, or update delivery addresses directly within the <em>Meals</em> tab up to 24 hours prior to the next scheduled kitchen preparation batch.
              </p>
            </section>

            <hr className="border-gray-100" />

            {/* Section 7 */}
            <section id="adoption" className="space-y-4 scroll-mt-28">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFF0ED] text-[#F45B4B] flex items-center justify-center shrink-0 font-bold">
                  7
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[#151817] tracking-tight">
                  Adoption Standards &amp; Animal Welfare
                </h2>
              </div>
              <div className="p-4 rounded-2xl bg-red-50/70 border border-red-200 space-y-2">
                <h4 className="font-bold text-xs text-red-900 uppercase tracking-wide">
                  Zero Tolerance for Puppy Mills &amp; Commercial Exploitation
                </h4>
                <p className="text-xs text-red-800 leading-relaxed">
                  Tail Circle is an ethical adoption and companion platform. Commercial puppy mills, illegal backyard breeding, cosmetic ear cropping, and inhumane declawing sales are strictly prohibited and will result in immediate permanent account termination and referral to the Animal Welfare Board.
                </p>
              </div>
            </section>

            <hr className="border-gray-100" />

            {/* Section 8 */}
            <section id="payments" className="space-y-4 scroll-mt-28">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFF0ED] text-[#F45B4B] flex items-center justify-center shrink-0 font-bold">
                  8
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[#151817] tracking-tight">
                  Payments, Cancellations &amp; Refunds
                </h2>
              </div>
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="p-3.5 rounded-xl bg-[#FAFAF7] border border-[#E0E1DC]">
                  <strong>Service Cancellations:</strong> Bookings canceled at least 24 hours prior to scheduled appointment time receive a 100% full refund to original payment method or wallet.
                </div>
                <div className="p-3.5 rounded-xl bg-[#FAFAF7] border border-[#E0E1DC]">
                  <strong>Shop Returns:</strong> Sealed, unopened pet supplies, toys, and non-perishable goods may be returned within 7 days of delivery. Perishable fresh meals cannot be restocked for hygiene reasons.
                </div>
                <div className="p-3.5 rounded-xl bg-[#FAFAF7] border border-[#E0E1DC]">
                  <strong>Refund Processing:</strong> Approved refunds are credited to your bank account or card within 5 to 7 business banking days.
                </div>
              </div>
            </section>

            <hr className="border-gray-100" />

            {/* Section 9 */}
            <section id="liability" className="space-y-4 scroll-mt-28">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFF0ED] text-[#F45B4B] flex items-center justify-center shrink-0 font-bold">
                  9
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[#151817] tracking-tight">
                  Limitation of Liability
                </h2>
              </div>
              <p className="text-[14.5px]">
                To the fullest extent permitted by applicable law, Tail Circle shall not be liable for indirect, punitive, incidental, or consequential damages resulting from user interactions, third-party vendor delays, animal behavior during peer-to-peer playdates, or courier transit disruptions. Our total liability for any claim shall not exceed the amount paid by you for the specific booking or order giving rise to such claim.
              </p>
            </section>

            <hr className="border-gray-100" />

            {/* Section 10 */}
            <section id="governing-law" className="space-y-4 scroll-mt-28">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFF0ED] text-[#F45B4B] flex items-center justify-center shrink-0 font-bold">
                  10
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[#151817] tracking-tight">
                  Governing Law &amp; Dispute Resolution
                </h2>
              </div>
              <p className="text-[14.5px]">
                These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising out of or in connection with these terms shall be subject to the exclusive jurisdiction of the competent courts in Bengaluru, Karnataka, India.
              </p>
            </section>

            {/* Bottom Navigation */}
            <div className="pt-6 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
              <Link
                to="/privacy"
                className="inline-flex items-center gap-2 text-xs font-bold text-[#087F78] hover:underline"
              >
                <span>Read our Privacy Policy</span>
                <ArrowRight size={14} />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 text-xs font-bold text-[#F45B4B] hover:underline"
              >
                <span>Need Assistance? Contact Us</span>
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

export default TermsAndConditions;
