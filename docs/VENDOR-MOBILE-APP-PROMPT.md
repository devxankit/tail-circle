# Tail Circle — Convert the Vendor (Partner) Panel into a Mobile-App UI

## 0. Context and goal
You're working in the Tail Circle repo at `E:\Appzeto Projects\TailCircle`.
- **`frontend/`** uses React 19, Vite 8, Tailwind CSS v4 (via `@tailwindcss/vite`, theme in `src/index.css` `@theme`, no tailwind.config), react-router-dom v7 and lucide-react.
- **`backend/`** is Node/Express/MongoDB. You will not touch it.

**The customer app** (`frontend/src/modules/user/`) is a mobile-first app:
- a 430px phone-width column on a cream background;
- white rounded cards;
- a bottom navigation bar;
- bottom sheets and sticky action bars.

**The vendor/partner panel** is a desktop web dashboard with black sidebars, wide tables and centred modals.

**Your job:** convert the entire vendor panel into a mobile-app UI that looks and feels like the customer app. Screens, data, actions and flows stay the same, but it should be better organised for a phone: bottom nav, cards, sheets, one column, sticky actions.

**This is a UI conversion, not a feature project.**

## 1. Hard rules
1. **Frontend only.** Do not create, modify or delete anything in `backend/`.
2. **Don't change the data layer.** In `frontend/src/services/*.js`, function names, endpoints, params, payloads and response handling all stay as they are. You may import from these files. Don't add API calls a screen doesn't make today. Context providers keep their fetch and mutation logic.
3. **No new features and no removed features.** Every screen, field, button, filter, badge and action that exists today must still exist afterwards, reachable from the bottom nav or More in 2 taps or fewer. The only behaviour changes allowed are the fixes in §9.
4. **Move markup, not logic.** Keep these exactly as they are:
   - state and handlers;
   - validation;
   - status transitions (e.g. `NEXT_STATUS`);
   - countdown timers and socket listeners;
   - `VendorAlertContext`.

   Where a file mixes logic and JSX, change the JSX and classes only.
5. **Every URL keeps working.** This covers:
   - route paths in `frontend/src/App.jsx`;
   - every `?view=` value;
   - `VENDOR_HOME`, `vendorHome()` and `postLoginPath()` in `src/constants/vendorTypes.js`;
   - `compliancePathFor` in `components/VendorComplianceBanner.jsx`;
   - `ticketQrValue()` in `src/components/common/TicketQR.jsx`.

   You may change which component a route renders. Don't rename or remove paths.
6. **No new npm dependencies.** framer-motion and tailwindcss-animate are not installed, so `animate-in`, `fade-in`, `slide-in-from-*` and `zoom-in-*` classes do nothing. Don't rely on them. Use plain CSS keyframes; `.tc-sheet-backdrop` and `.tc-sheet-panel` already exist in `src/index.css` (~lines 577–590).
7. **Don't touch anything outside the vendor panel:**
   - customer-app screens (importing from `modules/user` is fine);
   - the admin panel (`modules/Admin/admin/**`, `layouts/AdminLayout.jsx`);
   - `modules/Admin/MealPortalAdmin/` (super-admin);
   - the landing page;
   - the PWA manifest and service worker.

   Shared components that admin also uses (`components/DataTable.jsx`, `components/Modal.jsx`, `components/ChartCard.jsx`) may only get **opt-in** props. Their default rendering must not change.
8. **Global CSS:** only add new, vendor-scoped classes to `index.css`. Don't edit existing rules. The compact overrides for ≤385, ≤360 and ≤325px (~lines 289–516) affect every module, so design with them rather than changing them.
9. **Git:** create the branch `feature/vendor-mobile-app-ui` and work there. Do not commit or push; I review and commit.
10. **Other problems:** if you notice something broken that isn't in §9, list it in your phase report and don't fix it.

## 2. Decisions already made (don't re-ask)
| Topic | Decision |
|---|---|
| Desktop | Phone frame everywhere. The vendor panel renders inside the same centred 430px column as the customer app at every screen width. No sidebar at any width. |
| Look | Same visual language as the customer app (tokens in §5). Remove today's vendor-only orange (`#F05A2A`) and Inter override. |
| Navigation | For each business type: 4 tabs plus "More" (§6.3). |
| Fixes | Only mobile-blocking UI issues (§9). Buttons that don't work today stay as they are. |
| Scope | The 8 partner panels, Login/Signup, Business Hub, and the shared pages (Payouts, Support, Settings, Service Standing). **Not** `MealPortalAdmin` (super-admin). **Not** `ProviderVendor/ProviderVendorPortal.jsx`, which is not routed; leave it untouched. |
| Code approach | Build a shared vendor mobile kit first (§7), then convert the modules with it. |
| Delivery | Phased, with a stop for my review after each phase (§10). |

## 3. What exists today (inventory)
Paths are relative to `frontend/src/modules/Admin/` unless they start with `src/`.

**Five shells (near-copies of each other).** Each has:
- a black sidebar: a 280px drawer below 640px, a 64px icon rail at 640–1023px, and 240px at 1024px and above;
- a sticky header with BusinessSwitcher, VendorAvailabilityToggle, a bell dropdown and an avatar;
- `VendorComplianceBanner` above the outlet.

