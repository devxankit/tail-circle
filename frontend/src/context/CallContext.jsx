import {
  createContext, useContext, useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { connectSocket, getSocket } from '../services/socket';
import { isLoggedIn, getAccessToken } from '../services/api';
import * as consultApi from '../services/consultApi';
import { joinRoom, leaveRoom } from '../services/livekitRoom';

function getCurrentUserId() {
  try {
    const token = getAccessToken();
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub || payload.id || null;
  } catch {
    return null;
  }
}

/**
 * Video consultation state machine, shared across the whole app.
 *
 *   idle → incoming/outgoing → connecting → active → ended → idle
 *
 * Ringing lives in signalling (Socket.IO or REST polling fallback). LiveKit only enters once a
 * token exists, which is why `connecting` is a distinct phase: the token has
 * been issued but media has not yet flowed.
 *
 * Mounted once at the app root so a call survives navigation.
 */

const CallContext = createContext(null);

export const CALL_PHASES = ['idle', 'incoming', 'outgoing', 'connecting', 'active', 'ended'];

export function CallProvider({ children }) {
  const [phase, setPhase] = useState('idle');
  const [call, setCall] = useState(null);        // server ConsultCall payload
  const [incoming, setIncoming] = useState(null); // ring payload from socket or poll
  const [error, setError] = useState('');

  // Media state
  const [room, setRoom] = useState(null);
  const [remoteTracks, setRemoteTracks] = useState({ video: null, audio: null });
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [peerPresent, setPeerPresent] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  // Timer is display-only; billable duration is computed server-side from
  // LiveKit webhooks and must never be derived from this.
  const [elapsed, setElapsed] = useState(0);

  // Overage
  const [overagePrompt, setOveragePrompt] = useState(null); // {ratePerMinute}
  const [overageAccepted, setOverageAccepted] = useState(false);

  const roomRef = useRef(null);
  const bookingRef = useRef(null);

  const reset = useCallback(() => {
    setPhase('idle');
    setCall(null);
    setIncoming(null);
    setRemoteTracks({ video: null, audio: null });
    setLocalVideoTrack(null);
    setPeerPresent(false);
    setReconnecting(false);
    setElapsed(0);
    setOveragePrompt(null);
    setOverageAccepted(false);
    setError('');
    roomRef.current = null;
    bookingRef.current = null;
    setRoom(null);
  }, []);

  /* ── Media ────────────────────────────────────────────── */

  const connectMedia = useCallback(async (payload, { video = true } = {}) => {
    setPhase('connecting');
    try {
      const res = await joinRoom(payload.token, payload.url, {
        video,
        iceServers: payload.iceServers || [],
        on: {
          trackSubscribed: ({ track, kind }) =>
            setRemoteTracks((prev) => ({ ...prev, [kind]: track })),
          trackUnsubscribed: ({ track }) =>
            setRemoteTracks((prev) => ({ ...prev, [track.kind]: null })),
          participantConnected: () => { setPeerPresent(true); setPhase('active'); },
          participantDisconnected: () => setPeerPresent(false),
          reconnecting: () => setReconnecting(true),
          reconnected: () => setReconnecting(false),
          disconnected: () => setPhase((p) => (p === 'ended' ? p : 'ended')),
          deviceError: (err) => setError(err?.message || 'Camera or microphone unavailable'),
        },
      });

      const r = res?.room;
      if (r) {
        roomRef.current = r;
        setRoom(r);

        const publishLocal = () => {
          const pub = r.localParticipant?.getTrackPublication?.('camera');
          setLocalVideoTrack(pub?.videoTrack || null);
        };
        publishLocal();
        r.localParticipant?.on?.('trackPublished', publishLocal);
        r.localParticipant?.on?.('trackMuted', publishLocal);
        r.localParticipant?.on?.('trackUnmuted', publishLocal);

        if (r.remoteParticipants?.size > 0) { setPeerPresent(true); setPhase('active'); }
      } else {
        setPhase('active');
        setPeerPresent(true);
      }
      getSocket()?.emit('call:connected', { bookingId: bookingRef.current });
      return r || null;
    } catch (err) {
      console.warn('LiveKit connectMedia fallback:', err?.message || err);
      setPhase('active');
      setPeerPresent(true);
      getSocket()?.emit('call:connected', { bookingId: bookingRef.current });
      return null;
    }
  }, []);

  /* ── Actions ──────────────────────────────────────────── */

  /** Vet: start the consultation and ring the pet parent. */
  const startCall = useCallback(async (bookingId, opts = {}) => {
    setError('');
    bookingRef.current = bookingId;
    setPhase('outgoing');
    try {
      const payload = await consultApi.startConsult(bookingId);
      setCall(payload);
      await connectMedia(payload, opts);
      return payload;
    } catch (e) {
      setError(e.message || 'Could not start the consultation');
      setPhase('idle');
      throw e;
    }
  }, [connectMedia]);

  /** Pet parent: accept, or either side rejoining. */
  const acceptCall = useCallback(async (bookingId, opts = {}) => {
    setError('');
    bookingRef.current = bookingId;
    try {
      const payload = await consultApi.joinConsult(bookingId);
      setCall(payload);
      setIncoming(null);
      await connectMedia(payload, opts);
      return payload;
    } catch (e) {
      setError(e.message || 'Could not join the consultation');
      setPhase('idle');
      throw e;
    }
  }, [connectMedia]);

  const rejectCall = useCallback(async (bookingId) => {
    const id = bookingId || bookingRef.current;
    setIncoming(null);
    setPhase('ended');
    try {
      if (id) await consultApi.rejectConsult(id);
    } catch { /* best effort */ }
    reset();
  }, [reset]);

  const endCall = useCallback(async ({ notes } = {}) => {
    const bookingId = bookingRef.current;
    await leaveRoom(roomRef.current);
    let result = null;
    try {
      if (bookingId) result = await consultApi.endConsult(bookingId, { notes });
    } catch (e) {
      setError(e.message || '');
    }
    setPhase('ended');
    setCall(result || call);
    return result;
  }, [call]);

  const acceptOverage = useCallback(async () => {
    const bookingId = bookingRef.current;
    if (!bookingId) return;
    await consultApi.consentToOverage(bookingId);
    setOverageAccepted(true);
    setOveragePrompt(null);
  }, []);

  const toggleMic = useCallback(async () => {
    const r = roomRef.current;
    if (!r) return;
    const next = !micOn;
    await r.localParticipant.setMicrophoneEnabled(next);
    setMicOn(next);
  }, [micOn]);

  const toggleCam = useCallback(async () => {
    const r = roomRef.current;
    if (!r) return;
    const next = !camOn;
    await r.localParticipant.setCameraEnabled(next);
    setCamOn(next);
  }, [camOn]);

  /** Front/back camera on mobile. */
  const flipCamera = useCallback(async () => {
    const r = roomRef.current;
    if (!r) return;
    const current = r.localParticipant.getTrackPublication?.('camera');
    const facing = current?.track?.mediaStreamTrack?.getSettings?.().facingMode;
    await r.switchActiveDevice?.('videoinput', facing === 'user' ? 'environment' : 'user');
  }, []);

  /* ── Socket signalling ────────────────────────────────── */

  useEffect(() => {
    if (!isLoggedIn()) return undefined;
    const socket = connectSocket();

    const onIncoming = (p) => {
      setPhase((prev) => {
        if (prev === 'active' || prev === 'connecting') return prev;
        setIncoming(p);
        bookingRef.current = p.bookingId;
        return 'incoming';
      });
    };
    const onAccept = () => setPhase((prev) => (prev === 'outgoing' || prev === 'incoming' ? 'connecting' : prev));
    const onEnd = (p) => {
      setIncoming(null);
      leaveRoom(roomRef.current);
      setPhase('ended');
      setCall((c) => (c && p?.status ? { ...c, status: p.status } : c));
    };
    const onRejected = () => { setIncoming(null); leaveRoom(roomRef.current); setPhase('ended'); setError('The call was declined'); };
    const onOverageStarted = (p) => { setOveragePrompt(null); setOverageAccepted(true); setCall((c) => (c ? { ...c, overage: { ...c.overage, ...p } } : c)); };
    // Fired once the call has ended with unpaid overtime (settleOverage on the server).
    const onOverageDue = (p) => setCall((c) => (c ? { ...c, overage: { ...c.overage, status: 'pending', minutes: p.minutes, amount: p.amount } } : c));
    // Vet forgave the charge before it was paid.
    const onOverageWaived = () => setCall((c) => (c ? { ...c, overage: { ...c.overage, status: 'waived', waived: true, amount: 0 } } : c));
    // Pet parent settled the overage invoice via Razorpay.
    const onOveragePaid = (p) => setCall((c) => (c ? { ...c, overage: { ...c.overage, status: 'paid', amount: p.amount ?? c.overage.amount } } : c));

    socket.on('call:incoming', onIncoming);
    socket.on('call:accept', onAccept);
    socket.on('call:end', onEnd);
    socket.on('call:reject', onRejected);
    socket.on('call:overage-started', onOverageStarted);
    socket.on('call:overage-due', onOverageDue);
    socket.on('call:overage-waived', onOverageWaived);
    socket.on('call:overage-paid', onOveragePaid);

    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:accept', onAccept);
      socket.off('call:end', onEnd);
      socket.off('call:reject', onRejected);
      socket.off('call:overage-started', onOverageStarted);
      socket.off('call:overage-due', onOverageDue);
      socket.off('call:overage-waived', onOverageWaived);
      socket.off('call:overage-paid', onOveragePaid);
    };
  }, []);

  /* ── In-call timer + local overage prompt ─────────────── */

  useEffect(() => {
    if (phase !== 'active') return undefined;
    const started = Date.now() - elapsed * 1000;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Prompt the pet parent to approve overtime as the booked duration runs out.
  // The server is the authority on what is actually billed; this is the consent UI.
  useEffect(() => {
    if (phase !== 'active' || !call || overageAccepted) return;
    const rate = call.overage?.ratePerMinute || 0;
    if (rate <= 0) return;
    const limit = (call.scheduledMinutes || 15) * 60;
    if (elapsed >= limit && !overagePrompt) {
      setOveragePrompt({ ratePerMinute: rate, graceMinutes: call.overage.graceMinutes });
    }
  }, [elapsed, phase, call, overageAccepted, overagePrompt]);

  /* ── Resume / Hydrate live call & REST Polling Fallback ───── */

  const syncActiveConsult = useCallback(async () => {
    if (!isLoggedIn()) return;
    try {
      const active = await consultApi.getActiveConsult();
      if (active && ['ringing', 'active'].includes(active.status)) {
        setCall(active);
        bookingRef.current = active.bookingId;
        const currentUserId = getCurrentUserId();

        if (active.status === 'ringing') {
          // If current user is the owner (caller), show outgoing calling state.
          // If current user is doctor/clinic (recipient), trigger incoming overlay!
          const isCaller = currentUserId && String(active.ownerUserId) === String(currentUserId);
          if (isCaller) {
            setPhase((prev) => (prev === 'idle' ? 'connecting' : prev));
          } else {
            setIncoming({ bookingId: active.bookingId, ...active });
            setPhase((prev) => (prev === 'active' || prev === 'connecting' ? prev : 'incoming'));
          }
        } else if (active.status === 'active') {
          setPhase((prev) => (prev === 'idle' || prev === 'incoming' || prev === 'connecting' ? 'active' : prev));
        }
      }
    } catch {
      /* no active call */
    }
  }, []);

  useEffect(() => {
    syncActiveConsult();
    // 3.5s REST polling fallback for environments where Socket.IO is serverless or down
    const timer = setInterval(syncActiveConsult, 3500);
    return () => clearInterval(timer);
  }, [syncActiveConsult]);

  const value = useMemo(() => ({
    phase, call, incoming, error, room, remoteTracks, localVideoTrack,
    micOn, camOn, peerPresent, reconnecting, elapsed,
    overagePrompt, overageAccepted,
    startCall, acceptCall, rejectCall, endCall, acceptOverage,
    toggleMic, toggleCam, flipCamera, reset,
    isBusy: phase !== 'idle' && phase !== 'ended',
  }), [
    phase, call, incoming, error, room, remoteTracks, localVideoTrack, micOn, camOn,
    peerPresent, reconnecting, elapsed, overagePrompt, overageAccepted,
    startCall, acceptCall, rejectCall, endCall, acceptOverage,
    toggleMic, toggleCam, flipCamera, reset,
  ]);

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used inside <CallProvider>');
  return ctx;
}

export default CallContext;
