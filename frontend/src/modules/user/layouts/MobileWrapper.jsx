import React from 'react';
import { useLocation } from 'react-router-dom';
import { OfflineBanner } from '../components/OfflineBanner';

export function MobileWrapper({ children }) {
  const location = useLocation();
  const isAdminOrVendor = location.pathname.startsWith('/admin') || location.pathname.startsWith('/vendor');

  if (isAdminOrVendor) {
    return (
      <div className="min-h-screen w-full overflow-x-hidden flex flex-col" style={{ userSelect: 'text', WebkitUserSelect: 'text', MozUserSelect: 'text', msUserSelect: 'text' }}>
        <style>{`
          /* Exemption: text fully selectable in admin and vendor areas */
          .admin-area, .admin-area *, .vendor-area, .vendor-area * {
            user-select: text !important;
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
          }

          /* ── Coral / Peach Theme Overrides ─────────────────────── */
          .admin-area, .vendor-area {
            --color-bg-primary:    #F5F6FA !important;
            --color-bg-secondary:  #EDEDF2 !important;
            --color-bg-card:       #FFFFFF !important;

            --color-primary-main:  #F05A2A !important;
            --color-primary-light: #FFF3EE !important;
            --color-primary-dark:  #C2410C !important;

            --color-accent-coral:  #F05A2A !important;
            --color-accent-blue:   #3B82F6 !important;
            --color-accent-yellow: #F59E0B !important;

            --color-text-primary:   #1F2937 !important;
            --color-text-secondary: #6B7280 !important;
            --color-text-disabled:  #9CA3AF !important;

            --color-border-light: #E8EAF0 !important;

            --color-success: #10B981 !important;
            --color-error:   #EF4444 !important;
            --color-warning: #F59E0B !important;

            font-family: 'Inter', system-ui, sans-serif !important;
          }

          /* Smooth card hover transitions */
          .admin-area .bg-white, .vendor-area .bg-white {
            transition: box-shadow 0.2s ease, border-color 0.2s ease !important;
          }

          /* Rounded scrollbar for all scrollable areas */
          .admin-area ::-webkit-scrollbar,
          .vendor-area ::-webkit-scrollbar { width: 5px; height: 5px; }
          .admin-area ::-webkit-scrollbar-track,
          .vendor-area ::-webkit-scrollbar-track { background: transparent; }
          .admin-area ::-webkit-scrollbar-thumb,
          .vendor-area ::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 8px; }
          .admin-area ::-webkit-scrollbar-thumb:hover,
          .vendor-area ::-webkit-scrollbar-thumb:hover { background: #F05A2A; }
        `}</style>
        <div className="flex-1 flex flex-col w-full min-h-screen admin-area vendor-area">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-100 flex justify-center overflow-hidden touch-none">
      <div className="w-full max-w-[430px] h-full bg-bg-primary shadow-2xl relative flex flex-col overflow-x-hidden touch-auto" style={{ transform: 'translate3d(0, 0, 0)' }}>
        <style>{`
          @keyframes pageTransition {
            0% {
              opacity: 0.65;
              transform: translate3d(12px, 0, 0);
            }
            100% {
              opacity: 1;
              transform: translate3d(0, 0, 0);
            }
          }

          /* Hide scrollbar for the mobile simulator layout viewports */
          .touch-auto::-webkit-scrollbar,
          .touch-auto *::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
          }
          .touch-auto,
          .touch-auto * {
            -ms-overflow-style: none !important;
            scrollbar-width: none !important;
          }
        `}</style>
        {/* Outside the keyed content, so it does not replay the page transition
            on every navigation. */}
        <OfflineBanner />
        <div key={location.pathname} className="flex-1 flex flex-col w-full min-h-full animate-[pageTransition_0.28s_cubic-bezier(0.16,1,0.3,1)_forwards]">
          {children}
        </div>
      </div>
    </div>
  );
}
