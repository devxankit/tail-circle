import React, { useState, useEffect, useRef } from 'react';
import { Search, Download, Calendar, MoreVertical, CheckCircle, XCircle, RefreshCw, Scissors, Home, PartyPopper, GraduationCap, Dog, Eye, MapPin } from 'lucide-react';
import { fetchAdminBookings } from '../../../../../services/admin';

export function Bookings() {
  const [search, setSearch] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const actionMenuRef = useRef(null);

  const stats = [
    { title: 'Total Bookings Today', value: '84', color: 'text-gray-900' },
    { title: 'Grooming', value: '31', color: 'text-blue-600' },
    { title: 'Day Care', value: '22', color: 'text-emerald-600' },
    { title: 'Events', value: '18', color: 'text-amber-600' },
    { title: 'Training', value: '13', color: 'text-purple-600' }
  ];

  const initialBookings = [
    {
      id: 'BKG-4421',
      customerName: 'Rahul',
      petInfo: 'Buddy (Labrador)',
      city: 'Mumbai',
      serviceType: 'Grooming',
      vendorName: 'PawSalon Mumbai',
      vendorRating: '4.8',
      date: '29 May 2025',
      slot: 'Morning',
      duration: '2 hours',
      addons: ['Bath', 'Nail', 'Ear'],
      amount: '850',
      commission: '102',
      paymentMethod: 'UPI',
      paymentStatus: 'Paid',
      status: 'Confirmed'
    },
    {
      id: 'BKG-4420',
      customerName: 'Priya',
      petInfo: 'Milo (Persian Cat)',
      city: 'Bangalore',
      serviceType: 'Day Care',
      vendorName: 'PetStay Bangalore',
      vendorRating: '4.9',
      date: '29–31 May',
      slot: 'Full Day',
      duration: '3 days',
      addons: ['AC', 'CCTV', 'Food'],
      amount: '2,400',
      commission: '288',
      paymentMethod: 'Card',
      paymentStatus: 'Paid',
      status: 'Confirmed'
    },
    {
      id: 'BKG-4419',
      customerName: 'Amit',
      petInfo: 'Luna (Beagle)',
      city: 'Delhi',
      serviceType: 'Event',
      vendorName: 'Pawsome Events',
      vendorRating: '4.7',
      date: '2 Jun 2025',
      slot: 'Afternoon',
      duration: '4 hours',
      addons: ['Cake', 'Decor', 'Photo'],
      amount: '4,500',
      commission: '540',
      paymentMethod: 'Wallet',
      paymentStatus: 'Paid',
      status: 'Pending'
    },
    {
      id: 'BKG-4418',
      customerName: 'Sneha',
      petInfo: 'Tiger (GSD)',
      city: 'Pune',
      serviceType: 'Training',
      vendorName: 'PawTrain Delhi',
      vendorRating: '4.6',
      date: '30 May 2025',
      slot: 'Morning',
      duration: '1.5 hours',
      addons: [],
      amount: '1,200',
      commission: '144',
      paymentMethod: 'UPI',
      paymentStatus: 'Paid',
      status: 'Confirmed'
    },
    {
      id: 'BKG-4417',
      customerName: 'Vijay',
      petInfo: 'Bruno (Pug)',
      city: 'Jaipur',
      serviceType: 'Grooming',
      vendorName: 'FurStudio Jaipur',
      vendorRating: '4.5',
      date: '28 May 2025',
      slot: 'Evening',
      duration: '3 hours',
      addons: ['Full Grooming', 'Spa'],
      amount: '1,100',
      commission: '132',
      paymentMethod: 'COD',
      paymentStatus: 'Pending',
      status: 'Completed'
    }
  ];

  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    fetchAdminBookings().then(setBookings).catch((err) => console.error('Failed to load bookings', err));
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

  const getServicePill = (type) => {
    switch(type) {
      case 'Grooming': return { style: 'bg-blue-100 text-blue-700', icon: <Scissors size={12} /> };
      case 'Day Care': return { style: 'bg-emerald-100 text-emerald-700', icon: <Home size={12} /> };
      case 'Event': return { style: 'bg-amber-100 text-amber-700', icon: <PartyPopper size={12} /> };
      case 'Training': return { style: 'bg-purple-100 text-purple-700', icon: <GraduationCap size={12} /> };
      case 'Walking': return { style: 'bg-teal-100 text-teal-700', icon: <Dog size={12} /> };
      default: return { style: 'bg-gray-100 text-gray-700', icon: null };
    }
  };

  const getStatusPill = (status) => {
    switch(status) {
      case 'Pending': return 'bg-amber-100 text-amber-700';
      case 'Confirmed': return 'bg-blue-100 text-blue-700';
      case 'Ongoing': return 'bg-teal-100 text-teal-700 relative'; // Requires a pulse dot
      case 'Completed': return 'bg-emerald-100 text-emerald-700';
      case 'Cancelled': return 'bg-red-100 text-red-700';
      case 'No-Show': return 'bg-gray-200 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPaymentPill = (method) => {
    switch(method) {
      case 'UPI': return 'bg-blue-50 text-blue-600 border border-blue-100';
      case 'Card': return 'bg-purple-50 text-purple-600 border border-purple-100';
      case 'Wallet': return 'bg-amber-50 text-amber-600 border border-amber-100';
      case 'COD': return 'bg-gray-50 text-gray-600 border border-gray-200';
      default: return 'bg-gray-50 text-gray-600 border border-gray-200';
    }
  };

  const handleUpdateStatus = () => {
    if (!newStatus) return;
    setBookings(bookings.map(b => b.id === selectedBooking.id ? { ...b, status: newStatus } : b));
    setSelectedBooking({ ...selectedBooking, status: newStatus });
    alert(`Status updated to ${newStatus}`);
  };

  const handleActionClick = (e, bookingId) => {
    e.stopPropagation();
    setActionMenuOpen(actionMenuOpen === bookingId ? null : bookingId);
  };

  const handleCancelBooking = (bookingId) => {
    const confirmed = window.confirm("Are you sure you want to cancel this booking?");
    if (confirmed) {
      setBookings(bookings.map(b => b.id === bookingId ? { ...b, status: 'Cancelled' } : b));
    }
    setActionMenuOpen(null);
  };

  const filteredBookings = bookings.filter(b => 
    b.id.toLowerCase().includes(search.toLowerCase()) || 
    b.customerName.toLowerCase().includes(search.toLowerCase()) ||
    b.vendorName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto relative min-h-screen pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Bookings</h1>
          <p className="text-[13px] text-gray-500 mt-1 font-medium">All service bookings — grooming, daycare, events, training</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button onClick={() => alert("Downloading CSV...")} className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 text-[13px] font-bold rounded-xl hover:bg-gray-50 transition shadow-sm">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={() => alert("Opening Date Picker...")} className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 text-[13px] font-bold rounded-xl hover:bg-gray-50 transition shadow-sm">
            <Calendar size={14} /> Date Range
          </button>
        </div>
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
            placeholder="Booking ID, customer, vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-[13px] font-medium focus:outline-none focus:border-[#66B4B1] focus:ring-1 focus:ring-[#66B4B1] transition"
          />
        </div>
        <select className="flex-1 min-w-[130px] pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-[13px] font-bold text-gray-700 bg-white focus:outline-none text-ellipsis overflow-hidden whitespace-nowrap">
          <option>Service: All</option>
          <option>Grooming</option>
          <option>Day Care</option>
          <option>Event</option>
          <option>Training</option>
        </select>
        <select className="flex-1 min-w-[130px] pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-[13px] font-bold text-gray-700 bg-white focus:outline-none text-ellipsis overflow-hidden whitespace-nowrap">
          <option>Status: All</option>
          <option>Pending</option>
          <option>Confirmed</option>
          <option>Completed</option>
          <option>Cancelled</option>
        </select>
        <select className="flex-1 min-w-[130px] pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-[13px] font-bold text-gray-700 bg-white focus:outline-none text-ellipsis overflow-hidden whitespace-nowrap">
          <option>Vendor: All</option>
        </select>
        <select className="flex-1 min-w-[130px] pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-[13px] font-bold text-gray-700 bg-white focus:outline-none text-ellipsis overflow-hidden whitespace-nowrap">
          <option>Slot: All</option>
          <option>Morning</option>
          <option>Afternoon</option>
          <option>Evening</option>
        </select>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-visible">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse min-w-[800px] whitespace-nowrap">
            <thead>
              <tr className="bg-[#FAF7F2] border-b border-gray-200">
                <th className="px-4 py-3 w-10 text-center"><input type="checkbox" className="rounded border-gray-300" /></th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Booking ID</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Customer & Pet</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Service Type</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Vendor</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Slot & Date</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Add-ons</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Amount</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredBookings.map((b) => {
                const serviceInfo = getServicePill(b.serviceType);
                return (
                  <tr key={b.id} className="hover:bg-[#FAF7F2] transition group cursor-pointer" onClick={() => setSelectedBooking(b)}>
                    <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}><input type="checkbox" className="rounded border-gray-300" /></td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-[13px] font-bold text-[#66B4B1] hover:underline">{b.id}</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <p className="text-[13px] font-bold text-gray-900">{b.customerName}</p>
                      <p className="text-[11px] font-medium text-gray-500">{b.petInfo} • {b.city}</p>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${serviceInfo.style}`}>
                        {serviceInfo.icon} {b.serviceType}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <p className="text-[13px] font-bold text-gray-900">{b.vendorName}</p>
                      <p className="text-[11px] font-bold text-amber-500">★ {b.vendorRating}</p>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <p className="text-[13px] font-bold text-gray-900">{b.date}</p>
                      <p className="text-[11px] font-medium text-gray-500">{b.slot} • {b.duration}</p>
                    </td>
                    <td className="px-4 py-4 w-48">
                      {b.addons.length > 0 ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          {b.addons.map((a, i) => (
                            <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold border border-gray-200">
                              {a}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] font-medium text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <p className="text-[16px] font-bold text-gray-900">₹{b.amount}</p>
                      <p className="text-[11px] font-bold text-[#66B4B1]">comm ₹{b.commission}</p>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getPaymentPill(b.paymentMethod)}`}>
                          {b.paymentMethod}
                        </span>
                        {b.paymentStatus === 'Paid' ? (
                          <CheckCircle size={12} className="text-[#66B4B1]" />
                        ) : b.paymentStatus === 'Pending' ? (
                          <RefreshCw size={12} className="text-amber-500" />
                        ) : (
                          <XCircle size={12} className="text-red-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${getStatusPill(b.status)}`}>
                        {b.status === 'Ongoing' && <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>}
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right relative">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={(e) => { e.stopPropagation(); setSelectedBooking(b); }} className="px-3 py-1.5 border border-[#66B4B1] text-[#66B4B1] rounded-lg text-[11px] font-bold hover:bg-[#FAF7F2] transition">
                          View
                        </button>
                        <button onClick={(e) => handleActionClick(e, b.id)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition">
                          <MoreVertical size={16} />
                        </button>
                      </div>
                      
                      {/* Action Menu */}
                      {actionMenuOpen === b.id && (
                        <div ref={actionMenuRef} className="absolute right-8 top-10 bg-white border border-gray-200 rounded-lg shadow-lg w-40 z-20 overflow-hidden text-left py-1">
                          <button onClick={() => { setSelectedBooking(b); setActionMenuOpen(null); }} className="w-full text-left px-4 py-2 text-[13px] font-bold text-gray-700 hover:bg-gray-50 hover:text-[#66B4B1] transition flex items-center gap-2">
                            <Eye size={14} /> View Details
                          </button>
                          <button onClick={() => { 
                              alert('Contacting Vendor...');
                              setActionMenuOpen(null);
                            }} 
                            className="w-full text-left px-4 py-2 text-[13px] font-bold text-gray-700 hover:bg-gray-50 hover:text-[#66B4B1] transition flex items-center gap-2">
                            <MapPin size={14} /> Contact Vendor
                          </button>
                          <button onClick={() => handleCancelBooking(b.id)} 
                            className="w-full text-left px-4 py-2 text-[13px] font-bold text-red-600 hover:bg-red-50 transition flex items-center gap-2">
                            <XCircle size={14} /> Cancel Booking
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
          <p className="text-[13px] font-bold text-gray-500">Showing {filteredBookings.length > 0 ? 1 : 0}-{Math.min(5, filteredBookings.length)} of {filteredBookings.length} bookings</p>
          <div className="flex items-center gap-2">
            <button onClick={() => alert("Action triggered: Previous")} className="px-3 py-1.5 border border-gray-200 bg-white rounded-lg text-[13px] font-bold text-gray-400 cursor-not-allowed">Previous</button>
            <button onClick={() => alert("Action triggered: Next")} className="px-3 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 rounded-lg text-[13px] font-bold text-gray-700 transition">Next</button>
          </div>
        </div>
      </div>

      {/* Side Drawer */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/40 backdrop-blur-sm transition-all duration-300">
          <div className="absolute inset-0" onClick={() => setSelectedBooking(null)} />
          <div className="relative w-full max-w-[600px] bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-slide-in-right">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">{selectedBooking.id}</h3>
                <p className="text-[13px] font-bold text-gray-500 mt-1">{selectedBooking.serviceType} • {selectedBooking.vendorName}</p>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="p-2 rounded-xl text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition">
                <XCircle size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAF7F2]">
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
                 <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">Booking Summary</h4>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                     <p className="text-[10px] text-gray-400 font-bold uppercase">Customer</p>
                     <p className="text-[13px] font-bold text-gray-900">{selectedBooking.customerName}</p>
                     <p className="text-[11px] font-medium text-gray-500">{selectedBooking.petInfo}</p>
                   </div>
                   <div>
                     <p className="text-[10px] text-gray-400 font-bold uppercase">Schedule</p>
                     <p className="text-[13px] font-bold text-gray-900">{selectedBooking.date}</p>
                     <p className="text-[11px] font-medium text-gray-500">{selectedBooking.slot} ({selectedBooking.duration})</p>
                   </div>
                 </div>
                 
                 <div className="pt-3 border-t border-gray-100 flex justify-between">
                    <span className="text-sm font-black text-gray-900">Total</span>
                    <span className="text-lg font-black text-[#66B4B1]">₹{selectedBooking.amount}</span>
                 </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Status Management</h4>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <select 
                    className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-[13px] font-bold text-gray-900 focus:outline-none focus:border-[#66B4B1] focus:ring-1 focus:ring-[#66B4B1]"
                    value={newStatus || selectedBooking.status}
                    onChange={(e) => setNewStatus(e.target.value)}
                  >
                    <option value={selectedBooking.status}>{selectedBooking.status} (Current)</option>
                    {['Pending', 'Confirmed', 'Ongoing', 'Completed', 'Cancelled', 'No-Show'].map(opt => (
                       opt !== selectedBooking.status && <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <button onClick={handleUpdateStatus} className="px-6 py-2.5 bg-[#66B4B1] hover:bg-[#66B4B1] text-white rounded-xl text-[13px] font-bold shadow-sm transition">
                    Update Status
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 bg-white flex gap-3 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.03)] z-10 relative">
               <button onClick={() => alert("Contacting Customer...")} className="flex-1 py-3 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-bold shadow-sm transition">
                 Contact Customer
               </button>
               <button onClick={() => alert("Contacting Vendor...")} className="flex-1 py-3 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-bold shadow-sm transition">
                 Contact Vendor
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
