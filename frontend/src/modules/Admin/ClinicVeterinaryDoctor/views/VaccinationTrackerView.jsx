import React, { useState } from 'react';
import { Syringe, Search, Filter, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useVendor } from '../context/ClinicVendorContext';

export function VaccinationTrackerView({ onNavigate }) {
  const { vaccinations } = useVendor();
  const [activeTab, setActiveTab] = useState('upcoming');

  const getData = () => {
    if (activeTab === 'upcoming') return vaccinations?.upcoming || [];
    if (activeTab === 'missed') return vaccinations?.missed || [];
    return vaccinations?.completed || [];
  };

  const [sendingState, setSendingState] = useState({});

  const handleSendReminder = (id) => {
    if (sendingState[id]) return;
    setSendingState(prev => ({ ...prev, [id]: 'sending' }));
    setTimeout(() => {
      setSendingState(prev => ({ ...prev, [id]: 'sent' }));
    }, 600);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Syringe className="text-[#F87B68]" /> Vaccination Tracker
          </h2>
          <p className="text-xs text-gray-500 mt-1">Monitor schedules, send reminders, and track compliance.</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button onClick={() => setActiveTab('upcoming')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${activeTab === 'upcoming' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>Upcoming</button>
          <button onClick={() => setActiveTab('missed')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${activeTab === 'missed' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'}`}>Missed / Overdue</button>
          <button onClick={() => setActiveTab('completed')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${activeTab === 'completed' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}>Completed</button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input type="text" placeholder="Search by pet or owner..." className="pl-9 pr-4 py-2 w-full border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F87B68]" />
          </div>
          <button className="text-gray-600 text-sm font-bold flex items-center gap-2 border border-gray-200 px-3 py-2 rounded-lg bg-white hover:bg-gray-50">
            <Filter size={16} /> Filter
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                <th className="p-4 font-bold">Patient Details</th>
                <th className="p-4 font-bold">Vaccine Type</th>
                <th className="p-4 font-bold">Scheduled Date</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {getData().map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 transition">
                  <td className="p-4">
                    <p className="font-bold text-gray-900 text-sm">{row.petName}</p>
                    <p className="text-xs text-gray-500">{row.owner}</p>
                  </td>
                  <td className="p-4">
                    <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-xs font-bold border border-blue-100">{row.vaccine}</span>
                  </td>
                  <td className="p-4 text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Clock size={14} className="text-gray-400" /> {row.date}
                  </td>
                  <td className="p-4">
                    {row.status === 'Overdue' && <span className="flex items-center gap-1 text-xs font-bold text-red-600"><AlertCircle size={14} /> {row.status}</span>}
                    {row.status === 'Due Soon' && <span className="flex items-center gap-1 text-xs font-bold text-amber-600"><AlertCircle size={14} /> {row.status}</span>}
                    {row.status === 'Scheduled' && <span className="flex items-center gap-1 text-xs font-bold text-blue-600"><Clock size={14} /> {row.status}</span>}
                    {row.status === 'Completed' && <span className="flex items-center gap-1 text-xs font-bold text-emerald-600"><CheckCircle size={14} /> {row.status}</span>}
                  </td>
                  <td className="p-4 text-right">
                    {activeTab !== 'completed' && (
                      <button 
                        onClick={() => handleSendReminder(row.id)}
                        disabled={sendingState[row.id]}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition shadow-sm ${
                          sendingState[row.id] === 'sent' ? 'bg-emerald-100 text-emerald-700 cursor-default' :
                          sendingState[row.id] === 'sending' ? 'bg-orange-300 text-white cursor-not-allowed' :
                          'bg-slate-800 hover:bg-slate-900 text-white'
                        }`}
                      >
                        {sendingState[row.id] === 'sent' ? '✓ Sent' : sendingState[row.id] === 'sending' ? 'Sending...' : 'Send Reminder'}
                      </button>
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
