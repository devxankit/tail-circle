# Phase 11 — Super Admin Platform

**Goal:** the ~40-view admin panel runs on real aggregated data: user/pet management,
vendor approvals, operations oversight, catalogs, finance, and platform tools.

**Status: 🚧 Backend complete + core/finance/catalog-config/KYC-docs views wired — 74/74 checks pass** · Depends on: Phases 1–10 (mostly reads existing models)

> **Backend: 100% complete & verified (57 checks).** All endpoint groups live under
> `/admin` (+ public `GET /banners`): auth (email+password, Redis lockout),
> dashboard aggregations, users (block/unblock), pets, vendor approvals
> (approve/reject/suspend → drives Phase 9/10, audit-logged) + documents +
> performance, banners CRUD, settings, audit-log viewer; **operations** (orders/
> bookings/appointments/deliveries/returns+resolve/support+reply); **catalogs**
> (products, product-categories, **breeds**, meal-plans, doctor-services,
> event-categories, memorial-packages, grooming-daycare, add-ons — all CRUD where
> applicable, cache-busting); **finance** (transactions, payments overview,
> commission settings, payout queue + mark-paid, wallet oversight, tax/GST report);
> **platform** (broadcast → notify() fan-out with confirm token, community + review
> moderation, staff CRUD super-only, reports summary). Services split across
> `admin.service`, `admin.ops.service`, `admin.catalog.service`,
> `admin.finance.service`, `admin.platform.service`. Seeder `admin`
> (`ADMIN_EMAIL`/`ADMIN_PASSWORD`, default `admin@tailcircle.com` / `admin123`;
> settings; Home banners verbatim). `scripts/phase11-check.js`: **57/57 pass.**
>
> **localStorage retirements — DONE:** `admin_token`/`admin_info`
> (→ `tc_access_token`+`admin_info`), `tailcircle_breeds` (BreedManagement → full
> `/admin/breeds` CRUD round-tripping recommendations/bundles via Breed
> summary/shopData), `meal_subscription_plans` (MealPlans → `/admin/meal-plans`
> CRUD round-tripping full plan fields incl. colors/features/badges), Home
> hardcoded `banners` const (→ public `GET /banners`, seeded verbatim with
> btnText/bg/image paths), and the **section-banner CMS** —
> `fresh_food`/`adoption`/`daycare` keys retired across BannersContent (admin
> save → `/admin/banners` by key) **and all 4 user consumers** (AdoptHome,
> DaycareHome, DaycareListing, MealDashboard → public `GET /banners`); Banner
> model seeded with the 3 `Section`-slot docs. Also `tailcircle_super_admin_meal_state`
> (MealPortalAdmin context → new `GET /admin/meal-portal` aggregation over the real
> Phase 5 meal models + Phase 9 meal vendors, lighting all 5 meal-ops views).
>
> **Frontend views wired to the API:** AdminLogin (real), guard + AdminLayout,
> AdminDashboard (live KPIs), Users (block/unblock), Pets, AllVendors
> (approve/suspend), PendingApprovals (approve/reject + bulk), BreedManagement
> (full CRUD), Orders, Staff (full CRUD), Settings (commission), Commission (live
> vendor rows), **Support** (reply), **Returns** (approve/reject), **Notifications**
> (real broadcast fan-out), **VendorPayouts** (mark-paid + bulk + UTR), user-app
> Home banners, **Products** (CRUD), **MealPlans** (CRUD), **Reviews**
> (moderation), **Transactions** (ledger), **ShopVendors** (approve/suspend + real
> per-vendor product/order/revenue stats), **Community** (post moderation),
> **BannersContent** (section-banner CMS on `/admin/banners`), **MealPortalAdmin**
> (all 5 meal-ops views via context on `/admin/meal-portal`), and the full
> **operations group** — Orders, Support, Returns, **Bookings**, **Appointments**,
> **Deliveries** (serializers enriched to each view's shape; Provider/Doctor models
> imported in `admin.ops.service` so `.populate()` registers their schemas). **All 5
> per-type vendor pages** (ShopVendors + Doctors/Meal/Events/Memorial) on real data
> via `fetchAdminVendors({type})` with working approve/suspend. Admin `listVendors`
> joins ledger + product aggregations for per-vendor stats. **All admin localStorage
> retired** (only session keys remain).
>
> **Finance views wired (2026-07-23):** **Payments** now reads real
> `paymentsOverview` (collectedToday/thisMonth/UPI-COD share + method-distribution
> pie computed from real paid Payments) + `listTransactions` for the table.
> **Wallet** reads the enriched `walletOverview` (real float/loaded-today/redemptions
> stats, per-wallet balances with last-loaded/last-used, recent ledger) and the
> **Adjust Balance** modal posts to the new **`POST /admin/wallet/:id/adjust`**
> (real credit/debit through the wallet ledger primitive + AuditLog). `admin_adjust`
> added to `WALLET_TXN_PURPOSES`. `scripts/phase11-check.js`: **58/58** (added a
> net-zero credit+debit adjust assertion).
>
> **6 catalog-config screens wired via seed-verbatim (2026-07-23):** new generic
> **`AdminConfig`** model (`{ group, sort, data, seedKey }`, icons stored as
> `data.iconName` strings) + `admin.config.service` (list/create/update/delete) +
> `/admin/config/:group` (GET/POST) & `/admin/config/item/:id` (PATCH/DELETE).
> Seeder **`admin-config`** upserts **69 rows across 13 groups** verbatim from the
> mock views. Wired: **ProductCategories** (product_category), **DoctorServices**
> (doctor_consultation + doctor_specialization), **AddonsAmenities** (service_addon +
> facility_amenity), **MemorialPackages** (memorial_service + memorial_package),
> **EventCategories** (event_category + event_addon + event_pending, with approve/reject
> → delete), **GroomingDayCare** (grooming_service + daycare_package + grooming_facility).
> Each view fetches its group(s), maps `iconName`→lucide component, and **persists
> status toggles** via `updateAdminConfig`; add/edit modals stay toast-only (matching
> the original mock, which never mutated the arrays — except ProductCategories, whose
> Add now creates a real row). `scripts/phase11-check.js`: **72/72** (+14 config asserts).
>
> **VendorDocuments wired (2026-07-23):** added a per-document KYC verification store
> — `documents[].status` (Pending|Verified|Rejected|Re-upload) + `verifiedBy` on
> VendorProfile; `admin.service.listAllDocuments()` flattens every vendor's KYC docs
> into one cross-vendor feed, and `verifyDocument(actor, vendorId, kind, action)`
> drives the verify/reject/re-upload workflow (audit-logged). Routes
> `GET /admin/documents` + `POST /admin/documents/:vendorId/:kind/verify`. Vendors
> seeder now stamps each vendor with license(Verified)/owner_id(Pending)/gst(Pending)
> so the queue has real items. The view fetches the feed + persists actions.
>
> **Remaining — 4 views that need a real subsystem, NOT wiring:**
> - **TaxGSTReports** — needs per-invoice GST detail (vendor GSTIN, state, CGST/SGST/IGST
>   split) that payments don't capture.
> - **VendorPerformance** — needs a vendor analytics engine (per-vendor revenue time-series
>   by 7d/month/custom, complaints-by-type, completion %, performance scoring) — none tracked.
> - **Reports** & **Security** — scheduled-report cron/generation; session/MFA/firewall
>   subsystem. **Left as-is per user decision (2026-07-23).**

