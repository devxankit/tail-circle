import React, { useState } from 'react';
import { Syringe, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useVendor } from '../context/ClinicVendorContext';
import { SegmentedTabs, SearchBar, FilterSheet, FilterOptions, ListCard, CardAction, EmptyState, useVendorToast, errorMessage } from '../../vendor/mobile';

const sentLabel = (at) => {
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? 'Reminder sent' : `Reminded ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
};

export function VaccinationTrackerView() {
  const { vaccinations, sendVaccinationReminder } = useVendor();
  const { addToast } = useVendorToast();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [vaccineFilter, setVaccineFilter] = useState('All');

  const getData = () => {
    if (activeTab === 'upcoming') return vaccinations?.upcoming || [];
    if (activeTab === 'missed') return vaccinations?.missed || [];
    return vaccinations?.completed || [];
  };

  // id → 'sending' | ISO time the reminder went out
  const [sendingState, setSendingState] = useState({});

  const handleSendReminder = async (row) => {
    if (sendingState[row.id] === 'sending') return;
    setSendingState(prev => ({ ...prev, [row.id]: 'sending' }));
    try {
      const updated = await sendVaccinationReminder(row.id);
      setSendingState(prev => ({ ...prev, [row.id]: updated?.remindedAt || new Date().toISOString() }));
      addToast({ message: `Reminder sent to ${row.owner || 'the owner'}.`, type: 'success' });
    } catch (err) {
      setSendingState(prev => ({ ...prev, [row.id]: undefined }));
      addToast({ message: errorMessage(err, 'Could not send the reminder.'), type: 'error', duration: 5000 });
    }
  };

  const statusLine = (status) => {
    if (status === 'Overdue') return <span className="flex items-center gap-1 text-xs font-bold text-error"><AlertCircle size={14} /> {status}</span>;
    if (status === 'Due Soon') return <span className="flex items-center gap-1 text-xs font-bold text-warning"><AlertCircle size={14} /> {status}</span>;
    if (status === 'Scheduled') return <span className="flex items-center gap-1 text-xs font-bold text-[#4C8684]"><Clock size={14} /> {status}</span>;
    if (status === 'Completed') return <span className="flex items-center gap-1 text-xs font-bold text-success"><CheckCircle size={14} /> {status}</span>;
    return null;
  };

  const all = [...(vaccinations?.upcoming || []), ...(vaccinations?.missed || []), ...(vaccinations?.completed || [])];
  const vaccines = [...new Set(all.map((v) => v.vaccine).filter(Boolean))];
  const q = search.trim().toLowerCase();
  const rows = getData().filter((r) =>
    (!q || r.petName?.toLowerCase().includes(q) || r.owner?.toLowerCase().includes(q) || r.vaccine?.toLowerCase().includes(q)) &&
    (vaccineFilter === 'All' || r.vaccine === vaccineFilter)
  );

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
          <Syringe size={20} className="text-primary-main shrink-0" /> Vaccination Tracker
        </h2>
        <p className="text-xs text-text-secondary mt-1">Monitor schedules, send reminders, and track compliance.</p>
      </div>

      <SegmentedTabs
        items={[
          { key: 'upcoming', label: 'Upcoming', badge: (vaccinations?.upcoming || []).length || null },
          { key: 'missed', label: 'Missed / Overdue', badge: (vaccinations?.missed || []).length || null },
          { key: 'completed', label: 'Completed' },
        ]}
        activeKey={activeTab}
        onSelect={setActiveTab}
      />

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search by pet or owner..."
        onFilter={() => setFiltersOpen(true)}
        filterCount={vaccineFilter !== 'All' ? 1 : 0}
      />

      <FilterSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} onReset={() => setVaccineFilter('All')}>
        <FilterOptions label="Vaccine" value={vaccineFilter} onChange={setVaccineFilter} options={['All', ...vaccines]} />
      </FilterSheet>

      {rows.length === 0 ? (
        <EmptyState icon={Syringe} text={q || vaccineFilter !== 'All' ? 'No vaccinations match your search.' : 'No vaccinations here.'} />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const state = sendingState[row.id];
            const remindedAt = state && state !== 'sending' ? state : row.remindedAt;
            return (
              <ListCard
                key={row.id}
                title={row.petName}
                subtitle={row.owner}
                badge={statusLine(row.status)}
                meta={[
                  { label: 'Vaccine Type', value: <span className="inline-block bg-accent-teal/10 text-[#4C8684] px-2 py-0.5 rounded-md text-xs font-bold border border-accent-teal/20">{row.vaccine}</span> },
                  { label: 'Scheduled Date', value: <span className="inline-flex items-center gap-1.5"><Clock size={13} className="text-text-secondary" /> {row.date}</span> },
                ]}
                footer={activeTab !== 'completed' ? (
                  <div className="w-full space-y-1.5">
                    <CardAction
                      tone={remindedAt ? 'outline' : 'primary'}
                      className="w-full"
                      onClick={() => handleSendReminder(row)}
                      disabled={state === 'sending'}
                    >
                      {state === 'sending' ? 'Sending...' : remindedAt ? 'Send Again' : 'Send Reminder'}
                    </CardAction>
                    {remindedAt && <p className="text-[11px] font-semibold text-success text-center">✓ {sentLabel(remindedAt)}</p>}
                  </div>
                ) : null}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
