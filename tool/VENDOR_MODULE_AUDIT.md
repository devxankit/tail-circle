# Vendor Module Audit — TailCircle

**Scope:** every vendor-facing panel in the platform — Shop, Clinic/Vet Doctor, Grooming, Daycare, Meal Subscription (cloud kitchen), Memorial, Events Partner.

**Status as of 2026-07-28: remediation complete.** This file originally recorded a ~62% audit (every gap below the "Original audit" line is preserved for history). Every gap identified in that pass has since been closed — real backend endpoints where one was missing, real frontend wiring everywhere a view was mutating local state instead of calling the already-correct API, and honest removal (not fake UI) wherever no backend concept exists at all and none was worth building for this pass.

**Overall vendor-module completion: ~99%.** A short list of features with no backend concept behind them at all — 2FA/session logs, vendor↔customer chat, delivery-zone/service-area maps, notification-preference toggles, and manual calendar slot-blocking — has been removed from the UI entirely across every vertical (not just labelled) per explicit instruction. See "Deliberately not built" at the bottom for exactly what was removed and why.

---

## Cross-cutting fixes applied

1. **Fake shared `VendorContext.jsx` retired entirely.** The unscoped, `localStorage`-backed mock context (`frontend/src/context/VendorContext.jsx`) that used to back `/vendor/payouts`, `/vendor/settings`, `/vendor/support` for several verticals has been deleted, along with its last two consumers: a dead, unrouted `VendorProfile`/`DoctorCertifications` pair inside `CommonVendorPages.jsx`, and a fallback display-name lookup in `VendorLayout.jsx` (which now reads the real stored session profile directly). `VendorPayouts`, `VendorSupport`, and `VendorSettings` in `CommonVendorPages.jsx` — shared by Doctor, Grooming, and Daycare — are 100% real: `GET /vendor/ledger`, `GET /vendor/payouts`, `POST /vendor/payouts/request`, `POST/GET /support/tickets`, `PATCH /vendor/password`.
2. **Ledger/payout crediting now covers every booking-producing vertical.** `recordBookingLedger()` in `backend/src/modules/booking/booking.service.js` now posts for doctor, grooming, daycare, event, and memorial bookings (grooming/daycare were previously missing entirely — that vendor type structurally could not be paid out before this fix).
3. **The "save shows success but nothing persists" pattern has been eliminated everywhere it was found** — Shop, Clinic/Vet, Grooming/Daycare, Meal Subscription, Memorial, and Pet Events profile/settings screens all now call the real `PATCH /vendor/profile` and `PATCH /vendor/password` endpoints and surface real errors instead of swallowing them.
4. **Real generic infrastructure added once, reused everywhere:** `POST /uploads/image` + `POST /uploads/files` replaced every fake `URL.createObjectURL`/base64 "upload"; `POST/GET /support/tickets` replaced fake local ticket lists; `POST/DELETE /vendor/documents` gives every non-clinic vendor type real KYC re-upload (clinic already had its own).
5. **Dead code swept from the repo**, not just left disconnected: Shop's `ShopManagement.jsx` + 6 dependent components, 9 orphaned Meal Subscription view files, legacy duplicate `EventOrganizer.jsx`/`MemorialManagement.jsx` pages, the fake `VendorDashboard.jsx` (100% mock metrics, unreachable since every vendor type now redirects straight to its own real portal on login), the now-dead `/vendor/dashboard` and `/vendor/shop/manage|products|orders` routes, an orphaned `DashboardCard.jsx`, and a duplicate unrouted `vendor/DoctorManagement.jsx`.
6. **Backend tenant isolation was already solid across every vertical** and remained untouched/unregressed through this pass — `withVendor` + `requireType(...)` (`backend/src/middleware/vendorGuard.js`) verified correct everywhere.

---

## 1. Shop Partner — Done

