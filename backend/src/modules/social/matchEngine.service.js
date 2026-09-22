import { MatchProfile, Swipe, Match } from './social.models.js';
import { PetPrompt } from './prompt.model.js';
import { ensureConversation, postSystemMessage, setCounterpartFor } from './chat.service.js';
import { emitToUser } from '../../sockets/index.js';
import { SOCKET_EVENTS } from '../../sockets/events.js';
import { notify } from '../../services/notify.js';
import { Pet } from '../pet/pet.model.js';
import { User } from '../user/user.model.js';
import { getOrSet } from '../../services/cache.service.js';
import { behaviourCompatibility } from './behaviour.service.js';
import { consumeLike, refundLike, getEntitlement } from '../subscription/subscription.service.js';

/**
 * Match engine configuration, tunable at runtime via PATCH /matches/engine/config.
 *
 * There are no factor weights any more. Compatibility is temperament, and only
 * temperament — proximity, mood, energy, age, breed, size, vaccination and
 * purpose no longer contribute to the number. They remain what they always
 * usefully were: filters and sort order on the deck, not opinions about
 * whether two pets suit each other.
 */
export let MATCH_ENGINE_CONFIG = {
  maxPoints: 5, // score is shown out of this many points
  crossSpeciesFactor: 0.45, // a dog and a cat can meet, but rarely a top match
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

/**
 * Compatibility between the viewer's pet and a candidate.
 *
 * Temperament is the whole of it. This used to blend nine weighted factors —
 * proximity, energy, mood, age, breed, purpose, size, vaccination and
 * behaviour — into one number, which meant a pet could rate well on the deck
 * for living nearby and being the same size while having nothing in common
 * with the pet it was shown to. Distance and the rest still shape *which*
 * pets appear, through the deck's filters and its nearest-first ordering;
 * they no longer masquerade as compatibility.
 *
 * `factors` survives as a single entry rather than being dropped, because
 * clients and stored match records read it. It carries the one thing that is
 * actually scored.
 */
export function scoreMatch(myPet, candidate) {
  const cfg = MATCH_ENGINE_CONFIG;
  const maxPoints = Number(cfg.maxPoints) || 5;

  const unknown = (behaviour = null) => ({
    points: null, score: null, maxPoints,
    factors: [{ key: 'temperament', label: 'Temperament', known: false, value: null }],
    knownFactors: 0, confidence: 'unknown', behaviour,
  });

  if (!candidate) return unknown();

  /*
   * `null` means one of the pets has no temperament recorded — an unanswered
   * question, not a bad match. With nothing else feeding the score there is no
   * number to give, so the card shows none rather than inventing one.
   */
  const behaviour = behaviourCompatibility(myPet?.temperament, candidate.temperament);
  if (!behaviour) return unknown();

  const sameSpecies = !myPet?.type || !candidate.type || norm(myPet.type) === norm(candidate.type);

  // A dog and a cat can absolutely be friends, but they should not top a deck
  // over a well-matched same-species pair.
  let ratio = behaviour.value;
  if (!sameSpecies) ratio *= num(cfg.crossSpeciesFactor) ?? 0.45;
  ratio = Math.max(0, Math.min(1, ratio));

  return {
    // Half-point granularity: "4.5 / 5" reads as a rating, "4.37 / 5" does not.
    points: Math.round(ratio * maxPoints * 2) / 2,
    score: Math.round(ratio * 100),
    maxPoints,
    factors: [{
      key: 'temperament',
      label: 'Temperament',
      known: true,
      value: Math.round(behaviour.value * 100) / 100,
      display: `${Math.round(behaviour.value * 100)}%`,
    }],
    knownFactors: 1,
    confidence: 'high',
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
 * Geodesic distance in kilometres between two GPS coordinates, or `null` when
 * either end is unknown.
 *
 * It used to answer 5.0 km for a missing coordinate. That is a plausible,
 * completely invented number, and because a pet's location was never actually
 * recorded anywhere, it was the number most users saw: "5 km away" from a pet
 * that could have been in another state. An unknown distance is now null and
 * every caller has to decide what to do about it.
 */
export function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);
  if (isNaN(nLat1) || isNaN(nLon1) || isNaN(nLat2) || isNaN(nLon2)) return null;

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

/**
 * Where a candidate actually is, or nulls.
 *
 * This used to scatter pets with no recorded location deterministically around
 * whoever was looking at them — 0.2 to 12 km away, from a hash of their id.
 * Every card then read "2.4 km away" and nobody could tell that the app had
 * never captured a location at all. A pet whose owner has not given one is now
 * simply somewhere unknown, and says so.
 */
function getCandidateCoords(cand) {
  if (cand.location?.lat != null && cand.location?.lng != null) {
    return { lat: Number(cand.location.lat), lng: Number(cand.location.lng) };
  }
  return { lat: null, lng: null };
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

  /*
   * Distance is deliberately NOT filtered here.
   *
   * It used to be: `query.distance = { $lte: maxKm }`, matching the stored
   * `distance` column — a static number baked into the demo seed rows (Luna
   * lives "4 km" from everyone on earth) and null on every profile belonging to
   * a real pet. So a radius filter kept the fake pets and dropped all the real
   * ones, whatever their actual coordinates said. How far apart two pets are
   * depends on who is looking, which the database cannot know, so the radius is
   * applied below against a distance computed per viewer.
   */

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

  /*
   * Where the viewer is measuring from.
   *
   * The request's own coordinates first (live GPS, or a city they picked), then
   * the location saved on their account at onboarding. Defaulting to Delhi for
   * everyone else is why a user in Indore with location denied saw distances
   * measured from a city 800 km away; with no anchor at all, distance is simply
   * unknown and the cards say so.
   */
  const viewer = await User.findById(userId).select('location city').lean();
  const userLat = filters.lat != null ? Number(filters.lat) : viewer?.location?.lat ?? null;
  const userLng = filters.lng != null ? Number(filters.lng) : viewer?.location?.lng ?? null;
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
    const candCoords = getCandidateCoords(cand);
    const realDistance = calculateHaversineDistanceKm(userLat, userLng, candCoords.lat, candCoords.lng);
    cand._computedDistance = realDistance;
    cand._computedCoords = candCoords;

    if (reqCity && reqCity !== 'Any' && reqCity !== 'Current Location') {
      const mainReqToken = reqCity.split(',')[0].trim().toLowerCase();
      const candCity = (cand.city || '').trim().toLowerCase();

      // If candidate has an explicit city assigned
      if (candCity) {
        const matchByName = candCity.includes(mainReqToken) || mainReqToken.includes(candCity);
        const matchByDist = realDistance != null && realDistance <= maxRadiusKm;
        return matchByName || matchByDist;
      }

      // No city recorded, so coordinates are the only way to answer.
      return realDistance != null && realDistance <= maxRadiusKm;
    }

    /*
     * A radius filter asks a question about distance, so a pet whose distance
     * is unknown cannot satisfy it. Excluding it is the honest answer — the
     * alternative is showing a pet inside "Within 1 KM" that may be anywhere.
     */
    if (filters.distance && filters.distance !== 'Anywhere') {
      return realDistance != null && realDistance <= maxRadiusKm;
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

  /*
   * The viewer's own pet, reshaped to match a candidate card's field names so
   * the scorer compares like with like. A raw Pet stores age as `dob`,
   * vaccination under `health`, and enums in lower case, none of which line up
   * with a MatchProfile.
   */
  const myPetContext = userPet ? toComparablePet(userPet) : null;

  // Compute compatibility score & format candidates with ownerInfo
  const scoredDeck = filteredCandidates.map((cand) => {
    const realDistance = cand._computedDistance;
    const candCoords = cand._computedCoords;

    const realOwner = cand.ownerId ? ownersMap.get(cand.ownerId.toString()) : null;

    const ownerName = (realOwner?.name || cand.ownerInfo?.name || cand.ownerName || '').trim() || 'Pet Parent';
    const ownerAvatar = realOwner?.avatarUrl || cand.ownerInfo?.avatar || cand.ownerAvatar || null;
    const ownerBio = (realOwner?.bio || cand.ownerInfo?.bio || cand.ownerBio || '').trim() || `Loving parent of ${cand.name || 'this pet'}. Always excited for pet playdates & happy furry meetups!`;

    const ownerInfo = {
      name: ownerName,
      avatar: ownerAvatar,
      bio: ownerBio,
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
      // One factor now — temperament — kept as an array for clients and stored
      // match rows that read this shape.
      matchFactors: breakdown.factors,
      // The temperament read itself: percentage, level, and the shared traits
      // behind it. This is what the card renders.
      behaviourMatch: breakdown.behaviour,
      // A pet with no temperament recorded is unknown, not average — 50 sorts
      // it in the middle of the deck instead of above pets it demonstrably
      // has less in common with.
      compatibilityScore: breakdown.score == null ? 50 : breakdown.score,
    };
  });

  /*
   * Best temperament match first, nearest first within that.
   *
   * Now that the score is temperament alone, ties are common — several pets
   * genuinely can be an equally good fit — and distance decides between them.
   * That is the pairing the header promises: matched on temperament, ordered
   * by who the user can actually go and meet.
   */
  scoredDeck.sort((a, b) => {
    if (b.compatibilityScore !== a.compatibilityScore) {
      return b.compatibilityScore - a.compatibilityScore;
    }
    // Pets we cannot place go last among equals rather than sorting as if they
    // were at distance zero, which is what comparing against null used to do.
    if (a.distance == null) return b.distance == null ? 0 : 1;
    if (b.distance == null) return -1;
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

  /*
   * Subscription quota.
   *
   * Likes and superlikes are metered; passing is always free. The charge has to
   * happen before the Swipe row is written, because once that row exists the
   * like has effectively been made — but it must also not charge twice for the
   * same profile. `existing` settles that: re-swiping someone already liked, or
   * upgrading a like to a superlike, spends nothing further. Only a first
   * like — on a fresh profile or one previously passed — costs an allowance.
   */
  const isLike = action === 'like' || action === 'superlike';
  const existing = await Swipe.findOne({ userId, profileId: profile.id }).select('action').lean();
  const alreadyLiked = existing?.action === 'like' || existing?.action === 'superlike';
  let charged = false;
  let entitlement = null;

  if (isLike && !alreadyLiked) {
    // Throws LikeLimitError (402, code LIKE_LIMIT_REACHED) when the allowance
    // is spent; the route lets it through so the client can open the paywall.
    entitlement = await consumeLike(userId);
    charged = true;
  }

  // Idempotent swipe record
  try {
    await Swipe.updateOne(
      { userId, profileId: profile.id },
      { $set: { action } },
      { upsert: true }
    );
  } catch (err) {
    // The allowance was spent on a like that was never recorded — give it back
    // rather than let a write failure quietly cost the user one of their ten.
    if (charged) await refundLike(userId);
    throw err;
  }

  // Pass action never matches
  if (action === 'pass') {
    return { matched: false, entitlement: await getEntitlement(userId) };
  }

  if (!entitlement) entitlement = await getEntitlement(userId);

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
    return { matched: false, entitlement };
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
    /*
     * The quota after this swipe, so the deck's "7 likes left" pill updates
     * from the same response that spent the like rather than a follow-up call
     * that could race the next tap.
     */
    entitlement,
  };
}

/**
 * Auto-generates engaging, mood-based prompt captions for a pet profile.
 * Fetches dynamic prompts from MongoDB PetPrompt model, with fallback to default prompts.
 */
export async function generateMoodPrompts(pet) {
  const name = pet.name || 'This pet';
  const petType = (pet.type || 'dog').toLowerCase();
  const mood = (pet.mood || '').toLowerCase();
  const temperaments = (pet.temperament || []).map((t) => t.toLowerCase());
  const activity = (pet.activityLevel || '').toLowerCase();

  try {
    const activePrompts = await PetPrompt.find({ isActive: true }).lean();
    if (activePrompts && activePrompts.length > 0) {
      const matched = activePrompts.filter((p) => {
        const promptSpecies = (p.species || 'all').toLowerCase();
        if (promptSpecies !== 'all' && promptSpecies !== petType) {
          return false;
        }

        const pTemp = (p.temperament || 'any').toLowerCase();
        const pMood = (p.mood || 'any').toLowerCase();

        if (pTemp === 'any' && pMood === 'any') return true;

        const tempMatch = pTemp === 'any' || temperaments.includes(pTemp);
        const moodMatch = pMood === 'any' || (mood && mood.includes(pMood));

        return tempMatch || moodMatch;
      });

      const pool = matched.length > 0 ? matched : activePrompts;
      const shuffled = [...pool].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 2);

      const dbPrompts = selected.map((p) => ({
        question: p.question,
        answer: p.answerTemplate.replace(/\{name\}/gi, name),
      }));

      if (pet.bio && dbPrompts.length < 3) {
        dbPrompts.push({
          question: 'ABOUT MY PERSONALITY',
          answer: pet.bio,
        });
      }

      if (dbPrompts.length > 0) {
        return dbPrompts;
      }
    }
  } catch (err) {
    console.error('Error fetching dynamic pet prompts from DB, falling back to static:', err.message);
  }

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

  const generatedPrompts = await generateMoodPrompts(pet);

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

