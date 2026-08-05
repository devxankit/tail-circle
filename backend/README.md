# TailCircle — Backend API

Node.js + Express + MongoDB (Mongoose) REST API for the TailCircle
pet-services super-app. Structured as **feature modules** so each frontend
domain (adopt, shop, daycare, wallet, …) maps to its own backend module.

## Stack

- **Runtime:** Node.js (ESM) ≥ 20
- **Framework:** Express 5
- **Database:** MongoDB via Mongoose
- **Cache / realtime:** Redis (cache, rate limits, OTP cooldowns, Socket.IO adapter)
- **Realtime:** Socket.IO (JWT handshake, per-user rooms, WebRTC signaling)
- **Auth:** JWT access/refresh tokens; phone + OTP login (matches the app)
- **Validation:** Zod
- **Uploads:** Multer (in-memory) → Cloudinary (streamed, auto-optimized)
- **Payments:** Razorpay (+ signed webhook)
- **Push:** Firebase Cloud Messaging
- **OTP delivery:** SMS India Hub (DLT)
- **Security:** helmet, cors, express-rate-limit, bcryptjs, fail-fast prod config guard

## Getting started

```bash
cd backend
cp .env.example .env       # then fill in secrets (already done locally)
npm install
npm run dev                # nodemon, hot reload
# or
npm start                  # production start
```

Requires a running MongoDB. Set `MONGODB_URI` in `.env`
(default `mongodb://127.0.0.1:27017/tailcircle`).

Quick health check without a DB:

```bash
node scripts/smoke.js
```

## Project structure

```
backend/
├── src/
│   ├── config/            # env parsing + connections
│   │   ├── env.js
│   │   ├── database.js
│   │   └── cloudinary.js
│   ├── middleware/        # cross-cutting Express middleware
│   │   ├── auth.js            # authenticate + authorize(role)
│   │   ├── validate.js        # Zod schema validation
│   │   ├── upload.js          # multer memory storage + file filters
│   │   ├── rateLimiter.js
│   │   └── errorHandler.js    # notFound + global error handler
│   ├── modules/           # ← feature modules (one folder per domain)
│   │   ├── auth/
│   │   │   ├── auth.routes.js
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.service.js
│   │   │   ├── auth.validation.js
│   │   │   └── otp.model.js
│   │   ├── user/
│   │   │   ├── user.routes.js
│   │   │   ├── user.controller.js
│   │   │   └── user.model.js
│   │   └── upload/            # Cloudinary media uploads
│   │       ├── upload.routes.js
│   │       ├── upload.controller.js
│   │       └── upload.service.js
│   ├── routes/
│   │   └── index.js       # mounts every module router under /api
│   ├── utils/             # ApiError, ApiResponse, asyncHandler, logger
│   ├── app.js            # Express app (middleware + routes)
│   └── server.js         # entry point (DB connect + graceful shutdown)
├── scripts/smoke.js
├── .env.example
├── .gitignore
└── package.json
```

## Adding a new feature module

Each frontend feature becomes a module. To add e.g. `shop`:

1. Create `src/modules/shop/` with:
   - `shop.model.js` — Mongoose schema(s)
   - `shop.validation.js` — Zod schemas
   - `shop.service.js` — business logic (DB access)
   - `shop.controller.js` — thin request/response layer
   - `shop.routes.js` — express router
2. Mount it in `src/routes/index.js` (served at `/api/shop`):
   ```js
   import shopRoutes from '../modules/shop/shop.routes.js';
   router.use('/shop', shopRoutes);
   ```

Planned modules mirroring the frontend: `adopt`, `daycare`, `doctors`,
`grooming`, `meals`, `events`, `memorial`, `community`, `chat`, `matches`,
`notifications`, `wallet`, `shop`, plus vendor/admin management.

## Conventions

- **Layering:** routes → controller → service → model. Controllers stay thin;
  business logic lives in services.
- **Responses:** success via `sendSuccess(res, { data, message })`
  → `{ success, message, data }`. Errors via `throw ApiError.badRequest(...)`.
