import React, { useState } from 'react';
import { Calendar, List, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useVendor } from '../context/ClinicVendorContext';
import { SearchBar, FilterSheet, FilterOptions, ListCard, CardAction, StatusBadge, EmptyState } from '../../vendor/mobile';

// ── Design tokens ──────────────────────────────────────────────────────────────
const STATUS_TONE = { Confirmed: 'success', Completed: 'neutral', Pending: 'warning' };

const typeDot = {
  'Clinic Visit':       'bg-accent-teal',
  'Video Consultation': 'bg-text-disabled',
  'Home Visit':         'bg-[#4C8684]',
  'Emergency':          'bg-error animate-pulse',
};

const typeBar = {
  'Clinic Visit':       'bg-accent-teal',
  'Video Consultation': 'bg-text-disabled',
  'Home Visit':         'bg-[#4C8684]',
  'Emergency':          'bg-error',
};

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** "May 26, 2026" (the API's display date) → "2026-05-26". */
const keyOf = (display) => {
  const d = new Date(display);
  return Number.isNaN(d.getTime()) ? '' : ymd(d);
};
/** "04:00 PM" → minutes since midnight, for sorting a day's slots. */
const minutesOf = (t) => {
  const m = String(t || '').match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return 0;
  let h = Number(m[1]) % 12;
  if (m[3] && m[3].toUpperCase() === 'PM') h += 12;
  if (!m[3]) h = Number(m[1]);
  return h * 60 + Number(m[2]);
};

export function AppointmentListView({ onNavigate }) {
  const { doctorAppointments, updateDoctorAppointmentStatus } = useVendor();
  const [viewMode, setViewMode] = useState('list');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [processing, setProcessing] = useState({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Calendar mode shows one week (Mon–Sun) and one day of it at a time.
  const [weekOffset, setWeekOffset] = useState(0);
  const [calendarDay, setCalendarDay] = useState(null);

  const handleConfirm = (id) => {
    setProcessing(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      updateDoctorAppointmentStatus(id, 'Confirmed');
      setProcessing(prev => ({ ...prev, [id]: false }));
    }, 400);
  };

  const filteredAppointments = doctorAppointments.filter(apt => {
    if (statusFilter !== 'All' && apt.status !== statusFilter) return false;
    if (typeFilter !== 'All' && apt.type !== typeFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      if (!apt.petName?.toLowerCase().includes(q) &&
          !apt.owner?.toLowerCase().includes(q) &&
          !apt.issue?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const getTypeIcon = (type) => {
    const dot = typeDot[type] || 'bg-text-disabled';
    return <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />;
  };

  const getStatusBadge = (status) => (
    <StatusBadge label={status} tone={STATUS_TONE[status] || 'neutral'} />
  );

  const today = new Date();
  const todayKey = ymd(today);
  const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7) + weekOffset * 7);
  const weekDays = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i));
  const weekKeys = weekDays.map(ymd);
  const countOn = (key) => filteredAppointments.filter((a) => keyOf(a.date) === key).length;
  const weekCount = weekKeys.reduce((s, k) => s + countOn(k), 0);
  const weekLabel = weekOffset === 0 ? 'This Week' : weekOffset === 1 ? 'Next Week' : weekOffset === -1 ? 'Last Week'
    : `${weekDays[0].toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${weekDays[6].toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
  // The chosen day if it is in this week; else today, the first busy day, or Monday.
  const activeDay = weekKeys.includes(calendarDay) ? calendarDay
    : weekKeys.includes(todayKey) ? todayKey
      : weekKeys.find((k) => countOn(k) > 0) || weekKeys[0];
  const dayApts = filteredAppointments.filter(a => keyOf(a.date) === activeDay).sort((a, b) => minutesOf(a.time) - minutesOf(b.time));

  const shiftWeek = (delta) => { setWeekOffset((w) => w + delta); setCalendarDay(null); };
  const goToday = () => { setWeekOffset(0); setCalendarDay(todayKey); };

  const filterCount = (statusFilter !== 'All' ? 1 : 0) + (typeFilter !== 'All' ? 1 : 0);

  return (
    <div className="space-y-4">

      {/* ── Toolbar ── */}
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search patient, owner..."
        onFilter={() => setFiltersOpen(true)}
        filterCount={filterCount}
      />

      {/* View toggle */}
      <div className="flex items-center gap-1 bg-bg-secondary rounded-2xl p-1">
        {[
          ['list', List, 'List'],
          ['calendar', Calendar, 'Calendar'],
        ].map(([mode, Icon, label]) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`flex-1 min-h-[40px] rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              viewMode === mode ? 'bg-white shadow-sm text-text-primary' : 'text-text-secondary'
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <FilterSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        onReset={() => { setStatusFilter('All'); setTypeFilter('All'); }}
      >
        <FilterOptions
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'All', label: 'All Statuses' },
            'Pending',
            'Confirmed',
            'Completed',
          ]}
        />
        <FilterOptions
          label="Type"
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { value: 'All', label: 'All Types' },
            'Clinic Visit',
            { value: 'Video Consultation', label: 'Video Consult' },
            'Home Visit',
            'Emergency',
          ]}
        />
      </FilterSheet>

      {/* ── List View ── */}
      {viewMode === 'list' ? (
        filteredAppointments.length === 0 ? (
          <EmptyState icon={Calendar} text="No appointments found matching your filters." />
        ) : (
          <div className="space-y-3">
            {filteredAppointments.map(apt => (
              <ListCard
                key={apt.id}
                title={`${apt.owner}'s ${apt.petName}`}
                subtitle={`${apt.species} - ${apt.breed}`}
                badge={getStatusBadge(apt.status)}
                meta={[
                  { label: 'Date & Time', value: <>{apt.date}<span className="block text-xs font-medium text-text-secondary">{apt.time}</span></> },
                  { label: 'Type', value: <span className="inline-flex items-center gap-1.5">{getTypeIcon(apt.type)} {apt.type}</span> },
                  { label: 'Issue', value: apt.issue, full: true },
                ]}
                footer={(
                  <>
                    {apt.status === 'Pending' && (
                      <CardAction
                        tone="teal"
                        icon={CheckCircle}
                        className="flex-1"
                        onClick={() => handleConfirm(apt.id)}
                        disabled={processing[apt.id]}
                        aria-label="Confirm appointment"
                      >
                        Confirm
                      </CardAction>
                    )}
                    <CardAction tone="outline" className="flex-1" onClick={() => onNavigate('appointment_detail', apt)}>
                      View Details
                    </CardAction>
                  </>
                )}
              />
            ))}
          </div>
        )
      ) : (
        // ── Calendar View ──
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center bg-white border border-border-light rounded-2xl overflow-hidden">
              <button onClick={() => shiftWeek(-1)} aria-label="Previous week" className="w-11 h-11 flex items-center justify-center border-r border-border-light text-text-secondary cursor-pointer"><ChevronLeft size={17} /></button>
              <span className="px-3 text-sm font-bold text-text-primary whitespace-nowrap">{weekLabel}</span>
              <button onClick={() => shiftWeek(1)} aria-label="Next week" className="w-11 h-11 flex items-center justify-center border-l border-border-light text-text-secondary cursor-pointer"><ChevronRight size={17} /></button>
            </div>
            <button onClick={goToday} className="min-h-[44px] px-2 text-xs font-bold text-primary-main cursor-pointer">Today</button>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-text-secondary px-1">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-accent-teal" /> Clinic</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-text-disabled" /> Video</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#4C8684]" /> Home</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-error" /> Emergency</span>
          </div>

          {/* Day strip: the week's seven days, with each day's count. */}
          <div className="grid grid-cols-7 gap-1.5">
            {weekDays.map((d, i) => {
              const key = weekKeys[i];
              const on = key === activeDay;
              const count = countOn(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCalendarDay(key)}
                  className={`min-w-0 py-2 rounded-[16px] border-2 text-center transition-all cursor-pointer ${
                    on ? 'bg-[#66B4B1] border-[#66B4B1] text-white shadow-lg shadow-[#66B4B1]/20' : 'bg-white border-border-light text-text-primary'
                  }`}
                >
                  <span className={`block text-[10px] font-bold uppercase ${on ? 'text-white/85' : 'text-text-secondary'}`}>
                    {d.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 3)}
                  </span>
                  <span className="block text-base font-black leading-tight">{d.getDate()}</span>
                  <span className={`block mx-auto mt-0.5 w-1.5 h-1.5 rounded-full ${count ? (on ? 'bg-white' : 'bg-primary-main') : 'bg-transparent'}`} />
                  {key === todayKey && <span className={`block text-[8px] font-bold ${on ? 'text-white/85' : 'text-primary-main'}`}>TODAY</span>}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wide px-1">
            {new Date(`${activeDay}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            {' · '}{dayApts.length} Appt{dayApts.length !== 1 ? 's' : ''}{' · '}{weekCount} this week
          </p>

          {dayApts.length === 0 ? (
            <EmptyState compact icon={Calendar} text="No appointments on this day." />
          ) : (
            <>
              <div className="space-y-2">
                {dayApts.map(apt => (
                  <button
                    key={apt.id}
                    type="button"
                    onClick={() => onNavigate('appointment_detail', apt)}
                    className="w-full text-left p-4 pl-5 border border-border-light bg-white rounded-[20px] shadow-sm active:bg-bg-primary transition relative overflow-hidden cursor-pointer"
                  >
                    <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${typeBar[apt.type] || 'bg-text-disabled'}`} />
                    <span className="flex justify-between items-start gap-2 mb-1">
                      <span className="text-xs font-bold text-text-primary">{apt.time}</span>
                      {getStatusBadge(apt.status)}
                    </span>
                    <span className="block text-sm font-bold text-text-primary truncate">{apt.owner}'s {apt.petName}</span>
                    <span className="block text-xs text-text-secondary truncate mt-1">{apt.issue}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
