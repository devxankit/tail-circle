import React, { useState, useEffect } from 'react';
import { ChevronLeft, Plus, MapPin, CheckCircle, ShieldAlert, Award, MessageCircle, Heart, Star, Sparkles, FileText, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { cn } from '../../utils/cn';

const initialAdoptionPets = [
  { id: 'a1', name: 'Sheru', species: 'Dog', breed: 'Indie', age: '1.5 Years', gender: 'Male', img: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=300&q=80', shelter: 'Paws Haven NGO', location: 'Mumbai', desc: 'Rescued from street injury, fully healed and looking for a warm family. Sheru is high-energy and very friendly.' },
  { id: 'a2', name: 'Luna', species: 'Cat', breed: 'Domestic Shorthair', age: '1 Year', gender: 'Female', img: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=300&q=80', shelter: 'Happy Tails Rescue', location: 'Pune', desc: 'Calm, loves cuddles, and matches perfectly with apartments or quiet homes.' }
];

export function Marketplace() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('buy'); // buy, sell, adopt
  
  // API-loaded lists
  const [pets, setPets] = useState([]);
  const [adoptPets, setAdoptPets] = useState(initialAdoptionPets);

  useEffect(() => {
    import('../../../../services/adoptApi').then(({ getPets }) =>
      getPets().then((all) =>
        setAdoptPets(
          all.filter((p) => p.price === 0).slice(0, 4).map((p) => ({
            id: p.id,
            name: p.name,
            species: p.type,
            breed: p.breed,
            age: p.age,
            gender: p.gender,
            img: p.images?.[0] || '',
            shelter: p.shelter?.name || '',
            location: p.location,
            desc: p.about,
          }))
        )
      )
    ).catch(() => {});
  }, []);
  
  // Selected detail states
  const [selectedPet, setSelectedPet] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Sell Form States
  const [sellName, setSellName] = useState('');
  const [sellSpecies, setSellSpecies] = useState('Dog');
  const [sellBreed, setSellBreed] = useState('');
  const [sellAge, setSellAge] = useState('');
  const [sellGender, setSellGender] = useState('Male');
  const [sellPrice, setSellPrice] = useState('');
  const [sellLocation, setSellLocation] = useState('');
  const [sellVaccinated, setSellVaccinated] = useState('Fully Vaccinated');
  const [sellImage, setSellImage] = useState(null);
  const [sellSuccess, setSellSuccess] = useState(false);

  // Adoption Form States
  const [showAdoptForm, setShowAdoptForm] = useState(false);
  const [adoptPetItem, setAdoptPetItem] = useState(null);
  const [adoptExp, setAdoptExp] = useState('No');
  const [adoptHome, setAdoptHome] = useState('Apartment');
  const [adoptReason, setAdoptReason] = useState('');
  const [adoptSuccess, setAdoptSuccess] = useState(false);

  const loadListings = () => {
    import('../../../../services/api').then(({ api }) =>
      api.get('/marketplace/listings').then(({ data }) =>
        setPets(data.map((l) => ({ ...l, id: l.legacyId || l._id })))
      )
    ).catch(() => setPets([]));
  };

  useEffect(() => {
    loadListings();
  }, []);

  const handleSellSubmit = async (e) => {
    e.preventDefault();
    if (!sellName.trim() || !sellBreed.trim() || !sellPrice.trim()) return;

    try {
      const { api } = await import('../../../../services/api');
      await api.post('/marketplace/listings', {
        name: sellName,
        species: sellSpecies,
        breed: sellBreed,
        age: sellAge || '3 Months',
        gender: sellGender,
        price: sellPrice,
        location: sellLocation || 'Local City',
        vaccinated: sellVaccinated,
        img: sellImage || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=300&q=80',
      });
      loadListings();
      setSellSuccess(true);
    } catch (err) {
      alert(err.message);
      return;
    }

    setTimeout(() => {
      setSellSuccess(false);
      // Reset form
      setSellName('');
      setSellBreed('');
      setSellAge('');
      setSellPrice('');
      setSellLocation('');
      setSellImage(null);
      setActiveTab('buy');
    }, 1500);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSellImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleBookVisit = async () => {
    setShowBookingModal(false);
    try {
      const { api } = await import('../../../../services/api');
      await api.post(`/marketplace/listings/${selectedPet._id || selectedPet.id}/book-meet`);
      setBookingSuccess(true);
    } catch (e) {
      alert(e.message);
      return;
    }

    setTimeout(() => {
      setBookingSuccess(false);
      setSelectedPet(null);
      navigate('/app/profile/bookings');
    }, 2000);
  };

  const handleAdoptSubmit = (e) => {
    e.preventDefault();
    setShowAdoptForm(false);
    setAdoptSuccess(true);
  };

  return (
    <div className="flex flex-col h-full bg-bg-secondary animate-in slide-in-from-bottom-4 duration-300 relative">
      {/* Header Sticky */}
      <div className="bg-white px-4 pt-6 pb-4 flex items-center shadow-sm border-b border-border-light z-10 sticky top-0">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-primary hover:bg-bg-secondary rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-text-primary ml-2 flex-1">Pet Marketplace</h1>
      </div>

      {/* Tabs Row */}
      <div className="bg-white px-4 py-3 flex gap-2 border-b border-border-light shadow-sm">
        {['buy', 'sell', 'adopt'].map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setSelectedPet(null);
              setShowAdoptForm(false);
            }}
            className={cn(
              "flex-1 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider transition-all border",
              activeTab === tab 
                ? "bg-[#66B4B1] text-white border-[#66B4B1] shadow-sm scale-[1.02]" 
                : "bg-white text-text-secondary border-border-light hover:border-[#66B4B1]/50"
            )}
          >
            {tab} PET
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto hide-scrollbar px-4 py-6">
        
        {/* BUY PET TAB */}
        {activeTab === 'buy' && (
          <div className="grid grid-cols-2 gap-4">
            {pets.map((pet) => (
              <Card 
                key={pet.id} 
                className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow group flex flex-col"
                onClick={() => setSelectedPet(pet)}
              >
                <div className="w-full h-36 relative bg-bg-secondary overflow-hidden shrink-0">
                  <img src={pet.img} alt={pet.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  {pet.verification && (
                    <span className="absolute top-2 left-2 bg-[#FAF7F2] text-[#66B4B1] text-[9px] font-extrabold px-2 py-0.5 rounded-full z-10 flex items-center gap-1 shadow-sm">
                      <CheckCircle size={10} className="fill-[#80C1BF] text-white" /> VERIFIED
                    </span>
                  )}
                </div>
                <div className="p-3 flex flex-col flex-1">
                  <h3 className="text-base font-bold text-text-primary">{pet.name}</h3>
                  <p className="text-xs text-text-secondary">{pet.breed} • {pet.age}</p>
                  <div className="flex justify-between items-center mt-3 pt-2 border-t border-border-light/50">
                    <span className="font-black text-[#66B4B1] text-base">₹{pet.price}</span>
                    <span className="text-[10px] text-text-disabled flex items-center gap-0.5"><MapPin size={10} /> {pet.location.split(',')[0]}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* SELL PET TAB FORM */}
        {activeTab === 'sell' && (
          <div className="bg-white p-5 rounded-[24px] border border-border-light shadow-sm">
            <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
              <Sparkles size={20} className="text-[#66B4B1]" /> List a Pet for Sale
            </h2>
            
            {sellSuccess ? (
              <div className="flex flex-col items-center justify-center py-10 text-center animate-in zoom-in-95">
                <div className="w-16 h-16 bg-[#FAF7F2] rounded-full flex items-center justify-center mb-4">
                  <CheckCircle size={32} className="text-[#66B4B1]" />
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-1">Listing Published!</h3>
                <p className="text-sm text-text-secondary">Your pet is now visible on the Marketplace feed.</p>
              </div>
            ) : (
              <form onSubmit={handleSellSubmit} className="flex flex-col gap-4">
                {/* Image Upload box */}
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-border-light rounded-2xl p-4 bg-bg-secondary/40">
                  <input type="file" accept="image/*" onChange={handleImageUpload} id="sell-photo" className="hidden" />
                  <label htmlFor="sell-photo" className="cursor-pointer flex flex-col items-center justify-center text-center">
                    {sellImage ? (
                      <img src={sellImage} alt="Upload preview" className="w-24 h-24 rounded-2xl object-cover shadow-md border" />
                    ) : (
                      <>
                        <Plus size={24} className="text-[#66B4B1] mb-1" />
                        <span className="text-xs font-bold text-text-secondary">Upload Pet Image</span>
                      </>
                    )}
                  </label>
                </div>

                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase mb-1 block pl-1">Pet Name *</label>
                  <input required type="text" value={sellName} onChange={(e) => setSellName(e.target.value)} placeholder="e.g. Max" className="w-full bg-white border border-border-light rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#66B4B1] focus:ring-2 focus:ring-[#80C1BF]/20" />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-text-secondary uppercase mb-1 block pl-1">Species</label>
                    <select value={sellSpecies} onChange={(e) => setSellSpecies(e.target.value)} className="w-full bg-white border border-border-light rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#66B4B1]">
                      <option>Dog</option>
                      <option>Cat</option>
                      <option>Bird</option>
                      <option>Rabbit</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-text-secondary uppercase mb-1 block pl-1">Gender</label>
                    <select value={sellGender} onChange={(e) => setSellGender(e.target.value)} className="w-full bg-white border border-border-light rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#66B4B1]">
                      <option>Male</option>
                      <option>Female</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-text-secondary uppercase mb-1 block pl-1">Breed *</label>
                    <input required type="text" value={sellBreed} onChange={(e) => setSellBreed(e.target.value)} placeholder="e.g. Pug" className="w-full bg-white border border-border-light rounded-xl px-4 py-3 text-sm focus:outline-none" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-text-secondary uppercase mb-1 block pl-1">Age</label>
                    <input type="text" value={sellAge} onChange={(e) => setSellAge(e.target.value)} placeholder="e.g. 4 Months" className="w-full bg-white border border-border-light rounded-xl px-4 py-3 text-sm focus:outline-none" />
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-text-secondary uppercase mb-1 block pl-1">Price (₹) *</label>
                    <input required type="number" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} placeholder="Price in ₹" className="w-full bg-white border border-border-light rounded-xl px-4 py-3 text-sm focus:outline-none" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-text-secondary uppercase mb-1 block pl-1">Location</label>
                    <input type="text" value={sellLocation} onChange={(e) => setSellLocation(e.target.value)} placeholder="e.g. Mumbai" className="w-full bg-white border border-border-light rounded-xl px-4 py-3 text-sm focus:outline-none" />
                  </div>
                </div>

                <button type="submit" className="w-full bg-[#F87B68] hover:bg-[#F87B68]/90 text-white font-bold h-12 rounded-xl mt-4 shadow-sm active:scale-95 transition-all">
                  Publish Sale Listing
                </button>
              </form>
            )}
          </div>
        )}

        {/* ADOPT PET TAB */}
        {activeTab === 'adopt' && (
          <div className="flex flex-col gap-6">
            
            {adoptSuccess ? (
              <div className="bg-white p-6 rounded-[28px] border border-border-light shadow-lg flex flex-col items-center text-center animate-in zoom-in-95">
                <div className="w-16 h-16 bg-[#FAF7F2] rounded-full flex items-center justify-center mb-4">
                  <CheckCircle size={32} className="text-[#66B4B1]" />
                </div>
                <h2 className="text-2xl font-black text-text-primary mb-2">Application Received!</h2>
                <p className="text-sm text-text-secondary mb-6 max-w-[280px]">
                  Our shelter representative will coordinate a home inspection call in 24 hours.
                </p>
                
                {/* Digital Adoption Certificate Box */}
                <div className="w-full border-4 border-double border-[#66B4B1]/50 rounded-2xl p-5 bg-[#FAF7F2]/20 relative overflow-hidden">
                  <div className="absolute top-2 right-2 text-[#66B4B1]/20 font-black text-6xl">★</div>
                  <h3 className="font-serif text-[#66B4B1] text-lg font-bold uppercase tracking-wider mb-1">Certificate of Pre-Approval</h3>
                  <div className="w-12 h-[2px] bg-[#66B4B1] mx-auto mb-3"></div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    This digital record confirms that the adoption request for <span className="font-bold text-text-primary">{adoptPetItem?.name}</span> has passed preliminary AI screening guidelines.
                  </p>
                  <div className="flex justify-between items-center mt-6 text-[10px] text-text-disabled">
                    <span>DATE: {new Date().toLocaleDateString()}</span>
                    <span className="font-serif italic font-bold text-[#66B4B1]">TailCircle Team</span>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setAdoptSuccess(false);
                    setAdoptPetItem(null);
                  }}
                  className="w-full bg-[#66B4B1] hover:bg-[#66B4B1]/90 text-white font-bold h-12 rounded-xl mt-6 shadow-sm active:scale-95 transition-all"
                >
                  Done
                </button>
              </div>
            ) : showAdoptForm && adoptPetItem ? (
              <div className="bg-white p-5 rounded-[24px] border border-border-light shadow-sm animate-in slide-in-from-bottom-3">
                <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                  <FileText size={20} className="text-[#66B4B1]" /> Adoption Screening Intake
                </h2>
                <div className="flex items-center gap-3 p-3 bg-bg-secondary/40 rounded-xl mb-4">
                  <img src={adoptPetItem.img} alt={adoptPetItem.name} className="w-12 h-12 rounded-full object-cover" />
                  <div>
                    <h4 className="font-bold text-sm">{adoptPetItem.name}</h4>
                    <p className="text-xs text-text-secondary">{adoptPetItem.breed} • {adoptPetItem.shelter}</p>
                  </div>
                </div>

                <form onSubmit={handleAdoptSubmit} className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-bold text-text-secondary uppercase mb-1 block pl-1">Have you owned a pet before?</label>
                    <select value={adoptExp} onChange={(e) => setAdoptExp(e.target.value)} className="w-full bg-white border border-border-light rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#66B4B1]">
                      <option>No, I am a first time pet parent</option>
                      <option>Yes, I currently own one or more pets</option>
                      <option>Yes, I have owned pets in the past</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-text-secondary uppercase mb-1 block pl-1">Your Accommodation Type</label>
                    <select value={adoptHome} onChange={(e) => setAdoptHome(e.target.value)} className="w-full bg-white border border-border-light rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#66B4B1]">
                      <option>Apartment (No Private Yard)</option>
                      <option>Independent House / Villa (With Private Yard)</option>
                      <option>Farm / Acreage</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-text-secondary uppercase mb-1 block pl-1">Reason for adopting *</label>
                    <textarea required value={adoptReason} onChange={(e) => setAdoptReason(e.target.value)} placeholder="Why do you wish to adopt this lovely pet?" className="w-full bg-white border border-border-light rounded-xl px-4 py-3 text-sm min-h-[90px] focus:outline-none focus:border-[#66B4B1] resize-none" />
                  </div>

                  <div className="flex gap-3 mt-4">
                    <button type="button" onClick={() => setShowAdoptForm(false)} className="flex-1 bg-bg-secondary hover:bg-border-light/50 text-text-primary font-bold h-12 rounded-xl transition-colors">
                      Cancel
                    </button>
                    <button type="submit" className="flex-1 bg-[#66B4B1] hover:bg-[#66B4B1]/90 text-white font-bold h-12 rounded-xl shadow-sm active:scale-95 transition-all">
                      Submit Screening
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              adoptPets.map((pet) => (
                <div key={pet.id} className="bg-white rounded-[24px] border border-border-light p-4 shadow-sm flex flex-col gap-4">
                  <div className="flex gap-4">
                    <img src={pet.img} alt={pet.name} className="w-24 h-24 rounded-2xl object-cover border" />
                    <div className="flex-1 flex flex-col justify-center">
                      <span className="text-[10px] font-bold text-[#66B4B1] bg-[#FAF7F2] px-2.5 py-0.5 rounded-full w-fit mb-1">{pet.shelter}</span>
                      <h3 className="text-xl font-bold text-text-primary">{pet.name}</h3>
                      <p className="text-xs text-text-secondary">{pet.breed} • {pet.age}</p>
                      <span className="text-xs text-text-disabled mt-1 flex items-center gap-0.5"><MapPin size={10} /> {pet.location}</span>
                    </div>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed bg-bg-secondary/40 p-3 rounded-xl">
                    {pet.desc}
                  </p>
                  <button 
                    onClick={() => {
                      setAdoptPetItem(pet);
                      setShowAdoptForm(true);
                    }}
                    className="w-full bg-[#66B4B1] hover:bg-[#66B4B1]/90 text-white font-bold h-11 rounded-xl shadow-sm active:scale-95 transition-all"
                  >
                    Adopt Me
                  </button>
                </div>
              ))
            )}
          </div>
        )}

      </div>

      {/* DETAILS VIEW MODAL (FOR BUY TAB) */}
      {selectedPet && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 flex items-end justify-center animate-in fade-in duration-300">
          <div className="w-full bg-white rounded-t-[32px] p-6 max-h-[90%] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-8 duration-300 relative">
            
            <button 
              onClick={() => setSelectedPet(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-bg-secondary flex items-center justify-center font-bold text-text-secondary hover:text-text-primary"
            >
              ✕
            </button>

            <img src={selectedPet.img} alt={selectedPet.name} className="w-full h-48 rounded-[24px] object-cover mb-4 shadow-sm" />

            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs font-bold text-[#66B4B1] bg-[#FAF7F2] px-2.5 py-0.5 rounded-full">{selectedPet.vaccinated}</span>
                <h2 className="text-2xl font-black text-text-primary mt-1">{selectedPet.name}</h2>
                <p className="text-sm text-text-secondary">{selectedPet.breed} • {selectedPet.age} • {selectedPet.gender}</p>
              </div>
              <span className="text-2xl font-black text-[#66B4B1]">₹{selectedPet.price}</span>
            </div>

            <div className="flex flex-col gap-3 p-4 bg-bg-secondary/40 rounded-2xl mb-6">
              <div className="flex items-center gap-2 text-xs text-text-primary">
                <Award size={16} className="text-[#66B4B1]" />
                <span className="font-semibold">{selectedPet.cert}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <MapPin size={16} className="text-text-secondary" />
                <span>Seller Location: {selectedPet.location}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <ShieldAlert size={16} className="text-[#66B4B1]" />
                <span>Verified Seller: <strong className="text-text-primary">{selectedPet.seller}</strong></span>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => {
                  setSelectedPet(null);
                  navigate('/app/chat/room', { state: { pet: { name: selectedPet.name, img: selectedPet.img } } });
                }}
                className="flex-1 border border-border-light hover:border-[#66B4B1]/50 h-13 rounded-xl flex items-center justify-center gap-2 font-bold text-text-primary hover:bg-bg-secondary/20 transition-all active:scale-95"
              >
                <MessageCircle size={18} className="text-text-secondary" /> Message Seller
              </button>
              <button 
                onClick={() => setShowBookingModal(true)}
                className="flex-1 bg-[#F87B68] hover:bg-[#F87B68]/90 text-white font-bold h-13 rounded-xl shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1"
              >
                Book Visit
              </button>
            </div>

          </div>
        </div>
      )}

      {/* BOOK VISIT CONFIRMATION MODAL */}
      {showBookingModal && selectedPet && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl animate-in zoom-in-95">
            <h3 className="font-bold text-text-primary text-lg mb-2">Book a Visit?</h3>
            <p className="text-sm text-text-secondary mb-4">
              Schedule a local meeting in <span className="font-bold">{selectedPet.location.split(',')[0]}</span> to verify certificates and meet {selectedPet.name} before reservation.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowBookingModal(false)} className="flex-1 bg-bg-secondary hover:bg-border-light/50 font-bold py-3 rounded-xl transition-colors">
                Cancel
              </button>
              <button onClick={handleBookVisit} className="flex-1 bg-[#F87B68] hover:bg-[#F87B68]/90 text-white font-bold py-3 rounded-xl active:scale-95 shadow-sm transition-all">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL BOOKING SUCCESS BANNER */}
      {bookingSuccess && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="w-16 h-16 bg-[#FAF7F2] rounded-full flex items-center justify-center mb-4">
            <Check className="text-[#66B4B1] stroke-[3px]" size={32} />
          </div>
          <h2 className="text-2xl font-black text-text-primary mb-1">Meetup Booked!</h2>
          <p className="text-sm text-text-secondary mb-4 max-w-[280px]">
            Your appointment has been added to Booking History. The seller will get in touch soon!
          </p>
          <div className="w-5 h-5 border-2 border-primary-main/30 border-t-primary-main rounded-full animate-spin"></div>
        </div>
      )}

    </div>
  );
}
