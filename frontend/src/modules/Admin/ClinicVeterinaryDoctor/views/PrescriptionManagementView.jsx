import React, { useState, useRef } from 'react';
import { Plus, Printer, Download, FileText, Calendar, Search, Pill, Trash2, Camera, Upload, Image as ImageIcon, Eye, X, Check, Loader2, Sparkles } from 'lucide-react';
import { useVendor } from '../context/ClinicVendorContext';
import { uploadVendorFile } from '../../../../services/vendor';

export function PrescriptionManagementView({ onNavigate }) {
  const { doctorPatients, prescriptions, addPrescription } = useVendor();
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
      alert('Please select a patient first.');
      return;
    }

    if (rxType === 'photo' && !photoUrl && !photoPreview) {
      alert('Please upload or click a photo of the prescription.');
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
      console.error('Failed to save prescription', err);
      alert('Failed to save prescription. Please try again.');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Pill className="text-[#F87B68]" size={20} /> Digital & Photo Prescription Pad
          </h2>
          <p className="text-xs text-gray-500">Create digital text prescriptions or upload photo of handwritten prescriptions.</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg self-stretch sm:self-auto">
          <button 
            onClick={() => setActiveTab('new')}
            className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-md transition ${activeTab === 'new' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            + New Prescription
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-md transition ${activeTab === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            History ({(prescriptions || []).length})
          </button>
        </div>
      </div>

      {activeTab === 'new' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Area */}
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-6">
            
            {/* Prescription Mode Selector Toggle */}
            <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200 flex gap-2">
              <button
                type="button"
                onClick={() => setRxType('digital')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                  rxType === 'digital'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText size={16} className={rxType === 'digital' ? 'text-[#F87B68]' : ''} />
                <span>Digital Form (Text)</span>
              </button>
              <button
                type="button"
                onClick={() => setRxType('photo')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                  rxType === 'photo'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Camera size={16} className={rxType === 'photo' ? 'text-indigo-600' : ''} />
                <span>Upload Photo / Camera</span>
              </button>
            </div>

            {/* Patient & Diagnosis Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider border-b pb-2">Patient Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Select Patient *</label>
                  <select 
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#F87B68]"
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
                  <label className="block text-xs font-bold text-gray-700 mb-1">Clinical Diagnosis {rxType === 'digital' ? '*' : '(Optional)'}</label>
                  <input 
                    type="text" 
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="e.g., Acute Gastroenteritis / Otitis Externa"
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#F87B68]"
                  />
                </div>
              </div>
            </div>

            {/* DIGITAL FORM MODE */}
            {rxType === 'digital' && (
              <div className="space-y-4">
                <div className="flex justify-between items-end border-b pb-2">
                  <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">Medication List</h3>
                  <button onClick={addMedicine} className="text-xs font-bold text-[#F87B68] hover:text-[#F87B68] flex items-center gap-1">
                    <Plus size={14} /> Add Medicine
                  </button>
                </div>
                
                <div className="space-y-3">
                  {medicines.map((med, index) => (
                    <div key={index} className="flex flex-wrap gap-2 items-end bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <div className="flex-1 min-w-[150px]">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase">Medicine Name</label>
                        <input type="text" value={med.name} onChange={(e) => updateMedicine(index, 'name', e.target.value)} className="w-full p-2 border rounded-md text-sm mt-1" placeholder="e.g. Amoxicillin" />
                      </div>
                      <div className="w-24">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase">Dosage</label>
                        <input type="text" value={med.dosage} onChange={(e) => updateMedicine(index, 'dosage', e.target.value)} className="w-full p-2 border rounded-md text-sm mt-1" placeholder="50mg" />
                      </div>
                      <div className="w-32">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase">Frequency</label>
                        <input type="text" value={med.frequency} onChange={(e) => updateMedicine(index, 'frequency', e.target.value)} className="w-full p-2 border rounded-md text-sm mt-1" placeholder="1-0-1 (BID)" />
                      </div>
                      <div className="w-24">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase">Duration</label>
                        <input type="text" value={med.duration} onChange={(e) => updateMedicine(index, 'duration', e.target.value)} className="w-full p-2 border rounded-md text-sm mt-1" placeholder="5 Days" />
                      </div>
                      <button onClick={() => removeMedicine(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-md mb-0.5" title="Remove medicine">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PHOTO UPLOAD / CAMERA MODE */}
            {rxType === 'photo' && (
              <div className="space-y-4">
                <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider border-b pb-2">Prescription Photo Upload</h3>
                
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

                {!(photoUrl || photoPreview) ? (
                  <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/40 rounded-2xl p-8 text-center space-y-4 hover:border-indigo-400 transition">
                    <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                      <Camera size={28} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">Click or Upload Prescription Photo</h4>
                      <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                        Snap a photo of the physical prescription sheet using your camera, or upload a scanned image file.
                      </p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-2"
                      >
                        <Camera size={16} /> Snap Photo (Camera)
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-2"
                      >
                        <Upload size={16} /> Choose File from Device
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-md group">
                    <img 
                      src={photoPreview || photoUrl} 
                      alt="Prescription preview" 
                      className="w-full h-64 object-contain bg-slate-900" 
                    />
                    
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white gap-2 font-bold text-xs">
                        <Loader2 className="animate-spin" size={18} /> Uploading photo...
                      </div>
                    )}

                    <div className="absolute top-3 right-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setLightboxImage(photoPreview || photoUrl)}
                        className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-xs transition"
                        title="View Full Resolution"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="p-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg backdrop-blur-xs transition"
                        title="Remove / Retake Photo"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="p-3 bg-slate-950 text-white flex items-center justify-between text-xs border-t border-slate-800">
                      <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                        <Check size={14} /> Photo Attached Successfully
                      </span>
                      <button 
                        type="button" 
                        onClick={() => cameraInputRef.current?.click()}
                        className="text-gray-300 hover:text-white font-medium underline text-[11px]"
                      >
                        Retake Photo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Notes & Follow up date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Doctor's Advice / Instructions</label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Rest, specific diet, precautions..."
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm h-24 focus:ring-2 focus:ring-[#F87B68]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Follow-up Date</label>
                <input 
                  type="date" 
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#F87B68]"
                />
              </div>
            </div>
          </div>

          {/* Preview / Action Area */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl shadow-sm p-6 flex flex-col h-full">
            <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider border-b pb-2 mb-4">
              Prescription Preview
            </h3>
            
            {rxType === 'photo' && (photoUrl || photoPreview) ? (
              <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
                <div className="p-3 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <Camera size={14} /> Photo Document
                  </span>
                  <button 
                    onClick={() => setLightboxImage(photoPreview || photoUrl)}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Eye size={12} /> Full Screen
                  </button>
                </div>
                <div className="flex-1 p-2 bg-slate-100 flex items-center justify-center overflow-hidden">
                  <img 
                    src={photoPreview || photoUrl} 
                    alt="Prescription preview" 
                    className="max-h-56 object-contain rounded border border-gray-200" 
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 bg-white border border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-center opacity-70">
                {rxType === 'photo' ? (
                  <>
                    <Camera size={48} className="text-indigo-300 mb-3" />
                    <p className="text-sm font-bold text-gray-500">Live Photo Preview</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-xs">Upload or snap a prescription picture to see preview here.</p>
                  </>
                ) : (
                  <>
                    <FileText size={48} className="text-gray-300 mb-3" />
                    <p className="text-sm font-bold text-gray-500">Live Digital Preview</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-xs">Fill out the form to generate prescription document.</p>
                  </>
                )}
              </div>
            )}

            <div className="mt-6 space-y-3">
              <button 
                onClick={handleSave} 
                disabled={isSaving || saveSuccess}
                className={`w-full font-bold py-2.5 rounded-lg text-sm transition shadow-sm ${
                  saveSuccess ? 'bg-emerald-500 text-white' : 
                  isSaving ? 'bg-slate-800/70 text-white cursor-not-allowed' : 
                  'bg-slate-800 hover:bg-slate-900 text-white'
                }`}
              >
                {saveSuccess ? '✓ Saved Successfully' : isSaving ? 'Saving...' : 'Save Prescription'}
              </button>
              <div className="flex gap-3">
                <button 
                  onClick={() => (photoUrl || photoPreview) && handlePrintPhoto(photoUrl || photoPreview)}
                  disabled={rxType === 'photo' && !(photoUrl || photoPreview)}
                  className="flex-1 bg-white border border-gray-300 text-gray-700 font-bold py-2 rounded-lg text-sm transition hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Printer size={16} /> Print
                </button>
                <a 
                  href={photoUrl || photoPreview || '#'} 
                  download="prescription.jpg"
                  target="_blank"
                  rel="noreferrer"
                  className={`flex-1 bg-white border border-gray-300 text-gray-700 font-bold py-2 rounded-lg text-sm transition hover:bg-gray-50 flex items-center justify-center gap-2 ${rxType === 'photo' && !(photoUrl || photoPreview) ? 'pointer-events-none opacity-50' : ''}`}
                >
                  <Download size={16} /> Image / PDF
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* HISTORY TAB */
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input type="text" placeholder="Search past prescriptions..." className="pl-9 pr-4 py-2 w-full border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F87B68]" />
            </div>
          </div>
          {(prescriptions || []).length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Pill size={32} className="mx-auto mb-3 text-gray-300" />
              <p className="font-bold">No prescription history found.</p>
              <p className="text-sm mt-1">Past prescriptions will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {prescriptions.map((rx) => (
                <div key={rx.id} className="p-4 flex items-start justify-between gap-4 hover:bg-gray-50/60 transition">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${rx.type === 'photo' || rx.prescriptionUrl ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-[#F87B68]'}`}>
                      {rx.type === 'photo' || rx.prescriptionUrl ? <Camera size={18} /> : <Pill size={18} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-gray-900">{rx.petName} <span className="text-gray-400 font-medium">· {rx.owner}</span></p>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${rx.type === 'photo' || rx.prescriptionUrl ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-800'}`}>
                          {rx.type === 'photo' || rx.prescriptionUrl ? '📷 Photo Rx' : '📝 Digital Rx'}
                        </span>
                      </div>
                      
                      <p className="text-xs text-gray-600 mt-0.5">{rx.diagnosis || 'General prescription'}</p>
                      
                      {rx.type === 'photo' || rx.prescriptionUrl ? (
                        <div className="mt-2 flex items-center gap-3">
                          <button
                            onClick={() => setLightboxImage(rx.prescriptionUrl)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition"
                          >
                            <Eye size={13} /> View Prescription Photo
                          </button>
                          <button
                            onClick={() => handlePrintPhoto(rx.prescriptionUrl)}
                            className="text-xs text-gray-500 hover:text-gray-800 font-medium flex items-center gap-1"
                          >
                            <Printer size={13} /> Print
                          </button>
                        </div>
                      ) : (
                        <p className="text-[11px] text-gray-400 mt-1">
                          {(rx.items || []).map(m => m.name).filter(Boolean).join(', ') || 'No medicines listed'}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <p className="text-[11px] text-gray-400 flex items-center gap-1 justify-end"><Calendar size={11} /> {rx.date}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${rx.status === 'completed' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'}`}>{rx.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LIGHTBOX MODAL FOR PHOTO PRESCRIPTION */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Camera size={16} className="text-indigo-400" /> Prescribed Photo Document
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrintPhoto(lightboxImage)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Printer size={14} /> Print
                </button>
                <a
                  href={lightboxImage}
                  download="prescription-photo.jpg"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Download size={14} /> Download Image
                </a>
                <button
                  onClick={() => setLightboxImage(null)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-gray-300 hover:text-white rounded-lg transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 flex items-center justify-center bg-slate-950 overflow-auto">
              <img 
                src={lightboxImage} 
                alt="Full prescription" 
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-lg border border-slate-800" 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
