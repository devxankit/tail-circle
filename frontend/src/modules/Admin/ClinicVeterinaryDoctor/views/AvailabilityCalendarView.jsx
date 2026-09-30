import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Loader2, AlertCircle, CalendarOff,
  CheckCircle2, Plane,
} from 'lucide-react';
import {
  fetchVetCalendar, fetchVetSlotPreview, addVetBlackout, removeVetBlackout,
} from '../../../../services/vendor';
import { BottomSheet, PrimaryButton, SkeletonList, InlineError, useVendorToast, fieldClass, labelClass } from '../../vendor/mobile';
import { useVetSelection, VetSelector } from '../components/VetSelector';

/**
 * Availability calendar — a read-and-mark view over the real schedule.
 *
 * This used to paint a fixed `PRESET` of invented dates. It now reflects the
 * actual availability engine: which days are working days, which are blacked
 * out, and how many slots are genuinely free versus already booked.
 *
 * The weekly pattern itself is edited on the Clinic Schedule screen; this one
 * is for seeing the outcome and marking individual days off. On a phone a
 * tapped day opens its slots in a sheet.
 *
 * A clinic with several vets picks whose calendar this is, as on the schedule
 * screen — without it the API refused the request ("doctorId is required").
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
  const { vets, isOwner, doctorId, setDoctorId, ready, refreshVets } = useVetSelection();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const [calendar, setCalendar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { addToast } = useVendorToast();

  const [selected, setSelected] = useState(null);   // YYYY-MM-DD
  const [slots, setSlots] = useState(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [leave, setLeave] = useState({ from: '', to: '', reason: 'Personal leave' });
  const [showLeave, setShowLeave] = useState(false);

  const pushToast = (m) => { addToast({ message: m, duration: 2500 }); };

  const load = useCallback(async () => {
    try {
      // Capped server-side at the vet's booking horizon.
      setCalendar(await fetchVetCalendar({ days: 90, doctorId }));
      setError('');
    } catch (e) {
      setError(e.message || 'Could not load your calendar');
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

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
      setSlots(await fetchVetSlotPreview({ date: key, visitType: mode, doctorId }));
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
        await removeVetBlackout(key, doctorId);
        pushToast('Day restored');
      } else {
        await addVetBlackout({ date: key, reason: 'Day off' }, doctorId);
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
        await addVetBlackout({ date: key, reason: leave.reason || 'Leave' }, doctorId);
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

  if (loading || !ready) {
    return <SkeletonList rows={4} />;
  }

  const total = daysInMonth(year, month);
  const lead = firstDay(year, month);
  const cells = [...Array(lead).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  const selectedInfo = selected ? byDate.get(selected) : null;

  return (
    <div className="space-y-4">
      <VetSelector vets={vets} isOwner={isOwner} doctorId={doctorId} onChange={(id) => { setSelected(null); setDoctorId(id); }} onVetAdded={refreshVets} />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 px-1">
          <h1 className="text-lg font-bold text-text-primary">Availability Calendar</h1>
          <p className="text-xs text-text-secondary mt-1">
            Your real bookable days. Edit the weekly pattern on{' '}
            <span className="font-bold text-text-primary">Clinic Schedule</span>.
          </p>
        </div>
        <button
          onClick={() => setShowLeave(true)}
          className="h-11 px-4 rounded-full bg-text-primary text-white font-bold text-sm flex items-center gap-1.5 shrink-0"
        >
          <Plane size={16} /> Apply leave
        </button>
      </div>

      {error && (
        <InlineError>
          <span className="flex items-start gap-2"><AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}</span>
        </InlineError>
      )}

      {/* Month grid */}
      <div className="bg-white rounded-[20px] border border-border-light shadow-sm p-3">
        <div className="flex items-center justify-between mb-3">
          <button onClick={prev} aria-label="Previous month" className="w-11 h-11 rounded-full flex items-center justify-center text-text-secondary active:bg-bg-secondary">
            <ChevronLeft size={20} />
          </button>
          <h2 className="font-bold text-text-primary">{MONTHS[month]} {year}</h2>
          <button onClick={next} aria-label="Next month" className="w-11 h-11 rounded-full flex items-center justify-center text-text-secondary active:bg-bg-secondary">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAYS_SHORT.map((d) => (
            <div key={d} className="text-center text-[10px] font-bold text-text-secondary uppercase py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
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
                className="aspect-square min-w-0 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition"
                style={{
                  background: st.bg,
                  borderColor: isSel ? '#111827' : st.border,
                  borderWidth: isSel ? 2 : 1,
                }}
              >
                <span className="text-sm font-bold leading-none" style={{ color: st.text }}>{d}</span>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.dot }} />
                {isToday && <span className="text-[7px] font-bold text-text-secondary leading-none">TODAY</span>}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-4 pt-3 border-t border-border-light">
          {Object.entries(STATE).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1.5 text-[11px] font-medium text-text-secondary">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: v.dot, border: `1px solid ${v.border}` }} />
              {v.label}
            </span>
          ))}
        </div>
      </div>

      <p className="text-xs text-text-secondary text-center">Pick a date to see its slots</p>

      {/* Day detail */}
      <BottomSheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected}
        subtitle={selected ? `${STATE[stateOf(selected)].label}${selectedInfo?.reason ? ` — ${selectedInfo.reason}` : ''}` : undefined}
        footer={selectedInfo ? (
          <button
            onClick={() => toggleDayOff(selected)}
            disabled={busy}
            className={`w-full h-12 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 disabled:opacity-60 ${
              selectedInfo.blackedOut
                ? 'bg-success text-white'
                : 'bg-bg-secondary text-text-primary'
            }`}
          >
            {busy ? <Loader2 size={16} className="animate-spin" />
              : selectedInfo.blackedOut ? <CheckCircle2 size={16} /> : <CalendarOff size={16} />}
            {selectedInfo.blackedOut ? 'Restore this day' : 'Mark as day off'}
          </button>
        ) : null}
      >
        {selected && (
          selectedInfo ? (
            <div className="pb-2">
              {selectedInfo.modes?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {selectedInfo.modes.map((m) => (
                    <span key={m} className="px-2.5 py-1 rounded-full bg-bg-secondary text-text-secondary text-[11px] font-bold">
                      {m}
                    </span>
                  ))}
                </div>
              )}

              {slotsLoading ? (
                <Loader2 size={20} className="animate-spin text-text-secondary" />
              ) : slots?.slots?.length ? (
                <div className="grid grid-cols-2 gap-2">
                  {slots.slots.map((s) => (
                    <div
                      key={s.time}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm border ${
                        s.available
                          ? 'bg-success/10 border-success/20 text-text-primary'
                          : 'bg-bg-secondary border-border-light text-text-disabled'
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
                <p className="text-sm text-text-secondary">
                  No slots
                  {slots?.reason ? ` — ${String(slots.reason).replace(/_/g, ' ')}` : ''}.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-text-secondary pb-2">
              This date is outside your booking window.
            </p>
          )
        )}
      </BottomSheet>

      {/* Leave sheet */}
      <BottomSheet
        open={showLeave}
        onClose={() => setShowLeave(false)}
        title="Apply leave"
        subtitle="Every date in the range is removed from booking."
        footer={(
          <div className="flex gap-2">
            <PrimaryButton tone="soft" onClick={() => setShowLeave(false)}>Cancel</PrimaryButton>
            <PrimaryButton tone="dark" onClick={applyLeave} disabled={busy || !leave.from || !leave.to} loading={busy}>
              Apply
            </PrimaryButton>
          </div>
        )}
      >
        <div className="space-y-4 pb-2">
          <div>
            <label className={labelClass}>From</label>
            <input type="date" value={leave.from} onChange={(e) => setLeave((p) => ({ ...p, from: e.target.value }))}
              className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>To</label>
            <input type="date" value={leave.to} onChange={(e) => setLeave((p) => ({ ...p, to: e.target.value }))}
              className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Reason</label>
            <input type="text" value={leave.reason} onChange={(e) => setLeave((p) => ({ ...p, reason: e.target.value }))}
              className={fieldClass} />
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

export default AvailabilityCalendarView;
