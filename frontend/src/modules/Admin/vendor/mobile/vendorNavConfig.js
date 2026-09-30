import {
  LayoutDashboard, ClipboardList, Store, Clock, User, CreditCard, ShieldCheck, HelpCircle,
  Settings, Menu, Calendar, ShieldAlert, Video, Users, FileText, Syringe, Activity, Bell,
  ShoppingBag, ShoppingCart, Package, RefreshCcw, Star, Wallet, Ticket, CalendarDays,
  CalendarClock, Image as ImageIcon, MessageSquare, HeartHandshake, Leaf, Gift, Utensils,
  CalendarCheck, ListChecks, Truck, Map,
} from 'lucide-react';
import { getActiveVendorType, getActiveVendorProfile } from '../../../../services/vendor';

/**
 * The partner app's navigation, for every business type, in one place.
 *
 * Each type gets four tabs plus More. A tab that groups several existing
 * screens lists them as `segments`, which the shell renders as segmented (2–3)
 * or chip (4+) tabs at the top of that tab. Every screen that used to be a
 * sidebar item is a tab, a segment, or a row in More — nothing is reachable
 * only by typing a URL.
 *
 * Nothing here changes a URL. Tabs and rows point at the same paths and
 * `?view=` values the sidebars used; only how they are grouped is new.
 *
 * Route descriptors: `{ path, view, prefix }`
 *   path   — exact pathname (or a prefix of it when `prefix` is true)
 *   view   — `?view=` value(s) it must carry; `null` means "no view param",
 *            undefined means "any"
 */

const r = (path, view, extra = {}) => ({ path, view, ...extra });

const SHARED = {
  payouts: '/vendor/payouts',
  support: '/vendor/support',
  settings: '/vendor/settings',
  compliance: '/vendor/compliance',
};

/** Titles for the shared pages when a type's nav does not own them. */
const SHARED_TITLES = {
  [SHARED.payouts]: 'Earnings & Payouts',
  [SHARED.support]: 'Client Support',
  [SHARED.settings]: 'Settings',
  [SHARED.compliance]: 'Service Standing',
  '/vendor/hub': 'All businesses',
};

const moreTab = (to) => ({ key: 'more', label: 'More', icon: Menu, to, routes: [r(to)] });

/* ── Grooming ───────────────────────────────────────────────────────── */

const groomingBase = '/vendor/grooming-provider';
const grooming = {
  base: groomingBase,
  home: groomingBase,
  morePath: '/vendor/more',
  tabs: [
    { key: 'home', label: 'Home', icon: LayoutDashboard, to: groomingBase, routes: [r(groomingBase, [null, 'dashboard'])] },
    { key: 'bookings', label: 'Bookings', icon: ClipboardList, to: `${groomingBase}?view=bookings`, routes: [r(groomingBase, 'bookings')] },
    {
      key: 'services', label: 'Services', icon: Store, to: `${groomingBase}?view=packages`,
      segments: [
        { key: 'packages', label: 'Packages', to: `${groomingBase}?view=packages`, routes: [r(groomingBase, 'packages')] },
        { key: 'addons', label: 'Add-ons', to: `${groomingBase}?view=addons`, routes: [r(groomingBase, 'addons')] },
        { key: 'slots', label: 'Time slots', to: `${groomingBase}?view=slots`, routes: [r(groomingBase, 'slots')] },
      ],
    },
    { key: 'earnings', label: 'Earnings', icon: CreditCard, to: SHARED.payouts, routes: [r(SHARED.payouts)] },
    moreTab('/vendor/more'),
  ],
  more: [
    {
      title: 'Account',
      items: [
        { key: 'profile', label: 'Salon profile', icon: User, to: `${groomingBase}?view=profile`, routes: [r(groomingBase, 'profile')] },
        { key: 'compliance', label: 'Service standing', icon: ShieldCheck, to: SHARED.compliance, routes: [r(SHARED.compliance)] },
        { key: 'support', label: 'Client support', icon: HelpCircle, to: SHARED.support, routes: [r(SHARED.support)] },
        { key: 'settings', label: 'Settings', icon: Settings, to: SHARED.settings, routes: [r(SHARED.settings)] },
      ],
    },
  ],
};

/* ── Daycare ────────────────────────────────────────────────────────── */

