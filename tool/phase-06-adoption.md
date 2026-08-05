# Phase 6 — Adoption Workflow + Pet Marketplace

**Goal:** adoption listings and the full 7-step application pipeline
(apply → home check → approved → meet & greet → agreement → fee → success),
replacing `mockAdoptApi.js` and `useAdoptStore.js`. Also owns the
**pet Marketplace** (`shop/Marketplace.jsx` buy/sell/adopt tabs) — reassigned
here from Phase 3 (2026-07-18 UI audit): it's breeder/seller listings, a
different domain from the product shop and previously unmodeled.

**Status: ✅ Done** (2026-07-19) · Depends on: Phases 2, 3

Verification: `node scripts/phase6-check.js` (server running) — **19/19 pass**
(catalog + live breed counts, strict sequential state machine with
step-jump rejection, one-active-application-per-listing, listing locks on
approval → Adopted on completion, free path skips payment, paid fee charges
the listing price via Razorpay, IDOR block, marketplace sell/book-meet).
Seeded: `node scripts/seed.js adoption` — 155 listings (deterministic
generator preserved verbatim), 20 breed cards, 4 marketplace listings.
**Mock deleted:** `services/mockAdoptApi.js`; localStorage retired:
`tailcircle_marketplace_pets` + marketplace's `tailcircle_bookings` writes.

UI audit: AdoptHome/PetListing breed rails now async on `/adoption/breeds`
(live counts); PetDetail/ShelterChat fetch listings; all 5 step screens hit
real transitions; AdoptionFee shows the real fee (mock rendered
"₹undefined" — fixed) and reads "Complete Adoption" for free pets;
MyAdoptions on real applications; Marketplace buy/sell/adopt tabs all on API
(adopt teaser shows real free listings). Remaining by design:
`adoption_banner` localStorage → Phase 11 banners; ShelterChat messaging →
Phase 7 chat; shelter-side/admin approval moderation → Phase 11 (pipeline is
self-serve until then, matching the mock walkthrough).

## Frontend screens covered
`adopt/screens/AdoptHome.jsx`, `PetListing.jsx`, `PetDetail.jsx`, `MyAdoptions.jsx`,
`ShelterChat.jsx`, `adopt/booking/AdoptionApplication.jsx`, `HomeCheck.jsx`,
`ApplicationApproved.jsx`, `MeetAndGreet.jsx`, `AdoptionAgreement.jsx`,
`AdoptionFee.jsx`, `AdoptionSuccess.jsx`, **`shop/Marketplace.jsx`** (buy/sell/adopt)

## Models
- **Shelter**: `{ name, verified, image, location, contact, userId? }` (managed by admin for now; shelter portal is future scope)
- **AdoptionListing**: `{ shelterId, name, type, breed, age, gender, price (0 = free), weightKg, location, images, about, traits, health { vaccinated, dewormed, neutered }, status: available|pending|adopted|withdrawn }` — indexes breed/type/status
- **AdoptionApplication**: `{ userId, listingId, shelterId, form { homeType, hasYard, experience, otherPets, workSchedule, ... as per Application screen }, status: submitted|home_check_scheduled|home_check_done|approved|rejected|meet_scheduled|meet_done|agreement_signed|fee_paid|completed|cancelled, homeCheck { scheduledAt, notes }, meet { scheduledAt }, agreement { acceptedAt, docUrl }, paymentId, timeline[] }`
- Chat with shelter reuses Phase 7 Conversation model (`context: adoption`)
- **MarketplaceListing** (Marketplace buy/sell): `{ sellerId, name, species, breed, ageText, gender, price, vaccinated, image, location, verification, cert, status: active|booked|sold|removed }` — user-created via the Sell tab; meet-the-pet bookings + inquiries; replaces localStorage `tailcircle_marketplace_pets` / `tailcircle_bookings`

## Endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | /adoption/pets | public | filters: breed, type, price/free, distance; breeds facet for AdoptHome |
| GET | /adoption/pets/:id | public | detail + shelter card |
| GET | /adoption/breeds | public | breed cards with counts (aggregate) |
| POST | /adoption/applications | auth | one active application per listing per user |
| GET | /adoption/applications · /:id | auth | MyAdoptions + step screens read status |
| POST | /adoption/applications/:id/schedule-home-check | auth | |
| POST | /adoption/applications/:id/schedule-meet | auth | |
| POST | /adoption/applications/:id/agreement | auth | accept agreement |
| POST | /adoption/applications/:id/pay-fee | auth | Razorpay (skip if free) → completed |
| POST (admin) | /admin/adoption/applications/:id/approve·reject·complete | admin | admin drives shelter-side transitions until shelter portal exists |

## Tasks
- [x] Listing + breed-card modules (shelter embedded on listing as in the mock; standalone shelter accounts → Phase 11 scope)
- [x] Application module with strict state machine + timeline (submitted → home check → approved → meet → agreement → completed)
- [x] Fee payment via dispatcher (`purpose: adoption_fee`), free-adoption short-circuit
- [x] Listing status sync (Pending on approval, Adopted on completion)
- [x] **Frontend:** all adopt screens + booking steps read/write API; `mockAdoptApi.js` **deleted**; `useAdoptStore` kept for step-to-step UI state, persistence is API-backed
- [x] Marketplace module (listings, sell-tab create, meet bookings) + `Marketplace.jsx` wired
- [x] Seed: `scripts/seeders/adoption.seed.js` (registered as `adoption`) — 155 listings + 20 breed cards + 4 marketplace listings
- [x] UI audit: all covered screens + shared components mock-free

## Security notes
- State transitions validated server-side (user can't jump to `approved`)
- Only one active application per listing; listing locked once an application passes `approved`

## Exit criteria
Adopt a pet end-to-end (with fee payment for paid listings); MyAdoptions shows live
stage; listing status updates automatically.
