import React, { useState } from 'react';
import { Search, Calendar, List, Clock, Video, Home, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useVendor } from '../context/ClinicVendorContext';

// ── Design tokens ──────────────────────────────────────────────────────────────
const statusBadge = {
  Confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  Completed: 'bg-slate-100 text-slate-600 border-slate-200',
  Pending:   'bg-amber-50 text-amber-700 border-amber-100',
};

const typeDot = {
  'Clinic Visit':       'bg-blue-400',
  'Video Consultation': 'bg-slate-400',
  'Home Visit':         'bg-teal-400',
  'Emergency':          'bg-red-400 animate-pulse',
};

const typeBar = {
  'Clinic Visit':       'bg-blue-400',
  'Video Consultation': 'bg-slate-400',
  'Home Visit':         'bg-teal-400',
  'Emergency':          'bg-red-400',
};

export function AppointmentListView({ onNavigate }) {
  const { doctorAppointments, updateDoctorAppointmentStatus } = useVendor();
  const [viewMode, setViewMode] = useState('list');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [processing, setProcessing] = useState({});

  const handleConfirm = (id) => {
    setProcessing(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      updateDoctorAppointmentStatus(id, 'Confirmed');
      setProcessing(prev => ({ ...prev, [id]: false }));
    }, 400);
  };

  const filteredAppointments = doctorAppointments.filter(apt => {
    if (statusFilter !== 'All' && apt.status !== statusFilter) return false;
    if (typeFilter !== 'All' && apt.type !== typeFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      if (!apt.petName?.toLowerCase().includes(q) &&
          !apt.owner?.toLowerCase().includes(q) &&
          !apt.issue?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const getTypeIcon = (type) => {
    const dot = typeDot[type] || 'bg-slate-300';
    return <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />;
  };

  const getStatusBadge = (status) => (
    <span className={`px-2 py-0.5 text-[10px] font-bold rounded border uppercase ${
      statusBadge[status] || 'bg-slate-50 text-slate-500 border-slate-200'
    }`}>{status}</span>
  );

  return (
    <div className="space-y-5">

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search patient, owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F87B68]/30 focus:border-[#F87B68] w-56 transition"
            />
          </div>
          {/* View toggle */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <List size={15} />
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'calendar' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Calendar size={15} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-[#F87B68] transition cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Completed">Completed</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-[#F87B68] transition cursor-pointer"
          >
            <option value="All">All Types</option>
            <option value="Clinic Visit">Clinic Visit</option>
            <option value="Video Consultation">Video Consult</option>
            <option value="Home Visit">Home Visit</option>
            <option value="Emergency">Emergency</option>
          </select>
        </div>
      </div>

      {/* ── List View ── */}
      {viewMode === 'list' ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date & Time</th>
                  <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Patient</th>
                  <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Issue</th>
                  <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredAppointments.map(apt => (
                  <tr key={apt.id} className="hover:bg-slate-50/60 transition group">
                    <td className="p-4 whitespace-nowrap">
                      <p className="text-sm font-bold text-slate-900">{apt.date}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{apt.time}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-bold text-slate-900">{apt.owner}'s {apt.petName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{apt.species} - {apt.breed}</p>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(apt.type)}
                        <span className="text-sm font-medium text-slate-700">{apt.type}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-slate-600 max-w-xs truncate" title={apt.issue}>{apt.issue}</p>
                    </td>
                    <td className="p-4 whitespace-nowrap">{getStatusBadge(apt.status)}</td>
                    <td className="p-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {apt.status === 'Pending' && (
                          <button
                            onClick={() => handleConfirm(apt.id)}
                            disabled={processing[apt.id]}
                            className={`p-1.5 rounded-lg transition cursor-pointer ${
                              processing[apt.id]
                                ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                            }`}
                            title="Confirm appointment"
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => onNavigate('appointment_detail', apt)}
                          className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-sm cursor-pointer"
                        >
                          View Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredAppointments.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-10 text-center text-slate-400 text-sm">
                      No appointments found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // ── Calendar View ──
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-4">
              <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden">
                <button className="px-2 py-1.5 hover:bg-slate-50 border-r border-slate-200 text-slate-500 cursor-pointer"><ChevronLeft size={17} /></button>
                <span className="px-4 py-1.5 text-sm font-bold text-slate-700">This Week</span>
                <button className="px-2 py-1.5 hover:bg-slate-50 border-l border-slate-200 text-slate-500 cursor-pointer"><ChevronRight size={17} /></button>
              </div>
              <button className="text-xs font-bold text-[#F87B68] hover:underline cursor-pointer">Today</button>
            </div>
            <div className="hidden lg:flex gap-4 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400" /> Clinic</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400" /> Video</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-teal-400" /> Home</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" /> Emergency</span>
            </div>
          </div>

          <div className="overflow-x-auto p-4 bg-slate-50/20">
            <div className="flex gap-4 min-w-[800px]">
              {Object.keys(filteredAppointments.reduce((acc, apt) => {
                if (!acc[apt.date]) acc[apt.date] = [];
                acc[apt.date].push(apt);
                return acc;
              }, {})).sort().map(date => {
                const dayApts = filteredAppointments.filter(a => a.date === date).sort((a, b) => a.time.localeCompare(b.time));
                return (
                  <div key={date} className="flex-1 min-w-[220px] bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-3 bg-slate-50 border-b border-slate-100 text-center">
                      <p className="text-sm font-bold text-slate-800">{date}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{dayApts.length} Appt{dayApts.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="p-2 space-y-2 max-h-[500px] overflow-y-auto">
                      {dayApts.map(apt => (
                        <div
                          key={apt.id}
                          onClick={() => onNavigate('appointment_detail', apt)}
                          className="p-3 border border-slate-100 bg-white rounded-xl cursor-pointer hover:shadow-md hover:border-slate-200 transition relative overflow-hidden group ml-1"
                        >
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${typeBar[apt.type] || 'bg-slate-300'}`} />
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-bold text-slate-900">{apt.time}</span>
                            {getStatusBadge(apt.status)}
                          </div>
                          <p className="text-sm font-bold text-slate-900 truncate">{apt.owner}'s {apt.petName}</p>
                          <p className="text-xs text-slate-500 truncate mt-1">{apt.issue}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {filteredAppointments.length === 0 && (
                <div className="w-full py-12 text-center text-slate-400 text-sm bg-white rounded-2xl border border-dashed border-slate-200">
                  No appointments match your filters.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
