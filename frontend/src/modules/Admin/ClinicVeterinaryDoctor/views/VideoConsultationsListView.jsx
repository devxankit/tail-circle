import React, { useState } from 'react';
import { Video, Calendar, Clock, Mic, Camera, Users, ArrowRight, CheckCircle, FileText } from 'lucide-react';
import { useVendor } from '../context/ClinicVendorContext';

export function VideoConsultationsListView({ onNavigate }) {
  const { doctorAppointments } = useVendor();
  const [cameraChecked, setCameraChecked] = useState(false);

  const videoAppointments = doctorAppointments.filter(apt => apt.type === 'Video Consultation');
  const upcoming = videoAppointments.filter(apt => apt.status === 'Confirmed');
  const past = videoAppointments.filter(apt => apt.status === 'Completed');

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
            <Video className="text-slate-500" size={22} />
            Video Consultations Hub
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Manage your upcoming tele-health appointments and check your equipment setup.
          </p>
        </div>

        {/* Equipment Check */}
        <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-3 gap-4 items-center">
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => setCameraChecked(!cameraChecked)}
              className={`p-3 rounded-xl transition cursor-pointer ${
                cameraChecked ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-white border border-slate-200 text-slate-400 hover:text-slate-600'
              }`}
            >
              <Camera size={17} />
            </button>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Camera</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <button className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 transition">
              <Mic size={17} />
            </button>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Mic</span>
          </div>
          <div className="h-8 w-px bg-slate-200 mx-1" />
          <div className="text-xs font-bold text-slate-600">
            {cameraChecked ? (
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle size={13} /> Ready for Calls
              </span>
            ) : (
              <span className="text-slate-500">Test Equipment</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Upcoming Consultations */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Calendar size={14} className="text-slate-400" /> Upcoming Today
          </h3>

          {upcoming.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
              <Video className="mx-auto mb-2 text-slate-300" size={28} />
              <p className="text-slate-400 text-sm font-medium">No upcoming video consultations scheduled.</p>
            </div>
          ) : (
            upcoming.map(apt => (
              <div key={apt.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-3 rounded-xl text-slate-500">
                      <Clock size={19} />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-900 leading-tight">{apt.time}</h4>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5 uppercase tracking-wide">{apt.date}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg uppercase">
                    Confirmed
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl mb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{apt.owner}'s {apt.petName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{apt.species} – {apt.breed}</p>
                    </div>
                    <button
                      onClick={() => onNavigate('patient_detail', apt)}
                      className="text-xs font-bold text-slate-500 hover:text-[#F87B68] hover:underline flex items-center gap-1 transition"
                    >
                      <FileText size={12} /> View Records
                    </button>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Reported Issue</p>
                    <p className="text-sm text-slate-700">{apt.issue}</p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => onNavigate('video_call', apt)}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition flex items-center gap-2 shadow-sm text-sm"
                  >
                    Join Room <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Past Consultations */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Users size={14} className="text-slate-400" /> Past Consultations
          </h3>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2.5">
            {past.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No past records found.</p>
            ) : (
              past.map(apt => (
                <div key={apt.id} className="flex justify-between items-center p-3 border border-slate-100 bg-slate-50/50 rounded-xl hover:border-slate-200 transition cursor-pointer">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{apt.owner}'s {apt.petName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{apt.date} · {apt.time}</p>
                  </div>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-lg uppercase">Completed</span>
                </div>
              ))
            )}
            {past.length > 0 && (
              <button className="w-full text-center text-xs font-bold text-[#F87B68] hover:underline pt-1 transition">
                View All History
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
