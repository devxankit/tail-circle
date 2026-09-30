import React, { useState, useRef } from 'react';
import { Plus, Printer, Download, FileText, Calendar, Search, Pill, Trash2, Camera, Upload, Eye, Check, Loader2 } from 'lucide-react';
import { useVendor } from '../context/ClinicVendorContext';
import { uploadVendorFile } from '../../../../services/vendor';
import {
  SegmentedTabs, FormSection, BottomSheet, StickyActionBar, PrimaryButton, EmptyState, StatusBadge,
  useVendorToast, errorMessage, fieldClass, textareaClass, labelClass,
} from '../../vendor/mobile';
import { printDocument, medicinesTable } from '../utils/clinicActions';

const smallField = 'w-full h-11 rounded-xl border border-border-light bg-white px-3 text-[16px] text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-accent-teal focus:ring-2 focus:ring-accent-teal/20';

export function PrescriptionManagementView({ onNavigate }) {
  const { doctorPatients, prescriptions, addPrescription } = useVendor();
  const { addToast } = useVendorToast();
  const [activeTab, setActiveTab] = useState('new');

  // Prescription Mode: 'digital' | 'photo'
  const [rxType, setRxType] = useState('digital');

  // Common Prescription State
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  // Digital Mode State
  const [medicines, setMedicines] = useState([{ name: '', dosage: '', frequency: '', duration: '' }]);

  // Photo Mode State
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Lightbox Modal for Photo Prescriptions in History/Preview
  const [lightboxImage, setLightboxImage] = useState(null);
  // The preview column, as a sheet on a phone.
  const [showPreview, setShowPreview] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  const addMedicine = () => setMedicines([...medicines, { name: '', dosage: '', frequency: '', duration: '' }]);

  const updateMedicine = (index, field, value) => {
    const updated = [...medicines];
    updated[index][field] = value;
    setMedicines(updated);
  };

  const removeMedicine = (index) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPhotoPreview(localUrl);
    setUploadError('');
    setIsUploading(true);

    try {
      const uploadedUrl = await uploadVendorFile(file, 'prescriptions');
      if (uploadedUrl) {
        setPhotoUrl(uploadedUrl);
      } else {
        setPhotoUrl(localUrl); // Fallback to local data URL if dev server mock
      }
    } catch (err) {
      console.warn('Upload error, fallback to preview:', err);
      // Keep local preview as fallback
      setPhotoUrl(localUrl);
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = () => {
    setPhotoUrl('');
    setPhotoPreview('');
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    if (isSaving) return;
    if (!selectedPatientId) {
      addToast({ message: 'Please select a patient first.', type: 'error' });
      return;
    }

    if (rxType === 'photo' && !photoUrl && !photoPreview) {
      addToast({ message: 'Please upload or click a photo of the prescription.', type: 'error' });
      return;
    }

    setIsSaving(true);
    try {
      const finalPhotoUrl = photoUrl || photoPreview;
      await addPrescription({
        patientId: selectedPatientId,
        diagnosis: diagnosis || (rxType === 'photo' ? 'Uploaded Photo Prescription' : ''),
        medicines: rxType === 'digital' ? medicines : [],
        type: rxType,
        prescriptionUrl: rxType === 'photo' ? finalPhotoUrl : '',
        notes,
        followUpDate
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

      // Reset form
      setDiagnosis('');
      setMedicines([{ name: '', dosage: '', frequency: '', duration: '' }]);
      setNotes('');
      setPhotoUrl('');
      setPhotoPreview('');
      setFollowUpDate('');
    } catch (err) {
      addToast({ message: errorMessage(err, 'Failed to save prescription. Please try again.'), type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedPatient = doctorPatients.find(p => String(p.id) === String(selectedPatientId));

  const handlePrintPhoto = (imgSrc) => {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`
        <html>
          <head>
            <title>Print Prescription</title>
            <style>
              body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: sans-serif; }
              img { max-width: 100%; max-height: 100vh; object-fit: contain; }
            </style>
          </head>
          <body>
            <img src="${imgSrc}" onload="window.print();window.close();" />
          </body>
        </html>
      `);
      win.document.close();
    }
  };

  const hasPhoto = Boolean(photoUrl || photoPreview);
  const filledMedicines = medicines.filter((m) => m.name.trim());

  /** Print (or save as PDF) the digital prescription being written. */
  const printDigital = () => {
    if (!selectedPatient) {
      addToast({ message: 'Please select a patient first.', type: 'error' });
      return;
    }
    const opened = printDocument({
      title: `Prescription — ${selectedPatient.name}`,
      subtitle: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
      rows: [
        ['Pet', `${selectedPatient.name}${selectedPatient.breed ? ` (${selectedPatient.breed})` : ''}`],
        ['Owner', selectedPatient.owner],
        ['Diagnosis', diagnosis],
        ['Follow-up date', followUpDate],
      ],
      sections: [
        { title: 'Medicines', html: medicinesTable(filledMedicines) },
        { title: "Doctor's advice", body: notes },
      ],
    });
    if (!opened) addToast({ message: 'Allow pop-ups for this site to print.', type: 'warning' });
  };

  /** Print a saved digital prescription from the history list. */
  const printSavedDigital = (rx) => {
    const opened = printDocument({
      title: `Prescription — ${rx.petName}`,
      subtitle: rx.date,
      rows: [['Pet', rx.petName], ['Owner', rx.owner], ['Diagnosis', rx.diagnosis], ['Follow-up date', rx.followUpDate]],
      sections: [
        { title: 'Medicines', html: medicinesTable(rx.items || []) },
        { title: "Doctor's advice", body: rx.notes },
      ],
    });
    if (!opened) addToast({ message: 'Allow pop-ups for this site to print.', type: 'warning' });
  };

  const hq = historySearch.trim().toLowerCase();
  const historyRows = (prescriptions || []).filter((rx) => !hq
    || rx.petName?.toLowerCase().includes(hq)
    || rx.owner?.toLowerCase().includes(hq)
    || rx.diagnosis?.toLowerCase().includes(hq)
    || (rx.items || []).some((m) => m.name?.toLowerCase().includes(hq)));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="px-1">
        <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
          <Pill className="text-primary-main shrink-0" size={20} /> Digital & Photo Prescription Pad
        </h2>
        <p className="text-xs text-text-secondary mt-1">Create digital text prescriptions or upload photo of handwritten prescriptions.</p>
      </div>

      <SegmentedTabs
        items={[
          { key: 'new', label: '+ New Prescription' },
          { key: 'history', label: `History (${(prescriptions || []).length})` },
        ]}
        activeKey={activeTab}
        onSelect={setActiveTab}
      />

      {activeTab === 'new' ? (
        <>
          {/* Prescription Mode Selector Toggle */}
          <div className="bg-bg-secondary p-1 rounded-2xl flex gap-1">
            <button
              type="button"
              onClick={() => setRxType('digital')}
              className={`flex-1 min-h-[44px] px-2 rounded-xl text-[13px] font-bold transition flex items-center justify-center gap-1.5 ${
                rxType === 'digital' ? 'bg-white text-text-primary shadow-sm' : 'text-text-secondary'
              }`}
            >
              <FileText size={16} className={rxType === 'digital' ? 'text-primary-main' : ''} />
              <span>Digital Form (Text)</span>
            </button>
            <button
              type="button"
              onClick={() => setRxType('photo')}
              className={`flex-1 min-h-[44px] px-2 rounded-xl text-[13px] font-bold transition flex items-center justify-center gap-1.5 ${
                rxType === 'photo' ? 'bg-white text-text-primary shadow-sm' : 'text-text-secondary'
              }`}
            >
              <Camera size={16} className={rxType === 'photo' ? 'text-[#4C8684]' : ''} />
              <span>Upload Photo / Camera</span>
            </button>
          </div>

          {/* Patient & Diagnosis Details */}
          <FormSection title="Patient Details">
            <div>
              <label className={labelClass}>Select Patient *</label>
              <select
                className={fieldClass}
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
              >
                <option value="">-- Choose Patient --</option>
                {doctorPatients.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.owner})</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Clinical Diagnosis {rxType === 'digital' ? '*' : '(Optional)'}</label>
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="e.g., Acute Gastroenteritis / Otitis Externa"
                className={fieldClass}
              />
            </div>
          </FormSection>

          {/* DIGITAL FORM MODE */}
          {rxType === 'digital' && (
            <FormSection
              title="Medication List"
              action={(
                <button onClick={addMedicine} className="min-h-[36px] text-xs font-bold text-primary-main flex items-center gap-1">
                  <Plus size={14} /> Add Medicine
                </button>
              )}
            >
              {medicines.map((med, index) => (
                <div key={index} className="bg-bg-primary p-3 rounded-2xl border border-border-light space-y-2">
                  <div className="flex items-end gap-2">
                    <div className="flex-1 min-w-0">
                      <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Medicine Name</label>
                      <input type="text" value={med.name} onChange={(e) => updateMedicine(index, 'name', e.target.value)} className={smallField} placeholder="e.g. Amoxicillin" />
                    </div>
                    <button onClick={() => removeMedicine(index)} className="w-11 h-11 flex items-center justify-center text-error bg-error/10 rounded-xl shrink-0" title="Remove medicine" aria-label="Remove medicine">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="min-w-0">
                      <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Dosage</label>
                      <input type="text" value={med.dosage} onChange={(e) => updateMedicine(index, 'dosage', e.target.value)} className={smallField} placeholder="50mg" />
                    </div>
                    <div className="min-w-0">
                      <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Frequency</label>
                      <input type="text" value={med.frequency} onChange={(e) => updateMedicine(index, 'frequency', e.target.value)} className={smallField} placeholder="1-0-1 (BID)" />
                    </div>
                    <div className="min-w-0">
                      <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Duration</label>
                      <input type="text" value={med.duration} onChange={(e) => updateMedicine(index, 'duration', e.target.value)} className={smallField} placeholder="5 Days" />
                    </div>
                  </div>
                </div>
              ))}
            </FormSection>
          )}

          {/* PHOTO UPLOAD / CAMERA MODE */}
          {rxType === 'photo' && (
            <FormSection title="Prescription Photo Upload">
              {/* Hidden file & camera inputs */}
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handlePhotoSelect}
                className="hidden"
              />
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={cameraInputRef}
                onChange={handlePhotoSelect}
                className="hidden"
              />

              {!hasPhoto ? (
                <div className="border-2 border-dashed border-accent-teal/40 bg-accent-teal/5 rounded-2xl p-5 text-center space-y-4">
                  <div className="w-14 h-14 bg-accent-teal/15 text-[#4C8684] rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <Camera size={28} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text-primary">Click or Upload Prescription Photo</h4>
                    <p className="text-xs text-text-secondary mt-1">
                      Snap a photo of the physical prescription sheet using your camera, or upload a scanned image file.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="w-full h-12 bg-accent-teal text-white font-bold text-sm rounded-2xl shadow-sm transition flex items-center justify-center gap-2"
                    >
                      <Camera size={18} /> Snap Photo (Camera)
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-12 bg-white border border-border-light text-text-primary font-bold text-sm rounded-2xl shadow-sm transition flex items-center justify-center gap-2"
                    >
                      <Upload size={18} /> Choose File from Device
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative bg-[#111827] rounded-2xl overflow-hidden shadow-md">
                  <img
                    src={photoPreview || photoUrl}
                    alt="Prescription preview"
                    className="w-full h-64 object-contain bg-[#111827]"
                  />

                  {isUploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white gap-2 font-bold text-xs">
                      <Loader2 className="animate-spin" size={18} /> Uploading photo...
                    </div>
                  )}

                  <div className="absolute top-3 right-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setLightboxImage(photoPreview || photoUrl)}
                      className="w-10 h-10 flex items-center justify-center bg-black/60 text-white rounded-xl transition"
                      title="View Full Resolution"
                      aria-label="View Full Resolution"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="w-10 h-10 flex items-center justify-center bg-error/90 text-white rounded-xl transition"
                      title="Remove / Retake Photo"
                      aria-label="Remove / Retake Photo"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="p-3 bg-black text-white flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-accent-teal font-bold">
                      <Check size={14} /> Photo Attached Successfully
                    </span>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="min-h-[36px] text-white/80 font-medium underline text-[12px]"
                    >
                      Retake Photo
                    </button>
                  </div>
                </div>
              )}
            </FormSection>
          )}

          {/* Notes & Follow up date */}
          <FormSection>
            <div>
              <label className={labelClass}>Doctor's Advice / Instructions</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Rest, specific diet, precautions..."
                rows={3}
                className={textareaClass}
              />
            </div>
            <div>
              <label className={labelClass}>Follow-up Date</label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className={fieldClass}
              />
            </div>
          </FormSection>

          <StickyActionBar>
            <PrimaryButton tone="outline" icon={Eye} onClick={() => setShowPreview(true)} className="flex-none px-4 text-sm">
              Preview
            </PrimaryButton>
            <PrimaryButton
              tone={saveSuccess ? 'teal' : 'dark'}
              onClick={handleSave}
              disabled={isSaving || saveSuccess}
              loading={isSaving}
            >
              {saveSuccess ? '✓ Saved Successfully' : isSaving ? 'Saving...' : 'Save Prescription'}
            </PrimaryButton>
          </StickyActionBar>

          {/* Preview / Action Area */}
          <BottomSheet
            open={showPreview}
            onClose={() => setShowPreview(false)}
            title="Prescription Preview"
            footer={(
              <div className="flex gap-2">
                <PrimaryButton
                  tone="outline"
                  icon={Printer}
                  onClick={() => (rxType === 'digital' ? printDigital() : hasPhoto && handlePrintPhoto(photoUrl || photoPreview))}
                  disabled={rxType === 'photo' ? !hasPhoto : !selectedPatient}
                  className="text-sm"
                >
                  Print
                </PrimaryButton>
                {rxType === 'digital' ? (
                  <PrimaryButton tone="outline" icon={Download} onClick={printDigital} disabled={!selectedPatient} className="text-sm">
                    PDF
                  </PrimaryButton>
                ) : (
                  <a
                    href={photoUrl || photoPreview || '#'}
                    download="prescription.jpg"
                    target="_blank"
                    rel="noreferrer"
                    className={`flex-1 h-12 rounded-2xl bg-white border border-border-light text-text-primary font-bold text-sm transition flex items-center justify-center gap-2 ${!hasPhoto ? 'pointer-events-none opacity-50' : ''}`}
                  >
                    <Download size={16} /> Image / PDF
                  </a>
                )}
              </div>
            )}
          >
            <div className="pb-2">
              {selectedPatient && (
                <p className="text-xs font-semibold text-text-secondary mb-3">
                  {selectedPatient.name} ({selectedPatient.owner})
                </p>
              )}
              {rxType === 'photo' && hasPhoto ? (
                <div className="bg-white border border-border-light rounded-2xl overflow-hidden flex flex-col">
                  <div className="p-3 bg-accent-teal/10 border-b border-accent-teal/20 flex justify-between items-center">
                    <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                      <Camera size={14} /> Photo Document
                    </span>
                    <button
                      onClick={() => setLightboxImage(photoPreview || photoUrl)}
                      className="min-h-[36px] text-[12px] font-bold text-[#4C8684] flex items-center gap-1"
                    >
                      <Eye size={12} /> Full Screen
                    </button>
                  </div>
                  <div className="p-2 bg-bg-secondary flex items-center justify-center overflow-hidden">
                    <img
                      src={photoPreview || photoUrl}
                      alt="Prescription preview"
                      className="max-h-56 object-contain rounded border border-border-light"
                    />
                  </div>
                </div>
              ) : rxType === 'digital' && selectedPatient ? null : (
                <div className="bg-white border border-dashed border-border-light rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                  {rxType === 'photo' ? (
                    <>
                      <Camera size={44} className="text-accent-teal/50 mb-3" />
                      <p className="text-sm font-bold text-text-secondary">Live Photo Preview</p>
                      <p className="text-xs text-text-secondary/80 mt-1 max-w-xs">Upload or snap a prescription picture to see preview here.</p>
                    </>
                  ) : (
                    <>
                      <FileText size={44} className="text-text-disabled mb-3" />
                      <p className="text-sm font-bold text-text-secondary">Live Digital Preview</p>
                      <p className="text-xs text-text-secondary/80 mt-1 max-w-xs">Fill out the form to generate prescription document.</p>
                    </>
                  )}
                </div>
              )}
              {rxType === 'digital' && selectedPatient && (
                <div className="mt-3 bg-white border border-border-light rounded-2xl p-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-black text-text-primary">{selectedPatient.name}</p>
                      <p className="text-xs text-text-secondary">{selectedPatient.owner}</p>
                    </div>
                    <p className="text-xs text-text-secondary shrink-0">{new Date().toLocaleDateString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-text-secondary">Diagnosis</p>
                    <p className="font-semibold text-text-primary">{diagnosis || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-text-secondary mb-1">Medicines</p>
                    {filledMedicines.length ? (
                      <ul className="space-y-1">
                        {filledMedicines.map((m, i) => (
                          <li key={i} className="text-text-primary">
                            <span className="font-bold">{m.name}</span>
                            <span className="text-text-secondary"> {[m.dosage, m.frequency, m.duration].filter(Boolean).join(' · ')}</span>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="text-text-secondary">None added yet</p>}
                  </div>
                  {notes && (
                    <div>
                      <p className="text-[10px] font-bold uppercase text-text-secondary">Advice</p>
                      <p className="text-text-primary whitespace-pre-wrap">{notes}</p>
                    </div>
                  )}
                  {followUpDate && <p className="text-xs font-bold text-[#4C8684]">Follow-up: {followUpDate}</p>}
                </div>
              )}
            </div>
          </BottomSheet>
        </>
      ) : (
        /* HISTORY TAB */
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" size={18} />
            <input
              type="search"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Search past prescriptions..."
              className="w-full h-12 rounded-2xl border border-border-light bg-white pl-11 pr-4 text-[16px] text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-accent-teal focus:ring-2 focus:ring-accent-teal/20"
            />
          </div>
          {historyRows.length === 0 ? (
            hq
              ? <EmptyState icon={Search} text="No prescriptions match your search." />
              : <EmptyState icon={Pill} title="No prescription history found." text="Past prescriptions will appear here." />
          ) : (
            historyRows.map((rx) => {
              const isPhoto = rx.type === 'photo' || rx.prescriptionUrl;
              return (
                <div key={rx.id} className="bg-white border border-border-light rounded-[20px] shadow-sm p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isPhoto ? 'bg-accent-teal/10 text-[#4C8684]' : 'bg-primary-light/40 text-primary-main'}`}>
                      {isPhoto ? <Camera size={18} /> : <Pill size={18} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold text-text-primary min-w-0">{rx.petName} <span className="text-text-secondary font-medium">· {rx.owner}</span></p>
                        <StatusBadge label={rx.status} tone={rx.status === 'completed' ? 'neutral' : 'success'} className="shrink-0" />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isPhoto ? 'bg-accent-teal/15 text-[#4C8684]' : 'bg-primary-light/40 text-primary-dark'}`}>
                          {isPhoto ? '📷 Photo Rx' : '📝 Digital Rx'}
                        </span>
                        <span className="text-[11px] text-text-secondary flex items-center gap-1"><Calendar size={11} /> {rx.date}</span>
                      </div>

                      <p className="text-xs text-text-secondary mt-1.5">{rx.diagnosis || 'General prescription'}</p>

                      {isPhoto ? (
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => setLightboxImage(rx.prescriptionUrl)}
                            className="min-h-[40px] inline-flex items-center gap-1.5 text-xs font-bold text-[#4C8684] bg-accent-teal/10 px-3 rounded-xl transition"
                          >
                            <Eye size={13} /> View Prescription Photo
                          </button>
                          <button
                            onClick={() => handlePrintPhoto(rx.prescriptionUrl)}
                            className="min-h-[40px] px-2 text-xs text-text-secondary font-medium flex items-center gap-1"
                          >
                            <Printer size={13} /> Print
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="text-[11px] text-text-secondary/80 mt-1">
                            {(rx.items || []).map(m => m.name).filter(Boolean).join(', ') || 'No medicines listed'}
                          </p>
                          <button
                            onClick={() => printSavedDigital(rx)}
                            className="min-h-[40px] mt-1 px-2 -ml-2 text-xs text-text-secondary font-medium flex items-center gap-1"
                          >
                            <Printer size={13} /> Print / PDF
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Full-screen photo viewer */}
      <BottomSheet
        open={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
        title={<span className="flex items-center gap-2"><Camera size={16} className="text-[#4C8684]" /> Prescribed Photo Document</span>}
        fullScreen
        zIndex={90}
        bodyClassName="bg-[#111827] flex items-center justify-center"
        footer={(
          <div className="flex gap-2">
            <PrimaryButton tone="outline" icon={Printer} onClick={() => handlePrintPhoto(lightboxImage)} className="text-sm">
              Print
            </PrimaryButton>
            <a
              href={lightboxImage || '#'}
              download="prescription-photo.jpg"
              target="_blank"
              rel="noreferrer"
              className="flex-1 h-12 rounded-2xl bg-accent-teal text-white font-bold text-sm transition flex items-center justify-center gap-2"
            >
              <Download size={16} /> Download Image
            </a>
          </div>
        )}
      >
        {lightboxImage && (
          <img
            src={lightboxImage}
            alt="Full prescription"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        )}
      </BottomSheet>
    </div>
  );
}
