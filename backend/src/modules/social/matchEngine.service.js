import { MatchProfile, Swipe, Match } from './social.models.js';
import { ensureConversation, postSystemMessage, setCounterpartFor } from './chat.service.js';
import { emitToUser } from '../../sockets/index.js';
import { SOCKET_EVENTS } from '../../sockets/events.js';
import { notify } from '../../services/notify.js';
import { Pet } from '../pet/pet.model.js';
import { User } from '../user/user.model.js';
import { getOrSet } from '../../services/cache.service.js';
import { behaviourCompatibility } from './behaviour.service.js';

/**
 * Match engine weights, tunable at runtime via PATCH /matches/engine/config.
 *
 * Every `weight*` below is a real input to `scoreMatch()` — they are summed to
 * form the denominator, so the numbers are relative to each other rather than
 * required to total 100. Raising `weightBreed` to 40 genuinely makes breed
 * matter more; there is no separate hardcoded table behind them.
 */
export let MATCH_ENGINE_CONFIG = {
  // How much two pets have in common.
  weightTemperament: 20, // shared interests / traits
  weightProximity: 16, // close enough to actually meet
  weightActivity: 13, // energy levels that suit each other
  weightMood: 11, // current vibe
  weightAge: 11, // life stage
  weightBreed: 10,
  weightPurpose: 8, // both here for the same thing
  weightSize: 6, // safe play pairing
  weightHealth: 5, // vaccination alignment

  // Presentation + behaviour.
  maxPoints: 5, // score is shown out of this many points
  defaultMaxDistanceKm: 50, // distance at which proximity scores zero
  crossSpeciesFactor: 0.45, // a dog and a cat can meet, but rarely a top match
  // Confidence shrinkage. Applied in proportion to how much of the profile is
  // MISSING, so two fully-filled pets that align on everything still reach a
  // clean 5/5, while a near-empty profile cannot score top marks off one lucky
  // factor. Set `priorStrength` to 0 to score purely on what is known.
  priorStrength: 0.6, // how hard unknown factors pull toward the prior
  priorRatio: 0.6, // the neutral compatibility an unknown factor stands in for
  enableAutoReciprocity: false,
};

/**
 * The opening card dropped into every new match conversation.
 *
 * Stored as the message text so it also reads correctly wherever a plain
 * string is all there is — the chat list's last-message line, a push preview,
 * a client too old to know the `match_intro` type.
 */
export const MATCH_INTRO_TEXT =
  "Hey, it's a Match! Looks like your pets are interested in meeting each other. " +
  'Why not take the next step and meet in person?';

/**
 * Update controllable match engine configuration params.
 */
export function updateEngineConfig(newConfig = {}) {
  MATCH_ENGINE_CONFIG = {
    ...MATCH_ENGINE_CONFIG,
    ...newConfig,
  };
  return MATCH_ENGINE_CONFIG;
}

/* ── Per-factor scorers ───────────────────────────────────────────────────
 *
 * Each returns 0..1, or `null` meaning "not knowable for this pair".
 *
 * `null` matters: a factor neither pet has filled in is dropped from BOTH
 * sides of the average rather than scored zero. Otherwise every pet with a
 * sparse profile would look like a bad match for everyone, which punishes the
 * owner for not filling a form rather than describing the pets.
 */

const norm = (v) => String(v || '').trim().toLowerCase();

/**
 * Number, but `null`/`undefined`/`''` stay unknown.
 *
 * Plain `Number()` turns all three into 0, which read as "newborn" for age and
 * "0 km away" — a perfect proximity score — for a candidate whose distance was
 * never computed. `MatchProfile.distance` defaults to null, so scoring a stored
 * profile handed out full marks for being nowhere.
 */
function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Ordinal closeness — same band = 1, one band apart = 0.5, two = 0. */
function scoreOrdinal(mine, theirs, order) {
  const x = order[norm(mine)];
  const y = order[norm(theirs)];
  if (x == null || y == null) return null;
  const gap = Math.abs(x - y);
  return gap === 0 ? 1 : gap === 1 ? 0.5 : 0;
}

const ACTIVITY_ORDER = { low: 0, medium: 1, high: 2 };
const SIZE_ORDER = { small: 0, medium: 1, large: 2 };

/**
 * Free-text moods grouped into families, so "playful" and "energetic" read as
 * the same vibe instead of a miss.
 */
const MOOD_FAMILY = {
  playful: 'energetic', energetic: 'energetic', hyper: 'energetic',
  active: 'energetic', zoomies: 'energetic', excited: 'energetic',
  calm: 'relaxed', chill: 'relaxed', lazy: 'relaxed',
  sleepy: 'relaxed', relaxed: 'relaxed', mellow: 'relaxed',
  friendly: 'social', social: 'social', affectionate: 'social',
  cuddly: 'social', loving: 'social', happy: 'social',
  curious: 'curious', adventurous: 'curious', explorer: 'curious', smart: 'curious',
  protective: 'guardian', loyal: 'guardian', alert: 'guardian', watchful: 'guardian',
  shy: 'reserved', anxious: 'reserved', timid: 'reserved', reserved: 'reserved',
};

function scoreMood(mine, theirs) {
  const x = norm(mine);
  const y = norm(theirs);
  if (!x || !y) return null;
  if (x === y) return 1;
  const fx = MOOD_FAMILY[x];
  const fy = MOOD_FAMILY[y];
  if (fx && fy && fx === fy) return 0.7;
  // Different vibes still get on; they just are not the same vibe.
  return 0.15;
}