const daycareBase = '/vendor/daycare-provider';
const daycare = {
  base: daycareBase,
  home: daycareBase,
  morePath: '/vendor/more',
  tabs: [
    { key: 'home', label: 'Home', icon: LayoutDashboard, to: daycareBase, routes: [r(daycareBase, [null, 'dashboard'])] },
    { key: 'bookings', label: 'Bookings', icon: ClipboardList, to: `${daycareBase}?view=bookings`, routes: [r(daycareBase, 'bookings')] },
    {
      key: 'plans', label: 'Plans', icon: Store, to: `${daycareBase}?view=plans`,
      segments: [
        { key: 'plans', label: 'Plans', to: `${daycareBase}?view=plans`, routes: [r(daycareBase, 'plans')] },
        { key: 'addons', label: 'Add-ons', to: `${daycareBase}?view=addons`, routes: [r(daycareBase, 'addons')] },
        { key: 'capacity', label: 'Capacity & rates', to: `${daycareBase}?view=capacity`, routes: [r(daycareBase, 'capacity')] },
      ],
    },
    { key: 'earnings', label: 'Earnings', icon: CreditCard, to: SHARED.payouts, routes: [r(SHARED.payouts)] },
    moreTab('/vendor/more'),
  ],
  more: [
    {
      title: 'Account',
      items: [
        { key: 'profile', label: 'Centre profile', icon: User, to: `${daycareBase}?view=profile`, routes: [r(daycareBase, 'profile')] },
        { key: 'compliance', label: 'Service standing', icon: ShieldCheck, to: SHARED.compliance, routes: [r(SHARED.compliance)] },
        { key: 'support', label: 'Client support', icon: HelpCircle, to: SHARED.support, routes: [r(SHARED.support)] },
        { key: 'settings', label: 'Settings', icon: Settings, to: SHARED.settings, routes: [r(SHARED.settings)] },
      ],
    },
  ],
};

/* ── Adoption ───────────────────────────────────────────────────────── */

const adoptionBase = '/vendor/adoption-partner';
const adoption = {
  base: adoptionBase,
  home: adoptionBase,
  morePath: '/vendor/more',
  tabs: [
    { key: 'home', label: 'Home', icon: LayoutDashboard, to: adoptionBase, routes: [r(adoptionBase, [null, 'dashboard'])] },
    { key: 'applications', label: 'Applications', icon: ClipboardList, to: `${adoptionBase}?view=applications`, routes: [r(adoptionBase, 'applications')], badgeKey: 'applications' },
    { key: 'listings', label: 'Pets', icon: Store, to: `${adoptionBase}?view=listings`, routes: [r(adoptionBase, 'listings')] },
    { key: 'earnings', label: 'Earnings', icon: CreditCard, to: SHARED.payouts, routes: [r(SHARED.payouts)] },
    moreTab('/vendor/more'),
  ],
  more: [
    {
      title: 'Account',
      items: [
        { key: 'compliance', label: 'Service standing', icon: ShieldCheck, to: SHARED.compliance, routes: [r(SHARED.compliance)] },
        { key: 'support', label: 'Client support', icon: HelpCircle, to: SHARED.support, routes: [r(SHARED.support)] },
        { key: 'settings', label: 'Settings', icon: Settings, to: SHARED.settings, routes: [r(SHARED.settings)] },
      ],
    },
  ],
};

/* ── Clinic ─────────────────────────────────────────────────────────── */