| Shell | File | Serves | Routing |
|---|---|---|---|
| VendorLayout | `layouts/VendorLayout.jsx` (452 lines; menus in `getMenuSections` 44–194) | clinic, grooming, daycare, adoption + shared pages | `/vendor/*` children + `?view=` |
| ShopVendorLayout | `ShopVendor/ShopVendorLayout.jsx` (397) | shop | `/vendor/shop-provider/*` |
| MealProviderLayout | `MealSubscriptionProvider/MealProviderLayout.jsx` (183) | meal_subscription | `/vendor/meal-provider/*` |
| PetEventsLayout | `PetEventsOrganizer/PetEventsLayout.jsx` (277) | events | `/vendor/events-organizer/*` |
| MemorialProviderLayout | `MemorialProvider/MemorialProviderLayout.jsx` (286) | memorial | `/vendor/memorial-provider/*` |

**Modules**
| Type | Base route | Screens (view key or sub-path) | Files |
|---|---|---|---|
| Grooming | `/vendor/grooming-provider` | dashboard, bookings, packages, addons, slots, profile | `GroomingVendor/GroomingVendorPortal.jsx` (1543) |
| Daycare | `/vendor/daycare-provider` | dashboard, bookings, plans, addons, capacity, profile | `DaycareVendor/DaycareVendorPortal.jsx` (1227) |
| Adoption | `/vendor/adoption-partner` | dashboard, applications, listings | `AdoptionVendor/AdoptionVendorPortal.jsx` (660) |
| Clinic | `/vendor/doctor/consultations` | dashboard, appointments_list, appointment_detail, video_call, video_consultations, patients_list, patient_detail, emergency, prescriptions, vaccinations, medical_records, follow_ups, schedule, availability, vet_profile, lab_reports, notifications | `ClinicVeterinaryDoctor/DoctorManagement.jsx` + 17 views + `components/VetSelector.jsx` + `context/ClinicVendorContext.jsx` |
| Shop | `/vendor/shop-provider` | (index), products, orders, inventory, returns, feedback, finance, compliance, settings | `ShopVendor/views/*`, `components/GlobalSearch.jsx`, `components/Toast.jsx`, `context/ShopVendorContext.jsx` |
| Events | `/vendor/events-organizer` | (index), events, events/create, events/:id/edit, bookings, calendar, packages, gallery, requests, feedback, finance, compliance, settings | `PetEventsOrganizer/views/*`, `context/PetEventsContext.jsx` |
| Memorial | `/vendor/memorial-provider` | (index), requests, calendar, team, services, addons, proofs, support, finance, compliance, settings | `MemorialProvider/views/*`, `components/CreateRequestModal.jsx`, `context/MemorialProviderContext.jsx` |
| Meals | `/vendor/meal-provider` (home is `/dashboard`) | dashboard, plans, subscriptions, trials, kitchen, delivery-board, live-tracking, feedback, finance, compliance, settings | `MealSubscriptionProvider/views/*`, `context/MealProviderContext.jsx` |

**Shared screens**
| Route | File |
|---|---|
| `/vendor/login`, `/vendor/signup` (and `/vendor/pending`) | `auth/VendorAuth.jsx` (413) |
| `/vendor/hub` | `vendor/VendorHub.jsx` (350) |
| `/vendor/payouts`, `/vendor/support`, `/vendor/settings` | `vendor/CommonVendorPages.jsx` (542) — `VendorPayouts`, `VendorSupport`, `VendorSettings` |
| `/vendor/compliance` and `<base>/compliance` | `components/VendorCompliancePage.jsx` (426) |

**Shared pieces:**
- `vendor/BusinessSwitcher.jsx` and `vendor/VendorAvailabilityToggle.jsx`;
- `components/PendingBookingRequests.jsx`, `components/VendorComplianceBanner.jsx` and `components/VerificationBanner.jsx`;
- `components/DataTable.jsx` (card list below `sm`) and `components/Modal.jsx` (bottom sheet below `sm`);
- `src/context/VendorAlertContext.jsx`.

**Guard:** `ProtectedVendorRoute` in `src/App.jsx` (~491–528) checks the token and vendor type, calls `setActiveVendorType()`, and wraps children in `VendorAlertProvider`.

## 4. Reference: how the customer app is built (copy this, don't invent)
Paths are relative to `frontend/src/`.

**Frame, layout and navigation**
- **Frame:** `modules/user/layouts/MobileWrapper.jsx` lines 79–114.
  - Outer: `fixed inset-0 bg-gray-100 flex justify-center`.
  - Inner: `w-full max-w-[430px] h-full bg-bg-primary shadow-2xl relative flex flex-col overflow-x-hidden` with `transform: translate3d(0,0,0)`, which keeps `position: fixed` children inside the column.
  - Scrollbars hidden; `pageTransition` keyframes.
- **Tab layout:** `modules/user/layouts/MainLayout.jsx`. The scroll container is `flex-1 overflow-y-auto overflow-x-hidden hide-scrollbar` with `paddingBottom: calc(82px + env(safe-area-inset-bottom))`.
- **Bottom nav:** `modules/user/components/navigation/BottomNav.jsx`.
  - Bar: `absolute bottom-0 w-full bg-white/70 backdrop-blur-lg border-t border-white/50 rounded-t-3xl`.
  - Height `calc(80px + env(safe-area-inset-bottom))`.
  - Active item: `text-primary-main`, icon in a `p-2 rounded-2xl bg-primary-light/20` pill, 24px icon, label shown only when active.
