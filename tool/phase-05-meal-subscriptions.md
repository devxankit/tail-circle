# Phase 5 — Meal Subscriptions & Delivery

**Goal:** subscription lifecycle (subscribe → daily deliveries → pause/resume →
change plan → allergies) on the server, replacing `mealData.js`.

**Status: ✅ Done** (2026-07-19) · Depends on: Phase 3 (payments)

Verification: `node scripts/phase5-check.js` (server running) — **17/17 pass**.
Seeded: `node scripts/seed.js meals` (3 plans, 10 recipes verbatim from
`mealData.js`). **Mock deleted:** `meals/mealData.js`; localStorage retired:
`mealBalance`, `freeTrialClaimed`, `user_meal_orders`, `mealSubscription`,
`user_meal_allergies`, `meal_subscription_plans`.

**Design correction vs. the original plan:** the actual UI is a **prepaid
credit model**, not recurring billing — buy a package → meal credits →
order recipes daily (credits or à-la-carte with Razorpay). Backend mirrors
that: `MealPlan`/`Meal` catalogs, `MealAccount` (balance, trial flag,
allergies, pause state), `MealOrder` (package/prepaid/a_la_carte/trial) with
the `subscription` purpose handler crediting balance on payment. The planned
MealSubscription/MealDelivery cron models are NOT needed for UI parity;
delivery generation + live rider tracking land with the meal-vendor portal
(Phase 9) where riders actually update status.

Fix found by check: Mongoose 9 needs `updatePipeline: true` for pipeline
updates — replaced with a guarded read-then-update in the payment handler.

UI audit: MealDashboard (catalog/balance/orders/prepaid/à-la-carte/trial),
SubscribeFlow (real Razorpay package purchase), ChangePlan/PlanDetail
(API plans), UpdateAllergies + PauseSubscription (account API), TrackDelivery
header on latest real order (timeline stays decorative until Phase 9 rider
events). Remaining by design: `fresh_food_banner` localStorage → Phase 11
banners. ✅ mock-free within phase scope.

## Frontend screens covered
`meals/MealDashboard.jsx`, `MealSubscribeFlow.jsx`, `screens/PlanDetail.jsx`,
`screens/ChangePlan.jsx`, `screens/PauseSubscription.jsx`, `screens/UpdateAllergies.jsx`,
`screens/TrackDelivery.jsx`

## Models
- **MealPlan**: `{ providerId (meal vendor), name, mealsPerMonth, pricePerMonth, pricePerMeal (paise), features, badge, saveText, theme { colors, img }, active }`
- **Meal** (recipes): `{ providerId, name, description, category dog|cat, price, img, protein, tags, features, filterTags, rating, allergens: [..], active }`
- **MealSubscription**: `{ userId, petId, planId, providerId, mealSelections: [mealIds], allergies: [..], deliverySlot, addressId snapshot, startDate, nextBillingAt, status: trial|active|paused|cancelled|expired, pause { from, till, reason }, paymentId (recurring: latest), history[] }`
- **MealDelivery**: `{ subscriptionId, userId, date, mealIds, status: scheduled|preparing|out_for_delivery|delivered|skipped|failed, rider { name, phone, location (live) }, timeline[] }` — index subscriptionId+date
- **TrialMeal**: `{ userId, petId, mealId, scheduledAt, status }` (frontend + vendor + admin all show trials)

## Endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | /meals/plans · /meals/recipes | public | catalog with filters |
| POST | /meals/subscribe | auth | plan + selections + slot → Razorpay order (purpose subscription) |
| GET | /meals/subscription | auth | my active subscription + upcoming deliveries |
| PATCH | /meals/subscription/plan | auth | change plan (proration note in service) |
| PATCH | /meals/subscription/allergies | auth | updates future deliveries |
| POST | /meals/subscription/pause · /resume | auth | date-ranged pause |
| POST | /meals/subscription/cancel | auth | |
| GET | /meals/deliveries?date= | auth | today/track screen |
| GET | /meals/deliveries/:id/track | auth | live status; Socket.IO room `delivery:<id>` for rider location |
| POST | /meals/trial | auth | book trial meal |

## Tasks
- [x] MealPlan + Meal catalog modules; seed from `mealData.js` (Redis-cached public routes)
- [x] Prepaid account lifecycle (balance credits on paid package, atomic deduction on prepaid orders, pause/resume with date validation, trial one-shot)
- [x] À-la-carte orders server-priced through the `subscription` purpose handler
- [x] **Frontend:** MealDashboard + SubscribeFlow (Razorpay) + ChangePlan + PlanDetail + UpdateAllergies + PauseSubscription + TrackDelivery all on API
- [x] Seed: `scripts/seeders/meals.seed.js` (registered as `meals`). **Mock deleted:** `meals/mealData.js`
- [x] UI audit: all covered screens + shared components mock-free
- [ ] → Phase 9: delivery generation cron + Socket.IO `delivery:<id>` live rider tracking (vendor kitchen/delivery boards drive these)

## Security notes
- Billing amounts from plan doc, not client; plan change recompute server-side
- Pause/resume date validation (no retroactive, max window)
- Socket room join authorized (delivery belongs to user)

## Exit criteria
Subscribe with test payment → deliveries auto-generated → pause/change plan/allergies
all persist → TrackDelivery shows live status updates pushed via socket.
