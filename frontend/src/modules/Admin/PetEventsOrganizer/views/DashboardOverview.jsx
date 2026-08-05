import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePetEvents } from '../context/PetEventsContext';
import {
  CalendarDays, Ticket, MessageSquare, TrendingUp,
  Clock, MapPin, CalendarClock, Inbox
} from 'lucide-react';
import { cn } from '../../../user/utils/cn';

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
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">

      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Dashboard Overview</h2>
        <p className="text-sm font-semibold text-slate-500 mt-0.5">Welcome back! Here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: 'Active Events', value: activeEventsCount, icon: CalendarDays, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
          { label: "Today's Bookings", value: todaysBookings.length, icon: Ticket, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
          { label: 'Pending Requests', value: pendingRequests.length, icon: MessageSquare, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
          { label: 'Available Slots', value: availableSlotsCount, icon: CalendarClock, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-md transition">
            <div className="flex justify-between items-start mb-4">
              <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-110", stat.bg, stat.color, stat.border)}>
                <stat.icon size={20} />
              </div>
            </div>
            <div>
              <h4 className="text-3xl font-black text-slate-900">{stat.value}</h4>
              <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

        <div className="lg:col-span-2 space-y-6">

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Clock size={18} className="text-orange-500" /> Today's Schedule
              </h3>
              <button onClick={() => navigate('/vendor/events-organizer/calendar')} className="text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 px-3 py-1.5 rounded-lg transition cursor-pointer">View Calendar</button>
            </div>
            <div className="p-5 space-y-4">
              {todaysEvents.length ? todaysEvents.map((item) => (
                <div key={item.id} className="flex gap-4 p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition cursor-pointer group" onClick={() => navigate('/vendor/events-organizer/events')}>
                  <div className="w-20 text-right shrink-0">
                    <p className="text-sm font-black text-slate-900 group-hover:text-orange-600 transition">{item.time || '—'}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{item.status}</p>
                  </div>
                  <div className="w-px bg-slate-200 group-hover:bg-orange-200 transition"></div>
                  <div>
                    <h4 className="text-base font-black text-slate-800">{item.title}</h4>
                    <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1"><MapPin size={12}/> {item.location || 'No location set'}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">{item.booked}/{item.capacity} tickets sold</p>
                  </div>
                </div>
              )) : (
                <p className="text-sm font-semibold text-slate-400 text-center py-6">No events scheduled for today.</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-slate-900">Recent Bookings</h3>
              <button onClick={() => navigate('/vendor/events-organizer/bookings')} className="text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer">View All</button>
            </div>
            <div className="divide-y divide-slate-50">
              {bookings.slice(0, 5).map((b) => (
                <div key={b.id} className="flex justify-between items-center py-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{b.customer}</p>
                    <p className="text-xs font-semibold text-slate-500">{b.event}</p>
                  </div>
                  <p className="text-sm font-black text-slate-900">₹{b.amount.toLocaleString()}</p>
                </div>
              ))}
              {!bookings.length && (
                <p className="text-sm font-semibold text-slate-400 text-center py-6">No bookings yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-50">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Inbox size={16} className="text-orange-500" /> Pending Requests
              </h3>
            </div>
            <div className="p-3">
              {pendingRequests.length ? pendingRequests.slice(0, 5).map((r) => (
                <div key={r.id} className="p-3 mb-2 last:mb-0 rounded-2xl hover:bg-slate-50 transition border border-transparent hover:border-slate-100 cursor-pointer" onClick={() => navigate('/vendor/events-organizer/requests')}>
                  <div className="flex justify-between items-start">
                    <h4 className="text-sm font-bold text-slate-800">{r.customer || 'Customer'}</h4>
                    <span className="w-2 h-2 rounded-full bg-orange-500 mt-1.5"></span>
                  </div>
                  <p className="text-xs font-medium text-slate-500 mt-1 leading-relaxed">{r.type}{r.date ? ` · ${r.date}` : ''}</p>
                </div>
              )) : (
                <p className="text-sm font-semibold text-slate-400 text-center py-6">No pending requests.</p>
              )}
            </div>
          </div>

          <div className="bg-slate-900 rounded-3xl shadow-xl overflow-hidden p-6 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>

            <h3 className="text-base font-black text-white mb-6 relative z-10 flex items-center gap-2">
              <TrendingUp size={16} className="text-orange-400" /> Earnings Snapshot
            </h3>

            <div className="space-y-5 relative z-10">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Lifetime Earnings</p>
                <h4 className="text-2xl font-black text-white">₹{finances.weeklyRevenue.toLocaleString()}</h4>
              </div>
              <div className="w-full h-px bg-slate-800"></div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pending Settlement</p>
                <h4 className="text-lg font-black text-emerald-400">₹{finances.pendingPayout.toLocaleString()}</h4>
              </div>
            </div>

            <button onClick={() => navigate('/vendor/events-organizer/finance')} className="w-full mt-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition cursor-pointer backdrop-blur-sm border border-white/5">
              View Financial Report
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
