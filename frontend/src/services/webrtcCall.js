/**
 * Direct browser-to-browser WebRTC (P2P) for video consults — shared by the
 * vet dashboard and the pet-parent app.
 *
 * Every consult is exactly one vet and one pet parent, so there's no group
 * fan-out to justify a media server: the two browsers exchange audio/video
 * directly, with the app's own authenticated Socket.IO connection carrying
 * the offer/answer/ICE exchange (see `backend/src/sockets/index.js`).
 *
 * Offerer/answerer roles are fixed rather than negotiated: the **vet always
 * creates the offer**, the pet parent always answers, regardless of who
 * started the call. That sidesteps "glare" (both sides offering at once)
 * without needing full perfect-negotiation machinery.
 */

const RTC_CONFIG_DEFAULTS = {
  audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  videoCaptureDefaults: { width: 1280, height: 720 },
};

// If media hasn't connected this long after we know the peer is in the
// room, the most likely cause is no direct path between the two networks
// AND no usable TURN relay — a dead-silent failure otherwise, since ICE
// just keeps "checking" indefinitely with nothing to show the user.
const MEDIA_CONNECT_TIMEOUT_MS = 20_000;

/**
 * Inspect which kind of ICE candidate pair actually got used, once
 * connected — 'relay' means TURN was needed and worked; 'host'/'srflx'
 * means a direct path was found and TURN was never involved. Purely
 * diagnostic (reported back to the server so failures are debuggable from
 * logs instead of guesswork — see `call:media-state` in sockets/index.js).
 */
async function describeConnection(pc) {
  try {
    const stats = await pc.getStats();
    let pairId = null;
    stats.forEach((r) => {
      if (r.type === 'transport' && r.selectedCandidatePairId) pairId = r.selectedCandidatePairId;
    });
    if (!pairId) {
      stats.forEach((r) => {
        if (r.type === 'candidate-pair' && r.state === 'succeeded' && (r.nominated ?? true)) pairId = r.id;
      });
    }
    const pair = pairId ? stats.get(pairId) : null;
    if (!pair) return null;
    const local = stats.get(pair.localCandidateId);
    const remote = stats.get(pair.remoteCandidateId);
    return { local: local?.candidateType || null, remote: remote?.candidateType || null };
  } catch {
    return null;
  }
}

/**
 * Capture local media, open a peer connection, and run the signalling
 * handshake over `socket`.
 *
 * @param bookingId    the consult this call belongs to — scopes the signalling room
 * @param isOfferer    true for the vet; the pet parent always answers
 * @param iceServers   TURN/STUN list from the API, for strict NAT
 * @param video        publish the camera (false for an audio-only consult)
 * @param socket       the shared, already-authenticated Socket.IO client
 * @param on           lifecycle callbacks — trackSubscribed, participantConnected,
 *                     participantDisconnected, connected, reconnecting, reconnected,
 *                     disconnected, deviceError
 */
