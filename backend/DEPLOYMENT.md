# TailCircle API — Deployment Guide

Production runbook for the backend. Covers configuration, the container image,
the compose stack, health probes, and the go-live checklist.

---

## 1. Prerequisites

| Dependency | Purpose | Notes |
| ---------- | ------- | ----- |
| **MongoDB** | primary datastore | hard dependency — server won't be "ready" without it |
| **Redis** | cache, rate limits, OTP cooldowns, Socket.IO adapter | optional — API degrades gracefully if down |
| **Node.js ≥ 20** | runtime | only if running without Docker |
| Cloudinary account | media uploads | `CLOUDINARY_*` |
| Razorpay account | payments | `RAZORPAY_*` + webhook secret |
| Firebase service account | FCM push | JSON file, never committed |
| SMS India Hub account | OTP delivery (DLT) | template must match exactly |

---

## 2. Configuration

All config comes from environment variables — see [`.env.example`](.env.example)
for the full annotated list. Copy it and fill in real values:

```bash
cp .env.example .env
```

### Production startup guard

On boot in `NODE_ENV=production`, the server **refuses to start** (throws and
exits) if any of these are wrong — this is intentional, fail-fast behavior:

- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` missing, placeholder, or < 32 chars
- access & refresh secrets identical
- `MONGODB_URI` missing
- `CORS_ORIGIN` still contains `localhost`
- SMS enabled but API key / sender ID / DLT template ID incomplete

Outside production the same checks run as **warnings only**.

Generate strong secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 3. Run with Docker (recommended)

The repo ships a multi-stage `Dockerfile` (runs as the non-root `node` user,
`dumb-init` for signal handling, built-in `HEALTHCHECK`) and a
`docker-compose.yml` that brings up **API + MongoDB + Redis** together.

```bash
cd backend
cp .env.example .env          # fill in secrets (Cloudinary, Razorpay, etc.)
docker compose up --build -d   # start the whole stack
docker compose logs -f api     # tail the API
docker compose down            # stop (add -v to wipe data volumes)
```

Compose overrides `MONGODB_URI` / `REDIS_URL` to point at the `mongo` and
`redis` services, so you don't set those in `.env` for the compose path.

### Build / run the image standalone

```bash
docker build -t tailcircle-api ./backend
docker run --env-file ./backend/.env -p 5000:5000 tailcircle-api
```

---

## 4. Run without Docker

```bash
cd backend
npm ci --omit=dev
NODE_ENV=production node src/server.js
```

Put it behind a process manager (pm2/systemd) and a reverse proxy (nginx)
terminating TLS. The app sets `trust proxy`, so `X-Forwarded-*` headers are
honored for client IP (rate limiting) behind one proxy hop.

---

## 5. Health probes

| Endpoint | Type | Meaning |
| -------- | ---- | ------- |
| `GET /health` | liveness | process is up; never touches DB/Redis. `200` always when alive. |
| `GET /health/ready` | readiness | `200` when MongoDB is connected, `503` otherwise. Redis reported as `up`/`degraded` but never blocks readiness. |

Wire `/health/ready` as the readiness probe (load balancer / k8s) so traffic is
only routed once Mongo is connected. Use `/health` for liveness/restart checks.

Example readiness response:

```json
{ "status": "ready", "checks": { "mongodb": "up", "redis": "up" }, "uptime": 12.4, "timestamp": 1700000000000 }
```

---

## 6. Graceful shutdown

On `SIGINT` / `SIGTERM` the server: stops accepting new sockets (`io.close()`),
drains in-flight HTTP, closes MongoDB and Redis, then exits `0`. If that stalls
for 10s it force-exits `1`. Give orchestrators a `terminationGracePeriod` ≥ 15s.

---

## 7. Scaling notes

- **Stateless** — uploads stream to Cloudinary; no local disk/session state.
  Run as many replicas as you like behind a load balancer.
- **Sticky sessions not required** — Socket.IO uses the Redis adapter, so an
  event emitted on any instance reaches sockets connected to any other.
- **Rate limits are shared** across instances via Redis (counts survive
  restarts). Without Redis, limiters "fail open" (pass) rather than 500.

---

## 8. Payments webhook

Configure the Razorpay webhook to `POST https://<your-domain>/api/payments/webhook`
and set `RAZORPAY_WEBHOOK_SECRET`. The raw body is preserved for signature
verification (registered before the JSON body parser).

---

## 9. Go-live checklist

- [ ] Real, distinct 32+ char `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`
- [ ] `NODE_ENV=production`
- [ ] `CORS_ORIGIN` set to the real web origin(s), no localhost
- [ ] MongoDB connection string points at the production cluster (auth + TLS)
- [ ] Redis reachable (for shared rate limits + socket scaling)
- [ ] Cloudinary, Razorpay (+ webhook secret), Firebase SA, SMS India Hub filled
- [ ] `firebase-service-account.json` mounted, **not** committed
- [ ] Reverse proxy terminates TLS; `trust proxy` hop count correct
- [ ] Readiness probe → `/health/ready`, liveness → `/health`
- [ ] `node scripts/phase12-check.js` passes against the deployed instance
- [ ] Create the super-admin: `node scripts/create-admin.js`
