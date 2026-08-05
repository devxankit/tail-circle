import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Phone, Image as ImageIcon, Send, Paperclip } from 'lucide-react';
import { getPetById } from '../../../../../services/adoptApi';
import {
  ensureAdoptionConversation,
  fetchMessages,
  sendChatMessage,
  subscribeToConversation,
} from '../../../../../services/social';
import { getStoredUser } from '../../../../../services/auth';

const msgTime = (v) => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export function ShelterChat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pet, setPet] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [conversationId, setConversationId] = useState(null);

  const location = useLocation();

  useEffect(() => {
    let unsubscribe = () => {};
    const myId = String(getStoredUser()?._id || getStoredUser()?.id || '');

    getPetById(id).then(async (data) => {
      setPet(data);
      if (!data) return;

      const me = getStoredUser() || {};
      const infoCards = [
        { id: 'dog_info_card', type: 'dog_card', pet: data, sender: 'me', time: '' },
        {
          id: 'user_info_card',
          type: 'user_card',
          user: {
            name: me.name || 'Pet Parent',
            avatar: me.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
            phone: me.phone || '',
            email: me.email || '',
            location: me.city || '',
          },
          sender: 'me',
          time: '',
        },
      ];

      try {
        const conversation = await ensureAdoptionConversation(data.id);
        setConversationId(conversation._id);
        const history = await fetchMessages(conversation._id);
        setMessages([
          ...infoCards,
          ...history.map((m) => ({
            id: m._id,
            text: m.text,
            sender: String(m.senderId) === myId ? 'me' : 'them',
            time: msgTime(m.createdAt),
          })),
        ]);

        // Prefilled enquiry sends once for a brand-new conversation.
        if (history.length === 0 && location.state?.prefilledMessage) {
          const sent = await sendChatMessage(conversation._id, { text: location.state.prefilledMessage });
          setMessages((prev) => [...prev, { id: sent._id, text: sent.text, sender: 'me', time: msgTime(sent.createdAt) }]);
        }

        unsubscribe = await subscribeToConversation(conversation._id, (live) => {
          if (String(live.senderId) === myId) return;
          setMessages((prev) =>
            prev.some((m) => m.id === live.key)
              ? prev
              : [...prev, { id: live.key, text: live.text || '', sender: 'them', time: msgTime(live.at || Date.now()) }]
          );
        });
      } catch {
        setMessages(infoCards);
      }
    });

    return () => unsubscribe();
  }, [id, location.state]);

  if (!pet) return null;

  const quickQuestions = [
    "Is pet vaccinated?",
    "Any health issues?",
    "Can I visit?",
    "Is pet available?"
  ];

  const handleSend = (text) => {
    if (!text.trim()) return;
    setMessages([...messages, { id: Date.now(), text, sender: 'me', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setInputText('');
    if (conversationId) {
      sendChatMessage(conversationId, { text: text.trim() }).catch(() => {});
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#FAF7F2]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-white shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-gray-900">
            <ChevronLeft size={24} />
          </button>
          <img src={pet.shelter.image} className="w-12 h-12 rounded-full object-cover border-2 border-gray-50" />
          <div>
            <h2 className="text-[15px] font-bold text-gray-900 leading-tight">{pet.shelter.name}</h2>
            <p className="text-[11px] text-[#66B4B1] font-medium mt-0.5">Typically replies in a few minutes</p>
          </div>
        </div>
        <button className="w-10 h-10 bg-[#FAF7F2] rounded-full flex items-center justify-center text-gray-600">
          <Phone size={18} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 hide-scrollbar">
        {messages.map((msg) => {
          if (msg.type === 'dog_card') {
            return (
              <div key={msg.id} className="flex justify-end mb-1">
                <div className="w-[85%] bg-white rounded-[24px] overflow-hidden border border-gray-100 shadow-sm p-3">
                  <div className="flex gap-3">
                    <img src={msg.pet.images[0]} alt={msg.pet.name} className="w-20 h-20 rounded-[16px] object-cover shrink-0 border border-gray-100" />
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h4 className="text-[15px] font-black text-gray-900 leading-none mb-1">{msg.pet.name}</h4>
                        <p className="text-[11.5px] text-gray-500 font-bold mb-1">{msg.pet.breed} • {msg.pet.age}</p>
                        <p className="text-[10px] text-gray-400 font-semibold flex items-center gap-0.5 truncate">
                          <span>📍</span> {msg.pet.location} ({msg.pet.distance})
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className={`text-[12px] font-black uppercase tracking-wide px-2 py-0.5 rounded-md leading-none ${
                          msg.pet.gender === 'Male' ? 'bg-[#FAF7F2] text-[#599D9A]' : 'bg-[#FAF7F2] text-[#D96B5B]'
                        }`}>
                          {msg.pet.gender}
                        </span>
                        <span className="text-[13px] font-extrabold text-[#66B4B1]">
                          {msg.pet.price === 0 ? '🎁 Free' : `₹${msg.pet.price.toLocaleString()}`}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-gray-50 mt-3 pt-1.5 flex items-center justify-between">
                    <span className="text-[9.5px] font-black text-gray-400 uppercase tracking-widest">
                      🐶 Attached Dog Details
                    </span>
                    <span className="text-[10px] text-gray-400 font-semibold">{msg.time}</span>
                  </div>
                </div>
              </div>
            );
          }

          if (msg.type === 'user_card') {
            return (
              <div key={msg.id} className="flex justify-end mb-1">
                <div className="w-[85%] bg-white rounded-[24px] border border-emerald-100 shadow-sm p-3.5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-[#FAF7F2] text-[#66B4B1] text-[8px] font-extrabold uppercase px-2.5 py-1 rounded-bl-xl tracking-wider">
                    Adopter Profile
                  </div>
                  
                  <div className="flex items-center gap-3 mb-3">
                    <img src={msg.user.avatar} className="w-11 h-11 rounded-full object-cover border border-gray-100" alt={msg.user.name} />
                    <div>
                      <h4 className="text-[14.5px] font-black text-gray-900 leading-none flex items-center gap-1">
                        {msg.user.name}
                        <span className="text-[9.5px] bg-[#FAF7F2] text-[#66B4B1] font-extrabold px-1.5 py-0.5 rounded-full">
                          Verified
                        </span>
                      </h4>
                      <p className="text-[10.5px] text-gray-400 font-bold mt-1">Ready to adopt</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 bg-gray-50/50 p-2.5 rounded-xl border border-gray-100">
                    <div className="flex justify-between items-center text-[11.5px] font-semibold">
                      <span className="text-gray-400">Phone:</span>
                      <span className="text-gray-800 font-bold">{msg.user.phone}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11.5px] font-semibold">
                      <span className="text-gray-400">Email:</span>
                      <span className="text-gray-800 font-bold">{msg.user.email}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11.5px] font-semibold">
                      <span className="text-gray-400">Location:</span>
                      <span className="text-gray-800 font-bold">{msg.user.location}</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-50 mt-3 pt-1.5 flex items-center justify-between text-[10px] text-gray-400 font-semibold">
                    <span className="flex items-center gap-1 text-[#66B4B1]">
                      🔒 Shared Automatically
                    </span>
                    <span>{msg.time}</span>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] p-4 rounded-[20px] ${msg.sender === 'me' ? 'bg-[#66B4B1] text-white rounded-br-sm' : 'bg-white shadow-sm border border-gray-100 text-gray-800 rounded-bl-sm'}`}>
                <p className="text-[14px] leading-relaxed">{msg.text}</p>
                <p className={`text-[10px] mt-1 text-right ${msg.sender === 'me' ? 'text-white/70' : 'text-gray-400'}`}>{msg.time}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Questions */}
      <div className="px-5 pb-3 pt-2 bg-gradient-to-t from-[#FAF7F2] to-transparent shrink-0 overflow-x-auto hide-scrollbar flex gap-2">
        {quickQuestions.map((q, i) => (
          <button 
            key={i} 
            onClick={() => handleSend(q)}
            className="px-4 py-2 bg-[#FAF7F2] text-[#66B4B1] rounded-full text-[12px] font-bold whitespace-nowrap active:scale-95 transition-transform"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-5 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.02)] shrink-0 pb-8">
        <div className="flex items-center gap-3">
          <button className="text-gray-400 hover:text-gray-600 transition-colors">
            <Paperclip size={22} />
          </button>
          <div className="flex-1 relative">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type a message..." 
              className="w-full bg-[#FAF7F2] border border-gray-200 rounded-full py-3 pl-4 pr-12 text-[14px] font-medium outline-none focus:border-[#66B4B1] transition-colors"
              onKeyPress={(e) => e.key === 'Enter' && handleSend(inputText)}
            />
            <button 
              onClick={() => handleSend(inputText)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-[#66B4B1] rounded-full flex items-center justify-center text-white active:scale-95 transition-transform"
            >
              <Send size={14} className="ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
