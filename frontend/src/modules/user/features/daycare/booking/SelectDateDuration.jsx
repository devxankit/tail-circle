import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useDaycareStore } from '../../../../../store/useDaycareStore';
import { getDaycareAvailability } from '../../../../../services/daycareApi';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

/** Monday-first index (Mon = 0 … Sun = 6) for the leading blanks in the grid. */
const mondayIndex = (date) => (date.getDay() + 6) % 7;

/** Half-hour labels between two "h:mm AM" strings, for the drop-off/pick-up rails. */
function timeOptions(openTime, closeTime, fallbackOpen, fallbackClose) {
  const parse = (raw, fb) => {
    const m = /^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?$/.exec(String(raw || '').trim());
    if (!m) return fb;
    let h = Number(m[1]);
    const mins = Number(m[2]);
    const suffix = m[3]?.toUpperCase();
    if (suffix === 'PM' && h !== 12) h += 12;
    if (suffix === 'AM' && h === 12) h = 0;
    if (h > 23 || mins > 59) return fb;
    return h * 60 + mins;
  };

  const from = parse(openTime, fallbackOpen);
  const to = parse(closeTime, fallbackClose);
  if (to <= from) return [];

  const label = (mins) => {
    const h24 = Math.floor(mins / 60);
    const suffix = h24 < 12 ? 'AM' : 'PM';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${h12}:${pad(mins % 60)} ${suffix}`;
  };

  const out = [];
  for (let t = from; t <= to && out.length < 32; t += 60) out.push(label(t));
  return out;
}

export function SelectDateDuration() {
  const navigate = useNavigate();
  const {
    dateSelectionType, setDateSelectionType,
    selectedDates, toggleDate,
    dropoffTime, pickupTime, setTimes,
    selectedCenter,
  } = useDaycareStore();

  // Real current month, navigable. This calendar was pinned to June 2025 with
  // hard-coded `2025-06-DD` date strings and dead arrow buttons, so every
  // booking was filed against dates in the past.
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [availability, setAvailability] = useState({});
  const [loading, setLoading] = useState(false);

  const today = useMemo(startOfToday, []);
  const monthStart = startOfMonth(month);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const atFirstMonth = monthStart <= startOfMonth(today);

  useEffect(() => {
    if (!selectedCenter) {
      navigate('/app/services/daycare');
    }
  }, [selectedCenter, navigate]);

  // Which days this centre still has room on. Days already full are shown
  // struck out rather than silently failing at checkout.
  useEffect(() => {
    const centreId = selectedCenter?._id || selectedCenter?.id;
    if (!centreId) return;
    let cancelled = false;
    const from = monthStart < today ? today : monthStart;
    setLoading(true);
    getDaycareAvailability(centreId, from, daysInMonth + 7)
      .then((data) => {
        if (cancelled) return;
        setAvailability((prev) => ({
          ...prev,
          ...Object.fromEntries((data.days || []).map((d) => [d.date, d.available])),
        }));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedCenter, month.getFullYear(), month.getMonth()]);

  const days = useMemo(() => (
    Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(month.getFullYear(), month.getMonth(), i + 1);
      const key = ymd(date);
      const isPast = date < today;
      return {
        day: i + 1,
        dateStr: key,
        isPast,
        // Unknown availability is treated as open — the calendar should not
        // block booking just because the lookup is still in flight.
        isFull: availability[key] === false,
        isSelected: selectedDates.includes(key),
      };
    })
  ), [month, daysInMonth, today, availability, selectedDates]);

  const hours = selectedCenter || {};
  const dropoffOptions = timeOptions(hours.openTime, hours.closeTime, 8 * 60, 11 * 60).slice(0, 6);
  const pickupOptions = timeOptions(hours.openTime, hours.closeTime, 17 * 60, 20 * 60).slice(-6);

  const canContinue = selectedDates.length > 0 && dropoffTime && pickupTime;

  const handleContinue = () => {
    if (canContinue) navigate('/app/services/daycare/book/pet');
  };

  const shiftMonth = (delta) => {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  };

  return (
    <div className="flex flex-col h-full bg-[#FAF7F2] overflow-y-auto hide-scrollbar animate-in slide-in-from-right duration-300 relative pb-28">

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3 sticky top-0 z-10 bg-[#FAF7F2]/95 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all">
            <ChevronLeft size={24} className="text-gray-900" />
          </button>
          <h1 className="text-[18px] font-black text-gray-900">Select Date &amp; Duration</h1>
        </div>
      </div>

      <div className="px-5 pt-2">

        {/* Type Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto hide-scrollbar pb-1 -mx-5 px-5">
          {['Single Day', 'Multiple Days', 'Custom Week', 'Monthly'].map(type => (
            <button
              key={type}
              onClick={() => setDateSelectionType(type)}
              className={`whitespace-nowrap px-4 py-2.5 rounded-[12px] text-[13px] font-bold border transition-all ${
                dateSelectionType === type
                  ? 'bg-[#66B4B1] border-[#66B4B1] text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-[#66B4B1]/50'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-[24px] border border-gray-100 p-5 shadow-sm mb-8">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => shiftMonth(-1)}
              disabled={atFirstMonth}
              className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronLeft size={20} className="text-gray-700" />
            </button>
            <h2 className="text-[15px] font-black text-gray-900 flex items-center gap-2">
              {MONTHS[month.getMonth()]} {month.getFullYear()}
              {loading && <Loader2 size={13} className="animate-spin text-gray-400" />}
            </h2>
            <button onClick={() => shiftMonth(1)} className="p-1 rounded-full hover:bg-gray-100">
              <ChevronRight size={20} className="text-gray-900" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-y-4 gap-x-1 mb-2">
            {WEEKDAYS.map(day => (
              <div key={day} className="text-center text-[12px] font-bold text-gray-400">{day}</div>
            ))}

            {Array.from({ length: mondayIndex(monthStart) }).map((_, i) => <div key={`pad-${i}`} />)}

            {days.map((d) => {
              const disabled = d.isPast || d.isFull;
              return (
                <button
                  key={d.day}
                  onClick={() => !disabled && toggleDate(d.dateStr)}
                  disabled={disabled}
                  title={d.isFull ? 'Fully booked' : undefined}
                  className={`w-9 h-9 mx-auto rounded-full flex items-center justify-center text-[14px] font-bold transition-colors ${
                    d.isSelected
                      ? 'bg-[#66B4B1] text-white'
                      : d.isPast
                        ? 'text-gray-300 cursor-not-allowed'
                        : d.isFull
                          ? 'text-gray-300 line-through cursor-not-allowed'
                          : 'text-gray-700 hover:bg-[#66B4B1]/10'
                  }`}
                >
                  {d.day}
                </button>
              );
            })}
          </div>

          {selectedDates.length > 0 && (
            <p className="text-[12px] font-bold text-[#66B4B1] text-center mt-4">
              {selectedDates.length} day{selectedDates.length === 1 ? '' : 's'} selected
            </p>
          )}
        </div>

        {/* Time Selection */}
        <div className="space-y-6 mb-8">
          <div>
            <h3 className="text-[15px] font-black text-gray-900 mb-3">Drop-off Time</h3>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 -mx-5 px-5">
              {dropoffOptions.map(time => (
                <button
                  key={time}
                  onClick={() => setTimes(time, pickupTime)}
                  className={`whitespace-nowrap px-4 py-2.5 rounded-[12px] text-[13px] font-bold border transition-all ${
                    dropoffTime === time
                      ? 'bg-[#66B4B1]/10 border-[#66B4B1] text-[#66B4B1]'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-[#66B4B1]/50'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[15px] font-black text-gray-900 mb-3">Pick-up Time</h3>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 -mx-5 px-5">
              {pickupOptions.map(time => (
                <button
                  key={time}
                  onClick={() => setTimes(dropoffTime, time)}
                  className={`whitespace-nowrap px-4 py-2.5 rounded-[12px] text-[13px] font-bold border transition-all ${
                    pickupTime === time
                      ? 'bg-[#66B4B1]/10 border-[#66B4B1] text-[#66B4B1]'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-[#66B4B1]/50'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-[#F87B68]/5 border border-[#F87B68]/20 rounded-[16px] p-4 flex gap-3">
          <div className="mt-0.5 w-2 h-2 rounded-full border border-[#F87B68] shrink-0"></div>
          <p className="text-[12px] font-medium text-[#F87B68] leading-relaxed">
            Center operating hours:{' '}
            <span className="font-bold">
              {selectedCenter?.openTime || '7:00 AM'} - {selectedCenter?.closeTime || '8:00 PM'}
            </span>
          </p>
        </div>

      </div>

      {/* Continue Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 px-5">
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className="w-full py-4 rounded-[16px] font-bold text-[15px] text-white bg-[#66B4B1] shadow-lg shadow-[#66B4B1]/20 hover:bg-[#599D9A] active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
        >
          Continue
        </button>
      </div>

    </div>
  );
}
