import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, MoreVertical, Heart, MessageCircle, Plus, X, Eye, ChevronUp, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { StoryCamera } from './StoryCamera';
import { fetchConversations, fetchMatches, fetchStories, publishStory } from '../../../../services/social';

const chatTime = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'short' });
};

export function ChatList({ setView }) {
  const navigate = useNavigate();

  const [activeStory, setActiveStory] = useState(null);
  const [myStory, setMyStory] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [showViewers, setShowViewers] = useState(false);

  useEffect(() => {
    let timer;
    if (activeStory && !activeStory.isMine) {
      timer = setTimeout(() => {
        setActiveStory(null);
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [activeStory]);

  // Story circles = my matches; active stories layered on top.
  const [stories, setStories] = useState([]);
  const [chats, setChats] = useState([]);

  useEffect(() => {
    fetchMatches()
      .then((matches) =>
        setStories(
          matches.map((m) => ({
            id: m._id,
            name: m.profileId?.name || 'Match',
            img: m.profileId?.img || '',
            hasUnseen: false,
          }))
        )
      )
      .catch(() => setStories([]));
    Promise.all([
      fetchStories(),
      import('../../../../services/auth').then((m) => m.getStoredUser()),
    ])
      .then(([active, me]) => {
        const mine = active.find((s) => String(s.userId) === String(me?._id || me?.id));
        if (mine) setMyStory(mine.mediaUrl);
      })
      .catch(() => {});
    fetchConversations()
      .then((conversations) =>
        setChats(
          conversations.map((c) => ({
            conversationId: c._id,
            name: c.counterpart?.name || 'Chat',
            msg: c.lastMessage || 'Say hi! 👋',
            time: chatTime(c.lastMessageAt),
            unread: 0,
            img: c.counterpart?.image || '',
          }))
        )
      )
      .catch(() => setChats([]));
  }, []);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border-light relative">
        <h1 className="text-xl font-bold text-text-primary">Messages</h1>
        
        <div className="flex items-center gap-4">
          <Search size={24} className="text-text-secondary cursor-pointer" />
          
          <div className="flex items-center bg-white border border-border-light rounded-full p-1 shadow-[0_2px_10px_rgba(0,0,0,0.05)] shrink-0 z-10">
            <button 
              onClick={() => setView('swipe')}
              className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:text-primary-main transition-colors"
            >
              <Heart size={18} strokeWidth={2.5} />
            </button>
            <button 
              onClick={() => setView('chat')}
              className="w-9 h-9 rounded-full bg-primary-main flex items-center justify-center text-white hover:bg-primary-dark transition-colors shadow-inner relative"
            >
              <MessageCircle size={18} strokeWidth={2} />
              <span className="absolute top-[6px] right-[6px] w-2 h-2 bg-error rounded-full border border-white"></span>
            </button>
          </div>
        </div>
      </div>

      {/* Stories / New Matches Row */}
      <div className="py-4 border-b border-border-light">
        <h3 className="px-4 text-xs font-bold text-text-secondary uppercase mb-3">Stories & Matches</h3>
        <div className="flex overflow-x-auto hide-scrollbar px-4 gap-4">
          
          {/* Add Your Story */}
          <div 
            onClick={() => {
              if (myStory) {
                setActiveStory({ id: 'mine', name: 'Your Story', img: myStory, isMine: true });
              } else {
                setIsCameraOpen(true);
              }
            }}
            className="flex flex-col items-center gap-1 cursor-pointer min-w-[72px] shrink-0"
          >
            <div className="w-16 h-16 rounded-full relative">
              <div className={cn("w-full h-full rounded-full overflow-hidden border-2 transition-all", myStory ? "border-primary-main p-[2px]" : "border-transparent bg-bg-secondary")}>
                <img src={myStory || "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=100&q=80"} alt="Your Story" className={cn("w-full h-full object-cover rounded-full", !myStory && "opacity-80")} />
              </div>
              {!myStory && (
                <div className="absolute bottom-0 right-0 bg-primary-main w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-white shadow-sm">
                  <Plus size={12} strokeWidth={4} />
                </div>
              )}
            </div>
            <span className="text-xs font-medium text-text-secondary">Your Story</span>
          </div>

          {/* Other Stories */}
          {stories.map(story => (
            <div 
              key={story.id} 
              onClick={() => setActiveStory(story)}
              className="flex flex-col items-center gap-1 cursor-pointer min-w-[72px] shrink-0"
            >
              <div className={cn("w-16 h-16 rounded-full p-[2px]", story.hasUnseen ? "bg-gradient-to-tr from-primary-main to-accent-yellow" : "bg-border-light")}>
                <div className="w-full h-full rounded-full border-2 border-white overflow-hidden bg-bg-secondary">
                  <img src={story.img} alt={story.name} className="w-full h-full object-cover" />
                </div>
              </div>
              <span className="text-xs font-medium text-text-primary">{story.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chat List */}
      <div className="flex flex-col flex-1 overflow-y-auto">
        <h3 className="px-4 pt-4 text-xs font-bold text-text-secondary uppercase mb-2">Conversations</h3>
        {chats.map((chat, idx) => (
          <div
            key={chat.conversationId || idx}
            className="flex items-center p-4 hover:bg-bg-secondary cursor-pointer transition-colors"
            onClick={() => navigate('/app/chat/room', { state: { pet: { name: chat.name, img: chat.img }, conversationId: chat.conversationId } })}
          >
            <div className="w-14 h-14 rounded-full overflow-hidden bg-bg-secondary shrink-0 border border-border-light">
              <img src={chat.img} alt={chat.name} className="w-full h-full object-cover" />
            </div>
            <div className="ml-4 flex-1 border-b border-border-light/50 pb-4">
              <div className="flex justify-between items-center mb-1">
                <h4 className="font-bold text-text-primary text-base">{chat.name}</h4>
                <span className="text-xs text-text-secondary">{chat.time}</span>
              </div>
              <div className="flex justify-between items-center">
                <p className={`text-sm truncate pr-4 ${chat.unread ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
                  {chat.msg}
                </p>
                {chat.unread > 0 && (
                  <div className="w-5 h-5 bg-primary-main rounded-full flex items-center justify-center text-[10px] text-white font-bold shrink-0">
                    {chat.unread}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Full-Screen Story Viewer Overlay */}
      {activeStory && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in zoom-in-95 duration-200">
          
          {/* Progress bar */}
          <div className="absolute top-4 left-4 right-4 flex gap-1 z-20">
            <div className="h-1 bg-white/30 rounded-full flex-1 overflow-hidden">
              <div className="h-full bg-white animate-[progress_5s_linear_forwards]"></div>
            </div>
          </div>
          
          {/* Header */}
          <div className="absolute top-8 left-4 right-4 flex justify-between items-center z-20">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full border-2 border-white/50 overflow-hidden bg-bg-secondary">
                <img src={activeStory.id === 'mine' ? "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=100&q=80" : activeStory.img} alt="avatar" className="w-full h-full object-cover" />
              </div>
              <span className="text-white font-bold drop-shadow-md">{activeStory.name}</span>
              <span className="text-white/70 text-xs ml-2">2h</span>
            </div>
            <button onClick={() => { setActiveStory(null); setShowViewers(false); }} className="text-white hover:text-gray-300 p-2"><X size={28} /></button>
          </div>

          {/* Story Image Background */}
          <div className="absolute inset-0 z-0 bg-black flex items-center justify-center">
            <img src={activeStory.img} className="w-full h-full object-cover opacity-95" alt="Story" />
            {/* Gradient overlays for readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60 pointer-events-none"></div>
          </div>

          {/* Footer actions */}
          {activeStory.isMine ? (
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col items-center z-20">
              <button 
                onClick={() => setShowViewers(!showViewers)} 
                className="text-white flex flex-col items-center gap-1 hover:text-primary-main transition-colors mb-2"
              >
                <ChevronUp size={24} className={showViewers ? "rotate-180 transition-transform" : "transition-transform"} />
                <span className="text-sm font-bold flex items-center gap-2"><Eye size={16} /> 42 Viewers</span>
              </button>
              
              {showViewers && (
                <div className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-4 mt-2 animate-in slide-in-from-bottom-4 duration-300">
                  <h4 className="text-white text-sm font-bold mb-4">Viewed By</h4>
                  <div className="flex flex-col gap-3 max-h-48 overflow-y-auto hide-scrollbar">
                    {['Luna', 'Charlie', 'Max', 'Bella'].map((viewer, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-bg-secondary border border-white/20">
                          <img src={`https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=100&q=80&sig=${i+20}`} className="w-full h-full object-cover" />
                        </div>
                        <span className="text-white font-medium text-sm">{viewer}</span>
                        <button className="ml-auto text-white/50 hover:text-white"><Heart size={16} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="absolute bottom-6 left-4 right-4 flex gap-3 pb-safe z-20">
              <div className="flex-1 bg-black/40 border border-white/30 rounded-full px-5 py-3 backdrop-blur-md">
                <input type="text" placeholder="Send message..." className="bg-transparent border-none outline-none text-white w-full placeholder:text-white/70 text-sm" />
              </div>
              <button className="w-12 h-12 rounded-full bg-black/40 border border-white/30 backdrop-blur-md flex items-center justify-center text-white hover:text-error transition-colors shrink-0">
                <Heart size={24} />
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Story Camera Overlay */}
      {isCameraOpen && (
        <StoryCamera
          onClose={() => setIsCameraOpen(false)}
          onPost={(imageUrl) => {
            setMyStory(imageUrl);
            setIsCameraOpen(false);
            publishStory(imageUrl).catch(() => {});
          }}
        />
      )}
    </div>
  );
}
