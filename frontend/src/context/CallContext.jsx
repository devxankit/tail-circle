import {
  createContext, useContext, useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { connectSocket, getSocket } from '../services/socket';
import { isLoggedIn, getAccessToken } from '../services/api';
import * as consultApi from '../services/consultApi';
import { createCall, leaveCall, flipCamera as flipCameraTrack } from '../services/webrtcCall';

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
 * Ringing lives in signalling (Socket.IO or REST polling fallback). The WebRTC
 * peer connection only opens once TURN credentials exist, which is why
 * `connecting` is a distinct phase: authorization is granted but media has
 * not yet flowed.
 *
 * Mounted once at the app root so a call survives navigation.
 */

const CallContext = createContext(null);

export const CALL_PHASES = ['idle', 'incoming', 'outgoing', 'connecting', 'active', 'ended'];

/**
 * Cadence of the REST polling fallback (see the effect that uses these).
 *
 * A hidden tab backs off rather than stopping: the poll exists precisely for
 * when Socket.IO is down, and a call can arrive at a backgrounded tab, so
 * stopping would reopen the hole it was added to close.
 */
const POLL_VISIBLE_MS = 3500;
const POLL_HIDDEN_MS = 15000;

export function CallProvider({ children }) {
  const [phase, setPhase] = useState('idle');
  const [call, setCall] = useState(null);        // server ConsultCall payload
  const [incoming, setIncoming] = useState(null); // ring payload from socket or poll
  const [error, setError] = useState('');        // hard failure — call could not start/join at all
  const [mediaWarning, setMediaWarning] = useState(''); // soft, non-fatal — still trying, here's why

  // Media state — plain WebRTC now: one local MediaStream we captured, one
  // remote MediaStream from the peer, no LiveKit Track wrapper objects.
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [peerPresent, setPeerPresent] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  // Timer is display-only; billable duration is computed server-side from
  // the socket join/leave events (consult.service.js) and must never be
  // derived from this.
  const [elapsed, setElapsed] = useState(0);

  // Overage
  const [overagePrompt, setOveragePrompt] = useState(null); // {ratePerMinute}
  const [overageAccepted, setOverageAccepted] = useState(false);

  const callRef = useRef(null);
  const bookingRef = useRef(null);

  const reset = useCallback(() => {
    setPhase('idle');
    setCall(null);
    setIncoming(null);
    setRemoteStream(null);
    setLocalStream(null);
    setPeerPresent(false);
    setReconnecting(false);
    setElapsed(0);
    setOveragePrompt(null);
    setOverageAccepted(false);
    setError('');
    setMediaWarning('');
    callRef.current = null;
    bookingRef.current = null;
  }, []);

  /* ── Media ────────────────────────────────────────────── */

  /**
   * @param opts.role  'vet' | 'patient' — the vet always creates the WebRTC
   *   offer, the pet parent always answers (see webrtcCall.js), regardless of
   *   who started the call.
   */
  const connectMedia = useCallback(async (payload, { video = true, role } = {}) => {
    setPhase('connecting');
    const socket = getSocket();
    try {
      const call = await createCall({
        bookingId: bookingRef.current,
        isOfferer: role === 'vet',
        iceServers: payload.iceServers || [],
        video,
        socket,
        on: {
          trackSubscribed: ({ stream }) => setRemoteStream(stream),
          // Two distinct signals, deliberately not conflated:
          //  - participantConnected/Disconnected: the peer's SOCKET is in the
          //    call's signalling room. Drives the "waiting for the other
          //    side" UI. Does NOT mean media is flowing.
          //  - connected: the actual RTCPeerConnection reached 'connected' —
          //    video/audio is really working. This is the only thing allowed
          //    to flip `phase` to 'active'. Conflating the two used to make
          //    the UI claim "connected" the instant the peer's socket joined,
          //    even when the underlying media never came up (see
          //    mediaTimeout below) — a call that looked fine and showed
          //    nothing but a black box.
          participantConnected: () => setPeerPresent(true),
          participantDisconnected: () => setPeerPresent(false),
          connected: () => { setMediaWarning(''); setPhase('active'); },
          // 20s after the peer's socket joined with no media connection —
          // almost always means no direct path between the two networks and
          // no TURN relay able to bridge it. This is NOT a hard failure (ICE
          // can still succeed after this fires), so it's surfaced as a
          // dismissable warning, not the same `error` a real start/join
          // failure uses — the in-call screen shows *why* it's stuck instead
          // of a blank box, without claiming the call is dead.
          mediaTimeout: () => setMediaWarning(
            'Still trying to connect the video call. This usually means the network needs a relay server — try switching to Wi-Fi, or contact support if it keeps happening.'
          ),
          reconnecting: () => setReconnecting(true),
          reconnected: () => setReconnecting(false),
          disconnected: () => setPhase((p) => (p === 'ended' ? p : 'ended')),
          deviceError: (err) => setMediaWarning(err?.message || 'Camera or microphone unavailable'),
        },
      });

      callRef.current = call;
      setLocalStream(call.localStream);
      return call.pc;
    } catch (err) {
      // Do NOT fake a connected state here (an earlier version of this code
      // did, inherited from a LiveKit-era fallback). createCall() failing
      // means this browser never even joined the call's signalling room —
      // markParticipantJoined() never fires, the peer can never receive an
      // offer/answer, and the call can never actually connect. Pretending
      // otherwise just hides the failure instead of fixing it: the other
      // side is left waiting forever with no way to know why. Rethrow so the
      // caller's existing error handling (startCall/acceptCall) surfaces it.
      console.warn('WebRTC connectMedia error:', err?.message || err);
      throw err;
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
    leaveCall(callRef.current, getSocket());
    callRef.current = null;
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

  const toggleMic = useCallback(() => {
    const stream = callRef.current?.localStream;
    if (!stream) return;
    const next = !micOn;
    stream.getAudioTracks().forEach((t) => { t.enabled = next; });
    setMicOn(next);
  }, [micOn]);

  const toggleCam = useCallback(() => {
    const stream = callRef.current?.localStream;
    if (!stream) return;
    const next = !camOn;
    stream.getVideoTracks().forEach((t) => { t.enabled = next; });
    setCamOn(next);
  }, [camOn]);

  /** Front/back camera on mobile. */
  const flipCamera = useCallback(async () => {
    if (!callRef.current) return;
    const stream = await flipCameraTrack(callRef.current);
    if (stream) setLocalStream(stream);
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
      leaveCall(callRef.current, socket);
      callRef.current = null;
      setPhase('ended');
      setCall((c) => (c && p?.status ? { ...c, status: p.status } : c));
    };
    const onRejected = () => {
      setIncoming(null);
      leaveCall(callRef.current, socket);
      callRef.current = null;
      setPhase('ended');
      setError('The call was declined');
    };
    // Server cut the call at the overage cap — no LiveKit to force-disconnect
    // us anymore, so it just tells both sockets to tear down.
    const onForceEnd = () => {
      leaveCall(callRef.current, socket);
      callRef.current = null;
      setPhase('ended');
      setError('This consultation was ended because it reached its extra-time limit');
    };
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
    socket.on('call:force-end', onForceEnd);
    socket.on('call:overage-started', onOverageStarted);
    socket.on('call:overage-due', onOverageDue);
    socket.on('call:overage-waived', onOverageWaived);
    socket.on('call:overage-paid', onOveragePaid);

    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:accept', onAccept);
      socket.off('call:end', onEnd);
      socket.off('call:reject', onRejected);
      socket.off('call:force-end', onForceEnd);
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

  // REST polling fallback for environments where Socket.IO is serverless or
  // down. Fast while the tab is in front so an incoming call rings promptly,
  // slower when it is hidden, and an immediate re-sync on returning to the tab
  // so coming back never waits out the slow interval.
  useEffect(() => {
    let timer;
    const schedule = () => {
      clearInterval(timer);
      const ms = document.visibilityState === 'hidden' ? POLL_HIDDEN_MS : POLL_VISIBLE_MS;
      timer = setInterval(syncActiveConsult, ms);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') syncActiveConsult();
      schedule();
    };

    syncActiveConsult();
    schedule();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [syncActiveConsult]);

  const value = useMemo(() => ({
    phase, call, incoming, error, mediaWarning, localStream, remoteStream,
    micOn, camOn, peerPresent, reconnecting, elapsed,
    overagePrompt, overageAccepted,
    startCall, acceptCall, rejectCall, endCall, acceptOverage,
    toggleMic, toggleCam, flipCamera, reset,
    isBusy: phase !== 'idle' && phase !== 'ended',
  }), [
    phase, call, incoming, error, mediaWarning, localStream, remoteStream, micOn, camOn,
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