> **Slice 1 (foundation):** `adminRole`/`permissions` on User; AuditLog/Banner/
> PlatformSetting models; admin email+password login with Redis lockout;
> dashboard KPI/donut/top-partner aggregations; users list + block/unblock; pets
> list; **vendor approval workflow** (list/pending/approve/reject/suspend → drives
> Phase 9/10 `approvalStatus`, syncs User.isBlocked, writes AuditLog) + documents +
> performance; banners (admin CRUD + public `GET /banners`); platform settings
> (super-only PUT) + audit-log viewer. Seeder `admin` (super-admin from
> ADMIN_EMAIL/ADMIN_PASSWORD, demo defaults `admin@tailcircle.com` / `admin123`;
> 9 settings; 3 Home banners). Frontend: `services/admin.js`, AdminLogin real,
> guard + AdminLayout on `tc_access_token`+`admin_info`, AdminDashboard KPIs live,
> Users, AllVendors, PendingApprovals on the API. `scripts/phase11-check.js` (24).
>
> **Remaining slices:** operations (orders/bookings/appointments/deliveries/
> returns/support), catalogs CRUD (products/categories/meal-plans/doctor-services/
> event-categories/memorial-packages/grooming-daycare/addons/breeds), finance
> (transactions/payments/commission/payouts/wallet/tax), platform (notifications
> broadcast/community/reviews/banners-content UI/reports/security/staff/settings),
> per-type vendor pages + VendorDocuments/Performance UI, MealPortalAdmin, and
> wiring Home banners on the user app.