const clinicBase = '/vendor/doctor/consultations';
const cv = (view) => `${clinicBase}?view=${view}`;
const clinic = {
  base: clinicBase,
  home: cv('dashboard'),
  morePath: '/vendor/more',
  tabs: [
    { key: 'home', label: 'Home', icon: LayoutDashboard, to: cv('dashboard'), routes: [r(clinicBase, [null, 'dashboard'])] },
    {
      key: 'appointments', label: 'Appointments', icon: Calendar, to: cv('appointments_list'),
      segments: [
        { key: 'all', label: 'All', icon: Calendar, to: cv('appointments_list'), routes: [r(clinicBase, 'appointments_list')] },
        { key: 'video', label: 'Video', icon: Video, to: cv('video_consultations'), routes: [r(clinicBase, 'video_consultations')] },
        { key: 'emergency', label: 'Emergency', icon: ShieldAlert, to: cv('emergency'), routes: [r(clinicBase, 'emergency')] },
      ],
    },
    {
      key: 'patients', label: 'Patients', icon: Users, to: cv('patients_list'), chips: true,
      segments: [
        { key: 'patients', label: 'Patients', icon: Users, to: cv('patients_list'), routes: [r(clinicBase, 'patients_list')] },
        { key: 'records', label: 'Records', icon: ClipboardList, to: cv('medical_records'), routes: [r(clinicBase, 'medical_records')] },
        { key: 'prescriptions', label: 'Prescriptions', icon: FileText, to: cv('prescriptions'), routes: [r(clinicBase, 'prescriptions')] },
        { key: 'vaccinations', label: 'Vaccinations', icon: Syringe, to: cv('vaccinations'), routes: [r(clinicBase, 'vaccinations')] },
        { key: 'labs', label: 'Lab reports', icon: FileText, to: cv('lab_reports'), routes: [r(clinicBase, 'lab_reports')] },
        { key: 'followups', label: 'Follow-ups', icon: Activity, to: cv('follow_ups'), routes: [r(clinicBase, 'follow_ups')] },
      ],
    },
    { key: 'earnings', label: 'Earnings', icon: CreditCard, to: SHARED.payouts, routes: [r(SHARED.payouts)] },
    moreTab('/vendor/more'),
  ],
  // Full-screen pages that belong to a tab for highlighting but hide the nav.
  subScreens: [
    { tab: 'appointments', title: 'Appointment', routes: [r(clinicBase, 'appointment_detail')], back: cv('appointments_list') },
    { tab: 'appointments', title: 'Video consultation', routes: [r(clinicBase, 'video_call')], back: cv('video_consultations'), immersive: true },
    { tab: 'patients', title: 'Patient', routes: [r(clinicBase, 'patient_detail')], back: cv('patients_list') },
  ],
  more: [
    {
      title: 'Operations',
      items: [
        { key: 'schedule', label: 'Clinic schedule', icon: Clock, to: cv('schedule'), routes: [r(clinicBase, 'schedule')] },
        { key: 'availability', label: 'Availability calendar', icon: Calendar, to: cv('availability'), routes: [r(clinicBase, 'availability')] },
        { key: 'compliance', label: 'Service standing', icon: ShieldCheck, to: SHARED.compliance, routes: [r(SHARED.compliance)] },
      ],
    },
    {
      title: 'Communication',
      items: [
        { key: 'notifications', label: 'Notifications', icon: Bell, to: cv('notifications'), routes: [r(clinicBase, 'notifications')] },
        { key: 'support', label: 'Client support', icon: HelpCircle, to: SHARED.support, routes: [r(SHARED.support)] },
      ],
    },
    {
      title: 'Account',
      items: [
        // Profile & Fees and Certifications were two sidebar items opening the
        // same screen; one row here.
        { key: 'vet_profile', label: 'Profile, fees & certifications', icon: User, to: cv('vet_profile'), routes: [r(clinicBase, 'vet_profile')] },
        { key: 'settings', label: 'Settings', icon: Settings, to: SHARED.settings, routes: [r(SHARED.settings)] },
      ],
    },
  ],
};

/* ── Shop ───────────────────────────────────────────────────────────── */

