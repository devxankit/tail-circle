# Phase 0 — Foundation & Integration Layer

**Goal:** everything shared that later phases depend on: server plumbing, third-party
service clients (Razorpay, SMS India Hub, FCM), Socket.IO, and the frontend API client.

**Status: ✅ Done** (2026-07-13) — all exit criteria verified, no blockers.

- Firebase: service account in place ✅, Admin SDK live ✅ (custom token + RTDB write/read verified), **security rules deployed** ✅ (verified: anonymous reads → 401 Permission denied)
- Razorpay: working test keys in env ✅ (test order created against live test API)
- Verification: `node scripts/phase0-check.js` (server running) — **12/12 pass**

Remaining for later phases: `RAZORPAY_WEBHOOK_SECRET` (set when configuring the webhook URL in the Razorpay dashboard, needs a public URL — Phase 3/12); FCM background service worker (Phase 8); README (Phase 1).

## Already done ✅

- [x] Express 5 app: helmet, CORS allowlist, compression, cookie-parser, morgan
- [x] Central env config (`src/config/env.js`), Mongo connection, graceful startup
- [x] `ApiError` / `ApiResponse` / `asyncHandler` / logger utilities
- [x] Global + auth rate limiters, zod `validate` middleware
- [x] Phone-OTP auth module (request/verify/refresh/logout) with hashed OTPs, attempt caps
- [x] `User` model (roles: user/vendor/admin, vendorType enum)
- [x] Cloudinary upload module (multer memory → Cloudinary)

## Tasks

### Server & infrastructure
- [x] Switch `server.js` to `http.createServer(app)` and mount **Socket.IO** on it
- [x] Socket.IO auth middleware: JWT in handshake → `socket.data.user`; join `user:<id>` room
- [x] `src/sockets/` folder: connection registry, room helpers, event name constants (`events.js`, `index.js`)
- [ ] Central Mongo index sync check on boot (log missing indexes in dev) — deferred to Phase 12
- [x] `.env.example` updated with ALL new keys (Razorpay, SMSIndiaHub, Firebase, Redis) — both backend and frontend

### Redis (caching layer)
- [x] Redis running locally — existing Windows Redis 5.0.14 on :6379 (works; Memurai/Docker still recommended for parity in prod)
- [x] `src/config/redis.js` — ioredis client (env: `REDIS_URL`), graceful degrade: if Redis is down, cache reads fall through to DB (log warning, never crash)
- [x] `src/services/cache.service.js` — `getOrSet(key, ttl, loader)`, `invalidate(pattern)`, key namespace `tc:<module>:<hash>`
- [x] `cacheResponse(namespace, ttl)` route middleware for public catalog GETs
- [x] Move rate limiters to Redis store (`rate-limit-redis`) so limits survive restarts / multiple instances (waits for connection; `passOnStoreError` if Redis dies)
- [x] OTP per-phone cooldown keys in Redis (1/min + 5/hour, verified returning 429)
- [x] Idempotency-key storage for payment webhooks in Redis + DB status-guard fallback
- [x] Socket.IO Redis adapter (`@socket.io/redis-adapter`) — ready for horizontal scaling

### Firebase (Admin SDK — push + realtime messaging)
- [x] `src/config/firebase.js` — single Admin SDK init from service-account file; boots in disabled mode with a warning until the JSON exists
- [x] `fcm.service.js` — `sendToUser(userId, payload)` via stored device tokens (`DeviceToken` model), invalid-token cleanup
- [x] `rtdb.service.js` — chat message writes, conversation-members map, presence, custom-token minting
- [x] `POST /api/auth/firebase-token` — exchange app JWT for a Firebase custom token (503 until service account added — verified)
- [x] Firebase RTDB **security rules** in repo (`backend/firebase/database.rules.json`): participants-only, typing/presence self-writes only, message writes server-only

### Third-party service clients (`src/services/`)
- [x] `sms.service.js` — SMS India Hub HTTP API with DLT template id; dev fallback = log OTP; failure logging; **never logs OTP in prod**
- [x] `razorpay.service.js` — order create, constant-time signature verify (payment + webhook), refunds
- [x] Wire `sms.service` into `auth.service.requestOtp` (TODO replaced)

### Shared payment scaffolding (used by shop, bookings, meals, wallet, adoption fee)
- [x] `Payment` model (`src/modules/payment/payment.model.js`) — amounts in paise, unique `razorpayOrderId`
- [x] `POST /api/payments/create-order` (auth) — amount computed server-side by purpose handler
- [x] `POST /api/payments/verify` — client-side signature check after checkout
- [x] `POST /api/payments/webhook` — raw-body route **before** json parser in `app.js`, signature verified, idempotent (Redis NX + atomic status transition)
- [x] Per-purpose fulfilment dispatcher (`registerPurposeHandler(purpose, { computeAmount, onPaid, onFailed })`)

### Frontend API client
- [x] `frontend/src/services/api.js` — fetch wrapper: `VITE_API_URL`, JSON handling, token storage, single-flight 401 → `/auth/refresh` → retry once, `ApiClientError`
- [x] `frontend/src/services/socket.js` — singleton Socket.IO client with token handshake
- [x] `frontend/src/services/firebase.js` — Firebase web SDK init (RTDB + FCM), `ensureFirebaseAuth()` custom-token sign-in, `requestPushToken()`
- [x] `frontend/.env` + `.env.example` with `VITE_API_URL`, Razorpay key id, Firebase web config + VAPID key

### Dev experience
- [x] `scripts/seed.js` framework (idempotent, per-module seeders registered later)
- [x] `scripts/phase0-check.js` — automated exit-criteria check (11/12 passing)
- [ ] README: how to run backend + frontend together, required env keys — will write with Phase 1

## Security notes
- Webhook route uses `express.raw()` and constant-time signature comparison
- OTP endpoint: per-phone cooldown (e.g. 1/min, 5/hour) in addition to IP limiter
- Firebase service account JSON kept out of git (`.gitignore` check)
- Redis in prod: password + TLS required; never store tokens/PII in cache values
- RTDB rules deny-by-default; clients can only read/write conversations they belong to

## Exit criteria
Server boots with Socket.IO + Redis connected (and degrades gracefully without Redis);
a test client can authenticate a socket; a cached catalog route shows a Redis hit on
second call; Razorpay test order can be created and webhook-verified; OTP SMS delivered
via SMS India Hub (or logged in dev); backend can mint a Firebase custom token and
write/read a test message in RTDB; frontend api.js can log in and auto-refresh.