- **Headers:**
  - `modules/user/features/home/DashboardHeader.jsx`: round 42px white icon buttons.
  - `modules/user/features/profile/screens/BookingHistory.jsx` (sub-page): sticky white bar, `ChevronLeft` back button, `text-lg font-bold` title.

**Cards, lists and actions**
- **Cards:** `BookingHistory.jsx` uses `bg-white p-4 rounded-[20px] shadow-sm border border-border-light` with a `STATUS_STYLES` badge. `MyOrders.jsx` uses `STATUS_META` with icons.
- **Grouped settings rows:** `modules/user/features/profile/Profile.jsx` lines 292–328.
- **Sticky bottom CTA with safe area:** `modules/user/features/shop/Cart.jsx` lines 126–131.
- **Bottom sheets:** `modules/user/features/subscription/LikeLimitSheet.jsx` lines 70–88 (uses `.tc-sheet-*`). Filter sheet: `modules/user/features/grooming/GroomingFilterSheet.jsx`.

**Controls and inputs**
- **Segmented tabs:** `modules/user/features/adopt/screens/MyAdoptions.jsx` 29–38 and `modules/user/features/events/EventList.jsx` 487–510. Chip tabs: `modules/user/features/community/Community.jsx` 241–256.
- **Date strip and slot grid:** `modules/user/features/grooming/booking/SelectSlot.jsx` 77–137.
- **Balance card and transaction rows:** `modules/user/features/wallet/Wallet.jsx` 193–251.
- **Image tile uploader:** `modules/user/features/onboarding/Step2Media.jsx` 107–148.

**States and utilities**
- **Empty/error:** `components/error/ErrorState.jsx`. Skeletons: `modules/user/features/adopt/screens/PetListing.jsx` 149–155.
- **Utilities:** `cn()` from `modules/user/utils/cn.js`, `Button` from `modules/user/components/ui/Button.jsx`, `hooks/usePrefersReducedMotion.js`.

## 5. Design tokens and rules
Use the tokens from `src/index.css` `@theme`:

| Token | Value | Use |
|---|---|---|
| `bg-bg-primary` | #FAF7F2 | screen background |
| `bg-white` | #FFFFFF | cards, bars, sheets |
| `primary-main` | #F87B68 (coral) | primary CTA, active nav, key numbers |
| `primary-light` | #FFCCBC | active pills, soft fills |
| `accent-teal` | #66B4B1 | secondary/confirm actions, selected chips |
| dark teal (hard-coded in user app) | #4C8684 | hero cards, gradients |
| `text-text-primary` / `-secondary` / `-disabled` | #5A5552 / #968F8A / #D1CBC7 | text |
| `border-border-light` | #F0EAE1 | borders, dividers |
| `success` / `error` / `warning` | #4CAF50 / #F44336 / #FF9800 | statuses that must read as real green, red or orange |

**Palette remap warning.** `index.css` remaps Tailwind's palettes:
- gray and slate become warm neutrals;
- red, orange, amber, yellow, rose and pink become coral;
- green, emerald, teal, cyan, sky, blue, indigo, violet and purple become teal.

So `bg-red-500` is coral, not red. For statuses use the single `StatusBadge` map (§7) built on the semantic tokens.

**Font:** Plus Jakarta Sans (already `--font-sans`).

**Layout rules**
- **Width:** design for a column of at most 430px; test at 360px.
- **No `sm:` / `md:` / `lg:` / `xl:` prefixes in vendor mobile code.** Tailwind breakpoints follow the browser viewport, not the 430px frame. On a desktop they would switch on inside the phone column and show desktop layouts. Remove breakpoint classes from every screen you convert. Also remove `window.innerWidth` checks and `100vh`, `h-screen` and `h-[calc(100vh-…)]` heights; the shell's scroll container owns the height.
- **`DataTable` and `Modal`:** these switch to mobile mode through `sm:` breakpoints, so inside the frame on a desktop they would render the desktop table or a centred modal.
  - Add opt-in props (e.g. `<DataTable forceMobile>`, `<Modal forceSheet>`), or use the kit equivalents.
  - Their default behaviour (used by admin) must not change.
- **Spacing:** gutter `px-4`. Cards `p-4 rounded-[20px]`; hero cards `rounded-[24px]`–`[32px]`; sheets `rounded-t-[28px]`. Card gap `gap-3`/`gap-4`. Section label: `text-xs font-bold uppercase tracking-wide text-text-secondary`.
- **Type:**

  | Element | Classes |
  |---|---|
  | Screen title | `text-lg font-bold` |
  | Card title | `text-[15px] font-bold` |
  | Body | `text-sm` |
  | Meta | `text-xs text-text-secondary` |
  | Micro-label | `text-[10px] font-bold uppercase` |
  | Money | `font-black` |

- **Buttons:** primary buttons are `h-12`/`h-14`, full width, `rounded-2xl` or `rounded-full`. Reuse `Button` where it fits.
- **Inputs:** full width, `h-12 rounded-xl border-border-light`, label above, 16px text.
- **Touch:** targets at least 44×44px. No hover-only UI. Never use a tooltip as the only label.
- **Safe areas:** the bottom nav, sticky bars and sheets pad with `env(safe-area-inset-bottom)`; the top bar pads with `env(safe-area-inset-top)`.
- **Motion:** page content uses the `pageTransition` keyframes, sheets use `.tc-sheet-*`, and both respect `usePrefersReducedMotion`.
- **Icons:** lucide-react, 20–24px, strokeWidth 2 (2.5 when active). Reuse the icons each sidebar item uses today.

