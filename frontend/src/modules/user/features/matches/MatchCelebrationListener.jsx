import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeToNewMatches } from '../../../../services/social';
import { MatchCelebrationModal } from './MatchCelebrationModal';
import { markCelebrated, wasCelebrated } from './matchCelebrations';

/**
 * Celebrates a match wherever the user happens to be.
 *
 * A match has two sides, and only one of them is swiping. The owner who liked
 * first — and is therefore not on the matches screen when the match completes
 * — got nothing but a push notification: no celebration, no compatibility
 * reading, and, more importantly, none of the behavioural guidance about how
 * these two pets should first meet. `match:new` was emitted for exactly this
 * and nothing in the app had ever listened for it.
 *
 * Mounted once inside the authenticated shell so it survives navigation.
 */
export function MatchCelebrationListener() {
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);

  useEffect(() => {
    let off = () => {};
    let cancelled = false;

    subscribeToNewMatches((payload) => {
      const convId = payload.conversationId ? String(payload.conversationId) : null;
      // The swiper's own modal has already fired from the swipe response.
      if (wasCelebrated(convId)) return;
      markCelebrated(convId);
      setMatch({
        profileName: payload.profileName,
        profileImage: payload.profileImage,
        conversationId: convId,
        behaviourMatch: payload.behaviourMatch,
        myPetImage: payload.myPet?.image || null,
      });
    }).then((fn) => {
      if (cancelled) fn();
      else off = fn;
    });

    return () => {
      cancelled = true;
      off();
    };
  }, []);

  if (!match) return null;

  return (
    <MatchCelebrationModal
      match={match}
      myPetImage={match.myPetImage}
      onClose={() => setMatch(null)}
      onMessage={() => {
        const convId = match.conversationId;
        setMatch(null);
        if (convId) navigate(`/app/chat/room/${convId}`);
      }}
    />
  );
}

export default MatchCelebrationListener;
