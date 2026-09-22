import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Bell, BellOff, X, Clock, ExternalLink, Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { connectSocket } from '../services/socket';

/**
 * Ringing alerts for partner panels.
 *
 * A partner has a hard deadline to answer a booking request — miss it and the
 * request auto-declines, the customer is refunded and the partner takes a
 * compliance hit. A silent row appearing in a list was never going to achieve
 * that, so new work rings, and keeps ringing, until somebody acknowledges it.
 *
 * Two browser realities shape this:
 *
 *   1. Autoplay is blocked until the page has been interacted with. So the
 *      first gesture on the panel unlocks an AudioContext, and until then a
 *      one-click "enable sound" prompt is shown rather than silently failing —
 *      a ring nobody hears is worse than no ring, because the partner believes
 *      they are covered.
 *
 *   2. The tone is synthesised rather than loaded from an audio file. No asset
 *      to ship, cache or 404, it works offline, and it cannot be muted by a
 *      missing file path.
 */

const VendorAlertContext = createContext(null);

export const useVendorAlerts = () => {
  const ctx = useContext(VendorAlertContext);
  if (!ctx) throw new Error('useVendorAlerts must be used inside VendorAlertProvider');
  return ctx;
};

const SOUND_PREF_KEY = 'tc_vendor_sound';
const RING_INTERVAL_MS = 6000;

export function VendorAlertProvider({ children }) {
  const [alerts, setAlerts] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return localStorage.getItem(SOUND_PREF_KEY) !== 'off';
    } catch {
      return true;
    }
  });
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const audioCtxRef = useRef(null);
  const ringTimerRef = useRef(null);
  const navigate = useNavigate();

  /* ── Audio ─────────────────────────────────────────────────────── */

  const ensureAudioContext = useCallback(() => {
    if (audioCtxRef.current) return audioCtxRef.current;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtxRef.current = new Ctx();
      return audioCtxRef.current;
    } catch {
      return null;
    }
  }, []);

  /** Two-tone chirp, the shape of a delivery-app alert. */
  const playRing = useCallback(() => {
    const ctx = ensureAudioContext();
    if (!ctx || ctx.state === 'suspended') return false;
    try {
      const now = ctx.currentTime;
      [0, 0.18].forEach((offset, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(i === 0 ? 880 : 1180, now + offset);
        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.32, now + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.16);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.18);
      });
      return true;
    } catch {
      return false;
    }
  }, [ensureAudioContext]);

  /**
   * Unlock audio on the first real gesture anywhere in the panel.
   *
   * Registered once and removed as soon as it fires — the browser only needs
   * one qualifying interaction, and leaving global listeners attached for the
   * life of the session is needless work on every click.
   */
  useEffect(() => {
    if (audioUnlocked) return undefined;
    const unlock = () => {
      const ctx = ensureAudioContext();
      if (!ctx) return;
      ctx.resume().then(() => setAudioUnlocked(true)).catch(() => {});
    };
    const events = ['pointerdown', 'keydown', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, unlock, { once: true, passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, unlock));
  }, [audioUnlocked, ensureAudioContext]);

  /* ── The ring loop ─────────────────────────────────────────────── */

  const hasPersistent = alerts.some((a) => a.persistent);

  useEffect(() => {
    if (!hasPersistent || !soundEnabled || !audioUnlocked) {
      if (ringTimerRef.current) {
        clearInterval(ringTimerRef.current);
        ringTimerRef.current = null;
      }
      return undefined;
    }
    playRing();
    ringTimerRef.current = setInterval(playRing, RING_INTERVAL_MS);
    return () => {
      if (ringTimerRef.current) clearInterval(ringTimerRef.current);
      ringTimerRef.current = null;
    };
  }, [hasPersistent, soundEnabled, audioUnlocked, playRing]);

  /* ── Socket wiring ─────────────────────────────────────────────── */

  useEffect(() => {
    const socket = connectSocket();
    if (!socket) return undefined;

    const onNew = (payload) => {
      if (!payload?.dedupeKey) return;
      setAlerts((prev) => {
        // Replace rather than stack — a reconnect re-delivering the same alert
        // must not produce two rings for one booking.
        const without = prev.filter((a) => a.dedupeKey !== payload.dedupeKey);
        return [{ ...payload, receivedAt: Date.now() }, ...without].slice(0, 12);
      });

      // A background tab hears nothing useful, so mirror urgent work to the OS
      // when the partner has granted permission.
      if (payload.urgent && document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(payload.title, { body: payload.body, tag: payload.dedupeKey });
        } catch { /* non-fatal */ }
      }
    };

    const onResolved = ({ dedupeKey }) =>
      setAlerts((prev) => prev.filter((a) => a.dedupeKey !== dedupeKey));

    socket.on('vendor:work:new', onNew);
    socket.on('vendor:work:resolved', onResolved);
    return () => {
      socket.off('vendor:work:new', onNew);
      socket.off('vendor:work:resolved', onResolved);
    };
  }, []);

  /* ── Actions ───────────────────────────────────────────────────── */

  const dismiss = useCallback((dedupeKey) => {
    setAlerts((prev) => prev.filter((a) => a.dedupeKey !== dedupeKey));
  }, []);

  const dismissAll = useCallback(() => setAlerts([]), []);

  const openAlert = useCallback((alert) => {
    dismiss(alert.dedupeKey);
    if (alert.link) navigate(alert.link);
  }, [dismiss, navigate]);

  const toggleSound = useCallback(() => {
    setSoundEnabled((on) => {
      const next = !on;
      try { localStorage.setItem(SOUND_PREF_KEY, next ? 'on' : 'off'); } catch { /* private mode */ }
      if (next) {
        const ctx = ensureAudioContext();
        ctx?.resume().then(() => { setAudioUnlocked(true); playRing(); }).catch(() => {});
      }
      return next;
    });
  }, [ensureAudioContext, playRing]);

  const enableSound = useCallback(() => {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    ctx.resume().then(() => {
      setAudioUnlocked(true);
      setSoundEnabled(true);
      try { localStorage.setItem(SOUND_PREF_KEY, 'on'); } catch { /* private mode */ }
      playRing();
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }).catch(() => {});
  }, [ensureAudioContext, playRing]);

  const value = {
    alerts, dismiss, dismissAll, openAlert,
    soundEnabled, toggleSound, audioUnlocked, enableSound,
  };

  return (
    <VendorAlertContext.Provider value={value}>
      {children}
      <VendorAlertOverlay />
    </VendorAlertContext.Provider>
  );
}

