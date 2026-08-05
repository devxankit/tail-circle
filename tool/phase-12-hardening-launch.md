# Phase 12 — Hardening, Tests, Docs & Deployment

**Goal:** production readiness: security audit, performance, tests, API docs,
deployment pipeline, monitoring.

**Status: ✅ Core hardening + deploy done** (`scripts/phase12-check.js` **29/29 pass**) · Depends on: all phases

> Security fundamentals (auth guards, role guards, ownership scoping, zod
> schemas, IDOR probes, webhook signature, socket auth, pagination caps, money
> in paise) were **verified per phase** as each shipped. This phase finalizes
> config hardening, health/ops, containerized deployment, CI, and docs. The
> heavier optional workstreams (formal automated test suite, OpenAPI UI, load
> tests) are listed as deferred below.

## Tasks

### Security audit
- [x] Verify every route: auth guard, role guard, ownership scoping, zod schema (done per phase)
- [x] IDOR probes on `:id` routes, mass-assignment (schema strict mode), rate-limit store (done per phase)
- [x] Razorpay webhook replay/idempotency + amount-tamper (server-recompute) — Phase 3/8
- [x] Socket.IO: unauthorized handshake + room joins rejected (Phase 0/7 checks)
- [x] Helmet + CORS prod-origin guard (fail-fast if CORS allows localhost in prod)
- [x] JWT secrets from env only; **fail-fast prod guard** rejects placeholder/weak/identical secrets
- [ ] `npm audit` + lockfile pin/review (deferred — run before go-live)
- [ ] Secrets scan of repo history; rotate anything ever committed (deferred — ops task)

### Performance & scalability
- [x] Pagination enforced with max-limit caps (done per phase)
- [x] Redis cache with namespaced keys + explicit invalidation on writes (done per phase)
- [x] Stateless app + Redis Socket.IO adapter → horizontal scaling documented
- [ ] `explain()` hot-path index review (deferred — tune against prod traffic)
- [ ] Load test checkout/booking (k6/autocannon) (deferred)

### Testing
- [x] Smoke script (`scripts/smoke.js`) — DB-free boot + route checks, wired into CI
- [x] Phase exit-criteria check scripts for every phase (0–12)
- [x] `scripts/phase12-check.js` — health, headers, config guard, deploy artifacts (29 checks)
- [ ] Full runner (vitest + supertest + mongodb-memory-server) unit/integration suite (deferred)

### Documentation
- [x] `backend/README.md` — stack, module map, health/ops, deployment
- [x] `backend/DEPLOYMENT.md` — production runbook + go-live checklist
- [x] `.env.example` — complete, annotated (OTP limits, SMS PE ID, FCM-only Firebase)
- [ ] OpenAPI/Swagger UI at `/api/docs` (deferred)
- [ ] Postman/Bruno collection exported (deferred)

### Deployment & operations
- [x] Production env template + `NODE_ENV=production` hardening (morgan off, OTP not logged when SMS on)
- [x] **Dockerfile** (multi-stage, non-root, dumb-init, HEALTHCHECK) + `.dockerignore`
- [x] **docker-compose.yml** — API + MongoDB + Redis, health-gated deps, volumes
- [x] **CI** (`.github/workflows/ci.yml`) — backend install + syntax + smoke; frontend build
- [x] **Health/readiness endpoints** — `/health` (liveness) + `/health/ready` (deep: Mongo hard dep, Redis degraded-ok)
- [x] **Graceful shutdown** — SIGTERM/SIGINT closes Socket.IO → drains HTTP → closes Mongo + Redis (10s force-exit)
- [ ] Structured logging (pino/winston) + request ids; error alerting (deferred — minimal logger in place)
- [ ] MongoDB Atlas backups/IP allowlist/least-priv user (deferred — ops task)
- [ ] Cron supervision (meal delivery gen, follow-up reminders, story TTL) (deferred)

## Done in this pass
- Fail-fast production config guard (`config/env.js` → `validateProductionConfig`/`assertProductionConfig`, invoked at boot).
- `/health/ready` readiness probe; `/health` kept as cheap liveness.
- Graceful shutdown now also closes Socket.IO, with re-entrancy guard + force-exit safety net.
- Dockerfile + .dockerignore + docker-compose (API+Mongo+Redis) + CI workflow.
- README + DEPLOYMENT.md + complete `.env.example`; npm scripts (`smoke`, `check:phase12`, `create-admin`, `docker:up/down`).
- `scripts/phase12-check.js` — **29/29 pass** against a running instance.

## Deferred (non-blocking, pre-go-live ops/optional)
Formal automated test suite (vitest/supertest/mongodb-memory-server), OpenAPI/Swagger
UI, load testing, `npm audit` + dependency pinning, structured logging + request ids,
MongoDB Atlas hardening, cron supervision, Postman/Bruno collection.

## Exit criteria
Config guard blocks insecure prod boot ✅ · health/readiness live ✅ · one-command
Docker deploy ✅ · CI on push ✅ · docs + runbook published ✅ · `phase12-check` green ✅.
Remaining items above are operational/optional and tracked as deferred.
