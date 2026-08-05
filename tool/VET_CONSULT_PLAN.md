# Vet Consultations — Registration, Dashboard, Booking, Payments & LiveKit Video

## Status

| Phase | State | Notes |
| --- | --- | --- |
| 1 · Vet profile model | ✅ done, verified | `Doctor` extended; 4 legacy rows migrated; display fields byte-identical; public projection added |
| 3 · Availability engine | ✅ done, verified | `DOCTOR_SLOT_TEMPLATE` deleted; vet CRUD API live; vet edit → public slots confirmed end-to-end |
| 4 · Mode gating & booking flow | ✅ done, verified | server rejects unoffered modes; `DoctorCheckout` + `DoctorList` rewritten to live slots; public cache invalidated on vet writes |
| 5 · LiveKit infra | ✅ done, verified | LiveKit v1.13.4 running locally; compose/coturn/nginx configs written; prod guard rejects dev keys, `ws://`, localhost, missing TURN |
| 6 · Call service | ✅ done, verified | real tokens **accepted by the live SFU**, forged token rejected; auth gate holds; billing math + webhook signature verified |
| 7 · Call UI | ✅ done, builds | `livekitRoom.js` + `CallContext` + user `ConsultCall` screen + vet view rewritten to real tracks; livekit-client code-split to its own 480 kB chunk |
| 8 · Overage payment | ✅ done, verified | `consult_overage` Razorpay handler; amount recomputed server-side, owner-only, double-pay blocked, fulfilment → `completed` |
| 2 · Registration & per-vet login | 🟡 backend done | per-vet scoping, vet signup fields, admin verification all verified. **Frontend wizard still to build.** |
| 9 · Dashboard wiring | 🟡 mostly done | `ClinicScheduleView` rewritten against the real API; new `VetProfileView` (fees, modes, overtime, docs, policies). **`AvailabilityCalendarView` + earnings still mock.** |

### Regression status

`smoke` passes. Phase checks: 0,1,2,5,6,8,9,11 clean; **4 → 27/27** and **10 → 34/34** after
updating their assertions to the new flow (they asserted the deleted hardcoded slot template
and the retired fake-token endpoint).

Two failures are outside this work and were not touched:
`phase3` product-rating aggregate (3 stale product reviews in the dev DB) and
`phase7` community feed (0 posts in the DB — the social feature is mid-edit in the working tree).

### Requirements audit (post-build sweep)

All 44 vet registration fields from the brief verified present on `Doctor` / `Availability`.
Gaps found and closed during the sweep:

| Gap | Fix |
| --- | --- |
| User's video call screen had **no entry point** — route existed, nothing linked to it | "Join video consultation" button on `BookingHistory` inside the join window |
| Incoming ring only rendered if already on the call route | `IncomingCallOverlay` mounted app-wide |
| `pending_overage` bookings displayed as **"Cancelled"** | own "Payment due" state + "Pay for extra time" button |
| Emergency / after-hours had no editor | added to `ClinicScheduleView` (windows + 24×7) |
| `emergency_hours_not_set` reported as `mode_not_offered` | distinct reason so the UI can say something true |
| **Consultation revenue never reached the vet ledger** — `recordBookingLedger` only handled events | now resolves per vertical; verified ₹529 gross → ₹79.35 commission → ₹449.65 net → dashboard |

### Still unverified

- **Rendered two-way video in a browser.** All signalling, tokens, authorization and billing
  are verified against a live LiveKit server, but no browser has actually painted a remote
  track yet. Needs a manual two-session run.
- **NAT traversal.** Localhost proves nothing. Requires the VPS + coturn and a real
  cellular-data test.
- **`RAZORPAY_WEBHOOK_SECRET` is empty** in `backend/.env`. Overage fulfilment was verified
  through the signed client-verify path; the webhook backstop cannot work until that is set.

> Phases 2 and 3 were swapped: the availability engine blocks the booking flow and only
> needed `Doctor`, while registration is a large frontend wizard that blocks nothing.


