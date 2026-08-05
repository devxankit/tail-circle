import React, { useState } from 'react';
import { usePetEvents } from '../context/PetEventsContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../../user/utils/cn';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const toISO = (d) => d.toISOString().slice(0, 10);
const startOfWeek = (d) => {
  const copy = new Date(d);
  copy.setDate(copy.getDate() - copy.getDay() + 1); // Monday
  return copy;
};

/** Slots are derived from real events (booked/capacity → Available/Booked). */
export function CalendarView() {
  const { calendarSlots } = usePetEvents();

  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const today = toISO(new Date());

  const getDaySlots = (dateString) => calendarSlots.filter(s => s.date === dateString);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return { name: DAY_NAMES[d.getDay()], date: toISO(d) };
  });

  const rangeLabel = `${new Date(days[0].date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${new Date(days[6].date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  const getStatusColor = (status) => {
    if (status === 'Booked') return 'bg-orange-100 border-orange-200 text-orange-900 border-l-4 border-l-orange-500';
    if (status === 'Available') return 'bg-emerald-50 border-emerald-100 text-emerald-900 border-l-4 border-l-emerald-500';
    return 'bg-white';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Availability Calendar</h2>
          <p className="text-sm font-semibold text-slate-500 mt-0.5">Slots are derived from your real events and their ticket sales.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setWeekStart(w => { const d = new Date(w); d.setDate(d.getDate() - 7); return d; })} className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 transition border border-slate-200 cursor-pointer"><ChevronLeft size={20}/></button>
          <div className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 flex items-center">{rangeLabel}</div>
          <button onClick={() => setWeekStart(w => { const d = new Date(w); d.setDate(d.getDate() + 7); return d; })} className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 transition border border-slate-200 cursor-pointer"><ChevronRight size={20}/></button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        {days.map((day, i) => {
          const slots = getDaySlots(day.date);
          const isToday = day.date === today;

          return (
            <div key={i} className={cn("flex-1 min-w-[150px] border-r border-slate-100 last:border-0", isToday ? "bg-orange-50/30" : "")}>
              <div className={cn("p-4 border-b border-slate-100 text-center sticky top-0 bg-white/90 backdrop-blur z-10", isToday ? "border-b-orange-200" : "")}>
                <p className={cn("text-[10px] font-black uppercase tracking-widest", isToday ? "text-orange-600" : "text-slate-400")}>{day.name}</p>
                <p className={cn("text-xl font-black mt-1", isToday ? "text-slate-900" : "text-slate-700")}>{day.date.split('-')[2]}</p>
              </div>

              <div className="p-2 space-y-2 h-[calc(100%-80px)] overflow-y-auto custom-scrollbar">
                {slots.length > 0 ? slots.map(slot => (
                  <div key={slot.id} className={cn("p-3 rounded-lg border text-left shadow-sm transition", getStatusColor(slot.status))}>
                    <p className="text-[10px] font-black uppercase tracking-wider mb-1 opacity-70">{slot.start}</p>
                    <p className="text-xs font-bold leading-tight">{slot.title}</p>
                  </div>
                )) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <p className="text-[10px] font-bold text-slate-300 uppercase">No events</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

    </div>
  );
}
