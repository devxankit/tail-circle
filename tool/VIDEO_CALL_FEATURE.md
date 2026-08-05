# Video Call (Doctor Consultation) Feature — Working Notes

This file is the running record for the video consultation feature: how it's
built, what was broken, what's been fixed, and what's still outstanding.
Update it whenever this feature is touched again — don't let context about
*why* something works this way live only in commit messages.

## What this feature is

"Video call" here means the **doctor video consultation** between a pet
parent and a vet/clinic, not generic social video calling. Entry points:

- Pet parent: `DoctorList.jsx` (instant call) → `ConsultCall.jsx` (route
  `/app/consult/:bookingId`).
- Vet/clinic: `AppointmentDetailView.jsx`, `VideoConsultationsListView.jsx`,
  `DoctorDashboardView.jsx`, `EmergencyRequestsView.jsx` → all navigate into
  `VideoConsultationView.jsx` (admin/clinic portal, route
  `/admin/doctor?view=video_call&bookingId=...`).
- App-wide: `IncomingCallOverlay.jsx` shows the ringing UI on either side and
  routes the accepting user into whichever of the two screens above matches
  their portal.

## Architecture

- **Media (SFU):** self-hosted **LiveKit** — `livekit-server-sdk` (backend)
  mints room names + signed JWT tokens; `livekit-client` (frontend) connects
  directly to the LiveKit server over WebRTC. The backend is never in the
  media path, only in the signalling/token path.
- **Signalling (who rings whom):** the app's own **Socket.IO**
  (`call:incoming` / `call:accept` / `call:reject` / `call:end` /
  `call:overage-*`), **plus a 3.5s REST-polling fallback**
  (`GET /consults/active`) because Socket.IO does not reliably stay up on the
  serverless (Vercel) backend deployment.
- **State machine (frontend):** `frontend/src/context/CallContext.jsx` —
  `idle → incoming/outgoing → connecting → active → ended → idle`, mounted
  once at the app root (`App.jsx`) so a call survives navigation.
- **Billing clock (backend):** `backend/src/modules/consult/consult.service.js`
  `applyWebhookEvent()` — LiveKit webhooks (`participant_joined/left`,
  `room_finished`) are the **only** source of truth for `joinedAt`/`leftAt`
  and billed seconds. The in-call timer the user sees is cosmetic.

### Key files

| File | Role |
|---|---|
| `backend/src/modules/consult/consult.service.js` | Call lifecycle: `startCall`, `joinCall`, `rejectCall`, `endCall`, overage billing, LiveKit webhook handling. |
| `backend/src/modules/consult/consult.model.js` | `ConsultCall` mongoose model, `participantFor`, `bothConnected`. |
| `backend/src/services/livekit.service.js` | LiveKit server-SDK wrapper (room create/delete, token minting, TURN creds). |
| `frontend/src/context/CallContext.jsx` | Global call state machine, socket listeners, LiveKit orchestration. |
| `frontend/src/services/livekitRoom.js` | `livekit-client` wrapper (`joinRoom`, `resolveLivekitUrl`, `primeDevices`). |
| `frontend/src/modules/user/features/doctors/ConsultCall.jsx` | Pet-parent call screen. |
| `frontend/src/modules/Admin/ClinicVeterinaryDoctor/views/VideoConsultationView.jsx` | Vet/clinic call screen. |
| `frontend/src/modules/user/components/IncomingCallOverlay.jsx` | App-wide "incoming call" ringing overlay. |

### Call flow

1. Caller hits `POST /consults/:bookingId/start` → creates/gets the
   `ConsultCall`, ensures the LiveKit room exists, mints the caller's token,
   sets status `ringing`, emits `call:incoming` + push notification to the
   *other* party.
2. Callee's `CallContext` gets `call:incoming` → phase `incoming` →
   `IncomingCallOverlay` shows.
3. Callee accepts → `POST /consults/:bookingId/join` → mints their token,
   flips status to `active` if it was `ringing`, emits `call:accept` to the
   caller.
4. Both sides `joinRoom(token, url, iceServers)` → connect straight to the
   LiveKit SFU.
5. LiveKit webhooks (`POST /consults/webhook/livekit`) update
   `joinedAt`/`leftAt`/billed seconds — the only trusted clock.
6. Either side calls `POST /consults/:bookingId/end` → settles overage,
   deletes the LiveKit room, emits `call:end`.

## 2026-07-28 — Investigation & fixes

