import React, { useState, useEffect, useRef } from 'react';
import {
  PhoneOff, Mic, MicOff, Video as VideoIcon, VideoOff, MessageSquare,
  Settings, FileText, Loader2, AlertCircle, Clock, IndianRupee, Ban,
} from 'lucide-react';
import { useVendor } from '../context/ClinicVendorContext';
import { useCall } from '../../../../context/CallContext';
import { primeDevices, formatDuration } from '../../../../services/webrtcCall';
import { waiveOverage } from '../../../../services/consultApi';

/**
 * Vet-side video consultation.
 *
 * Media is direct browser-to-browser WebRTC — this used to render a
 * placeholder <div> with the pet's first initial and a purely local timer.
 * The layout (live notes, chat, controls) is unchanged; the fake video panes
 * are replaced by the real local/remote streams.
 *
 * The timer shown here is cosmetic. Billable duration is computed server-side
 * from socket join/leave events, so nothing the vet's browser does can alter
 * a charge.
 */
export function VideoConsultationView({ appointment, onNavigate }) {
  const { addDoctorConsultationNotes } = useVendor();
  const {
    phase, call, incoming, error, mediaWarning, remoteStream, localStream, micOn, camOn,
    peerPresent, reconnecting, elapsed,
    startCall, acceptCall, endCall, toggleMic, toggleCam, reset,
  } = useCall();

  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);

  const [showChat, setShowChat] = useState(true);
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
    if (!window.confirm('End this consultation?')) return;
    await endCall({ notes: notes.trim() || undefined });
    reset();
    if (onNavigate) onNavigate('dashboard');
  };

  const handleSaveNotes = async () => {
    if (!notes.trim()) return;
    await addDoctorConsultationNotes(appointment.id, notes);
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

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col font-sans">
      {/* Top Bar */}
      <div className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h2 className="text-white font-bold text-lg">
              {appointment.petName} &amp; {appointment.owner}
            </h2>
            <p className="text-gray-400 text-xs">
              Video Consultation • {call?.scheduledMinutes || 15} min booked
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold font-mono flex items-center gap-2 ${
            overtime ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-500'
          }`}>
            <span className={`w-2 h-2 rounded-full ${overtime ? 'bg-amber-400' : 'bg-red-500 animate-pulse'}`} />
            {formatDuration(elapsed)}
            {overtime && <span className="font-sans">· overtime</span>}
          </div>
          {reconnecting && (
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center gap-2">
              <Loader2 size={12} className="animate-spin" /> Reconnecting…
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition">
            <Settings size={20} />
          </button>
          <button
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
            onClick={() => setShowChat(!showChat)}
          >
            <MessageSquare size={20} className={showChat ? 'text-blue-400' : ''} />
          </button>
          <button
            onClick={phase === 'ended' ? handleClose : handleEndCall}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition flex items-center gap-2"
          >
            <PhoneOff size={16} /> {phase === 'ended' ? 'Close' : 'End Call'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main video area */}
        <div className="flex-1 p-4 flex flex-col relative bg-black">
          <div className="w-full h-full rounded-2xl bg-gray-800 overflow-hidden relative border border-gray-700">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />

            {/* Overlays for every non-connected state */}
            {phase === 'ended' ? (
              <Overlay icon={<PhoneOff size={32} className="text-white/60" />} title="Consultation ended">
                {owed && (
                  <div className="mt-4 bg-amber-500/15 border border-amber-400/30 rounded-xl p-4 max-w-sm text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <IndianRupee size={15} className="text-amber-300" />
                      <span className="font-bold text-amber-200 text-sm">
                        Extra time — {owed.minutes} min · ₹{owed.amount}
                      </span>
                    </div>
                    <p className="text-white/50 text-xs leading-relaxed mb-3">
                      Invoiced to {appointment.owner || 'the pet parent'} at ₹{owed.ratePerMinute}/min.
                      You can waive it if the overrun was on your side.
                    </p>
                    <button
                      onClick={handleWaive}
                      disabled={waiving}
                      className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Ban size={13} /> {waiving ? 'Waiving…' : 'Waive this charge'}
                    </button>
                  </div>
                )}
              </Overlay>
            ) : permission && !permission.granted ? (
              <Overlay icon={<AlertCircle size={32} className="text-amber-400" />} title="Camera & microphone blocked">
                <p className="text-white/50 text-sm max-w-sm">{permission.reason}</p>
              </Overlay>
            ) : startError || error ? (
              <Overlay icon={<AlertCircle size={32} className="text-red-400" />} title="Could not start">
                <p className="text-white/50 text-sm max-w-sm">{startError || error}</p>
              </Overlay>
            ) : !peerPresent ? (
              <Overlay
                icon={<Loader2 size={32} className="text-white/50 animate-spin" />}
                title={phase === 'outgoing' || phase === 'connecting' ? 'Calling…' : 'Waiting to connect'}
              >
                <p className="text-white/50 text-sm">
                  Waiting for {appointment.owner || 'the pet parent'} to join
                </p>
              </Overlay>
            ) : phase !== 'active' ? (
              // The other side's socket is in the call, but the actual media
              // connection hasn't come up yet — a different problem than
              // "nobody's here" (see CallContext.jsx).
              <Overlay icon={<Loader2 size={32} className="text-white/50 animate-spin" />} title="Connecting video…">
                {mediaWarning && <p className="text-amber-300 text-sm max-w-sm">{mediaWarning}</p>}
              </Overlay>
            ) : null}

            {peerPresent && (
              <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/60 backdrop-blur rounded-lg text-white text-sm font-medium">
                {appointment.owner}
              </div>
            )}
          </div>

          {/* Self view */}
          <div className="absolute top-8 right-8 w-48 aspect-video bg-gray-800 rounded-xl overflow-hidden border-2 border-gray-700 shadow-2xl">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {!camOn && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <VideoOff size={20} className="text-white/60" />
              </div>
            )}
            <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 rounded text-white text-[10px] font-medium">
              You
            </div>
          </div>

          {/* Controls */}
          {phase !== 'ended' && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-gray-900/90 backdrop-blur border border-gray-800 p-3 rounded-2xl shadow-2xl">
              <button
                onClick={toggleMic}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition ${
                  micOn ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-red-500/20 text-red-500'
                }`}
              >
                {micOn ? <Mic size={20} /> : <MicOff size={20} />}
              </button>
              <button
                onClick={toggleCam}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition ${
                  camOn ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-red-500/20 text-red-500'
                }`}
              >
                {camOn ? <VideoIcon size={20} /> : <VideoOff size={20} />}
              </button>
              <div className="w-px h-8 bg-gray-700 mx-2" />
              <button
                onClick={handleEndCall}
                className="px-6 h-12 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition flex items-center gap-2"
              >
                <PhoneOff size={20} /> End
              </button>
            </div>
          )}

          {/* Overtime banner — the parent has consented and the meter is running */}
          {overtime && phase === 'active' && call?.overage?.ratePerMinute > 0 && (
            <div className="absolute top-8 left-8 bg-amber-500/20 border border-amber-400/40 backdrop-blur rounded-xl px-4 py-2 flex items-center gap-2">
              <Clock size={15} className="text-amber-300" />
              <span className="text-amber-200 text-xs font-bold">
                Overtime · ₹{call.overage.ratePerMinute}/min
              </span>
            </div>
          )}
        </div>

        {/* Side panel — notes & chat */}
        {showChat && (
          <div className="w-96 bg-white flex flex-col border-l border-gray-200">
            <div className="flex-1 flex flex-col border-b border-gray-200 min-h-0">
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center shrink-0">
                <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                  <FileText size={16} /> Live Notes
                </h3>
                <button onClick={handleSaveNotes} className="text-xs font-bold text-emerald-600 hover:underline">
                  Save
                </button>
              </div>
              <div className="p-4 flex-1 overflow-y-auto">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Type your diagnosis and observations here during the call..."
                  className="w-full h-full resize-none border-none focus:ring-0 text-sm text-gray-700 placeholder-gray-400"
                />
              </div>
            </div>

            <div className="flex-1 flex flex-col bg-gray-50 min-h-0">
              <div className="p-4 border-b border-gray-200 bg-white shrink-0">
                <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                  <MessageSquare size={16} /> Meeting Chat
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex flex-col ${msg.sender === 'You' ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] text-gray-400 font-medium mb-1">
                      {msg.sender} {msg.time && `• ${msg.time}`}
                    </span>
                    <div className={`px-3 py-2 rounded-xl text-sm ${
                      msg.sender === 'System' ? 'bg-gray-200 text-gray-600 w-full text-center text-xs'
                        : msg.sender === 'You' ? 'bg-[#F87B68] text-white rounded-br-none'
                          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-white border-t border-gray-200 shrink-0">
                <form onSubmit={handleSendChat} className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F87B68]"
                  />
                  <button type="submit" className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-900 transition">
                    Send
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Overlay({ icon, title, children }) {
  return (
    <div className="absolute inset-0 bg-gray-900/95 flex flex-col items-center justify-center gap-3 text-center px-8">
      {icon}
      <h3 className="text-white font-bold text-lg">{title}</h3>
      {children}
    </div>
  );
}
