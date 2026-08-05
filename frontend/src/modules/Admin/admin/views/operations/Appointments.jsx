import React, { useState, useEffect, useRef } from 'react';
import { Search, Download, Calendar, MoreVertical, CheckCircle, XCircle, RefreshCw, AlertTriangle, Video, Home, Hospital, FileText, Clock, Eye } from 'lucide-react';
import { fetchAdminAppointments } from '../../../../../services/admin';

export function Appointments() {
  const [search, setSearch] = useState('');
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const actionMenuRef = useRef(null);

  const stats = [
    { title: 'Total Today', value: '94', color: 'text-gray-900' },
    { title: 'Clinic Visits', value: '41', color: 'text-blue-600' },
    { title: 'Home Visits', value: '18', color: 'text-emerald-600' },
    { title: 'Video Calls', value: '28', color: 'text-purple-600' },
    { title: 'Emergency', value: '7', color: 'text-red-600' }
  ];

  const initialAppointments = [
    {
      id: 'APT-2241',
      petName: 'Buddy (Labrador)',
      ownerName: 'Rahul',
      city: 'Bangalore',
      doctorName: 'Dr. Priya Das',
      doctorRating: '4.8',
      specialization: 'General Vet',
      clinicName: 'PetCare Clinic Blr',
      type: 'Clinic Visit',
      date: '29 May 2025',
      time: '10:30 AM',
      duration: '30 min',
      issue: 'Skin rash, itching',
      prescription: 'Uploaded',
      fee: '500',
      commission: '60',
      emergencySurcharge: 0,
      status: 'Completed'
    },
    {
      id: 'APT-2240',
      petName: 'Milo (Persian)',
      ownerName: 'Priya',
      city: 'Mumbai',
      doctorName: 'Dr. Rohan Shah',
      doctorRating: '4.6',
      specialization: 'Nutritionist',
      clinicName: '—',
      type: 'Video Call',
      date: '29 May 2025',
      time: '11:00 AM',
      duration: '20 min',
      issue: 'Weight loss, lethargy',
      prescription: 'Pending',
      fee: '400',
      commission: '48',
      emergencySurcharge: 0,
      status: 'Ongoing'
    },
    {
      id: 'APT-2239',
      petName: 'Luna (Beagle)',
      ownerName: 'Amit',
      city: 'Delhi',
      doctorName: 'Dr. Anita Roy',
      doctorRating: '4.9',
      specialization: 'Surgery',
      clinicName: 'PawHealth Delhi',
      type: 'Clinic Visit',
      date: '29 May 2025',
      time: '12:00 PM',
      duration: '60 min',
      issue: 'Post-surgery checkup',
      prescription: 'Uploaded',
      fee: '800',
      commission: '96',
      emergencySurcharge: 0,
      status: 'Scheduled'
    },
    {
      id: 'APT-2238',
      petName: 'Bruno (Pug)',
      ownerName: 'Vijay',
      city: 'Mumbai',
      doctorName: 'Dr. Kavya Nair',
      doctorRating: '4.7',
      specialization: 'Emergency',
      clinicName: 'PetMed Mumbai',
      type: 'Emergency',
      date: '29 May 2025',
      time: '9:15 AM',
      duration: 'Immediate',
      issue: 'Difficulty breathing',
      prescription: 'Uploaded',
      fee: '600',
      commission: '108',
      emergencySurcharge: 300,
      status: 'Completed'
    },
    {
      id: 'APT-2237',
      petName: 'Tiger (GSD)',
      ownerName: 'Sneha',
      city: 'Chennai',
      doctorName: 'Dr. Suresh',
      doctorRating: '4.3',
      specialization: 'General Vet',
      clinicName: 'VetPlus Chennai',
      type: 'Home Visit',
      date: '29 May 2025',
      time: '2:00 PM',
      duration: '45 min',
      issue: 'Vaccination due',
      prescription: 'Pending',
      fee: '350',
      commission: '60',
      emergencySurcharge: 0,
      homeSurcharge: 150,
      status: 'Scheduled'
    }
  ];

  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    fetchAdminAppointments().then(setAppointments).catch((err) => console.error('Failed to load appointments', err));
  }, []);
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setActionMenuOpen(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getTypePill = (type) => {
    switch(type) {
      case 'Clinic Visit': return { style: 'bg-blue-100 text-blue-700', icon: <Hospital size={12} /> };
      case 'Home Visit': return { style: 'bg-emerald-100 text-emerald-700', icon: <Home size={12} /> };
      case 'Video Call': return { style: 'bg-purple-100 text-purple-700', icon: <Video size={12} /> };
      case 'Emergency': return { style: 'bg-red-100 text-red-700', icon: <AlertTriangle size={12} /> };
      default: return { style: 'bg-gray-100 text-gray-700', icon: null };
    }
  };

  const getStatusPill = (status) => {
    switch(status) {
      case 'Scheduled': return 'bg-blue-100 text-blue-700';
      case 'Ongoing': return 'bg-teal-100 text-teal-700';
      case 'Completed': return 'bg-emerald-100 text-emerald-700';
      case 'Cancelled': return 'bg-red-100 text-red-700';
      case 'No-Show': return 'bg-gray-200 text-gray-700';
      case 'Rescheduled': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleUpdateStatus = () => {
    if (!newStatus) return;
    setAppointments(appointments.map(a => a.id === selectedAppt.id ? { ...a, status: newStatus } : a));
    setSelectedAppt({ ...selectedAppt, status: newStatus });
    alert(`Status updated to ${newStatus}`);
  };

  const handleActionClick = (e, apptId) => {
    e.stopPropagation();
    setActionMenuOpen(actionMenuOpen === apptId ? null : apptId);
  };

  const handleCancelAppt = (apptId) => {
    const confirmed = window.confirm("Are you sure you want to cancel this appointment?");
    if (confirmed) {
      setAppointments(appointments.map(a => a.id === apptId ? { ...a, status: 'Cancelled' } : a));
    }
    setActionMenuOpen(null);
  };

  const filteredAppointments = appointments.filter(a => 
    a.id.toLowerCase().includes(search.toLowerCase()) || 
    a.petName.toLowerCase().includes(search.toLowerCase()) ||
    a.doctorName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto relative min-h-screen pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Appointments</h1>
          <p className="text-[13px] text-gray-500 mt-1 font-medium">All veterinary appointments — clinic, home, video, emergency</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button onClick={() => alert("Downloading CSV...")} className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 text-[13px] font-bold rounded-xl hover:bg-gray-50 transition shadow-sm">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={() => alert("Action triggered: View Calendar")} className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 text-[13px] font-bold rounded-xl hover:bg-gray-50 transition shadow-sm">
            <Calendar size={14} /> View Calendar
          </button>
        </div>
      </div>

      {/* Emergency Banner */}
      <div className="mb-6 bg-red-50 border border-red-200 p-4 sm:p-5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3 text-red-700">
          <div className="relative mt-0.5 sm:mt-0">
            <AlertTriangle size={20} />
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
          </div>
          <span className="text-[13px] sm:text-sm font-bold tracking-wider leading-snug">7 EMERGENCY APPOINTMENTS ACTIVE RIGHT NOW</span>
        </div>
        <button onClick={() => alert("Action triggered: View Emergency Cases →")} className="text-[13px] font-bold text-red-700 hover:text-red-800 transition flex items-center gap-1 ml-8 sm:ml-0 bg-red-100/50 px-3 py-1.5 rounded-lg border border-red-200/50">
          View Emergency Cases <span className="text-lg">→</span>
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {stats.map((s, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">{s.title}</h3>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[100%] sm:min-w-[200px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Appointment ID, patient (pet), doctor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-[13px] font-medium focus:outline-none focus:border-[#66B4B1] focus:ring-1 focus:ring-[#66B4B1] transition"
          />
        </div>
        <select className="flex-1 min-w-[130px] pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-[13px] font-bold text-gray-700 bg-white focus:outline-none text-ellipsis overflow-hidden whitespace-nowrap">
          <option>Type: All</option>
          <option>Clinic Visit</option>
          <option>Home Visit</option>
          <option>Video Call</option>
          <option>Emergency</option>
        </select>
        <select className="flex-1 min-w-[130px] pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-[13px] font-bold text-gray-700 bg-white focus:outline-none text-ellipsis overflow-hidden whitespace-nowrap">
          <option>Doctor: All</option>
        </select>
        <select className="flex-1 min-w-[130px] pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-[13px] font-bold text-gray-700 bg-white focus:outline-none text-ellipsis overflow-hidden whitespace-nowrap">
          <option>Status: All</option>
          <option>Scheduled</option>
          <option>Ongoing</option>
          <option>Completed</option>
          <option>Cancelled</option>
        </select>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-visible">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse min-w-[800px] whitespace-nowrap">
            <thead>
              <tr className="bg-[#FAF7F2] border-b border-gray-200">
                <th className="px-4 py-3 w-10 text-center"><input type="checkbox" className="rounded border-gray-300" /></th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Appt ID</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Pet & Owner</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Doctor</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Clinic</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Issue</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Prescription</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Fee</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAppointments.map((a) => {
                const typeInfo = getTypePill(a.type);
                return (
                  <tr key={a.id} className="hover:bg-[#FAF7F2] transition group cursor-pointer" onClick={() => setSelectedAppt(a)}>
                    <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}><input type="checkbox" className="rounded border-gray-300" /></td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-[13px] font-bold text-[#66B4B1] hover:underline">{a.id}</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <p className="text-[13px] font-bold text-gray-900">{a.petName}</p>
                      <p className="text-[11px] font-medium text-gray-500">{a.ownerName} • {a.city}</p>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <p className="text-[13px] font-bold text-gray-900">{a.doctorName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-bold">{a.specialization}</span>
                        <span className="text-[11px] font-bold text-amber-500">★ {a.doctorRating}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <p className="text-[13px] font-bold text-gray-900">{a.clinicName}</p>
                      {a.clinicName !== '—' && <p className="text-[11px] font-medium text-gray-500">{a.city}</p>}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${typeInfo.style}`}>
                        {a.type === 'Emergency' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>}
                        {typeInfo.icon} {a.type}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <p className="text-[13px] font-bold text-gray-900">{a.date}</p>
                      <p className="text-[13px] font-bold text-[#66B4B1]">{a.time}</p>
                      <p className="text-[11px] font-medium text-gray-500">{a.duration}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-[13px] font-medium text-gray-900 w-32 truncate" title={a.issue}>{a.issue}</p>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {a.prescription === 'Uploaded' ? (
                        <span className="text-[11px] font-bold text-[#66B4B1] flex items-center gap-1 hover:underline cursor-pointer">
                          <FileText size={12} /> Uploaded
                        </span>
                      ) : a.prescription === 'Pending' ? (
                        <span className="text-[11px] font-bold text-amber-500 flex items-center gap-1">
                          <Clock size={12} /> Pending
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <p className="text-[16px] font-bold text-gray-900">₹{a.fee}</p>
                      {a.emergencySurcharge > 0 && <p className="text-[11px] font-bold text-red-500">+₹{a.emergencySurcharge} emerg</p>}
                      {a.homeSurcharge > 0 && <p className="text-[11px] font-bold text-blue-500">+₹{a.homeSurcharge} home</p>}
                      <p className="text-[11px] font-bold text-[#66B4B1]">comm ₹{a.commission}</p>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${getStatusPill(a.status)}`}>
                        {a.status === 'Ongoing' && <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>}
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right relative">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={(e) => { e.stopPropagation(); setSelectedAppt(a); }} className="px-3 py-1.5 border border-[#66B4B1] text-[#66B4B1] rounded-lg text-[11px] font-bold hover:bg-[#FAF7F2] transition">
                          View
                        </button>
                        <button onClick={(e) => handleActionClick(e, a.id)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition">
                          <MoreVertical size={16} />
                        </button>
                      </div>
                      
                      {/* Action Menu */}
                      {actionMenuOpen === a.id && (
                        <div ref={actionMenuRef} className="absolute right-8 top-10 bg-white border border-gray-200 rounded-lg shadow-lg w-40 z-20 overflow-hidden text-left py-1">
                          <button onClick={() => { setSelectedAppt(a); setActionMenuOpen(null); }} className="w-full text-left px-4 py-2 text-[13px] font-bold text-gray-700 hover:bg-gray-50 hover:text-[#66B4B1] transition flex items-center gap-2">
                            <Eye size={14} /> View Details
                          </button>
                          <button onClick={() => { 
                              alert('Contacting Clinic...');
                              setActionMenuOpen(null);
                            }} 
                            className="w-full text-left px-4 py-2 text-[13px] font-bold text-gray-700 hover:bg-gray-50 hover:text-[#66B4B1] transition flex items-center gap-2">
                            <Hospital size={14} /> Contact Clinic
                          </button>
                          <button onClick={() => handleCancelAppt(a.id)} 
                            className="w-full text-left px-4 py-2 text-[13px] font-bold text-red-600 hover:bg-red-50 transition flex items-center gap-2">
                            <XCircle size={14} /> Cancel Appt
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-200 flex items-center justify-between bg-gray-50/50">
          <p className="text-[13px] font-bold text-gray-500">Showing {filteredAppointments.length > 0 ? 1 : 0}-{Math.min(5, filteredAppointments.length)} of {filteredAppointments.length} appointments</p>
          <div className="flex items-center gap-2">
            <button onClick={() => alert("Action triggered: Previous")} className="px-3 py-1.5 border border-gray-200 bg-white rounded-lg text-[13px] font-bold text-gray-400 cursor-not-allowed">Previous</button>
            <button onClick={() => alert("Action triggered: Next")} className="px-3 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 rounded-lg text-[13px] font-bold text-gray-700 transition">Next</button>
          </div>
        </div>
      </div>

      {/* Side Drawer */}
      {selectedAppt && (
        <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/40 backdrop-blur-sm transition-all duration-300">
          <div className="absolute inset-0" onClick={() => setSelectedAppt(null)} />
          <div className="relative w-full max-w-[600px] bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-slide-in-right">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">{selectedAppt.id}</h3>
                <p className="text-[13px] font-bold text-gray-500 mt-1">{selectedAppt.date} • {selectedAppt.type}</p>
              </div>
              <button onClick={() => setSelectedAppt(null)} className="p-2 rounded-xl text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition">
                <XCircle size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAF7F2]">
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
                 <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">Consultation Summary</h4>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                     <p className="text-[10px] text-gray-400 font-bold uppercase">Patient</p>
                     <p className="text-[13px] font-bold text-gray-900">{selectedAppt.petName}</p>
                     <p className="text-[11px] font-medium text-gray-500">Owner: {selectedAppt.ownerName}</p>
                   </div>
                   <div>
                     <p className="text-[10px] text-gray-400 font-bold uppercase">Doctor</p>
                     <p className="text-[13px] font-bold text-gray-900">{selectedAppt.doctorName}</p>
                     <p className="text-[11px] font-medium text-gray-500">{selectedAppt.specialization}</p>
                   </div>
                 </div>
                 <div className="pt-3 border-t border-gray-100">
                   <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Chief Complaint</p>
                   <p className="text-[13px] font-medium text-gray-800">{selectedAppt.issue}</p>
                 </div>
                 <div className="pt-3 border-t border-gray-100 flex justify-between">
                    <span className="text-sm font-black text-gray-900">Total Fee</span>
                    <span className="text-lg font-black text-[#66B4B1]">₹{selectedAppt.fee}</span>
                 </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Status Management</h4>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <select 
                    className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-[13px] font-bold text-gray-900 focus:outline-none focus:border-[#66B4B1] focus:ring-1 focus:ring-[#66B4B1]"
                    value={newStatus || selectedAppt.status}
                    onChange={(e) => setNewStatus(e.target.value)}
                  >
                    <option value={selectedAppt.status}>{selectedAppt.status} (Current)</option>
                    {['Scheduled', 'Ongoing', 'Completed', 'Cancelled', 'No-Show', 'Rescheduled'].map(opt => (
                       opt !== selectedAppt.status && <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <button onClick={handleUpdateStatus} className="px-6 py-2.5 bg-[#66B4B1] hover:bg-[#66B4B1] text-white rounded-xl text-[13px] font-bold shadow-sm transition">
                    Update Status
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 bg-white flex gap-3 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.03)] z-10 relative">
               <button onClick={() => alert("Rescheduling...")} className="flex-1 py-3 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-bold shadow-sm transition">
                 Reschedule
               </button>
               <button onClick={() => alert("Opening full record...")} className="flex-1 py-3 border border-[#66B4B1] bg-[#66B4B1] hover:bg-[#66B4B1] text-white rounded-xl text-sm font-bold shadow-sm transition">
                 View Full Record
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