The feature had been reported as "not working." Root cause: a series of
"check" commits right after the initial implementation (`0f8b1aa` →
`505c01e` → `52e12c3` → `240871c`) introduced regressions. Fixed below.

### 🔴 Fixed: vet-initiated calls never rang the pet parent (the main bug)

**Symptom:** when a vet opened the video call screen from any vet-side entry
point (appointment detail, dashboard, emergency requests, the consult list),
the pet parent's phone/browser never rang — no overlay, no push
notification. The vet was stuck on "Calling…/Waiting for the pet parent to
join" forever.

**Root cause:** commit `52e12c3` changed
`VideoConsultationView.jsx` (vet screen) to call `acceptCall()` /
`POST /consults/:bookingId/join` unconditionally on mount, instead of
`startCall()` / `POST /consults/:bookingId/start`. On the backend,
`joinCall()`'s "who do we ring" branch only sends `call:incoming` when
`role === 'patient'` — for a vet it always sent the non-ringing
`call:accept` event instead, and `notify()` (push notification) is only
called from `startCall()`, never `joinCall()`. So the pet parent's client,
sitting in `phase === 'idle'`, received an event it silently ignores.

This is also why the pet-parent-initiated flow "worked" in testing: from
`ConsultCall.jsx`, `role === 'patient'`, so the same `joinCall()` branch
correctly fired `call:incoming` to the vet.

**Fix:** `VideoConsultationView.jsx` now checks whether it's mounting to
*accept* a ring already in progress (`phase === 'incoming'` and the
incoming payload's `bookingId` matches — i.e. the vet tapped Accept on
`IncomingCallOverlay`) versus *starting* a fresh consultation (every other
vet-side entry point). It calls `acceptCall()` only in the former case and
`startCall()` (which rings the pet parent) otherwise.
— `frontend/src/modules/Admin/ClinicVeterinaryDoctor/views/VideoConsultationView.jsx`

### 🔴 Fixed: billing state corrupted by REST calls, not just LiveKit webhooks

**Symptom (latent, not yet reported but verified in code):** the model's own
comment states `participants[].joinedAt/leftAt` must be written **only**
from verified LiveKit webhooks, never from the client — this is what makes
`bothConnected()` and billed-seconds math trustworthy. Commit `52e12c3` broke
that invariant: `participantFor()` started setting `joinedAt = now` (and
clearing `leftAt`) the moment either side hit `POST /start` or `/join` —
i.e. the instant a token is requested, before the browser has actually
connected to LiveKit.

**Impact:** if a participant requests a token but never actually joins the
LiveKit room (blocked camera/mic, network failure, closed the tab), they'd
still be recorded as "connected" indefinitely (`leftAt` never set, since no
webhook ever fires for them). If the other side then genuinely connects,
`bothConnected()` can go true prematurely, flipping `call.status` to
`active` and starting the billable clock for a call that isn't really
two-way yet — inflating `computeBilledSeconds()` and potentially charging
overage the pet parent never actually incurred.

**Fix:** `participantFor()` reverted to only registering the participant's
role/identity; `joinedAt`/`leftAt` are left untouched here and set solely by
`applyWebhookEvent()`, restoring the documented invariant.
— `backend/src/modules/consult/consult.model.js`

### 🟠 Fixed: `ReferenceError` on LiveKit reconnect

**Symptom:** whenever a call recovered from a brief network drop (LiveKit's
`RoomEvent.Reconnected`), the frontend threw `setReconnected is not
defined` inside the event handler — there was no such setter, only
`setReconnecting`. Effect: the "Reconnecting…" banner never cleared back to
false after a real reconnect, and an uncaught exception fired from the
LiveKit client's event emitter on every recovered network hiccup (common on
mobile).

**Fix:** `reconnected: () => setReconnecting(false)`.
— `frontend/src/context/CallContext.jsx`

### 🟠 Fixed: `resolveLivekitUrl` could silently hand a phone `ws://localhost:7880`

**Symptom:** the function's own comment explains the intent — never let a
non-local browser be handed a `localhost` LiveKit URL, because it fails with
an opaque, hard-to-diagnose connection error. Commit `240871c`'s
implementation had a logic bug where the "don't use a localhost URL from a
non-local page" guard was dead code: if `serverUrl` was truthy, an
unconditional fallthrough branch returned it regardless of the guard's
result. Only the *no server URL at all* case fell back to
`ws://localhost:7880` — silently, with no error surfaced.

