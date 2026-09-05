/**
 * Behavioural compatibility between two pets.
 *
 * The old temperament scorer compared trait strings for exact equality, which
 * made "Friendly" and "Social" a total miss and — far worse — made "Aggressive"
 * paired with "Shy" score exactly the same as any other pair with no words in
 * common. Behaviour is the one factor where a mismatch is not merely a weaker
 * match but a safety note for the first meeting, so it needs a model that
 * knows what the traits *mean*, not just whether the strings are equal.
 *
 * Each canonical trait carries three readings:
 *   `sociability` -1 (withdraws from other pets) … +1 (seeks them out)
 *   `assertive`    0 (yields space) … 1 (pushes into it)
 *   `energy`      -1 (settled) … +1 (constantly on)
 *
 * Compatibility is then the blend of what the two pets share (family-level, so
 * synonyms count) and how close they sit on those axes, minus friction from
 * specific pairings that are known to need managing. Traits that say nothing
 * about how a pet handles another pet — water preferences, say — carry no axis
 * reading and only count toward shared interests.
 */

/* `family` collapses synonyms; `sensitive` marks a pet that is easily
   overwhelmed; `reactive` marks one that may escalate. */
const TRAITS = {
  friendly:     { family: 'social',   sociability: 1,    assertive: 0.4, energy: 0.2 },
  social:       { family: 'social',   sociability: 1,    assertive: 0.4, energy: 0.3 },
  outgoing:     { family: 'social',   sociability: 0.9,  assertive: 0.5, energy: 0.4 },
  affectionate: { family: 'social',   sociability: 0.9,  assertive: 0.3, energy: 0 },
  cuddly:       { family: 'social',   sociability: 0.9,  assertive: 0.2, energy: -0.3 },

  playful:      { family: 'playful',  sociability: 0.8,  assertive: 0.6, energy: 0.9 },
  energetic:    { family: 'playful',  sociability: 0.5,  assertive: 0.6, energy: 1 },
  active:       { family: 'playful',  sociability: 0.5,  assertive: 0.5, energy: 1 },
  hyper:        { family: 'playful',  sociability: 0.4,  assertive: 0.7, energy: 1 },

  calm:         { family: 'calm',     sociability: 0.3,  assertive: 0.2, energy: -0.6 },
  gentle:       { family: 'calm',     sociability: 0.5,  assertive: 0.1, energy: -0.3, sensitive: true },
  relaxed:      { family: 'calm',     sociability: 0.2,  assertive: 0.1, energy: -0.8 },
  lazy:         { family: 'calm',     sociability: 0.1,  assertive: 0.1, energy: -1 },

  shy:          { family: 'reserved', sociability: -0.8, assertive: 0,   energy: -0.3, sensitive: true },
  timid:        { family: 'reserved', sociability: -0.9, assertive: 0,   energy: -0.4, sensitive: true },
  anxious:      { family: 'reserved', sociability: -0.9, assertive: 0.1, energy: 0,    sensitive: true },
  nervous:      { family: 'reserved', sociability: -0.9, assertive: 0.1, energy: 0,    sensitive: true },
  introvert:    { family: 'reserved', sociability: -0.6, assertive: 0.1, energy: -0.3 },
  independent:  { family: 'reserved', sociability: -0.5, assertive: 0.3, energy: 0 },

  curious:      { family: 'curious',  sociability: 0.5,  assertive: 0.5, energy: 0.5 },
  adventurous:  { family: 'curious',  sociability: 0.5,  assertive: 0.6, energy: 0.7 },
  smart:        { family: 'curious',  sociability: 0.4,  assertive: 0.4, energy: 0.3 },

  protective:   { family: 'guardian', sociability: -0.2, assertive: 0.8 },
  loyal:        { family: 'guardian', sociability: 0.2,  assertive: 0.5 },
  alert:        { family: 'guardian', sociability: -0.1, assertive: 0.6 },
  alpha:        { family: 'guardian', sociability: 0,    assertive: 1 },
  dominant:     { family: 'guardian', sociability: 0,    assertive: 1 },
  territorial:  { family: 'guardian', sociability: -0.4, assertive: 0.9 },

  aggressive:   { family: 'reactive', sociability: -0.6, assertive: 1, energy: 0.3, reactive: true },
  reactive:     { family: 'reactive', sociability: -0.6, assertive: 1, energy: 0.3, reactive: true },

  /* Trained pets carry the same axes as their other traits but earn a small
     credit below: handling is what turns a difficult pairing into a managed
     one. */
  trained:      { family: 'trained',  trained: true },
  obedient:     { family: 'trained',  trained: true },

  /* Preferences, not dispositions — shared-interest signal only. */
  'likes water':  { family: 'likes-water' },
  'avoids water': { family: 'avoids-water' },
};

