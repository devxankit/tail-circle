import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Calendar, Loader2, AlertCircle, CalendarOff,
  CheckCircle2, Plane,
} from 'lucide-react';
import {
  fetchVetCalendar, fetchVetSlotPreview, addVetBlackout, removeVetBlackout,
} from '../../../../services/vendor';

/**
 * Availability calendar — a read-and-mark view over the real schedule.
 *
 * This used to paint a fixed `PRESET` of invented dates. It now reflects the
 * actual availability engine: which days are working days, which are blacked
 * out, and how many slots are genuinely free versus already booked.
 *
 * The weekly pattern itself is edited on the Clinic Schedule screen; this one
 * is for seeing the outcome and marking individual days off.
 */

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const pad = (n) => String(n).padStart(2, '0');
const dateKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const firstDay = (y, m) => new Date(y, m, 1).getDay();

const STATE = {
  working: { label: 'Working day', bg: '#EEF9F2', text: '#1A7A40', dot: '#22C55E', border: '#BBF7D0' },
  blackedOut: { label: 'Day off', bg: '#FAF5FF', text: '#7E22CE', dot: '#A855F7', border: '#E9D5FF' },
  closed: { label: 'Not a working day', bg: '#F8FAFC', text: '#64748B', dot: '#CBD5E1', border: '#E2E8F0' },
  outside: { label: 'Outside booking window', bg: '#FFFFFF', text: '#CBD5E1', dot: 'transparent', border: '#F1F5F9' },
};

