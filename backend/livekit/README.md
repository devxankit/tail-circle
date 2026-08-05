# LiveKit — self-hosted media plane

Video consultations run on **LiveKit Community Edition**, self-hosted. The
TailCircle API never touches an audio or video packet: it hands out a room name
and a signed, short-lived JWT, and the browser talks WebRTC directly to LiveKit.

```
                 REST /api/consults/*  +  Socket.IO /video
  Browser  ──────────────────────────────────────────────►  TailCircle API
     │                    (ring / accept / end)                    │
     │                                                  Room API + signed JWT
     │                                                             ▼
     └──────────────  WebRTC media, direct  ──────────────►   LiveKit SFU
```

Signalling (who is calling whom) and media (the packets) are separate systems.
The API owns the first; LiveKit owns the second.

---

## Files

| File | Purpose |
| --- | --- |
| `docker-compose.livekit.yml` | production stack — LiveKit + coturn, host networking, healthchecks |
| `docker-compose.dev.yml` | local dev-mode LiveKit (`--dev`, no TLS) for verifying the call flow |
| `livekit.yaml` | LiveKit room policy. **Ports and keys are NOT here** — see below |
| `coturn/turnserver.conf` | TURN/STUN relay for strict-NAT and mobile networks |
| `nginx/livekit.conf` | TLS termination + WebSocket upgrade for the signalling port |
| `.env.example` | media-plane secrets and domains |

---

## Local development

```bash
cd backend/livekit
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml ps      # expect "healthy"
curl http://localhost:7880                        # or $LIVEKIT_PORT if changed
```

Ports follow the same `.env` as production, so moving LiveKit off 7880 is a
one-line change — but remember to update `LIVEKIT_URL` / `LIVEKIT_HTTP_URL` in
`backend/.env` and `VITE_LIVEKIT_URL` in `frontend/.env` to match, since those
carry the port in the URL.

Then in `backend/.env`:

```
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_HTTP_URL=http://localhost:7880
```

and in `frontend/.env`:

```
VITE_LIVEKIT_URL=ws://localhost:7880
```

Two browser tabs on this machine can now complete a call. This proves the
application flow and **nothing** about NAT traversal — see the smoke test below.

---

## Production deployment

Requires a Linux host with a public IP and a domain. Windows + Docker Desktop
cannot serve real users: the WebRTC UDP range does not map cleanly, so calls
connect at the signalling layer and carry no media.

### 1. DNS

```
livekit.<domain>   A   <server public ip>
turn.<domain>      A   <server public ip>
```

### 2. Certificates

```bash
certbot certonly --standalone -d livekit.<domain> -d turn.<domain>
```

### 3. Secrets

```bash
cd backend/livekit
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(12).toString('hex'))"   # LIVEKIT_API_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # LIVEKIT_API_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # TURN_SECRET
```

Copy the **same** key/secret into `backend/.env`. A mismatch between
`livekit.yaml` and the API's `.env` rejects every token at connect time, and the
error surfaces as a generic connection failure with no useful detail.

### 4. Firewall

Every port is set in `.env`; the defaults are shown below. If you change a
variable, change the firewall rule to match.

| Env var | Default | Protocol | Purpose |
| --- | --- | --- | --- |
| — | 443 | TCP | nginx → LiveKit signalling (`wss://`) |
| `LIVEKIT_PORT` | 7880 | TCP | signalling, behind nginx (not exposed directly) |
| `LIVEKIT_RTC_TCP_PORT` | 7881 | TCP | WebRTC over TCP fallback |
| `LIVEKIT_RTC_PORT_RANGE_START/END` | 50000–50100 | **UDP** | WebRTC media |
| `TURN_PORT` | 3478 | UDP + TCP | TURN/STUN |
| `TURN_TLS_PORT` | 5349 | TCP | TURN over TLS |
| `TURN_MIN_PORT` / `TURN_MAX_PORT` | 49160–49200 | **UDP** | TURN relay range |

Opening them straight from `.env`, so the rules can never drift from the config:

```bash
cd backend/livekit
set -a && . ./.env && set +a

ufw allow 443/tcp
ufw allow "${LIVEKIT_RTC_TCP_PORT}"/tcp
ufw allow "${LIVEKIT_RTC_PORT_RANGE_START}:${LIVEKIT_RTC_PORT_RANGE_END}"/udp
ufw allow "${TURN_PORT}"
ufw allow "${TURN_TLS_PORT}"/tcp
ufw allow "${TURN_MIN_PORT}:${TURN_MAX_PORT}"/udp
```

> **Changing a port** means updating three places: `.env`, the firewall, and —
> for `LIVEKIT_PORT` — re-running the nginx `envsubst` step so the proxy target
> matches. `LIVEKIT_URL` / `VITE_LIVEKIT_URL` only carry the *public* `wss://`
> address on 443, so they are unaffected unless you move nginx itself.

Confirm what a configuration will bind, without starting it:

```bash
docker compose -f docker-compose.livekit.yml run --rm livekit ports
```

> Leaving the UDP ranges closed is the classic failure: everything appears to
> connect, then times out with no media.

### 5. nginx

```bash
set -a && . ./.env && set +a
envsubst '$LIVEKIT_DOMAIN $LIVEKIT_PORT' \
  < nginx/livekit.conf > /etc/nginx/sites-available/livekit
ln -sf /etc/nginx/sites-available/livekit /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

Naming only those two variables stops `envsubst` from eating nginx's own
`$host` / `$remote_addr` / `$http_upgrade`. Re-run this whenever `LIVEKIT_PORT`
changes, or nginx will proxy to a port nothing is listening on.

### 6. Start

```bash
docker compose -f docker-compose.livekit.yml up -d
docker compose -f docker-compose.livekit.yml ps      # both "healthy"
docker compose -f docker-compose.livekit.yml logs -f livekit
```

### 7. Point the app at it

`backend/.env`:

```
LIVEKIT_URL=wss://livekit.<domain>       # what CLIENTS dial
LIVEKIT_HTTP_URL=http://127.0.0.1:7880   # what the API dials — must equal LIVEKIT_PORT
TURN_URLS=turn:turn.<domain>:3478,turns:turn.<domain>:5349
TURN_SECRET=<same as livekit/.env>
```

`frontend/.env`:

```
VITE_LIVEKIT_URL=wss://livekit.<domain>
```

The frontend must prefer its **own** `VITE_LIVEKIT_URL` over any URL the API
returns. If a phone ever receives `ws://localhost:7880` it will fail silently.

The API's production startup guard enforces the important half of this: it
refuses to boot if the dev keypair is still in use, if `LIVEKIT_URL` is not
`wss://`, if it points at localhost, or if `TURN_URLS` is empty.

---

## Smoke test

Localhost success proves almost nothing. Run these in order:

1. `curl https://livekit.<domain>` responds through nginx.
2. Vet clicks **Start call** → pet parent's device rings.
3. Parent accepts → both sides show a running timer.
4. Audio **and** video flow both directions.
5. Mute / camera-off propagate to the other participant.
6. Hang up → both UIs return to idle, room is cleaned up.
7. **Repeat steps 2–6 with one device on cellular data, not Wi-Fi.** This is
   the only step that exercises TURN, and it is the one that catches a missing
   UDP firewall rule or a wrong `external-ip`.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `cannot unmarshal !!str ${LIVEK...` | `${VAR}` used inside `livekit.yaml` | LiveKit does not expand env vars in YAML — set the value as a real env var instead |
| Port change had no effect | field still present in `livekit.yaml` | an env var only applies when the field is **absent** from the config file |
| Works on desktop, dead on phone | client got a localhost LiveKit URL | serve a public `wss://`; prefer `VITE_LIVEKIT_URL` |
| Connects, no audio or video | UDP range blocked | open `LIVEKIT_RTC_PORT_RANGE_START..END`/udp |
| ICE / peer connection fails | strict NAT, no relay | `use_external_ip: true` + coturn + `TURN_URLS` |
| Token rejected at connect | key/secret mismatch | `LIVEKIT_KEYS` must equal `LIVEKIT_API_KEY`/`SECRET` in `backend/.env` |
| Media dies after ~60s | proxy idle timeout | `proxy_read_timeout` in `nginx/livekit.conf` |
| No audio after connecting | mic permission / autoplay policy | request on a user gesture, then `setMicrophoneEnabled(true)` |
| Rings, nothing on accept | client never called `room.connect()` | join with the token from the accept response |
