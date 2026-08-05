import React, { useState } from 'react';
import { usePetEvents } from '../context/PetEventsContext';
import { useNavigate } from 'react-router-dom';
import { 
  CalendarDays, MapPin, Users, IndianRupee, 
  MoreVertical, Edit2, Copy, EyeOff, CheckCircle, 
  Search, Filter, Plus
} from 'lucide-react';
import { cn } from '../../../user/utils/cn';

export function EventsView() {
  const { events, updateEvent, addEvent } = usePetEvents();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [menuOpen, setMenuOpen] = useState(null);
  const [error, setError] = useState('');

  const statuses = ['All', 'Published', 'Draft', 'Fully Booked', 'Completed', 'Cancelled'];

  const filteredEvents = events.filter(e => {
    const matchSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) || e.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'All' || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getStatusColor = (status) => {
    switch(status) {
      case 'Published': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Draft': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'Fully Booked': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Completed': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const handleAction = async (e, id, action) => {
    e.stopPropagation();
    setMenuOpen(null);
    setError('');
    try {
      if (action === 'edit') navigate(`/vendor/events-organizer/events/${id}/edit`);
      if (action === 'publish') await updateEvent(id, { status: 'Published' });
      if (action === 'unpublish') await updateEvent(id, { status: 'Draft' });
      if (action === 'duplicate') {
        const source = events.find((ev) => ev.id === id);
        if (source) {
          await addEvent({ ...source, title: `${source.title} (Copy)`, status: 'Draft' });
        }
      }
      if (action === 'cancel') {
        if (window.confirm('Are you sure you want to cancel this event?')) await updateEvent(id, { status: 'Cancelled' });
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not complete that action');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Event Management</h2>
          <p className="text-sm font-semibold text-slate-500 mt-0.5">Manage your public and private pet events.</p>
        </div>
        <button 
          onClick={() => navigate('/vendor/events-organizer/events/create')}
          className="flex items-center gap-2 bg-[#F87B68] hover:bg-[#F87B68] text-white px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-lg shadow-orange-900/20 cursor-pointer"
        >
          <Plus size={18} /> Create New Event
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-100 text-red-700 text-sm font-semibold rounded-2xl p-4">{error}</div>}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition border cursor-pointer",
                statusFilter === s 
                  ? "bg-slate-900 text-white border-slate-900 shadow-md" 
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-72 shrink-0">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search events..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
          />
        </div>
      </div>

      {/* Event Grid */}
      {filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map(event => (
            <div key={event.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden group hover:shadow-md transition">
              {/* Image Placeholder */}
              <div className="h-40 bg-slate-100 relative overflow-hidden">
                {event.image ? (
                  <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                    <CalendarDays size={40} className="opacity-50" />
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  <span className={cn("px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg border shadow-sm backdrop-blur-md", getStatusColor(event.status))}>
                    {event.status}
                  </span>
                </div>
                <div className="absolute top-4 right-4">
                  <span className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg bg-white/90 text-slate-900 shadow-sm backdrop-blur-md">
                    {event.category}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <div className="flex justify-between items-start mb-4 relative">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 group-hover:text-[#F87B68] transition line-clamp-1">{event.title}</h3>
                    <p className="text-xs font-bold text-slate-500 mt-1">{event.date} • {event.time}</p>
                  </div>
                  
                  {/* Action Menu */}
                  <div className="relative">
                    <button 
                      onClick={() => setMenuOpen(menuOpen === event.id ? null : event.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                    >
                      <MoreVertical size={18} />
                    </button>
                    
                    {menuOpen === event.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)}></div>
                        <div className="absolute right-0 top-8 w-40 bg-white border border-slate-100 rounded-xl shadow-xl py-1 z-50 animate-in fade-in zoom-in-95">
                          <button onClick={(e) => handleAction(e, event.id, 'edit')} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"><Edit2 size={14}/> Edit Event</button>
                          {event.status === 'Draft' ? (
                            <button onClick={(e) => handleAction(e, event.id, 'publish')} className="w-full text-left px-4 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-50 flex items-center gap-2 cursor-pointer"><CheckCircle size={14}/> Publish</button>
                          ) : (
                            <button onClick={(e) => handleAction(e, event.id, 'unpublish')} className="w-full text-left px-4 py-2 text-xs font-bold text-orange-600 hover:bg-orange-50 flex items-center gap-2 cursor-pointer"><EyeOff size={14}/> Unpublish</button>
                          )}
                          <button onClick={(e) => handleAction(e, event.id, 'duplicate')} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"><Copy size={14}/> Duplicate</button>
                          <div className="h-px bg-slate-100 my-1"></div>
                          <button onClick={(e) => handleAction(e, event.id, 'cancel')} className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer">Cancel Event</button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 text-slate-400"><MapPin size={14} /></div>
                    <span className="truncate">{event.location}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 text-slate-400"><Users size={14} /></div>
                    <span>{event.booked} / {event.capacity} Booked</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 text-slate-400"><IndianRupee size={14} /></div>
                    <span>₹{event.price.toLocaleString()} per ticket</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 mb-5">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                    <span>Capacity Filled</span>
                    <span>{Math.round((event.booked / event.capacity) * 100)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all duration-1000", (event.booked / event.capacity) >= 1 ? "bg-red-500" : "bg-[#F87B68]")} 
                      style={{ width: `${(event.booked / event.capacity) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <button 
                  onClick={() => navigate(`/vendor/events-organizer/bookings?event=${event.id}`)}
                  className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer border border-slate-200"
                >
                  View Bookings
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 p-12 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
            <CalendarDays size={32} />
          </div>
          <h3 className="text-lg font-black text-slate-900 mb-1">No events found</h3>
          <p className="text-sm font-medium text-slate-500 max-w-sm">
            {searchQuery ? `No events match "${searchQuery}". Try a different filter.` : "You haven't created any events yet."}
          </p>
          {!searchQuery && (
            <button 
              onClick={() => navigate('/vendor/events-organizer/events/create')}
              className="mt-6 px-6 py-2.5 bg-[#F87B68] text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-900/20 hover:bg-[#F87B68] transition cursor-pointer"
            >
              Create First Event
            </button>
          )}
        </div>
      )}
    </div>
  );
}