Execution plan for the veterinary consultation vertical: full vet onboarding data,
per-vet dashboard control, mode-gated booking (in-clinic / video / home / emergency),
Razorpay money flow, and self-hosted LiveKit video consults with per-minute overage billing.

---

## 0. Where we stand today

Audit of the existing code, so the plan patches reality rather than assumptions.

### Already built and reusable

| Piece | Location | Notes |
| --- | --- | --- |
| Booking engine | `backend/src/modules/booking/` | `type: 'doctor'`, atomic slot capacity, timeline, cancel + Razorpay refund |
| Payment dispatcher | `backend/src/modules/payment/payment.service.js` | `registerPurposeHandler(purpose, {computeAmount, onPaid, onFailed})` — idempotent, webhook-backed. Extending it is how overage billing lands. |
| Clinic portal API | `backend/src/modules/vendor/clinic.vendor.service.js` | appointments, patients, medical records, prescriptions, labs, follow-ups, vaccinations, emergencies — all scoped by `clinicVendorId` |
| Socket.IO + auth | `backend/src/sockets/index.js` | `sameAuth` verifies the **same** `env.jwt.accessSecret` the REST middleware uses; Redis adapter for multi-instance fan-out; `emitToUser()` helper |
| Vendor KYC + approval | `backend/src/modules/vendor/vendor.auth.service.js` | registration → `pending` → admin approval gate on login; encrypted bank fields; GST |
| Infra | `backend/docker-compose.yml`, `Dockerfile`, `DEPLOYMENT.md` | API + Mongo + Redis, healthchecks, graceful shutdown, prod startup guard |

### Gaps this plan closes

| Requirement | Current reality |
| --- | --- |
| 20+ vet registration fields | `registerVendor()` collects businessName, email, phone, city, address, 2 doc URLs, bank, GST. `Doctor` model has 12 display-only fields. **Nothing else exists.** |
| Vet sets working days / slots | `DOCTOR_SLOT_TEMPLATE` (`booking.service.js:425`) is a **global hardcoded** 3-entry array. Same 3 two-hour blocks for every vet, every day. No working-day check, no past-date check, capacity hardcoded to 5. |
| Vet toggles video consult | `visitType` is read straight off the client and **never validated**. Any user can book `video` from any vet. `videoPrice` silently falls back to in-clinic `price` (`booking.service.js:188`). |
| User booking UI | `DoctorCheckout.jsx:35` hardcodes 6 time slots, never calls `/doctors/:id/slots`, hardcodes `visitType: 'clinic'`. No mode selector exists. |
| Availability dashboard | `ClinicScheduleView.jsx`, `AvailabilityCalendarView.jsx` are pure local `useState` — zero API calls, nothing persists. |
| Video call | `VideoRoom` stores a `crypto.randomBytes` **fake** token. `VideoConsultationView.jsx` renders a placeholder `<div>` with the pet's first initial. `sockets/index.js:66` has a hand-rolled P2P mesh relay that no client uses. **No WebRTC anywhere.** No user-side call screen. |
| Overage billing | Does not exist. |

### Decisions locked

- **Vet identity:** each vet gets their own login. `Doctor` gains `userId`; `clinicVendorId` stays as the tenant key so existing clinic-scoped data keeps working. A solo vet is both. A clinic owner sees all their vets; a staff vet sees only themselves.
- **Video stack:** self-hosted LiveKit CE. Backend mints tokens only; it is never in the media path.
- **Signaling:** reuse the existing `/video` Socket.IO namespace for call lifecycle (ring/accept/reject/end). Delete the offer/answer/ICE relay — LiveKit replaces it.

---

## Phase 1 — Vet profile data model

Turn `Doctor` from a display card into the real professional record.

**`backend/src/modules/provider/doctor.model.js`** — extend (keep every existing field so
current listing screens and `legacyId` seeds keep working):

