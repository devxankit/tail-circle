import { FileText, Trash2, Upload, Loader2, Link2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { Select, fieldClass } from './Field';
import { InlineError } from './EmptyState';

/**
 * Presentational pieces the provider profiles share. Every handler (upload,
 * remove, add) stays in the screen that owns it; these only draw.
 */

/** KYC documents: the uploaded list, the kind picker and the upload button. */
export function KycDocumentsBlock({
  documents = [],
  docKinds,
  docKind,
  onDocKind,
  onRemove,
  onFile,
  uploading,
  err,
  inputId,
}) {
  return (
    <div className="border-t border-border-light pt-4 space-y-3">
      <h3 className="text-sm font-bold text-text-primary">Compliance documents</h3>
      <InlineError>{err}</InlineError>
      <div className="space-y-2">
        {documents.map((d, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-bg-primary border border-border-light rounded-xl">
            <FileText size={18} className="text-text-secondary shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary">{docKinds.find((k) => k.value === d.kind)?.label || d.kind}</p>
              <a href={d.url} target="_blank" rel="noreferrer" className="block text-xs text-[#4C8684] truncate">{d.url}</a>
            </div>
            <StatusBadge status={d.status} />
            <button type="button" onClick={() => onRemove(i)} aria-label="Remove document" className="w-10 h-10 rounded-xl flex items-center justify-center text-error bg-error/5 shrink-0">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {!documents.length && <p className="text-sm text-text-disabled">No documents uploaded yet.</p>}
      </div>
      <Select value={docKind} onChange={onDocKind} options={docKinds} />
      <input type="file" id={inputId} accept="image/*,application/pdf" className="hidden" onChange={onFile} />
      <button
        type="button"
        onClick={() => document.getElementById(inputId).click()}
        disabled={uploading}
        className="w-full h-12 rounded-xl bg-text-primary text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40"
      >
        {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} {uploading ? 'Uploading…' : 'Upload document'}
      </button>
    </div>
  );
}

/** "Paste an image URL…" + Add URL, under a photo grid. */
export function PhotoUrlInput({ value, onChange, onAdd, placeholder = 'Paste an image URL…' }) {
  return (
    <div className="flex gap-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAdd(); } }}
        placeholder={placeholder}
        className={`${fieldClass} flex-1 min-w-0`}
      />
      <button type="button" onClick={onAdd} className="h-12 px-3.5 rounded-xl bg-bg-secondary text-text-primary text-sm font-bold flex items-center gap-1.5 shrink-0">
        <Link2 size={16} /> Add URL
      </button>
    </div>
  );
}
