import React, { useState } from 'react';
import { User, Phone, CheckCircle, FileText, Activity, Pill, Syringe, Clock } from 'lucide-react';
import { useVendor } from '../context/ClinicVendorContext';
import { ChipTabs, StickyActionBar, PrimaryButton, StatusBadge, SkeletonList, EmptyState, useSubScreen } from '../../vendor/mobile';
import { ScheduleVisitSheet } from '../components/ScheduleVisitSheet';
import { textPhone, hasPhone, isSamePet, findPatient } from '../utils/clinicActions';

const TABS = ['overview', 'history', 'prescriptions', 'vaccinations'];

const VAX_TONE = { Overdue: 'error', 'Due Soon': 'warning', Scheduled: 'info', Completed: 'success' };

function NoRecords({ text }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-text-secondary text-center">
      <FileText size={40} className="mb-3 text-text-disabled" />
      <p className="text-sm font-medium">{text}</p>
    </div>
  );
}

export function PatientDetailView({ patient: selected, patientId, onNavigate }) {
  const { doctorPatients, medicalRecords, prescriptions, vaccinations, loading } = useVendor();
  const [activeTab, setActiveTab] = useState('overview');
  const [scheduleOpen, setScheduleOpen] = useState(false);

  // The app bar's Back returns to the patient list, as "Back to Patients" did.
  useSubScreen({ title: 'Patient', onBack: () => onNavigate('patients_list') });

  // Opened from a link or after a refresh only the id is known; from a record,
  // only the pet and owner names.
  const patient = selected?.species !== undefined ? selected
    : doctorPatients.find((p) => String(p.id) === String(selected?.id || patientId))
      || (selected?.name ? findPatient(doctorPatients, selected.name, selected.owner) : null)
      || selected;

  if (!patient) {
    if (loading && patientId) return <SkeletonList rows={3} />;
    return (
      <EmptyState
        icon={User}
        title="Patient not found"
        text="Open the patient from the Patients list."
        action={(
          <button onClick={() => onNavigate('patients_list')} className="min-h-[44px] px-5 rounded-xl bg-text-primary text-white text-sm font-bold">
            Back to Patients
          </button>
        )}
      />
    );
  }

  const history = medicalRecords.filter((r) => isSamePet(r, patient));
  const rxList = (prescriptions || []).filter((r) => isSamePet(r, patient));
  const vaxList = [
    ...(vaccinations?.upcoming || []),
    ...(vaccinations?.missed || []),
    ...(vaccinations?.completed || []),
  ].filter((v) => isSamePet(v, patient));

  const status = patient.status || '';
  const healthy = status.includes('Healthy');

  return (
    <div className="space-y-4">
      {/* Header Profile */}
      <div className="bg-white border border-border-light rounded-[20px] p-4 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-2xl bg-primary-light/40 flex items-center justify-center text-primary-main font-bold text-3xl shrink-0 border border-primary-main/15">
            {(patient.name || '?').charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-text-primary">{patient.name}</h1>
            <p className="text-sm font-medium text-text-secondary mt-1">
              {[patient.species, patient.breed, patient.gender, patient.age].filter(Boolean).join(' • ')}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border-light grid grid-cols-1 gap-2.5">
          <div className="flex items-center gap-2 text-sm text-text-primary">
            <User size={16} className="text-text-secondary shrink-0" />
            <span className="font-bold">{patient.owner || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-text-primary">
            <Phone size={16} className="text-text-secondary shrink-0" />
            <span>{patient.phone || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-text-primary">
            <Activity size={16} className="text-text-secondary shrink-0" />
            <span>{patient.weight || '—'}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <ChipTabs
        items={TABS.map(tab => ({
          key: tab,
          label: tab.charAt(0).toUpperCase() + tab.slice(1),
          badge: tab === 'history' ? history.length || null : tab === 'prescriptions' ? rxList.length || null : tab === 'vaccinations' ? vaxList.length || null : null,
        }))}
        activeKey={activeTab}
        onSelect={setActiveTab}
      />

      {/* Tab Content */}
      <div className="bg-white border border-border-light rounded-[20px] p-4 shadow-sm min-h-[240px]">
        {activeTab === 'overview' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Health Status</h3>
              <div className="p-4 bg-bg-primary border border-border-light rounded-2xl">
                <p className={`font-bold ${healthy ? 'text-success' : 'text-warning'}`}>
                  {status || '—'}
                </p>
                <p className="text-sm text-text-secondary mt-1">Last checkup was on {patient.lastVisit || '—'}</p>
              </div>
            </div>
            <div>
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Allergies</h3>
              <div className="flex flex-wrap gap-2">
                {patient.allergies?.length ? patient.allergies.map((a) => (
                  <span key={a} className="px-3 py-1 bg-error/10 text-error rounded-full text-xs font-bold">{a}</span>
                )) : (
                  <span className="px-3 py-1 bg-bg-secondary text-text-primary rounded-full text-xs font-medium">None reported</span>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Vaccination Overview</h3>
              <div className="p-4 bg-success/10 border border-success/20 rounded-2xl flex items-start gap-3">
                <CheckCircle className="text-success shrink-0 mt-0.5" size={16} />
                <div>
                  <p className="text-sm font-bold text-text-primary">{patient.vaccinations || '—'}</p>
                  <button onClick={() => setActiveTab('vaccinations')} className="min-h-[36px] text-xs text-success font-bold">View Schedule</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (history.length === 0 ? <NoRecords text="No visits recorded for this pet yet." /> : (
          <div className="space-y-2">
            {history.map((r) => (
              <div key={r.id} className="p-3 rounded-2xl bg-bg-primary border border-border-light">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-text-primary">{r.diagnosis || r.type}</p>
                  <span className="text-[11px] text-text-secondary shrink-0">{r.date}</span>
                </div>
                <p className="text-[11px] font-semibold text-text-secondary mt-0.5">{r.type}{r.doctor ? ` • ${r.doctor}` : ''}</p>
                {r.treatment && <p className="text-xs text-text-primary mt-1.5 line-clamp-3">{r.treatment}</p>}
              </div>
            ))}
            <button onClick={() => onNavigate('medical_records')} className="w-full min-h-[40px] text-xs font-bold text-primary-main">Open Medical Records</button>
          </div>
        ))}

        {activeTab === 'prescriptions' && (rxList.length === 0 ? <NoRecords text="No prescriptions issued for this pet yet." /> : (
          <div className="space-y-2">
            {rxList.map((rx) => (
              <div key={rx.id} className="p-3 rounded-2xl bg-bg-primary border border-border-light flex items-start gap-3">
                <Pill size={16} className="text-primary-main shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-text-primary">{rx.diagnosis || 'General prescription'}</p>
                    <span className="text-[11px] text-text-secondary shrink-0">{rx.date}</span>
                  </div>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    {rx.type === 'photo' || rx.prescriptionUrl ? 'Photo prescription' : (rx.items || []).map((m) => m.name).filter(Boolean).join(', ') || 'No medicines listed'}
                  </p>
                </div>
              </div>
            ))}
            <button onClick={() => onNavigate('prescriptions')} className="w-full min-h-[40px] text-xs font-bold text-primary-main">Open Prescriptions</button>
          </div>
        ))}

        {activeTab === 'vaccinations' && (vaxList.length === 0 ? <NoRecords text="No vaccinations tracked for this pet yet." /> : (
          <div className="space-y-2">
            {vaxList.map((v) => (
              <div key={v.id} className="p-3 rounded-2xl bg-bg-primary border border-border-light flex items-center gap-3">
                <Syringe size={16} className="text-[#4C8684] shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-text-primary">{v.vaccine}</p>
                  <p className="text-[11px] text-text-secondary flex items-center gap-1 mt-0.5"><Clock size={11} /> {v.date}</p>
                </div>
                <StatusBadge label={v.status} tone={VAX_TONE[v.status] || 'neutral'} />
              </div>
            ))}
            <button onClick={() => onNavigate('vaccinations')} className="w-full min-h-[40px] text-xs font-bold text-primary-main">Open Vaccination Tracker</button>
          </div>
        ))}
      </div>

      <StickyActionBar>
        <PrimaryButton tone="outline" className="text-sm" disabled={!hasPhone(patient.phone)} onClick={() => textPhone(patient.phone)}>
          Send Message
        </PrimaryButton>
        <PrimaryButton tone="dark" className="text-sm" onClick={() => setScheduleOpen(true)}>Schedule Appointment</PrimaryButton>
      </StickyActionBar>

      <ScheduleVisitSheet
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        pet={{ petName: patient.name, owner: patient.owner, phone: patient.phone }}
      />
    </div>
  );
}