```
identity      title, fullName, publicName, profilePhoto
credentials   registrationNumber, council, verification{ status, reviewedAt, reviewedBy, rejectionReason }
documents     [{ kind: degree|license|clinic_auth|id_proof|other, url, uploadedAt, verified }]
practice      primarySpecialties[], secondarySpecialties[], speciesTreated[], conditionsHandled[]
experience    totalYears, yearsInCurrentClinic
clinic        clinicName, address{ line1, locality, landmark, city, state, pincode, mapsUrl }, geo{ type:Point, coordinates }
modes         { inClinic|video|homeVisit|emergency: { enabled, fee, followUpFee, durationMinutes } }
languages     []
about         bio, treatmentApproach
facilities    { medicines, diagnostics, surgery, grooming, vaccination, labSampleCollection, hospitalization }
video         { digitalPrescription, overagePerMinute, graceMinutes, maxOverageMinutes }
policies      { cancellationHours, cancellationNote, rescheduleHours, refundNote, noShowNote }
ownership     userId (own login), clinicVendorId (tenant)
```

Settlement/GST is **not** duplicated here — it already lives on `VendorProfile` and is
reused via `clinicVendorId`.

**Migration:** `backend/scripts/migrate-doctor-profiles.js` backfills existing `Doctor`
rows — `fullName` from `name`, `modes.inClinic.fee` from `price`, `modes.video.fee` from
`videoPrice`, `modes.video.enabled` from `videoPrice != null`.

**Verify:** migration is idempotent on re-run; `GET /doctors` and `GET /doctors/:id`
return unchanged shapes for the existing user app.

---

## Phase 2 — Vet registration & per-vet login

**Backend**
- `vendor.auth.service.js` → `registerVet()` alongside `registerVendor()`, collecting the
  full Phase-1 field set across a multi-step payload. Creates `User(role: vendor,
  vendorType: clinic)` + `VendorProfile` + `Doctor`, all `pending`.
- Required-before-approval validation: registration number, council, ID proof, degree
  certificate, at least one enabled mode with a fee, at least one working day.
- `middleware/vetScope.js` → `resolveVetScope(user)` returns `{ clinicVendorId, doctorIds, isOwner }`.
- Refactor `clinic.vendor.service.js`: every function takes the scope object instead of a
  bare `clinicVendorId`. Owner ⇒ all clinic doctors; staff vet ⇒ own id only.
- Admin: `admin.routes.js` gains vet verification — review documents, approve/reject with reason.

**Frontend**
- Vet registration wizard (extend the existing vendor registration under
  `modules/Admin/auth/`) — 6 steps: identity → credentials+documents → clinic+location →
  practice/specialties → modes+fees+duration → availability, policies, bank/GST.
- Cloudinary upload for every document via the existing `/uploads` route.

**Verify:** register a vet end-to-end → login blocked while `pending` → admin approves →
login succeeds → vet sees only their own appointments; a second vet in the same clinic
sees only theirs; the clinic owner sees both.

---

## Phase 3 — Availability engine

Replace the hardcoded template with vet-defined schedules. **This is the piece the whole
booking flow hangs off — it lands before any UI work.**

**New model `backend/src/modules/provider/availability.model.js`**

```
doctorId
weekly[]      { day: 0-6, enabled, blocks: [{ start: "09:00", end: "13:00", modes: [...], capacity }] }
slotMinutes   default consult duration (15/20/30) — drives slot generation
bufferMinutes gap between consults
emergency     { enabled, alwaysOn, blocks: [...] }
blackouts[]   { date: "YYYY-MM-DD", reason } — leave / holidays
leadTimeMins  minimum notice before a bookable slot
horizonDays   how far ahead booking opens (default 30)
```