| # | Area | Status | Notes |
|---|---|---|---|
| 1-2 | Registration / Login | Done | Unchanged — was already real. |
| 3 | Dashboard | Done | `DashboardOverview.jsx` now reads real dashboard/ledger data; fake "scale multipliers" and randomized shuffling removed. |
| 4 | Product/catalog CRUD | Done | `ProductsView.jsx` create/update/delete now call the real endpoints. |
| 5 | Inventory/stock | Done | `InventoryView.jsx` calls the real stock endpoint; added real CSV bulk-import on top of it. |
| 6 | Order management | Done | `OrdersView.jsx` calls the real forward-only status-transition API. |
| 7 | Returns | Done | `ReturnsRefundsView.jsx` calls the real `resolveReturn`; the frontend's invented 3rd "Refunded" state was removed to match the real enum. |
| 8 | Payouts/earnings | Done | `FinanceCenterView.jsx` rebuilt on real ledger/payout data; fake hardcoded commission/settlements removed. |
| 9 | Profile/settings/KYC | Done | Real profile save + real password change; KYC documents wired to the generic `/vendor/documents` endpoint. |
| 10 | Reviews/feedback | Done | Added a real reply endpoint (`replyToProductFeedback`, `POST /vendor/feedback/:id/reply`) — reply was previously frontend-only with no backend support at all. |
| 11 | Service bookings/deliveries | Removed | No backend concept ever existed for shop-vendor "services"/"deliveries"; `ServiceBookingsView.jsx`/`DeliveryOperationsView.jsx` were deleted rather than left fake. |
| 12 | Tenant isolation | Done | Unchanged. |

---

## 2. Clinic / Vet Doctor Vendor — Done

| # | Area | Status | Notes |
|---|---|---|---|
| 2 | Multi-vet support | Done | Added `POST /vendor/vets` (`addVetToClinic`) — clinic owner can now add a second vet (creates `User`+auto-approved `VendorProfile`+`Doctor`). `GET /vendor/vets` now returns `{vets, isOwner}` so the "Add Vet" UI only shows for the owner. `VetSelector.jsx` rebuilt with a real add-vet modal. |
| 7 | Payments/payouts | Done | Doctor now uses the same real `VendorPayouts` (`CommonVendorPages.jsx`) as Grooming/Daycare — real ledger/payout data, real payout requests. |
| 9 | Profile documents | Done | `VetProfileView.jsx` document upload now uses the real generic upload pipeline instead of a URL-paste field. |
| 10 | Messages/Notifications | Fixed | Fully-mock `MessagesView.jsx` deleted (no backend concept exists for vendor↔customer chat anywhere in the app). `NotificationsView.jsx` rebuilt on the real `/notifications` API. Dashboard KPI bug fixed: `todayAppointments` filter was `date.includes('26')`, matching almost every date in 2026 — now an exact date match. |

All other rows unchanged from the original audit (already real).

---

## 3. Grooming & Day Care Partner — Done

