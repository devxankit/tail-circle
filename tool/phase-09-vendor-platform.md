# Phase 9 — Vendor Platform: KYC, Approval & Portals (Shop · Meal · Events · Memorial)

**Goal:** vendors register through the 5-step KYC flow, get approved by admin, and
run their portals against real data (their slice of the models from Phases 3–5).

**Status: ✅ Done — all four portals + KYC/approval/ledger/payouts, 58/58 checks pass** · Depends on: Phases 3, 4, 5

> Done: VendorProfile/VendorLedgerEntry/Payout models; AES bank-number encryption
> (masked in responses); vendor auth (KYC register → pending → approval-gated
> password + reg-no OTP login); common module (me/profile/dashboard/ledger/payouts);
> Shop module (products CRUD + stock, orders + forward-only status transitions with
> customer notify, returns, feedback) hard-scoped by `vendorId`; idempotent
> commission ledger on paid orders. Seeder `vendors` (5 approved, shop owns 8
> products; demo pw `vendor123`). Frontend: `services/vendor.js`, VendorAuth,
> ShopVendorContext (→ all 10 shop views), VendorLayout, VendorDashboard redirect.
> `scripts/phase9-check.js` (18 checks).
>
> **Meal portal (slice 2):** `providerId` on MealOrder + `meta` on MealPlan; plans
> CRUD, subscriptions/trials, kitchen queue, delivery board with status transitions
> and **live rider-location socket** (`delivery:<id>`); meal commission ledger;
> `vendorType` guard. MealProviderContext on API (all 13 views). 29/29 checks.
>
> **Events portal (slice 3):** `vendorId` on Event + EventPackage/EventAddon/
> CustomerRequest/EventGalleryItem models; events CRUD + publish + "Fully Booked"
> derivation, event-bookings with ticket check-in, packages/add-ons/gallery CRUD,
> custom-request inbox, event feedback; commission ledger on paid event bookings.
> PetEventsContext on API (all 11 views). 44/44 checks.
>
> **Memorial portal (slice 4):** MemorialService/MemorialAddon/TeamMember/
> MemorialRequest models; services & add-ons CRUD, team CRUD, requests pipeline
> (walk-in create, status transitions, team assignment, proof upload → Completed),
> computed KPIs; commission ledger on completion. **Payout request flow** added
> (`POST /vendor/payouts/request`). MemorialProviderContext on API (all 10 views).
> 58/58 checks across all four portals.
>
> **Deferred (non-blocking):** generic `/vendor/dashboard` full data wiring, meal
> inventory/finance-charts backends, admin approval UI (Phase 11 owns it —
> approval currently via the seeder/a temp script).

## Frontend screens covered
- `Admin/auth/VendorAuth.jsx` (login: email+password or reg-no+OTP; signup: 5-step KYC)
- Generic: `VendorLayout`, `VendorDashboard`, `CommonVendorPages` (profile, payouts, support, settings)
- **ShopVendor** portal (10 views): dashboard, products, orders, services, inventory, deliveries, returns, feedback, finance, settings + `ShopVendorContext`
- **MealSubscriptionProvider** portal (13+ views): dashboard, plans, subscriptions, trials, kitchen queue, delivery board, live tracking, feedback, finance, settings
- **PetEventsOrganizer** portal (11 views): events CRUD, bookings, calendar, packages/addons, gallery, requests, feedback, finance, settings
- **MemorialProvider** portal (10 views): requests, calendar, team, services, addons, proofs, support, finance, settings

