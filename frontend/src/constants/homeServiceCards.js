/**
 * The Home screen's service tiles: layout in code, content in the database.
 *
 * The admin panel is the single source of truth for what a tile says and
 * shows. The user app renders the saved Banner rows and nothing else -- no
 * hardcoded artwork stands in behind them -- so an image cleared in the admin
 * screen is genuinely cleared on Home, and a tile with no row does not appear.
 *
 * Each Banner document maps onto a tile like this:
 *
 *   key   -> Banner.key (stable; renaming one orphans its saved artwork)
 *   name  -> Banner.title
 *   tag   -> Banner.badge
 *   desc  -> Banner.subtitle
 *   path  -> Banner.link
 *   image -> Banner.image
 *
 * `bg` and `imgClass` are deliberately outside that map. They are layout, not
 * content, so they stay in code rather than becoming stored state an operator
 * can break the grid with.
 */

export const HOME_SERVICES_SLOT = 'Home Services';
export const HOME_FEATURE_SLOT = 'Home Feature';
export const MEET_MATCH_KEY = 'home_meet_match';

/** Grid colour used if a row turns up under a key this build has no layout for. */
const FALLBACK_BG = 'bg-[#599D9A]';

/**
 * The artwork the app shipped with.
 *
 * Not a runtime fallback -- the user app never reads these. They exist so the
 * seeder has something to write on a fresh database, so the admin screen knows
 * which tiles exist and in what order, and so its Reset button can put an
 * original image back. Changing one here changes nothing on a database that
 * already holds a row for that key.
 */
export const SHIPPED_MEET_MATCH = {
  key: MEET_MATCH_KEY,
  name: 'Meet & Match',
  desc: 'Find playdates, friends & mates near you',
  image: '/assets/banners/pet_matches_love.png',
  path: '/app/matches',
};

export const SHIPPED_SERVICE_CARDS = [
  { key: 'home_service_grooming', name: 'Grooming', tag: 'SPA', desc: 'Spa & salon', image: '/assets/quick_links/grooming.jpeg', bg: 'bg-[#599D9A]', path: '/app/services/grooming', imgClass: 'object-top' },
  { key: 'home_service_daycare', name: 'Daycare', tag: 'STAY', desc: 'Safe & fun boarding', image: '/assets/quick_links/daycare_stay.png', bg: 'bg-[#F87B68]', path: '/app/services/daycare' },
  { key: 'home_service_shop', name: 'Shop', tag: 'SHOP', desc: 'Toys & Treats', image: '/assets/quick_links/shop_box.png', bg: 'bg-[#F87B68]', path: '/app/shop' },
  { key: 'home_service_vets', name: 'Find Vets', tag: 'VETS', desc: 'Book 60 sec', image: '/assets/quick_links/vet.jpeg', bg: 'bg-[#599D9A]', path: '/app/services/doctors', imgClass: 'object-top' },
  { key: 'home_service_events', name: 'Events', tag: 'EVENTS', desc: 'Parties & shows', image: '/assets/quick_links/events_party.png', bg: 'bg-[#599D9A]', path: '/app/services/events' },
  { key: 'home_service_meals', name: 'Meals', tag: 'DIET', desc: 'Fresh & healthy diet', image: '/assets/quick_links/meals_fresh.png', bg: 'bg-[#F87B68]', path: '/app/meals' },
  { key: 'home_service_community', name: 'Community', tag: 'SOCIAL', desc: 'Connect & share', image: '/assets/quick_links/community.jpeg', bg: 'bg-[#F87B68]', path: '/app/community', imgClass: 'object-top' },
  { key: 'home_service_adopt', name: 'Adopt', tag: 'ADOPT', desc: 'Find a companion', image: '/assets/quick_links/adopt_pet.png', bg: 'bg-[#599D9A]', path: '/app/adopt' },
];

/** Layout for one key: the parts of a tile the database does not own. */
const layoutFor = (key) => {
  const shipped = SHIPPED_SERVICE_CARDS.find((c) => c.key === key);
  return { bg: shipped?.bg || FALLBACK_BG, imgClass: shipped?.imgClass };
};

/**
 * The tiles Home should render.
 *
 * The fallback to shipped artwork is deliberately all-or-nothing. When the API
 * returns no service rows at all -- it failed, or the collection was never
 * seeded -- the shipped set renders so Home does not open on an empty grid.
 * But the moment even one row comes back, saved rows are the whole truth and
 * each value is used verbatim, empty string included.
 *
 * That distinction is the point: a per-field fallback would quietly put the
 * shipped picture back whenever an operator cleared one, which makes an image
 * impossible to actually remove. Order follows each row's `sort`, which is
 * what the admin screen and the seeder write.
 */
export function serviceTilesFromBanners(rows) {
  const saved = (rows || []).filter((b) => b.slot === HOME_SERVICES_SLOT);
  if (!saved.length) return SHIPPED_SERVICE_CARDS;
  return saved
    .slice()
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
    .map((b) => ({
      key: b.key,
      name: b.title || '',
      tag: b.badge || '',
      desc: b.subtitle || '',
      image: b.image || '',
      path: b.link || '',
      ...layoutFor(b.key),
    }));
}

/** The Meet & Match card, falling back to the shipped one when it has no row. */
export function meetMatchFromBanners(rows) {
  const row = (rows || []).find((b) => b.key === MEET_MATCH_KEY);
  if (!row) return SHIPPED_MEET_MATCH;
  return {
    key: row.key,
    name: row.title || '',
    desc: row.subtitle || '',
    image: row.image || '',
    path: row.link || '',
  };
}

/**
 * Every tile the admin screen can edit, whether or not a row exists yet.
 *
 * Unlike the user app's view, a missing row still appears here -- blank, ready
 * to be filled in and saved. `path` is the exception: it is routing rather than
 * content, the screen does not expose it, so it falls back to the shipped value
 * instead of saving an empty link.
 */
export function editableServiceTiles(rows) {
  const byKey = new Map((rows || []).map((b) => [b.key, b]));
  return SHIPPED_SERVICE_CARDS.map((shipped) => {
    const row = byKey.get(shipped.key);
    return {
      key: shipped.key,
      name: row?.title || '',
      tag: row?.badge || '',
      desc: row?.subtitle || '',
      image: row?.image || '',
      path: row?.link || shipped.path,
      bg: shipped.bg,
      imgClass: shipped.imgClass,
    };
  });
}

/** The same, for the single Meet & Match card. */
export function editableMeetMatch(rows) {
  const row = (rows || []).find((b) => b.key === MEET_MATCH_KEY);
  return {
    key: MEET_MATCH_KEY,
    name: row?.title || '',
    desc: row?.subtitle || '',
    image: row?.image || '',
    path: row?.link || SHIPPED_MEET_MATCH.path,
  };
}
