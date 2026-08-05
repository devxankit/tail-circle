import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, MoreVertical, Plus, Send, Image as ImageIcon, MapPin, User, Bell, BellOff, Flag, Trash2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
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
} from '../../../../services/social';
import { getStoredUser } from '../../../../services/auth';

const msgTime = (value) =>
  new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** "Online" is real now — this only formats the fallback when they're not. */
const formatLastSeen = (iso) => {
  if (!iso) return null;
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'Last seen just now';
  if (mins < 60) return `Last seen ${mins}m ago`;
  if (mins < 1440) return `Last seen ${Math.floor(mins / 60)}h ago`;
  return `Last seen ${new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short' })}`;
};

export function ChatRoom() {
  const navigate = useNavigate();
  const location = useLocation();
  const [msg, setMsg] = useState('');
  const [showAttach, setShowAttach] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const conversationId = location.state?.conversationId || null;
  const myId = String(getStoredUser()?._id || getStoredUser()?.id || '');

  const activePet = location.state?.pet || {
    name: 'Luna',
    img: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=100&q=80',
    breed: 'Siberian Husky'
  };

  const [messages, setMessages] = useState([]);
  const [muted, setMuted] = useState(false);

  // Real presence — fetched once, then kept live over Socket.IO. `null`
  // while loading so the header doesn't flash a wrong status.
  const [presence, setPresence] = useState(null);

  // Seed the Mute toggle from what's actually persisted, so re-opening the
  // room doesn't forget a mute from a previous visit.
  useEffect(() => {
    if (!conversationId) return;
    fetchConversation(conversationId).then((c) => setMuted(Boolean(c.muted))).catch(() => {});
  }, [conversationId]);

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

  // History from Mongo (REST) + live delivery over Socket.IO (deduped by key).
  useEffect(() => {
    if (!conversationId) return undefined;
    let unsubscribe = () => {};
    const seen = new Set();

    markConversationRead(conversationId).catch(() => {});

    fetchMessages(conversationId)
      .then((history) => {
        history.forEach((m) => seen.add(String(m._id)));
        setMessages(
          history.map((m) => ({
            id: m._id,
            type: m.type,
            text: m.text,
            url: m.mediaUrl,
            lat: m.meta?.lat ?? null,
            lng: m.meta?.lng ?? null,
            time: msgTime(m.createdAt),
            isSelf: String(m.senderId) === myId,
          }))
        );
      })
      .catch(() => {});

    subscribeToConversation(conversationId, (live) => {
      // Own messages already echo locally on send; the socket delivers the rest.
      if (String(live.senderId) === myId) return;
      if (seen.has(live.key)) return;
      seen.add(live.key);
      setMessages((prev) => [
        ...prev,
        {
          id: live.key,
          rtdbKey: live.key,
          type: live.type || 'text',
          text: live.text || '',
          url: live.mediaUrl,
          lat: live.meta?.lat ?? null,
          lng: live.meta?.lng ?? null,
          time: msgTime(live.at || Date.now()),
          isSelf: false,
        },
      ]);
    }).then((fn) => {
      unsubscribe = fn;
    });

    return () => unsubscribe();
  }, [conversationId]);

  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const menuRef = useRef(null);

  // Auto-scroll to the bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close menu when clicking outside
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

  const handleSendText = () => {
    if (!msg.trim()) return;

    const text = msg.trim();
    const newMsg = {
      id: Date.now(),
      type: 'text',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSelf: true
    };

    setMessages([...messages, newMsg]);
    setMsg('');
    if (conversationId) {
      sendChatMessage(conversationId, { type: 'text', text }).catch(() => {});
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSendText();
    }
  };

  const handleGalleryClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);

    const newMsg = {
      id: Date.now(),
      type: 'image',
      url: imageUrl,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSelf: true
    };

    setMessages([...messages, newMsg]);
    setShowAttach(false);
    e.target.value = '';

    if (conversationId) {
      try {
        const { api } = await import('../../../../services/api');
        const form = new FormData();
        form.append('file', file);
        form.append('folder', 'chat');
        const { data: asset } = await api.post('/uploads/image', form);
        await sendChatMessage(conversationId, { type: 'image', mediaUrl: asset.url || asset.secure_url });
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
        const newMsg = {
          id: Date.now(),
          type: 'location',
          lat,
          lng,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isSelf: true,
        };
        setMessages((prev) => [...prev, newMsg]);
        if (conversationId) {
          sendChatMessage(conversationId, { type: 'location', meta: { lat, lng } }).catch(() => {});
        }
      },
      () => alert("Couldn't get your location — check location permissions and try again."),
      { enableHighAccuracy: true, timeout: 8000 }
    );
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
          {presence?.online && (
            <span className="text-xs text-success font-medium">Online</span>
          )}
          {presence && !presence.online && presence.lastSeenAt && (
            <span className="text-xs text-text-secondary font-medium">{formatLastSeen(presence.lastSeenAt)}</span>
          )}
          {presence && !presence.online && !presence.lastSeenAt && presence.source !== 'unknown' && (
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
          <div key={m.id} className={`max-w-[75%] ${m.isSelf ? 'self-end' : 'self-start'}`}>
            
            {/* Text Message */}
            {m.type === 'text' && (
              <div className={`p-3 text-sm ${m.isSelf ? 'bg-primary-main text-white rounded-2xl rounded-tr-sm' : 'bg-white text-text-primary rounded-2xl rounded-tl-sm shadow-sm border border-border-light/50'}`}>
                {m.text}
              </div>
            )}
            
            {/* Image Message */}
            {m.type === 'image' && (
              <div className={`rounded-2xl overflow-hidden border border-border-light shadow-sm ${m.isSelf ? 'rounded-tr-sm bg-primary-main p-1' : 'rounded-tl-sm bg-white p-1'}`}>
                <img src={m.url} alt="Sent attachment" className="w-56 h-auto object-cover rounded-xl max-h-64" />
              </div>
            )}
            
            {/* Location Message — a real static map of the actual shared coordinates */}
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
            
            <span className={`text-[10px] text-text-secondary mt-1 block ${m.isSelf ? 'text-right mr-1' : 'ml-1'}`}>
              {m.time}
            </span>
          </div>
        ))}
        
        {/* Invisible div to scroll to bottom */}
        <div ref={chatEndRef} />
      </div>

      {/* Hidden File Input for Image Upload */}
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />

      {/* Attachment Sheet */}
      {showAttach && (
        <div className="bg-white border-t border-border-light p-4 flex gap-6 animate-in slide-in-from-bottom-2 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <button onClick={handleGalleryClick} className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 rounded-full bg-accent-teal/10 flex items-center justify-center text-accent-teal group-hover:scale-110 transition-transform">
              <ImageIcon size={24} />
            </div>
            <span className="text-xs text-text-secondary font-medium">Gallery</span>
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
            onChange={(e) => setMsg(e.target.value)}
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
