import React, { useState } from 'react';
import { Search, Filter, Phone, Calendar, FileText, ChevronRight, User, X } from 'lucide-react';
import { useVendor } from '../context/ClinicVendorContext';

export function PatientRecordsView({ onNavigate }) {
  const { doctorPatients } = useVendor();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPatients = doctorPatients.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.owner.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const [bookingPatient, setBookingPatient] = useState(null);
  const [isBooking, setIsBooking] = useState(false);

  const handleBook = (e, patient) => {
    e.preventDefault();
    setBookingPatient(patient);
  };

  const confirmBooking = () => {
    setIsBooking(true);
    setTimeout(() => {
      setIsBooking(false);
      setBookingPatient(null);
      // In a real app, we'd add to context here
      alert(`Appointment successfully booked for ${bookingPatient.name}!`);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Patient Records</h2>
            <p className="text-xs text-gray-500">Total Patients: {doctorPatients.length} | New this month: 2</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input 
              type="text" 
              placeholder="Search by pet name, owner..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F87B68]/50 focus:border-[#F87B68] w-64 transition"
            />
          </div>
          <button className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-100 flex items-center gap-2 transition">
            <Filter size={16} /> Filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredPatients.map(patient => (
          <div key={patient.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition group">
            <div className="p-4 border-b border-gray-100 flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xl shrink-0 overflow-hidden border-2 border-white shadow-sm">
                {patient.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 truncate">{patient.name}</h3>
                    <p className="text-xs font-medium text-gray-500 truncate">{patient.breed}, {patient.age}, {patient.gender}</p>
                  </div>
                </div>
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-gray-600 flex items-center gap-1.5">
                    <span className="w-4 flex justify-center"><User size={12} className="text-gray-400" /></span>
                    <span className="truncate">{patient.owner}</span>
                  </p>
                  <p className="text-xs text-gray-600 flex items-center gap-1.5">
                    <span className="w-4 flex justify-center"><Phone size={12} className="text-gray-400" /></span>
                    {patient.phone}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50/50 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">Last Visit:</span>
                <span className="font-bold text-gray-800">{patient.lastVisit}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">Status:</span>
                <span className={`font-bold ${patient.status.includes('Healthy') ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {patient.status}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">Total Visits:</span>
                <span className="font-bold text-gray-800">{patient.visits}</span>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-100 flex gap-2">
              <button 
                onClick={() => onNavigate('patient_detail', null, patient)}
                className="flex-1 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition flex items-center justify-center gap-1.5"
              >
                <FileText size={14} /> View Record
              </button>
              <button 
                onClick={(e) => handleBook(e, patient)}
                className="flex-1 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900 transition flex items-center justify-center gap-1.5"
              >
                <Calendar size={14} /> Book Visit
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {filteredPatients.length === 0 && (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
          <p className="text-gray-500">No patients found matching your search.</p>
        </div>
      )}

      {/* Booking Modal */}
      {bookingPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Calendar size={18} className="text-[#F87B68]" /> Book Visit for {bookingPatient.name}
              </h3>
              <button 
                onClick={() => setBookingPatient(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
                disabled={isBooking}
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Select Date</label>
                <input type="date" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F87B68]" />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Select Time</label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F87B68]">
                  <option>10:00 AM</option>
                  <option>11:30 AM</option>
                  <option>02:00 PM</option>
                  <option>04:15 PM</option>
                  <option>05:30 PM</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Reason for Visit</label>
                <input type="text" placeholder="e.g., General Checkup, Vaccination..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F87B68]" />
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button 
                onClick={() => setBookingPatient(null)}
                disabled={isBooking}
                className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button 
                onClick={confirmBooking}
                disabled={isBooking}
                className={`px-6 py-2 text-sm font-bold text-white rounded-lg transition shadow-sm ${isBooking ? 'bg-slate-800/70 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-900'}`}
              >
                {isBooking ? 'Booking...' : 'Confirm Appointment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