## Frontend screens covered
`AdminLogin.jsx`, `AdminLayout`, `AdminDashboard`, and views under
`admin/views/{users, vendors, operations, services, finance, platform}` +
`MealPortalAdmin/*` (meal-ops super-admin portal)

## Models (new)
- **AdminStaff**: reuse User(role admin) + `adminRole: super|ops|finance|support|moderator`, `permissions: [..]`
- **AuditLog**: `{ actorId, action, targetType, targetId, before, after, ip, at }` (append-only)
- **Banner**: `{ key: fresh_food|adoption|daycare|…, title, subtitle, image, link, active, sort }` (replaces localStorage banners)
- **PlatformSetting**: `{ key, value }` (commission rates, delivery fees, tax %, feature flags)
- **Report** (user-generated content reports): from Phase 7 report endpoint

## Endpoint groups (all `requireRole('admin')` + permission check)
| Area | Coverage |
|---|---|
| Auth | POST /auth/login (email+password, strict limiter, lockout after failures) |
| Dashboard | GET /admin/dashboard — revenue, orders, bookings, user growth aggregations (match chart shapes in `AdminDashboard.jsx`) |
| Users/Pets | GET/PATCH /admin/users (block/unblock), GET /admin/pets |
| Vendors | GET /admin/vendors (+per-type filters), GET /admin/vendors/pending, POST /:id/approve·reject·suspend, GET /:id/documents (verify), GET /admin/vendors/performance |
| Operations | GET /admin/orders·bookings·appointments·deliveries (cross-vendor), refunds/returns queue with approve action, GET/PATCH /admin/support (ticket replies) |
| Catalogs | CRUD /admin/products, product-categories, meal-plans, doctor-services, event-categories, memorial-packages, grooming-daycare offerings, addons-amenities, breeds |
| Finance | GET /admin/transactions (Payment ledger), payments overview, GET/PUT commission settings, payout queue (approve → mark paid + UTR), wallet oversight, GST/tax report aggregation (period CSV export) |
| Platform | notifications broadcast (segment → notify() fan-out + FCM topic), community moderation (reported posts hide/delete/ban), reviews moderation, banners CRUD, reports/analytics, security (audit log viewer, session policies), staff CRUD with roles, settings |

## Tasks
- [ ] Admin auth (email+password, lockout, short access token) + permission middleware
- [ ] Vendor approval workflow (drives Phase 9 statuses) + document verification
- [ ] Dashboard/analytics aggregation pipelines (heavy ones cached in Redis, ~5-min TTL)
- [ ] Catalog CRUD (thin controllers over existing models)
- [ ] Finance: commission settings feed vendor ledger; payout processing; tax report exports
- [ ] Platform: banners (frontend Home reads GET /banners public), broadcast notifications, moderation queues, staff management, audit logging middleware on all admin writes
- [ ] MealPortalAdmin views mapped to cross-vendor meal aggregations
- [ ] **Frontend:** AdminLogin real; every admin view reads API; remove localStorage (banners, breeds, meal plans); seed a super-admin (env-driven bootstrap script)
- [ ] Seed: `scripts/seeders/admin.seed.js` (registered as `admin`) — super-admin account (env-driven credentials), Home banners, platform settings (commission/tax defaults) matching what the admin mock views display. **Mock retired after verify:** localStorage `banners`, `admin_token`/`admin_info`, `tailcircle_breeds` in `BreedManagement.jsx` (switches to `/breeds` CRUD), hardcoded admin view arrays

- [ ] UI audit: all covered screens + shared components mock-free (localStorage/mock-import grep)

## Security notes
- Admin tokens short-lived (e.g. 8h), separate limiter, login lockout + alert
- Permission matrix enforced per route group; super-only for staff/settings/security
- Every mutating admin action writes AuditLog; exports rate-limited
- Broadcast notifications require confirmation token (no accidental mass-push)

## Exit criteria
Admin logs in, approves a pending vendor, edits catalogs, processes a payout,
moderates a reported post, updates a Home banner that the user app renders —
all with audit trail entries.