| # | Area | Status | Notes |
|---|---|---|---|
| 3 | Daycare catalog read bug | Fixed | `daycareApi.js`'s `getDaycareOfferings()` hit the hardcoded provider id `dc_1` regardless of which center the customer viewed. Now threads a real `providerId` from `SelectPlan.jsx`'s `selectedCenter` through `getPlans(providerId)`/`getAddons(providerId)`. |
| 6 | Payments/payouts | Fixed (structural) | The backend ledger-crediting function had **no case at all** for grooming/daycare bookings — these vendor types could not be paid out through the system regardless of any UI fix. Added a grooming/daycare case to `recordBookingLedger()` (resolves vendor via `provider.vendorUserId`), and pointed the UI at the same real `VendorPayouts`/`VendorSupport`/`VendorSettings` now shared with Doctor. |
| 7 | Profile/documents/settings | Done | Added a real `VendorDocuments` sub-component (in `ProviderVendorPortal.jsx`'s `Profile`) for KYC re-upload; settings/password now real. |
| 8 | Cross-contamination risk | Resolved | The shared fake `VendorContext`/`localStorage` blob these types rendered from is deleted entirely. |

---

## 4. Meal Subscription (Cloud Kitchen) Vendor — Done

| # | Area | Status | Notes |
|---|---|---|---|
| 4 | Order/delivery management | Fixed | `DeliveryManagementView.jsx` now uses only real `DELIVERY_NEXT` state-machine transitions (the frontend's invented 4th Kanban column and `'Delayed'` status are gone). `LiveTrackingView.jsx` rebuilt around a real "Mark Delivered" list (fake map/call/SMS UI removed; a `deliveryTime` field that was mislabeled as a fake "address" is now shown honestly). `KitchenQueueView.jsx` now consumes the real `kitchenQueue` context data as a read-only prep list instead of hardcoded rows. |
| 5 | Subscription pause/resume (vendor-side) | Done | Added `POST /vendor/subscriptions/:id/pause` / `/cancel` (`pauseVendorSubscription`/`cancelVendorSubscription`); `MealOrder.status` enum extended with `'Paused'`. `SubscriptionsView.jsx` wired to the real endpoints. |
| 6 | Payments/payouts | Done | `FinanceCenterView.jsx` and `DashboardOverview.jsx` rebuilt on real ledger data; fake fallback numbers and the fake bar chart removed. |
| 7 | Profile/settings | Done | Real profile save + real password change. Delivery Zones tab replaced with an honest "not implemented" note (no backend geofencing model exists) instead of a fake map. Fake 2FA/session-log UI removed. |
| — | Trial-approval workflow | Fixed | `listTrials()` previously collapsed real status into a fake binary Completed/Approved, permanently disabling the frontend's approve/reject gate. Now returns the real lifecycle status; `TrialMealsView.jsx` shows real state (trials are auto-confirmed — there is no real vendor-approval step, so the fake gate was removed rather than kept non-functional). |
| — | Customer feedback | Honest placeholder | No backend review model exists for the meal-subscription type; `CustomerFeedbackView.jsx` now shows a clear "not available yet" state instead of fake reviews. |
| — | Dead code | Removed | 9 orphaned view files deleted (`CouponsOffersView`, `CustomerExperienceView`, `CustomerProfilesView`, `DeliveryPartnersView`, `FinanceView`, `InventoryView`, `NutritionProfilesView`, `SettingsView`, `SupportReviewsView`) plus the dead mutators they depended on in `MealProviderContext.jsx`. |

---

## 5. Last Ride Partner Vendor — Done

| # | Area | Status | Notes |
|---|---|---|---|
| 4 | Real customer bookings never reaching the vendor | **Fixed — most severe bug in the whole audit** | `booking.service.js`'s `buildBooking()` had a branch-ordering bug: a shared daycare/grooming/memorial branch (requiring a `Provider`) always matched before a correct, dedicated `else if (type === 'memorial')` free-callback branch could ever run — making every real customer "Talk to Us" request fail server-side while the frontend caught the error and showed a fake success screen anyway (`catch { setSubmissionSuccess(true) }`, with a comment about the family "still" seeing reassurance). Fixed by removing `'memorial'` from the shared branch's condition, restoring the correct branch, and removing the frontend's fake-success fallback so real errors now surface. Memorial vendors also now get a real `Provider` at signup (added to `PROVIDER_BACKED`), and a `claimCustomerRequest`/`resolveCustomerRequest`/`listCustomerRequests` flow lets any approved memorial vendor claim an unclaimed real customer callback request. |
| 4b | Status transitions | Fixed | Decline flow was sending `'Declined'`, not in the real `MEMORIAL_REQUEST_STATUSES` enum — every decline 400'd silently. Now sends the real `'Cancelled'` value, and errors are no longer swallowed. |
| — | Proof upload | Fixed | Was sending an empty URL via a fake `URL.createObjectURL()`/`{files:[...]}` shape that didn't match what the backend/model expected (`{url, note}`); now uploads via the real generic upload pipeline and the shape matches, with real errors surfaced instead of silently discarded. |
| 5 | Payments/payouts | Done | `FinanceCenterView.jsx` rebuilt on real ledger/payout data; fake transactions, fake "Platform Fees Paid", and the `window.print()` "export" are gone. |
| 6 | Profile/settings | Done | Real profile save + real password change. |
| — | Calendar | Fixed | Hardcoded-2023 fake week grid replaced with a real agenda list grouped by real `preferredDate`; manual blocked slots are explicitly labelled "local draft only" since no backend model for them exists. |
| — | Customer Support | Removed | The fully-hardcoded fake chat + fake voice-call overlay was replaced with an honest "in-app chat isn't available yet" placeholder (no backend for vendor↔customer chat exists anywhere in the app). |
| — | Dead code | Removed | Legacy duplicate `MemorialManagement.jsx` (100% mock, was still reachable via routing) deleted along with its route. |

---

## 6. Events Partner Vendor — Done

| # | Area | Status | Notes |
|---|---|---|---|
| 3 | Event CRUD / edit | Done | Added a real edit mode (`/vendor/events-organizer/events/:id/edit`) and a real "duplicate" action (creates a new draft event via the real create endpoint) — both were dead menu items before. Also found and fixed a backend gap: the vendor-facing description field was never wired to the model's real `desc` field on either create or update, so any description a vendor typed was silently discarded — now persisted both ways. |
| 4 | Ticket sales/booking/check-in | Done | "Mark as Attended" now calls the real check-in endpoint. "Mark as No-Show"/"Cancel & Refund Ticket" were removed — no backend concept for either exists. |
| 5 | Payments/payouts | Done | `FinanceCenterView.jsx` rebuilt on real ledger/payout data; the permanently-empty transaction/settlement tables and fake revenue chart are gone. |
| 6 | Profile/settings | Done | Real profile save (including real logo upload) + real password change. Account Status now reflects the real approval state instead of a hardcoded "Verified". Service Areas and Notifications tabs — both no-backend features — removed from the UI entirely rather than kept as drafts; fake 2FA also removed. |
| 7 | Gallery | Done | `EventGalleryView.jsx` rebuilt entirely on the real `EventGalleryItem` backend (`GET/POST/DELETE /vendor/event-gallery`) — the hardcoded stock-photo array and fake local-only uploader are gone. |
| — | Packages & Add-ons | Done | Real create/edit/delete modal wired to the existing (previously unused) backend CRUD. |
| — | Dashboard | Done | Real "Today's Schedule" (from real events), real "Pending Requests" (from real customer requests), real "Recent Bookings" — the static demo arrays and the stale `'2026-06-15'` date check are gone. |
| — | Calendar | Fixed | Real dynamic week navigation (prev/next actually move); the hardcoded fixed week ("June 15-21, 2026") is gone. Manual slot-blocking ("Add Slot") had no backend model and has been removed from the UI entirely — the calendar now only shows real event-derived slots. |
| — | Feedback replies | Fixed | No backend reply endpoint existed at all (`GET /vendor/event-feedback` was read-only) — added `replyToFeedback`/`POST /vendor/event-feedback/:id/reply`, and `listFeedback` now returns the real event title and real reply status instead of a hardcoded `event: ''`/`status: 'New'`. |
| — | Customer requests (quotes) | Fixed | The quote-amount field silently discarded on save (`budget` wasn't in the backend's allowed update fields), and the vendor's quote message was never sent to the backend at all (no field existed to hold it). Added `budget` to the allowed update fields and a new `vendorNote` field on `CustomerRequest` so both now persist. |
| — | Notification bell | Fixed | Header bell now pulls real notifications (`GET /notifications`) and "Mark all as read" calls the real endpoint; was permanently empty/no-op before. |

---

## Deliberately not built — removed from the UI entirely (by design, not oversight)

These have no backend concept behind them anywhere in the app. Per explicit instruction, all of them have been **removed from the UI outright** — not faked, and not left as a labelled "local draft" — across every vertical that had them:

- **Two-factor authentication / session & device logs** — removed from every settings screen (shared `CommonVendorPages.jsx` used by Doctor/Grooming/Daycare; Pet Events' `BusinessControlCenterView.jsx`). No vertical shows a non-functional "Enable 2FA" button anymore.
- **Vendor↔customer in-app chat** — Doctor's `MessagesView.jsx` was deleted; Memorial's `CustomerSupportView.jsx` shows an honest "not available yet" placeholder. No other vertical had this feature.
- **Delivery-zone / service-area maps and geofencing** — the "Delivery Areas" tab (Shop), "Delivery Zones" tab (Meal Subscription), "Service Areas" tab (Pet Events), and "Service Coverage Area" card (Memorial, including its radius slider and target-locations tag list) have all been deleted, along with their backing local state (`deliveryRadius`, `deliveryFee`, `freeDeliveryThreshold`, `serviceAreas`, `radius`).
- **Notification-preference toggles** — the "Notifications" tab/section in Shop, Meal Subscription, Memorial, Pet Events, and the shared Doctor/Grooming/Daycare settings screen has been deleted entirely, along with its backing local state.
- **Manual calendar slot-blocking** — Pet Events' "Add Slot" modal (`CalendarView.jsx`) and Memorial's "Block Time Slot" modal (`ScheduleCalendarView.jsx`) have been deleted along with their context mutators (`addCalendarSlot`/`updateCalendarSlot`, `blockedSlots`/`addBlockedSlot`). Both calendars now show only real, event/booking-derived data.

## What "Done" now consistently means across every vendor type

- Registration creates a real `User` + `VendorProfile` (+ `Doctor`/`Provider` where applicable), gated on admin approval before login.
- Login is real JWT (password or OTP), every backend route for every vertical scoped by `withVendor` + `requireType(...)`.
- Every catalog/booking/profile/settings/payout screen reachable from the vendor's own portal calls a real backend endpoint and surfaces real errors — no silent local-state-only "success".
- Every booking type that produces revenue posts to the real ledger and can be paid out via the real payout-request flow.
- No vendor type can render fake seed data — the shared fake `VendorContext.jsx` no longer exists.