**`booking.service.js` — rewrite `getSlots()`:**
1. Load the vet's availability; reject unknown vets.
2. Reject dates that are blacked out, in the past, beyond `horizonDays`, or on a disabled weekday.
3. Generate slots by walking each block in `slotMinutes + bufferMinutes` steps.
4. **Filter by the requested mode** — a block that doesn't list `video` yields no video slots.
5. Drop slots inside `leadTimeMins` from now.
6. Subtract booked capacity from `SlotBooking` (existing atomic counter stays as-is).

`GET /doctors/:id/slots?date=YYYY-MM-DD&mode=video` — mode becomes a required filter.
Delete `DOCTOR_SLOT_TEMPLATE`.

**Verify:** a vet who works Mon/Wed/Fri returns zero slots on Tuesday; a vet offering
video only in the evening block returns morning slots for `mode=clinic` but none for
`mode=video`; booking the last seat removes the slot for the next caller.

---

## Phase 4 — Mode gating & booking flow

**Backend (`booking.service.js`, doctor branch ~line 178)**
- Validate `visitType` against `doctor.modes[x].enabled` → 400 if the vet doesn't offer it.
- Price from `doctor.modes[visitType].fee`; **remove** the silent `videoPrice ?? price` fallback.
- Follow-up detection: prior completed booking with the same vet+pet inside the follow-up
  window ⇒ charge `followUpFee`.
- Re-validate the slot against the availability engine at booking time (not just at listing).
- Persist `consultDurationMinutes` on the booking — the overage meter reads it later.
- Cancellation/refund driven by `doctor.policies.cancellationHours`, not the hardcoded `4`.

**Frontend `DoctorCheckout.jsx`** — replace the mock:
- Mode selector rendered from the vet's enabled modes, each showing its own fee.
- Date strip limited to the vet's working days within `horizonDays`.
- Slots fetched live from `/doctors/:id/slots?date=&mode=` — delete the hardcoded array.
- Bill breakdown reflects the selected mode + follow-up pricing.
- Cancellation policy text from the vet's profile.

**Verify:** a video-disabled vet shows no video option and rejects a hand-crafted
`visitType: 'video'` POST; the charged total equals the displayed total.

---

## Phase 5 — LiveKit infrastructure

Self-hosted CE, per the reference architecture. Nothing here touches app code.

**Files (new dir `backend/livekit/`)**
- `docker-compose.livekit.yml` — `livekit/livekit-server` + `coturn`, `restart: unless-stopped`, healthchecks
- `livekit.yaml` — `port: 7880`, `rtc.tcp_port: 7881`, UDP `50000–50100`, `room.auto_create: true`, `empty_timeout`, keys from env
- `coturn/turnserver.conf` — TURN/STUN with a shared static-auth secret, `realm`, TLS listener
- `nginx/livekit.conf` — `wss://` reverse proxy to `127.0.0.1:7880`, `Upgrade`/`Connection` headers, long read timeouts, Let's Encrypt certs
- `README.md` — bring-up, firewall, and key-rotation runbook

**Env additions (`backend/.env.example`)**

| Var | Consumer | Local | Production |
| --- | --- | --- | --- |
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | backend only | dev pair | 32+ char random, rotated |
| `LIVEKIT_URL` | handed to clients | `ws://localhost:7880` | `wss://livekit.<domain>` |
| `LIVEKIT_HTTP_URL` | backend Room API | `http://localhost:7880` | `http://127.0.0.1:7880` |
| `TURN_URLS` / `TURN_SECRET` | clients / coturn | — | `turn:<domain>:3478` |
| `VITE_LIVEKIT_URL` | frontend build | matches `LIVEKIT_URL` | matches `LIVEKIT_URL` |

Prod startup guard (`config/env.js`) refuses to boot if the LiveKit key is still the dev
pair or `LIVEKIT_URL` is `ws://` / localhost in `NODE_ENV=production` — same fail-fast
style as the existing JWT/CORS guards.

> **Traps carried over from the reference, guarded explicitly:**
> keys in `livekit.yaml` must equal the `.env` pair or every token is rejected with an
> opaque error; the frontend must prefer its **own** `VITE_LIVEKIT_URL` over whatever the
> API returns, or phones dial `localhost` and fail silently; UDP `50000–50100` must be open.

