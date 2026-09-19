import React, { useEffect } from 'react';
import { X, Play } from 'lucide-react';

export function VideoModal({ isOpen, onClose, videoTitle = 'A Day in the Life with Tail Circle' }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#12263A]/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-[#12263A] rounded-3xl overflow-hidden shadow-2xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0A1927]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#FFC928]" />
            <h3 className="text-sm font-bold text-white tracking-wide">
              {videoTitle}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors border-0 bg-transparent cursor-pointer"
            aria-label="Close video"
          >
            <X size={20} />
          </button>
        </div>

        {/* Video Player Container */}
        <div className="relative aspect-video w-full bg-black flex items-center justify-center">
          <video
            controls
            autoPlay
            poster="/assets/images/community.jpg"
            className="w-full h-full object-cover"
          >
            <source src="/assets/video/tail-circle-storyboard.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#0A1927] flex items-center justify-between">
          <p className="text-xs text-white/70">
            Tail Circle Ecosystem • Lake Norman, NC
          </p>
          <span className="text-xs font-bold text-[#FFC928]">
            Everything your pet needs, all in one circle.
          </span>
        </div>
      </div>
    </div>
  );
}
