import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, MoreVertical, Heart, MessageCircle, Plus, X, Eye, ChevronUp, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { StoryCamera } from './StoryCamera';
import {
  fetchConversations,
  fetchStories,
  publishStory,
  fetchStoryViewers,
  toggleStoryLike,
  viewStory,
  sendChatMessage,
} from '../../../../services/social';
import { getSocket } from '../../../../services/socket';

const chatTime = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'short' });
};

const storyAge = (iso) => {
  if (!iso) return '';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h`;
};

export function ChatList({ setView }) {
  const navigate = useNavigate();

  const [activeStory, setActiveStory] = useState(null);
  const [myStory, setMyStory] = useState(null); // { id, mediaUrl, createdAt } | null
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState([]); // real "Viewed By" list for myStory
  const [myStoryStats, setMyStoryStats] = useState({ viewsCount: 0, likesCount: 0 });
  const [storyReply, setStoryReply] = useState('');
  const [replySent, setReplySent] = useState(false);
  const [storyError, setStoryError] = useState('');
  // Like state for the story currently open, keyed by story id so reopening
  // one doesn't briefly show the previous story's tally.
  const [likeState, setLikeState] = useState({ id: null, liked: false, count: 0, busy: false });
  const [likeToast, setLikeToast] = useState('');

  useEffect(() => {
    let timer;
    if (activeStory) {
      if (!activeStory.isMine) {
        // Record story view in backend
        if (activeStory.id) {
          viewStory(activeStory.id).catch(() => {});
        }
        timer = setTimeout(() => {
          setActiveStory(null);
        }, 5000);
      }
    }
    return () => clearTimeout(timer);
  }, [activeStory]);

  // Story circles are other people's live stories; the ring lights up from the
  // server's own `viewed` flag, so it clears once you've actually watched one.
  const [stories, setStories] = useState([]);
  const [chats, setChats] = useState([]);

  useEffect(() => {
    // Only conversations are needed here now — the story rail loads real
    // stories separately, so the matches request this used to make was doing
    // nothing but feeding circles that were never stories.
    fetchConversations()
      .then((conversations) => {
        setChats(
          conversations.map((c) => ({
            conversationId: c._id,
            name: c.counterpart?.name || 'Chat',
            msg: c.lastMessage || 'Say hi! 👋',
            time: chatTime(c.lastMessageAt),
            unread: c.unreadCount || 0,
            img: c.counterpart?.image || '',
          }))
        );
      })
      .catch(() => {
        setChats([]);
      });
    /*
     * The rail used to be populated from `fetchMatches()` — the circles were
     * matches wearing story styling, so nobody's actual story ever appeared,
     * and tapping one called `viewStory()` with a Match id that no Story could
     * ever resolve. Real stories now feed it.
     */
    Promise.all([
      fetchStories(),
      import('../../../../services/auth').then((m) => m.getStoredUser()),
    ])
      .then(([active, me]) => {
        const myId = String(me?._id || me?.id || '');
        const mine = active.find((s) => String(s.userId) === myId);
        if (mine) setMyStory({ id: mine._id, mediaUrl: mine.mediaUrl, createdAt: mine.createdAt });
        setStories(
          active
            .filter((s) => String(s.userId) !== myId)
            .map((s) => ({
              id: s._id,
              name: s.userName || 'Pet Parent',
              img: s.mediaUrl,
              caption: s.caption || '',
              // The server already tells us whether I have watched this one.
              hasUnseen: !s.viewed,
              likesCount: s.likesCount || 0,
              likedByMe: Boolean(s.likedByMe),
            }))
        );
      })
      .catch(() => {});
  }, []);

  /*
   * Someone liking my story while I have it open should show up without a
   * refresh — the same event the in-app notification rides on.
   */
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;
    const onLiked = ({ storyId, userName, userAvatar, userId }) => {
      if (!myStory || String(storyId) !== String(myStory.id)) return;
      setMyStoryStats((prev) => ({ ...prev, likesCount: prev.likesCount + 1 }));
      setViewers((prev) =>
        prev.map((v) => (String(v.viewerId) === String(userId) ? { ...v, liked: true } : v))
      );
      setLikeToast(`${userName || 'Someone'} liked your story`);
      void userAvatar;
      window.setTimeout(() => setLikeToast(''), 3000);
    };
    socket.on('story:liked', onLiked);
    return () => socket.off('story:liked', onLiked);
  }, [myStory]);

  const totalUnread = chats.reduce((sum, c) => sum + (c.unread || 0), 0);

  /*
   * Like state for the story on screen. Derived rather than seeded from an
   * effect: `likeState` only holds a value once I've actually tapped, so
   * until then the story's own server-provided numbers are the truth. Keying
   * on the id means reopening a different story can't inherit the last one's
   * tally.
   */
  const activeLike =
    activeStory && String(likeState.id) === String(activeStory.id)
      ? likeState
      : {
          id: activeStory?.id ?? null,
          liked: Boolean(activeStory?.likedByMe),
          count: activeStory?.likesCount || 0,
          busy: false,
        };

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
              {totalUnread > 0 && (
                <span className="absolute top-[6px] right-[6px] w-2 h-2 bg-error rounded-full border border-white"></span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Stories / New Matches Row */}
      <div className="py-4 border-b border-border-light">
        {/* A failed upload used to be swallowed, so a story that never posted
            looked exactly like one that did. */}
        {storyError && (
          <div className="mx-4 mb-3 flex items-start gap-2 rounded-xl bg-error/10 border border-error/20 px-3 py-2">
            <p className="text-xs font-semibold text-error leading-snug flex-1">{storyError}</p>
            <button onClick={() => setStoryError('')} className="text-error/60 hover:text-error text-xs font-bold">
              Dismiss
            </button>
          </div>
        )}
        <h3 className="px-4 text-xs font-bold text-text-secondary uppercase mb-3">Stories & Matches</h3>
        <div className="flex overflow-x-auto hide-scrollbar px-4 pb-1 gap-3">
          {/* Add Your Story */}
          <div
            onClick={() => {
              if (myStory) {
                setActiveStory({ id: myStory.id, name: 'Your Story', img: myStory.mediaUrl, createdAt: myStory.createdAt, isMine: true });
                setViewers([]);
                fetchStoryViewers(myStory.id)
                  .then(({ viewers: list, viewsCount, likesCount }) => {
                    setViewers(list);
                    setMyStoryStats({ viewsCount, likesCount });
                  })
                  .catch(() => {
                    setViewers([]);
                    setMyStoryStats({ viewsCount: 0, likesCount: 0 });
                  });
              } else {
                setIsCameraOpen(true);
              }
            }}
            className="flex flex-col items-center gap-1 cursor-pointer w-[72px] shrink-0"
          >
            <div className="w-16 h-16 shrink-0 rounded-full relative">
              <div className={cn("w-full h-full rounded-full overflow-hidden border-2 transition-all", myStory ? "border-primary-main p-[2px]" : "border-transparent bg-bg-secondary")}>
                <img src={myStory?.mediaUrl || "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=100&q=80"} alt="Your Story" className={cn("w-full h-full object-cover rounded-full", !myStory && "opacity-80")} />
              </div>
              {!myStory && (
                <div className="absolute bottom-0 right-0 bg-primary-main w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-white shadow-sm">
                  <Plus size={12} strokeWidth={4} />
                </div>
              )}
            </div>
            <span className="w-full truncate text-center text-xs font-medium text-text-secondary">Your Story</span>
          </div>

          {/* Other Stories */}
          {stories.map(story => (
            <div 
              key={story.id} 
              onClick={() => setActiveStory(story)}
              className="flex flex-col items-center gap-1 cursor-pointer w-[72px] shrink-0"
            >
              <div className={cn("w-16 h-16 shrink-0 rounded-full p-[2px]", story.hasUnseen ? "bg-gradient-to-tr from-primary-main to-accent-yellow" : "bg-border-light")}>
                <div className="w-full h-full rounded-full border-2 border-white overflow-hidden bg-bg-secondary">
                  <img src={story.img} alt={story.name} className="w-full h-full object-cover" />
                </div>
              </div>
              <span className="w-full truncate text-center text-xs font-medium text-text-primary">{story.name}</span>
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
            <div className="ml-4 min-w-0 flex-1 border-b border-border-light/50 pb-4">
              <div className="flex justify-between items-center gap-2 mb-1">
                <h4 className="truncate font-bold text-text-primary text-base">{chat.name}</h4>
                <span className="shrink-0 text-xs text-text-secondary">{chat.time}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <p className={`min-w-0 flex-1 truncate text-sm ${chat.unread ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
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
                <img src={activeStory.isMine ? "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=100&q=80" : activeStory.img} alt="avatar" className="w-full h-full object-cover" />
              </div>
              <span className="text-white font-bold drop-shadow-md">{activeStory.name}</span>
              {activeStory.createdAt && <span className="text-white/70 text-xs ml-2">{storyAge(activeStory.createdAt)}</span>}
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
              {/* A like landing while I'm watching my own story. */}
              {likeToast && (
                <div className="mb-3 flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md border border-white/25 px-4 py-2 animate-in slide-in-from-bottom-2 duration-300">
                  <Heart size={14} className="fill-error text-error shrink-0" />
                  <span className="text-white text-xs font-semibold">{likeToast}</span>
                </div>
              )}
              <button
                onClick={() => setShowViewers(!showViewers)}
                className="text-white flex flex-col items-center gap-1 hover:text-primary-main transition-colors mb-2"
              >
                <ChevronUp size={24} className={showViewers ? "rotate-180 transition-transform" : "transition-transform"} />
                <span className="text-sm font-bold flex items-center gap-4">
                  <span className="flex items-center gap-2"><Eye size={16} /> {myStoryStats.viewsCount} {myStoryStats.viewsCount === 1 ? 'Viewer' : 'Viewers'}</span>
                  <span className="flex items-center gap-2"><Heart size={16} className={myStoryStats.likesCount > 0 ? 'fill-error text-error' : ''} /> {myStoryStats.likesCount} {myStoryStats.likesCount === 1 ? 'Like' : 'Likes'}</span>
                </span>
              </button>

              {showViewers && (
                <div className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-4 mt-2 animate-in slide-in-from-bottom-4 duration-300">
                  <h4 className="text-white text-sm font-bold mb-4">Viewed By</h4>
                  {viewers.length === 0 ? (
                    <p className="text-white/60 text-sm text-center py-2">No views yet</p>
                  ) : (
                    <div className="flex flex-col gap-3 max-h-48 overflow-y-auto hide-scrollbar">
                      {viewers.map((v) => (
                        <div key={v._id} className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-bg-secondary border border-white/20">
                            {v.viewerAvatar ? (
                              <img src={v.viewerAvatar} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-primary-main/30 text-white text-xs font-bold">
                                {(v.viewerName || '?')[0]}
                              </div>
                            )}
                          </div>
                          <span className="min-w-0 flex-1 truncate text-white font-medium text-sm">{v.viewerName || 'Pet Parent'}</span>
                          {v.liked && <Heart size={16} className="fill-error text-error shrink-0" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="absolute bottom-6 left-4 right-4 flex gap-3 pb-safe z-20">
              <div className="flex-1 bg-black/40 border border-white/30 rounded-full px-5 py-2.5 backdrop-blur-md flex items-center">
                <input 
                  type="text" 
                  value={storyReply}
                  onChange={(e) => setStoryReply(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && storyReply.trim()) {
                      const text = storyReply.trim();
                      setStoryReply('');
                      setReplySent(true);
                      setTimeout(() => setReplySent(false), 2500);
                      
                      // Find or navigate to conversation
                      const matchingChat = chats.find(c => c.name === activeStory.name);
                      if (matchingChat?.conversationId) {
                        await sendChatMessage(matchingChat.conversationId, {
                          type: 'story_reply',
                          text,
                          meta: { storyMediaUrl: activeStory.img, storyCaption: activeStory.name }
                        }).catch(() => {});
                      }
                    }
                  }}
                  placeholder={replySent ? "✓ Reply sent!" : `Reply to ${activeStory.name}...`} 
                  className="bg-transparent border-none outline-none text-white w-full placeholder:text-white/70 text-sm" 
                />
              </div>
              {/*
                * This used to fire a canned "Loved X's story!" chat message,
                * and only when a conversation happened to share the story
                * author's display name — so it silently did nothing for most
                * stories and recorded no like anywhere. It is now a real like:
                * the server persists it and notifies the owner in-app and by
                * push. The count is applied optimistically and then replaced
                * with the server's authoritative number.
                */}
              <button
                disabled={activeLike.busy}
                onClick={async () => {
                  if (activeLike.busy || !activeStory.id) return;
                  const next = !activeLike.liked;
                  setLikeState({
                    id: activeStory.id,
                    liked: next,
                    count: Math.max(0, activeLike.count + (next ? 1 : -1)),
                    busy: true,
                  });
                  try {
                    const { liked, likesCount } = await toggleStoryLike(activeStory.id);
                    setLikeState({ id: activeStory.id, liked, count: likesCount, busy: false });
                    setStories((prev) =>
                      prev.map((st) =>
                        String(st.id) === String(activeStory.id)
                          ? { ...st, likedByMe: liked, likesCount }
                          : st
                      )
                    );
                  } catch {
                    // Put the button back the way it was rather than showing a
                    // like that never reached the server.
                    setLikeState({
                      id: activeStory.id,
                      liked: activeLike.liked,
                      count: activeLike.count,
                      busy: false,
                    });
                  }
                }}
                aria-pressed={activeLike.liked}
                aria-label={activeLike.liked ? 'Unlike story' : 'Like story'}
                className="relative w-12 h-12 rounded-full bg-black/40 border border-white/30 backdrop-blur-md flex items-center justify-center text-white hover:text-error transition-colors shrink-0 disabled:opacity-70"
              >
                <Heart
                  size={24}
                  className={cn(
                    'transition-transform',
                    activeLike.liked && 'fill-error text-error scale-110'
                  )}
                />
                {activeLike.count > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center border-2 border-black/40">
                    {activeLike.count}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Story Camera Overlay */}
      {isCameraOpen && (
        <StoryCamera
          onClose={() => setIsCameraOpen(false)}
          onPost={async (imageUrl) => {
            setIsCameraOpen(false);
            try {
              /*
               * Keep the story the server actually created.
               *
               * This used to `setMyStory(imageUrl)` — a bare string — so
               * `myStory.mediaUrl` was undefined and the ring fell back to the
               * placeholder image (the story looked like it never uploaded),
               * while `myStory.id` was undefined too, which is what produced
               * `GET /stories/undefined/viewers`. The publish call was also
               * fire-and-forget, so a rejected upload looked like a success.
               */
              const created = await publishStory(imageUrl);
              setMyStory({
                id: created._id || created.id,
                mediaUrl: created.mediaUrl,
                createdAt: created.createdAt,
              });
              setStoryError('');
            } catch (e) {
              setStoryError(e?.message || 'Could not post your story. Please try again.');
            }
          }}
        />
      )}
    </div>
  );
}
