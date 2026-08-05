# Phase 1 — Auth, Accounts & Addresses

**Goal:** the user mobile app authenticates against the real backend; profile,
addresses and device tokens live in MongoDB. Vendor/admin login endpoints exist
(portals wired in Phases 9/11).

**Status: ✅ Done** (2026-07-17) · Depends on: Phase 0

Verification: `node scripts/phase1-check.js` (server running) — **19/19 pass**
(OTP login + normalization, refresh rotation + reuse/theft revocation, logout
revocation, profile CRUD + role-escalation block, address default logic + IDOR
block, tickets scoped per user, FCM token registration). Demo user seeded via
`node scripts/seed.js` (phone 9000000001).

Notes: vendor/admin email+password login lands with their portals (Phases 9/11).
The standalone `OtpVerify.jsx` screen is orphaned (no route navigates to it) —
Login/Signup carry the inline OTP flow, both wired to the real API.

UI audit (2026-07-18): two gaps found and fixed — the shared `TopHeader`
(greeting/avatar on every tab) was still reading dead `userProfile`
localStorage and always showed "Max"; now on `getStoredUser()`/`fetchMe()`.
`Splash.jsx` now redirects live sessions straight to `/app/home`. ✅ mock-free.

## Frontend screens covered
`auth/Splash.jsx`, `auth/Login.jsx`, `auth/Signup.jsx`, `auth/OtpVerify.jsx`,
`profile/Profile.jsx`, `profile/screens/EditProfile.jsx`, `profile/screens/AddressBook.jsx`,
`profile/screens/AddAddress.jsx`, `profile/screens/HelpSupport.jsx`

## Models
- **User** (extend existing): `gender`, `dob`, `city`, `notificationPrefs`, `fcmTokens: [{ token, device, updatedAt }]`
- **Address**: `{ userId, label: home|work|other, line1, line2, city, state, pincode, phone, isDefault, location: { type: Point, coordinates } }` (2dsphere index)
- **SupportTicket**: `{ userId, subject, category, message, status: open|in_progress|resolved, replies: [{ by, message, at }] }`
- **RefreshToken** (or token version on User) for server-side revocation on logout

## Endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | /auth/request-otp | public (rate-limited) | ✅ exists — wire SMS India Hub |
| POST | /auth/verify-otp | public | ✅ exists — returns `isNewUser` → frontend routes to onboarding |
| POST | /auth/refresh | public | ✅ exists — add rotation + revocation |
| POST | /auth/logout | auth | revoke refresh token, remove FCM token |
| GET | /users/me | auth | profile + pets summary |
| PATCH | /users/me | auth | name, email, gender, dob, avatar |
| POST | /users/me/fcm-token | auth | register device token |
| GET/POST | /addresses | auth | list / create |
| PATCH/DELETE | /addresses/:id | auth | ownership-checked; default switching |
| POST | /support/tickets | auth | HelpSupport screen |
| GET | /support/tickets | auth | my tickets |

## Tasks
- [x] Extend User model (bio/gender/dob/city/notificationPrefs) + strict zod schemas
- [x] Refresh-token rotation with revocation + reuse detection (family revoked on theft); logout invalidates
- [x] Address module (model/service/controller/routes) with default-address logic (first = default, ordered switch, delete promotes next)
- [x] Support ticket module (user side; admin replies in Phase 11)
- [x] FCM token registration endpoint (`POST/DELETE /users/me/fcm-token`)
- [x] **Frontend:** Login/Signup wired to real API (inline OTP + resend countdown + errors); tokens stored; new users → `/onboarding/step1`, existing → `/app/home`
- [x] **Frontend:** EditProfile (avatar upload → Cloudinary), AddressBook, AddAddress (full Indian address form + edit mode), HelpSupport (ticket form + list), Profile header + real logout
- [x] Auth route guard for `/app/*` + `/onboarding/*` (`RequireAuth` → redirect to login)
- [x] Seed: demo user (`scripts/seeders/demoUser.seed.js`)
- [x] Phone normalization util (`src/utils/phone.js`, canonical `+91…`) used across auth + SMS

## Security notes
- OTP per-phone cooldown + max 5 verify attempts (exists) — add resend countdown honored server-side
- Phone normalization (+91) in one place; email lowercase-unique
- Address/pincode format validation; never trust `isDefault` races (transaction or ordered update)

## Exit criteria
Full login→OTP→home flow on the real API; profile edit + avatar upload persists;
addresses CRUD from the app; refresh keeps the session alive across reloads.
