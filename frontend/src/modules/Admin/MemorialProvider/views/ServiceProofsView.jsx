import React, { useState, useRef } from 'react';
import { useMemorialProvider } from '../context/MemorialProviderContext';
import { uploadVendorFile } from '../../../../services/vendor';
import {
  FileText, Upload, Image as ImageIcon, PlayCircle,
  CheckCircle, X, Download, Eye, Loader2
} from 'lucide-react';
import { BottomSheet, ListCard, StatusBadge, EmptyState, CardAction, PrimaryButton, textareaClass, labelClass, useVendorToast } from '../../vendor/mobile';

export function ServiceProofsView() {
  const { requests, addProof } = useMemorialProvider();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [proofFormData, setProofFormData] = useState({ note: '', files: [] });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const [showViewModal, setShowViewModal] = useState(false);
  const [viewReq, setViewReq] = useState(null);
  const { addToast } = useVendorToast();

  // We only care about requests that are In Progress or Completed, as they are eligible for proofs.
  const eligibleRequests = requests.filter(r => r.status === 'In Progress' || r.status === 'Completed');

  const getProofStatus = (req) => {
    if (req.status === 'Completed') return { label: 'Sent to Customer', tone: 'success' };
    return { label: 'Pending Upload', tone: 'warning' };
  };

  const openUploadModal = (req) => {
    setSelectedReq(req);
    setProofFormData({ note: '', files: [] });
    setShowUploadModal(true);
  };

  const openViewModal = (req) => {
    setViewReq(req);
    setShowViewModal(true);
  };

  const handleFileUpload = async (e) => {
    const picked = Array.from(e.target.files);
    e.target.value = null;
    if (!picked.length) return;
    setUploading(true);
    try {
      const uploaded = await Promise.all(picked.map(async (file) => ({
        url: await uploadVendorFile(file, 'memorial-proofs'),
        type: file.type.startsWith('video/') ? 'video' : 'image',
        name: file.name,
      })));
      setProofFormData(prev => ({ ...prev, files: [...prev.files, ...uploaded] }));
    } catch {
      addToast({ message: 'Could not upload one or more files.', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index) => {
    setProofFormData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-4">

      <div className="px-1">
        <h2 className="text-lg font-bold text-text-primary leading-tight">Service Proofs</h2>
        <p className="text-xs text-text-secondary mt-1">Upload photos/videos of completed burials or plantations to send to customers.</p>
      </div>

      {eligibleRequests.length === 0 ? (
        <EmptyState icon={FileText} text="No services currently eligible for proof uploads." />
      ) : (
        <div className="space-y-3">
          {eligibleRequests.map(req => {
            const proofStatus = getProofStatus(req);
            return (
              <ListCard
                key={req.id}
                title={req.serviceType}
                subtitle={`ID: ${req.id}`}
                badge={<StatusBadge label={proofStatus.label} tone={proofStatus.tone} />}
                meta={[
                  { label: 'Customer & Pet', value: <>{req.customerName}<span className="block text-[11px] font-medium text-text-secondary">{req.petName}</span></> },
                  { label: 'Date', value: req.preferredDate },
                ]}
                footer={req.status === 'In Progress' ? (
                  <CardAction tone="primary" icon={Upload} className="w-full" onClick={() => openUploadModal(req)}>Upload</CardAction>
                ) : (
                  <>
                    <CardAction icon={Eye} className="flex-1" onClick={() => openViewModal(req)}>View</CardAction>
                    <CardAction
                      icon={Download}
                      className="flex-1"
                      onClick={() => {
                        if (req.proof?.url) {
                          const link = document.createElement('a');
                          link.href = req.proof.url;
                          link.target = '_blank';
                          link.rel = 'noreferrer';
                          link.download = `proof-${req.id}`;
                          link.click();
                        } else {
                          addToast({ message: 'No file attached to download.', type: 'info' });
                        }
                      }}
                    >
                      Download
                    </CardAction>
                  </>
                )}
              />
            );
          })}
        </div>
      )}

      <BottomSheet
        open={showUploadModal && !!selectedReq}
        onClose={() => setShowUploadModal(false)}
        fullScreen
        title="Upload Completion Proof"
        subtitle={selectedReq ? `${selectedReq.id} • ${selectedReq.serviceType}` : undefined}
        footer={(
          <div className="flex gap-2">
            <PrimaryButton tone="soft" className="flex-none px-5" onClick={() => setShowUploadModal(false)}>Cancel</PrimaryButton>
            <PrimaryButton
              tone="dark"
              icon={Upload}
              disabled={!proofFormData.files.length || submitting}
              loading={submitting}
              onClick={async () => {
                setSubmitting(true);
                try {
                  await addProof(selectedReq.id, { url: proofFormData.files[0].url, note: proofFormData.note });
                  setShowUploadModal(false);
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              Upload & Send
            </PrimaryButton>
          </div>
        )}
      >
        <div className="space-y-5 pb-4">
          <div className="bg-accent-teal/10 border border-accent-teal/25 p-4 rounded-2xl flex items-start gap-3">
            <FileText size={18} className="text-[#4C8684] shrink-0 mt-0.5" />
            <p className="text-xs font-medium text-text-primary leading-relaxed">
              Uploading proof (photos/videos) builds trust. This will be sent directly to the customer as a respectful confirmation of service completion.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div
              onClick={() => photoInputRef.current?.click()}
              className="h-32 bg-bg-primary border-2 border-dashed border-accent-teal/50 rounded-2xl flex flex-col items-center justify-center text-accent-teal transition cursor-pointer relative overflow-hidden"
            >
              {uploading ? <Loader2 size={24} className="mb-2 animate-spin" /> : <ImageIcon size={24} className="mb-2" />}
              <span className="text-[11px] font-bold uppercase tracking-wider">Add Photos</span>
              <input type="file" multiple accept="image/*" className="hidden" ref={photoInputRef} onChange={handleFileUpload} />
            </div>
            <div
              onClick={() => videoInputRef.current?.click()}
              className="h-32 bg-bg-primary border-2 border-dashed border-accent-teal/50 rounded-2xl flex flex-col items-center justify-center text-accent-teal transition cursor-pointer relative overflow-hidden"
            >
              <PlayCircle size={24} className="mb-2" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Add Video</span>
              <input type="file" accept="video/*" className="hidden" ref={videoInputRef} onChange={handleFileUpload} />
            </div>
          </div>

          {proofFormData.files.length > 0 && (
            <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-5 px-5 pb-1">
              {proofFormData.files.map((file, idx) => (
                <div key={idx} className="relative w-24 h-24 rounded-2xl overflow-hidden shrink-0 border border-border-light bg-bg-primary">
                  {file.type === 'image' ? (
                    <img src={file.url} alt="Proof" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-bg-secondary">
                      <PlayCircle size={24} className="text-text-secondary" />
                    </div>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                    aria-label="Remove file"
                    className="absolute top-1.5 right-1.5 w-9 h-9 bg-white/95 rounded-full flex items-center justify-center text-error shadow-sm cursor-pointer z-10"
                  >
                    <X size={14} strokeWidth={3} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div>
            <label className={labelClass}>Completion Note to Customer</label>
            <textarea
              rows="3"
              value={proofFormData.note}
              onChange={(e) => setProofFormData({...proofFormData, note: e.target.value})}
              placeholder="e.g. Max has been respectfully laid to rest. We planted the Neem tree as requested."
              className={textareaClass}
            ></textarea>
          </div>

          <label className="flex items-center gap-3 p-3 min-h-[48px] bg-bg-primary border border-border-light rounded-2xl cursor-pointer transition">
            <input type="checkbox" defaultChecked id="markCompleted" className="w-5 h-5 accent-[#66B4B1] rounded" />
            <span className="text-xs font-bold text-text-primary">Mark service as Completed and send to customer</span>
          </label>
        </div>
      </BottomSheet>

      {/* View sheet */}
      <BottomSheet
        open={showViewModal && !!viewReq}
        onClose={() => setShowViewModal(false)}
        title="Completion Proof"
        subtitle={viewReq ? `${viewReq.id} • ${viewReq.serviceType}` : undefined}
        footer={(
          <PrimaryButton tone="dark" className="w-full" onClick={() => setShowViewModal(false)}>Close</PrimaryButton>
        )}
      >
        {viewReq && (
          <div className="space-y-4 pb-2">
            {viewReq.proof?.url ? (
              <a href={viewReq.proof.url} target="_blank" rel="noreferrer" className="block relative h-56 rounded-2xl overflow-hidden border border-border-light bg-bg-primary">
                <img src={viewReq.proof.url} alt="Proof" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
              </a>
            ) : (
              <div className="p-8 text-center bg-bg-primary rounded-2xl border border-border-light">
                <ImageIcon size={32} className="mx-auto text-text-disabled mb-3" />
                <p className="text-sm font-bold text-text-secondary">No media attached for this proof.</p>
              </div>
            )}

            {viewReq.proof && viewReq.proof.note && (
              <div>
                <label className={labelClass}>Note to Customer</label>
                <div className="p-4 bg-bg-primary rounded-2xl border border-border-light">
                  <p className="text-sm font-semibold text-text-primary leading-relaxed">
                    {viewReq.proof.note}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </BottomSheet>

    </div>
  );
}
