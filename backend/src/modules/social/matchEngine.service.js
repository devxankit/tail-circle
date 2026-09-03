import { MatchProfile, Swipe, Match } from './social.models.js';
import { ensureConversation } from './chat.service.js';
import { emitToUser } from '../../sockets/index.js';
import { SOCKET_EVENTS } from '../../sockets/events.js';
import { notify } from '../../services/notify.js';
import { Pet } from '../pet/pet.model.js';
import { User } from '../user/user.model.js';
import { getOrSet } from '../../services/cache.service.js';

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
  enableAutoReciprocity: false,
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
 * Generate Discovery Swipe Deck according to user filters & ranked by match compatibility.
 */
export async function getMatchDeck({ userId, filters = {}, limit = 50 }) {
  // Sync pets in background without blocking hot deck response path
  syncAllExistingPets().catch(() => {});

  // Run swiped profile lookup & user pet lookup in parallel
  const [swipedIds, userPet] = await Promise.all([
    Swipe.find({ userId }).distinct('profileId'),
    Pet.findOne({ ownerId: userId, deletedAt: null }).lean(),
  ]);

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

  // Filter: Age Range
  if (filters.age && filters.age !== 'Any') {
    if (filters.age === '0-1 Year') query.age = { $gte: 0, $lte: 1 };
    else if (filters.age === '1-3 Years') query.age = { $gte: 1, $lte: 3 };
    else if (filters.age === '3-5 Years') query.age = { $gte: 3, $lte: 5 };
    else if (filters.age === '5-8 Years') query.age = { $gte: 5, $lte: 8 };
    else if (filters.age === '8+ Years') query.age = { $gte: 8 };
  }

  // Filter: Compatibility Tags overlap
  if (Array.isArray(filters.compatibility) && filters.compatibility.length > 0) {
    query.tags = { $in: filters.compatibility };
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
    const score = calculateCompatibilityScore(userPet, updatedCand);
    return {
      ...updatedCand,
      id: cand._id.toString(),
      compatibilityScore: score,
    };
  });

  // Rank Nearest Profiles First (distance ascending, then compatibility score descending)
  scoredDeck.sort((a, b) => {
    if (a.distance !== b.distance) {
      return a.distance - b.distance;
    }
    return b.compatibilityScore - a.compatibilityScore;
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
    temperament: pet.temperament || [],
    purpose: 'Playdate',
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

