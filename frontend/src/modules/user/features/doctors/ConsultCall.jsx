import { useEffect, useRef, useState } from 'react';
import {
  Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Phone,
  SwitchCamera, AlertCircle, Loader2, Clock, IndianRupee,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCall } from '../../../../context/CallContext';
import { primeDevices, formatDuration } from '../../../../services/webrtcCall';
import { cn } from '../../utils/cn';

/**
 * Pet-parent video consultation screen.
 *
 * Phases: permission priming → joining → in-call → ended. Ringing itself is
 * handled by CallContext (socket-driven), so arriving here directly — from a
 * push notification, say — still works: we just join.
 */
export function ConsultCall() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const {
    phase, call, error, remoteStream, localStream, micOn, camOn, peerPresent,
    reconnecting, elapsed, overagePrompt, acceptCall, rejectCall, endCall,
    acceptOverage, toggleMic, toggleCam, flipCamera, reset,
  } = useCall();

  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const [permission, setPermission] = useState(null); // null | {granted, reason}
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  /* Ask for camera + mic before joining, never mid-call. */
  useEffect(() => {
    let cancelled = false;
    primeDevices({ video: true }).then((r) => !cancelled && setPermission(r));
    return () => { cancelled = true; };
  }, []);

  /* Attach media streams to elements as they arrive. */
  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream || null;
  }, [remoteStream]);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream || null;
  }, [localStream]);

  const handleJoin = async () => {
    setJoining(true);
    setJoinError('');
    try {
      await acceptCall(bookingId, { video: true, role: 'patient' });
    } catch (e) {
      setJoinError(e.message || 'Could not join the consultation');
    } finally {
      setJoining(false);
    }
  };

  const handleEnd = async () => {
    await endCall();
  };

  const handleLeave = () => {
    reset();
    navigate('/app/profile/bookings', { replace: true });
  };

  /* ── Ended ────────────────────────────────────────────── */
  if (phase === 'ended') {
    const owed = call?.overage?.status === 'pending' ? call.overage : null;
    return (
      <Shell>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
            <PhoneOff size={28} className="text-white/70" />
          </div>
          <h2 className="text-xl font-bold text-white">Consultation ended</h2>
          {(call?.startedAt || elapsed > 0) && (
            <p className="text-white/60 text-sm">Duration: {formatDuration(call?.billedSeconds || elapsed || 1)}</p>
          )}

          {owed && (
            <div className="w-full max-w-sm bg-amber-500/15 border border-amber-400/30 rounded-2xl p-4 text-left mt-2">
              <div className="flex items-center gap-2 mb-1">
                <IndianRupee size={16} className="text-amber-300" />
                <span className="font-bold text-amber-200 text-sm">Extra time — ₹{owed.amount}</span>
              </div>
              <p className="text-white/60 text-xs leading-relaxed">
                Your consultation ran {owed.minutes} min past the booked time at
                {' '}₹{owed.ratePerMinute}/min. Pay from your appointment to receive the
                digital prescription.
              </p>
              <button
                onClick={() => navigate('/app/profile/bookings')}
                className="mt-3 w-full bg-amber-400 text-gray-900 font-bold py-2.5 rounded-xl text-sm"
              >
                Pay ₹{owed.amount}
              </button>
            </div>
          )}

          <button
            onClick={handleLeave}
            className="mt-2 px-8 py-3 rounded-full bg-white/10 text-white font-bold text-sm"
          >
            Done
          </button>
        </div>
      </Shell>
    );
  }

  /* ── Permission gate ──────────────────────────────────── */
  if (permission && !permission.granted) {
    return (
      <Shell>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
          <AlertCircle size={40} className="text-amber-400" />
          <h2 className="text-lg font-bold text-white">Camera &amp; microphone needed</h2>
          <p className="text-white/60 text-sm leading-relaxed">{permission.reason}</p>
          <button
            onClick={() => primeDevices({ video: true }).then(setPermission)}
            className="mt-2 px-8 py-3 rounded-full bg-white text-gray-900 font-bold text-sm"
          >
            Try again
          </button>
          <button onClick={handleLeave} className="text-white/50 text-sm underline">Go back</button>
        </div>
      </Shell>
    );
  }

  /* ── Pre-join lobby ───────────────────────────────────── */
  if (phase === 'idle' || phase === 'incoming') {
    return (
      <Shell>
        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8 text-center">
          <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center animate-pulse">
            <VideoIcon size={36} className="text-white/80" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Video consultation</h2>
            <p className="text-white/60 text-sm">
              {permission?.granted ? 'Your vet is waiting to see you' : 'Checking your camera…'}
            </p>
          </div>

          {(joinError || error) && (
            <p className="text-red-300 text-sm max-w-xs">{joinError || error}</p>
          )}

          <div className="flex flex-col gap-3 w-full max-w-xs mt-2">
            <button
              onClick={handleJoin}
              disabled={joining || !permission?.granted}
              className="w-full h-14 rounded-full bg-emerald-500 text-white font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {joining ? <Loader2 size={20} className="animate-spin" /> : <Phone size={20} />}
              {joining ? 'Joining…' : 'Join consultation'}
            </button>
            <button
              onClick={() => rejectCall(bookingId).then(handleLeave)}
              className="w-full h-12 rounded-full bg-white/10 text-white/80 font-bold text-sm"
            >
              Not now
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  /* ── In call ──────────────────────────────────────────── */
  const scheduled = (call?.scheduledMinutes || 15) * 60;
  const overtime = elapsed > scheduled;

  return (
    <Shell>
      {/* Remote video fills the screen */}
      <div className="absolute inset-0 bg-black">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {!peerPresent && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-900">
            <Loader2 size={32} className="text-white/50 animate-spin" />
            <p className="text-white/60 text-sm">Waiting for your vet to join…</p>
          </div>
        )}
      </div>

      {/* Top status bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-4">
        <div className={cn(
          'px-3 py-1.5 rounded-full text-xs font-bold font-mono flex items-center gap-2 backdrop-blur',
          overtime ? 'bg-amber-500/25 text-amber-200' : 'bg-black/40 text-white'
        )}>
          <span className={cn('w-2 h-2 rounded-full', overtime ? 'bg-amber-400' : 'bg-red-500 animate-pulse')} />
          {formatDuration(elapsed)}
          {overtime && <span className="font-sans">· extra time</span>}
        </div>

        {reconnecting && (
          <div className="px-3 py-1.5 rounded-full bg-amber-500/25 text-amber-200 text-xs font-bold backdrop-blur flex items-center gap-2">
            <Loader2 size={12} className="animate-spin" /> Reconnecting…
          </div>
        )}
      </div>

      {/* Local preview */}
      <div className="absolute top-16 right-4 w-24 aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/20 bg-gray-800 z-10 shadow-xl">
        <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        {!camOn && (
          <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
            <VideoOff size={18} className="text-white/60" />
          </div>
        )}
      </div>

      {/* Overage consent — nothing is billed until this is accepted */}
      {overagePrompt && (
        <div className="absolute inset-x-4 bottom-32 z-30 bg-white rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <Clock size={18} className="text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm mb-0.5">Your booked time is up</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Continuing will be charged at{' '}
                <strong className="text-gray-900">₹{overagePrompt.ratePerMinute}/min</strong>,
                billed after the call. You can end now at no extra cost.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleEnd}
              className="flex-1 h-11 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm"
            >
              End call
            </button>
            <button
              onClick={acceptOverage}
              className="flex-1 h-11 rounded-xl bg-amber-500 text-white font-bold text-sm"
            >
              Continue — ₹{overagePrompt.ratePerMinute}/min
            </button>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-8 inset-x-0 z-20 flex items-center justify-center gap-4">
        <ControlButton active={micOn} onClick={toggleMic} on={<Mic size={22} />} off={<MicOff size={22} />} />
        <ControlButton active={camOn} onClick={toggleCam} on={<VideoIcon size={22} />} off={<VideoOff size={22} />} />
        <ControlButton active onClick={flipCamera} on={<SwitchCamera size={22} />} off={<SwitchCamera size={22} />} />
        <button
          onClick={handleEnd}
          className="w-16 h-14 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-lg"
          aria-label="End call"
        >
          <PhoneOff size={24} />
        </button>
      </div>
    </Shell>
  );
}

function ControlButton({ active, onClick, on, off }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-14 h-14 rounded-2xl flex items-center justify-center transition backdrop-blur',
        active ? 'bg-white/15 text-white' : 'bg-red-500/25 text-red-300'
      )}
    >
      {active ? on : off}
    </button>
  );
}

function Shell({ children }) {
  return (
    <div className="fixed inset-0 z-[200] bg-gray-900 flex flex-col">
      {children}
    </div>
  );
}

export default ConsultCall;