**Verify:** `docker compose -f docker-compose.livekit.yml up -d` → containers healthy →
`curl http://localhost:7880` responds → a token minted by the backend connects from a browser.

---

## Phase 6 — Backend call service

**`backend/src/services/livekit.service.js`** — the only place the API secret is touched:
- `ensureRoom(roomName, maxParticipants)` — idempotent, swallows "already exists"
- `createParticipantToken({ userId, displayName, roomName, ttl })` — `roomJoin`, `canPublish`, `canSubscribe`, `canPublishData`, identity = app user id
- `deleteRoom(roomName)`

**Replace `VideoRoom`** in `clinic.models.js` with `ConsultCall`:

```
bookingId, doctorId, doctorUserId, ownerUserId
roomName          `consult_${bookingId}`
status            scheduled|ringing|active|ended|missed|rejected|cancelled
scheduledMinutes  snapshot of the booked duration
startedAt, endedAt, billedSeconds
participants[]    { userId, role, joinedAt, leftAt }
overage           { minutes, ratePerMinute, amount, consentAt, waived, paymentId, status }
```

**Routes `backend/src/modules/consult/consult.routes.js`** (mounted at `/api/consults`):

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/:bookingId/start` | vet only — `ensureRoom`, mint vet token, emit `call:incoming` to the pet owner |
| POST | `/:bookingId/join` | owner accepts — mint owner token, emit `call:accept` |
| POST | `/:bookingId/reject` | owner declines |
| POST | `/:bookingId/end` | either side hangs up — close room, settle overage |
| GET | `/:bookingId/token` | rehydrate after a reload |
| GET | `/active` | resume a ringing/active call |
| POST | `/webhook/livekit` | LiveKit server webhook — authoritative join/leave timestamps |

**Authorization** — a token is minted only when: the caller is authenticated; they are
either the booking's `userId` or the booking's vet; the booking is `confirmed`/`in_progress`;
`visitType === 'video'`; and now is inside the join window (from `leadTime` before the slot
until `scheduledMinutes + maxOverageMinutes` after). This is the gate your brief asks for —
"only authorized doctors and patients can join their assigned appointment room".

**Socket events** on the existing `/video` namespace (offer/answer/ICE relay deleted):
`call:incoming`, `call:ringing`, `call:accept`, `call:reject`, `call:end`, `call:busy`,
`call:overage-warning`, `call:overage-started`.

**Verify:** a third user's token request 403s; an expired appointment 403s; a room is
created on start and deleted on end.

---

## Phase 7 — Frontend call UI

Install `livekit-client`. Dynamic-import it so it never enters the initial bundle.

**Shared** — `frontend/src/services/livekitRoom.js`: `joinRoom(token, url, { video })` with
`adaptiveStream`, `dynacast`, echo cancellation / noise suppression, `TrackSubscribed`
attach, reconnect handling, and a rejoin path that refetches a token on hard disconnect.

**Vet side** — rewrite `VideoConsultationView.jsx` to render real LiveKit tracks in place of
the placeholder div, keeping the existing layout (live notes panel, chat, controls). Wire
the notes panel to the existing `addDoctorConsultationNotes`. `VideoConsultationsListView`
gets a real "Start call" action.

**User side** — new `frontend/src/modules/user/features/doctors/ConsultCall.jsx`: incoming-call
overlay, join screen with device permission priming, in-call controls (mute, camera,
flip, speaker), and the overage consent prompt.

**`CallContext`** wrapping the app root: `idle → outgoing/incoming → connecting → active → ended`,
driven by socket events, so a call survives navigation.

**Verify:** two browsers (vet + owner) on one appointment — ring, accept, two-way audio and
video, mute propagates, hang-up returns both to idle.

---

## Phase 8 — Overage metering & billing

**Metering is server-side and authoritative** — the client timer is display only.

1. LiveKit webhooks (`participant_joined` / `participant_left` / `room_finished`) write real
   timestamps onto `ConsultCall.participants`.
2. Billable time = the window where **both** parties are connected.
3. At `scheduledMinutes − 2`, emit `call:overage-warning` to both sides.
4. At `scheduledMinutes + graceMinutes`, emit `call:overage-started`; the owner must tap
   **"Continue — ₹X/min"**. Consent timestamp is recorded; billing runs from that moment.
   No consent ⇒ no charge, and the call auto-ends at the grace boundary.
5. Hard stop at `maxOverageMinutes`.
6. On end: `overageMinutes = ceil(billedSeconds/60) − scheduledMinutes`, capped;
   `amount = overageMinutes × doctor.video.overagePerMinute`. The vet can **waive** it from
   the post-call screen before it is raised.

**Billing** — new purpose handler, following the existing registry pattern:

```js
registerPurposeHandler('consult_overage', {
  computeAmount: async (user, { callId }) => { /* recompute from ConsultCall — never trust client */ },
  onPaid: async (payment) => { /* mark settled, release prescription, post vet ledger entry */ },
});
```

Booking moves to a `pending_overage` state; the owner pays from the appointment screen via
the existing Razorpay checkout; the digital prescription/report is released on payment.
Vet earnings post through the existing `postLedgerEntry` used by `recordBookingLedger`.

**Verify:** a 15-min consult run to 32 min with consent bills exactly 17 min × rate; the
same call without consent bills nothing; a waived overage raises no order; paying twice
(verify + webhook race) charges once.

---

## Phase 9 — Vet dashboard wiring

Make the existing mock views real.

- `ClinicScheduleView` / `AvailabilityCalendarView` → CRUD against the Phase-3 availability API
  (working days, blocks, per-mode toggles, slot duration, blackouts, emergency hours).
- New **Profile & Fees** view — edit every Phase-1 field, per-mode fees and durations, the
  overage rate/cap, policies, facilities, languages.
- New **Earnings** view — consult revenue, overage revenue, commission, payouts, settlement
  status from the vendor ledger.
- `AppointmentListView` / `AppointmentDetailView` → filter by mode, show the call state, and
  expose start-call for video appointments.

**Verify:** a vet changes Tuesday to a working day → the user app immediately offers Tuesday
slots; the vet disables video → the video option disappears from the booking screen.

---

## Sequencing

Phases 1–4 are the **booking flow correctness** track and must land in order — each depends
on the previous one's data model. Phase 5 (infra) is independent and can be brought up in
parallel. Phases 6–8 depend on both tracks. Phase 9 depends on 1–3.

```
1 → 2 → 3 → 4 ──┐
                 ├── 6 → 7 → 8
5 ───────────────┘
3 → 9
```

Each phase ends with the verification step above run and reported before the next begins.

---

## Decisions

1. **Vet identity** — each vet gets their own login. `Doctor.userId` is the login;
   `clinicVendorId` stays the tenant key. Clinic owner sees all their vets, staff vet sees only self.
2. **LiveKit host** — deploys to a Linux VPS with a real domain. All configs are driven by
   `LIVEKIT_DOMAIN` / `TURN_DOMAIN` env vars rather than hardcoded hostnames, so the same files
   work for local dev-mode verification and production. Firewall: TCP 443 + 7881, UDP 50000–50100.
3. **Overage payment** — post-call Razorpay invoice via a `consult_overage` purpose handler.
   Booking enters `pending_overage`; digital prescription releases on payment.
4. **Overage consent** — warn at `scheduledMinutes − 2`; at `scheduledMinutes + graceMinutes`
   the owner must tap "Continue — ₹X/min" before any billing starts. No consent ⇒ no charge and
   the call auto-ends. Vet sets rate/cap and may waive after the call.

## Open items

- **Follow-up window** — days after a consult that a booking counts as a follow-up.
  Assumed 7 unless the vet overrides it in their profile.
