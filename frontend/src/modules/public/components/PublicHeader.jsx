import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Heart, ArrowRight, Menu, X, Shield, FileText, Phone, Home, Sparkles } from 'lucide-react';

export function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Privacy Policy', path: '/privacy', icon: Shield },
    { label: 'Terms & Conditions', path: '/terms', icon: FileText },
    { label: 'Contact Us', path: '/contact', icon: Phone },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/' || location.pathname === '/landing';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#FAFAF7]/90 backdrop-blur-md border-b border-[#E0E1DC] transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <Link to="/" className="flex items-center gap-3 group text-decoration-none">
          <div className="w-11 h-11 rounded-2xl bg-white border border-[#E0E1DC] shadow-sm flex items-center justify-center p-1.5 group-hover:scale-105 transition-transform">
            <img
              src="/tc-brand-mark.png"
              alt="Tail Circle Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="font-extrabold text-[20px] tracking-tight text-[#087F78]">Tail</span>
              <span className="font-extrabold text-[20px] tracking-tight text-[#F45B4B]">Circle</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-[#69716E] font-medium tracking-wide">
              <Heart size={8} className="fill-[#F45B4B] text-[#F45B4B]" />
              <span>Swipes, Sniffs, and Soulmates</span>
              <Heart size={8} className="fill-[#F45B4B] text-[#F45B4B]" />
            </div>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-white/80 border border-[#E0E1DC] rounded-full px-3 py-1.5 shadow-sm">
          {navLinks.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 py-2 rounded-full text-[13.5px] font-semibold transition-all ${
                  active
                    ? 'bg-[#087F78] text-white shadow-sm'
                    : 'text-[#69716E] hover:text-[#151817] hover:bg-[#FAFAF7]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop CTA Button */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/app/home"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#F45B4B] hover:bg-[#e04838] text-white text-[13.5px] font-bold shadow-sm hover:shadow transition-all group active:scale-95"
          >
            <span>Open App</span>
            <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            to="/app/home"
            className="flex items-center gap-1 px-3.5 py-2 rounded-full bg-[#F45B4B] text-white text-[12px] font-bold shadow-sm"
          >
            <span>App</span>
            <ArrowRight size={13} />
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2.5 rounded-xl border border-[#E0E1DC] bg-white text-[#151817] hover:bg-gray-50 focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-[#E0E1DC] px-4 py-4 space-y-2 shadow-lg animate-in slide-in-from-top-2 duration-200">
          {navLinks.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-semibold transition-colors ${
                  active
                    ? 'bg-[#E2F7F3] text-[#087F78] font-bold'
                    : 'text-[#5A5552] hover:bg-gray-50'
                }`}
              >
                <Icon size={18} className={active ? 'text-[#087F78]' : 'text-gray-400'} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
            <Link
              to="/app/home"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#087F78] text-white font-bold text-[14px] shadow-sm"
            >
              <span>Launch TailCircle App</span>
              <Sparkles size={16} />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

export default PublicHeader;
