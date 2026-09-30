import React, { useRef, useState } from 'react';
import { Upload, Download, Eye, FileDigit, FileText } from 'lucide-react';
import { useVendor } from '../context/ClinicVendorContext';
import { uploadVendorFile } from '../../../../services/vendor';
import {
  SearchBar, ListCard, CardAction, StatusBadge, EmptyState, BottomSheet, PrimaryButton, InlineError,
  useVendorToast, errorMessage, fieldClass, labelClass,
} from '../../vendor/mobile';

const STATUSES = ['Ready', 'Processing', 'Sample Collected', 'Ordered'];
const isImage = (url) => /\.(png|jpe?g|webp|gif|bmp|heic)(\?|$)/i.test(url || '') || /^blob:|^data:image/.test(url || '');

const BLANK = { patient: '', owner: '', testType: '', status: 'Ready' };

export function LabReportsView() {
  const { labReports, doctorPatients, addLabReport } = useVendor();
  const { addToast } = useVendorToast();
  const [searchQuery, setSearchQuery] = useState('');

  const reports = labReports || [];

  const filtered = reports.filter(r => (r.patient || '').toLowerCase().includes(searchQuery.toLowerCase()) || (r.testType || '').toLowerCase().includes(searchQuery.toLowerCase()));

  // Upload sheet
  const [uploadOpen, setUploadOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileRef = useRef(null);

  // Preview sheet
  const [preview, setPreview] = useState(null);

  const openUpload = () => {
    setForm(BLANK);
    setFile(null);
    setUploadError('');
    setUploadOpen(true);
  };

  const pickPatient = (id) => {
    const p = doctorPatients.find((x) => String(x.id) === String(id));
    setForm((f) => ({ ...f, patient: p?.name || '', owner: p?.owner || '' }));
  };

  const handleUpload = async () => {
    if (isUploading) return;
    if (!form.patient.trim() || !form.testType.trim()) {
      setUploadError('Choose the patient and enter the test name.');
      return;
    }
    if (form.status === 'Ready' && !file) {
      setUploadError('Attach the result file for a report marked Ready.');
      return;
    }
    setIsUploading(true);
    setUploadError('');
    try {
      const resultUrl = file ? await uploadVendorFile(file, 'lab-reports') : '';
      await addLabReport({ ...form, patient: form.patient.trim(), testType: form.testType.trim(), resultUrl: resultUrl || undefined });
      setUploadOpen(false);
      addToast({ message: 'Lab report added.', type: 'success' });
    } catch (err) {
      setUploadError(errorMessage(err, 'Could not upload the report.'));
    } finally {
      setIsUploading(false);
    }
  };

  const download = (row) => {
    const a = document.createElement('a');
    a.href = row.resultUrl;
    a.download = `${row.id || 'lab-report'}`;
    a.target = '_blank';
    a.rel = 'noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 px-1">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <FileDigit size={20} className="text-primary-main shrink-0" /> Lab Reports & Diagnostics
          </h2>
          <p className="text-xs text-text-secondary mt-1">Manage and review patient laboratory and test results.</p>
        </div>
        <button
          onClick={openUpload}
          className="h-11 px-4 rounded-full text-sm font-bold flex items-center gap-1.5 shadow-md shrink-0 transition bg-primary-main text-white shadow-primary-main/25"
        >
          <Upload size={16} /> Upload Result
        </button>
      </div>

      <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search reports..." />

      {filtered.length === 0 ? (
        <EmptyState icon={FileDigit} text="No lab reports found." />
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => (
            <ListCard
              key={row.id}
              title={row.patient}
              subtitle={row.owner}
              badge={<StatusBadge label={row.status} tone={row.status === 'Ready' ? 'success' : 'warning'} />}
              meta={[
                { label: 'Test Type', value: row.testType, full: true },
                { label: 'Report ID', value: row.id },
                { label: 'Date', value: row.date },
              ]}
              footer={row.status === 'Ready' ? (
                row.resultUrl ? (
                  <>
                    <CardAction icon={Eye} className="flex-1" onClick={() => setPreview(row)}>Preview</CardAction>
                    <CardAction tone="outline" icon={Download} className="flex-1" onClick={() => download(row)}>Download</CardAction>
                  </>
                ) : (
                  <span className="text-xs text-text-secondary font-bold italic py-1">Ready — no result file was attached</span>
                )
              ) : (
                <span className="text-xs text-text-secondary font-bold italic py-1">Awaiting Lab</span>
              )}
            />
          ))}
        </div>
      )}

      {/* Upload a result */}
      <BottomSheet
        open={uploadOpen}
        onClose={() => { if (!isUploading) setUploadOpen(false); }}
        title="Upload Lab Result"
        hideClose={isUploading}
        footer={(
          <div className="flex gap-2">
            <PrimaryButton tone="soft" onClick={() => setUploadOpen(false)} disabled={isUploading}>Cancel</PrimaryButton>
            <PrimaryButton tone="dark" onClick={handleUpload} disabled={isUploading} loading={isUploading}>
              {isUploading ? 'Uploading...' : 'Save Report'}
            </PrimaryButton>
          </div>
        )}
      >
        <div className="space-y-4 pb-2">
          <InlineError>{uploadError}</InlineError>
          <div>
            <label className={labelClass}>Patient *</label>
            <select
              className={fieldClass}
              value={doctorPatients.find((p) => p.name === form.patient && p.owner === form.owner)?.id || ''}
              onChange={(e) => pickPatient(e.target.value)}
            >
              <option value="">-- Choose Patient --</option>
              {doctorPatients.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.owner})</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Test Name *</label>
            <input value={form.testType} onChange={(e) => setForm((f) => ({ ...f, testType: e.target.value }))} placeholder="e.g., Complete Blood Count (CBC)" className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={fieldClass}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Result File {form.status === 'Ready' ? '*' : '(optional)'}</label>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full min-h-[56px] rounded-xl border-2 border-dashed border-accent-teal/40 bg-accent-teal/5 text-sm font-bold text-[#4C8684] flex items-center justify-center gap-2 px-3"
            >
              {file ? <><FileText size={18} className="shrink-0" /> <span className="truncate">{file.name}</span></> : <><Upload size={18} /> Choose PDF or image</>}
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Preview a result */}
      <BottomSheet
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview ? `${preview.testType}` : ''}
        subtitle={preview ? `${preview.patient} • ${preview.date}` : undefined}
        fullScreen
        footer={preview ? (
          <PrimaryButton tone="teal" icon={Download} onClick={() => download(preview)}>Download</PrimaryButton>
        ) : null}
      >
        {preview && (isImage(preview.resultUrl) ? (
          <img src={preview.resultUrl} alt={preview.testType} className="w-full rounded-2xl border border-border-light" />
        ) : (
          <div className="h-full min-h-[60vh] flex flex-col">
            <iframe title={preview.testType} src={preview.resultUrl} className="flex-1 w-full rounded-2xl border border-border-light bg-white" />
            <a href={preview.resultUrl} target="_blank" rel="noreferrer" className="mt-3 text-center text-xs font-bold text-primary-main min-h-[40px] flex items-center justify-center gap-1.5">
              Open in a new tab
            </a>
          </div>
        ))}
      </BottomSheet>
    </div>
  );
}