const norm = (v) => String(v || '').trim().toLowerCase();
const clamp01 = (n) => Math.max(0, Math.min(1, n));

/** Traits offered in the app, in the order the profile screen shows them. */
export const BEHAVIOUR_OPTIONS = [
  'Friendly', 'Social', 'Playful', 'Energetic', 'Curious', 'Calm', 'Gentle',
  'Lazy', 'Shy', 'Anxious', 'Introvert', 'Independent', 'Protective', 'Alpha',
  'Aggressive', 'Trained', 'Likes water', 'Avoids water',
];

/**
 * The traits on a pet that mark it as liable to escalate around other animals.
 *
 * One definition, shared. Anything that needs to know "is this pet reactive?"
 * — the compatibility verdict, an event's handler requirement — asks here
 * rather than string-matching 'Aggressive', so a trait added to the taxonomy
 * is picked up everywhere at once and the answer cannot disagree with itself
 * between two screens.
 */
export function reactiveTraits(temperament) {
  return (temperament || [])
    .filter((t) => TRAITS[norm(t)]?.reactive)
    .map((t) => String(t).trim());
}

export function isReactive(temperament) {
  return reactiveTraits(temperament).length > 0;
}

/**
 * Resolve a raw trait list into what the model can reason about.
 *
 * Unrecognised strings are not discarded: a trait we have no axes for is still
 * a thing both owners typed, so it counts as a shared interest under its own
 * name. It just contributes nothing to temperament alignment.
 */
function resolve(list) {
  const families = new Set();
  const axes = [];
  let sensitive = false;
  let reactive = false;
  let trained = false;
  const labels = [];

  for (const raw of list || []) {
    const key = norm(raw);
    if (!key) continue;
    const t = TRAITS[key];
    labels.push(String(raw).trim());
    families.add(t ? t.family : key);
    if (!t) continue;
    if (t.sensitive) sensitive = true;
    if (t.reactive) reactive = true;
    if (t.trained) trained = true;
    if (t.sociability != null) {
      axes.push({ sociability: t.sociability, assertive: t.assertive ?? 0.5, energy: t.energy ?? 0 });
    }
  }

  const mean = (k) => (axes.length ? axes.reduce((s, a) => s + a[k], 0) / axes.length : null);
  return {
    families,
    labels,
    sensitive,
    reactive,
    trained,
    hasAxes: axes.length > 0,
    sociability: mean('sociability'),
    assertive: mean('assertive'),
    energy: mean('energy'),
    // Peak assertiveness matters more than the average: one dominant trait is
    // not averaged away by three gentle ones when two pets first meet.
    peakAssertive: axes.length ? Math.max(...axes.map((a) => a.assertive)) : null,
  };
}

const LEVELS = [
  {
    min: 0.78,
    level: 'High',
    headline: 'Their temperaments line up closely.',
    advice: 'Both pets read the same way socially, so a normal first meeting should go smoothly.',
  },
  {
    min: 0.58,
    level: 'Good',
    headline: 'Mostly compatible temperaments.',
    advice: 'Meet on neutral ground and let them set the pace — this pairing usually settles quickly.',
  },
  {
    min: 0.34,
    level: 'Moderate',
    headline: 'Both pets share some behavioural traits, but there are differences in temperament.',
    advice: 'We recommend a controlled first interaction — somewhere neutral, both on lead, and kept short.',
  },
  {
    min: 0,
    level: 'Caution',
    headline: 'These temperaments can clash.',
    advice:
      'Introduce them slowly on neutral ground with both pets leashed, keep the first session brief, and stop at the first sign either is uncomfortable.',
  },
];

/**
 * Behavioural compatibility for a pair of trait lists.
 *
 * Returns `null` when either pet has no behaviour recorded — an unanswered
 * question is not a bad score, and the caller drops unknown factors from the
 * average rather than counting them against the pet.
 */