## 6. App structure and navigation

### 6.1 Frame (`MobileWrapper.jsx`)
Split the `isAdminOrVendor` branch:
- **`/admin*`:** unchanged (full width, current styles).
- **`/vendor*`:** the same phone frame as the customer branch (grey outer, 430px inner column with translate3d, hidden scrollbars, `OfflineBanner`).
  - **Do not** wrap children in the `key={location.pathname}` div. It remounts the whole subtree on every path change, which would remount `VendorAlertProvider` (mounted by `ProtectedVendorRoute`) and lose live booking alerts and the sound-unlock state.
  - Run the page transition inside the vendor shell's content area instead, keyed on pathname + search, below all providers.
- **For `/vendor*`,** drop the `.vendor-area` orange/Inter variable override. Keep text selectable in inputs, as the user app does.

### 6.2 Shell anatomy (`VendorAppShell`)
The shell has these parts, from top to bottom:

1. **Top app bar:** sticky, `bg-white/90 backdrop-blur-md border-b border-border-light`, with safe-area top padding.
   - **Tab-root screens:**
     - Left: business logo or initials (40px, round), business name, and a type label (e.g. "Grooming Partner").
     - If the partner has more than one business, tapping the left side opens the **BusinessSwitcher as a bottom sheet**: same list, same switch behaviour (`window.location.assign`).
     - Right: a compact **availability toggle** (same `VendorAvailabilityToggle` logic with a compact visual; its 4-second note must stay inside the frame) and a **bell** with an unread dot. The bell opens notifications in a sheet or screen, using the same `fetchNotifications` / mark-read calls the current header dropdown uses.
     - The decorative "Live" / "Kitchen Live" / online pills are replaced by the toggle's own state.
   - **Sub-screens** (details, forms, secondary pages): a back button (`navigate(-1)`, falling back to the tab root), a title, and an optional right action.
2. **Banners:** `VerificationBanner` and `VendorComplianceBanner` as compact cards, with the same logic and dismiss rules.
3. **Pending booking requests:** keep `PendingBookingRequests` visible on the same screens as today (Grooming, Daycare, every Clinic view, Events dashboard and bookings, Memorial dashboard).
   - Show it as a compact card, e.g. "3 requests waiting · 04:32 left on the next".
   - Tapping it expands the full list inline (accept, or decline via `ReasonSheet`).
   - Partners get compliance strikes for missed requests, so it must never be hidden where it shows today.
4. **Content:** `flex-1 overflow-y-auto hide-scrollbar`, with bottom padding equal to the nav height plus the safe area. The keyed page transition lives here.
5. **Bottom nav:** on tab-root screens only. It's hidden on sub-screens (detail pages, forms, video call), which get a `StickyActionBar` when they have a primary action.
6. **Toasts:** one vendor toast host, a centred pill above the bottom nav. It replaces the bottom-right toasts (Shop `components/Toast.jsx`, the Clinic availability toast and any ad-hoc ones). Keep the same messages and timings.
7. **`VendorAlertContext` overlay:** logic unchanged. It must fit the 430px frame and appear only once (§9.8).

**Header actions that move:**
| Shell | Today (header) | Mobile |
|---|---|---|
| Shop | "+ Quick Action" (Add Product, Update Stock, View New Orders) | A quick-action row on Shop Home |
| Shop | GlobalSearch | A search icon in the app bar that opens it as a full-screen sheet |
| Events | "+ Create Event" | A button on the Events tab |
| Memorial | "+ New Request" | A button on the Requests tab, opening `CreateRequestModal` as a full-screen sheet |

The Events and Memorial header search inputs aren't wired to anything. Don't carry them over, and mention it in the report.

### 6.3 Bottom nav per business type
Each type gets 4 tabs plus **More**. Where a tab groups several existing screens, show **SegmentedTabs** (2–3 items) or scrollable **ChipTabs** (4+ items) at the top of the tab. They switch between the existing `?view=` values or routes, so URLs are unchanged. Every item in today's sidebar must end up as a tab, a segment, or a row in More.

The 4 tabs for each type:
| Type | Home | Tab 2 | Tab 3 | Tab 4 |
|---|---|---|---|---|
| **Grooming** | `/vendor/grooming-provider` | Bookings `?view=bookings` | Services: Packages `?view=packages` · Add-ons `?view=addons` · Time slots `?view=slots` | Earnings `/vendor/payouts` |
| **Daycare** | `/vendor/daycare-provider` | Bookings `?view=bookings` | Plans: Plans `?view=plans` · Add-ons `?view=addons` · Capacity & rates `?view=capacity` | Earnings `/vendor/payouts` |
| **Adoption** | `/vendor/adoption-partner` | Applications `?view=applications` (keep count badge) | Pets `?view=listings` | Earnings `/vendor/payouts` |
| **Clinic** | `?view=dashboard` | Appointments: All `appointments_list` · Video `video_consultations` · Emergency `emergency` | Patients (chips): Patients `patients_list` · Records `medical_records` · Prescriptions `prescriptions` · Vaccinations `vaccinations` · Lab reports `lab_reports` · Follow-ups `follow_ups` | Earnings `/vendor/payouts` |
| **Shop** | `/vendor/shop-provider` | Orders `/orders` (keep unread badge) | Products: Products `/products` · Inventory `/inventory` | Earnings `/finance` |
| **Events** | `/vendor/events-organizer` | Bookings `/bookings` | Events: Events `/events` · Calendar `/calendar` (+ Create → `/events/create`) | Earnings `/finance` |
| **Memorial** | `/vendor/memorial-provider` | Requests `/requests` (+ New request) | Services: Services `/services` · Add-ons `/addons` | Earnings `/finance` |
| **Meals** | `/vendor/meal-provider/dashboard` | Subscriptions: Subscriptions `/subscriptions` · Trials `/trials` | Deliveries: Kitchen `/kitchen` · Delivery board `/delivery-board` · Live tracking `/live-tracking` | Earnings `/finance` |

