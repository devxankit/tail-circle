import React, { useState } from 'react';
import { Phone, Calendar, FileText, User, Users } from 'lucide-react';
import { useVendor } from '../context/ClinicVendorContext';
import { SearchBar, FilterSheet, FilterOptions, EmptyState } from '../../vendor/mobile';
import { ScheduleVisitSheet } from '../components/ScheduleVisitSheet';

export function PatientRecordsView({ onNavigate }) {
  const { doctorPatients } = useVendor();
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [speciesFilter, setSpeciesFilter] = useState('All');

  const statuses = [...new Set(doctorPatients.map((p) => p.status).filter(Boolean))];
  const species = [...new Set(doctorPatients.map((p) => p.species).filter(Boolean))];
  const filterCount = (statusFilter !== 'All' ? 1 : 0) + (speciesFilter !== 'All' ? 1 : 0);

  const filteredPatients = doctorPatients.filter(p =>
    (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.owner.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (statusFilter === 'All' || p.status === statusFilter) &&
    (speciesFilter === 'All' || p.species === speciesFilter)
  );

  const [bookingPatient, setBookingPatient] = useState(null);

  const handleBook = (e, patient) => {
    e.preventDefault();
    setBookingPatient(patient);
  };

  const underTreatment = doctorPatients.filter((p) => p.status && !p.status.includes('Healthy')).length;

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h2 className="text-lg font-bold text-text-primary">Patient Records</h2>
        <p className="text-xs text-text-secondary mt-1">Total Patients: {doctorPatients.length} | Needing attention: {underTreatment}</p>
      </div>

      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search by pet name, owner..."
        onFilter={() => setFiltersOpen(true)}
        filterCount={filterCount}
      />

      <FilterSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        onReset={() => { setStatusFilter('All'); setSpeciesFilter('All'); }}
      >
        <FilterOptions label="Health status" value={statusFilter} onChange={setStatusFilter} options={['All', ...statuses]} />
        {species.length > 0 && (
          <FilterOptions label="Species" value={speciesFilter} onChange={setSpeciesFilter} options={['All', ...species]} />
        )}
      </FilterSheet>

      {filteredPatients.length === 0 ? (
        <EmptyState icon={Users} text="No patients found matching your search." />
      ) : (
        <div className="space-y-3">
          {filteredPatients.map(patient => (
            <div key={patient.id} className="bg-white border border-border-light rounded-[20px] overflow-hidden shadow-sm">
              <div className="p-4 flex items-start gap-3">
                <div className="w-14 h-14 rounded-full bg-primary-light/40 flex items-center justify-center text-primary-main font-bold text-xl shrink-0 overflow-hidden border-2 border-white shadow-sm">
                  {patient.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-bold text-text-primary truncate">{patient.name}</h3>
                  <p className="text-xs font-medium text-text-secondary truncate">{[patient.breed, patient.age, patient.gender].filter(Boolean).join(', ')}</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-text-secondary flex items-center gap-1.5">
                      <User size={12} className="shrink-0" />
                      <span className="truncate">{patient.owner}</span>
                    </p>
                    <p className="text-xs text-text-secondary flex items-center gap-1.5">
                      <Phone size={12} className="shrink-0" />
                      {patient.phone || '—'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-4 pb-4 grid grid-cols-3 gap-2">
                <div className="bg-bg-primary rounded-xl p-2.5 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-text-secondary">Last Visit</p>
                  <p className="text-xs font-bold text-text-primary mt-0.5 break-words">{patient.lastVisit || '—'}</p>
                </div>
                <div className="bg-bg-primary rounded-xl p-2.5 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-text-secondary">Status</p>
                  <p className={`text-xs font-bold mt-0.5 break-words ${(patient.status || '').includes('Healthy') ? 'text-success' : 'text-warning'}`}>
                    {patient.status || '—'}
                  </p>
                </div>
                <div className="bg-bg-primary rounded-xl p-2.5 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-text-secondary">Total Visits</p>
                  <p className="text-xs font-bold text-text-primary mt-0.5">{patient.visits ?? 0}</p>
                </div>
              </div>

              <div className="px-4 pb-4 pt-3 border-t border-border-light flex gap-2">
                <button
                  onClick={() => onNavigate('patient_detail', null, patient)}
                  className="flex-1 min-h-[44px] bg-white border border-border-light rounded-xl text-[13px] font-bold text-text-primary transition flex items-center justify-center gap-1.5"
                >
                  <FileText size={15} /> View Record
                </button>
                <button
                  onClick={(e) => handleBook(e, patient)}
                  className="flex-1 min-h-[44px] bg-primary-main text-white rounded-xl text-[13px] font-bold transition flex items-center justify-center gap-1.5"
                >
                  <Calendar size={15} /> Book Visit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking sheet — saves the visit to the clinic's follow-ups. */}
      <ScheduleVisitSheet
        open={!!bookingPatient}
        onClose={() => setBookingPatient(null)}
        title="Book Visit"
        pet={bookingPatient ? { petName: bookingPatient.name, owner: bookingPatient.owner, phone: bookingPatient.phone } : null}
      />
    </div>
  );
}