export async function createCall({
  bookingId,
  isOfferer,
  iceServers = [],
  video = true,
  audio = true,
  socket,
  on = {},
}) {
  if (!socket) throw new Error('No signalling connection available');

  const localStream = await navigator.mediaDevices.getUserMedia({
    audio: audio ? RTC_CONFIG_DEFAULTS.audioCaptureDefaults : false,
    video: video ? RTC_CONFIG_DEFAULTS.videoCaptureDefaults : false,
  });

  const pc = new RTCPeerConnection({ iceServers });
  localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

  // Fire-and-forget: lets the server log what actually happened to this
  // call's media, since none of this is otherwise visible outside the
  // browser that hit it.
  const report = (state, extra = {}) => socket.emit('call:media-state', { bookingId, state, ...extra });

  let connectTimer = null;
  const clearConnectTimer = () => {
    if (connectTimer) clearTimeout(connectTimer);
    connectTimer = null;
  };
  const armConnectTimer = () => {
    clearConnectTimer();
    connectTimer = setTimeout(() => {
      if (pc.connectionState !== 'connected') {
        report('timeout', { iceConnectionState: pc.iceConnectionState, iceGatheringState: pc.iceGatheringState });
        on.mediaTimeout?.();
      }
    }, MEDIA_CONNECT_TIMEOUT_MS);
  };

  pc.ontrack = (event) => {
    on.trackSubscribed?.({ stream: event.streams[0] || null });
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('webrtc:ice-candidate', { bookingId, candidate: event.candidate });
    }
  };

  pc.onconnectionstatechange = () => {
    const state = pc.connectionState;
    if (state === 'connected') {
      clearConnectTimer();
      describeConnection(pc).then((info) => report('connected', info || {}));
      on.connected?.();
    } else if (state === 'failed' || state === 'closed') {
      clearConnectTimer();
      report(state);
      on.disconnected?.(state);
    } else {
      report(state);
    }
  };

  // Mobile networks hiccup constantly; a reconnect is not a dropped call.
  pc.oniceconnectionstatechange = () => {
    const state = pc.iceConnectionState;
    if (state === 'disconnected') on.reconnecting?.();
    else if (state === 'connected' || state === 'completed') on.reconnected?.();
  };

  const makeOffer = async () => {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('webrtc:offer', { bookingId, sdp: offer });
  };

  const onOffer = async ({ bookingId: forBooking, sdp } = {}) => {
    if (forBooking !== bookingId || isOfferer) return;
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('webrtc:answer', { bookingId, sdp: answer });
  };

  const onAnswer = async ({ bookingId: forBooking, sdp } = {}) => {
    if (forBooking !== bookingId || !isOfferer) return;
    if (pc.signalingState !== 'have-local-offer') return; // stray/duplicate answer
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
  };

  const onIceCandidate = async ({ bookingId: forBooking, candidate } = {}) => {
    if (forBooking !== bookingId || !candidate) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch {
      /* candidate arrived before the remote description — safe to drop */
    }
  };

  const onPeerJoined = ({ bookingId: forBooking } = {}) => {
    if (forBooking !== bookingId) return;
    on.participantConnected?.();
    armConnectTimer();
    if (isOfferer) makeOffer().catch((err) => on.deviceError?.(err));
  };

  const onPeerLeft = ({ bookingId: forBooking } = {}) => {
    if (forBooking !== bookingId) return;
    clearConnectTimer();
    on.participantDisconnected?.();
  };

  socket.on('webrtc:offer', onOffer);
  socket.on('webrtc:answer', onAnswer);
  socket.on('webrtc:ice-candidate', onIceCandidate);
  socket.on('webrtc:peer-joined', onPeerJoined);
  socket.on('webrtc:peer-left', onPeerLeft);

  const stopListening = () => {
    clearConnectTimer();
    socket.off('webrtc:offer', onOffer);
    socket.off('webrtc:answer', onAnswer);
    socket.off('webrtc:ice-candidate', onIceCandidate);
    socket.off('webrtc:peer-joined', onPeerJoined);
    socket.off('webrtc:peer-left', onPeerLeft);
  };

  let ack;
  try {
    ack = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Call signalling timed out')), 10_000);
      socket.emit('call:join-room', { bookingId }, (res) => {
        clearTimeout(timer);
        resolve(res);
      });
    });
  } catch (err) {
    stopListening();
    localStream.getTracks().forEach((t) => t.stop());
    pc.close();
    throw err;
  }

  if (!ack?.ok) {
    stopListening();
    localStream.getTracks().forEach((t) => t.stop());
    pc.close();
    throw new Error(ack?.error || 'Could not join this call');
  }

  // The other side was already in the room — `webrtc:peer-joined` only fires
  // for sockets joining *after* us, so catch up manually here.
  if (ack.peerPresent) {
    on.participantConnected?.();
    armConnectTimer();
    if (isOfferer) makeOffer().catch((err) => on.deviceError?.(err));
  }

  return { pc, localStream, bookingId, stopListening };
}

/** Tear down a call started with `createCall`. */
export function leaveCall(call, socket) {
  if (!call) return;
  call.stopListening?.();
  if (call.bookingId) socket?.emit('call:leave-room', { bookingId: call.bookingId });
  call.localStream?.getTracks().forEach((t) => t.stop());
  try {
    call.pc?.close();
  } catch {
    /* already closed */
  }
}

/**
 * Switch between front/back camera. Replaces the outgoing video track
 * in-place (no renegotiation) — the existing `MediaStream` reference is kept
 * so the `<video>` element bound to it just picks up the new track.
 */
export async function flipCamera(call) {
  const currentTrack = call?.localStream?.getVideoTracks?.()[0];
  if (!call?.pc || !currentTrack) return call?.localStream || null;

  const currentFacing = currentTrack.getSettings?.().facingMode;
  const nextFacing = currentFacing === 'environment' ? 'user' : 'environment';

  const newStream = await navigator.mediaDevices.getUserMedia({
    video: { ...RTC_CONFIG_DEFAULTS.videoCaptureDefaults, facingMode: nextFacing },
    audio: false,
  });
  const newTrack = newStream.getVideoTracks()[0];

  const sender = call.pc.getSenders().find((s) => s.track?.kind === 'video');
  if (sender) await sender.replaceTrack(newTrack);

  call.localStream.removeTrack(currentTrack);
  currentTrack.stop();
  call.localStream.addTrack(newTrack);
  return call.localStream;
}

/** Ask for camera + mic up front so the prompt is not mid-call. */
export async function primeDevices({ video = true } = {}) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
    stream.getTracks().forEach((t) => t.stop());
    return { granted: true };
  } catch (err) {
    return {
      granted: false,
      reason:
        err?.name === 'NotAllowedError'
          ? 'Camera and microphone access were blocked. Enable them in your browser settings to join.'
          : err?.name === 'NotFoundError'
            ? 'No camera or microphone found on this device.'
            : err?.message || 'Could not access your camera and microphone.',
    };
  }
}

/** mm:ss for the in-call timer. Display only — billing is computed server-side. */
export function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}