/** Life stage. Within a year is a full match, six years apart is none. */
function scoreAge(mine, theirs) {
  const a = num(mine);
  const b = num(theirs);
  if (a === null || b === null) return null;
  const gap = Math.abs(a - b);
  if (gap <= 1) return 1;
  if (gap >= 6) return 0;
  return 1 - (gap - 1) / 5;
}

const isMixed = (breed) => /mixed|mix|unknown|indie|desi/.test(norm(breed));

function scoreBreed(mine, theirs, sameSpecies) {
  const a = norm(mine);
  const b = norm(theirs);
  if (!a || !b) return null;
  if (a === b) return 1;
  // "Mixed Breed" is a wildcard rather than a mismatch — it says little either
  // way, so it should not read as a strong negative.
  if (isMixed(a) || isMixed(b)) return 0.5;
  return sameSpecies ? 0.35 : 0;
}

/** Close enough to realistically meet up. */
function scoreProximity(km, maxKm) {
  const d = num(km);
  if (d === null || d < 0) return null;
  const ceiling = Math.max(3, num(maxKm) || 50);
  if (d <= 2) return 1;
  if (d >= ceiling) return 0;
  return 1 - (d - 2) / (ceiling - 2);
}

function scoreExact(mine, theirs, partial = 0.2) {
  const a = norm(mine);
  const b = norm(theirs);
  if (!a || !b) return null;
  return a === b ? 1 : partial;
}

/** Vaccination alignment — the safety precondition for a real-world meetup. */
function scoreHealth(mine, theirs) {
  const vaxed = (v) => {
    if (typeof v === 'boolean') return v;
    const t = norm(v);
    if (!t) return null;
    return t === 'vaccinated' || t === 'yes' || t === 'true';
  };
  const a = vaxed(mine);
  const b = vaxed(theirs);
  if (a == null || b == null) return null;
  if (a && b) return 1;
  return a || b ? 0.4 : 0;
}

/**
 * Full compatibility breakdown between the viewer's pet and a candidate.
 *
 * Returns the headline points (out of `maxPoints`) plus the per-factor detail
 * the card renders, so a user can see *why* two pets scored what they scored
 * instead of being handed an unexplained number.
 */
export function scoreMatch(myPet, candidate) {
  const cfg = MATCH_ENGINE_CONFIG;
  const maxPoints = Number(cfg.maxPoints) || 5;

  if (!candidate) {
    return {
      points: null, score: null, maxPoints, factors: [], knownFactors: 0,
      confidence: 'unknown', behaviour: null,
    };
  }

  const sameSpecies = !myPet?.type || !candidate.type || norm(myPet.type) === norm(candidate.type);

  const candidateAge = num(candidate.age);
  const myAge = num(myPet?.age ?? myPet?.ageYears);
  const ageGap = myAge !== null && candidateAge !== null ? Math.abs(myAge - candidateAge) : null;
  const km = num(candidate.distance);

  /*
   * Behaviour is scored once and returned alongside the number, not just
   * folded into it. The verdict ("Moderate", plus what to do about it) is the
   * part an owner can act on before the two pets actually meet.
   */
  const behaviour = behaviourCompatibility(myPet?.temperament, candidate.temperament);

  /*
   * `display` overrides the percentage in the breakdown for factors where a
   * real value says more than a ratio. "Nearby 100%" is ambiguous — it reads
   * equally as "very close" or "maximally far" — whereas "1.2 km" cannot be
   * misread. The percentage still drives the bar and the score.
   */
  const definitions = [
    { key: 'temperament', label: 'Behaviour', weight: cfg.weightTemperament,
      value: behaviour?.value ?? null },
    { key: 'proximity', label: 'Nearby', weight: cfg.weightProximity,
      value: scoreProximity(candidate.distance, cfg.defaultMaxDistanceKm),
      display: km === null ? null : km < 1 ? `${Math.round(km * 1000)} m` : `${km} km` },
    { key: 'activity', label: 'Energy level', weight: cfg.weightActivity,
      value: scoreOrdinal(myPet?.activityLevel, candidate.activityLevel, ACTIVITY_ORDER) },
    { key: 'mood', label: 'Mood', weight: cfg.weightMood,
      value: scoreMood(myPet?.mood, candidate.mood) },
    { key: 'age', label: 'Age', weight: cfg.weightAge,
      value: scoreAge(myAge, candidateAge),
      display: ageGap === null ? null
        : ageGap < 0.5 ? 'Same age'
        : `${Math.round(ageGap * 10) / 10} yr${ageGap >= 2 ? 's' : ''} apart` },
    { key: 'breed', label: 'Breed', weight: cfg.weightBreed,
      value: scoreBreed(myPet?.breed, candidate.breed, sameSpecies) },
    { key: 'purpose', label: 'Looking for', weight: cfg.weightPurpose,
      value: scoreExact(myPet?.purpose, candidate.purpose) },
    { key: 'size', label: 'Size', weight: cfg.weightSize,
      value: scoreOrdinal(myPet?.size, candidate.size, SIZE_ORDER) },
    { key: 'health', label: 'Vaccination', weight: cfg.weightHealth,
      value: scoreHealth(myPet?.vaccinated ?? myPet?.health?.vaccinated, candidate.vaccinationStatus) },
  ];

  let earned = 0;
  let possible = 0;
  const factors = [];

  for (const d of definitions) {
    const weight = Number(d.weight) || 0;
    if (d.value == null || weight <= 0) {
      // Reported so the UI can show "add your pet's mood to sharpen this".
      factors.push({ key: d.key, label: d.label, known: false, value: null, weight });
      continue;
    }
    earned += d.value * weight;
    possible += weight;
    factors.push({
      key: d.key,
      label: d.label,
      known: true,
      value: Math.round(d.value * 100) / 100,
      display: d.display || null,
      weight,
      points: Math.round(d.value * weight * 10) / 10,
    });
  }

  const knownFactors = factors.filter((f) => f.known).length;

  if (!possible) {
    // Nothing comparable on either side — say so rather than invent a number.
    return { points: null, score: null, maxPoints, factors, knownFactors: 0, confidence: 'unknown', behaviour };
  }

  /*
   * Shrink toward a neutral prior in proportion to what is MISSING.
   *
   * Without this, a profile listing only a breed and a location could score a
   * flawless 5/5 off two factors and outrank a pet that genuinely matches on
   * eight — an empty profile would be the best match on the deck.
   *
   * The pull is sized by the weight of the unknown factors, not a flat
   * constant, so a pair that agrees on everything we can actually check still
   * scores a clean 5/5. Only unanswered questions drag a score toward average.
   */
  const totalWeight = definitions.reduce((sum, d) => sum + (Number(d.weight) || 0), 0);
  const missingWeight = Math.max(0, totalWeight - possible);
  const prior = missingWeight * (num(cfg.priorStrength) ?? 0.6);
  const priorRatio = num(cfg.priorRatio) ?? 0.6;
  let ratio = (earned + prior * priorRatio) / (possible + prior);

  // A dog and a cat can absolutely be friends, but they should not top a deck
  // over a well-matched same-species pair.
  if (!sameSpecies) ratio *= num(cfg.crossSpeciesFactor) ?? 0.45;

  const score = Math.max(0, Math.min(100, Math.round(ratio * 100)));
  // Half-point granularity: "4.5 / 5" reads as a rating, "4.37 / 5" does not.
  const points = Math.round(ratio * maxPoints * 2) / 2;

  return {
    points: Math.max(0, Math.min(maxPoints, points)),
    score,
    maxPoints,
    factors,
    knownFactors,
    // Few known factors means the number is a guess; the card can soften it.
    confidence: knownFactors >= 6 ? 'high' : knownFactors >= 3 ? 'medium' : 'low',
    behaviour,
  };
}

