import React, { useState } from 'react';
import { usePetEvents } from '../context/PetEventsContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../../user/utils/cn';
import { EmptyState } from '../../vendor/mobile';

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
  // Which day of the week is open in the list below the strip (UI only).
  const [selectedDate, setSelectedDate] = useState(today);

  const getDaySlots = (dateString) => calendarSlots.filter(s => s.date === dateString);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return { name: DAY_NAMES[d.getDay()], date: toISO(d) };
  });

  const rangeLabel = `${new Date(days[0].date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${new Date(days[6].date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  const getStatusColor = (status) => {
    if (status === 'Booked') return 'bg-white border-border-light border-l-4 border-l-primary-main';
    if (status === 'Available') return 'bg-white border-border-light border-l-4 border-l-success';
    return 'bg-white';
  };

  // The open day stays inside the week being shown.
  const activeDate = days.some((d) => d.date === selectedDate) ? selectedDate : days[0].date;
  const activeSlots = getDaySlots(activeDate);

  return (
    <div className="space-y-4">

      <div className="px-1">
        <h2 className="text-lg font-bold text-text-primary leading-tight">Availability Calendar</h2>
        <p className="text-xs text-text-secondary mt-1">Slots are derived from your real events and their ticket sales.</p>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => setWeekStart(w => { const d = new Date(w); d.setDate(d.getDate() - 7); return d; })} aria-label="Previous week" className="w-11 h-11 bg-white rounded-xl text-text-primary border border-border-light flex items-center justify-center shrink-0 cursor-pointer"><ChevronLeft size={20}/></button>
        <div className="flex-1 h-11 bg-white border border-border-light rounded-xl text-sm font-bold text-text-primary flex items-center justify-center text-center px-2">{rangeLabel}</div>
        <button onClick={() => setWeekStart(w => { const d = new Date(w); d.setDate(d.getDate() + 7); return d; })} aria-label="Next week" className="w-11 h-11 bg-white rounded-xl text-text-primary border border-border-light flex items-center justify-center shrink-0 cursor-pointer"><ChevronRight size={20}/></button>
      </div>

      {/* The week as a day strip; the chosen day's slots are listed below. */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const isToday = day.date === today;
          const on = day.date === activeDate;
          const count = getDaySlots(day.date).length;
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => setSelectedDate(day.date)}
              className={cn(
                'relative flex flex-col items-center justify-center h-[68px] rounded-[16px] border-2 transition-all',
                on ? 'bg-[#66B4B1] border-[#66B4B1] text-white shadow-lg shadow-[#66B4B1]/20' : 'bg-white border-border-light text-text-primary'
              )}
            >
              <span className={cn('text-[10px] font-black uppercase', on ? 'text-white/90' : isToday ? 'text-primary-main' : 'text-text-secondary')}>{day.name}</span>
              <span className="text-lg font-black leading-none mt-1">{day.date.split('-')[2]}</span>
              {count > 0 && <span className={cn('absolute bottom-1.5 w-1.5 h-1.5 rounded-full', on ? 'bg-white' : 'bg-primary-main')} />}
            </button>
          );
        })}
      </div>

      <p className="text-xs font-bold uppercase tracking-wide text-text-secondary px-1">
        {new Date(activeDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        {activeDate === today ? ' · Today' : ''}
      </p>

      {activeSlots.length > 0 ? (
        <div className="space-y-2">
          {activeSlots.map(slot => (
            <div key={slot.id} className={cn("p-4 rounded-2xl border text-left shadow-sm flex items-center gap-3", getStatusColor(slot.status))}>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black uppercase tracking-wider text-text-secondary">{slot.start}</p>
                <p className="text-sm font-bold text-text-primary leading-snug mt-0.5">{slot.title}</p>
              </div>
              <span className={cn('text-[10px] font-black uppercase px-2 py-0.5 rounded-full', slot.status === 'Booked' ? 'bg-primary-main/10 text-primary-dark' : 'bg-success/10 text-success')}>{slot.status}</span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState compact text="No events" />
      )}

    </div>
  );
}
