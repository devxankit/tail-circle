/**
 * LiveKit room helper — shared by the vet dashboard and the pet-parent app.
 *
 * `livekit-client` is imported dynamically so the WebRTC bundle (~300 kB) only
 * loads when someone actually opens a consultation, and never lands in the
 * initial app chunk.
 */

/**
 * The URL the browser dials.
 *
 * Deliberately prefers the frontend's own env value over whatever the API
 * returned. If a phone is ever handed `ws://localhost:7880` it will fail with
 * an opaque connection error — the single most common self-hosting mistake.
 * The server value is only a fallback for local development.
 */
export function resolveLivekitUrl(serverUrl) {
  const fromEnv = import.meta.env.VITE_LIVEKIT_URL;
  if (fromEnv) return fromEnv;

  const pageIsLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const serverIsLocal = Boolean(serverUrl && serverUrl.includes('localhost'));

  if (serverUrl && !(serverIsLocal && !pageIsLocal)) return serverUrl;
  if (pageIsLocal) return 'ws://localhost:7880';
  throw new Error('No LiveKit URL configured — set VITE_LIVEKIT_URL');
}

/**
 * Connect to a consultation room and publish the local tracks.
 *
 * @param token       signed JWT from POST /consults/:bookingId/start|join
 * @param serverUrl   `url` from that response (fallback only)
 * @param opts.video  publish the camera (false for an audio-only consult)
 * @param opts.iceServers  TURN/STUN list from the API, for strict NAT
 * @param opts.on     lifecycle callbacks — see below
 */
export async function joinRoom(token, serverUrl, {
  video = true,
  audio = true,
  iceServers = [],
  on = {},
} = {}) {
  const { Room, RoomEvent, Track, ConnectionState } = await import('livekit-client');

  const room = new Room({
    adaptiveStream: true,   // scale down video nobody is looking at
    dynacast: true,         // stop publishing layers nobody subscribes to
    audioCaptureDefaults: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    videoCaptureDefaults: { resolution: { width: 1280, height: 720 } },
    ...(iceServers.length ? { rtcConfig: { iceServers } } : {}),
  });

  /* ── Remote media ─────────────────────────────────────── */
  room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
    on.trackSubscribed?.({ track, participant, kind: track.kind });
  });
  room.on(RoomEvent.TrackUnsubscribed, (track, _pub, participant) => {
    track.detach().forEach((el) => el.remove());
    on.trackUnsubscribed?.({ track, participant });
  });

  /* ── Presence ─────────────────────────────────────────── */
  room.on(RoomEvent.ParticipantConnected, (p) => on.participantConnected?.(p));
  room.on(RoomEvent.ParticipantDisconnected, (p) => on.participantDisconnected?.(p));

  /* ── Mute state of the far side ───────────────────────── */
  room.on(RoomEvent.TrackMuted, (pub, p) => on.trackMuted?.({ pub, participant: p, muted: true }));
  room.on(RoomEvent.TrackUnmuted, (pub, p) => on.trackMuted?.({ pub, participant: p, muted: false }));

  /* ── Connection health ────────────────────────────────── */
  // Mobile networks hiccup constantly; a reconnect is not a dropped call.
  room.on(RoomEvent.Reconnecting, () => on.reconnecting?.());
  room.on(RoomEvent.Reconnected, () => on.reconnected?.());
  room.on(RoomEvent.Disconnected, (reason) => on.disconnected?.(reason));
  room.on(RoomEvent.ConnectionStateChanged, (state) => {
    on.connectionState?.(state);
    if (state === ConnectionState.Connected) on.connected?.(room);
  });
  room.on(RoomEvent.MediaDevicesError, (err) => on.deviceError?.(err));

  try {
    await room.connect(resolveLivekitUrl(serverUrl), token, {
      maxRetries: 2,
      peerConnectionTimeout: 10_000,
    });

    if (audio) await room.localParticipant.setMicrophoneEnabled(true);
    if (video) await room.localParticipant.setCameraEnabled(true);
  } catch (err) {
    console.warn('LiveKit SFU connection error:', err?.message || err);
    on.deviceError?.(err);
  }

  return { room, Track, RoomEvent };
}

/** Attach a track to a media element, replacing anything already there. */
export function attachTrack(track, el) {
  if (!track || !el) return;
  track.attach(el);
}

export async function leaveRoom(room) {
  try {
    await room?.disconnect();
  } catch {
    /* already gone */
  }
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