## Models
- **VendorProfile**: `{ userId, businessName, registrationNo (generated), vendorType, email, phone, city, address, documents: [{ kind: license|owner_id|gst, url, verifiedAt }], bank { bankName, accountHolder, accountNumberEnc, ifsc, accountType }, gst { hasGst, number }, approvalStatus: pending|approved|rejected|suspended, commissionRate, rating }`
- **Payout**: `{ vendorId, period, grossAmount, commission, tax, netAmount, status: pending|processing|paid, utr, lineItems }`
- **VendorLedgerEntry**: `{ vendorId, refType (order|booking|subscription), refId, gross, commission, net, settledPayoutId }`
- Memorial-specific: **MemorialRequest** `{ userId?, createdByVendor?, petName, packageId/serviceId, addons, schedule, assignedTeamMember, status, proofs: [{ url, note }], amounts }` · **TeamMember** `{ vendorId, name, role, phone, active }`
- Events extra: **EventGalleryItem**, **CustomerRequest** (custom event inquiries)
- Kitchen/delivery: **KitchenTicket** (per delivery date aggregation), rider assignment on MealDelivery

## Endpoints (vendor-scoped, `requireRole('vendor')` + vendorType guard)
| Area | Paths |
|---|---|
| Auth | POST /vendor/register (multi-part steps), POST /auth/login (email+password), POST /vendor/request-otp (reg no) |
| Common | GET /vendor/me, PATCH /vendor/profile, GET /vendor/dashboard (per-type stats), GET /vendor/payouts, GET /vendor/ledger, POST /vendor/support |
| Shop | CRUD /vendor/products, /vendor/inventory (stock adjust log), GET/PATCH /vendor/orders (+status transitions, returns approve/reject), GET /vendor/feedback |
| Meal | CRUD /vendor/meal-plans + /vendor/meals, GET /vendor/subscriptions, GET/PATCH /vendor/deliveries (assign rider, status), POST /vendor/deliveries/:id/location (socket broadcast), kitchen queue GET |
| Events | CRUD /vendor/events (+publish), GET /vendor/event-bookings, packages/addons CRUD, gallery CRUD, requests inbox |
| Memorial | CRUD /vendor/memorial-services + addons, GET/PATCH /vendor/memorial-requests (+create walk-in), team CRUD, proofs upload |

## Tasks
- [ ] Vendor registration: 5-step KYC with doc uploads → creates User(role vendor, pending) + VendorProfile; login blocked until approved (`/vendor/pending` state)
- [ ] Vendor auth: email+password AND registration-no + SMS OTP paths
- [ ] Common vendor module (dashboard stats aggregations per type, profile, settings)
- [ ] Shop vendor module (products scoped to vendorId, order state transitions, inventory adjustments with audit trail, returns handling)
- [ ] Meal vendor module (plans/recipes CRUD, subscription views, kitchen queue generation, rider live-location → Socket.IO `delivery:<id>`)
- [ ] Events vendor module (event lifecycle, ticket sales views, gallery, requests)
- [ ] Memorial vendor module (requests pipeline, team assignment, proofs)
- [ ] Ledger entries written automatically on every paid order/booking/subscription (commission from settings); payout request flow
- [ ] **Frontend:** VendorAuth wired (signup + both login paths); each portal's Context switches from localStorage to API; live boards use sockets
- [ ] Seed: `scripts/seeders/vendors.seed.js` (registered as `vendors`) — one approved vendor of each type, owning the Phase 3–5 seeded catalog/providers so vendor dashboards show the same numbers the mock portals did. **Mock retired after verify:** vendor portal hardcoded dashboard/order/booking arrays, localStorage `vendor_token`/`vendor_info`

- [ ] UI audit: all covered screens + shared components mock-free (localStorage/mock-import grep)

## Security notes
- Every vendor query hard-scoped by `vendorId` from JWT — never from params
- Bank account number encrypted at rest (crypto AES) + masked in responses
- Doc URLs served as signed/scoped Cloudinary links; approval transitions admin-only
- Order/booking status transitions validated per state machine; vendors can't touch payments directly

## Exit criteria
A vendor can sign up → admin approves (Phase 11 or temp script) → logs in → manages
products/orders (shop), meal ops with live delivery tracking, events, or memorial
requests; ledger accumulates commission correctly.