- **Async:** wrap handlers in `asyncHandler` so rejections reach the error
  handler.
- **Auth:** protect routes with `authenticate`, restrict with
  `authorize('admin')`.

## API surface (current)

| Method | Path                       | Auth   | Purpose                     |
| ------ | -------------------------- | ------ | --------------------------- |
| GET    | `/health`                  | –      | Liveness probe              |
| GET    | `/api`                     | –      | API info                    |
| POST   | `/api/auth/request-otp`    | –      | Send login OTP to a phone   |
| POST   | `/api/auth/verify-otp`     | –      | Verify OTP, issue tokens    |
| POST   | `/api/auth/refresh`        | –      | Rotate tokens               |
| POST   | `/api/auth/logout`         | –      | Logout (client discards)    |
| GET    | `/api/users/me`            | user   | Current profile             |
| PATCH  | `/api/users/me`            | user   | Update profile              |
| GET    | `/api/users/:id`           | admin  | Fetch user by id            |
| POST   | `/api/uploads/image`       | user   | Upload one image            |
| POST   | `/api/uploads/files`       | user   | Upload up to 10 files       |
| DELETE | `/api/uploads`             | user   | Delete an asset by publicId |

> OTPs are delivered via **SMS India Hub** (DLT). When `SMS_INDIA_ENABLED=false`
> the code is printed to the terminal instead (local dev). Per-phone abuse
> limits are configurable: `OTP_COOLDOWN_SECONDS`, `OTP_MAX_PER_HOUR`.

## Health & operations

| Endpoint | Type | Meaning |
| -------- | ---- | ------- |
| `GET /health` | liveness | process is up; never touches DB/Redis |
| `GET /health/ready` | readiness | `200` when MongoDB is connected, else `503` |

- **Fail-fast config guard:** in `NODE_ENV=production` the server refuses to
  boot on weak/missing secrets, identical JWT secrets, localhost CORS, or
  incomplete SMS config (warnings only outside prod).
- **Graceful shutdown:** `SIGINT`/`SIGTERM` closes Socket.IO, drains HTTP, then
  closes MongoDB + Redis (10s force-exit safety net).

## Deployment

Full runbook in **[DEPLOYMENT.md](DEPLOYMENT.md)**. Quick start with Docker
(brings up API + MongoDB + Redis):

```bash
cd backend
cp .env.example .env      # fill in secrets
npm run docker:up          # docker compose up --build -d
```

Verify a running instance against the Phase 12 exit criteria:

```bash
npm run check:phase12      # health, headers, config guard, deploy artifacts
```

## File uploads (Cloudinary)

Files are received by Multer **in memory** (never written to disk) and streamed
straight to Cloudinary, so the server stays stateless/scalable. Images are
auto-optimized (`quality: auto`, `fetch_format: auto`).

Set `CLOUDINARY_*` in `.env`, then:

```bash
# Single image — multipart/form-data, field name "file"
curl -X POST http://localhost:5000/api/uploads/image \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -F "file=@/path/to/photo.jpg" \
  -F "folder=tailcircle/pets"        # optional sub-folder

# Multiple files — field name "files" (max 10)
curl -X POST http://localhost:5000/api/uploads/files \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -F "files=@a.jpg" -F "files=@b.pdf"

# Delete
curl -X DELETE http://localhost:5000/api/uploads \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "publicId": "tailcircle/pets/xxxx" }'
```

Response shape (single): `{ success, message, data: { url, publicId, format, bytes, width, height, ... } }`.
Store `publicId` alongside your records so you can delete later.

- **Middleware:** `uploadImage` (images only), `uploadFile` (images + docs),
  `uploadAny` — in `src/middleware/upload.js`. Size limit via `MAX_FILE_SIZE_MB`.
- **Service:** `uploadBuffer` / `uploadBuffers` / `deleteAsset` in
  `src/modules/upload/upload.service.js` — reuse these from any module (e.g.
  set a pet's avatar) instead of calling Cloudinary directly.
- **Verify credentials:** `node scripts/cloudinary-check.js`
