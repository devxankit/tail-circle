import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, MoreVertical, Plus, Send, Image as ImageIcon, MapPin, User, Bell, BellOff, Flag, Trash2, FileText, Check, CheckCheck, Smile, Download, Sparkles, X } from 'lucide-react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  fetchMessages,
  sendChatMessage,
  subscribeToConversation,
  fetchConversationPresence,
  subscribeToPresence,
  markConversationRead,
  fetchConversation,
  setConversationMuted,
  clearConversation,
  reportAndBlockConversation,
  reactToChatMessage,
  deleteChatMessage,
  sendTypingSignal,
  subscribeToTyping,
  subscribeToReactions,
  subscribeToReadReceipts,
  subscribeToDeletions,
} from '../../../../services/social';
import { getStoredUser } from '../../../../services/auth';

const msgTime = (value) =>
  new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatFileSize = (bytes) => {
  if (!bytes) return 'File';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatLastSeen = (iso) => {
  if (!iso) return null;
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'Last seen just now';
  if (mins < 60) return `Last seen ${mins}m ago`;
  if (mins < 1440) return `Last seen ${Math.floor(mins / 60)}h ago`;
  return `Last seen ${new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short' })}`;
};

const EMOJI_OPTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

export function ChatRoom() {
  const navigate = useNavigate();
  const location = useLocation();
  const [msg, setMsg] = useState('');
  const [showAttach, setShowAttach] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const params = useParams();
  /*
   * The URL wins, router state is the fallback.
   *
   * Reading only `location.state` meant a chat opened from a match link, a push
   * notification, or a plain page refresh arrived with no conversation at all —
   * the screen rendered its placeholder pet and loaded no messages.
   */
  const conversationId = params.conversationId || location.state?.conversationId || null;
  const myId = String(getStoredUser()?._id || getStoredUser()?.id || '');

  /*
   * Who this chat is with. Router state when we arrived from the chat list,
   * otherwise the conversation's own `counterpart`, fetched below — opening a
   * chat straight from a match link used to fall through to a hard-coded
   * "Luna", so the header named the wrong pet entirely.
   */
  const [activePet, setActivePet] = useState(
    location.state?.pet || { name: 'Chat', img: '', breed: '' }
  );

  const [messages, setMessages] = useState([]);
  const [muted, setMuted] = useState(false);
  const [presence, setPresence] = useState(null);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [activeReactionMenuMsgId, setActiveReactionMenuMsgId] = useState(null);
  const [participants, setParticipants] = useState([]);

  const typingTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const menuRef = useRef(null);

  // Seed Mute and participants
  useEffect(() => {
    if (!conversationId) return;
    fetchConversation(conversationId).then((c) => {
      setMuted(Boolean(c.muted));
      if (Array.isArray(c.participants)) {
        setParticipants(c.participants.map(String));
      }
      // Only fill the header from the conversation when we did not already
      // arrive with the pet, so the chat list's richer card still wins.
      if (!location.state?.pet && c.counterpart?.name) {
        setActivePet({
          name: c.counterpart.name,
          img: c.counterpart.image || '',
          breed: c.counterpart.subtitle || '',
        });
      }
    }).catch(() => {});
  }, [conversationId]);

  // Presence Subscription
  useEffect(() => {
    if (!conversationId) return undefined;
    let unsubscribe = () => {};

    fetchConversationPresence(conversationId)
      .then(setPresence)
      .catch(() => setPresence({ online: false, lastSeenAt: null, source: 'unknown' }));

    subscribeToPresence((update) => {
      setPresence((prev) => {
        if (!prev?.userId || String(update.userId) !== String(prev.userId)) return prev;
        return { ...prev, online: update.online, lastSeenAt: update.lastSeenAt };
      });
    }).then((fn) => {
      unsubscribe = fn;
    });

    return () => unsubscribe();
  }, [conversationId]);

  // Realtime Subscriptions (Messages, Typing, Reactions, Reads, Deletions)
  useEffect(() => {
    if (!conversationId) return undefined;
    let unsubMsg = () => {};
    let unsubTyping = () => {};
    let unsubReact = () => {};
    let unsubRead = () => {};
    let unsubDelete = () => {};
    const seen = new Set();

    markConversationRead(conversationId).catch(() => {});

    fetchMessages(conversationId)
      .then((history) => {
        history.forEach((m) => seen.add(String(m._id)));
        setMessages(
          history.map((m) => ({
            id: String(m._id),
            type: m.type,
            text: m.text,
            url: m.mediaUrl,
            lat: m.meta?.lat ?? null,
            lng: m.meta?.lng ?? null,
            meta: m.meta ?? null,
            reactions: m.reactions || [],
            readBy: m.readBy || [],
            time: msgTime(m.createdAt),
            isSelf: String(m.senderId) === myId,
          }))
        );
      })
      .catch(() => {});

    subscribeToConversation(conversationId, (live) => {
      if (String(live.senderId) === myId) return;
      if (seen.has(live.key)) return;
      seen.add(live.key);
      setMessages((prev) => [
        ...prev,
        {
          id: live.key,
          type: live.type || 'text',
          text: live.text || '',
          url: live.mediaUrl,
          lat: live.meta?.lat ?? null,
          lng: live.meta?.lng ?? null,
          meta: live.meta ?? null,
          reactions: live.reactions || [],
          readBy: live.readBy || [],
          time: msgTime(live.at || Date.now()),
          isSelf: false,
        },
      ]);
      markConversationRead(conversationId).catch(() => {});
    }).then((fn) => { unsubMsg = fn; });

    subscribeToTyping(conversationId, (payload) => {
      if (String(payload.userId) !== myId) {
        setIsPeerTyping(Boolean(payload.isTyping));
      }
    }).then((fn) => { unsubTyping = fn; });

    subscribeToReactions(conversationId, (payload) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === payload.messageId ? { ...m, reactions: payload.reactions || [] } : m
        )
      );
    }).then((fn) => { unsubReact = fn; });

    subscribeToReadReceipts(conversationId, (payload) => {
      setMessages((prev) =>
        prev.map((m) => (m.isSelf ? { ...m, isRead: true } : m))
      );
    }).then((fn) => { unsubRead = fn; });

    subscribeToDeletions(conversationId, (payload) => {
      setMessages((prev) => prev.filter((m) => m.id !== payload.messageId));
    }).then((fn) => { unsubDelete = fn; });

    return () => {
      unsubMsg();
      unsubTyping();
      unsubReact();
      unsubRead();
      unsubDelete();
    };
  }, [conversationId, myId]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPeerTyping]);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showMenu]);

  // Typing event handler
  const handleInputChange = (e) => {
    const val = e.target.value;
    setMsg(val);

    if (conversationId && participants.length > 0) {
      sendTypingSignal(conversationId, participants, true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        sendTypingSignal(conversationId, participants, false);
      }, 2000);
    }
  };

  const handleSendText = () => {
    if (!msg.trim()) return;

    const text = msg.trim();
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (conversationId && participants.length > 0) {
      sendTypingSignal(conversationId, participants, false);
    }

    const tempId = String(Date.now());
    const newMsg = {
      id: tempId,
      type: 'text',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSelf: true,
      reactions: [],
      isRead: false,
    };

    setMessages((prev) => [...prev, newMsg]);
    setMsg('');

    if (conversationId) {
      sendChatMessage(conversationId, { type: 'text', text })
        .then((res) => {
          if (res?.id) {
            setMessages((prev) =>
              prev.map((m) => (m.id === tempId ? { ...m, id: String(res.id) } : m))
            );
          }
        })
        .catch(() => {});
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSendText();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    const tempId = String(Date.now());

    const newMsg = {
      id: tempId,
      type: 'image',
      url: imageUrl,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSelf: true,
      reactions: [],
      isRead: false,
    };

    setMessages((prev) => [...prev, newMsg]);
    setShowAttach(false);
    e.target.value = '';

    if (conversationId) {
      try {
        const { api } = await import('../../../../services/api');
        const form = new FormData();
        form.append('file', file);
        form.append('folder', 'chat');
        const { data: asset } = await api.post('/uploads/image', form);
        const res = await sendChatMessage(conversationId, { type: 'image', mediaUrl: asset.url || asset.secure_url });
        if (res?.id) {
          setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, id: String(res.id) } : m)));
        }
      } catch { /* local preview stays */ }
    }
  };

  const handleDocumentChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileUrl = URL.createObjectURL(file);
    const tempId = String(Date.now());

    const newMsg = {
      id: tempId,
      type: 'document',
      url: fileUrl,
      meta: {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      },
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSelf: true,
      reactions: [],
      isRead: false,
    };

    setMessages((prev) => [...prev, newMsg]);
    setShowAttach(false);
    e.target.value = '';

    if (conversationId) {
      try {
        const { api } = await import('../../../../services/api');
        const form = new FormData();
        form.append('files', file);
        form.append('folder', 'chat-docs');
        const { data } = await api.post('/uploads/files', form);
        const uploaded = data[0];
        const resUrl = uploaded?.url || uploaded?.secure_url || fileUrl;

        const res = await sendChatMessage(conversationId, {
          type: 'document',
          mediaUrl: resUrl,
          meta: { fileName: file.name, fileSize: file.size, fileType: file.type }
        });
        if (res?.id) {
          setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, id: String(res.id) } : m)));
        }
      } catch { /* local preview stays */ }
    }
  };

  const handleSendLocation = () => {
    setShowAttach(false);
    if (!('geolocation' in navigator)) {
      alert('Location sharing is not supported on this device.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const tempId = String(Date.now());
        const newMsg = {
          id: tempId,
          type: 'location',
          lat,
          lng,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isSelf: true,
          reactions: [],
          isRead: false,
        };
        setMessages((prev) => [...prev, newMsg]);
        if (conversationId) {
          sendChatMessage(conversationId, { type: 'location', meta: { lat, lng } })
            .then((res) => {
              if (res?.id) setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, id: String(res.id) } : m)));
            })
            .catch(() => {});
        }
      },
      () => alert("Couldn't get your location — check location permissions and try again."),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleReact = (messageId, emoji) => {
    setActiveReactionMenuMsgId(null);
    if (!conversationId) return;
    
    // Local optimistic update
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const existing = (m.reactions || []).filter((r) => r.userId !== myId);
        return {
          ...m,
          reactions: [...existing, { userId: myId, emoji }]
        };
      })
    );

    reactToChatMessage(conversationId, messageId, emoji).catch(() => {});
  };

  const handleDeleteMsg = (messageId) => {
    setActiveReactionMenuMsgId(null);
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    if (conversationId) {
      deleteChatMessage(conversationId, messageId, 'everyone').catch(() => {});
    }
  };

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    setShowMenu(false);
    if (conversationId) setConversationMuted(conversationId, next).catch(() => setMuted(!next));
  };

  const handleClearChat = () => {
    setShowMenu(false);
    setMessages([]);
    if (conversationId) clearConversation(conversationId).catch(() => {});
  };

  const handleReportBlock = () => {
    setShowMenu(false);
    if (!conversationId) return navigate(-1);
    const reason = window.prompt("What's wrong with this chat? (optional)") || '';
    reportAndBlockConversation(conversationId, reason)
      .then(() => navigate(-1))
      .catch(() => alert('Could not submit the report — please try again.'));
  };

  return (
    <div className="flex flex-col h-full bg-bg-secondary w-full absolute inset-0 z-50 animate-in slide-in-from-right-4 duration-300">
      {/* Header */}
      <div className="flex items-center px-4 py-3 bg-white border-b border-border-light z-20 sticky top-0 shadow-sm relative">
        <button onClick={() => navigate(-1)} className="mr-3 p-1 rounded-full hover:bg-bg-secondary">
          <ArrowLeft size={24} />
        </button>
        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
          <img src={activePet.img} alt={activePet.name} className="w-full h-full object-cover" />
        </div>
        <div className="ml-3 flex-1 cursor-pointer" onClick={() => navigate('/app/profile')}>
          <h2 className="font-bold text-text-primary text-base leading-tight">{activePet.name}</h2>
          {isPeerTyping ? (
            <span className="text-xs text-primary-main font-bold animate-pulse flex items-center gap-1">
              <Sparkles size={12} /> typing...
            </span>
          ) : presence?.online ? (
            <span className="text-xs text-success font-medium">Online</span>
          ) : presence && !presence.online && presence.lastSeenAt ? (
            <span className="text-xs text-text-secondary font-medium">{formatLastSeen(presence.lastSeenAt)}</span>
          ) : (
            <span className="text-xs text-text-secondary font-medium">Offline</span>
          )}
        </div>
        
        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setShowMenu(!showMenu)} 
            className={`p-2 rounded-full transition-colors ${showMenu ? 'bg-bg-secondary' : 'hover:bg-bg-secondary'}`}
          >
            <MoreVertical size={20} className="text-text-secondary" />
          </button>
          
          {/* Dropdown Menu */}
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-border-light py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
              <button 
                onClick={() => { setShowMenu(false); navigate('/app/profile'); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-secondary text-sm text-text-primary transition-colors"
              >
                <User size={16} /> View Profile
              </button>
              <button
                onClick={handleToggleMute}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-secondary text-sm text-text-primary transition-colors"
              >
                {muted ? <Bell size={16} /> : <BellOff size={16} />} {muted ? 'Unmute Notifications' : 'Mute Notifications'}
              </button>
              <div className="h-[1px] bg-border-light my-1"></div>
              <button
                onClick={handleClearChat}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-error/10 text-sm text-error transition-colors"
              >
                <Trash2 size={16} /> Clear Chat
              </button>
              <button
                onClick={handleReportBlock}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-error/10 text-sm text-error transition-colors"
              >
                <Flag size={16} /> Report / Block
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <div className="text-center text-xs text-text-disabled my-2 font-medium">Today</div>
        
        {messages.map((m) => (
          <div key={m.id} className={`group relative max-w-[80%] sm:max-w-[75%] ${m.isSelf ? 'self-end' : 'self-start'}`}>
            
            {/* Quick Action Button Bar on Hover / Click */}
            <div className={`absolute top-0 -translate-y-1/2 hidden group-hover:flex items-center gap-1 bg-white border border-border-light shadow-md rounded-full px-2 py-0.5 z-20 ${m.isSelf ? 'left-0 -translate-x-full mr-2' : 'right-0 translate-x-full ml-2'}`}>
              <button
                onClick={() => setActiveReactionMenuMsgId(activeReactionMenuMsgId === m.id ? null : m.id)}
                className="p-1 text-gray-500 hover:text-primary-main rounded-full transition"
                title="React with emoji"
              >
                <Smile size={14} />
              </button>
              {m.isSelf && (
                <button
                  onClick={() => handleDeleteMsg(m.id)}
                  className="p-1 text-gray-500 hover:text-red-600 rounded-full transition"
                  title="Delete message"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            {/* Emoji Selector Bar */}
            {activeReactionMenuMsgId === m.id && (
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-full px-3 py-1.5 shadow-xl flex gap-2 z-30 animate-in fade-in zoom-in-95 border border-slate-700">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReact(m.id, emoji)}
                    className="hover:scale-125 transition-transform text-base"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Text Message */}
            {m.type === 'text' && (
              <div className={`p-3 text-sm ${m.isSelf ? 'bg-primary-main text-white rounded-2xl rounded-tr-sm' : 'bg-white text-text-primary rounded-2xl rounded-tl-sm shadow-sm border border-border-light/50'}`}>
                {m.text}
              </div>
            )}

            {/* Story Reply Message */}
            {m.type === 'story_reply' && (
              <div className={`p-3 text-sm flex flex-col gap-2 ${m.isSelf ? 'bg-primary-main text-white rounded-2xl rounded-tr-sm' : 'bg-white text-text-primary rounded-2xl rounded-tl-sm shadow-sm border border-border-light/50'}`}>
                <div className="bg-black/20 backdrop-blur-xs rounded-xl p-2 flex items-center gap-2 border border-white/20">
                  {m.meta?.storyMediaUrl && (
                    <img src={m.meta.storyMediaUrl} alt="Story preview" className="w-10 h-10 object-cover rounded-lg shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold opacity-80 uppercase tracking-wider">Replied to Story</p>
                    <p className="text-xs truncate font-medium">{m.meta?.storyCaption || 'Story photo'}</p>
                  </div>
                </div>
                <p className="font-medium">{m.text}</p>
              </div>
            )}
            
            {/* Image Message */}
            {m.type === 'image' && (
              <div className={`rounded-2xl overflow-hidden border border-border-light shadow-sm ${m.isSelf ? 'rounded-tr-sm bg-primary-main p-1' : 'rounded-tl-sm bg-white p-1'}`}>
                <img src={m.url} alt="Sent attachment" className="w-56 h-auto object-cover rounded-xl max-h-64" />
              </div>
            )}

            {/* Document Message */}
            {m.type === 'document' && (
              <div className={`p-3 text-sm flex items-center gap-3 ${m.isSelf ? 'bg-primary-main text-white rounded-2xl rounded-tr-sm' : 'bg-white text-text-primary rounded-2xl rounded-tl-sm shadow-sm border border-border-light/50'}`}>
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <FileText size={20} className={m.isSelf ? "text-white" : "text-primary-main"} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-xs truncate">{m.meta?.fileName || 'Attachment Document'}</p>
                  <p className="text-[10px] opacity-80">{formatFileSize(m.meta?.fileSize)}</p>
                </div>
                {m.url && (
                  <a
                    href={m.url}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition shrink-0"
                    title="Download File"
                  >
                    <Download size={16} />
                  </a>
                )}
              </div>
            )}
            
            {/* Location Message */}
            {m.type === 'location' && (
              <a
                href={m.lat != null ? `https://www.openstreetmap.org/?mlat=${m.lat}&mlon=${m.lng}#map=16/${m.lat}/${m.lng}` : undefined}
                target="_blank"
                rel="noreferrer"
                className={`p-3 text-sm flex flex-col gap-2 ${m.isSelf ? 'bg-primary-main text-white rounded-2xl rounded-tr-sm' : 'bg-white text-text-primary rounded-2xl rounded-tl-sm shadow-sm border border-border-light/50'}`}
              >
                <div className="w-full h-24 bg-gray-200 rounded-xl overflow-hidden relative">
                  {m.lat != null ? (
                    <img
                      src={`https://staticmap.openstreetmap.de/staticmap.php?center=${m.lat},${m.lng}&zoom=15&size=300x150&markers=${m.lat},${m.lng},red-pushpin`}
                      alt="Shared location map"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-secondary text-xs">Location unavailable</div>
                  )}
                </div>
                <div className="font-medium flex items-center gap-1">
                  <MapPin size={14} className={m.isSelf ? "text-white" : "text-primary-main"} />
                  <span className="truncate">Shared Location</span>
                </div>
              </a>
            )}

            {/* Emoji Reactions Badges */}
            {m.reactions && m.reactions.length > 0 && (
              <div className={`flex flex-wrap gap-1 mt-1 ${m.isSelf ? 'justify-end' : 'justify-start'}`}>
                {m.reactions.map((r, i) => (
                  <span key={i} className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-white border border-border-light rounded-full text-xs shadow-xs">
                    {r.emoji}
                  </span>
                ))}
              </div>
            )}
            
            {/* Message Footer (Time & Read Checkmarks) */}
            <div className={`flex items-center gap-1 text-[10px] text-text-secondary mt-1 ${m.isSelf ? 'justify-end mr-1' : 'ml-1'}`}>
              <span>{m.time}</span>
              {m.isSelf && (
                m.isRead || (m.readBy && m.readBy.length > 0) ? (
                  <CheckCheck size={14} className="text-blue-500" title="Read" />
                ) : (
                  <Check size={14} className="text-text-secondary" title="Sent" />
                )
              )}
            </div>
          </div>
        ))}

        {/* Peer Typing Animation */}
        {isPeerTyping && (
          <div className="self-start max-w-[60%] bg-white border border-border-light rounded-2xl rounded-tl-sm p-3 shadow-xs flex items-center gap-2">
            <span className="w-2 h-2 bg-primary-main rounded-full animate-ping"></span>
            <span className="text-xs text-text-secondary font-medium">{activePet.name} is typing...</span>
          </div>
        )}
        
        <div ref={chatEndRef} />
      </div>

      {/* Hidden File Inputs */}
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />
      <input 
        type="file" 
        accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" 
        ref={docInputRef} 
        onChange={handleDocumentChange} 
        className="hidden" 
      />

      {/* Attachment Sheet */}
      {showAttach && (
        <div className="bg-white border-t border-border-light p-4 flex gap-6 animate-in slide-in-from-bottom-2 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 rounded-full bg-accent-teal/10 flex items-center justify-center text-accent-teal group-hover:scale-110 transition-transform">
              <ImageIcon size={24} />
            </div>
            <span className="text-xs text-text-secondary font-medium">Gallery</span>
          </button>
          <button onClick={() => docInputRef.current?.click()} className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
              <FileText size={24} />
            </div>
            <span className="text-xs text-text-secondary font-medium">Document</span>
          </button>
          <button onClick={handleSendLocation} className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 rounded-full bg-accent-yellow/10 flex items-center justify-center text-accent-yellow group-hover:scale-110 transition-transform">
              <MapPin size={24} />
            </div>
            <span className="text-xs text-text-secondary font-medium">Location</span>
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white p-3 flex items-center gap-2 border-t border-border-light z-20">
        <button 
          onClick={() => setShowAttach(!showAttach)}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors shrink-0 ${showAttach ? 'bg-primary-main text-white shadow-sm rotate-45' : 'hover:bg-bg-secondary text-text-secondary'}`}
        >
          <Plus size={24} className="transition-transform duration-200" />
        </button>
        <div className="flex-1 bg-bg-secondary rounded-full flex items-center px-4 h-12 border border-transparent focus-within:border-primary-main/30 transition-colors">
          <input 
            type="text" 
            placeholder="Type a message..." 
            className="flex-1 bg-transparent outline-none text-sm text-text-primary placeholder:text-text-disabled"
            value={msg}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
          />
        </div>
        <button 
          onClick={handleSendText}
          disabled={!msg.trim()}
          className="w-12 h-12 rounded-full bg-primary-main flex items-center justify-center text-white shrink-0 shadow-md hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:shadow-none"
        >
          <Send size={20} className="ml-1" />
        </button>
      </div>
    </div>
  );
}
