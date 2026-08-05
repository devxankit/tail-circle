import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  ChevronRight, 
  CreditCard, 
  Clock, 
  Heart, 
  FileText,
  MapPin, 
  Bell, 
  HelpCircle, 
  LogOut, 
  Trophy, 
  Activity, 
  CheckCircle,
  Ticket, 
  X, 
  Star 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../../services/api';
import { getStoredUser, fetchMe, logout } from '../../../../services/auth';
import { fetchMyPets, updatePet, toLegacyPet } from '../../../../services/pets';
import { fetchWallet } from '../../../../services/wallet';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';

export function Profile() {
  const navigate = useNavigate();

  // Load user profile details
  const [profile, setProfile] = useState({
    name: '',
    image: null,
    bio: ''
  });

  // Engagement stats & notifications from API
  const [stats, setStats] = useState({ points: 0, level: 1, matchesCount: 0, savesCount: 0 });
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Wallet balance from the API
  const [walletBalance, setWalletBalance] = useState('0.00');

  // Load pets list from localStorage or initialize with Max
  const [pets, setPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);

  useEffect(() => {
    // Load profile from the API (cached copy first for instant paint)
    const applyUser = (user) => {
      if (!user) return;
      setProfile((prev) => ({
        ...prev,
        name: user.name || (user.phone ? `User (${user.phone.slice(-4)})` : 'User Profile'),
        bio: user.bio ?? prev.bio,
        image: user.avatarUrl || null,
      }));
    };
    applyUser(getStoredUser());
    fetchMe().then(applyUser).catch(() => {});

    // Load stats & notifications from API
    api.get('/users/me/stats')
      .then(({ data }) => setStats(data))
      .catch(() => {});

    api.get('/notifications/unread-count')
      .then(({ data }) => setUnreadNotifications(data?.unread || 0))
      .catch(() => {});

    // Load wallet balance from the API
    fetchWallet()
      .then((w) => setWalletBalance(Number(w.balance).toFixed(2)))
      .catch(() => {});

    // Load pets from the API
    fetchMyPets()
      .then((apiPets) => setPets(apiPets.map(toLegacyPet)))
      .catch(() => setPets([]));
  }, []);

  // Update pet mood and persist to the API
  const handleUpdateMood = (petId, newMood) => {
    setPets((prev) => prev.map((pet) => (pet.id === petId ? { ...pet, mood: newMood } : pet)));
    if (selectedPet && selectedPet.id === petId) {
      setSelectedPet(prev => ({ ...prev, mood: newMood }));
    }
    updatePet(petId, { mood: newMood }).catch(() => {});
  };

  return (
    <div className="flex flex-col h-full bg-bg-secondary animate-in fade-in duration-300 pb-6 text-text-primary">
      {/* Header Profile Info Dashboard */}
      <div className="bg-white px-4 pt-5 pb-4 rounded-b-3xl shadow-sm border-b border-border-light relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className="flex gap-3 items-center">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary-main/20 shadow-sm shrink-0 bg-primary-light/20 flex items-center justify-center">
              {profile.image ? (
                <img src={profile.image} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-primary-main to-teal-400 text-white font-extrabold flex items-center justify-center text-xl uppercase">
                  {profile.name ? profile.name[0] : 'U'}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-extrabold text-slate-900 leading-tight capitalize">{profile.name}</h1>
                <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <Star size={8} className="fill-amber-800" /> LVL {stats.level}
                </span>
              </div>
              {profile.bio && (
                <p className="text-xs text-slate-500 font-medium mt-0.5 leading-snug max-w-[220px]">
                  {profile.bio}
                </p>
              )}
              <button 
                onClick={() => navigate('/app/profile/edit')} 
                className="text-xs font-bold text-primary-main hover:text-primary-dark mt-1 flex items-center gap-0.5"
              >
                Edit Profile
              </button>
            </div>
          </div>
          
          <button 
            onClick={() => navigate('/app/profile/edit')} 
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-full border border-slate-100 transition-colors shadow-sm"
          >
            <Settings size={18} />
          </button>
        </div>

        {/* User Engagement Stats Widget - Compact Dividers */}
        <div className="flex justify-around items-center border-t border-slate-100 mt-4 pt-4 pb-1 text-center">
          <div className="flex-1">
            <span className="block text-base font-black text-primary-main">{stats.points}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Parent Pts</span>
          </div>
          <div className="w-px h-7 bg-slate-100"></div>
          <div className="flex-1">
            <span className="block text-base font-black text-primary-main">{stats.matchesCount}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Matches</span>
          </div>
          <div className="w-px h-7 bg-slate-100"></div>
          <div className="flex-1">
            <span className="block text-base font-black text-primary-main">{stats.savesCount}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Saves</span>
          </div>
        </div>

        {/* My Pets Horizontal List */}
        <div className="mt-4 border-t border-slate-100 pt-4">
          <h3 className="text-xs font-bold text-text-secondary uppercase mb-2.5 pl-1">My Pets</h3>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar py-0.5">
            {pets.map((pet) => (
              <div 
                key={pet.id} 
                onClick={() => setSelectedPet(pet)}
                className="flex flex-col items-center cursor-pointer group shrink-0"
              >
                <div className="w-14 h-14 rounded-[18px] bg-primary-light/10 flex items-center justify-center border-2 border-primary-main overflow-hidden p-0.5 shadow-sm group-hover:scale-105 transition-all">
                  {pet.image ? (
                    <img src={pet.image} alt={pet.name} className="w-full h-full object-cover rounded-[14px]" />
                  ) : (
                    <div className="w-full h-full bg-amber-50 rounded-[14px] flex items-center justify-center text-amber-700 font-black text-lg">
                      🐾
                    </div>
                  )}
                </div>
                <span className="text-xs font-bold text-slate-900 mt-1">{pet.name}</span>
                <span className="text-[9px] font-extrabold text-[#66B4B1] px-1.5 py-0.2 bg-[#66B4B1]/10 rounded-full mt-0.5">
                  {pet.mood ? pet.mood.split(' ')[0] : 'Happy'}
                </span>
              </div>
            ))}
            
            <div 
              onClick={() => navigate('/app/profile/pets/add')} 
              className="flex flex-col items-center cursor-pointer shrink-0"
            >
              <div className="w-14 h-14 rounded-[18px] bg-bg-secondary flex items-center justify-center border border-dashed border-text-disabled hover:border-primary-main/50 hover:bg-white transition-all shadow-sm">
                <span className="text-xl text-text-disabled font-light">+</span>
              </div>
              <span className="text-xs font-bold text-text-secondary mt-1">Add</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar px-4 mt-4 pb-20">
        {/* Activity Settings */}
        <h3 className="text-xs font-bold text-text-secondary uppercase mb-2 pl-2">Activity</h3>
        <div className="bg-white rounded-[24px] border border-border-light mb-6 overflow-hidden shadow-sm">
          <button onClick={() => navigate('/app/profile/posts')} className="w-full flex items-center p-4 hover:bg-bg-secondary transition-colors border-b border-border-light/50">
            <FileText size={20} className="text-text-secondary mr-3" />
            <span className="flex-1 text-left text-sm font-semibold text-text-primary">My Posts</span>
            {stats.postsCount > 0 && (
              <span className="text-xs font-bold text-primary-dark bg-primary-main/10 px-2 py-0.5 rounded-full mr-2">
                {stats.postsCount}
              </span>
            )}
            <ChevronRight size={20} className="text-text-disabled" />
          </button>
          <button onClick={() => navigate('/app/profile/bookings')} className="w-full flex items-center p-4 hover:bg-bg-secondary transition-colors border-b border-border-light/50">
            <Clock size={20} className="text-text-secondary mr-3" />
            <span className="flex-1 text-left text-sm font-semibold text-text-primary">Booking History</span>
            <ChevronRight size={20} className="text-text-disabled" />
          </button>
          <button onClick={() => navigate('/app/profile/orders')} className="w-full flex items-center p-4 hover:bg-bg-secondary transition-colors border-b border-border-light/50">
            <CreditCard size={20} className="text-text-secondary mr-3" />
            <span className="flex-1 text-left text-sm font-semibold text-text-primary">My Orders</span>
            <ChevronRight size={20} className="text-text-disabled" />
          </button>
          <button onClick={() => navigate('/app/profile/saved')} className="w-full flex items-center p-4 hover:bg-bg-secondary transition-colors border-b border-border-light/50">
            <Heart size={20} className="text-text-secondary mr-3" />
            <span className="flex-1 text-left text-sm font-semibold text-text-primary">Saved Posts & Items</span>
            <ChevronRight size={20} className="text-text-disabled" />
          </button>
          <button onClick={() => navigate('/app/adopt/my-listings')} className="w-full flex items-center p-4 hover:bg-bg-secondary transition-colors border-b border-border-light/50">
            <Heart size={20} className="text-[#66B4B1] mr-3" />
            <span className="flex-1 text-left text-sm font-semibold text-text-primary">My Adoption Listings</span>
            <ChevronRight size={20} className="text-text-disabled" />
          </button>
          <button onClick={() => navigate('/app/events/my-tickets')} className="w-full flex items-center p-4 hover:bg-bg-secondary transition-colors">
            <Ticket size={20} className="text-[#66B4B1] mr-3" />
            <span className="flex-1 text-left text-sm font-semibold text-text-primary">My Event Passes</span>
            <ChevronRight size={20} className="text-text-disabled" />
          </button>
        </div>

        {/* Account Settings */}
        <h3 className="text-xs font-bold text-text-secondary uppercase mb-2 pl-2">Account</h3>
        <div className="bg-white rounded-[24px] border border-border-light mb-6 overflow-hidden shadow-sm">
          <button onClick={() => navigate('/app/wallet')} className="w-full flex items-center p-4 hover:bg-bg-secondary transition-colors border-b border-border-light/50">
            <div className="bg-[#66B4B1]/15 p-1.5 rounded-lg mr-3"><CreditCard size={18} className="text-[#66B4B1]" /></div>
            <span className="flex-1 text-left text-sm font-semibold text-text-primary">Wallet & Payments</span>
            <span className="text-xs font-extrabold text-[#66B4B1] mr-2">₹{walletBalance}</span>
            <ChevronRight size={20} className="text-text-disabled" />
          </button>
          <button onClick={() => navigate('/app/profile/address')} className="w-full flex items-center p-4 hover:bg-bg-secondary transition-colors">
            <MapPin size={20} className="text-text-secondary mr-3" />
            <span className="flex-1 text-left text-sm font-semibold text-text-primary">Address Book</span>
            <ChevronRight size={20} className="text-text-disabled" />
          </button>
        </div>

        {/* App Settings */}
        <h3 className="text-xs font-bold text-text-secondary uppercase mb-2 pl-2">App</h3>
        <div className="bg-white rounded-[24px] border border-border-light mb-6 overflow-hidden shadow-sm">
          <button onClick={() => navigate('/app/notifications')} className="w-full flex items-center p-4 hover:bg-bg-secondary transition-colors border-b border-border-light/50">
            <Bell size={20} className="text-text-secondary mr-3" />
            <span className="flex-1 text-left text-sm font-semibold text-text-primary">Notifications</span>
            {unreadNotifications > 0 && (
              <span className="w-2 h-2 rounded-full bg-error mr-2"></span>
            )}
            <ChevronRight size={20} className="text-text-disabled" />
          </button>
          <button onClick={() => navigate('/app/profile/support')} className="w-full flex items-center p-4 hover:bg-bg-secondary transition-colors">
            <HelpCircle size={20} className="text-text-secondary mr-3" />
            <span className="flex-1 text-left text-sm font-semibold text-text-primary">Help & Support</span>
            <ChevronRight size={20} className="text-text-disabled" />
          </button>
        </div>

        <button
          onClick={async () => {
            await logout();
            navigate('/auth/login', { replace: true });
          }}
          className="w-full flex items-center justify-center p-4 bg-error/10 text-error rounded-[20px] font-bold text-sm mb-6 hover:bg-error/20 transition-colors"
        >
          <LogOut size={18} className="mr-2" /> Log Out
        </button>
      </div>

      {/* --- PET PASSPORT & MOOD TRACKER BOTTOM SHEET --- */}
      {selectedPet && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedPet(null)} />
          <div className="bg-white rounded-t-3xl p-6 relative z-10 animate-in slide-in-from-bottom-full pb-8 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 shrink-0"></div>
            
            <div className="flex justify-between items-start mb-6 shrink-0">
              <div className="flex gap-4 items-center">
                <div className="w-16 h-16 rounded-[22px] bg-slate-100 overflow-hidden border-2 border-[#66B4B1] shadow-inner shrink-0 flex items-center justify-center">
                  {selectedPet.image ? (
                    <img src={selectedPet.image} alt={selectedPet.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-amber-50 flex items-center justify-center text-amber-700 font-black text-2xl">
                      🐾
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-950 flex items-center gap-2">
                    {selectedPet.name}
                    <span className="text-xs font-bold bg-[#66B4B1]/10 text-[#66B4B1] px-2.5 py-1 rounded-full">Passport 🐾</span>
                  </h2>
                  <p className="text-sm font-bold text-slate-400">{selectedPet.breed || 'Pet'}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPet(null)} 
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto hide-scrollbar flex-1 space-y-6 pb-4">
              {/* Pet Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Age</span>
                  <span className="text-sm font-extrabold text-slate-800">
                    {selectedPet.age && selectedPet.age !== '—' ? selectedPet.age : 'Not specified'}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Weight</span>
                  <span className="text-sm font-extrabold text-slate-800">
                    {selectedPet.weight && selectedPet.weight !== '—' ? selectedPet.weight : 'Not specified'}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Vaccination</span>
                  <span className="text-sm font-extrabold text-emerald-600 flex items-center gap-1">
                    <CheckCircle size={14} className="fill-emerald-100 text-emerald-600" /> {selectedPet.vaccinated || 'Not specified'}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Diet Plan</span>
                  <span className="text-sm font-extrabold text-slate-800 truncate block">
                    {selectedPet.diet || 'Not specified'}
                  </span>
                </div>
              </div>

              {/* Mood Tracker Row */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Activity size={14} className="text-[#66B4B1]" /> Track Pet Mood
                </h3>
                
                <div className="grid grid-cols-3 gap-2">
                  {['Happy 😊', 'Playful 🥎', 'Sleepy 💤', 'Hungry 🍖', 'Energetic ⚡', 'Cuddly 🧸'].map(mood => {
                    const isSel = selectedPet.mood === mood;
                    return (
                      <button 
                        key={mood}
                        onClick={() => handleUpdateMood(selectedPet.id, mood)}
                        className={`py-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                          isSel 
                            ? 'bg-[#66B4B1] border-[#66B4B1] text-white shadow-sm scale-105' 
                            : 'bg-white border-slate-200 text-slate-700 hover:border-[#66B4B1]/50'
                        }`}
                      >
                        {mood}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