/**
 * Percentage compatibility, kept for callers and stored records that predate
 * the points breakdown.
 */
export function calculateCompatibilityScore(myPet, candidate) {
  const { score } = scoreMatch(myPet, candidate);
  return score == null ? 75 : score;
}

/**
 * Calculates the exact geodesic distance in kilometers between two GPS coordinates
 * using the spherical Haversine formula.
 */
export function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 5.0;
  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);
  if (isNaN(nLat1) || isNaN(nLon1) || isNaN(nLat2) || isNaN(nLon2)) return 5.0;

  const R = 6371; // Earth's radius in kilometers
  const dLat = (nLat2 - nLat1) * (Math.PI / 180);
  const dLon = (nLon2 - nLon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(nLat1 * (Math.PI / 180)) *
      Math.cos(nLat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.max(0.2, Math.round(distance * 10) / 10);
}

function getCandidateCoords(cand, baseLat, baseLng) {
  if (cand.location?.lat != null && cand.location?.lng != null) {
    return { lat: Number(cand.location.lat), lng: Number(cand.location.lng) };
  }
  // Pseudo-deterministic scatter around user anchor based on candidate ID string
  const anchorLat = baseLat != null ? Number(baseLat) : 28.6139;
  const anchorLng = baseLng != null ? Number(baseLng) : 77.2090;
  const idStr = String(cand._id || cand.id || '');
  let hash = 0;
  for (let i = 0; i < idStr.length; i++) {
    hash = (hash << 5) - hash + idStr.charCodeAt(i);
    hash |= 0;
  }
  const offsetLat = (((Math.abs(hash) % 250) + 5) - 125) / 2500; // ~ 0.2km to 12km radius
  const offsetLng = (((Math.abs(hash * 31) % 250) + 5) - 125) / 2500;
  return {
    lat: Math.round((anchorLat + offsetLat) * 10000) / 10000,
    lng: Math.round((anchorLng + offsetLng) * 10000) / 10000,
  };
}

/**
 * Normalise a raw `Pet` into the same shape as a `MatchProfile` card.
 *
 * The scorer compares field for field, so the viewer's pet has to speak the
 * card's vocabulary: years rather than a date of birth, a vaccination string
 * rather than a nested boolean, and the same capitalisation for enums.
 */
export function toComparablePet(pet) {
  if (!pet) return null;

  let age = null;
  if (pet.dob) {
    age = Math.max(0, Math.round(((new Date() - new Date(pet.dob)) / (1000 * 60 * 60 * 24 * 365.25)) * 10) / 10);
  } else if (pet.ageText) {
    const n = parseFloat(pet.ageText);
    if (!isNaN(n)) age = n;
  } else if (pet.age != null) {
    const n = parseFloat(pet.age);
    if (!isNaN(n)) age = n;
  }

  return {
    type: pet.type || pet.species || '',
    breed: pet.breed || '',
    size: pet.size || '',
    age,
    mood: pet.mood || '',
    temperament: pet.temperament || [],
    activityLevel: pet.activityLevel || '',
    // Every synced card is created with purpose 'Playdate'; mirroring that
    // keeps the factor meaningful instead of silently unknown on both sides.
    purpose: pet.purpose || 'Playdate',
    vaccinated: pet.health?.vaccinated ?? pet.vaccinated ?? pet.vaccinationStatus ?? null,
  };
}

/**
 * The pet an owner matches as.
 *
 * `Pet.findOne({ ownerId })` returns whatever Mongo reaches first, which for a
 * two-pet owner is not stable between calls: the deck could be built for one
 * pet and the swipe scored against the other. Ordering by creation date makes
 * it the same pet every time — their first pet — until there is a UI for
 * choosing which one you are swiping as.
 */
export function getPrimaryPet(userId) {
  return Pet.findOne({ ownerId: userId, deletedAt: null }).sort({ createdAt: 1 }).lean();
}

/**
 * Generate Discovery Swipe Deck according to user filters & ranked by match compatibility.
 */
export async function getMatchDeck({ userId, filters = {}, limit = 50 }) {
  // Sync pets in background without blocking hot deck response path
  syncAllExistingPets().catch(() => {});

  // Run swiped profile lookup & user pet lookup in parallel
  const [swipedIds, userPet] = await Promise.all([
    Swipe.find({ userId }).distinct('profileId'),
    getPrimaryPet(userId),
  ]);

  // Build MongoDB query
  const query = {
    _id: { $nin: swipedIds },
    active: true,
    $or: [{ ownerId: null }, { ownerId: { $ne: userId } }],
  };

  // Filter: Type / Species
  if (filters.type && filters.type !== 'Any') {
    query.type = { $regex: new RegExp(`^${filters.type.trim()}$`, 'i') };
  }

  // Filter: Gender
  if (filters.gender && filters.gender !== 'Any') {
    query.gender = { $regex: new RegExp(`^${filters.gender.trim()}$`, 'i') };
  }

  // Filter: Breed & Breed Recommendation Mode (Same Breed vs All Breeds)
  if (filters.breedMode === 'Same Breed' || filters.breedMode === 'same_breed' || filters.sameBreed === 'true' || filters.sameBreed === true) {
    let targetBreed = userPet?.breed;
    if (!targetBreed && filters.breed && filters.breed !== 'Any') {
      targetBreed = filters.breed;
    }
    if (targetBreed) {
      const escaped = targetBreed.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.breed = { $regex: new RegExp(`^${escaped}$`, 'i') };
    }
    if (userPet?.type) {
      query.type = userPet.type;
    }
  } else if (filters.breed && filters.breed !== 'Any') {
    const escaped = filters.breed.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.breed = { $regex: new RegExp(`^${escaped}$`, 'i') };
  }

  // Filter: Size
  if (filters.size && filters.size !== 'Any') {
    query.size = { $regex: new RegExp(`^${filters.size.trim()}$`, 'i') };
  }

  // Filter: Vaccination Status
  if (filters.vaccinationStatus && filters.vaccinationStatus !== 'Any') {
    query.vaccinationStatus = { $regex: new RegExp(`^${filters.vaccinationStatus.trim()}$`, 'i') };
  }

  // Filter: Neutered / Spayed
  if (filters.neutered && filters.neutered !== 'Any') {
    query.neutered = { $regex: new RegExp(`^${filters.neutered.trim()}$`, 'i') };
  }

  // Filter: Activity Level
  if (filters.activityLevel && filters.activityLevel !== 'Any') {
    query.activityLevel = { $regex: new RegExp(`^${filters.activityLevel.trim()}$`, 'i') };
  }

  // Filter: Purpose
  if (filters.purpose && filters.purpose !== 'Any') {
    query.purpose = { $regex: new RegExp(`^${filters.purpose.trim()}$`, 'i') };
  }

  // Filter: Availability
  if (filters.availability && filters.availability !== 'Any') {
    query.availability = { $regex: new RegExp(`^${filters.availability.trim()}$`, 'i') };
  }

  // Filter: Max Distance
  if (filters.distance && filters.distance !== 'Anywhere') {
    const distMatch = filters.distance.match(/\d+/);
    if (distMatch) {
      const maxKm = parseInt(distMatch[0], 10);
      query.distance = { $lte: maxKm };
    }
  }

  // Filter: Temperaments array overlap
  const temperaments = Array.isArray(filters.temperament)
    ? filters.temperament
    : typeof filters.temperament === 'string' && filters.temperament.trim().length > 0
    ? [filters.temperament.trim()]
    : [];
  if (temperaments.length > 0) {
    query.temperament = { $in: temperaments.map((t) => new RegExp(`^${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')) };
  }

  // Filter: Age Range
  if (filters.age && filters.age !== 'Any') {
    if (filters.age === '0-1 Year') query.age = { $gte: 0, $lte: 1 };
    else if (filters.age === '1-3 Years') query.age = { $gte: 1, $lte: 3 };
    else if (filters.age === '3-5 Years') query.age = { $gte: 3, $lte: 5 };
    else if (filters.age === '5-8 Years') query.age = { $gte: 5, $lte: 8 };
    else if (filters.age === '8+ Years') query.age = { $gte: 8 };
  }

  // Filter: Compatibility Tags overlap (checks both tags and compatibility fields)
  const compatibilities = Array.isArray(filters.compatibility)
    ? filters.compatibility
    : typeof filters.compatibility === 'string' && filters.compatibility.trim().length > 0
    ? [filters.compatibility.trim()]
    : [];
  if (compatibilities.length > 0) {
    const compatRegexes = compatibilities.map((c) => new RegExp(`^${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));
    query.$or = [
      { tags: { $in: compatRegexes } },
      { compatibility: { $in: compatRegexes } },
    ];
  }

  // Execute query
  const rawCandidates = await MatchProfile.find(query).lean();

  // User GPS / City location
  const userLat = filters.lat != null ? Number(filters.lat) : 28.6139;
  const userLng = filters.lng != null ? Number(filters.lng) : 77.2090;
  const reqCity = (filters.city || filters.cityName || '').trim();

  // Determine maximum distance radius threshold
  let maxRadiusKm = 1000; // default unrestricted radius if no city/distance filter
  if (filters.distance && filters.distance !== 'Anywhere') {
    const distMatch = filters.distance.match(/\d+/);
    if (distMatch) maxRadiusKm = parseInt(distMatch[0], 10);
  } else if (reqCity && reqCity !== 'Any' && reqCity !== 'Current Location') {
    maxRadiusKm = 50; // Strict 50km radius cutoff when a city is selected
  }

  // Filter candidates by city name match or proximity radius
  const filteredCandidates = rawCandidates.filter((cand) => {
    const candCoords = getCandidateCoords(cand, userLat, userLng);
    const realDistance = calculateHaversineDistanceKm(userLat, userLng, candCoords.lat, candCoords.lng);
    cand._computedDistance = realDistance;
    cand._computedCoords = candCoords;

    if (reqCity && reqCity !== 'Any' && reqCity !== 'Current Location') {
      const matchByName = cand.city && cand.city.toLowerCase().includes(reqCity.toLowerCase());
      const matchByDist = realDistance <= maxRadiusKm;
      return matchByName || matchByDist;
    }

    if (filters.distance && filters.distance !== 'Anywhere') {
      return realDistance <= maxRadiusKm;
    }

    return true;
  });

  // Batch lookup owner details for candidates with real ownerId
  const ownerIds = [...new Set(filteredCandidates.map((c) => c.ownerId).filter(Boolean))];
  const ownersMap = new Map();
  if (ownerIds.length > 0) {
    const owners = await User.find({ _id: { $in: ownerIds } }).select('name avatarUrl bio city').lean();
    owners.forEach((o) => ownersMap.set(o._id.toString(), o));
  }

  const MOCK_OWNERS = [
    { name: 'Ananya', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80', bio: 'Dog lover & weekend hiker. Looking for friendly park playdates!' },
    { name: 'Rohan', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80', bio: 'Pet parent based in the city. Big fan of outdoor games and social walks.' },
    { name: 'Priya', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80', bio: 'Cat & dog enthusiast! Passionate about pet wellness & fun meetups.' },
    { name: 'Vikram', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80', bio: 'Active pet owner who loves training sessions & weekend park runs.' },
    { name: 'Neha', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=300&q=80', bio: 'Passionate about animal care, healthy treats & happy tail wags!' },
  ];

  /*
   * The viewer's own pet, reshaped to match a candidate card's field names so
   * the scorer compares like with like. A raw Pet stores age as `dob`,
   * vaccination under `health`, and enums in lower case, none of which line up
   * with a MatchProfile.
   */
  const myPetContext = userPet ? toComparablePet(userPet) : null;

  // Compute compatibility score & format candidates with ownerInfo
  const scoredDeck = filteredCandidates.map((cand, idx) => {
    const realDistance = cand._computedDistance;
    const candCoords = cand._computedCoords;

    const realOwner = cand.ownerId ? ownersMap.get(cand.ownerId.toString()) : null;
    const mockOwner = MOCK_OWNERS[idx % MOCK_OWNERS.length];

    const ownerInfo = {
      name: realOwner?.name || cand.ownerInfo?.name || mockOwner.name,
      avatar: realOwner?.avatarUrl || cand.ownerInfo?.avatar || mockOwner.avatar,
      bio: realOwner?.bio || cand.ownerInfo?.bio || mockOwner.bio,
    };

    const updatedCand = {
      ...cand,
      distance: realDistance,
      location: candCoords,
      ownerInfo,
      ownerName: ownerInfo.name,
      ownerAvatar: ownerInfo.avatar,
      ownerBio: ownerInfo.bio,
    };
    const breakdown = scoreMatch(myPetContext, updatedCand);
    return {
      ...updatedCand,
      id: cand._id.toString(),
      // Headline rating, e.g. 4.5 out of 5.
      matchPoints: breakdown.points,
      maxMatchPoints: breakdown.maxPoints,
      matchConfidence: breakdown.confidence,
      // Per-factor detail so the card can explain the number.
      matchFactors: breakdown.factors,
      // Behavioural read on the pairing — level plus what to do about it.
      behaviourMatch: breakdown.behaviour,
      compatibilityScore: breakdown.score == null ? 75 : breakdown.score,
    };
  });

  /*
   * Best match first.
   *
   * This used to sort on raw distance, with the score only breaking ties —
   * and since distance is a float, ties essentially never happened, so the
   * compatibility number had no effect on what a user actually saw. Proximity
   * is already one of the weighted factors inside the score, so ranking on the
   * score keeps distance influential without letting it drown out everything
   * two pets have in common. Distance still breaks genuine ties.
   */
  scoredDeck.sort((a, b) => {
    if (b.compatibilityScore !== a.compatibilityScore) {
      return b.compatibilityScore - a.compatibilityScore;
    }
    return a.distance - b.distance;
  });

  return scoredDeck.slice(0, limit);
}

/**
 * Process a user swipe action (like, pass, superlike) with mutual reciprocity logic.
 */
export async function processSwipe({ userId, profileId, action }) {
  const profile = await MatchProfile.findOne({ _id: profileId, active: true });
  if (!profile) return { matched: false };

  // Idempotent swipe record
  await Swipe.updateOne(
    { userId, profileId: profile.id },
    { $set: { action } },
    { upsert: true }
  );

  // Pass action never matches
  if (action === 'pass') {
    return { matched: false };
  }

  /*
   * Reciprocity.
   *
   * A match needs the other owner to have liked one of *my* pets. The reverse
   * lookup used to omit `profileId` entirely, so it asked "has this owner ever
   * liked anybody?" — which meant liking someone who had swiped right on a
   * total stranger produced a match. In a populated deck almost every like
   * became a false match.
   */
  let isMutual = false;
  if (profile.autoLikesBack && MATCH_ENGINE_CONFIG.enableAutoReciprocity) {
    // Seeded demo profiles with no real owner behind them.
    isMutual = true;
  } else if (profile.ownerId) {
    const myProfileIds = await MatchProfile.find({ ownerId: userId }).distinct('_id');
    if (myProfileIds.length) {
      const reverseSwipe = await Swipe.findOne({
        userId: profile.ownerId,
        profileId: { $in: myProfileIds },
        action: { $in: ['like', 'superlike'] },
      });
      if (reverseSwipe) isMutual = true;
    }
  }

  if (!isMutual) {
    return { matched: false };
  }

  /*
   * A match is a two-sided thing.
   *
   * Only the swiper used to get a Match row, and the conversation was created
   * with a single participant — so when both sides were real users, the other
   * owner never saw the match, never appeared in the chat's participant list
   * (which is what drives delivery and unread counts), and could not even open
   * the conversation: `getOwnedConversation` filters on participants and would
   * 404 for them. That was invisible while every profile was a seeded bot.
   */
  const otherOwnerId = profile.ownerId ? String(profile.ownerId) : null;
  const isRealCounterpart = otherOwnerId && otherOwnerId !== String(userId);

  /*
   * Score the pair once, here, and store it on both Match rows.
   *
   * The matches list then shows the rating the two owners actually matched on,
   * rather than one recomputed later against profiles that have since drifted.
   */
  const myPet = await getPrimaryPet(userId);
  const rating = scoreMatch(myPet ? toComparablePet(myPet) : null, profile.toObject ? profile.toObject() : profile);
  const ratingFields = {
    petId: myPet?._id || null,
    matchPoints: rating.points,
    matchScore: rating.score,
    matchFactors: rating.factors,
  };

  /* What each owner should see as "my pet" on the celebration screen — the
     client used to guess this by fetching the owner's pets and taking the
     first, which is a third independent answer to a question the server has
     already settled. */
  const myPetCard = myPet
    ? { name: myPet.name, image: myPet.avatarUrl || myPet.photos?.[0] || '' }
    : null;

  let match = await Match.findOne({ userId, profileId: profile.id });
  if (!match) {
    const conversation = await ensureConversation({
      userId,
      context: 'match',
      refId: profile.id,
      counterpart: { name: profile.name, image: profile.img, subtitle: profile.breed },
      // Put the other owner in the room from the start.
      alsoInclude: isRealCounterpart ? [otherOwnerId] : [],
    });

    match = await Match.create({
      userId,
      profileId: profile.id,
      conversationId: conversation.id,
      ...ratingFields,
    });

    /*
     * Break the ice for them.
     *
     * A fresh match opens onto an empty room, and someone has to send the
     * first message into a silence — which is exactly where most matches die.
     * Both owners share this one conversation, so a single card greets both,
     * and the copy stays name-neutral because each side sees the other's pet
     * name, not their own. The client turns it into the two booking CTAs.
     */
    await postSystemMessage(conversation.id, {
      type: 'match_intro',
      text: MATCH_INTRO_TEXT,
    }).catch(() => {});

    /*
     * Everything the celebration screen needs, so the owner who did *not*
     * complete the match gets the same screen as the one who did — previously
     * this payload carried no photo and no behaviour verdict, and nothing on
     * the client listened for it at all.
     */
    emitToUser(userId, SOCKET_EVENTS.MATCH_NEW, {
      profileName: profile.name,
      profileImage: profile.img,
      conversationId: conversation.id,
      matchPoints: rating.points,
      maxMatchPoints: rating.maxPoints,
      behaviourMatch: rating.behaviour,
      myPet: myPetCard,
    });

    await notify(userId, {
      title: 'New Match!',
      body: `${profile.name} liked your pet back. Say hi!`,
      type: 'match',
      link: `/app/chat/room/${conversation.id}`,
      data: { conversationId: String(conversation.id) },
    }).catch(() => {});

    // The other owner gets their own view of the same match, pointing at
    // whichever of my pets they liked, and shares the one conversation.
    if (isRealCounterpart) {
      const theirLike = await Swipe.findOne({
        userId: otherOwnerId,
        profileId: { $in: await MatchProfile.find({ ownerId: userId }).distinct('_id') },
        action: { $in: ['like', 'superlike'] },
      });
      if (theirLike) {
        const myProfile = await MatchProfile.findById(theirLike.profileId).lean();
        // Scored from their side: their pet against mine. Compatibility is
        // symmetric for most factors, but each owner's profile completeness
        // differs, so the two readings are computed independently.
        const theirPet = await getPrimaryPet(otherOwnerId);
        const theirRating = scoreMatch(theirPet ? toComparablePet(theirPet) : null, myProfile);
        await Match.updateOne(
          { userId: otherOwnerId, profileId: theirLike.profileId },
          {
            $setOnInsert: {
              petId: theirPet?._id || null,
              conversationId: conversation.id,
              matchedAt: new Date(),
              matchPoints: theirRating.points,
              matchScore: theirRating.score,
              matchFactors: theirRating.factors,
            },
          },
          { upsert: true }
        );

        /*
         * Each owner sees the *other* pet in the chat header.
         *
         * `ensureConversation` stored a single counterpart — the profile the
         * swiper liked — so the other owner opened the room and found their
         * own pet's name and photo looking back at them.
         */
        await setCounterpartFor(conversation.id, userId, {
          name: profile.name,
          image: profile.img,
          subtitle: profile.breed,
        }).catch(() => {});
        await setCounterpartFor(conversation.id, otherOwnerId, {
          name: myProfile?.name || '',
          image: myProfile?.img || '',
          subtitle: myProfile?.breed || '',
        }).catch(() => {});

        emitToUser(otherOwnerId, SOCKET_EVENTS.MATCH_NEW, {
          profileName: myProfile?.name || 'a new pet',
          profileImage: myProfile?.img || '',
          conversationId: conversation.id,
          matchPoints: theirRating.points,
          maxMatchPoints: theirRating.maxPoints,
          behaviourMatch: theirRating.behaviour,
          myPet: theirPet
            ? { name: theirPet.name, image: theirPet.avatarUrl || theirPet.photos?.[0] || '' }
            : null,
        });
        await notify(otherOwnerId, {
          title: 'New Match!',
          body: `${myProfile?.name || 'Someone'} liked your pet back. Say hi!`,
          type: 'match',
          link: `/app/chat/room/${conversation.id}`,
          data: { conversationId: String(conversation.id) },
        }).catch(() => {});
      }
    }
  }

  return {
    matched: true,
    matchId: match.id,
    conversationId: match.conversationId,
    profileName: profile.name,
    profileImage: profile.img,
    matchPoints: match.matchPoints ?? rating.points,
    maxMatchPoints: rating.maxPoints,
    matchFactors: match.matchFactors?.length ? match.matchFactors : rating.factors,
    myPet: myPetCard,
    /*
     * "It's a match" on its own is not enough when one pet is marked
     * aggressive and the other shy. The celebration screen shows this level
     * and its advice so the pair meet on the right terms.
     */
    behaviourMatch: rating.behaviour,
  };
}

/**
 * Auto-generates engaging, mood-based prompt captions for a pet profile.
 */
export function generateMoodPrompts(pet) {
  const name = pet.name || 'This pet';
  const mood = (pet.mood || '').toLowerCase();
  const temperaments = (pet.temperament || []).map((t) => t.toLowerCase());
  const activity = (pet.activityLevel || '').toLowerCase();

  const prompts = [];

  // Mood / Energy 1: Playful / Energetic / Hyper / High activity
  if (
    mood.includes('play') ||
    mood.includes('energetic') ||
    mood.includes('hyper') ||
    mood.includes('active') ||
    temperaments.includes('playful') ||
    temperaments.includes('active') ||
    activity === 'high'
  ) {
    prompts.push({
      question: 'FIRST ROUND IS ON ME IF',
      answer: `You can throw the ball further than 50 feet for ${name}!`,
    });
    prompts.push({
      question: 'CURRENT MOOD & VIBE',
      answer: `${name} is in 100% zoomie mode today! Looking for a fast running buddy.`,
    });
  }
  // Mood / Energy 2: Chill / Lazy / Sleepy / Low activity / Calm
  else if (
    mood.includes('chill') ||
    mood.includes('lazy') ||
    mood.includes('sleep') ||
    mood.includes('calm') ||
    temperaments.includes('calm') ||
    temperaments.includes('couch potato') ||
    activity === 'low'
  ) {
    prompts.push({
      question: 'TODAY\'S MOOD & VIBE',
      answer: `${name} is feeling ultra relaxed today. 90% napping, 10% asking for belly rubs.`,
    });
    prompts.push({
      question: 'GREEN FLAGS I LOOK FOR',
      answer: 'Someone who respects that 3 PM is sacred sunbeam nap time.',
    });
  }
  // Mood / Energy 3: Friendly / Social / Affectionate / Cuddly
  else if (
    mood.includes('friend') ||
    mood.includes('social') ||
    mood.includes('love') ||
    mood.includes('cuddle') ||
    temperaments.includes('friendly') ||
    temperaments.includes('social') ||
    temperaments.includes('affectionate')
  ) {
    prompts.push({
      question: 'CURRENT MOOD & VIBE',
      answer: `${name} is bursting with happy energy and ready to make 50 new best friends today!`,
    });
    prompts.push({
      question: 'MY SIMPLE PLEASURES',
      answer: 'Tail wags, head pats, and meeting friendly new pals at the park.',
    });
  }
  // Mood / Energy 4: Curious / Adventurous / Smart
  else if (
    mood.includes('curious') ||
    mood.includes('explore') ||
    mood.includes('smart') ||
    temperaments.includes('curious') ||
    temperaments.includes('smart')
  ) {
    prompts.push({
      question: 'CURRENT MOOD & VIBE',
      answer: `${name} is in full detective mode! Ready to explore and sniff out every corner of the park.`,
    });
    prompts.push({
      question: 'A SHOWER THOUGHT I HAD',
      answer: 'If I fetch the stick, why does the human keep throwing it away?',
    });
  }
  // Mood / Energy 5: Protective / Loyal / Guard
  else if (
    mood.includes('protect') ||
    mood.includes('loyal') ||
    mood.includes('guard') ||
    temperaments.includes('protective') ||
    temperaments.includes('loyal')
  ) {
    prompts.push({
      question: 'TODAY\'S MOOD & VIBE',
      answer: `${name} is feeling loyal & watchful today. Always keeping an eye out for squirrels and delivery folks!`,
    });
    prompts.push({
      question: 'DATING ME IS LIKE',
      answer: 'Having a loyal furry bodyguard who accepts payment strictly in cheese treats.',
    });
  }
  // Fallback / General Pet Mood
  else {
    const defaultMoodText = pet.mood
      ? `${name} is feeling ${pet.mood.toLowerCase()} and ready for a fun playdate!`
      : `${name} is in a happy, tail-wagging mood today and excited to meet new friends!`;

    prompts.push({
      question: 'TODAY\'S MOOD & VIBE',
      answer: defaultMoodText,
    });
    prompts.push({
      question: 'FIRST ROUND IS ON ME IF',
      answer: `You bring yummy treats and can keep up with ${name}'s energy!`,
    });
  }

  // Include user bio as prompt if available
  if (pet.bio && prompts.length < 3) {
    prompts.push({
      question: 'ABOUT MY PERSONALITY',
      answer: pet.bio,
    });
  }

  return prompts;
}

/**
 * Automatically syncs a user's Pet model to its corresponding MatchProfile document.
 */
export async function syncPetToMatchProfile(pet) {
  if (!pet) return null;
  const isDeleted = Boolean(pet.deletedAt);

  const capitalize = (str) => (str ? str.charAt(0).toUpperCase() + str.slice(1) : '');
  const formatVaccinated = (v) => (v ? 'Vaccinated' : 'Not Vaccinated');
  const formatNeutered = (n) => (n ? 'Yes' : 'No');

  let age = 2;
  if (pet.dob) {
    const diffYears = (new Date() - new Date(pet.dob)) / (1000 * 60 * 60 * 24 * 365.25);
    age = Math.max(1, Math.round(diffYears * 10) / 10);
  } else if (pet.ageText) {
    const num = parseInt(pet.ageText, 10);
    if (!isNaN(num)) age = num;
  }

  const generatedPrompts = generateMoodPrompts(pet);

  const tags = [
    pet.mood ? `Mood: ${capitalize(pet.mood)}` : null,
    formatVaccinated(pet.health?.vaccinated),
    pet.activityLevel ? `${capitalize(pet.activityLevel)} Energy` : null,
    ...(pet.temperament || []),
  ].filter(Boolean);

  // Inherit owner location if pet location is not explicitly set
  let locLat = pet.location?.lat;
  let locLng = pet.location?.lng;
  let locCity = pet.city;
  let locState = pet.state;

  if ((locLat == null || locLng == null) && pet.ownerId) {
    const owner = await User.findById(pet.ownerId).select('location city state').lean();
    if (owner?.location?.lat != null && owner?.location?.lng != null) {
      locLat = owner.location.lat;
      locLng = owner.location.lng;
      locCity = owner.city || locCity;
      locState = owner.state || locState;
    }
  }

  const updateData = {
    petId: pet._id,
    ownerId: pet.ownerId,
    name: pet.name,
    type: capitalize(pet.type || 'dog'),
    gender: capitalize(pet.gender || 'unknown'),
    age,
    breed: pet.breed || 'Mixed Breed',
    size: capitalize(pet.size || 'medium'),
    vaccinationStatus: formatVaccinated(pet.health?.vaccinated),
    neutered: formatNeutered(pet.health?.neutered),
    activityLevel: capitalize(pet.activityLevel || 'medium'),
    mood: pet.mood || '',
    temperament: pet.temperament || [],
    purpose: pet.purpose || 'Playdate',
    availability: 'Available',
    prompts: generatedPrompts,
    tags,
    img: pet.avatarUrl || pet.photos?.[0] || '',
    photos: pet.photos && pet.photos.length ? pet.photos : pet.avatarUrl ? [pet.avatarUrl] : [],
    active: !isDeleted,
  };

  if (locLat != null && locLng != null) {
    updateData.location = { lat: Number(locLat), lng: Number(locLng) };
    if (locCity) updateData.city = locCity;
    if (locState) updateData.state = locState;
  }

  const matchProfile = await MatchProfile.findOneAndUpdate(
    { petId: pet._id },
    { $set: updateData },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return matchProfile;
}

/**
 * Syncs all existing non-deleted pets in MongoDB into MatchProfile collection.
 * Throttled with Redis cache to prevent heavy full-database looping on hot request paths.
 */
export async function syncAllExistingPets() {
  return getOrSet('sys:pets_synced', 3600, async () => {
    try {
      const pets = await Pet.find({ deletedAt: null }).lean();
      for (const pet of pets) {
        await syncPetToMatchProfile(pet);
      }
      return { syncedAt: new Date().toISOString() };
    } catch (err) {
      console.error('Error syncing existing pets to match profiles:', err);
      return null;
    }
  });
}

/**
 * Resets a user's swipe deck history so they can re-view available profiles.
 */
export async function resetUserSwipes(userId) {
  const result = await Swipe.deleteMany({ userId });
  return { deletedCount: result.deletedCount };
}

