/**
 * Temperament compatibility between two pets.
 *
 * One question, asked plainly: do these two pets have temperaments that suit
 * each other? An earlier model answered it with three numeric axes, a synonym
 * table, a friction budget and a set of safety cautions layered on top — a lot
 * of machinery behind a chip list an owner picks in five seconds, and more
 * than a match card can honestly explain.
 *
 * What replaces it: the sixteen temperaments the app offers, grouped so that
 * near-synonyms count toward each other, and a score built from the traits two
 * pets share outright plus the ones that merely sit in the same group.
 * Nothing else feeds it — this is the whole of match compatibility now.
 */

/**
 * The temperaments the app offers, in the order the profile screen shows them.
 *
 * 'Aggressive' sits last and apart on purpose. It is not a personality note
 * like the sixteen above it — it is the one answer that decides whether an
 * event needs a handler booked, so it has to stay pickable. See `REACTIVE`.
 */
export const BEHAVIOUR_OPTIONS = [
  'Friendly', 'Calm', 'Gentle', 'Playful', 'Energetic', 'Curious',
  'Confident', 'Shy', 'Easy-going', 'Affectionate', 'Independent',
  'Sensitive', 'Cautious', 'Adaptable', 'Excitable', 'Reserved',
  'Aggressive',
];

/*
 * Groups exist for exactly one reason: two lively pets should not read as
 * strangers because one owner picked "Playful" and the other "Excitable".
 * A group hit is worth less than the same trait on both pets, never more.
 *
 * A trait the taxonomy does not know — free text, or a value left over from an
 * older list — becomes its own group, so it still matches itself and nothing
 * else. That is the correct answer for a word we cannot interpret.
 */
const GROUPS = {
  friendly: 'warm',
  affectionate: 'warm',

  playful: 'lively',
  energetic: 'lively',
  excitable: 'lively',

  curious: 'curious',
  confident: 'confident',

  calm: 'settled',
  gentle: 'settled',

  'easy-going': 'easy',
  adaptable: 'easy',

  shy: 'reserved',
  reserved: 'reserved',
  cautious: 'reserved',

  sensitive: 'sensitive',
  independent: 'independent',
};

const norm = (v) => String(v || '').trim().toLowerCase();
const clamp01 = (n) => Math.max(0, Math.min(1, n));

/**
 * Traits that mark a pet as liable to escalate around other animals.
 *
 * Read only by the event and booking flows, to decide whether a handler is
 * required — 'Aggressive' is in `BEHAVIOUR_OPTIONS` for exactly that reason.
 * It plays no part in match compatibility, which compares temperament and
 * nothing else. The other three are legacy and free-text values that mean the
 * same thing, kept so an older record still flags.
 */
const REACTIVE = new Set(['aggressive', 'reactive', 'dominant', 'territorial']);

export function reactiveTraits(temperament) {
  return (temperament || [])
    .filter((t) => REACTIVE.has(norm(t)))
    .map((t) => String(t).trim());
}

export function isReactive(temperament) {
  return reactiveTraits(temperament).length > 0;
}

/**
 * A trait list reduced to what the comparison needs: labels and their groups.
 *
 * Every trait counts the same, 'Aggressive' included. It carries a second job
 * outside this file — `isReactive()` reads it to decide whether an event needs
 * a handler booked — but that is the events flow's question, not this one.
 * Here it is a temperament like any other, because comparing temperament is
 * all this is for.
 */
function resolve(list) {
  const labels = [];
  const traits = new Set();
  const groups = new Set();
  // First label seen for each group, for naming a group-level match.
  const labelByGroup = new Map();

  for (const raw of list || []) {
    const key = norm(raw);
    if (!key || traits.has(key)) continue;
    const label = String(raw).trim();
    const group = GROUPS[key] || key;
    labels.push(label);
    traits.add(key);
    groups.add(group);
    if (!labelByGroup.has(group)) labelByGroup.set(group, label);
  }

  return { labels, traits, groups, labelByGroup };
}

/**
 * What to call a score.
 *
 * Each band used to carry a headline and a line of advice for the card to
 * print. The card shows the number and the shared traits now, so the words
 * were computed on every pairing and read by nobody.
 */
const LEVELS = [
  { min: 0.75, level: 'High' },
  { min: 0.5, level: 'Good' },
  { min: 0.25, level: 'Moderate' },
  { min: 0, level: 'Low' },
];

/**
 * Temperament compatibility for a pair of trait lists.
 *
 * Returns `null` when either pet has no temperament recorded. An unanswered
 * question is not a bad score, and temperament is the only thing being asked.
 */
export function behaviourCompatibility(mine, theirs) {
  const a = resolve(mine);
  const b = resolve(theirs);
  if (!a.traits.size || !b.traits.size) return null;

  /*
   * Denominator is the shorter list: a pet with two temperaments that both
   * appear on a pet with six overlaps completely on everything we know about
   * it, and should not be penalised for the other owner ticking more boxes.
   */
  const ratio = (mySet, theirSet) =>
    [...mySet].filter((v) => theirSet.has(v)).length / Math.min(mySet.size, theirSet.size);

  const exact = ratio(a.traits, b.traits);
  const grouped = ratio(a.groups, b.groups);

  // `grouped` is always at least `exact`, so this lands between the two: the
  // same trait on both pets counts for full, a near-synonym for most of it.
  const value = clamp01(exact * 0.4 + grouped * 0.6);

  const tier = LEVELS.find((l) => value >= l.min) || LEVELS[LEVELS.length - 1];

  /*
   * The traits to name on the card — one per shared group, never more.
   *
   * Listing every trait that merely lands in a shared group double-counts: a
   * pet marked both Energetic and Excitable, meeting one marked Playful, would
   * show two chips for what is one thing in common. Where the two pets picked
   * the same word, that word is the chip; where they only landed in the same
   * group, the candidate's word is, since the card belongs to that pet and
   * every chip should be checkable against their profile.
   */
  const shared = [];
  for (const group of a.groups) {
    if (!b.groups.has(group)) continue;
    const exact = a.labels.find(
      (label) => (GROUPS[norm(label)] || norm(label)) === group && b.traits.has(norm(label))
    );
    shared.push(exact || b.labelByGroup.get(group));
  }

  return {
    value,
    level: tier.level,
    shared: [...new Set(shared)],
  };
}

export default behaviourCompatibility;
