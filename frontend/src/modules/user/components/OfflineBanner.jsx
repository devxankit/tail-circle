import { useEffect, useState } from 'react';
import { CloudOff, Wifi } from 'lucide-react';
import { useOnlineStatus } from '../../../hooks/useOnlineStatus';

const RECONNECT_FLASH_MS = 2200;

/**
 * Connectivity pill shown at the top of the user app.
 *
 * Offline it stays up for as long as the connection is down; when the backend
 * becomes reachable again it flips to a brief "Back online" confirmation and
 * then leaves. It never appears on a session that has been online throughout.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();
  const [prevOnline, setPrevOnline] = useState(online);
  const [phase, setPhase] = useState(online ? 'hidden' : 'offline');

  // Adjusting state during render, rather than in an effect: the phase is
  // derived from a value that changed, so there is nothing to synchronise
  // afterwards and no cascading re-render.
  if (prevOnline !== online) {
    setPrevOnline(online);
    // Coming back online only earns a confirmation if we actually announced
    // the outage first.
    setPhase(online ? (phase === 'offline' ? 'reconnected' : 'hidden') : 'offline');
  }

  useEffect(() => {
    if (phase !== 'reconnected') return;
    const timer = setTimeout(() => setPhase('hidden'), RECONNECT_FLASH_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  if (phase === 'hidden') return null;

  const reconnected = phase === 'reconnected';
  const Icon = reconnected ? Wifi : CloudOff;

  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute left-0 right-0 z-[60] flex justify-center pointer-events-none px-4"
      style={{ top: 'calc(10px + env(safe-area-inset-top, 0px))' }}
    >
      <style>{`
        @keyframes tcOfflinePillIn {
          0%   { opacity: 0; transform: translate3d(0, -14px, 0) scale(0.96); }
          100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
        }
      `}</style>
      <div
        className={[
          'flex items-center gap-2 rounded-full pl-3 pr-4 py-2 max-w-full',
          'shadow-[0_6px_20px_rgba(60,50,45,0.18)] backdrop-blur-sm',
          'animate-[tcOfflinePillIn_0.3s_cubic-bezier(0.16,1,0.3,1)_forwards]',
          reconnected ? 'bg-success' : 'bg-slate-700',
        ].join(' ')}
      >
        <Icon size={15} strokeWidth={2.5} className="text-white shrink-0" />
        <span className="text-white text-[11.5px] font-semibold whitespace-nowrap">
          {reconnected ? "Back online" : "You're offline"}
        </span>
        {!reconnected && (
          <span className="text-white/70 text-[11.5px] font-medium whitespace-nowrap">
            · showing saved data
          </span>
        )}
      </div>
    </div>
  );
}

export default OfflineBanner;
