import React, { useState } from 'react';
import { ArrowLeft, User, Calendar, Clock, MapPin, CheckCircle, Video, FileText, AlertTriangle } from 'lucide-react';
import { useVendor } from '../context/ClinicVendorContext';

export function AppointmentDetailView({ appointment, onNavigate }) {
  const { updateDoctorAppointmentStatus, addDoctorConsultationNotes } = useVendor();
  const [notes, setNotes] = useState('');
  const [showNotesForm, setShowNotesForm] = useState(false);

  if (!appointment) return null;

  const handleConfirm = () => {
    updateDoctorAppointmentStatus(appointment.id, 'Confirmed');
    onNavigate('appointments_list');
  };

  const handleComplete = () => {
    if (!notes.trim()) {
      alert("Please add consultation notes before completing.");
      return;
    }
    addDoctorConsultationNotes(appointment.id, notes);
    onNavigate('appointments_list');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => onNavigate('appointments_list')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold text-sm transition"
        >
          <ArrowLeft size={16} /> Back to Appointments
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">ID: {appointment.id}</span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
            appointment.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-700' :
            appointment.status === 'Completed' ? 'bg-blue-100 text-blue-700' :
            'bg-amber-100 text-amber-700'
          }`}>
            {appointment.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Patient & Owner */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Patient Information</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex gap-4">
                <div className="w-20 h-20 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-3xl shrink-0">
                  {appointment.petName.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{appointment.petName}</h2>
                  <p className="text-sm font-medium text-gray-500">{appointment.species} • {appointment.breed}</p>
                  <button className="mt-2 text-xs font-bold text-[#F87B68] hover:underline">View Full Medical Record</button>
                </div>
              </div>
              <div className="space-y-3 border-l border-gray-100 pl-8">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Owner Details</h4>
                <div>
                  <p className="text-sm font-bold text-gray-900">{appointment.owner}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><User size={12}/> +91-98765-43210</p>
                </div>
                <div className="flex gap-2 mt-2">
                  <button className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-xs font-bold hover:bg-gray-200">Call</button>
                  <button className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-xs font-bold hover:bg-gray-200">Message</button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Appointment Details */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Consultation Details</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Date</p>
                  <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5"><Calendar size={14} className="text-[#F87B68]"/> {appointment.date}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Time</p>
                  <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5"><Clock size={14} className="text-[#F87B68]"/> {appointment.time}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Type</p>
                  <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    {appointment.type === 'Video Consultation' ? <Video size={14} className="text-slate-500"/> : <MapPin size={14} className="text-blue-500"/>}
                    {appointment.type}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Fee</p>
                  <p className="text-sm font-bold text-gray-900 text-emerald-600">₹{appointment.fee} (Paid)</p>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                <h4 className="text-xs font-bold text-gray-800 uppercase mb-2">Chief Complaint / Issue</h4>
                <p className="text-sm text-gray-700 leading-relaxed">{appointment.issue}</p>
              </div>
            </div>
          </div>

          {/* Consultation Notes Form */}
          {(appointment.status === 'Confirmed' || appointment.status === 'Completed') && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Consultation Notes & Prescription</h3>
              </div>
              <div className="p-6 space-y-4">
                {appointment.status === 'Completed' ? (
                  <div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{appointment.notes}</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2">Diagnosis & Treatment Plan</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#F87B68] focus:ring-1 focus:ring-[#F87B68]"
                        rows="4"
                        placeholder="Enter your diagnosis, symptoms observed, and treatment prescribed..."
                      ></textarea>
                    </div>
                    <div className="flex gap-4">
                      <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-200 transition flex items-center gap-2">
                        <FileText size={16} /> Generate Prescription PDF
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Action Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm sticky top-24">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4">Required Actions</h3>
            
            {appointment.status === 'Pending' && (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3 mb-4">
                  <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                  <p className="text-xs text-amber-800 font-medium">This appointment is waiting for your confirmation. The time slot is reserved.</p>
                </div>
                <button onClick={handleConfirm} className="w-full py-2.5 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-900 transition shadow-sm">
                  Confirm Appointment
                </button>
                <button className="w-full py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 transition">
                  Suggest New Time
                </button>
                <button className="w-full py-2.5 bg-white border border-gray-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-50 transition">
                  Decline
                </button>
              </div>
            )}

            {appointment.status === 'Confirmed' && (
              <div className="space-y-3">
                {appointment.type === 'Video Consultation' ? (
                  <button 
                    onClick={() => onNavigate('video_call', appointment)}
                    className="w-full py-2.5 bg-slate-700 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition shadow-sm flex justify-center items-center gap-2"
                  >
                    <Video size={16} /> Join Video Call
                  </button>
                ) : (
                  <button className="w-full py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition shadow-sm flex justify-center items-center gap-2">
                    <CheckCircle size={16} /> Start Checkup
                  </button>
                )}
                <div className="h-px bg-gray-100 my-4" />
                <button onClick={handleComplete} className="w-full py-2.5 bg-gray-900 text-white rounded-lg text-sm font-bold hover:bg-gray-800 transition shadow-sm">
                  Mark as Complete
                </button>
              </div>
            )}

            {appointment.status === 'Completed' && (
              <div className="space-y-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-3 mb-4">
                  <CheckCircle className="text-emerald-500 shrink-0" size={16} />
                  <p className="text-xs text-emerald-800 font-bold">Consultation Completed</p>
                </div>
                <button className="w-full py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 transition flex justify-center items-center gap-2">
                  <Calendar size={16} /> Schedule Follow-up
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
