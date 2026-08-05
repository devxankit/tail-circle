import React, { useState, useEffect } from 'react';
import { MatchSwipe } from './MatchSwipe';
import { ChatList } from '../chat/ChatList';

export function Matches() {
  // Remember the last view (swipe or chat) in sessionStorage so it doesn't reset when navigating back
  const [view, setView] = useState(() => sessionStorage.getItem('matchesView') || 'swipe');

  useEffect(() => {
    sessionStorage.setItem('matchesView', view);
  }, [view]);

  return (
    <div className="flex flex-col h-full bg-bg-primary relative animate-in fade-in duration-300">
      <div className="flex-1 overflow-hidden">
        {view === 'swipe' ? <MatchSwipe setView={setView} /> : <ChatList setView={setView} />}
      </div>
    </div>
  );
}