const shopBase = '/vendor/shop-provider';
const shop = {
  base: shopBase,
  home: shopBase,
  morePath: `${shopBase}/more`,
  tabs: [
    { key: 'home', label: 'Home', icon: LayoutDashboard, to: shopBase, routes: [r(shopBase)] },
    { key: 'orders', label: 'Orders', icon: ShoppingCart, to: `${shopBase}/orders`, routes: [r(`${shopBase}/orders`)], badgeKey: 'orders' },
    {
      key: 'products', label: 'Products', icon: ShoppingBag, to: `${shopBase}/products`,
      segments: [
        { key: 'products', label: 'Products', icon: ShoppingBag, to: `${shopBase}/products`, routes: [r(`${shopBase}/products`)] },
        { key: 'inventory', label: 'Inventory', icon: Package, to: `${shopBase}/inventory`, routes: [r(`${shopBase}/inventory`)] },
      ],
    },
    { key: 'earnings', label: 'Earnings', icon: Wallet, to: `${shopBase}/finance`, routes: [r(`${shopBase}/finance`)] },
    moreTab(`${shopBase}/more`),
  ],
  more: [
    {
      title: 'Operations',
      items: [
        { key: 'returns', label: 'Returns & refunds', icon: RefreshCcw, to: `${shopBase}/returns`, routes: [r(`${shopBase}/returns`)] },
        { key: 'feedback', label: 'Customer feedback', icon: Star, to: `${shopBase}/feedback`, routes: [r(`${shopBase}/feedback`)] },
      ],
    },
    {
      title: 'Management',
      items: [
        { key: 'compliance', label: 'Service standing', icon: ShieldCheck, to: `${shopBase}/compliance`, routes: [r(`${shopBase}/compliance`)] },
        { key: 'settings', label: 'Business settings', icon: Settings, to: `${shopBase}/settings`, routes: [r(`${shopBase}/settings`)] },
        { key: 'support', label: 'Client support', icon: HelpCircle, to: SHARED.support, routes: [r(SHARED.support)] },
      ],
    },
  ],
};

/* ── Events ─────────────────────────────────────────────────────────── */

const eventsBase = '/vendor/events-organizer';
const events = {
  base: eventsBase,
  home: eventsBase,
  morePath: `${eventsBase}/more`,
  tabs: [
    { key: 'home', label: 'Home', icon: LayoutDashboard, to: eventsBase, routes: [r(eventsBase)] },
    { key: 'bookings', label: 'Bookings', icon: Ticket, to: `${eventsBase}/bookings`, routes: [r(`${eventsBase}/bookings`)] },
    {
      key: 'events', label: 'Events', icon: CalendarDays, to: `${eventsBase}/events`,
      segments: [
        { key: 'events', label: 'Events', icon: CalendarDays, to: `${eventsBase}/events`, routes: [r(`${eventsBase}/events`)] },
        { key: 'calendar', label: 'Calendar', icon: CalendarClock, to: `${eventsBase}/calendar`, routes: [r(`${eventsBase}/calendar`)] },
      ],
    },
    { key: 'earnings', label: 'Earnings', icon: Wallet, to: `${eventsBase}/finance`, routes: [r(`${eventsBase}/finance`)] },
    moreTab(`${eventsBase}/more`),
  ],
  subScreens: [
    { tab: 'events', title: 'Create event', routes: [r(`${eventsBase}/events/create`)], back: `${eventsBase}/events` },
    { tab: 'events', title: 'Edit event', routes: [r(`${eventsBase}/events/`, undefined, { prefix: true, suffix: '/edit' })], back: `${eventsBase}/events` },
  ],
  more: [
    {
      title: 'Event management',
      items: [
        { key: 'packages', label: 'Packages & add-ons', icon: Package, to: `${eventsBase}/packages`, routes: [r(`${eventsBase}/packages`)] },
        { key: 'gallery', label: 'Event gallery', icon: ImageIcon, to: `${eventsBase}/gallery`, routes: [r(`${eventsBase}/gallery`)] },
        { key: 'requests', label: 'Customer requests', icon: MessageSquare, to: `${eventsBase}/requests`, routes: [r(`${eventsBase}/requests`)] },
      ],
    },
    {
      title: 'Management',
      items: [
        { key: 'feedback', label: 'Customer feedback', icon: Star, to: `${eventsBase}/feedback`, routes: [r(`${eventsBase}/feedback`)] },
        { key: 'compliance', label: 'Service standing', icon: ShieldCheck, to: `${eventsBase}/compliance`, routes: [r(`${eventsBase}/compliance`)] },
        { key: 'settings', label: 'Business settings', icon: Settings, to: `${eventsBase}/settings`, routes: [r(`${eventsBase}/settings`)] },
        { key: 'support', label: 'Client support', icon: HelpCircle, to: SHARED.support, routes: [r(SHARED.support)] },
      ],
    },
  ],
};

/* ── Memorial ───────────────────────────────────────────────────────── */

