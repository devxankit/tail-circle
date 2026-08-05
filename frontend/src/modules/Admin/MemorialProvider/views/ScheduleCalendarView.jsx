import React from 'react';
import { useMemorialProvider } from '../context/MemorialProviderContext';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';

/** Real scheduled requests, grouped by their real `preferredDate`. */
export function ScheduleCalendarView() {
  const { requests } = useMemorialProvider();

  const scheduled = requests
    .filter(r => ['Accepted', 'In Progress', 'Assigned', 'Completed'].includes(r.status))
    .sort((a, b) => (a.preferredDate || '').localeCompare(b.preferredDate || ''));

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">

      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Schedule</h2>
        <p className="text-sm font-semibold text-slate-500 mt-0.5">Requests with a scheduled date, in order.</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {scheduled.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <CalendarIcon size={32} className="mx-auto mb-3 opacity-30" />
            <p className="font-bold text-sm">No scheduled requests yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {scheduled.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50/50">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">{r.customerName} &middot; {r.petName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{r.serviceType}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-slate-700">{r.preferredDate || 'No date'}</p>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 justify-end mt-0.5"><Clock size={11} /> {r.preferredTime || '—'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
