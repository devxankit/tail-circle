# Phase 7 — Social: Community · Matches · Chat (Firebase RTDB)

**Goal:** posts feed, pet match swiping with mutual matches, and real-time chat over
**Firebase Realtime Database**, replacing `communityData.js`, `mockProfiles.js` and
the hardcoded chat screens.

**Status: ✅ Done** (2026-07-19) · Depends on: Phase 2 (Firebase RTDB + Redis from Phase 0)

Verification: `node scripts/phase7-check.js` (server running) — **19/19 pass**,
including a real message write verified INSIDE Firebase RTDB and the
`conversationMembers` map the security rules read. Seeded: `node scripts/seed.js
social` (8 posts, 5 match profiles). **Mocks deleted:** `communityData.js`,
`mockProfiles.js`.

Design notes vs. original plan: mock profiles have no second real account, so
profiles the mock marked `online` are seeded with `autoLikesBack` — a
right-swipe on them produces a REAL mutual match + conversation (deterministic
demo reciprocity; real pet-owned profiles join the deck when users opt in —
model supports petId/ownerId). Chat: sends go through the API (Mongo mirror
authoritative) and fan out to RTDB best-effort; ChatRoom/ShelterChat subscribe
live via `firebase.js` custom-token sign-in with REST history backfill, sender
sees local echo (self-messages skipped from the live stream). Stories persist
with a 24h TTL index. Typing/presence indicators + unread counts + FCM push on
new message deferred to Phase 8 (notification service owns push).

UI audit: Community feed/likes/comments on API (optimistic UI), CreatePost
uploads to Cloudinary + posts under the real account name, MatchSwipe deck +
persisted swipes, ChatList shows real matches/conversations/stories,
ChatRoom + ShelterChat live over RTDB. ✅ mock-free within phase scope.

## Frontend screens covered
`community/Community.jsx`, `CreatePost.jsx`, `matches/Matches.jsx`, `MatchSwipe.jsx`,
`MatchesFilterModal.jsx`, `chat/ChatList.jsx`, `ChatRoom.jsx`, `StoryCamera.jsx`,
`adopt/screens/ShelterChat.jsx` (reuses chat)

## Models
- **Post**: `{ authorId, petId?, category: advice|funny|health|lost_found|..., content, image, likesCount, commentsCount, status: visible|hidden|reported, deletedAt }` — index category+createdAt
- **PostLike** `{ postId, userId }` (unique) · **PostComment** `{ postId, userId, text }`
- **MatchProfile**: uses Pet with `isMatchProfile: true` + `purpose`, `availability`, `prompts: [{ question, answer }]`, `photos`
- **Swipe**: `{ fromPetId, toPetId, action: like|pass }` (unique pair) · **Match**: `{ petA, petB, conversationId, matchedAt }`
- **Conversation** (MongoDB): `{ participants: [userId], context: match|adoption|support|vendor, refId?, rtdbPath, lastMessage, lastMessageAt, unread: { <userId>: n } }`
- **Message** (MongoDB mirror, for history/search/moderation): `{ conversationId, senderId, type: text|image, text, mediaUrl, readBy: [..], createdAt }` — index conversationId+createdAt
- **Firebase RTDB** (live layer): `chats/<conversationId>/messages/<pushId>` `{ senderId, type, text, mediaUrl, at }` + `chats/<conversationId>/typing/<userId>` + `presence/<userId>` — secured by rules (participants only, validated via backend-minted custom tokens)
- **Story** (StoryCamera): `{ userId, mediaUrl, caption, expiresAt (24h TTL index) }`

## Endpoints + Socket events
| Method | Path | Notes |
|---|---|---|
| GET/POST | /community/posts | feed (category filter, cursor pagination) / create with image |
| POST/DELETE | /community/posts/:id/like | toggle |
| GET/POST | /community/posts/:id/comments | |
| POST | /community/posts/:id/report | moderation queue for admin |
| GET | /matches/deck?petId=&filters | candidate profiles (exclude already-swiped, geo/type/purpose filters) |
| POST | /matches/swipe | like/pass; returns `{ matched: true, conversationId }` on mutual like |
| GET | /matches | my matches |
| GET | /chat/conversations · /chat/conversations/:id/messages | list + paginated history (from Mongo mirror) |
| POST | /chat/conversations/:id/messages | send: backend validates participant → writes to **RTDB** (live) + Mongo mirror + updates unread counts |
| POST | /auth/firebase-token | (Phase 0) custom token so the app can subscribe to RTDB directly |
| GET/POST | /stories | active stories / upload |

**Realtime flow:** clients *listen* on RTDB `chats/<id>/messages` for instant delivery
and write typing/presence directly (rules-guarded); message *sends* go through the
backend API so validation, mirroring, unread counts and FCM push happen in one place.
Socket.IO is still used for `match:new` and notification fan-out to `user:<id>`.

## Tasks
- [ ] Community module (posts/likes/comments/report) + image upload; seed from `communityData.js`; feed list cached in Redis (short TTL, invalidated on create)
- [ ] Match module: deck query, swipe dedupe, mutual-match detection (transaction), auto-create conversation (+ RTDB path); deck candidates cached per filter in Redis
- [ ] Chat module: conversation registry, send endpoint (RTDB write + Mongo mirror), unread counts, RTDB security rules deployed
- [ ] Presence/typing via RTDB (client-direct, rules-guarded)
- [ ] Stories with TTL expiry
- [ ] FCM push on new message / new match (uses Phase 8 notification service — coordinate)
- [ ] **Frontend:** Community + CreatePost wired; Matches deck + swipe wired; ChatList/ChatRoom subscribe to RTDB (via `firebase.js` custom-token sign-in) with REST history backfill; ShelterChat reuses conversation (`context: adoption`)
- [ ] Seed: `scripts/seeders/social.seed.js` (registered as `social`) — migrates `communityData.js` (posts, comments, like counts) and `mockProfiles.js` (match profiles as pets with `isMatchProfile`) verbatim. **Mock retired after verify:** `community/communityData.js`, `matches/mockProfiles.js`

- [ ] UI audit: all covered screens + shared components mock-free (localStorage/mock-import grep)

## Security notes
- RTDB rules: participants-only read/write, schema validation, no client writes to other users' paths; custom tokens carry `uid = mongo userId`
- All message sends validated server-side (participant check, content caps) before RTDB write
- Content length caps, image mime checks; report → hidden threshold for auto-moderation
- Swipe deck excludes own pets and blocked users

## Exit criteria
Two test users can match via swipes and chat in real time across two browsers
(messages delivered via Firebase RTDB, history served from Mongo); typing/presence
indicators work; community feed paginates with Redis cache hits; likes/comments persist.