const memorialBase = '/vendor/memorial-provider';
const memorial = {
  base: memorialBase,
  home: memorialBase,
  morePath: `${memorialBase}/more`,
  tabs: [
    { key: 'home', label: 'Home', icon: LayoutDashboard, to: memorialBase, routes: [r(memorialBase)] },
    { key: 'requests', label: 'Requests', icon: HeartHandshake, to: `${memorialBase}/requests`, routes: [r(`${memorialBase}/requests`)] },
    {
      key: 'services', label: 'Services', icon: Leaf, to: `${memorialBase}/services`,
      segments: [
        { key: 'services', label: 'Services', icon: Leaf, to: `${memorialBase}/services`, routes: [r(`${memorialBase}/services`)] },
        { key: 'addons', label: 'Add-ons', icon: Gift, to: `${memorialBase}/addons`, routes: [r(`${memorialBase}/addons`)] },
      ],
    },
    { key: 'earnings', label: 'Earnings', icon: Wallet, to: `${memorialBase}/finance`, routes: [r(`${memorialBase}/finance`)] },
    moreTab(`${memorialBase}/more`),
  ],
  more: [
    {
      title: 'Operations',
      items: [
        { key: 'calendar', label: 'Schedule', icon: CalendarDays, to: `${memorialBase}/calendar`, routes: [r(`${memorialBase}/calendar`)] },
        { key: 'team', label: 'Team', icon: Users, to: `${memorialBase}/team`, routes: [r(`${memorialBase}/team`)] },
        { key: 'proofs', label: 'Service proofs', icon: FileText, to: `${memorialBase}/proofs`, routes: [r(`${memorialBase}/proofs`)] },
        { key: 'messages', label: 'Customer messages', icon: MessageSquare, to: `${memorialBase}/support`, routes: [r(`${memorialBase}/support`)] },
      ],
    },
    {
      title: 'Management',
      items: [
        { key: 'compliance', label: 'Service standing', icon: ShieldCheck, to: `${memorialBase}/compliance`, routes: [r(`${memorialBase}/compliance`)] },
        { key: 'settings', label: 'Business settings', icon: Settings, to: `${memorialBase}/settings`, routes: [r(`${memorialBase}/settings`)] },
        { key: 'support', label: 'Client support', icon: HelpCircle, to: SHARED.support, routes: [r(SHARED.support)] },
      ],
    },
  ],
};

/* ── Meals ──────────────────────────────────────────────────────────── */

const mealBase = '/vendor/meal-provider';
const meal_subscription = {
  base: mealBase,
  home: `${mealBase}/dashboard`,
  morePath: `${mealBase}/more`,
  tabs: [
    { key: 'home', label: 'Home', icon: LayoutDashboard, to: `${mealBase}/dashboard`, routes: [r(`${mealBase}/dashboard`)] },
    {
      key: 'subscriptions', label: 'Subscriptions', icon: FileText, to: `${mealBase}/subscriptions`,
      segments: [
        { key: 'subscriptions', label: 'Subscriptions', icon: FileText, to: `${mealBase}/subscriptions`, routes: [r(`${mealBase}/subscriptions`)] },
        { key: 'trials', label: 'Trials', icon: CalendarCheck, to: `${mealBase}/trials`, routes: [r(`${mealBase}/trials`)] },
      ],
    },
    {
      key: 'deliveries', label: 'Deliveries', icon: Truck, to: `${mealBase}/kitchen`,
      segments: [
        { key: 'kitchen', label: 'Kitchen', icon: ListChecks, to: `${mealBase}/kitchen`, routes: [r(`${mealBase}/kitchen`)] },
        { key: 'board', label: 'Delivery board', icon: Truck, to: `${mealBase}/delivery-board`, routes: [r(`${mealBase}/delivery-board`)] },
        { key: 'tracking', label: 'Live tracking', icon: Map, to: `${mealBase}/live-tracking`, routes: [r(`${mealBase}/live-tracking`)] },
      ],
    },
    { key: 'earnings', label: 'Earnings', icon: Wallet, to: `${mealBase}/finance`, routes: [r(`${mealBase}/finance`)] },
    moreTab(`${mealBase}/more`),
  ],
  more: [
    {
      title: 'Core operations',
      items: [
        { key: 'plans', label: 'Meal plans', icon: Utensils, to: `${mealBase}/plans`, routes: [r(`${mealBase}/plans`)] },
        { key: 'feedback', label: 'Customer feedback', icon: MessageSquare, to: `${mealBase}/feedback`, routes: [r(`${mealBase}/feedback`)] },
      ],
    },
    {
      title: 'Management',
      items: [
        { key: 'compliance', label: 'Service standing', icon: ShieldCheck, to: `${mealBase}/compliance`, routes: [r(`${mealBase}/compliance`)] },
        { key: 'settings', label: 'Business settings', icon: Settings, to: `${mealBase}/settings`, routes: [r(`${mealBase}/settings`)] },
        { key: 'support', label: 'Client support', icon: HelpCircle, to: SHARED.support, routes: [r(SHARED.support)] },
      ],
    },
  ],
};