**Fix:** rewrote the branch so a local `serverUrl` is only used when the
page itself is local; the `ws://localhost:7880` fallback is also gated on
the page being local; otherwise it now throws
`"No LiveKit URL configured — set VITE_LIVEKIT_URL"` so the failure is loud
and diagnosable instead of a silent black screen.
— `frontend/src/services/livekitRoom.js`

### 🟡 Fixed: overage socket events were half-wired

**Symptom:** after a call ended with an overage balance, the vet/pet parent
only ever saw the correct waive/payment status after a full page
reload — sockets never pushed a live update.

**Root cause:** the backend emits `call:overage-due` (`consult.service.js`),
`call:overage-waived` (`consult.service.js`), and `call:overage-paid`
(`consult.payment.js`), but `CallContext.jsx` never subscribed to any of
them. Conversely, the client had a listener for `call:overage-warning`,
which the backend never emits anywhere — dead code left over from an
in-call "you're about to run over" idea that ended up being handled
entirely client-side instead (the local `elapsed`-vs-`scheduledMinutes`
effect already drives `overagePrompt` without needing a server push).

**Fix:** `CallContext.jsx` now subscribes to `call:overage-due`,
`call:overage-waived`, and `call:overage-paid`, merging each payload into
`call.overage` live. `call:end` now also carries the final `status`
(`ended`/`missed`) into `call` for whichever side didn't itself call
`endCall()`. The unused `call:overage-warning` listener was removed.
— `frontend/src/context/CallContext.jsx`

### 🟡 Fixed: `frontend/.env.example` was missing `VITE_LIVEKIT_URL`

**Symptom:** re-provisioning the frontend env from the example file would
silently drop `VITE_LIVEKIT_URL`, falling into the `resolveLivekitUrl()`
fallback path (which now fails loudly instead of connecting to
`localhost`, per the fix above — better than silent, but still avoidable).

**Fix:** added `VITE_LIVEKIT_URL=ws://localhost:7880` with a comment
warning it must be a real `wss://` URL in any non-local environment.
— `frontend/.env.example`

## Known issues — still not fixed (needs infra/deploy action, not code)

These are configuration/deployment gaps, not bugs in this repo's code —
nothing here can be verified or resolved just by editing files.

- **LiveKit/TURN config is dev-only right now.** `backend/.env` /
  `frontend/.env` currently point at `ws://localhost:7880` with
  `LIVEKIT_API_KEY=devkey` / `LIVEKIT_API_SECRET=secret` and empty
  `TURN_URLS`/`TURN_SECRET`. `backend/src/config/env.js`'s
  `validateProductionConfig()` will hard-fail on these in production — this
  is expected and by design, but whoever deploys needs to set real LiveKit
  + TURN credentials in the actual hosting environment (Vercel env vars,
  not the committed `.env`).
- **Self-hosted LiveKit + coturn must run somewhere with a public IP.**
  `backend/livekit/README.md` already notes Windows + Docker Desktop can't
  serve real users; there's no evidence in-repo that this stack is deployed
  anywhere reachable. If it isn't, calls will mint valid tokens but never
  actually connect media in production.
- **Socket.IO on a serverless backend is inherently flaky** — this is why
  the 3.5s REST-polling fallback exists (`syncActiveConsult` in
  `CallContext.jsx`). Real-time ring delivery may still lag up to ~3.5s in
  production. Working as designed, just worth knowing if "the phone doesn't
  ring instantly" comes up again.

## How to sanity-check this feature after touching it

1. Log in as a pet parent and a vet in two separate browser sessions.
2. From the vet dashboard, open an appointment and start the video
   consultation → confirm the pet parent's browser shows the incoming-call
   overlay (ring) and a push notification fires.
3. Accept from the pet-parent side → confirm both sides transition to
   `active`, video/audio tracks attach, and the timer starts.
4. Repeat starting from the pet-parent side (`DoctorList.jsx` instant call)
   → confirm the vet gets rung this time too — this is the asymmetry that
   hid the original bug.
5. Kill wifi briefly mid-call on one side → confirm "Reconnecting…" appears
   and clears (no console `ReferenceError`) once back online.
6. End the call → confirm billed seconds and any overage are computed from
   server state, not the client timer.
7. If the call ran over: confirm the overage banner appears for the payer,
   and that waiving it (vet) or paying it (parent) updates the *other*
   side's screen live, without a reload (`call:overage-waived` /
   `call:overage-paid`).
