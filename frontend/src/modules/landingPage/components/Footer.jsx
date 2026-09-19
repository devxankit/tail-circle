import React, { useState } from 'react';
import { ArrowRight, ArrowUp, CheckCircle2 } from 'lucide-react';
import { footerColumns } from '../data/landingData';

export function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 5000);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer id="contact" className="bg-[#FFFFFF] pt-16 sm:pt-20 pb-12 border-t border-black/5 text-left">
      <div className="lp-container">
        
        {/* Main Footer Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 pb-14 border-b border-black/10">
          
          {/* Brand & Mission Column */}
          <div className="lg:col-span-4 flex flex-col items-start">
            <a href="#" className="flex items-center gap-2.5 text-decoration-none group mb-4">
              <div className="w-10 h-10 rounded-full bg-[#12263A] text-white flex items-center justify-center font-black text-lg shadow-xs group-hover:scale-105 transition-transform">
                <span className="text-[#FFC928]">TC</span>
              </div>
              <div className="flex flex-col">
                <span className="font-black text-2xl text-[#12263A] leading-tight tracking-tight lp-font-heading">
                  Tail Circle
                </span>
                <span className="text-[10px] font-bold text-[#12263A]/70 uppercase tracking-[0.2em] -mt-0.5">
                  Lake Norman
                </span>
              </div>
            </a>

            <p className="text-sm text-[#4A5D6E] font-medium leading-relaxed mb-6 max-w-sm">
              Everything for your pet. All in one circle. Care, community, and joy for tomorrow across Lake Norman, NC.
            </p>

            {/* Social Icons with inline SVGs */}
            <div className="flex items-center gap-3">
              {/* Instagram */}
              <a
                href="#instagram"
                aria-label="Instagram"
                className="w-9 h-9 rounded-full bg-[#FAF9F6] hover:bg-[#12263A] text-[#12263A] hover:text-white flex items-center justify-center transition-all duration-300 shadow-xs text-decoration-none"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>

              {/* Facebook */}
              <a
                href="#facebook"
                aria-label="Facebook"
                className="w-9 h-9 rounded-full bg-[#FAF9F6] hover:bg-[#12263A] text-[#12263A] hover:text-white flex items-center justify-center transition-all duration-300 shadow-xs text-decoration-none"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.6 5H18V0h-3.808C10.597 0 9 1.582 9 4.615V8z" />
                </svg>
              </a>

              {/* LinkedIn */}
              <a
                href="#linkedin"
                aria-label="LinkedIn"
                className="w-9 h-9 rounded-full bg-[#FAF9F6] hover:bg-[#12263A] text-[#12263A] hover:text-white flex items-center justify-center transition-all duration-300 shadow-xs text-decoration-none"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Links Columns */}
          {footerColumns.map((col, idx) => (
            <div key={idx} className="lg:col-span-2 flex flex-col items-start">
              <span className="text-xs font-black uppercase tracking-wider text-[#12263A] mb-4 block lp-font-heading">
                {col.title}
              </span>
              <ul className="space-y-2.5 list-none p-0 m-0">
                {col.links.map((link, lIdx) => (
                  <li key={lIdx}>
                    <a
                      href={link.href}
                      className="text-xs sm:text-sm text-[#4A5D6E] hover:text-[#12263A] transition-colors font-medium text-decoration-none"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Newsletter Column */}
          <div className="lg:col-span-2 flex flex-col items-start">
            <span className="text-xs font-black uppercase tracking-wider text-[#12263A] mb-4 block lp-font-heading">
              Join Our Community
            </span>
            <p className="text-xs text-[#4A5D6E] leading-relaxed mb-4">
              Get the latest updates, events, and pet stories around Lake Norman.
            </p>

            {subscribed ? (
              <div className="p-3 bg-[#DDF4EC] text-[#0D9488] rounded-2xl text-xs font-bold flex items-center gap-2 w-full">
                <CheckCircle2 size={16} />
                <span>Welcome to the circle!</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="w-full space-y-2">
                <div className="relative w-full">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email address"
                    required
                    className="w-full bg-[#FAF9F6] border border-black/10 focus:border-[#12263A] text-[#12263A] text-xs rounded-xl px-3.5 py-2.5 pr-10 outline-none transition-colors"
                  />
                  <button
                    type="submit"
                    className="absolute right-1 top-1 bottom-1 px-2.5 bg-[#12263A] text-white rounded-lg flex items-center justify-center hover:bg-[#0A1927] transition-colors cursor-pointer border-0"
                    aria-label="Subscribe"
                  >
                    <ArrowRight size={14} />
                  </button>
                </div>
              </form>
            )}
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#7E92A2] font-medium m-0">
            © 2026 Tail Circle. All rights reserved. • Lake Norman, NC
          </p>

          <button
            onClick={scrollToTop}
            className="flex items-center gap-1.5 text-xs font-bold text-[#12263A] hover:text-[#0D9488] transition-colors cursor-pointer bg-transparent border-0 p-1"
          >
            <span>Back to top</span>
            <div className="w-6 h-6 rounded-full bg-[#FAF9F6] flex items-center justify-center">
              <ArrowUp size={12} />
            </div>
          </button>
        </div>

      </div>
    </footer>
  );
}