/* ── Overlay ───────────────────────────────────────────────────────── */

function VendorAlertOverlay() {
  const { alerts, dismiss, openAlert, soundEnabled, toggleSound, audioUnlocked, enableSound } = useVendorAlerts();
  const needsUnlock = alerts.length > 0 && soundEnabled && !audioUnlocked;

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] w-[min(380px,calc(100vw-2rem))] space-y-2">
      {/*
        Shown only when there is something to hear and the browser has not yet
        allowed it. Without this the partner would believe sound is on while the
        page is silently failing to play it.
      */}
      {needsUnlock && (
        <button
          onClick={enableSound}
          className="w-full flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-lg text-[13px] font-bold"
        >
          <Volume2 size={16} /> Tap to enable alert sound
        </button>
      )}

      {alerts.map((a) => (
        <div
          key={a.dedupeKey}
          className={`bg-white rounded-xl shadow-2xl border-2 overflow-hidden ${
            a.urgent ? 'border-[#66B4B1]' : 'border-gray-200'
          } ${a.persistent ? 'animate-pulse-slow' : ''}`}
        >
          <div className={`px-4 py-2 flex items-center justify-between ${
            a.urgent ? 'bg-[#66B4B1] text-white' : 'bg-gray-100 text-gray-700'}`}>
            <div className="flex items-center gap-2 min-w-0">
              <Bell size={15} className={a.persistent ? 'animate-bounce' : ''} />
              <span className="text-[13px] font-bold truncate">{a.title}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={toggleSound} title={soundEnabled ? 'Mute alerts' : 'Unmute alerts'}
                className="p-1 rounded hover:bg-black/10">
                {soundEnabled ? <Volume2 size={14} /> : <BellOff size={14} />}
              </button>
              <button onClick={() => dismiss(a.dedupeKey)} title="Dismiss" className="p-1 rounded hover:bg-black/10">
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="p-4">
            {a.refLabel && <p className="text-[11px] font-bold text-gray-400 mb-1">{a.refLabel}</p>}
            <p className="text-[13px] text-gray-700 leading-snug">{a.body}</p>
            {a.expiresAt && <Countdown expiresAt={a.expiresAt} />}
            <button onClick={() => openAlert(a)}
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#66B4B1] hover:opacity-90 text-white rounded-lg text-[13px] font-bold">
              Open <ExternalLink size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Live countdown to the partner's response deadline. */
function Countdown({ expiresAt }) {
  const [left, setLeft] = useState(() => new Date(expiresAt) - Date.now());

  useEffect(() => {
    const t = setInterval(() => setLeft(new Date(expiresAt) - Date.now()), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  if (left <= 0) {
    return (
      <p className="mt-2 flex items-center gap-1.5 text-[12px] font-bold text-red-600">
        <Clock size={13} /> Response window closed
      </p>
    );
  }

  const hrs = Math.floor(left / 3_600_000);
  const mins = Math.floor((left % 3_600_000) / 60_000);
  const secs = Math.floor((left % 60_000) / 1000);
  const urgent = left < 15 * 60_000;

  return (
    <p className={`mt-2 flex items-center gap-1.5 text-[12px] font-bold ${urgent ? 'text-red-600' : 'text-amber-600'}`}>
      <Clock size={13} />
      Respond within {hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m ${secs}s`}
    </p>
  );
}

export default VendorAlertProvider;
