import React, { useState } from 'react';
import { Search, Filter, FileText, Download, Eye, Calendar as CalendarIcon, User, X, Plus, ChevronDown, AlertCircle, CheckCircle } from 'lucide-react';
import { useVendor } from '../context/ClinicVendorContext';

const TYPE_COLORS = {
  Emergency: 'bg-red-50 text-red-700 border-red-200',
  Surgery: 'bg-slate-100 text-slate-700 border-slate-200',
  'Video Consult': 'bg-blue-50 text-blue-700 border-blue-200',
  'Clinical Visit': 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export function MedicalRecordsView({ onNavigate }) {
  const { medicalRecords: records, addMedicalRecord } = useVendor();
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

  const handleDownload = (id) => {
    if (downloadingId) return;
    setDownloadingId(id);
    setTimeout(() => setDownloadingId(null), 1500);
  };

  const handleSaveRecord = async () => {
    if (!newRecord.petName || !newRecord.diagnosis) return;
    setIsSaving(true);
    try {
      await addMedicalRecord(newRecord);
      setShowAddModal(false);
      setAddSuccess(true);
      setNewRecord({ petName: '', owner: '', phone: '', type: 'Clinical Visit', diagnosis: '', treatment: '', weight: '', temp: '' });
      setTimeout(() => setAddSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save record', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileText className="text-[#F87B68]" /> Master Medical Records
          </h2>
          <p className="text-xs text-gray-500 mt-1">Access complete clinical histories, diagnoses, and past treatment plans.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search by pet name, diagnosis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F87B68]/50 focus:border-[#F87B68] w-56 transition"
            />
          </div>
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 focus:outline-none focus:border-[#F87B68] cursor-pointer"
            >
              <option value="All">All Types</option>
              <option>Clinical Visit</option>
              <option>Surgery</option>
              <option>Video Consult</option>
              <option>Emergency</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-900 transition flex items-center gap-2 shadow-sm"
          >
            <Plus size={16} /> Add Record
          </button>
        </div>
      </div>

      {/* Success Toast */}
      {addSuccess && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-3 text-sm font-bold shadow-sm animate-in fade-in slide-in-from-top-2">
          <CheckCircle size={18} /> Record added successfully!
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[11px] text-gray-500 uppercase tracking-wider font-bold">
                <th className="p-4">Record ID & Date</th>
                <th className="p-4">Patient Information</th>
                <th className="p-4">Encounter Type</th>
                <th className="p-4">Primary Diagnosis</th>
                <th className="p-4 text-right">Documents</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/70 transition cursor-pointer group" onClick={() => setViewRecord(row)}>
                  <td className="p-4">
                    <p className="font-bold text-gray-900 text-sm">{row.id}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><CalendarIcon size={12} /> {row.date}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-bold text-gray-900 text-sm">{row.petName}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><User size={12} /> {row.owner}</p>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${TYPE_COLORS[row.type] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                      {row.type}
                    </span>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-medium text-gray-800">{row.diagnosis}</p>
                  </td>
                  <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setViewRecord(row)}
                        className="p-2 text-gray-500 hover:text-[#F87B68] hover:bg-orange-50 rounded-lg transition border border-transparent hover:border-orange-100"
                        title="View Record"
                      >
                        <Eye size={16} />
                      </button>
                      {row.fileAvailable && (
                        <button
                          onClick={() => handleDownload(row.id)}
                          disabled={downloadingId === row.id}
                          className={`p-2 rounded-lg transition border border-transparent ${downloadingId === row.id ? 'text-blue-400 bg-blue-50 cursor-wait' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-100'}`}
                          title="Download PDF"
                        >
                          {downloadingId === row.id ? <span className="text-[10px] font-bold animate-pulse px-1">Wait...</span> : <Download size={16} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-12 text-center">
              <AlertCircle className="mx-auto text-gray-300 mb-3" size={32} />
              <p className="text-gray-500 text-sm">No medical records found matching your search.</p>
            </div>
          )}
        </div>
      </div>

      {/* View Record Modal */}
      {viewRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setViewRecord(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="font-black text-gray-900 text-base">{viewRecord.id} — {viewRecord.petName}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{viewRecord.date} · {viewRecord.doctor}</p>
              </div>
              <button onClick={() => setViewRecord(null)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Owner</p>
                  <p className="text-sm font-bold text-gray-800">{viewRecord.owner}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{viewRecord.phone}</p>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Encounter Type</p>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold border ${TYPE_COLORS[viewRecord.type] || ''}`}>{viewRecord.type}</span>
                </div>
                {viewRecord.weight && (
                  <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Weight</p>
                    <p className="text-sm font-bold text-gray-800">{viewRecord.weight}</p>
                  </div>
                )}
                {viewRecord.temp && (
                  <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Temperature</p>
                    <p className="text-sm font-bold text-gray-800">{viewRecord.temp}</p>
                  </div>
                )}
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Primary Diagnosis</p>
                <p className="text-sm font-bold text-gray-800">{viewRecord.diagnosis}</p>
              </div>
              {viewRecord.treatment && (
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Treatment Plan</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{viewRecord.treatment}</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              {viewRecord.fileAvailable && (
                <button
                  onClick={() => handleDownload(viewRecord.id)}
                  className="px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg transition flex items-center gap-2"
                >
                  <Download size={14} /> Download PDF
                </button>
              )}
              <button
                onClick={() => onNavigate('patient_detail', null, { name: viewRecord.petName, owner: viewRecord.owner })}
                className="px-4 py-2 text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition shadow-sm"
              >
                View Full Patient File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Record Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-black text-gray-900 flex items-center gap-2">
                <Plus size={18} className="text-[#F87B68]" /> New Medical Record
              </h3>
              <button onClick={() => setShowAddModal(false)} disabled={isSaving} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Pet Name *</label>
                <input value={newRecord.petName} onChange={e => setNewRecord(p => ({ ...p, petName: e.target.value }))} placeholder="e.g., Max" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F87B68]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Owner Name</label>
                <input value={newRecord.owner} onChange={e => setNewRecord(p => ({ ...p, owner: e.target.value }))} placeholder="e.g., Rahul Kumar" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F87B68]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Phone</label>
                <input value={newRecord.phone} onChange={e => setNewRecord(p => ({ ...p, phone: e.target.value }))} placeholder="+91-XXXXX-XXXXX" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F87B68]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Encounter Type</label>
                <select value={newRecord.type} onChange={e => setNewRecord(p => ({ ...p, type: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F87B68]">
                  <option>Clinical Visit</option>
                  <option>Surgery</option>
                  <option>Video Consult</option>
                  <option>Emergency</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Weight</label>
                <input value={newRecord.weight} onChange={e => setNewRecord(p => ({ ...p, weight: e.target.value }))} placeholder="e.g., 12 kg" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F87B68]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Temperature</label>
                <input value={newRecord.temp} onChange={e => setNewRecord(p => ({ ...p, temp: e.target.value }))} placeholder="e.g., 102°F" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F87B68]" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Primary Diagnosis *</label>
                <input value={newRecord.diagnosis} onChange={e => setNewRecord(p => ({ ...p, diagnosis: e.target.value }))} placeholder="e.g., Acute Gastroenteritis" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F87B68]" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Treatment Plan</label>
                <textarea value={newRecord.treatment} onChange={e => setNewRecord(p => ({ ...p, treatment: e.target.value }))} rows={3} placeholder="Describe the treatment given..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F87B68] resize-none" />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setShowAddModal(false)} disabled={isSaving} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-lg transition">Cancel</button>
              <button
                onClick={handleSaveRecord}
                disabled={isSaving || !newRecord.petName || !newRecord.diagnosis}
                className={`px-6 py-2 text-sm font-bold text-white rounded-lg transition shadow-sm ${isSaving || !newRecord.petName || !newRecord.diagnosis ? 'bg-slate-800/50 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-900'}`}
              >
                {isSaving ? 'Saving...' : 'Save Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
