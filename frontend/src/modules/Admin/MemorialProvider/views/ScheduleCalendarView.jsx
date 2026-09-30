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
    <div className="space-y-4">

      <p className="text-xs text-text-secondary px-1">Requests with a scheduled date, in order.</p>

      {scheduled.length === 0 ? (
        <div className="bg-white rounded-[20px] border border-border-light p-12 text-center text-text-secondary">
          <CalendarIcon size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-bold text-sm">No scheduled requests yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[20px] border border-border-light shadow-sm divide-y divide-border-light overflow-hidden">
          {scheduled.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-sm font-bold text-text-primary">{r.customerName} &middot; {r.petName}</p>
                <p className="text-xs text-text-secondary mt-0.5">{r.serviceType}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-bold text-text-primary">{r.preferredDate || 'No date'}</p>
                <p className="text-[11px] text-text-secondary flex items-center gap-1 justify-end mt-0.5"><Clock size={11} /> {r.preferredTime || '—'}</p>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
