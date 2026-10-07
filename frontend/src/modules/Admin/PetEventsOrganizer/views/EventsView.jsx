import React, { useState } from 'react';
import { usePetEvents } from '../context/PetEventsContext';
import { useNavigate } from 'react-router-dom';
import { 
  CalendarDays, MapPin, Users, IndianRupee, 
  MoreVertical, Edit2, Copy, EyeOff, CheckCircle, 
  Filter, Plus
} from 'lucide-react';
import { cn } from '../../../user/utils/cn';
import { SearchBar, FilterChips, StatusBadge, ActionSheet, EmptyState, InlineError, CardAction, useConfirm } from '../../vendor/mobile';

const EVENT_TONE = { Published: 'success', Draft: 'neutral', 'Fully Booked': 'primary', Completed: 'info', Cancelled: 'error' };

export function EventsView() {
  const { events, updateEvent, addEvent } = usePetEvents();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [menuOpen, setMenuOpen] = useState(null);
  const [error, setError] = useState('');
  const confirm = useConfirm();

  const statuses = ['All', 'Published', 'Draft', 'Fully Booked', 'Completed', 'Cancelled'];

  const filteredEvents = events.filter(e => {
    const matchSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) || e.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'All' || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

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
        if (await confirm({ title: 'Are you sure you want to cancel this event?', confirmLabel: 'Cancel Event', cancelLabel: 'Keep Event', danger: true })) await updateEvent(id, { status: 'Cancelled' });
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Could not complete that action');
    }
  };

  const menuEvent = events.find((ev) => ev.id === menuOpen);

  return (
    <div className="space-y-4">

      {/* Header & Actions — "+ Create Event" lives here now (it was in the top bar). */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-text-primary leading-tight">Event Management</h2>
          <p className="text-xs text-text-secondary mt-1">Manage your public and private pet events.</p>
        </div>
        <button
          onClick={() => navigate('/vendor/events-organizer/events/create')}
          className="h-11 px-4 rounded-full bg-primary-main text-white text-sm font-bold flex items-center gap-1.5 shadow-md shadow-primary-main/25 shrink-0 cursor-pointer"
        >
          <Plus size={16} /> Create Event
        </button>
      </div>

      <InlineError>{error}</InlineError>

      <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search events..." />
      <FilterChips options={statuses} value={statusFilter} onChange={setStatusFilter} />

      {filteredEvents.length > 0 ? (
        <div className="space-y-4">
          {filteredEvents.map(event => (
            <div key={event.id} className="bg-white rounded-[24px] border border-border-light shadow-sm overflow-hidden">
              <div className="h-40 bg-bg-secondary relative overflow-hidden">
                {event.image ? (
                  <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-text-disabled">
                    <CalendarDays size={40} className="opacity-50" />
                  </div>
                )}
                <div className="absolute top-3 left-3">
                  <StatusBadge label={event.status} tone={EVENT_TONE[event.status] || 'neutral'} className="bg-white/95 backdrop-blur-md shadow-sm" />
                </div>
                <div className="absolute top-3 right-3">
                  <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-white/95 text-text-primary shadow-sm">
                    {event.category}
                  </span>
                </div>
              </div>

              <div className="p-4">
                <div className="flex justify-between items-start gap-2 mb-3">
                  <div className="min-w-0">
                    <h3 className="text-[17px] font-black text-text-primary line-clamp-1">{event.title}</h3>
                    <p className="text-xs font-bold text-text-secondary mt-1">{event.date} • {event.time}</p>
                  </div>
                  <button
                    onClick={() => setMenuOpen(event.id)}
                    aria-label="Event actions"
                    className="w-11 h-11 -mr-2 -mt-1 flex items-center justify-center text-text-secondary rounded-full active:bg-bg-secondary transition cursor-pointer shrink-0"
                  >
                    <MoreVertical size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4 text-xs font-semibold text-text-primary">
                  <div className="col-span-2 flex items-center gap-2"><MapPin size={14} className="text-text-secondary shrink-0" /><span className="truncate">{event.location}</span></div>
                  <div className="flex items-center gap-2"><Users size={14} className="text-text-secondary shrink-0" /><span>{event.booked} / {event.capacity} Booked</span></div>
                  <div className="flex items-center gap-2"><IndianRupee size={14} className="text-text-secondary shrink-0" /><span>₹{event.price.toLocaleString()} per ticket</span></div>
                </div>

                <div className="space-y-1.5 mb-4">
                  <div className="flex justify-between text-[10px] font-bold text-text-secondary uppercase">
                    <span>Capacity Filled</span>
                    <span>{Math.round((event.booked / event.capacity) * 100)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-bg-secondary rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-1000", (event.booked / event.capacity) >= 1 ? "bg-error" : "bg-primary-main")}
                      style={{ width: `${(event.booked / event.capacity) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <CardAction className="w-full" onClick={() => navigate(`/vendor/events-organizer/bookings?event=${event.id}`)}>
                  View Bookings
                </CardAction>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={CalendarDays}
          title="No events found"
          text={searchQuery ? `No events match "${searchQuery}". Try a different filter.` : "You haven't created any events yet."}
          action={!searchQuery && (
            <button
              onClick={() => navigate('/vendor/events-organizer/events/create')}
              className="h-11 px-6 bg-primary-main text-white rounded-full text-sm font-bold shadow-md shadow-primary-main/25 transition cursor-pointer"
            >
              Create First Event
            </button>
          )}
        />
      )}

      {/* The kebab menu, as an action sheet — same actions, same handler. */}
      <ActionSheet
        open={!!menuEvent}
        onClose={() => setMenuOpen(null)}
        title={menuEvent?.title}
        actions={menuEvent ? [
          { key: 'edit', label: 'Edit Event', icon: Edit2, onClick: (e) => handleAction(e, menuEvent.id, 'edit') },
          menuEvent.status === 'Draft'
            ? { key: 'publish', label: 'Publish', icon: CheckCircle, onClick: (e) => handleAction(e, menuEvent.id, 'publish') }
            : { key: 'unpublish', label: 'Unpublish', icon: EyeOff, onClick: (e) => handleAction(e, menuEvent.id, 'unpublish') },
          { key: 'duplicate', label: 'Duplicate', icon: Copy, onClick: (e) => handleAction(e, menuEvent.id, 'duplicate') },
          { key: 'cancel', label: 'Cancel Event', danger: true, onClick: (e) => handleAction(e, menuEvent.id, 'cancel') },
        ] : []}
      />
    </div>
  );
}
