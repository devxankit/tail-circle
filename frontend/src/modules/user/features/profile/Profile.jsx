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
  Star,
  Info,
  Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../../services/api';
import { getStoredUser, fetchMe, logout } from '../../../../services/auth';
import { fetchMyPets, updatePet, deletePet, toLegacyPet } from '../../../../services/pets';
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
  const [isEditingPet, setIsEditingPet] = useState(false);
  const [isSavingPet, setIsSavingPet] = useState(false);
  const [editPetForm, setEditPetForm] = useState({});
  const [petToDelete, setPetToDelete] = useState(null);
  const [isDeletingPet, setIsDeletingPet] = useState(false);

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

  const handleOpenEditPet = () => {
    if (!selectedPet) return;
    navigate(`/app/profile/pets/edit/${selectedPet.id || selectedPet._id}`);
  };

  const handleSavePetDetails = async () => {
    if (!selectedPet) return;
    setIsSavingPet(true);
    try {
      const payload = {
        name: editPetForm.name,
        type: (editPetForm.type || 'dog').toLowerCase(),
        breed: editPetForm.breed,
        gender: (editPetForm.gender || 'male').toLowerCase(),
        ageText: editPetForm.ageText,
        weightKg: editPetForm.weightKg ? Number(editPetForm.weightKg) : null,
        size: (editPetForm.size || 'medium').toLowerCase(),
        activityLevel: (editPetForm.activityLevel || 'medium').toLowerCase(),
        mood: editPetForm.mood,
        purpose: editPetForm.purpose,
        diet: editPetForm.diet,
        bio: editPetForm.bio,
        temperament: editPetForm.temperament,
        health: {
          vaccinated: Boolean(editPetForm.vaccinated),
          neutered: Boolean(editPetForm.neutered),
        },
        isMatchProfile: true,
      };

      await updatePet(selectedPet.id, payload);
      const updatedPets = await fetchMyPets();
      const legacyPets = updatedPets.map(toLegacyPet);
      setPets(legacyPets);
      const freshSelected = legacyPets.find(p => p.id === selectedPet.id) || selectedPet;
      setSelectedPet(freshSelected);
      setIsEditingPet(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingPet(false);
    }
  };

  const handleConfirmDeletePet = async () => {
    if (!petToDelete) return;
    setIsDeletingPet(true);
    try {
      await deletePet(petToDelete.id || petToDelete._id);
      const updatedPets = await fetchMyPets();
      const legacyPets = updatedPets.map(toLegacyPet);
      setPets(legacyPets);
      if (selectedPet && (selectedPet.id === petToDelete.id || selectedPet._id === petToDelete.id)) {
        setSelectedPet(null);
        setIsEditingPet(false);
      }
      setPetToDelete(null);
    } catch (err) {
      console.error('Failed to delete pet profile:', err);
    } finally {
      setIsDeletingPet(false);
    }
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

      {/* --- PET PASSPORT & EDIT PET BOTTOM SHEET --- */}
      {selectedPet && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in" onClick={() => { setSelectedPet(null); setIsEditingPet(false); }} />
          
          {isEditingPet ? (
            /* --- EDIT PET FORM SHEET --- */
            <div className="bg-white rounded-t-3xl p-6 relative z-10 animate-in slide-in-from-bottom-full pb-8 shadow-2xl flex flex-col max-h-[90vh]">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 shrink-0"></div>
              
              <div className="flex justify-between items-center mb-4 shrink-0">
                <h2 className="text-xl font-black text-slate-900">Edit Pet Profile</h2>
                <button 
                  onClick={() => setIsEditingPet(false)} 
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-y-auto hide-scrollbar flex-1 space-y-4 pb-4 pr-1">
                {/* Pet Name */}
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Pet Name</label>
                  <input 
                    type="text" 
                    value={editPetForm.name || ''} 
                    onChange={(e) => setEditPetForm({ ...editPetForm, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:border-[#66B4B1]"
                  />
                </div>

                {/* Species & Breed */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Species / Type</label>
                    <select
                      value={editPetForm.type || 'dog'}
                      onChange={(e) => setEditPetForm({ ...editPetForm, type: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#66B4B1]"
                    >
                      {['dog', 'cat', 'bird', 'rabbit', 'small_pet', 'other'].map(t => (
                        <option key={t} value={t}>{t.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Breed</label>
                    <input 
                      type="text" 
                      value={editPetForm.breed || ''} 
                      onChange={(e) => setEditPetForm({ ...editPetForm, breed: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#66B4B1]"
                    />
                  </div>
                </div>

                {/* Gender, Age & Weight */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Gender</label>
                    <select
                      value={editPetForm.gender || 'male'}
                      onChange={(e) => setEditPetForm({ ...editPetForm, gender: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-2.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#66B4B1]"
                    >
                      <option value="male">Male ♂</option>
                      <option value="female">Female ♀</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Age</label>
                    <input 
                      type="text" 
                      value={editPetForm.ageText || ''} 
                      onChange={(e) => setEditPetForm({ ...editPetForm, ageText: e.target.value })}
                      placeholder="e.g. 2 Yrs"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-2.5 py-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#66B4B1]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Weight (Kg)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={editPetForm.weightKg || ''} 
                      onChange={(e) => setEditPetForm({ ...editPetForm, weightKg: e.target.value })}
                      placeholder="e.g. 12"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-2.5 py-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#66B4B1]"
                    />
                  </div>
                </div>

                {/* Size & Energy */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Pet Size</label>
                    <select
                      value={editPetForm.size || 'medium'}
                      onChange={(e) => setEditPetForm({ ...editPetForm, size: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#66B4B1]"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Activity / Energy</label>
                    <select
                      value={editPetForm.activityLevel || 'medium'}
                      onChange={(e) => setEditPetForm({ ...editPetForm, activityLevel: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#66B4B1]"
                    >
                      <option value="low">Low Energy</option>
                      <option value="medium">Medium Energy</option>
                      <option value="high">High Energy</option>
                    </select>
                  </div>
                </div>

                {/* Health & Medical Switches */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-slate-800 uppercase block">Vaccinated?</label>
                      <span className="text-[10px] text-slate-400 font-medium">Up to date</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditPetForm({ ...editPetForm, vaccinated: !editPetForm.vaccinated })}
                      className={`w-10 h-5.5 rounded-full transition-colors relative flex items-center px-0.5 ${
                        editPetForm.vaccinated ? "bg-[#66B4B1]" : "bg-slate-300"
                      }`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${
                        editPetForm.vaccinated ? "translate-x-4.5" : "translate-x-0"
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between border-l border-slate-200 pl-3">
                    <div>
                      <label className="text-xs font-bold text-slate-800 uppercase block">Neutered?</label>
                      <span className="text-[10px] text-slate-400 font-medium">Spayed/Neutered</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditPetForm({ ...editPetForm, neutered: !editPetForm.neutered })}
                      className={`w-10 h-5.5 rounded-full transition-colors relative flex items-center px-0.5 ${
                        editPetForm.neutered ? "bg-[#66B4B1]" : "bg-slate-300"
                      }`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${
                        editPetForm.neutered ? "translate-x-4.5" : "translate-x-0"
                      }`} />
                    </button>
                  </div>
                </div>

                {/* Diet & Bio */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Diet Plan / Food</label>
                    <input 
                      type="text" 
                      value={editPetForm.diet || ''} 
                      onChange={(e) => setEditPetForm({ ...editPetForm, diet: e.target.value })}
                      placeholder="e.g. Dry kibble, fresh chicken & veggies"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#66B4B1]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Pet Bio / Story</label>
                    <textarea 
                      rows="2"
                      value={editPetForm.bio || ''} 
                      onChange={(e) => setEditPetForm({ ...editPetForm, bio: e.target.value })}
                      placeholder="Tell other pet parents about your pet's personality and favorite activities..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#66B4B1] resize-none"
                    />
                  </div>
                </div>

                {/* Mood */}
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Pet Mood / Vibe</label>
                  <div className="flex flex-wrap gap-1.5">
                    {['Happy 😊', 'Playful 🥎', 'Sleepy 💤', 'Energetic ⚡', 'Calm 🧘', 'Cuddly 🧸'].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setEditPetForm({ ...editPetForm, mood: m })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          editPetForm.mood === m
                            ? 'bg-[#66B4B1] text-white border-[#66B4B1]'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Purpose / Looking For */}
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Looking For / Purpose</label>
                  <div className="flex flex-wrap gap-1.5">
                    {['Playdate', 'Friendship', 'Walking Partner', 'Training Partner', 'Breeding', 'Adoption'].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setEditPetForm({ ...editPetForm, purpose: p })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          editPetForm.purpose === p
                            ? 'bg-[#66B4B1] text-white border-[#66B4B1]'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Temperament / Behaviour */}
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Behaviour & Traits</label>
                  <p className="flex items-start gap-2 text-[11.5px] leading-snug text-slate-600 bg-amber-50/70 border border-amber-200/70 rounded-2xl p-2.5 mb-2.5">
                    <Info size={15} className="text-[#4C8684] shrink-0 mt-0.5" />
                    <span>
                      Choose your pet’s behaviour carefully. Tail Circle uses this information to understand behavioural compatibility and help you find better matches.
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {['Friendly', 'Playful', 'Calm', 'Active', 'Protective', 'Social', 'Shy'].map(tag => {
                      const isSel = (editPetForm.temperament || []).includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            const cur = editPetForm.temperament || [];
                            const updated = isSel ? cur.filter(t => t !== tag) : [...cur, tag];
                            setEditPetForm({ ...editPetForm, temperament: updated });
                          }}
                          className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
                            isSel
                              ? 'bg-[#4C8684] text-white border-[#4C8684]'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          {isSel ? '✓ ' : ''}{tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setPetToDelete(selectedPet)}
                  className="py-3 px-3.5 rounded-2xl font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 text-xs flex items-center justify-center gap-1.5 transition-colors"
                  title="Delete Pet Profile"
                >
                  <Trash2 size={15} /> Delete
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingPet(false)}
                  className="flex-1 py-3 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePetDetails}
                  disabled={isSavingPet}
                  className="flex-1 py-3 rounded-2xl font-bold text-white bg-[#4C8684] hover:bg-[#3d6b6a] text-xs shadow-md flex items-center justify-center gap-1.5"
                >
                  {isSavingPet ? 'Saving...' : 'Save Pet Profile'}
                </button>
              </div>
            </div>
          ) : (
            /* --- READ-ONLY PET PASSPORT SHEET --- */
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
                {/* Complete Passport Attribute Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Age</span>
                    <span className="text-sm font-extrabold text-slate-800">
                      {selectedPet.age && selectedPet.age !== '—' ? selectedPet.age : 'Not specified'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Gender</span>
                    <span className="text-sm font-extrabold text-slate-800 capitalize">
                      {selectedPet.gender || 'Not specified'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Weight</span>
                    <span className="text-sm font-extrabold text-slate-800">
                      {selectedPet.weight && selectedPet.weight !== '—' ? selectedPet.weight : 'Not specified'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Pet Size</span>
                    <span className="text-sm font-extrabold text-slate-800 capitalize">
                      {selectedPet.size || 'Medium'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Activity / Energy</span>
                    <span className="text-sm font-extrabold text-slate-800 capitalize">
                      {selectedPet.activityLevel ? `${selectedPet.activityLevel} Energy` : 'Medium Energy'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Vaccination</span>
                    <span className="text-sm font-extrabold text-emerald-600 flex items-center gap-1">
                      <CheckCircle size={14} className="fill-emerald-100 text-emerald-600" /> {selectedPet.vaccinated || 'Not specified'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Neutered / Spayed</span>
                    <span className="text-sm font-extrabold text-slate-800 capitalize">
                      {selectedPet.neutered || 'No'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Looking For</span>
                    <span className="text-sm font-extrabold text-slate-800 truncate block">
                      {selectedPet.purpose || 'Playdate'}
                    </span>
                  </div>
                </div>

                {/* Diet Plan */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Diet Plan</span>
                  <span className="text-xs font-bold text-slate-700">
                    {selectedPet.diet || 'General Diet Plan'}
                  </span>
                </div>

                {/* Bio / Story */}
                {selectedPet.bio && (
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">About {selectedPet.name}</span>
                    <p className="text-xs font-medium text-slate-700 leading-relaxed">
                      {selectedPet.bio}
                    </p>
                  </div>
                )}

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

                {/* Temperament / Behaviour Chips */}
                {selectedPet.behaviours && selectedPet.behaviours.length > 0 && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                      Behaviour & Personality Traits
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedPet.behaviours.map((b) => (
                        <span key={b} className="bg-white text-[#4C8684] text-xs font-bold px-3 py-1 rounded-full border border-slate-200">
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bottom Action Buttons */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPetToDelete(selectedPet)}
                    className="py-3.5 px-4 rounded-2xl font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-all shadow-xs flex items-center justify-center gap-1.5 text-sm active:scale-95 shrink-0"
                    title="Delete Pet Profile"
                  >
                    <Trash2 size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenEditPet}
                    className="flex-1 py-3.5 rounded-2xl font-bold text-white bg-[#4C8684] hover:bg-[#3d6b6a] transition-all shadow-md flex items-center justify-center gap-2 text-sm active:scale-95"
                  >
                    Edit Pet Profile Attributes
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {petToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-black text-slate-900 text-center mb-1">
              Delete {petToDelete.name}'s Profile?
            </h3>
            <p className="text-xs text-slate-500 text-center mb-6 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-800">{petToDelete.name}</strong>? This will permanently remove their profile and matchmaking recommendations.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPetToDelete(null)}
                disabled={isDeletingPet}
                className="flex-1 py-3 rounded-2xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePet}
                disabled={isDeletingPet}
                className="flex-1 py-3 rounded-2xl font-bold text-white bg-red-600 hover:bg-red-700 text-xs shadow-md transition-colors flex items-center justify-center gap-1.5"
              >
                {isDeletingPet ? 'Deleting...' : 'Yes, Delete Pet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
