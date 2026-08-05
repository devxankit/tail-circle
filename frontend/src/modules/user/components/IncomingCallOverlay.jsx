import React, { useEffect, useRef } from 'react';
import { PhoneOff, Video } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCall } from '../../../context/CallContext';

/**
 * WhatsApp-style app-wide incoming video call overlay with audio ringtone.
 */
export function IncomingCallOverlay() {
  const { phase, incoming, rejectCall } = useCall();
  const navigate = useNavigate();
  const location = useLocation();
  const ringtoneRef = useRef(null);

  const onCallScreen = location.pathname.startsWith('/app/consult/');
  const shouldShow = phase === 'incoming' && incoming?.bookingId && !onCallScreen;

  // Web Audio API ringtone synthesis (WhatsApp dual-tone 440Hz + 480Hz)
  useEffect(() => {
    if (!shouldShow) {
      if (ringtoneRef.current) {
        ringtoneRef.current.stop();
        ringtoneRef.current = null;
      }
      return undefined;
    }

    class RingtoneSynth {
      constructor() {
        this.ctx = null;
        this.timer = null;
      }

      start() {
        try {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (!AudioCtx) return;
          this.ctx = new AudioCtx();

          const playTonePattern = () => {
            if (!this.ctx || this.ctx.state === 'closed') return;
            if (this.ctx.state === 'suspended') {
              this.ctx.resume().catch(() => {});
            }
            const now = this.ctx.currentTime;
            const osc1 = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc1.type = 'sine';
            osc2.type = 'sine';
            osc1.frequency.setValueAtTime(440, now);
            osc2.frequency.setValueAtTime(480, now);

            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(this.ctx.destination);

            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 1.6);
            osc2.stop(now + 1.6);
          };

          playTonePattern();
          this.timer = setInterval(playTonePattern, 2800);
        } catch (e) {
          console.warn('Ringtone init error:', e);
        }
      }

      stop() {
        if (this.timer) {
          clearInterval(this.timer);
          this.timer = null;
        }
        if (this.ctx && this.ctx.state !== 'closed') {
          try {
            this.ctx.close();
          } catch {}
          this.ctx = null;
        }
      }
    }

    const synth = new RingtoneSynth();
    synth.start();
    ringtoneRef.current = synth;

    return () => {
      synth.stop();
      ringtoneRef.current = null;
    };
  }, [shouldShow]);

  if (!shouldShow) return null;

  const handleAccept = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.stop();
    }
    // The vet/clinic call screen only exists under the vendor portal
    // (`/vendor/doctor/consultations`, see App.jsx) — there is no
    // `/admin/doctor` route. A doctor is always logged in through the vendor
    // portal (clinic account), never the superadmin one, so any vendor- or
    // admin-portal session that receives a ring is answered there.
    const isVendorPortal = location.pathname.startsWith('/admin') || location.pathname.startsWith('/vendor');
    if (isVendorPortal) {
      navigate(`/vendor/doctor/consultations?view=video_call&bookingId=${incoming.bookingId}`);
    } else {
      navigate(`/app/consult/${incoming.bookingId}`);
    }
  };

  const handleReject = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.stop();
    }
    rejectCall(incoming.bookingId);
  };

  return (
    <div className="fixed inset-0 z-[300] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-between py-16 px-6 animate-in fade-in duration-300">
      
      {/* Header Badge */}
      <div className="flex flex-col items-center gap-2 text-center pt-4">
        <span className="px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold tracking-wider uppercase flex items-center gap-2 animate-pulse">
          <Video size={14} /> WhatsApp Incoming Video Call
        </span>
        <p className="text-slate-400 text-xs mt-1">
          {incoming.resumed ? 'Call in progress' : 'Ringing…'}
        </p>
      </div>

      {/* Center Caller Info & Pulsing Avatar */}
      <div className="flex flex-col items-center text-center gap-6 max-w-sm">
        <div className="relative">
          {/* Triple Radar Pulse Rings */}
          <span className="absolute -inset-4 rounded-full border-2 border-emerald-500/20 animate-ping duration-1000" />
          <span className="absolute -inset-8 rounded-full border border-emerald-400/10 animate-pulse duration-700" />

          {incoming.doctorPhoto || incoming.callerPhoto ? (
            <img
              src={incoming.doctorPhoto || incoming.callerPhoto}
              alt={incoming.doctorName || incoming.callerName || 'Caller'}
              className="w-32 h-32 rounded-full object-cover border-4 border-emerald-500/60 shadow-2xl relative z-10"
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-slate-800 border-4 border-emerald-500/60 flex items-center justify-center relative z-10 shadow-2xl">
              <Video size={48} className="text-emerald-400" />
            </div>
          )}
        </div>

        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">
            {incoming.doctorName || incoming.callerName || 'Doctor Consultation'}
          </h2>
          {incoming.petName && (
            <p className="text-emerald-400 text-sm font-semibold mt-1">
              Pet: {incoming.petName}
              {incoming.scheduledMinutes ? ` (${incoming.scheduledMinutes} min)` : ''}
            </p>
          )}
          <p className="text-slate-400 text-xs mt-2">
            Swipe or tap green button to join video call immediately
          </p>
        </div>
      </div>

      {/* Action Buttons: Red Decline / Green Accept Video */}
      <div className="flex items-center gap-12 pb-6">
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleReject}
            className="w-[72px] h-[72px] rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-xl shadow-red-950/60 active:scale-90 transition-all cursor-pointer border-2 border-red-400/30"
            aria-label="Decline Call"
          >
            <PhoneOff size={30} />
          </button>
          <span className="text-slate-400 text-xs font-semibold">Decline</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleAccept}
            className="w-[72px] h-[72px] rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-xl shadow-emerald-950/60 active:scale-95 transition-all cursor-pointer border-2 border-emerald-300/40 animate-bounce"
            aria-label="Accept Video Call"
          >
            <Video size={32} />
          </button>
          <span className="text-emerald-400 text-xs font-bold">Accept Call</span>
        </div>
      </div>

    </div>
  );
}

export default IncomingCallOverlay;