const NAV = { grooming, daycare, adoption, clinic, shop, events, memorial, meal_subscription };

/** Module paths → the type whose panel they are. Shared pages have none. */
const PATH_TYPES = [
  [groomingBase, 'grooming'],
  [daycareBase, 'daycare'],
  [adoptionBase, 'adoption'],
  ['/vendor/doctor', 'clinic'],
  [shopBase, 'shop'],
  [eventsBase, 'events'],
  [memorialBase, 'memorial'],
  [mealBase, 'meal_subscription'],
];

/**
 * The business type whose chrome to show.
 *
 * A module path answers it outright. The shared pages (payouts, support,
 * settings, compliance, More) mount no module context, so they fall back to
 * the stored active type — the one `ProtectedVendorRoute` last set.
 */
export function resolveVendorType(pathname) {
  const hit = PATH_TYPES.find(([base]) => pathname === base || pathname.startsWith(`${base}/`));
  if (hit) return hit[1];
  return getActiveVendorType() || getActiveVendorProfile()?.vendorType || 'grooming';
}

export function getNavForType(type) {
  return NAV[type] || NAV.grooming;
}

const viewOf = (search) => new URLSearchParams(search || '').get('view');

function routeMatches(route, pathname, view) {
  let pathOk;
  if (route.prefix) {
    pathOk = pathname.startsWith(route.path) && (!route.suffix || pathname.endsWith(route.suffix));
  } else {
    pathOk = pathname === route.path || pathname === `${route.path}/`;
  }
  if (!pathOk) return false;
  if (route.view === undefined) return true;
  const allowed = Array.isArray(route.view) ? route.view : [route.view];
  return allowed.includes(view);
}

const anyMatch = (routes, pathname, view) => (routes || []).some((rt) => routeMatches(rt, pathname, view));

/**
 * Where the current location sits in a type's nav.
 *
 * Returns `{ tabKey, segmentKey, isRoot, title, back, immersive }`:
 *   isRoot     — a tab-root screen (bottom nav shown)
 *   title/back — for sub-screens: the app bar title and where Back falls back to
 */
export function matchActiveTab(type, location) {
  const nav = getNavForType(type);
  const { pathname } = location;
  const view = viewOf(location.search);

  for (const sub of nav.subScreens || []) {
    if (anyMatch(sub.routes, pathname, view)) {
      return { tabKey: sub.tab, segmentKey: null, isRoot: false, title: sub.title, back: sub.back, immersive: !!sub.immersive };
    }
  }

  for (const tab of nav.tabs) {
    if (tab.segments) {
      const seg = tab.segments.find((s) => anyMatch(s.routes, pathname, view));
      if (seg) return { tabKey: tab.key, segmentKey: seg.key, isRoot: true, title: seg.label, back: null };
    } else if (anyMatch(tab.routes, pathname, view)) {
      return { tabKey: tab.key, segmentKey: null, isRoot: true, title: tab.label, back: null };
    }
  }

  for (const section of nav.more) {
    const item = section.items.find((i) => anyMatch(i.routes, pathname, view));
    if (item) return { tabKey: 'more', segmentKey: null, isRoot: false, title: item.label, back: nav.morePath };
  }

  if (SHARED_TITLES[pathname]) {
    return { tabKey: null, segmentKey: null, isRoot: false, title: SHARED_TITLES[pathname], back: nav.home };
  }

  // A module path the nav doesn't list (an unknown `?view=`, say) still
  // belongs to its panel; show it as a sub-screen of Home rather than guess.
  return { tabKey: 'home', segmentKey: null, isRoot: false, title: '', back: nav.home };
}

export default NAV;
