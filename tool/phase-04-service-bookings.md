# Phase 4 — Service Bookings (Daycare · Grooming · Doctors · Events · Memorial)

**Goal:** one provider/booking engine powering all five service verticals,
replacing `mockDaycareApi.js`, `mockGroomingApi.js` and the hardcoded
doctor/event/memorial lists.

**Status: ✅ Done** (2026-07-19) · Depends on: Phases 2, 3 (payments)

Verification: `node scripts/phase4-check.js` (server running) — **25/25 pass**
(all five catalogs seeded + served, slot template availability, atomic slot
capacity (2/slot grooming, 5 doctor) with release on cancel, event ticket
capacity guard, per-vertical pricing mirrors the UI exactly incl. fixed
discounts/fees, Razorpay + pay-later + free paths, IDOR block, unified history).
Seeded: `node scripts/seed.js providers` — 9 providers (3 daycare, 5 grooming,
1 memorial), 61 offerings, 3 doctors, 5 events + categories/templates.
**Mock files deleted:** `services/mockDaycareApi.js`, `services/mockGroomingApi.js`
(replaced by real `services/daycareApi.js` / `groomingApi.js` with identical
export signatures — 12 screens wired by import swap alone).

UI audit: doctors/events/memorial inline arrays replaced with API fetches;
DoctorList quick-book + DoctorCheckout (₹29 online fee), EventList ticket sheet
+ EventCheckout (₹49 fee where shown), memorial callback → free booking;
grooming VisitAddress now uses the real address book; BookingHistory/
BookingDetail unified on `/bookings`; DaycareBookingDetail on API with real
cancel. Remaining by design: DoctorList's quick modal books pay-at-clinic
(no payment UI exists in that sheet); `tailcircle_bookings` localStorage is
fully retired.

## Frontend screens covered
- Daycare: `DaycareHome/Listing/Detail` + 8-step booking flow + `DaycareBookingDetail`
- Grooming: `GroomingList/Listing/Detail` + 7-step booking flow + `MyBookingDetail`
- Doctors: `DoctorList/Detail/Checkout/Success`
- Events: `EventList/Detail/Checkout/TicketSuccess`
- Memorial: `MemorialService.jsx`
- Profile: `BookingHistory.jsx`, `BookingDetail.jsx`

## Models
- **Provider** (unified, `type` discriminates): `{ type: daycare|grooming|clinic|events_organizer|memorial, vendorUserId, name, images, gallery, about, rating, ratingCount, verified, location { Point } + areaText, openTime/closeTime, amenities/facilities, rules, supportedPets, host { name, role, image, experience }, stats, activities, cancellationPolicy, active, approvalStatus }` — 2dsphere + type indexes
- **ServiceOffering**: `{ providerId, name, description, price, mrp, durationMin, category (e.g. daycare plan day/week/month, grooming package, consultation type in_clinic|video, memorial package), addons: [{ name, price }], active }`
- **Doctor** (extends provider context): `{ providerId, name, photo, qualifications, specialization, experienceYears, consultationFee, videoFee, bio, languages }`
- **Event**: `{ organizerProviderId, title, category, description, banner, gallery, venue { name, address, location }, startAt, endAt, ticketTiers: [{ name, price, capacity, sold }], perks, attendeesPreview, status: draft|published|completed|cancelled }`
- **AvailabilitySlot / schedule**: provider weekly template + exceptions; slots generated on demand `{ providerId, doctorId?, date, time, capacity, booked }`
- **Booking** (unified): `{ bookingNo, userId, petId(s), providerId, type, offeringId/eventId/doctorId, schedule { date(s), slot, durationDays }, visitType: salon|home|clinic|video, addressSnapshot?, pickupDrop?, notes/petInfoSnapshot, amounts { base, addons, discount, tax, total } (paise), paymentId, status: pending_payment|confirmed|in_progress|completed|cancelled|no_show|refunded, timeline[], ticketQty? }` — indexes userId+status, providerId+date

## Endpoints (pattern repeated per vertical)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | /providers?type=daycare&near=&filters | public | listing + filter sheets |
| GET | /providers/:id | public | detail incl. offerings, reviews |
| GET | /providers/:id/slots?date=&offeringId= | public | availability |
| POST | /bookings | auth | validates slot capacity + recomputes price → Razorpay order |
| GET | /bookings · /bookings/:id | auth | history + detail (BookingHistory merges all types) |
| POST | /bookings/:id/cancel | auth | policy-window check, refund |
| GET | /events · /events/:id | public | listing/detail |
| POST | /events/:id/book | auth | ticket tier capacity check |
| GET | /doctors · /doctors/:id | public | list/detail with fees |

## Tasks
- [x] Provider + ServiceOffering modules; Redis cache on provider listings/detail — **slot availability never cached** (geo `near` deferred until real coordinates exist; mock uses display distance text)
- [x] Availability engine (template → generated slots, capacity, atomic booking `$inc`-style guard with compensation)
- [x] Unified Booking module with per-type validation (daycare day/week/month × duration pricing, grooming addons + home-visit fee, doctor consult fee ± online platform fee, event ticket capacity, memorial free callback)
- [x] Payment integration through Phase 0 dispatcher (`purpose: booking`) + pay-later + free paths
- [x] Cancellation with slot/ticket release + auto Razorpay refund (policy-window refinement in Phase 9 vendor rules)
- [x] Reviews reuse (targetType `provider`) — model supports it; provider review UI lands with vendor phase
- [x] **Frontend:** all five verticals' listing/detail/booking flows call the API; `mockDaycareApi.js` + `mockGroomingApi.js` **deleted**; BookingHistory/BookingDetail unified on `/bookings`
- [x] Seed: `scripts/seeders/providers.seed.js` (registered as `providers`) — daycare/grooming migrated from the mock modules verbatim, doctor/event/memorial lists carried verbatim in the seeder

- [ ] UI audit: all covered screens + shared components mock-free (localStorage/mock-import grep)

## Security notes
- Slot capacity enforced atomically; double-booking impossible under concurrency
- Prices/fees recomputed server-side; addons validated against offering
- Cancellation refunds computed from policy stored on provider, not client input

## Exit criteria
Each vertical bookable end-to-end with test payment; bookings visible in unified
history; slot capacity respected; cancel + refund works within policy window.
