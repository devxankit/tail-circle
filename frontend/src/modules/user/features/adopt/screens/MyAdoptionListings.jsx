import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, MessageCircle, Trash2, CheckCircle2, AlertCircle, MapPin, Tag, Gift, ChevronRight } from 'lucide-react';
import { getMyAdoptionListings, updateAdoptionListing, deleteAdoptionListing } from '../../../../../services/adoptApi';

export function MyAdoptionListings() {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const loadListings = async () => {
    try {
      setLoading(true);
      const data = await getMyAdoptionListings();
      setListings(data);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, []);

  const handleStatusChange = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'Available' ? 'Adopted' : 'Available';
    try {
      setUpdatingId(id);
      await updateAdoptionListing(id, { status: nextStatus });
      setListings(prev => prev.map(item => item._id === id ? { ...item, status: nextStatus } : item));
    } catch (err) {
      alert('Failed to update status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this adoption listing?')) return;
    try {
      setUpdatingId(id);
      await deleteAdoptionListing(id);
      setListings(prev => prev.filter(item => item._id !== id));
    } catch (err) {
      alert('Failed to delete listing.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF7F2] pb-12 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-white sticky top-0 z-20 border-b border-gray-100/50 shadow-sm">
        <button onClick={() => navigate('/app/adopt')} className="p-1.5 -ml-1 text-gray-900 hover:bg-gray-50 rounded-full transition-colors cursor-pointer">
          <ChevronLeft size={22} strokeWidth={2.5} />
        </button>
        <h1 className="text-[17px] font-black text-gray-900 tracking-tight">My Adoption Listings 🐾</h1>
        <button 
          onClick={() => navigate('/app/adopt/list-pet')} 
          className="p-1.5 text-[#66B4B1] hover:bg-[#66B4B1]/10 rounded-full transition-colors cursor-pointer"
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>
      </div>

      <div className="px-5 pt-6 flex-1 max-w-xl mx-auto w-full">
        
        {/* Banner CTA */}
        <div className="mb-6 p-4 bg-white rounded-[24px] border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="text-[14px] font-black text-gray-900">Have a Pet to Rehome?</h3>
            <p className="text-[12px] text-gray-500 font-bold mt-0.5">List your pet to find a verified loving home.</p>
          </div>
          <button
            onClick={() => navigate('/app/adopt/list-pet')}
            className="px-4 py-2.5 bg-[#66B4B1] hover:bg-[#599D9A] text-white rounded-[14px] font-black text-xs shadow-sm flex items-center gap-1 shrink-0 cursor-pointer active:scale-95 transition-all"
          >
            <Plus size={14} /> Add Pet
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400 font-bold">Loading your listings...</div>
        ) : listings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-[24px] border border-gray-100 p-6">
            <p className="text-gray-500 font-bold text-sm mb-4">You haven't listed any pets for adoption yet.</p>
            <button
              onClick={() => navigate('/app/adopt/list-pet')}
              className="px-5 py-3 bg-[#66B4B1] text-white rounded-[16px] font-black text-xs shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={16} /> List a Pet Now
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {listings.map(item => {
              const isFree = item.price === 0;
              const isAdopted = item.status === 'Adopted';

              return (
                <div key={item._id} className="bg-white rounded-[24px] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-100/80">
                  <div className="flex gap-3.5 mb-3.5">
                    <img 
                      src={item.images[0] || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=150&q=80'} 
                      alt={item.name}
                      className="w-20 h-20 rounded-[18px] object-cover shrink-0 bg-gray-50" 
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1 gap-2">
                        <h3 className="text-[16px] font-black text-gray-900 truncate">{item.name}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                          isAdopted ? 'bg-gray-100 text-gray-600' : 'bg-emerald-50 text-emerald-600 border border-emerald-200/50'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="text-[12px] text-gray-500 font-bold mb-1 truncate">{item.breed} • {item.gender} • {item.age}</p>
                      
                      <div className="flex items-center gap-2 text-[11.5px] font-bold text-gray-600">
                        <span className="flex items-center gap-0.5"><MapPin size={12} className="text-[#66B4B1]" /> {item.location || 'Indore'}</span>
                        <span>•</span>
                        <span className="text-[#599D9A]">{isFree ? '🎁 Free' : `₹${item.price}`}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => handleStatusChange(item._id, item.status)}
                      disabled={updatingId === item._id}
                      className={`py-2 px-2 rounded-[12px] text-[11px] font-black border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        isAdopted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-700 border-gray-200'
                      }`}
                    >
                      <CheckCircle2 size={13} /> {isAdopted ? 'Mark Available' : 'Mark Adopted'}
                    </button>

                    <button
                      onClick={() => navigate(`/app/adopt/chat/${item._id}`)}
                      className="py-2 px-2 bg-[#FAF7F2] hover:bg-gray-100 text-[#599D9A] rounded-[12px] text-[11px] font-black border border-[#66B4B1]/30 transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <MessageCircle size={13} /> Adoption Inquiries
                    </button>

                    <button
                      onClick={() => handleDelete(item._id)}
                      disabled={updatingId === item._id}
                      className="py-2 px-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-[12px] text-[11px] font-black border border-red-200/50 transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
