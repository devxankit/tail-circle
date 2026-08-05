import React, { useState } from 'react';
import { Plus, Printer, Download, FileText, Calendar, Search, Pill, Trash2 } from 'lucide-react';
import { useVendor } from '../context/ClinicVendorContext';

export function PrescriptionManagementView({ onNavigate }) {
  const { doctorPatients, prescriptions, addPrescription } = useVendor();
  const [activeTab, setActiveTab] = useState('new');
  
  // New Prescription State
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [medicines, setMedicines] = useState([{ name: '', dosage: '', frequency: '', duration: '' }]);
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  const addMedicine = () => setMedicines([...medicines, { name: '', dosage: '', frequency: '', duration: '' }]);
  
  const updateMedicine = (index, field, value) => {
    const updated = [...medicines];
    updated[index][field] = value;
    setMedicines(updated);
  };
  
  const removeMedicine = (index) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await addPrescription({ patientId: selectedPatientId, diagnosis, medicines, notes, followUpDate });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      // Reset form
      setDiagnosis('');
      setMedicines([{ name: '', dosage: '', frequency: '', duration: '' }]);
      setNotes('');
    } catch (err) {
      console.error('Failed to save prescription', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Digital Prescription Pad</h2>
          <p className="text-xs text-gray-500">Create, manage, and export medical prescriptions.</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('new')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${activeTab === 'new' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            New Prescription
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${activeTab === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            History
          </button>
        </div>
      </div>

      {activeTab === 'new' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Area */}
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider border-b pb-2">Patient Details</h3>
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
                <label className="block text-xs font-bold text-gray-700 mb-1">Clinical Diagnosis *</label>
                <input 
                  type="text" 
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="e.g., Acute Gastroenteritis"
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#F87B68]"
                />
              </div>
            </div>

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
                    <button onClick={() => removeMedicine(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-md mb-0.5">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Doctor's Advice / Notes</label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Rest, specific diet..."
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
            <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider border-b pb-2 mb-4">Prescription Preview</h3>
            
            <div className="flex-1 bg-white border border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-center opacity-70">
              <FileText size={48} className="text-gray-300 mb-3" />
              <p className="text-sm font-bold text-gray-500">Live Preview</p>
              <p className="text-xs text-gray-400 mt-1">Fill out the form to generate prescription document.</p>
            </div>

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
                <button className="flex-1 bg-white border border-gray-300 text-gray-700 font-bold py-2 rounded-lg text-sm transition hover:bg-gray-50 flex items-center justify-center gap-2">
                  <Printer size={16} /> Print
                </button>
                <button className="flex-1 bg-white border border-gray-300 text-gray-700 font-bold py-2 rounded-lg text-sm transition hover:bg-gray-50 flex items-center justify-center gap-2">
                  <Download size={16} /> PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="p-4 border-b border-gray-100">
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
                    <div className="w-9 h-9 rounded-lg bg-orange-50 text-[#F87B68] flex items-center justify-center shrink-0">
                      <Pill size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900">{rx.petName} <span className="text-gray-400 font-medium">· {rx.owner}</span></p>
                      <p className="text-xs text-gray-600 mt-0.5">{rx.diagnosis || 'General prescription'}</p>
                      <p className="text-[11px] text-gray-400 mt-1">{(rx.items || []).map(m => m.name).filter(Boolean).join(', ') || 'No medicines listed'}</p>
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
    </div>
  );
}
