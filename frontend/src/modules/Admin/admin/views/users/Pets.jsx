import React, { useState, useEffect } from 'react';
import {
  PawPrint, Search, Filter, MoreVertical, CheckCircle2,
  XCircle, HeartPulse, Stethoscope, User, Calendar, Activity, ChevronRight
} from 'lucide-react';
import { fetchAdminPets } from '../../../../../services/admin';

export function Pets() {
  const [mockPets, setMockPets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecies, setFilterSpecies] = useState('All');
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [selectedPet, setSelectedPet] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    fetchAdminPets().then(setMockPets).catch((err) => console.error('Failed to load pets', err));
  }, []);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredPets = mockPets.filter(pet => {
    const matchesSearch = pet.name.toLowerCase().includes(searchTerm.toLowerCase()) || pet.owner.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecies = filterSpecies === 'All' || pet.species === filterSpecies;
    return matchesSearch && matchesSpecies;
  });

  const displayedPets = showAll ? filteredPets : filteredPets.slice(0, 5);

  const handleExport = () => {
    const headers = ['ID', 'Name', 'Species', 'Breed', 'Age', 'Owner', 'Vaccinated', 'Health Status'];
    const csvContent = [
      headers.join(','),
      ...filteredPets.map(pet => 
        [pet.id, pet.name, pet.species, pet.breed, pet.age, `"${pet.owner}"`, pet.vaccinated ? 'Yes' : 'No', pet.healthStatus].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'pet_registry_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 animate-in fade-in duration-500">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[100] animate-slide-in-right">
          <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-slate-200 flex items-center gap-3">
             <div className={`w-6 h-6 rounded-full flex items-center justify-center ${toastMessage.type === 'error' ? 'bg-rose-100 text-rose-600' : toastMessage.type === 'info' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {toastMessage.type === 'error' ? <XCircle size={14}/> : <CheckCircle2 size={14}/>}
             </div>
             <p className="text-[13px] font-bold text-slate-800">{toastMessage.text}</p>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Pet Registry</h1>
          <p className="text-[12px] sm:text-sm font-semibold text-slate-500 mt-0.5 sm:mt-1">Manage and monitor all registered pets on the platform.</p>
        </div>
        <button 
          onClick={handleExport}
          className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-sm transition"
        >
          Export Registry
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
        {[
          { label: 'Total Registered Pets', value: '15,840', trend: '+210 this week', icon: PawPrint, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Vaccination Rate', value: '88.5%', trend: 'Verified Records', icon: Stethoscope, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Dogs vs Cats', value: '65% / 30%', trend: '5% Other species', icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' }
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex items-center gap-3 sm:gap-4 hover:shadow-md transition">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${kpi.bg} ${kpi.color}`}>
              <kpi.icon size={20} className="sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">{kpi.label}</p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight mt-0.5">{kpi.value}</h3>
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 mt-0.5">{kpi.trend}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
        <div className="relative w-full sm:w-96">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search pets by name or owner..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[16px] sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {['All', 'Dog', 'Cat'].map(species => (
            <button 
              key={species}
              onClick={() => setFilterSpecies(species)}
              className={`flex-1 sm:flex-none px-3 py-2 sm:px-4 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition ${filterSpecies === species ? 'bg-teal-500 text-white shadow-md' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
            >
              {species}
            </button>
          ))}
          <button onClick={() => showToast("Filters opened")} className="p-2 sm:p-2.5 bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl transition">
            <Filter size={16} />
          </button>
        </div>
      </div>

      {/* Pets List Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        
        {/* Mobile/Tablet Card View */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden divide-y md:divide-y-0 md:gap-4 md:p-4 divide-slate-100">
          {displayedPets.map((pet) => (
            <div key={pet.id} className="p-4 md:rounded-xl md:border md:border-slate-200 flex flex-col gap-3 bg-white hover:bg-slate-50 transition shadow-sm md:shadow-none">
              
              {/* Top Row: Avatar, Name, Action */}
              <div className="flex justify-between items-start">
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <img src={pet.avatar} alt={pet.name} className="w-10 h-10 rounded-full object-cover border border-slate-100 shadow-sm shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5 leading-tight">
                      {pet.name}
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${pet.species === 'Dog' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                        {pet.species}
                      </span>
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">ID: {pet.id}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 relative">
                  <button 
                    onClick={() => setActiveDropdown(activeDropdown === pet.id ? null : pet.id)}
                    className="p-1.5 text-slate-400 hover:text-teal-600 transition rounded-lg"
                  >
                    <MoreVertical size={18} />
                  </button>
                  {activeDropdown === pet.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)}></div>
                      <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-200 text-left flex flex-col">
                        <button onClick={() => { setActiveDropdown(null); setSelectedPet(pet); setIsProfileOpen(true); }} className="w-full text-left px-4 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition">View Profile</button>
                        <button onClick={() => { setActiveDropdown(null); showToast(`Edit mode for ${pet.name}`, 'info'); }} className="w-full text-left px-4 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition">Edit Pet</button>
                        <div className="h-px bg-slate-100 my-1 w-full"></div>
                        <button onClick={() => { setActiveDropdown(null); showToast(`Pet removed successfully`, 'error'); }} className="w-full text-left px-4 py-2 text-[13px] font-semibold text-rose-600 hover:bg-rose-50 transition">Remove Pet</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {/* Middle Row: Info & Badges */}
              <div className="flex flex-col gap-2.5 mt-1 pl-0 sm:pl-[52px]">
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  <span className="flex items-center gap-1.5 text-[12px] font-bold text-slate-700">
                    {pet.breed}
                  </span>
                  <span className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500">
                    <Calendar size={12} className="text-slate-400" /> {pet.age}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                    <User size={10} />
                  </div>
                  <span className="text-[12px] font-semibold text-slate-700 truncate">{pet.owner}</span>
                </div>
                
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${pet.vaccinated ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                    {pet.vaccinated ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    {pet.vaccinated ? 'Vaccinated' : 'Unvaccinated'}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                    <HeartPulse size={12} className={pet.healthStatus === 'Excellent' ? 'text-emerald-500' : 'text-amber-500'} /> 
                    {pet.healthStatus}
                  </span>
                </div>
              </div>

            </div>
          ))}
          {filteredPets.length === 0 && (
            <div className="p-8 md:col-span-2 text-center text-slate-500 font-medium text-sm">
              No pets found matching your criteria.
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px] whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">Pet Details</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">Breed & Age</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">Owner</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">Health Status</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {displayedPets.map((pet) => (
                <tr key={pet.id} className="hover:bg-slate-50/50 transition group">
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                      <img src={pet.avatar} alt={pet.name} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm shrink-0" />
                      <div className="min-w-max">
                        <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          {pet.name}
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${pet.species === 'Dog' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                            {pet.species}
                          </span>
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">ID: {pet.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1 min-w-max">
                      <p className="text-[13px] font-bold text-slate-700">{pet.breed}</p>
                      <p className="text-[12px] font-medium text-slate-500 flex items-center gap-1"><Calendar size={12} className="text-slate-400" /> {pet.age}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 min-w-max">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                        <User size={12} />
                      </div>
                      <span className="text-sm font-semibold text-slate-700 hover:text-teal-600 cursor-pointer transition">{pet.owner}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 min-w-max">
                    <div className="flex flex-col gap-1.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full w-max text-[10px] font-black uppercase tracking-wider ${pet.vaccinated ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                        {pet.vaccinated ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {pet.vaccinated ? 'Vaccinated' : 'Unvaccinated'}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                        <HeartPulse size={12} className={pet.healthStatus === 'Excellent' ? 'text-emerald-500' : 'text-amber-500'} /> 
                        {pet.healthStatus}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right min-w-max relative">
                    <button 
                      onClick={() => setActiveDropdown(activeDropdown === pet.id ? null : pet.id)}
                      className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition inline-flex"
                    >
                      <MoreVertical size={18} />
                    </button>
                    {activeDropdown === pet.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)}></div>
                        <div className="absolute right-6 top-10 mt-1 w-40 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-200 text-left flex flex-col">
                          <button onClick={() => { setActiveDropdown(null); setSelectedPet(pet); setIsProfileOpen(true); }} className="w-full text-left px-4 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition">View Profile</button>
                          <button onClick={() => { setActiveDropdown(null); showToast(`Edit mode for ${pet.name}`, 'info'); }} className="w-full text-left px-4 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition">Edit Pet</button>
                          <div className="h-px bg-slate-100 my-1 w-full"></div>
                          <button onClick={() => { setActiveDropdown(null); showToast(`Pet removed successfully`, 'error'); }} className="w-full text-left px-4 py-2 text-[13px] font-semibold text-rose-600 hover:bg-rose-50 transition">Remove Pet</button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {filteredPets.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500 font-medium text-sm">
                    No pets found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* View All Footer */}
        {filteredPets.length > 5 && !showAll && (
          <div className="p-4 sm:p-5 border-t border-slate-100 flex justify-center bg-slate-50/50">
            <button 
              onClick={() => setShowAll(true)}
              className="px-6 py-2.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-[13px] font-bold rounded-xl shadow-sm transition"
            >
              View All {filteredPets.length} Pets
            </button>
          </div>
        )}
      </div>

      {/* Profile Drawer */}
      {isProfileOpen && selectedPet && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm transition-all duration-300">
          <div className="absolute inset-0" onClick={() => setIsProfileOpen(false)} />
          <div className="relative w-full max-w-[500px] bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-slide-in-right">
             {/* Header */}
             <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                   <img src={selectedPet.avatar} alt={selectedPet.name} className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-sm" />
                   <div>
                      <h2 className="text-xl font-black text-slate-900">{selectedPet.name}</h2>
                      <p className="text-[13px] font-semibold text-slate-500">ID: {selectedPet.id} • {selectedPet.breed}</p>
                   </div>
                </div>
                <button onClick={() => setIsProfileOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition">
                   <XCircle size={24} />
                </button>
             </div>
             
             {/* Body */}
             <div className="p-6 flex-1 overflow-y-auto bg-slate-50/30">
                <div className="space-y-6">
                   <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                      <h3 className="text-sm font-bold text-slate-800 mb-4">Pet Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Species</p>
                            <p className="text-[14px] font-semibold text-slate-700 mt-1">{selectedPet.species}</p>
                         </div>
                         <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Age</p>
                            <p className="text-[14px] font-semibold text-slate-700 mt-1">{selectedPet.age}</p>
                         </div>
                         <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Health Status</p>
                            <p className="text-[14px] font-semibold mt-1 flex items-center gap-1.5"><HeartPulse size={14} className={selectedPet.healthStatus === 'Excellent' ? 'text-emerald-500' : 'text-amber-500'} /> {selectedPet.healthStatus}</p>
                         </div>
                         <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Vaccinated</p>
                            <p className="text-[14px] font-semibold mt-1 flex items-center gap-1.5">
                              {selectedPet.vaccinated ? <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 size={14}/> Yes</span> : <span className="text-rose-600 flex items-center gap-1"><XCircle size={14}/> No</span>}
                            </p>
                         </div>
                      </div>
                   </div>

                   <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                      <h3 className="text-sm font-bold text-slate-800 mb-4">Owner Details</h3>
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                            <User size={18} />
                         </div>
                         <div>
                            <p className="text-[14px] font-bold text-slate-900">{selectedPet.owner}</p>
                            <p className="text-[12px] font-medium text-slate-500">Owner & Primary Contact</p>
                         </div>
                      </div>
                   </div>
                </div>
             </div>

             {/* Footer Actions */}
             <div className="p-6 border-t border-slate-100 bg-white grid grid-cols-2 gap-3">
                <button onClick={() => { showToast('Profile update initiated', 'info'); setIsProfileOpen(false); }} className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-[13px] font-bold hover:bg-slate-50 transition">
                   Edit Profile
                </button>
                <button onClick={() => { showToast('Medical records downloaded'); }} className="px-4 py-2.5 bg-teal-500 text-white rounded-xl text-[13px] font-bold hover:bg-teal-600 transition shadow-sm">
                   Download Records
                </button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Pets;