export function AvailabilityCalendarView() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const [calendar, setCalendar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [selected, setSelected] = useState(null);   // YYYY-MM-DD
  const [slots, setSlots] = useState(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [leave, setLeave] = useState({ from: '', to: '', reason: 'Personal leave' });
  const [showLeave, setShowLeave] = useState(false);

  const pushToast = (m) => { setToast(m); setTimeout(() => setToast(''), 2500); };

  const load = useCallback(async () => {
    try {
      // Capped server-side at the vet's booking horizon.
      setCalendar(await fetchVetCalendar({ days: 90 }));
      setError('');
    } catch (e) {
      setError(e.message || 'Could not load your calendar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const byDate = useMemo(() => new Map(calendar.map((d) => [d.date, d])), [calendar]);

  const openDay = async (key) => {
    setSelected(key);
    setSlots(null);
    const info = byDate.get(key);
    if (!info || !info.working) return;
    setSlotsLoading(true);
    try {
      // includeFull so booked slots are visible, not silently hidden.
      const mode = info.modes?.includes('video') && !info.modes?.includes('inClinic') ? 'video' : 'clinic';
      setSlots(await fetchVetSlotPreview({ date: key, visitType: mode }));
    } catch (e) {
      setSlots({ slots: [], reason: e.message });
    } finally {
      setSlotsLoading(false);
    }
  };

  const toggleDayOff = async (key) => {
    const info = byDate.get(key);
    setBusy(true);
    try {
      if (info?.blackedOut) {
        await removeVetBlackout(key);
        pushToast('Day restored');
      } else {
        await addVetBlackout({ date: key, reason: 'Day off' });
        pushToast('Marked as a day off');
      }
      await load();
      await openDay(key);
    } catch (e) {
      pushToast(e.message || 'Could not update');
    } finally {
      setBusy(false);
    }
  };

  const applyLeave = async () => {
    if (!leave.from || !leave.to) return;
    setBusy(true);
    try {
      const from = new Date(leave.from);
      const to = new Date(leave.to);
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        const key = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
        // eslint-disable-next-line no-await-in-loop
        await addVetBlackout({ date: key, reason: leave.reason || 'Leave' });
      }
      await load();
      setShowLeave(false);
      pushToast('Leave applied');
    } catch (e) {
      pushToast(e.message || 'Could not apply leave');
    } finally {
      setBusy(false);
    }
  };

  const prev = () => (month === 0 ? (setMonth(11), setYear((y) => y - 1)) : setMonth((m) => m - 1));
  const next = () => (month === 11 ? (setMonth(0), setYear((y) => y + 1)) : setMonth((m) => m + 1));

  const stateOf = (key) => {
    const info = byDate.get(key);
    if (!info) return 'outside';
    if (info.blackedOut) return 'blackedOut';
    return info.working ? 'working' : 'closed';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-gray-400" />
      </div>
    );
  }

  const total = daysInMonth(year, month);
  const lead = firstDay(year, month);
  const cells = [...Array(lead).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  const selectedInfo = selected ? byDate.get(selected) : null;

  return (
    <div className="p-6 space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl">
          {toast}
        </div>
      )}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Availability Calendar</h1>
          <p className="text-sm text-gray-500 mt-1">
            Your real bookable days. Edit the weekly pattern on{' '}
            <span className="font-medium text-gray-700">Clinic Schedule</span>.
          </p>
        </div>
        <button
          onClick={() => setShowLeave(true)}
          className="px-4 h-11 rounded-xl bg-gray-900 text-white font-bold text-sm flex items-center gap-2"
        >
          <Plane size={16} /> Apply leave
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Month grid */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-5">
            <button onClick={prev} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
              <ChevronLeft size={18} />
            </button>
            <h2 className="font-bold text-gray-900">{MONTHS[month]} {year}</h2>
            <button onClick={next} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {DAYS_SHORT.map((d) => (
              <div key={d} className="text-center text-[11px] font-bold text-gray-400 uppercase py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((d, i) => {
              if (d === null) return <div key={`e${i}`} />;
              const key = dateKey(year, month, d);
              const st = STATE[stateOf(key)];
              const isSel = selected === key;
              const isToday = key === dateKey(today.getFullYear(), today.getMonth(), today.getDate());
              return (
                <button
                  key={key}
                  onClick={() => openDay(key)}
                  className="aspect-square rounded-xl border flex flex-col items-center justify-center gap-1 transition"
                  style={{
                    background: st.bg,
                    borderColor: isSel ? '#111827' : st.border,
                    borderWidth: isSel ? 2 : 1,
                  }}
                >
                  <span className="text-sm font-bold" style={{ color: st.text }}>{d}</span>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.dot }} />
                  {isToday && <span className="text-[8px] font-bold text-gray-400 leading-none">TODAY</span>}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-gray-100">
            {Object.entries(STATE).map(([k, v]) => (
              <span key={k} className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: v.dot, border: `1px solid ${v.border}` }} />
                {v.label}
              </span>
            ))}
          </div>
        </div>

        {/* Day detail */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-10">
              <Calendar size={28} className="text-gray-300" />
              <p className="text-sm text-gray-400">Pick a date to see its slots</p>
            </div>
          ) : (
            <>
              <h3 className="font-bold text-gray-900">{selected}</h3>
              <p className="text-xs text-gray-500 mb-4">
                {STATE[stateOf(selected)].label}
                {selectedInfo?.reason ? ` — ${selectedInfo.reason}` : ''}
              </p>

              {selectedInfo ? (
                <>
                  {selectedInfo.modes?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {selectedInfo.modes.map((m) => (
                        <span key={m} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold">
                          {m}
                        </span>
                      ))}
                    </div>
                  )}

                  {slotsLoading ? (
                    <Loader2 size={18} className="animate-spin text-gray-400" />
                  ) : slots?.slots?.length ? (
                    <div className="space-y-1.5 mb-5 max-h-64 overflow-y-auto">
                      {slots.slots.map((s) => (
                        <div
                          key={s.time}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm border ${
                            s.available
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : 'bg-gray-100 border-gray-200 text-gray-400'
                          }`}
                        >
                          <span className="font-bold">{s.time}</span>
                          <span className="text-[11px] font-medium">
                            {s.available ? 'Free' : 'Booked'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 mb-5">
                      No slots
                      {slots?.reason ? ` — ${String(slots.reason).replace(/_/g, ' ')}` : ''}.
                    </p>
                  )}

                  <button
                    onClick={() => toggleDayOff(selected)}
                    disabled={busy}
                    className={`w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 ${
                      selectedInfo.blackedOut
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {busy ? <Loader2 size={15} className="animate-spin" />
                      : selectedInfo.blackedOut ? <CheckCircle2 size={15} /> : <CalendarOff size={15} />}
                    {selectedInfo.blackedOut ? 'Restore this day' : 'Mark as day off'}
                  </button>
                </>
              ) : (
                <p className="text-sm text-gray-400">
                  This date is outside your booking window.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Leave modal */}
      {showLeave && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowLeave(false)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 mb-1">Apply leave</h3>
            <p className="text-xs text-gray-500 mb-4">Every date in the range is removed from booking.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">From</label>
                <input type="date" value={leave.from} onChange={(e) => setLeave((p) => ({ ...p, from: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">To</label>
                <input type="date" value={leave.to} onChange={(e) => setLeave((p) => ({ ...p, to: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Reason</label>
                <input type="text" value={leave.reason} onChange={(e) => setLeave((p) => ({ ...p, reason: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowLeave(false)} className="flex-1 h-11 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm">
                Cancel
              </button>
              <button onClick={applyLeave} disabled={busy || !leave.from || !leave.to}
                className="flex-1 h-11 rounded-xl bg-gray-900 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {busy && <Loader2 size={14} className="animate-spin" />} Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AvailabilityCalendarView;
