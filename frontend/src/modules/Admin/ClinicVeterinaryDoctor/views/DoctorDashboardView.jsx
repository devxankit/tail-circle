import React from 'react';
import { Calendar, AlertTriangle, Video, IndianRupee, Users, Clock, ChevronRight, Activity } from 'lucide-react';
import { useVendor } from '../context/ClinicVendorContext';

// ── Design tokens (Minimalist SaaS) ─────────────────────────────────────────
const statusBadge = {
  Confirmed: 'bg-slate-100 text-slate-700',
  Completed: 'bg-slate-50 text-slate-500',
  Pending:   'bg-slate-800 text-white',
};

const typeBadge = {
  'Emergency':          'bg-red-50 text-red-600 border-red-100',
  'Video Consultation': 'bg-white text-slate-600 border-slate-200',
  'Home Visit':         'bg-white text-slate-600 border-slate-200',
  'Clinic Visit':       'bg-white text-slate-600 border-slate-200',
};

export function DoctorDashboardView({ onNavigate }) {
  const { doctorAppointments, doctorPatients } = useVendor();

  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const todayAppointments = doctorAppointments.filter(a => a.date === today);
  const pendingAppointments = todayAppointments.filter(a => a.status === 'Pending');
  const videoAppointments = todayAppointments.filter(a => a.type === 'Video Consultation');
  const emergencyRequests = todayAppointments.filter(a => a.type === 'Emergency' && a.status === 'Pending');
  const todayEarnings = todayAppointments
    .filter(a => a.status === 'Completed')
    .reduce((sum, a) => sum + (a.fee || 0), 0);

  return (
    <div className="space-y-6">

      {/* ── KPI CARDS (Minimal) ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">

        {/* Today's Appointments */}
        <div
          onClick={() => onNavigate('appointments_list')}
          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
              <Calendar className="text-slate-600" size={14} />
            </div>
            <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 transition" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Today's Appointments</p>
            <div className="flex items-end gap-2">
              <h3 className="text-2xl font-black text-slate-900 leading-none">{todayAppointments.length}</h3>
            </div>
          </div>
        </div>

        {/* Emergency Requests */}
        <div
          onClick={() => onNavigate('emergency')}
          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
              <AlertTriangle className={emergencyRequests.length > 0 ? "text-slate-800" : "text-slate-600"} size={14} />
            </div>
            <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 transition" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Emergency Requests</p>
            <div className="flex items-end gap-2">
              <h3 className="text-2xl font-black text-slate-900 leading-none">{emergencyRequests.length}</h3>
              {emergencyRequests.length > 0 && (
                <p className="text-[10px] font-bold text-slate-500 mb-0.5">Needs attention</p>
              )}
            </div>
          </div>
        </div>

        {/* Video Consultations */}
        <div
          onClick={() => onNavigate('video_consultations')}
          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
              <Video className="text-slate-600" size={14} />
            </div>
            <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 transition" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Video Consults</p>
            <div className="flex items-end gap-2">
              <h3 className="text-2xl font-black text-slate-900 leading-none">{videoAppointments.length}</h3>
            </div>
          </div>
        </div>

        {/* Today's Earnings */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
              <IndianRupee className="text-slate-600" size={14} />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Today's Earnings</p>
            <div className="flex items-end gap-2">
              <h3 className="text-2xl font-black text-slate-900 leading-none">₹{todayEarnings.toLocaleString('en-IN')}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT GRID ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

        {/* LEFT: Today's Appointments List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Today's Appointments</h2>
              <button
                onClick={() => onNavigate('appointments_list')}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-900 transition flex items-center gap-1 cursor-pointer"
              >
                View full schedule <ChevronRight size={14} />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {todayAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-4 px-6 py-5 hover:bg-slate-50 transition group"
                >
                  <div className="w-20 shrink-0">
                    <span className="text-sm font-bold text-slate-900">{apt.time}</span>
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-slate-900">
                        {apt.owner}'s {apt.petName} <span className="text-slate-400 font-medium text-xs">({apt.breed})</span>
                      </p>
                    </div>
                    <p className="text-xs text-slate-500">Issue: {apt.issue}</p>
                    
                    <div className="flex items-center gap-2 pt-1">
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${
                        statusBadge[apt.status] || 'bg-slate-100 text-slate-600'
                      }`}>
                        {apt.status}
                      </span>
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider ${
                        typeBadge[apt.type] || 'bg-white text-slate-600 border-slate-200'
                      }`}>
                        {apt.type}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-row sm:flex-col gap-2 shrink-0 mt-4 sm:mt-0">
                    {apt.status === 'Confirmed' && apt.type === 'Video Consultation' && (
                      <button
                        onClick={() => onNavigate('video_call', apt)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Video size={12} /> Join Call
                      </button>
                    )}
                    {apt.status === 'Confirmed' && apt.type !== 'Video Consultation' && (
                      <button
                        onClick={() => onNavigate('appointment_detail', apt)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                      >
                        Start Checkup
                      </button>
                    )}
                    <button
                      onClick={() => onNavigate('appointment_detail', apt)}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-sm cursor-pointer w-full text-center"
                    >
                      View Record
                    </button>
                  </div>
                </div>
              ))}
              {todayAppointments.length === 0 && (
                <div className="py-12 text-center text-slate-400 text-sm">
                  <Calendar className="mx-auto mb-3 opacity-20" size={32} />
                  No appointments scheduled for today.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Stats + Action Required */}
        <div className="space-y-6">

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Total Patients</p>
              <h4 className="text-2xl font-black text-slate-900">{doctorPatients.length}</h4>
              <button
                onClick={() => onNavigate('patients_list')}
                className="text-[10px] font-bold text-slate-500 hover:text-slate-900 mt-3 block transition cursor-pointer"
              >
                View Directory
              </button>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Queue</p>
              <h4 className="text-2xl font-black text-slate-900">{pendingAppointments.length}</h4>
              <button
                onClick={() => onNavigate('appointments_list')}
                className="text-[10px] font-bold text-slate-500 hover:text-slate-900 mt-3 block transition cursor-pointer"
              >
                Manage Queue
              </button>
            </div>
          </div>

          {/* Action Required Panel (Minimal) */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Action Required</h2>
              {pendingAppointments.length > 0 && (
                <span className="bg-slate-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {pendingAppointments.length}
                </span>
              )}
            </div>

            <div className="p-5 space-y-4">
              {pendingAppointments.map(apt => (
                <div key={apt.id} className="pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                      {apt.type === 'Emergency' && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                      {apt.type === 'Emergency' ? 'Emergency Request' : 'New Request'}
                    </p>
                    <span className="text-[10px] font-semibold text-slate-400">{apt.time}</span>
                  </div>
                  
                  <p className="text-sm font-bold text-slate-900 leading-snug">{apt.owner}'s {apt.petName}</p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">{apt.issue}</p>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => apt.type === 'Emergency' ? onNavigate('emergency') : onNavigate('appointment_detail', apt)}
                      className="flex-1 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                    >
                      {apt.type === 'Emergency' ? 'Review & Accept' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => onNavigate('schedule')}
                      className="flex-1 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm cursor-pointer"
                    >
                      Reschedule
                    </button>
                  </div>
                </div>
              ))}

              {pendingAppointments.length === 0 && (
                <div className="py-6 text-center text-slate-400">
                  <Activity className="mx-auto mb-3 opacity-20" size={24} />
                  <p className="text-xs font-semibold">No pending actions</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
