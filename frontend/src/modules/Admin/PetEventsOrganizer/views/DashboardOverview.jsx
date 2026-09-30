import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePetEvents } from '../context/PetEventsContext';
import {
  CalendarDays, Ticket, MessageSquare, TrendingUp,
  Clock, MapPin, CalendarClock, Inbox
} from 'lucide-react';
import { PendingBookingRequests } from '../../components/PendingBookingRequests';
import { StatGrid, SectionLabel, ListCard } from '../../vendor/mobile';

const todayStr = () => new Date().toISOString().slice(0, 10);
const asDate = (d) => (d ? String(d).slice(0, 10) : '');

export function DashboardOverview() {
  const { events, bookings, calendarSlots, customerRequests, finances } = usePetEvents();
  const navigate = useNavigate();
  const today = todayStr();

  const activeEventsCount = events.filter(e => e.status === 'Published' || e.status === 'Fully Booked').length;
  const todaysBookings = bookings.filter(b => asDate(b.date) === today);
  const pendingRequests = customerRequests.filter(r => r.status === 'New');
  const availableSlotsCount = calendarSlots.filter(s => s.status === 'Available').length;
  const todaysEvents = events.filter(e => asDate(e.date) === today);

  return (
    <div className="space-y-5">
      <PendingBookingRequests compact />

      <div className="px-1">
        <h2 className="text-lg font-bold text-text-primary leading-tight">Dashboard Overview</h2>
        <p className="text-xs text-text-secondary mt-1">Welcome back! Here's what's happening today.</p>
      </div>

      <StatGrid
        tiles={[
          { label: 'Active Events', value: activeEventsCount, icon: CalendarDays, tone: 'teal' },
          { label: "Today's Bookings", value: todaysBookings.length, icon: Ticket, tone: 'success' },
          { label: 'Pending Requests', value: pendingRequests.length, icon: MessageSquare, tone: 'warning' },
          { label: 'Available Slots', value: availableSlotsCount, icon: CalendarClock, tone: 'primary' },
        ]}
      />

      {/* Earnings snapshot — the dark card, in the app's hero style. */}
      <div className="bg-gradient-to-tr from-[#4C8684] to-[#80C1BF] rounded-[28px] shadow-lg overflow-hidden p-5 relative text-white">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-x-10 -translate-y-10"></div>
        <h3 className="text-sm font-black mb-4 relative z-10 flex items-center gap-2">
          <TrendingUp size={16} /> Earnings Snapshot
        </h3>
        <div className="grid grid-cols-2 gap-4 relative z-10">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-85 mb-1">Lifetime Earnings</p>
            <h4 className="text-2xl font-black">₹{finances.weeklyRevenue.toLocaleString()}</h4>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-85 mb-1">Pending Settlement</p>
            <h4 className="text-2xl font-black">₹{finances.pendingPayout.toLocaleString()}</h4>
          </div>
        </div>
        <button onClick={() => navigate('/vendor/events-organizer/finance')} className="w-full mt-5 h-11 bg-white/20 active:bg-white/30 text-white rounded-xl text-xs font-bold transition cursor-pointer relative z-10">
          View Financial Report
        </button>
      </div>

      <div>
        <SectionLabel
          action={(
            <button onClick={() => navigate('/vendor/events-organizer/calendar')} className="min-h-[36px] text-xs font-bold text-primary-main cursor-pointer">View Calendar</button>
          )}
        >
          <span className="inline-flex items-center gap-1.5"><Clock size={14} /> Today's Schedule</span>
        </SectionLabel>
        {todaysEvents.length ? (
          <div className="space-y-3">
            {todaysEvents.map((item) => (
              <button key={item.id} type="button" className="w-full text-left bg-white flex gap-3 p-4 rounded-[20px] border border-border-light shadow-sm active:bg-bg-primary" onClick={() => navigate('/vendor/events-organizer/events')}>
                <div className="w-16 shrink-0">
                  <p className="text-sm font-black text-text-primary">{item.time || '—'}</p>
                  <p className="text-[10px] font-bold text-text-secondary uppercase mt-1">{item.status}</p>
                </div>
                <div className="w-px bg-border-light"></div>
                <div className="min-w-0">
                  <h4 className="text-[15px] font-bold text-text-primary">{item.title}</h4>
                  <p className="text-xs font-semibold text-text-secondary mt-1 flex items-center gap-1"><MapPin size={12} className="shrink-0" /> {item.location || 'No location set'}</p>
                  <p className="text-[10px] font-bold text-text-secondary uppercase mt-2">{item.booked}/{item.capacity} tickets sold</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="bg-white rounded-[20px] border border-border-light text-sm font-semibold text-text-secondary text-center py-6">No events scheduled for today.</p>
        )}
      </div>

      <div>
        <SectionLabel>
          <span className="inline-flex items-center gap-1.5"><Inbox size={14} /> Pending Requests</span>
        </SectionLabel>
        {pendingRequests.length ? (
          <div className="space-y-2">
            {pendingRequests.slice(0, 5).map((r) => (
              <ListCard
                key={r.id}
                title={r.customer || 'Customer'}
                subtitle={`${r.type}${r.date ? ` · ${r.date}` : ''}`}
                badge={<span className="w-2.5 h-2.5 rounded-full bg-primary-main mt-1.5 block"></span>}
                onClick={() => navigate('/vendor/events-organizer/requests')}
              />
            ))}
          </div>
        ) : (
          <p className="bg-white rounded-[20px] border border-border-light text-sm font-semibold text-text-secondary text-center py-6">No pending requests.</p>
        )}
      </div>

      <div>
        <SectionLabel
          action={(
            <button onClick={() => navigate('/vendor/events-organizer/bookings')} className="min-h-[36px] text-xs font-bold text-primary-main cursor-pointer">View All</button>
          )}
        >
          Recent Bookings
        </SectionLabel>
        <div className="bg-white rounded-[20px] border border-border-light shadow-sm divide-y divide-border-light">
          {bookings.slice(0, 5).map((b) => (
            <div key={b.id} className="flex justify-between items-center px-4 py-3 gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-text-primary truncate">{b.customer}</p>
                <p className="text-xs font-semibold text-text-secondary truncate">{b.event}</p>
              </div>
              <p className="text-sm font-black text-text-primary shrink-0">₹{b.amount.toLocaleString()}</p>
            </div>
          ))}
          {!bookings.length && (
            <p className="text-sm font-semibold text-text-secondary text-center py-6">No bookings yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
