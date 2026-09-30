import React, { useState, useEffect, useRef } from 'react';
import {
  PhoneOff, Mic, MicOff, Video as VideoIcon, VideoOff, MessageSquare,
  Settings, FileText, Loader2, AlertCircle, Clock, IndianRupee, Ban, SwitchCamera,
} from 'lucide-react';
import { useVendor } from '../context/ClinicVendorContext';
import { useCall } from '../../../../context/CallContext';
import { primeDevices, formatDuration } from '../../../../services/webrtcCall';
import { waiveOverage } from '../../../../services/consultApi';
import { BottomSheet, ActionSheet, useConfirm, useVendorToast, textareaClass, fieldClass } from '../../vendor/mobile';

/**
 * Vet-side video consultation.
 *
 * Media is direct browser-to-browser WebRTC — this used to render a
 * placeholder <div> with the pet's first initial and a purely local timer.
 * On a phone the remote video fills the screen, the self-view floats top
 * right, the controls sit in a bar at the bottom, and live notes and chat
 * open as sheets over the call.
 *
 * The timer shown here is cosmetic. Billable duration is computed server-side
 * from socket join/leave events, so nothing the vet's browser does can alter
 * a charge.
 */
export function VideoConsultationView({ appointment, onNavigate }) {
  const { addDoctorConsultationNotes } = useVendor();
  const confirm = useConfirm();
  const {
    phase, call, incoming, error, mediaWarning, remoteStream, localStream, micOn, camOn,
    peerPresent, reconnecting, elapsed,
    startCall, acceptCall, endCall, toggleMic, toggleCam, flipCamera, reset,
  } = useCall();
  const { addToast } = useVendorToast();

  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);

  // Which sheet is open over the call: 'notes', 'chat', 'settings' or none.
  const [panel, setPanel] = useState(null);
  const [notes, setNotes] = useState('');
  const [permission, setPermission] = useState(null);
  const [startError, setStartError] = useState('');
  const [waiving, setWaiving] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  const bookingId = appointment?.id;

  /*
   * Prime devices, then either ring the pet parent or join a call that is
   * already ringing for us.
   *
   * This screen is the destination for two different entry points: the vet
   * dashboard/appointment views land here to *start* a fresh consultation
   * (nobody has been notified yet — must call `startCall`), while accepting
   * an incoming ring from `IncomingCallOverlay` navigates here with the call
   * already in `ringing` status and `phase === 'incoming'` (must call
   * `acceptCall`/join, not start a second ring).
   */
  useEffect(() => {
    if (!bookingId) return undefined;
    let cancelled = false;
    const isAcceptingRing = phase === 'incoming' && String(incoming?.bookingId) === String(bookingId);

    (async () => {
      const perm = await primeDevices({ video: true });
      if (cancelled) return;
      setPermission(perm);
      if (!perm.granted) return;
      try {
        // This screen is always the vet side, so it always creates the WebRTC offer.
        if (isAcceptingRing) {
          await acceptCall(bookingId, { video: true, role: 'vet' });
        } else {
          await startCall(bookingId, { video: true, role: 'vet' });
        }
        if (!cancelled) {
          setChatMessages([{
            sender: 'System',
            text: isAcceptingRing
              ? `Connected with ${appointment?.owner || 'the pet parent'}.`
              : `Calling ${appointment?.owner || 'the pet parent'}…`,
            time: '',
          }]);
        }
      } catch (e) {
        if (!cancelled) setStartError(e.message || 'Could not start the consultation');
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  /* Attach media streams as they arrive. */
  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream || null;
  }, [remoteStream]);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream || null;
  }, [localStream]);

  const handleEndCall = async () => {
    if (!(await confirm({ title: 'End this consultation?', confirmLabel: 'End Call', danger: true }))) return;
    await endCall({ notes: notes.trim() || undefined });
    reset();
    if (onNavigate) onNavigate('dashboard');
  };

  const handleSaveNotes = async () => {
    if (!notes.trim()) return;
    const ok = await addDoctorConsultationNotes(appointment.id, notes);
    if (ok) addToast({ message: 'Notes saved to the medical record.', type: 'success' });
  };

  const handleFlipCamera = async () => {
    try {
      await flipCamera();
    } catch (e) {
      addToast({ message: e?.message || 'Could not switch the camera.', type: 'error' });
    }
  };

  const handleWaive = async () => {
    setWaiving(true);
    try {
      await waiveOverage(bookingId);
    } finally {
      setWaiving(false);
    }
  };

  const handleClose = () => {
    reset();
    if (onNavigate) onNavigate('dashboard');
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChatMessages((prev) => [...prev, {
      sender: 'You',
      text: chatInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);
    setChatInput('');
  };

  if (!appointment) return null;

  const scheduled = (call?.scheduledMinutes || 15) * 60;
  const overtime = elapsed > scheduled;
  const owed = call?.overage?.status === 'pending' ? call.overage : null;

  const roundBtn = 'w-14 h-14 rounded-full flex items-center justify-center transition active:scale-95';

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col font-sans overflow-hidden">
      {/* Remote video fills the screen */}
      <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover bg-[#1f2937]" />

      {/* Overlays for every non-connected state */}
      {phase === 'ended' ? (
        <Overlay icon={<PhoneOff size={32} className="text-white/60" />} title="Consultation ended">
          {owed && (
            <div className="mt-4 bg-warning/15 border border-warning/30 rounded-2xl p-4 w-full max-w-sm text-left">
              <div className="flex items-center gap-2 mb-1">
                <IndianRupee size={15} className="text-warning" />
                <span className="font-bold text-white text-sm">
                  Extra time — {owed.minutes} min · ₹{owed.amount}
                </span>
              </div>
              <p className="text-white/60 text-xs leading-relaxed mb-3">
                Invoiced to {appointment.owner || 'the pet parent'} at ₹{owed.ratePerMinute}/min.
                You can waive it if the overrun was on your side.
              </p>
              <button
                onClick={handleWaive}
                disabled={waiving}
                className="w-full min-h-[44px] bg-white/10 active:bg-white/20 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Ban size={14} /> {waiving ? 'Waiving…' : 'Waive this charge'}
              </button>
            </div>
          )}
        </Overlay>
      ) : permission && !permission.granted ? (
        <Overlay icon={<AlertCircle size={32} className="text-warning" />} title="Camera & microphone blocked">
          <p className="text-white/60 text-sm max-w-sm">{permission.reason}</p>
        </Overlay>
      ) : startError || error ? (
        <Overlay icon={<AlertCircle size={32} className="text-error" />} title="Could not start">
          <p className="text-white/60 text-sm max-w-sm">{startError || error}</p>
        </Overlay>
      ) : !peerPresent ? (
        <Overlay
          icon={<Loader2 size={32} className="text-white/50 animate-spin" />}
          title={phase === 'outgoing' || phase === 'connecting' ? 'Calling…' : 'Waiting to connect'}
        >
          <p className="text-white/60 text-sm">
            Waiting for {appointment.owner || 'the pet parent'} to join
          </p>
        </Overlay>
      ) : phase !== 'active' ? (
        // The other side's socket is in the call, but the actual media
        // connection hasn't come up yet — a different problem than
        // "nobody's here" (see CallContext.jsx).
        <Overlay icon={<Loader2 size={32} className="text-white/50 animate-spin" />} title="Connecting video…">
          {mediaWarning && <p className="text-warning text-sm max-w-sm">{mediaWarning}</p>}
        </Overlay>
      ) : null}

      {/* Top bar */}
      <div
        className="relative z-10 bg-gradient-to-b from-black/80 to-transparent px-4 pb-6 flex items-start justify-between gap-3"
        style={{ paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))' }}
      >
        <div className="min-w-0">
          <h2 className="text-white font-bold text-base leading-tight truncate">
            {appointment.petName} &amp; {appointment.owner}
          </h2>
          <p className="text-white/60 text-xs mt-0.5">
            Video Consultation • {call?.scheduledMinutes || 15} min booked
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono flex items-center gap-2 ${
              overtime ? 'bg-warning/25 text-warning' : 'bg-error/25 text-white'
            }`}>
              <span className={`w-2 h-2 rounded-full ${overtime ? 'bg-warning' : 'bg-error animate-pulse'}`} />
              {formatDuration(elapsed)}
              {overtime && <span className="font-sans">· overtime</span>}
            </span>
            {reconnecting && (
              <span className="px-2.5 py-1 rounded-full bg-warning/25 text-warning text-xs font-bold flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" /> Reconnecting…
              </span>
            )}
          </div>
        </div>
        <button onClick={() => setPanel('settings')} aria-label="Call settings" className="w-11 h-11 shrink-0 rounded-full bg-white/10 text-white flex items-center justify-center">
          <Settings size={20} />
        </button>
      </div>

      {/* Overtime banner — the parent has consented and the meter is running */}
      {overtime && phase === 'active' && call?.overage?.ratePerMinute > 0 && (
        <div className="relative z-10 mx-4 self-start bg-warning/25 border border-warning/40 backdrop-blur rounded-xl px-3 py-2 flex items-center gap-2">
          <Clock size={15} className="text-warning" />
          <span className="text-white text-xs font-bold">
            Overtime · ₹{call.overage.ratePerMinute}/min
          </span>
        </div>
      )}

      {/* Self view */}
      <div
        className="absolute right-4 z-10 w-28 aspect-[3/4] bg-[#1f2937] rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl"
        style={{ top: 'calc(112px + env(safe-area-inset-top, 0px))' }}
      >
        <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        {!camOn && (
          <div className="absolute inset-0 bg-[#1f2937] flex items-center justify-center">
            <VideoOff size={20} className="text-white/60" />
          </div>
        )}
        <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 bg-black/60 rounded text-white text-[10px] font-medium">
          You
        </div>
      </div>

      <div className="flex-1" />

      {peerPresent && (
        <div className="relative z-10 mx-4 mb-3 self-start px-3 py-1.5 bg-black/60 backdrop-blur rounded-lg text-white text-sm font-medium">
          {appointment.owner}
        </div>
      )}

      {/* Controls */}
      <div
        className="relative z-10 bg-gradient-to-t from-black/85 to-transparent px-4 pt-6"
        style={{ paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))' }}
      >
        {phase !== 'ended' ? (
          <div className="flex items-center justify-between gap-2 max-w-sm mx-auto">
            <button
              onClick={toggleMic}
              aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
              className={`${roundBtn} ${micOn ? 'bg-white/15 text-white' : 'bg-error/25 text-error'}`}
            >
              {micOn ? <Mic size={22} /> : <MicOff size={22} />}
            </button>
            <button
              onClick={toggleCam}
              aria-label={camOn ? 'Turn camera off' : 'Turn camera on'}
              className={`${roundBtn} ${camOn ? 'bg-white/15 text-white' : 'bg-error/25 text-error'}`}
            >
              {camOn ? <VideoIcon size={22} /> : <VideoOff size={22} />}
            </button>
            <button
              onClick={() => setPanel('notes')}
              aria-label="Live notes"
              className={`${roundBtn} bg-white/15 text-white`}
            >
              <FileText size={22} />
            </button>
            <button
              onClick={() => setPanel('chat')}
              aria-label="Meeting chat"
              className={`${roundBtn} bg-white/15 text-white`}
            >
              <MessageSquare size={22} />
            </button>
            <button
              onClick={handleEndCall}
              aria-label="End call"
              className={`${roundBtn} bg-error text-white shadow-lg shadow-error/30`}
            >
              <PhoneOff size={22} />
            </button>
          </div>
        ) : (
          <div className="flex gap-2 max-w-sm mx-auto">
            <button
              onClick={() => setPanel('notes')}
              className="flex-1 h-12 rounded-2xl bg-white/15 text-white text-sm font-bold flex items-center justify-center gap-2"
            >
              <FileText size={16} /> Notes
            </button>
            <button
              onClick={handleClose}
              className="flex-1 h-12 rounded-2xl bg-error text-white text-sm font-bold flex items-center justify-center gap-2"
            >
              <PhoneOff size={16} /> Close
            </button>
          </div>
        )}
      </div>

      {/* Call settings */}
      <ActionSheet
        open={panel === 'settings'}
        onClose={() => setPanel(null)}
        title="Call settings"
        actions={[
          { key: 'flip', label: 'Switch camera', icon: SwitchCamera, hint: 'Front / back camera', disabled: !camOn || phase === 'ended', onClick: () => { setPanel(null); handleFlipCamera(); } },
          { key: 'mic', label: micOn ? 'Mute microphone' : 'Unmute microphone', icon: micOn ? MicOff : Mic, disabled: phase === 'ended', onClick: () => { setPanel(null); toggleMic(); } },
          { key: 'cam', label: camOn ? 'Turn camera off' : 'Turn camera on', icon: camOn ? VideoOff : VideoIcon, disabled: phase === 'ended', onClick: () => { setPanel(null); toggleCam(); } },
        ]}
      />

      {/* Live notes */}
      <BottomSheet
        open={panel === 'notes'}
        onClose={() => setPanel(null)}
        title="Live Notes"
        zIndex={90}
        footer={(
          <button
            onClick={handleSaveNotes}
            className="w-full h-12 rounded-2xl bg-accent-teal text-white text-[15px] font-bold"
          >
            Save
          </button>
        )}
      >
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={8}
          placeholder="Type your diagnosis and observations here during the call..."
          className={textareaClass}
        />
      </BottomSheet>

      {/* Meeting chat */}
      <BottomSheet
        open={panel === 'chat'}
        onClose={() => setPanel(null)}
        title="Meeting Chat"
        zIndex={90}
        footer={(
          <form onSubmit={handleSendChat} className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
              className={`${fieldClass} flex-1 min-w-0`}
            />
            <button type="submit" className="h-12 px-5 bg-text-primary text-white rounded-2xl text-sm font-bold shrink-0">
              Send
            </button>
          </form>
        )}
      >
        <div className="space-y-4 pb-2 min-h-[160px]">
          {chatMessages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.sender === 'You' ? 'items-end' : 'items-start'}`}>
              <span className="text-[10px] text-text-secondary font-medium mb-1">
                {msg.sender} {msg.time && `• ${msg.time}`}
              </span>
              <div className={`px-3 py-2 rounded-2xl text-sm ${
                msg.sender === 'System' ? 'bg-bg-secondary text-text-secondary w-full text-center text-xs'
                  : msg.sender === 'You' ? 'bg-primary-main text-white rounded-br-none'
                    : 'bg-white border border-border-light text-text-primary rounded-bl-none shadow-sm'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}

function Overlay({ icon, title, children }) {
  return (
    <div className="absolute inset-0 bg-[#111827]/95 flex flex-col items-center justify-center gap-3 text-center px-8">
      {icon}
      <h3 className="text-white font-bold text-lg">{title}</h3>
      {children}
    </div>
  );
}