export function behaviourCompatibility(mine, theirs) {
  const a = resolve(mine);
  const b = resolve(theirs);
  if (!a.families.size || !b.families.size) return null;

  const sharedFamilies = [...a.families].filter((f) => b.families.has(f));
  // Denominator is the shorter list, matching the rest of the engine: a pet
  // with two traits that both appear on a pet with six overlaps completely on
  // everything we know about it.
  const overlap = sharedFamilies.length / Math.min(a.families.size, b.families.size);

  /*
   * Axis alignment.
   *
   * Sociability dominates: how much each pet wants another pet around decides
   * far more about a first meeting than how energetic they are. Energy is a
   * play-style question — a bouncing puppy and a settled senior can get on,
   * they just want different things from the hour.
   */
  let alignment = null;
  if (a.hasAxes && b.hasAxes) {
    const socGap = Math.abs(a.sociability - b.sociability) / 2;
    const energyGap = Math.abs(a.energy - b.energy) / 2;
    alignment = clamp01(1 - (socGap * 0.68 + energyGap * 0.32));
  }

  /*
   * Friction — specific pairings that need managing, named so the app can tell
   * the owner *why* rather than just handing them a lower number.
   */
  const cautions = [];
  let friction = 0;

  if (a.reactive && b.reactive) {
    friction += 0.55;
    cautions.push('Both pets are marked reactive — meet on neutral ground with both on lead.');
  } else if ((a.reactive && b.sensitive) || (b.reactive && a.sensitive)) {
    friction += 0.5;
    cautions.push(
      'One pet is marked reactive and the other is shy or sensitive — keep the first meeting short, leashed and supervised.'
    );
  } else if (a.reactive || b.reactive) {
    friction += 0.3;
    cautions.push('One pet is marked reactive — a slow, leashed introduction is safest.');
  }

  if ((a.peakAssertive ?? 0) >= 0.85 && (b.peakAssertive ?? 0) >= 0.85 && !(a.reactive && b.reactive)) {
    friction += 0.22;
    cautions.push('Both pets like to take charge — expect some sorting out of who leads.');
  }

  // Only when one pet is the reserved half of the pair. Two equally reserved
  // pets are not this problem, and firing here on a pairing that is already
  // flagged reactive just repeats the same warning in weaker words.
  const reservedForward = (x, y) => x.sociability <= -0.5 && y.sociability > -0.3 && (y.peakAssertive ?? 0) >= 0.7;
  if (a.hasAxes && b.hasAxes && (reservedForward(a, b) || reservedForward(b, a))) {
    friction += 0.15;
    cautions.push('One pet is reserved while the other is forward — let the quieter one approach first.');
  }

  if (a.hasAxes && b.hasAxes && Math.abs(a.energy - b.energy) >= 1.2) {
    cautions.push('Very different energy levels — a short walk together suits them better than a play session.');
  }

  // Handling counts. A trained pet on either side makes a difficult pairing
  // materially easier to manage, so it takes the edge off the friction rather
  // than inflating the raw compatibility.
  if (friction > 0 && (a.trained || b.trained)) friction *= a.trained && b.trained ? 0.6 : 0.8;

  /*
   * With no axis readings on one side — a profile carrying only free-text
   * traits the taxonomy does not know — there is no evidence of a clash, only
   * an absence of information. Sitting that at the neutral midpoint keeps it
   * out of the Caution band: an unrecognised answer is not a dangerous one.
   */
  const base = alignment == null ? 0.5 + 0.5 * overlap : alignment * 0.6 + overlap * 0.4;
  const value = clamp01(base - friction);

  let tier = LEVELS.find((l) => value >= l.min) || LEVELS[LEVELS.length - 1];
  // A reactive pet meeting a sensitive one never reads as an easy introduction,
  // however much else the two happen to have in common.
  if ((a.reactive && b.sensitive) || (b.reactive && a.sensitive) || (a.reactive && b.reactive)) {
    tier = LEVELS[LEVELS.length - 1];
  }

  const sharedLabels = a.labels.filter((label) => {
    const key = norm(label);
    const family = TRAITS[key]?.family || key;
    return b.families.has(family);
  });

  return {
    value,
    level: tier.level,
    headline: tier.headline,
    advice: tier.advice,
    // The traits actually driving the verdict, for the app to name.
    shared: [...new Set(sharedLabels)],
    cautions,
  };
}

export default behaviourCompatibility;
