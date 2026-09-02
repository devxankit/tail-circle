import { MatchProfile, Swipe, Match } from './social.models.js';
import { ensureConversation } from './chat.service.js';
import { emitToUser } from '../../sockets/index.js';
import { SOCKET_EVENTS } from '../../sockets/events.js';
import { notify } from '../../services/notify.js';
import { Pet } from '../pet/pet.model.js';

/**
 * Customizable Match Engine configuration tokens & weightings.
 * Allows administrative / algorithmic tuning over match score calculations.
 */
export let MATCH_ENGINE_CONFIG = {
  weightProximity: 30,
  weightTemperament: 30,
  weightPurpose: 20,
  weightActivity: 20,
  defaultMaxDistanceKm: 50,
  enableAutoReciprocity: true,
};

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

/**
 * Calculates a 0-100% compatibility score between a user's pet context and candidate pet profile.
 */
export function calculateCompatibilityScore(myPet, candidate) {
  let score = 72; // base score

  if (myPet && candidate) {
    // Temperament overlap
    if (myPet.temperament && candidate.temperament) {
      const mySet = new Set(myPet.temperament.map((t) => t.toLowerCase()));
      const overlap = candidate.temperament.filter((t) => mySet.has(t.toLowerCase())).length;
      score += overlap * 6;
    }

    // Purpose match
    if (myPet.purpose && candidate.purpose && myPet.purpose === candidate.purpose) {
      score += 12;
    }

    // Activity level match
    if (myPet.activityLevel && candidate.activityLevel && myPet.activityLevel === candidate.activityLevel) {
      score += 8;
    }
  }

  // Distance adjustment
  const dist = Number(candidate.distance) || 5;
  if (dist <= 2) score += 8;
  else if (dist <= 5) score += 4;
  else if (dist > 25) score -= 6;

  // Clamp compatibility score between 68% and 99%
  return Math.min(99, Math.max(68, Math.round(score)));
}

/**
 * Generate Discovery Swipe Deck according to user filters & ranked by match compatibility.
 */
export async function getMatchDeck({ userId, filters = {}, limit = 50 }) {
  // Find swiped profile IDs to exclude from deck
  const swipedIds = await Swipe.find({ userId }).distinct('profileId');

  // Build MongoDB query
  const query = {
    _id: { $nin: swipedIds },
    active: true,
    $or: [{ ownerId: null }, { ownerId: { $ne: userId } }],
  };

  // Filter: Type / Species
  if (filters.type && filters.type !== 'Any') {
    query.type = filters.type;
  }

  // Filter: Gender
  if (filters.gender && filters.gender !== 'Any') {
    query.gender = filters.gender;
  }

  // Filter: Breed
  if (filters.breed && filters.breed !== 'Any') {
    query.breed = filters.breed;
  }

  // Filter: Size
  if (filters.size && filters.size !== 'Any') {
    query.size = filters.size;
  }

  // Filter: Vaccination Status
  if (filters.vaccinationStatus && filters.vaccinationStatus !== 'Any') {
    query.vaccinationStatus = filters.vaccinationStatus;
  }

  // Filter: Neutered / Spayed
  if (filters.neutered && filters.neutered !== 'Any') {
    query.neutered = filters.neutered;
  }

  // Filter: Activity Level
  if (filters.activityLevel && filters.activityLevel !== 'Any') {
    query.activityLevel = filters.activityLevel;
  }

  // Filter: Purpose
  if (filters.purpose && filters.purpose !== 'Any') {
    query.purpose = filters.purpose;
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
  if (Array.isArray(filters.temperament) && filters.temperament.length > 0) {
    query.temperament = { $in: filters.temperament };
  }

  // Execute query
  const candidates = await MatchProfile.find(query).limit(limit).lean();

  // Fetch primary pet of swiping user for compatibility scoring
  const userPet = await Pet.findOne({ ownerId: userId, deletedAt: null }).lean();

  // Compute compatibility score for each candidate & rank descending
  const scoredDeck = candidates.map((cand) => {
    const score = calculateCompatibilityScore(userPet, cand);
    return {
      ...cand,
      id: cand._id.toString(),
      compatibilityScore: score,
    };
  });

  scoredDeck.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
  return scoredDeck;
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
    });

    emitToUser(userId, SOCKET_EVENTS.MATCH_NEW, {
      profileName: profile.name,
      conversationId: conversation.id,
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
        await Match.updateOne(
          { userId: otherOwnerId, profileId: theirLike.profileId },
          { $setOnInsert: { conversationId: conversation.id, matchedAt: new Date() } },
          { upsert: true }
        );
        emitToUser(otherOwnerId, SOCKET_EVENTS.MATCH_NEW, {
          profileName: myProfile?.name || 'a new pet',
          conversationId: conversation.id,
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
  };
}