The rows in each type's More screen:
| Type | More rows |
|---|---|
| **Grooming** | Salon profile `?view=profile` · Service standing · Client support · Settings |
| **Daycare** | Centre profile `?view=profile` · Service standing · Client support · Settings |
| **Adoption** | Service standing · Client support · Settings |
| **Clinic** | Clinic schedule `schedule` · Availability calendar `availability` · Notifications `notifications` · Profile, fees & certifications `vet_profile` (today's two duplicate items become one row) · Service standing · Client support · Settings |
| **Shop** | Returns & refunds `/returns` · Customer feedback `/feedback` · Service standing · Business settings `/settings` · Client support |
| **Events** | Packages & add-ons `/packages` · Event gallery `/gallery` · Customer requests `/requests` · Customer feedback `/feedback` · Service standing · Business settings `/settings` · Client support |
| **Memorial** | Schedule `/calendar` · Team `/team` · Service proofs `/proofs` · Customer messages `/support` · Service standing · Business settings `/settings` · Client support |
| **Meals** | Meal plans `/plans` · Customer feedback `/feedback` · Service standing · Business settings `/settings` · Client support |

**Path notes:**
- Paths without `/vendor/...` are relative to that type's base route.
- **Service standing:** `/vendor/compliance` for Grooming, Daycare, Adoption and Clinic; `<base>/compliance` for the other four (as `compliancePathFor` does).
- **Settings:** `/vendor/settings` for Grooming, Daycare, Adoption and Clinic.
- **Client support:** always `/vendor/support`.
- **Clinic sub-screens** (`appointment_detail`, `patient_detail`, `video_call`) are full-screen pages with no bottom nav. They belong to the Appointments or Patients tab for highlighting.

**Active tab:** a tab is active when the current pathname and `view` belong to it, including its segments and sub-screens (e.g. `events/create` → Events, `appointment_detail` → Appointments). This replaces today's logic, which highlights "Dashboard" on every view (`VendorLayout.jsx` 216–222) and lights two Clinic items at once.

**Business type on shared pages:** on `/vendor/payouts`, `/vendor/support` and similar pages no module context is mounted. Take the type from the stored active vendor type (`tc_active_vendor_type`, managed in `src/services/api.js` and set by `ProtectedVendorRoute`) and `getStoredVendor()`. The shell chrome must not require module contexts. For example, Shop's unread-orders badge reads `ShopVendorContext` when it's available and simply doesn't show elsewhere.

### 6.4 More screen
The More screen is a tab root (bottom nav visible), styled like `Profile.jsx`:
- **Top card:** business logo, name, type and approval-status badge.
  - A "Switch business" row (opens the switcher sheet) when the partner has more than one business.
  - An "All businesses" row → `/vendor/hub`.
- **Grouped rows:** a section label, then a white rounded card of rows (icon, label, chevron), grouped like today's sidebar sections.
- **Log out:** a row at the bottom with the same logout behaviour each shell uses today. Shop's logout doesn't call `vendorLogout`; keep that and note it in the report.

## 7. Shared vendor mobile kit (build first)
Create the kit in `frontend/src/modules/Admin/vendor/mobile/`:

**Shell and navigation**
| Component | Purpose |
|---|---|
| `vendorNavConfig.js` | Tabs, segments and More sections for each type from §6.3, as the single source of truth. Helpers: `getNavForType(type)` and `matchActiveTab(type, location)`. |
| `VendorAppShell.jsx` | App bar, banners, content outlet with page transition, bottom nav and toast host. Props: `type`, `children` (or `<Outlet/>`), optional app-bar actions. |
| `AppBar.jsx` | Root variant (business identity, toggle, bell) and sub-page variant (back, title, action). |
| `VendorBottomNav.jsx` | Visual clone of the user `BottomNav`, driven by the config, with optional badges. |
| `MoreScreen.jsx` | The More screen from §6.4. |
| `SegmentedTabs.jsx`, `ChipTabs.jsx` | In-tab navigation that navigates to routes or `?view=` values. |

**Sheets and dialogs**
| Component | Purpose |
|---|---|
| `BottomSheet.jsx` | Uses `.tc-sheet-*`. Grabber, title, close button, body scroll lock, `max-h-[92%]`, sticky footer with safe area. Renders inside the frame. |
| `ActionSheet.jsx` | Replaces kebab and dropdown menus: a list of actions plus Cancel. |
| `ConfirmSheet.jsx` | Replaces `window.confirm`: same text, confirm (danger variant) and cancel. The same handler gets the same decision. |
| `ReasonSheet.jsx` | Replaces `window.prompt`: a textarea and a submit button. Passes the same string to the same handler. Empty input or cancel behaves as it does today. |

**Content building blocks**
| Component | Purpose |
|---|---|
| `ListCard.jsx` | A row for a converted table: title, subtitle, `StatusBadge`, 2-column meta grid, footer actions, `onClick` to the detail. |
| `StatTile.jsx` | 2-column stat grid, plus a horizontally scrolling row variant. |
| `StatusBadge.jsx` | One status→style map for all modules (pending, confirmed, in progress, completed, cancelled, declined, paid, failed, active, paused, …), built on semantic tokens. |
| `StickyActionBar.jsx` | Bottom bar for Save, Next or Confirm on forms and detail screens. Safe-area padding; the bottom nav is hidden while it shows. |
| `FormSection.jsx`, `Field.jsx` (Input, Select, Textarea, Toggle, ChipPicker) | Single-column form parts that pass through all native props (`placeholder`, `step`, `min`, `inputMode`, …). They replace the look of the per-file `Input`, `ChipPicker` and `Empty` copies, keeping the same value/onChange contracts. |
| `SearchBar.jsx`, `FilterSheet.jsx` | An `h-12 rounded-2xl` search input plus a filter button that opens the screen's existing filters in a sheet. |
| `ImageTiles.jsx` | Tile-grid uploader (Step2Media style) using the existing upload handlers. Remove, cover and reorder controls are always visible and at least 36px. |
| `EmptyState.jsx`, `SkeletonList.jsx`, `ScreenError.jsx` | Loading, empty and error states. `ScreenError` wraps `src/components/error/ErrorState.jsx`. |
| `VendorToast.jsx` | `VendorToastProvider` and `useVendorToast`: a centred pill above the bottom nav. Re-export Shop's `useToast().addToast` API from it so Shop code keeps its calls. |

**Reuse, don't duplicate:**
- `cn()`, `Button`, lucide, `ErrorState`, `.tc-sheet-*` and `.hide-scrollbar`;
- the `BusinessSwitcher` data logic (`getVendorLines`, `setActiveVendorType`);
- `VendorAvailabilityToggle` (add a `compact` prop) and `PendingBookingRequests` (add a `compact` prop);
- `VendorComplianceBanner` and `VerificationBanner`.

**Layout files.** Keep these five as thin wrappers:
- `VendorLayout.jsx`
- `ShopVendorLayout.jsx`
- `MealProviderLayout.jsx`
- `PetEventsLayout.jsx`
- `MemorialProviderLayout.jsx`

Each keeps its non-visual logic (auth check, the store/kitchen online switch handler, `CreateRequestModal` state, logout) and renders `VendorAppShell` with its type. That keeps `App.jsx` changes minimal.

## 8. Conversion recipes (apply everywhere)
| Desktop pattern today | Mobile version |
|---|---|
| Sidebar + header | `VendorAppShell` |
| In-page tab bars that duplicate the sidebar (Grooming, Daycare and Adoption `flex gap-2 flex-wrap` tabs) | Remove; replaced by the bottom nav and segments |
| Stat card grids | `StatTile` 2-column grid; keep them tappable where they are today |
| Hand-written `<table>`s (Clinic, Shop, Events, Memorial, Finance ledgers) | `ListCard` list: key column as the title, status as a badge, 2–4 key columns as meta, actions in the card footer or an `ActionSheet`. Row tap → detail, as today. |
| `DataTable` (Meals, shared pages) | Same component with `forceMobile` |
| Master/detail layouts (see the list below) | List → tap → full-screen detail sub-page (back button, `StickyActionBar`) or a tall `BottomSheet`. Follow the existing list-then-detail swap in `PetEventsOrganizer/views/CustomerRequestsView.jsx`. |
| Centred modals (`fixed inset-0` overlays, `Modal.jsx`) | `BottomSheet`. Forms with more than ~6 fields become a full-screen sub-page with a `StickyActionBar`. |
| `grid-cols-2` / `grid-cols-3` forms and modals | One column. Pairs only for tiny fields (start/end time, min/max). |
| Long single-page forms with one Save at the top (see the list below) | Section cards (collapsible is fine) and one `StickyActionBar` Save that calls the **same** save handler with the same payload. Never split one save into several. |
| Vertical tab rails in settings (Business Control Centers) | `SegmentedTabs`/`ChipTabs` at the top. Keep which tab shows which Save button as today. |
| Toolbars (search `w-52`–`w-72`, selects, toggles) | Sticky `SearchBar` + filter button → `FilterSheet` |
| Kebab and dropdown menus | `ActionSheet` |
| `window.confirm`, `window.prompt`, `alert` | `ConfirmSheet`, `ReasonSheet`, toast |
| Hover-only buttons | Always visible |
| Icon-only buttons explained only by a `title` tooltip | Icon plus a short visible label (44px target) |
| Week calendars (`min-w-[800px]`, 7 columns): Clinic appointments calendar mode, Events calendar | Horizontal day strip (SelectSlot style) plus a list for the selected day |
| Month grid (Clinic availability) | Keep the 7-column grid (cells ~48px); day details below it or in a sheet |
| Fixed widths (`w-24`, `w-32`, `min-w-[200px]`…), `h-[calc(100vh-…)]`, `max-w-7xl`, doubled padding (`p-6` inside the shell's padding) | Fluid; the shell owns padding and height |
| Horizontal overflow | None at 360px, except intentional horizontally scrolling chip or stat rows |

The master/detail layouts to convert:
- right drawers with `mr-[400px]` (Events bookings, Memorial requests);
- the Shop orders drawer;
- side-by-side panes (Shop returns and feedback, the Clinic appointment detail's sticky side card, calendar + day pane, the Rx form + preview).

The long single-page forms to convert:
- Grooming and Daycare Profile (~7 cards);
- Clinic VetProfile (~10 cards);
- the Business Control Centers.

## 9. Allowed fixes (mobile-blocking only, nothing else)
1. **Hover-only controls become always visible:**
   - Shop product form "Change image";
   - Events CreateEvent "Change photo";
   - Events Gallery delete;
   - PhotoManager cover/remove/reorder buttons (at least 36px).
2. **Meals delivery board** (`MealSubscriptionProvider/views/DeliveryManagementView.jsx`) uses HTML5 drag-and-drop, which doesn't fire on touch screens.
   - Show the 3 columns as segments.
   - Give each card a "Move to Out for delivery" / "Mark delivered" button that calls the same `updateDeliveryStatus` with the same arguments the drop handler uses.
3. **`window.confirm` / `window.prompt` / `alert`** become `ConfirmSheet` / `ReasonSheet` / toast, with the same handler and payload. This includes the decline reason in `PendingBookingRequests`.
4. **Memorial nav:**
   - Remove the links to routes that don't exist: `bookings`, `consultations`, `packages`, `tributes`, `products`, `feedback`.
   - List the existing routed screens: `calendar`, `team`, `services`, `addons`, `proofs`, `support` (§6.3).
5. **Active tab highlighting:** use `matchActiveTab` (§6.3).
6. **Shop and Meals each have two "online" controls on different endpoints:** the store/kitchen switch (`updateVendorProfile({ online })`) and `VendorAvailabilityToggle` (`PATCH /vendor/availability`).
   - Keep both. Don't merge them or change endpoints.
   - Show each once, with a clear label: the availability toggle in the app bar (as for every type), and the store/kitchen switch as a labelled row at the top of Home.
   - You may read the backend (read-only) to name them accurately.
7. **Layout-only changes:** the master/detail, drawer, fixed-width and viewport-height conversions in §8.
8. **One `VendorAlertProvider`:** the clinic, grooming, daycare and adoption routes nest `ProtectedVendorRoute` inside `ProtectedVendorRoute`, which mounts the provider twice (two overlays, double ringing). Let the inner guard skip the provider (e.g. a `withAlerts={false}` prop) without changing its auth or redirect logic.
9. **VendorLayout's duplicate mobile backdrop** goes away with the new shell.

**Not allowed (leave as is, list them in the report):**
- Buttons that do nothing or fake their result, for example:
  - Clinic: lab-report upload/preview/download, vaccination "Send reminder", records download, "Book visit", patient-detail actions, calendar prev/next;
  - Memorial: the hard-coded revenue and team menu items;
  - Shop: "Delete account" and the Filter button.
- Hard-coded phone numbers and addresses.
- `toPortalProfile` dropping `approvalStatus`/documents (the verification banner always shows in Shop, Events, Memorial and Meals).
- VendorAuth signup sending the address as the city.
- Clinic deep-link crashes (`?bookingId=`, and video list → patient detail).
- Shop GlobalSearch linking to `/services`.
- Optimistic mutations that swallow errors.

## 10. Phases (stop after each one)
**Workflow for every phase:**
1. **Plan:** enter plan mode and read this phase's files in full. Post:
   - the screen inventory for the phase: route/view → component → where it goes in the new nav;
   - the components you'll create or change;
   - any questions.

   Wait for my OK.
2. **Build:** implement, using the task list to track each screen.
3. **Verify:** run the checks in §11 and take screenshots.
4. **Report:** post files changed, screenshots (390×844 + one desktop), the parity checklist, and issues found but not fixed. **Then stop and wait for "continue".**

**Phase 1 — Foundation + Grooming pilot**
- Foundation:
  - Create the branch.
  - Vendor frame in `MobileWrapper` (§6.1).
  - The full kit (§7) and `vendorNavConfig` for all 8 types.
  - `VendorAppShell` wired into `VendorLayout`.
  - The single-`VendorAlertProvider` fix (§9.8).
- Convert Grooming completely:
  - **Home.**
  - **Bookings:** Day sheet/All toggle, date navigation, booking cards with status actions.
  - **Services:** Packages and Add-ons with inline forms converted to sheets or full-screen forms, including the "includes" editor and popular flag. Time slots with the add-slot bar, per-slot capacity and the customer preview strip.
  - **Salon profile:** info, location with "Use Live GPS", chip pickers, PhotoManager → `ImageTiles`, fees, bank details and KYC documents, with one sticky Save.
  - **Compact `PendingBookingRequests`.**
- This phase sets the look for everything else, so expect review comments.

**Phase 2 — Daycare + Adoption**
- Same shell; reuse the Grooming patterns.
- Daycare "Who's in" toggle and capacity & rates.
- Adoption applications with the next-step button, schedule/decline rows as sheets, and the listing form.

**Phase 3 — Shared pages + Hub + Auth**
- **Payouts:** balance/stat tiles, a sticky "Request payout" button, payout history and ledger as card lists, business filter chips.
- **Support:** ticket list, new-ticket sheet, and the thread as a chat-style screen with a reply bar.
- **Settings:** grouped rows and a password sub-screen. Local-only toggles stay local.
- **Service Standing** (`VendorCompliancePage`): tabs as segments, violation cards, a 2-column rule-stat grid.
- **VendorHub:** stacked business cards and the Add-business sheet; `?add=1` still opens it.
- **VendorAuth:** inside the frame, a photo band plus a sheet-style panel (like today's mobile layout, with no `lg:` split).
  - Single-column signup fields.
  - The same steps, validation, OTP timer and redirects.

**Phase 4 — Shop**
- `ShopVendorLayout` → shell. Home with the quick actions and the store switch.
- **Orders:** list, then a detail page with the status stepper, actions and print/download.
- **Products:** list, then a full-screen product form with image upload.
- **Inventory:** list, a stock-update sheet, and the CSV export/import buttons.
- **Returns and Feedback:** list, then detail.
- **Finance:** tabs as segments; ledger and payouts as cards.
- **Business Control Center,** GlobalSearch as a sheet, and the toast.

**Phase 5 — Events**
- **Bookings:** cards, then a detail sub-page with Admit / Mark attended; keep the ticket check-in input.
- **Events:** event cards with an `ActionSheet`. The 3-step create/edit wizard gets a sticky Back/Next and the preview as a full-screen sheet.
- **Calendar:** day strip.
- **Also:** Packages & add-ons, Gallery (2-column grid), Requests, Feedback, Finance, settings.

**Phase 6 — Memorial**
- **Requests:** list, then detail with actions. The decline sheet and `CreateRequestModal` become full-screen sheet forms.
- **Team:** cards with add/edit/assign sheets.
- **Also:** Services and Add-ons, Proofs (cards and an upload sheet), Schedule list, Finance, settings, the nav fix.

**Phase 7 — Meals**
- **Plans:** cards and a plan-form sheet.
- **Subscriptions and Trials:** `DataTable forceMobile`.
- **Also:** Kitchen queue, the delivery-board fix (§9.2), the Live tracking list, Finance, settings, the kitchen switch (§9.6).

**Phase 8 — Clinic (the largest)**
- **Home.**
- **Appointments:** all, video and emergency, plus the appointment detail with sticky actions.
- **Video call:**
  - Remote video fills the screen, with a small self-view at the top right.
  - A bottom control bar: mic, camera, end, notes, chat.
  - Notes and chat move from the fixed `w-96` side panel into bottom sheets.
  - The call logic is untouched.
- **Patients chips:**
  - registry and patient detail;
  - records, with the add-record full-screen form;
  - prescriptions, keeping the digital medicine rows and photo capture with `capture="environment"`, and the preview as a sheet;
  - vaccinations and lab reports;
  - follow-ups, with add and reschedule sheets.
- **Schedule editor:** day rows as expandable cards.
- **Also:** the Availability month grid with a leave sheet, Notifications, and Vet profile (sections, sticky Save, `VetSelector` as a sheet).

**Phase 9 — Polish and full regression**
- A consistency pass: spacing, badges, empty states, skeletons, toasts.
- Remove old sidebar code that is now unused inside the vendor layouts.
- A full regression (§11) for all 8 types at 360px, 390px and on desktop.

## 11. Verification (every phase)
**Build and lint.** From `frontend/`:
- `npm run build` must pass. If npm misbehaves on this machine, use `node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run build`.
- `npm run lint` must show no new errors in the files you touched.

**Untouched areas.** Both of these must be empty:
- `git diff --stat -- backend/`
- `git diff -- frontend/src/services`

**Run the app.**
- Backend: `npm run dev` in `backend/` (needs its `.env`).
- Frontend: `npm run dev` in `frontend/` (port 5174).
- Demo partners come from `backend/scripts/seeders/vendors.seed.js`; all use the password `vendor123`. If these accounts aren't in the database, ask me before running any seeder.

  | Type | Email |
  |---|---|
  | Shop | hello@pawsandclaws.com |
  | Grooming | partner@clippaw.com |
  | Meals | partner@wholesomebowl.com |
  | Events | partner@pawfectevents.com |
  | Memorial | partner@rainbowbridge.com |
  | Clinic | partner@happypaws.com |
  | Daycare | partner@happytails.com |
  | Adoption | partner@secondchance.com |

**Viewports.** Check at 390×844 and 360×800 (device emulation), and in a 1440×900 desktop window, which must show the centred phone column and no sidebar.

**Parity checklist (every screen):**
- **Navigation:**
  - Every old menu item is reachable (as a tab, a segment or a More row); tick them off against §6.3.
  - Every old button and field is present.
- **Same requests:** for each module, compare DevTools Network before and after on key actions. Each must send the same request with the same payload:
  - accept or decline a booking;
  - a status change;
  - saving the profile;
  - creating an item;
  - requesting a payout.
- **URLs and back:**
  - Every `?view=` URL and nested path works when opened directly.
  - A refresh keeps you on the same screen.
  - Browser back works.
  - The bottom-nav highlight is correct.
- **Layout:**
  - No horizontal scroll at 360px.
  - Tap targets are at least 44px.
  - Nothing is hidden behind the bottom nav or the keyboard; sticky Save stays reachable while typing.
- **Sheets:** they open and close, scroll inside, lock the background and pad for the safe area.
- **Live alert:** create a booking from the customer app in another browser. The alert overlay appears **once**, the ring plays, and `PendingBookingRequests` updates.
- **Business switcher:** works for a multi-business account. If none exists, say so.
- **Unaffected areas:** `/admin` is still the full-width desktop; `/app/home` (customer app) is unchanged.

## 12. Out of scope
- The backend and the services layer.
- New features, and fixing non-UI bugs.
- The PWA manifest and offline caching for vendor pages.
- Native app packaging (Capacitor etc.).
- MealPortalAdmin and ProviderVendorPortal.
- Dark mode and translations.
