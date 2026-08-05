import React, { useState } from 'react';
import { FileText, Search, Filter, Upload, Download, Eye, FileDigit } from 'lucide-react';
import { useVendor } from '../context/ClinicVendorContext';

export function LabReportsView() {
  const { labReports } = useVendor();
  const [searchQuery, setSearchQuery] = useState('');

  const reports = labReports || [];

  const filtered = reports.filter(r => r.patient.toLowerCase().includes(searchQuery.toLowerCase()) || r.testType.toLowerCase().includes(searchQuery.toLowerCase()));

  const [processingState, setProcessingState] = useState({});
  const [isUploading, setIsUploading] = useState(false);

  const handleAction = (id, type) => {
    if (processingState[id]) return;
    setProcessingState(prev => ({ ...prev, [id]: type }));
    setTimeout(() => {
      setProcessingState(prev => ({ ...prev, [id]: null }));
    }, 1500);
  };

  const handleUpload = () => {
    if (isUploading) return;
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileDigit className="text-[#F87B68]" /> Lab Reports & Diagnostics
          </h2>
          <p className="text-xs text-gray-500 mt-1">Manage and review patient laboratory and test results.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input 
              type="text" 
              placeholder="Search reports..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F87B68]/50 focus:border-[#F87B68] w-64 transition"
            />
          </div>
          <button 
            onClick={handleUpload}
            disabled={isUploading}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition shadow-sm flex items-center gap-2 ${isUploading ? 'bg-slate-800/70 text-white cursor-wait' : 'bg-slate-800 text-white hover:bg-slate-900'}`}
          >
            <Upload size={16} /> {isUploading ? 'Uploading...' : 'Upload Result'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[11px] text-gray-500 uppercase tracking-wider font-bold">
                <th className="p-4">Report ID & Date</th>
                <th className="p-4">Patient Information</th>
                <th className="p-4">Test Type</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 transition">
                  <td className="p-4">
                    <p className="font-bold text-gray-900 text-sm">{row.id}</p>
                    <p className="text-xs text-gray-500">{row.date}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-bold text-gray-900 text-sm">{row.patient}</p>
                    <p className="text-xs text-gray-500">{row.owner}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-medium text-gray-800">{row.testType}</p>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${
                      row.status === 'Ready' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {row.status === 'Ready' ? (
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleAction(row.id, 'preview')}
                          disabled={processingState[row.id]}
                          className={`p-2 rounded-lg transition ${processingState[row.id] === 'preview' ? 'text-blue-400 bg-blue-50 cursor-wait' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'}`} 
                          title="Preview"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => handleAction(row.id, 'download')}
                          disabled={processingState[row.id]}
                          className={`p-2 rounded-lg transition ${processingState[row.id] === 'download' ? 'text-blue-400 bg-blue-50 cursor-wait' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'}`} 
                          title="Download"
                        >
                          <Download size={16} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 font-bold italic">Awaiting Lab</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
