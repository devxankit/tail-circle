import React, { useState } from 'react';
import { FileText, Download, Eye, Calendar as CalendarIcon, User, Plus, AlertCircle, CheckCircle } from 'lucide-react';
import { useVendor } from '../context/ClinicVendorContext';
import { SearchBar, FilterChips, ListCard, CardAction, BottomSheet, PrimaryButton, EmptyState, InlineError, useVendorToast, errorMessage, fieldClass, textareaClass, labelClass } from '../../vendor/mobile';
import { printDocument, findPatient } from '../utils/clinicActions';

const TYPE_COLORS = {
  Emergency: 'bg-error/10 text-error border-error/20',
  Surgery: 'bg-bg-secondary text-text-primary border-border-light',
  'Video Consult': 'bg-accent-teal/10 text-[#4C8684] border-accent-teal/25',
  'Clinical Visit': 'bg-success/10 text-success border-success/20',
};

export function MedicalRecordsView({ onNavigate }) {
  const { medicalRecords: records, addMedicalRecord, doctorPatients } = useVendor();
  const { addToast } = useVendorToast();
  const [saveError, setSaveError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [downloadingId, setDownloadingId] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newRecord, setNewRecord] = useState({ petName: '', owner: '', phone: '', type: 'Clinical Visit', diagnosis: '', treatment: '', weight: '', temp: '' });

  const filtered = records.filter(r => {
    const matchesSearch = r.petName.toLowerCase().includes(searchQuery.toLowerCase()) || r.diagnosis.toLowerCase().includes(searchQuery.toLowerCase()) || r.owner.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'All' || r.type === typeFilter;
    return matchesSearch && matchesType;
  });

  /*
   * "Download PDF": the record is laid out in a print window and the browser's
   * print dialog saves it as a PDF. (Records have no stored file; this button
   * used to only flash "Wait..." and do nothing.)
   */
  const handleDownload = (row) => {
    if (downloadingId) return;
    setDownloadingId(row.id);
    const opened = printDocument({
      title: `Medical Record ${row.id} — ${row.petName}`,
      subtitle: [row.date, row.doctor].filter(Boolean).join(' · '),
      rows: [
        ['Pet', row.petName],
        ['Owner', row.owner],
        ['Phone', row.phone],
        ['Encounter type', row.type],
        ['Weight', row.weight],
        ['Temperature', row.temp],
        ['Primary diagnosis', row.diagnosis],
      ],
      sections: [{ title: 'Treatment plan', body: row.treatment }],
    });
    if (!opened) addToast({ message: 'Allow pop-ups for this site to download the record.', type: 'warning' });
    setTimeout(() => setDownloadingId(null), 800);
  };

  const handleSaveRecord = async () => {
    if (!newRecord.petName || !newRecord.diagnosis) return;
    setIsSaving(true);
    setSaveError('');
    try {
      await addMedicalRecord(newRecord);
      setShowAddModal(false);
      setAddSuccess(true);
      setNewRecord({ petName: '', owner: '', phone: '', type: 'Clinical Visit', diagnosis: '', treatment: '', weight: '', temp: '' });
      setTimeout(() => setAddSuccess(false), 3000);
    } catch (err) {
      setSaveError(errorMessage(err, 'Could not save the record.'));
    } finally {
      setIsSaving(false);
    }
  };

  const typeBadge = (type) => (
    <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold border ${TYPE_COLORS[type] || 'bg-bg-primary text-text-primary border-border-light'}`}>
      {type}
    </span>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 px-1">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <FileText size={20} className="text-primary-main shrink-0" /> Master Medical Records
          </h2>
          <p className="text-xs text-text-secondary mt-1">Access complete clinical histories, diagnoses, and past treatment plans.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="h-11 px-4 rounded-full bg-primary-main text-white text-sm font-bold flex items-center gap-1.5 shadow-md shadow-primary-main/25 shrink-0"
        >
          <Plus size={16} /> Add Record
        </button>
      </div>

      <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search by pet name, diagnosis..." />
      <FilterChips
        options={[{ value: 'All', label: 'All Types' }, 'Clinical Visit', 'Surgery', 'Video Consult', 'Emergency']}
        value={typeFilter}
        onChange={setTypeFilter}
      />

      {/* Success notice */}
      {addSuccess && (
        <div className="flex items-center gap-3 bg-success/10 border border-success/20 text-success rounded-2xl p-3 text-sm font-bold shadow-sm">
          <CheckCircle size={18} /> Record added successfully!
        </div>
      )}

      {/* Records */}
      {filtered.length === 0 ? (
        <EmptyState icon={AlertCircle} text="No medical records found matching your search." />
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => (
            <ListCard
              key={row.id}
              onClick={() => setViewRecord(row)}
              title={row.petName}
              subtitle={<span className="inline-flex items-center gap-1"><User size={12} /> {row.owner}</span>}
              badge={typeBadge(row.type)}
              meta={[
                { label: 'Record', value: row.id },
                { label: 'Date', value: <span className="inline-flex items-center gap-1"><CalendarIcon size={12} /> {row.date}</span> },
                { label: 'Primary Diagnosis', value: row.diagnosis, full: true },
              ]}
              footer={(
                <>
                  <CardAction icon={Eye} className="flex-1" onClick={() => setViewRecord(row)}>View Record</CardAction>
                  <CardAction
                    tone="outline"
                    icon={downloadingId === row.id ? undefined : Download}
                    className="flex-1"
                    onClick={() => handleDownload(row)}
                    disabled={downloadingId === row.id}
                  >
                    {downloadingId === row.id ? <span className="animate-pulse">Wait...</span> : 'Download PDF'}
                  </CardAction>
                </>
              )}
            />
          ))}
        </div>
      )}

      {/* View Record sheet */}
      <BottomSheet
        open={!!viewRecord}
        onClose={() => setViewRecord(null)}
        title={viewRecord ? `${viewRecord.id} — ${viewRecord.petName}` : ''}
        subtitle={viewRecord ? `${viewRecord.date} · ${viewRecord.doctor}` : undefined}
        footer={viewRecord && (
          <div className="flex gap-2">
            <PrimaryButton tone="outline" icon={Download} onClick={() => handleDownload(viewRecord)} className="text-sm">
              Download PDF
            </PrimaryButton>
            <PrimaryButton
              tone="dark"
              onClick={() => onNavigate('patient_detail', null, findPatient(doctorPatients, viewRecord.petName, viewRecord.owner) || { name: viewRecord.petName, owner: viewRecord.owner })}
              className="text-sm"
            >
              View Full Patient File
            </PrimaryButton>
          </div>
        )}
      >
        {viewRecord && (
          <div className="space-y-3 pb-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-bg-primary border border-border-light rounded-2xl p-3">
                <p className="text-[10px] font-bold text-text-secondary uppercase mb-1">Owner</p>
                <p className="text-sm font-bold text-text-primary">{viewRecord.owner}</p>
                <p className="text-xs text-text-secondary mt-0.5">{viewRecord.phone}</p>
              </div>
              <div className="bg-bg-primary border border-border-light rounded-2xl p-3">
                <p className="text-[10px] font-bold text-text-secondary uppercase mb-1">Encounter Type</p>
                {typeBadge(viewRecord.type)}
              </div>
              {viewRecord.weight && (
                <div className="bg-bg-primary border border-border-light rounded-2xl p-3">
                  <p className="text-[10px] font-bold text-text-secondary uppercase mb-1">Weight</p>
                  <p className="text-sm font-bold text-text-primary">{viewRecord.weight}</p>
                </div>
              )}
              {viewRecord.temp && (
                <div className="bg-bg-primary border border-border-light rounded-2xl p-3">
                  <p className="text-[10px] font-bold text-text-secondary uppercase mb-1">Temperature</p>
                  <p className="text-sm font-bold text-text-primary">{viewRecord.temp}</p>
                </div>
              )}
            </div>
            <div className="bg-bg-primary border border-border-light rounded-2xl p-3">
              <p className="text-[10px] font-bold text-text-secondary uppercase mb-1">Primary Diagnosis</p>
              <p className="text-sm font-bold text-text-primary">{viewRecord.diagnosis}</p>
            </div>
            {viewRecord.treatment && (
              <div className="bg-bg-primary border border-border-light rounded-2xl p-3">
                <p className="text-[10px] font-bold text-text-secondary uppercase mb-1">Treatment Plan</p>
                <p className="text-sm text-text-primary leading-relaxed">{viewRecord.treatment}</p>
              </div>
            )}
          </div>
        )}
      </BottomSheet>

      {/* Add Record: a full-screen form */}
      <BottomSheet
        open={showAddModal}
        onClose={() => { if (!isSaving) setShowAddModal(false); }}
        title="New Medical Record"
        fullScreen
        footer={(
          <div className="flex gap-2">
            <PrimaryButton tone="soft" onClick={() => setShowAddModal(false)} disabled={isSaving}>Cancel</PrimaryButton>
            <PrimaryButton
              tone="dark"
              onClick={handleSaveRecord}
              disabled={isSaving || !newRecord.petName || !newRecord.diagnosis}
              loading={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Record'}
            </PrimaryButton>
          </div>
        )}
      >
        <div className="space-y-4 pb-2">
          <InlineError>{saveError}</InlineError>
          <div>
            <label className={labelClass}>Pet Name *</label>
            <input value={newRecord.petName} onChange={e => setNewRecord(p => ({ ...p, petName: e.target.value }))} placeholder="e.g., Max" className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Owner Name</label>
            <input value={newRecord.owner} onChange={e => setNewRecord(p => ({ ...p, owner: e.target.value }))} placeholder="e.g., Rahul Kumar" className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input type="tel" inputMode="tel" value={newRecord.phone} onChange={e => setNewRecord(p => ({ ...p, phone: e.target.value }))} placeholder="+91-XXXXX-XXXXX" className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Encounter Type</label>
            <select value={newRecord.type} onChange={e => setNewRecord(p => ({ ...p, type: e.target.value }))} className={fieldClass}>
              <option>Clinical Visit</option>
              <option>Surgery</option>
              <option>Video Consult</option>
              <option>Emergency</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Weight</label>
              <input value={newRecord.weight} onChange={e => setNewRecord(p => ({ ...p, weight: e.target.value }))} placeholder="e.g., 12 kg" className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Temperature</label>
              <input value={newRecord.temp} onChange={e => setNewRecord(p => ({ ...p, temp: e.target.value }))} placeholder="e.g., 102°F" className={fieldClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Primary Diagnosis *</label>
            <input value={newRecord.diagnosis} onChange={e => setNewRecord(p => ({ ...p, diagnosis: e.target.value }))} placeholder="e.g., Acute Gastroenteritis" className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Treatment Plan</label>
            <textarea value={newRecord.treatment} onChange={e => setNewRecord(p => ({ ...p, treatment: e.target.value }))} rows={3} placeholder="Describe the treatment given..." className={textareaClass} />
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
