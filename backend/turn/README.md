# TURN/STUN — WebRTC relay

Video consultations run on **direct, browser-to-browser WebRTC** (peer-to-peer).
Every consult is exactly one vet and one pet parent, so there's no group-call
fan-out to justify a media server — the two browsers exchange audio/video
directly. The TailCircle API is never in the media path; its only job is
signalling (who is calling whom, relayed over Socket.IO) and handing out
short-lived TURN credentials.

```
        REST /api/consults/*  +  Socket.IO (call:* / webrtc:*)
  Vet's browser  ───────────────────────────────────────────►  TailCircle API
        │           (ring / accept / end / offer / answer / ICE)      │
        │                                                    TURN credentials
        │                                                              ▼
        └────────────────  WebRTC media, direct  ──────────────►  Pet parent's browser
                                      ▲
                                      │  relayed via coturn only when a
                                      │  direct UDP path isn't reachable
                                      └──────────  coturn (this folder)
```

This folder is **only** the TURN/STUN relay — the fallback path for strict-NAT
networks (most Indian mobile carriers, many clinic Wi-Fi routers) where the two
browsers cannot reach each other directly.

---

## Files

| File | Purpose |
| --- | --- |
| `docker-compose.turn.yml` | production coturn stack — host networking, healthcheck |
| `coturn/turnserver.conf` | TURN/STUN relay config |
| `.env.example` | secret, ports, domain |

---

## Local development

Two browser tabs/devices on the same LAN almost always connect over a direct
UDP path (or STUN alone) — TURN is rarely exercised locally. For local dev you
generally don't need to run coturn at all; the public STUN default
(`stun:stun.l.google.com:19302`, set via `STUN_URLS` in `backend/.env`) is
enough to prove the call flow.

Only start coturn locally if you specifically need to test the relay path:

```bash
cd backend/turn
cp .env.example .env
docker compose -f docker-compose.turn.yml up -d
docker compose -f docker-compose.turn.yml ps      # expect "healthy"
```

---

## Production deployment

Requires a Linux host with a public IP and a domain. Windows + Docker Desktop
cannot serve real users: the UDP relay range does not map cleanly through
Docker Desktop's networking.

### 1. DNS

```
turn.<domain>   A   <server public ip>
```

### 2. Certificate

```bash
certbot certonly --standalone -d turn.<domain>
```

### 3. Secrets

```bash
cd backend/turn
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # TURN_SECRET
```

Copy the **same** `TURN_SECRET` into `backend/.env` — the API derives
time-limited TURN credentials from it (`webrtcSignal.service.js::iceServers`).
A mismatch means the credentials the API hands out are rejected by coturn.

### 4. Firewall

| Env var | Default | Protocol | Purpose |
| --- | --- | --- | --- |
| `TURN_PORT` | 3478 | UDP + TCP | TURN/STUN |
| `TURN_TLS_PORT` | 5349 | TCP | TURN over TLS |
| `TURN_MIN_PORT` / `TURN_MAX_PORT` | 49160–49200 | **UDP** | TURN relay range |

```bash
cd backend/turn
set -a && . ./.env && set +a

ufw allow "${TURN_PORT}"
ufw allow "${TURN_TLS_PORT}"/tcp
ufw allow "${TURN_MIN_PORT}:${TURN_MAX_PORT}"/udp
```

> Leaving the UDP relay range closed is the classic failure: calls connect on
> Wi-Fi/desktop testing and then silently fail to carry media for anyone on a
> strict-NAT mobile network — there's no error, just no video.

### 5. Start

```bash
docker compose -f docker-compose.turn.yml up -d
docker compose -f docker-compose.turn.yml ps      # "healthy"
docker compose -f docker-compose.turn.yml logs -f coturn
```

### 6. Point the app at it

`backend/.env`:

```
TURN_URLS=turn:turn.<domain>:3478,turns:turn.<domain>:5349
TURN_SECRET=<same as backend/turn/.env>
STUN_URLS=stun:stun.l.google.com:19302
```

The API's production startup guard refuses to boot if `TURN_URLS` is empty, or
if it's set without a matching `TURN_SECRET`.

---

## Smoke test

Localhost success proves almost nothing about NAT traversal. Run these in
order:

1. Vet clicks **Start call** → pet parent's device rings.
2. Parent accepts → both sides show a running timer.
3. Audio **and** video flow both directions.
4. Mute / camera-off propagate to the other participant.
5. Hang up → both UIs return to idle.
6. **Repeat steps 1–5 with one device on cellular data, not Wi-Fi.** This is
   the only step that exercises TURN, and it's the one that catches a missing
   UDP firewall rule or a wrong `--external-ip`.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Works on desktop/same-LAN, dead on separate mobile networks | no TURN relay reachable | check `TURN_URLS`/`TURN_SECRET` are set on the API and coturn's UDP range is open |
| ICE / peer connection fails, stays `connecting` forever | strict NAT, no relay | confirm coturn is running and `--external-ip` is the real public IP |
| TURN credential rejected | secret mismatch | `TURN_SECRET` must be identical in `backend/.env` and `backend/turn/.env` |
| Media dies after a while | relay session/quota limits | check `user-quota` / `total-quota` / `max-bps` in `turnserver.conf` |
| No audio after connecting | mic permission / autoplay policy | request on a user gesture before creating the offer |
| Rings, nothing on accept | client never emitted `call:join-room` | see `frontend/src/services/webrtcCall.js` |
