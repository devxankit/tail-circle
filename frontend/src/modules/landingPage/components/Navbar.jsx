import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Menu, X, ArrowRight, Stethoscope, Scissors, ShoppingBag, Utensils, Calendar, HeartHandshake, Home } from 'lucide-react';
import { serviceDropdownItems } from '../data/landingData';

const iconMap = {
  Stethoscope,
  Scissors,
  ShoppingBag,
  Utensils,
  Calendar,
  HeartHandshake,
  Home,
};

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsServicesOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm py-3 border-b border-black/5'
          : 'bg-transparent py-4 sm:py-5'
      }`}
    >
      <div className="lp-container flex items-center justify-between">
        {/* Brand Logo */}
        <a href="#" className="flex items-center gap-3 text-decoration-none group">
          <img
            src="/logo/Tail-removebg-preview.png"
            alt="Tail Circle Logo"
            className="w-10 h-10 object-contain drop-shadow-sm group-hover:scale-105 transition-transform"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <div className="flex items-center gap-2.5">
            <span className="font-extrabold text-xl sm:text-2xl text-[#12263A] leading-none tracking-tight lp-font-heading">
              Tail Circle
            </span>
            <div className="w-[1.5px] h-5 bg-[#FFC928]" />
            <span className="text-[10px] sm:text-[11px] font-bold text-[#12263A] uppercase tracking-[0.18em]">
              Lake Norman
            </span>
          </div>
        </a>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-8">
          {/* Services Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsServicesOpen(!isServicesOpen)}
              onMouseEnter={() => setIsServicesOpen(true)}
              className="flex items-center gap-1.5 text-[#12263A] font-bold text-sm hover:text-[#12263A]/75 transition-colors py-2 cursor-pointer border-0 bg-transparent"
              aria-expanded={isServicesOpen}
            >
              <span>Our Services</span>
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 ${
                  isServicesOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {isServicesOpen && (
              <div
                onMouseLeave={() => setIsServicesOpen(false)}
                className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-72 bg-white rounded-2xl shadow-2xl p-3 border border-[#12263A]/10 animate-in fade-in slide-in-from-top-2 duration-200 z-50"
              >
                <div className="text-[11px] font-bold text-[#7E92A2] uppercase tracking-wider px-3 py-1 mb-1">
                  Tail Circle Services
                </div>
                <div className="flex flex-col gap-1">
                  {serviceDropdownItems.map((item) => {
                    const IconComponent = iconMap[item.icon] || Stethoscope;
                    return (
                      <a
                        key={item.id}
                        href={item.href}
                        onClick={() => setIsServicesOpen(false)}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#FFF8EA] transition-all group/item text-decoration-none"
                      >
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center transition-transform group-hover/item:scale-110"
                          style={{ backgroundColor: item.bg, color: item.color }}
                        >
                          <IconComponent size={18} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-[#12263A]">
                            {item.title}
                          </span>
                          <span className="text-[11px] text-[#4A5D6E]">
                            {item.subtitle}
                          </span>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <a
            href="#about"
            className="text-[#12263A] font-bold text-sm hover:text-[#12263A]/75 transition-colors text-decoration-none"
          >
            About Us
          </a>
          <a
            href="#contact"
            className="text-[#12263A] font-bold text-sm hover:text-[#12263A]/75 transition-colors text-decoration-none"
          >
            Contact
          </a>
        </nav>

        {/* Action Buttons */}
        <div className="hidden lg:flex items-center gap-5">
          <a
            href="/auth/login"
            className="text-[#12263A] font-bold text-sm hover:text-[#12263A]/75 transition-colors text-decoration-none flex items-center gap-1.5"
          >
            <span>Sign In</span>
            <ArrowRight size={14} />
          </a>
          <a
            href="/auth/signup"
            className="lp-btn-navy text-decoration-none text-xs font-extrabold uppercase tracking-wider !py-2.5 !px-5 !rounded-lg"
          >
            <span>WRITE A REVIEW</span>
            <ArrowRight size={14} className="lp-btn-arrow" />
          </a>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden p-2 rounded-xl text-[#12263A] hover:bg-[#12263A]/10 transition-colors border-0 bg-transparent cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          {isMobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-[68px] bg-white shadow-2xl border-b border-[#12263A]/10 max-h-[85vh] overflow-y-auto px-6 py-6 animate-in slide-in-from-top-4 duration-300 z-50">
          <div className="flex flex-col gap-4">
            <div className="border-b border-[#12263A]/10 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#7E92A2] block mb-2">
                Services
              </span>
              <div className="grid grid-cols-2 gap-2">
                {serviceDropdownItems.map((item) => {
                  const IconComponent = iconMap[item.icon] || Stethoscope;
                  return (
                    <a
                      key={item.id}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-2 p-2 rounded-xl bg-[#FAF9F6] text-decoration-none"
                    >
                      <div
                        className="w-7 h-7 rounded-md flex items-center justify-center"
                        style={{ backgroundColor: item.bg, color: item.color }}
                      >
                        <IconComponent size={14} />
                      </div>
                      <span className="text-xs font-bold text-[#12263A]">
                        {item.title}
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>

            <a
              href="#about"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-base font-bold text-[#12263A] text-decoration-none py-1.5"
            >
              About Us
            </a>
            <a
              href="#how-it-works"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-base font-bold text-[#12263A] text-decoration-none py-1.5"
            >
              How It Works
            </a>
            <a
              href="#community"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-base font-bold text-[#12263A] text-decoration-none py-1.5"
            >
              Community
            </a>
            <a
              href="#contact"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-base font-bold text-[#12263A] text-decoration-none py-1.5"
            >
              Contact
            </a>

            <div className="pt-4 border-t border-[#12263A]/10 flex flex-col gap-3">
              <a
                href="/auth/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="lp-btn-white w-full text-center justify-center text-decoration-none"
              >
                Sign In
              </a>
              <a
                href="/auth/signup"
                onClick={() => setIsMobileMenuOpen(false)}
                className="lp-btn-navy w-full text-center justify-center text-decoration-none"
              >
                <span>JOIN THE CIRCLE</span>
                <ArrowRight size={16} className="lp-btn-arrow" />
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
