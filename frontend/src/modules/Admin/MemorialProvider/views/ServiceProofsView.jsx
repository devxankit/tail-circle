import React, { useState, useRef } from 'react';
import { useMemorialProvider } from '../context/MemorialProviderContext';
import { uploadVendorFile } from '../../../../services/vendor';
import {
  FileText, Upload, Image as ImageIcon, PlayCircle,
  CheckCircle, X, Download, Eye, Loader2
} from 'lucide-react';

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

  // We only care about requests that are In Progress or Completed, as they are eligible for proofs.
  const eligibleRequests = requests.filter(r => r.status === 'In Progress' || r.status === 'Completed');

  const getProofStatus = (req) => {
    if (req.status === 'Completed') return { label: 'Sent to Customer', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    return { label: 'Pending Upload', color: 'text-orange-700 bg-orange-50 border-orange-200' };
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
      alert('Could not upload one or more files.');
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
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Service Proofs</h2>
          <p className="text-sm font-semibold text-slate-500 mt-0.5">Upload photos/videos of completed burials or plantations to send to customers.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <th className="p-4 pl-6">Service Details</th>
                <th className="p-4">Customer & Pet</th>
                <th className="p-4">Date</th>
                <th className="p-4">Proof Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {eligibleRequests.map(req => {
                const proofStatus = getProofStatus(req);
                return (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-4 pl-6">
                      <p className="text-sm font-bold text-slate-900">{req.serviceType}</p>
                      <p className="text-[10px] font-semibold text-slate-500 mt-0.5">ID: {req.id}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-bold text-slate-700">{req.customerName}</p>
                      <p className="text-[10px] font-medium text-slate-400 mt-0.5">{req.petName}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-xs font-bold text-slate-700">{req.preferredDate}</p>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border rounded-lg ${proofStatus.color}`}>
                        {proofStatus.label}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        {req.status === 'In Progress' ? (
                          <button onClick={() => openUploadModal(req)} className="px-4 py-1.5 bg-slate-900 hover:bg-black text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition shadow-sm flex items-center gap-1.5 cursor-pointer">
                            <Upload size={12} /> Upload
                          </button>
                        ) : (
                          <>
                            <button onClick={() => openViewModal(req)} className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition cursor-pointer">
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => {
                                if (req.proof?.url) {
                                  const link = document.createElement('a');
                                  link.href = req.proof.url;
                                  link.target = '_blank';
                                  link.rel = 'noreferrer';
                                  link.download = `proof-${req.id}`;
                                  link.click();
                                } else {
                                  alert('No file attached to download.');
                                }
                              }}
                              className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition cursor-pointer"
                            >
                              <Download size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {eligibleRequests.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-10 text-center text-slate-500 text-sm font-semibold">
                    No services currently eligible for proof uploads.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showUploadModal && selectedReq && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900">Upload Completion Proof</h3>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">{selectedReq.id} • {selectedReq.serviceType}</p>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shadow-sm border border-slate-200 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
                <FileText size={18} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-blue-800 leading-relaxed">
                  Uploading proof (photos/videos) builds trust. This will be sent directly to the customer as a respectful confirmation of service completion.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div 
                  onClick={() => photoInputRef.current?.click()}
                  className="h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-slate-400 transition cursor-pointer relative overflow-hidden"
                >
                  <ImageIcon size={24} className="mb-2" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Add Photos</span>
                  <input type="file" multiple accept="image/*" className="hidden" ref={photoInputRef} onChange={handleFileUpload} />
                </div>
                <div 
                  onClick={() => videoInputRef.current?.click()}
                  className="h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-slate-400 transition cursor-pointer relative overflow-hidden"
                >
                  <PlayCircle size={24} className="mb-2" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Add Video</span>
                  <input type="file" accept="video/*" className="hidden" ref={videoInputRef} onChange={handleFileUpload} />
                </div>
              </div>

              {proofFormData.files.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                  {proofFormData.files.map((file, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-100">
                      {file.type === 'image' ? (
                        <img src={file.url} alt="Proof" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-200">
                          <PlayCircle size={24} className="text-slate-400" />
                        </div>
                      )}
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                        className="absolute top-1 right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 shadow-sm cursor-pointer z-10"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Completion Note to Customer</label>
                <textarea 
                  rows="3" 
                  value={proofFormData.note}
                  onChange={(e) => setProofFormData({...proofFormData, note: e.target.value})}
                  placeholder="e.g. Max has been respectfully laid to rest. We planted the Neem tree as requested." 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
                ></textarea>
              </div>

              <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-100 transition">
                <input type="checkbox" defaultChecked id="markCompleted" className="w-4 h-4 text-slate-900 rounded focus:ring-slate-900 border-slate-300" />
                <span className="text-xs font-bold text-slate-700">Mark service as Completed and send to customer</span>
              </label>

            </div>

            <div className="p-6 border-t border-slate-100 flex gap-3 bg-slate-50/50">
              <button onClick={() => setShowUploadModal(false)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition cursor-pointer">
                Cancel
              </button>
              <button
                disabled={!proofFormData.files.length || submitting}
                onClick={async () => {
                  setSubmitting(true);
                  try {
                    await addProof(selectedReq.id, { url: proofFormData.files[0].url, note: proofFormData.note });
                    setShowUploadModal(false);
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="flex-1 py-3 bg-slate-900 hover:bg-black disabled:opacity-40 text-white text-sm font-bold rounded-xl transition shadow-lg cursor-pointer flex justify-center items-center gap-2"
              >
                <Upload size={16}/> Upload & Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewReq && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900">Completion Proof</h3>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">{viewReq.id} • {viewReq.serviceType}</p>
              </div>
              <button onClick={() => setShowViewModal(false)} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shadow-sm border border-slate-200 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 space-y-5 custom-scrollbar max-h-[60vh] overflow-y-auto">
              {viewReq.proof?.url ? (
                <a href={viewReq.proof.url} target="_blank" rel="noreferrer" className="block relative h-52 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                  <img src={viewReq.proof.url} alt="Proof" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                </a>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
                  <ImageIcon size={32} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-sm font-bold text-slate-500">No media attached for this proof.</p>
                </div>
              )}

              {viewReq.proof && viewReq.proof.note && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Note to Customer</label>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-sm font-semibold text-slate-700 leading-relaxed">
                      {viewReq.proof.note}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-3 bg-slate-50/50">
              <button onClick={() => setShowViewModal(false)} className="w-full py-3 bg-slate-900 hover:bg-black text-white text-sm font-bold rounded-xl transition shadow-lg cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
