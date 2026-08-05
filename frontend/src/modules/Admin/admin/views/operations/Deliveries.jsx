import React, { useState, useEffect, useRef } from 'react';
import { Search, Download, Calendar, MoreVertical, Map, MapPin, Phone, Package, Utensils, AlertTriangle, CheckCircle, XCircle, Eye } from 'lucide-react';
import { fetchAdminDeliveries } from '../../../../../services/admin';

export function Deliveries() {
  const [search, setSearch] = useState('');
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const actionMenuRef = useRef(null);

  const stats = [
    { title: 'Total Today', value: '318', color: 'text-gray-900' },
    { title: 'Meal Deliveries', value: '191', color: 'text-emerald-600' },
    { title: 'Shop Deliveries', value: '127', color: 'text-blue-600' },
    { title: 'On Time', value: '289', color: 'text-teal-600' },
    { title: 'Delayed', value: '22', color: 'text-amber-600' },
    { title: 'Failed', value: '7', color: 'text-red-600' }
  ];

  const initialDeliveries = [
    {
      id: 'DEL-7721',
      linkedOrder: 'ORD-8821',
      type: 'Shop Order',
      customerName: 'Rahul Sharma',
      phone: '9876543210',
      addressShort: 'Andheri West, Mumbai',
      addressFull: 'Flat 402, Sea View Apts, Andheri West, Mumbai 400053',
      vendorName: 'Paws & Claws',
      vendorType: 'Shop',
      agentName: 'Ravi M',
      agentPhone: '9876112233',
      dispatched: '09:30 AM',
      date: '29 May 2025',
      eta: '10:15 AM',
      etaStatus: 'On time',
      delayReason: null,
      status: 'Out for Delivery',
      lastUpdate: 'Updated 2 min ago'
    },
    {
      id: 'DEL-7720',
      linkedOrder: 'SUB-441',
      type: 'Meal Delivery',
      customerName: 'Priya Nair',
      phone: '9876543211',
      addressShort: 'Koramangala, Bangalore',
      addressFull: 'Villa 12, Palm Meadows, Koramangala, Bangalore 560034',
      vendorName: 'PetBite Meals',
      vendorType: 'Meal',
      agentName: 'Suresh K',
      agentPhone: '9876112244',
      dispatched: '08:00 AM',
      date: '29 May 2025',
      eta: '08:45 AM',
      etaStatus: 'On time',
      delayReason: null,
      status: 'Delivered',
      lastUpdate: 'Updated 1 hr ago'
    },
    {
      id: 'DEL-7719',
      linkedOrder: 'SUB-442',
      type: 'Meal Delivery',
      customerName: 'Amit Das',
      phone: '9876543212',
      addressShort: 'Banjara Hills, Hyderabad',
      addressFull: 'Plot 45, Road No 12, Banjara Hills, Hyderabad 500034',
      vendorName: 'FurFeed Kitchen',
      vendorType: 'Meal',
      agentName: 'Mohan R',
      agentPhone: '9876112255',
      dispatched: '08:15 AM',
      date: '29 May 2025',
      eta: '09:00 AM',
      etaStatus: 'Delayed',
      delayReason: 'Delayed 35min (Traffic)',
      status: 'Out for Delivery',
      lastUpdate: 'Updated 5 min ago'
    },
    {
      id: 'DEL-7718',
      linkedOrder: 'ORD-8818',
      type: 'Shop Order',
      customerName: 'Sneha Roy',
      phone: '9876543213',
      addressShort: 'C-Scheme, Jaipur',
      addressFull: 'A-12, Ahinsa Circle, C-Scheme, Jaipur 302001',
      vendorName: 'PetZone India',
      vendorType: 'Shop',
      agentName: 'Vikram S',
      agentPhone: '9876112266',
      dispatched: '10:00 AM',
      date: '29 May 2025',
      eta: '10:45 AM',
      etaStatus: 'On time',
      delayReason: null,
      status: 'Preparing',
      lastUpdate: 'Updated 10 min ago'
    },
    {
      id: 'DEL-7717',
      linkedOrder: 'SUB-439',
      type: 'Meal Delivery',
      customerName: 'Vijay Kumar',
      phone: '9876543214',
      addressShort: 'Jubilee Hills, Hyd',
      addressFull: 'B-Block, Plot 88, Jubilee Hills, Hyderabad 500033',
      vendorName: 'TailMeals',
      vendorType: 'Meal',
      agentName: 'Anand P',
      agentPhone: '9876112277',
      dispatched: '07:30 AM',
      date: '29 May 2025',
      eta: '—',
      etaStatus: 'Failed',
      delayReason: 'Address not found',
      status: 'Failed',
      lastUpdate: 'Updated 30 min ago'
    }
  ];

  const [deliveries, setDeliveries] = useState([]);

  useEffect(() => {
    fetchAdminDeliveries().then(setDeliveries).catch((err) => console.error('Failed to load deliveries', err));
  }, []);

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
      case 'Shop Order': return { style: 'bg-blue-100 text-blue-700', icon: <Package size={12} /> };
      case 'Meal Delivery': return { style: 'bg-emerald-100 text-emerald-700', icon: <Utensils size={12} /> };
      default: return { style: 'bg-gray-100 text-gray-700', icon: null };
    }
  };

  const renderStatusTimeline = (status) => {
    const steps = ['Preparing', 'Out for Delivery', 'Delivered'];
    let currentStep = 0;
    if (status === 'Out for Delivery') currentStep = 1;
    if (status === 'Delivered') currentStep = 2;
    if (status === 'Failed') currentStep = 3; // Special case

    return (
      <div className="w-full max-w-[120px]">
        <div className="flex items-center justify-between relative mb-1">
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-gray-200 rounded-full z-0"></div>
          {steps.map((step, idx) => {
            let dotColor = 'bg-gray-300';
            if (status === 'Failed') {
               if (idx === 2) dotColor = 'bg-red-500';
               else dotColor = 'bg-gray-300';
            } else if (idx <= currentStep) {
               dotColor = 'bg-[#66B4B1]';
            } else if (idx === currentStep + 1 && status !== 'Delivered') {
               dotColor = 'bg-amber-400';
            }

            return (
              <div key={idx} className={`w-2.5 h-2.5 rounded-full ${dotColor} z-10 border-2 border-white`}></div>
            );
          })}
        </div>
        <p className={`text-[10px] font-bold ${status === 'Failed' ? 'text-red-500' : 'text-gray-500'} text-center`}>
          {status}
        </p>
      </div>
    );
  };

  const handleActionClick = (e, deliveryId) => {
    e.stopPropagation();
    setActionMenuOpen(actionMenuOpen === deliveryId ? null : deliveryId);
  };

  const updateDeliveryStatus = (deliveryId, newStatus) => {
    setDeliveries(deliveries.map(d => d.id === deliveryId ? { ...d, status: newStatus, etaStatus: newStatus === 'Failed' ? 'Failed' : d.etaStatus } : d));
    if (selectedDelivery && selectedDelivery.id === deliveryId) {
      setSelectedDelivery({ ...selectedDelivery, status: newStatus });
    }
    setActionMenuOpen(null);
  };

  const filteredDeliveries = deliveries.filter(d => 
    d.id.toLowerCase().includes(search.toLowerCase()) || 
    d.customerName.toLowerCase().includes(search.toLowerCase()) ||
    d.linkedOrder.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto relative min-h-screen pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Deliveries</h1>
          <p className="text-[13px] text-gray-500 mt-1 font-medium">Live delivery tracking — orders & meal subscriptions</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button onClick={() => alert("Downloading CSV...")} className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 text-[13px] font-bold rounded-xl hover:bg-gray-50 transition shadow-sm">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={() => alert("Action triggered: Map View")} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-bold rounded-xl transition shadow-sm">
            <Map size={14} /> Map View
          </button>
        </div>
      </div>

      {/* Failed Alert Banner */}
      <div className="mb-6 bg-red-50 border border-red-200 p-4 sm:p-5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3 text-red-700">
          <div className="relative mt-0.5 sm:mt-0">
            <AlertTriangle size={20} />
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
          </div>
          <span className="text-[13px] sm:text-sm font-bold tracking-wider leading-snug uppercase">7 DELIVERIES FAILED TODAY</span>
        </div>
        <button onClick={() => alert("Action triggered: View Failed Deliveries →")} className="text-[13px] font-bold text-red-700 hover:text-red-800 transition flex items-center gap-1 ml-8 sm:ml-0 bg-red-100/50 px-3 py-1.5 rounded-lg border border-red-200/50">
          View Failed Deliveries <span className="text-lg">→</span>
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {stats.map((s, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{s.title}</h3>
            <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[100%] sm:min-w-[200px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Delivery ID, customer, order ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-[13px] font-medium focus:outline-none focus:border-[#66B4B1] focus:ring-1 focus:ring-[#66B4B1] transition"
          />
        </div>
        <select className="flex-1 min-w-[130px] pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-[13px] font-bold text-gray-700 bg-white focus:outline-none text-ellipsis overflow-hidden whitespace-nowrap">
          <option>Type: All</option>
          <option>Shop Order</option>
          <option>Meal Subscription</option>
        </select>
        <select className="flex-1 min-w-[130px] pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-[13px] font-bold text-gray-700 bg-white focus:outline-none text-ellipsis overflow-hidden whitespace-nowrap">
          <option>Status: All</option>
          <option>Preparing</option>
          <option>Out for Delivery</option>
          <option>Delivered</option>
          <option>Failed</option>
        </select>
        <select className="flex-1 min-w-[130px] pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-[13px] font-bold text-gray-700 bg-white focus:outline-none text-ellipsis overflow-hidden whitespace-nowrap">
          <option>Vendor: All</option>
        </select>
        <select className="flex-1 min-w-[130px] pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-[13px] font-bold text-gray-700 bg-white focus:outline-none text-ellipsis overflow-hidden whitespace-nowrap">
          <option>City: All</option>
        </select>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-visible">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse min-w-[800px] whitespace-nowrap">
            <thead>
              <tr className="bg-[#FAF7F2] border-b border-gray-200">
                <th className="px-4 py-3 w-10 text-center"><input type="checkbox" className="rounded border-gray-300" /></th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Delivery ID</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Vendor</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Address</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Assigned To</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Dispatched</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">ETA</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Live Status</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDeliveries.map((d) => {
                const typeInfo = getTypePill(d.type);
                return (
                  <tr key={d.id} className="hover:bg-[#FAF7F2] transition group cursor-pointer" onClick={() => setSelectedDelivery(d)}>
                    <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}><input type="checkbox" className="rounded border-gray-300" /></td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <p className="text-[13px] font-bold text-[#66B4B1] hover:underline">{d.id}</p>
                      <p className="text-[10px] font-medium text-gray-400 mt-0.5">#{d.linkedOrder}</p>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold ${typeInfo.style}`}>
                        {typeInfo.icon} {d.type}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <p className="text-[13px] font-bold text-gray-900">{d.customerName}</p>
                      <p className="text-[11px] font-medium text-gray-500 flex items-center gap-1 mt-0.5">
                        <Phone size={10} /> {d.phone}
                      </p>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <p className="text-[13px] font-bold text-gray-900">{d.vendorName}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">{d.vendorType}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-[12px] font-medium text-gray-700 w-40 truncate" title={d.addressFull}>{d.addressFull}</p>
                      <button className="text-[11px] font-bold text-[#66B4B1] hover:underline flex items-center gap-1 mt-0.5" onClick={(e) => { e.stopPropagation(); alert(`Opening Map for ${d.addressFull}`); }}>
                        <MapPin size={10} /> View Map
                      </button>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600">
                          {d.agentName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-gray-900">{d.agentName}</p>
                          <p className="text-[11px] font-medium text-gray-500 flex items-center gap-1 mt-0.5">
                            <Phone size={10} /> {d.agentPhone}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <p className="text-[13px] font-bold text-gray-900">{d.dispatched}</p>
                      <p className="text-[11px] font-medium text-gray-500">{d.date}</p>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <p className="text-[13px] font-bold text-gray-900">{d.eta}</p>
                      {d.etaStatus === 'On time' && <p className="text-[11px] font-bold text-[#66B4B1]">✓ On time</p>}
                      {d.etaStatus === 'Delayed' && <p className="text-[11px] font-bold text-amber-500 flex items-center gap-1"><AlertTriangle size={10}/> Delayed</p>}
                      {d.etaStatus === 'Failed' && <p className="text-[11px] font-bold text-red-500 flex items-center gap-1"><XCircle size={10}/> {d.delayReason || 'Delivery failed'}</p>}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {renderStatusTimeline(d.status)}
                      <p className="text-[10px] font-medium text-gray-400 mt-1 text-center">{d.lastUpdate}</p>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right relative">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={(e) => { e.stopPropagation(); setSelectedDelivery(d); }} className="px-3 py-1.5 bg-[#FAF7F2] text-[#66B4B1] rounded-lg text-[11px] font-bold hover:bg-[#66B4B1] hover:text-white transition flex items-center gap-1">
                          <MapPin size={12} /> Track
                        </button>
                        <button onClick={(e) => handleActionClick(e, d.id)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition">
                          <MoreVertical size={16} />
                        </button>
                      </div>

                      {/* Action Menu */}
                      {actionMenuOpen === d.id && (
                        <div ref={actionMenuRef} className="absolute right-8 top-10 bg-white border border-gray-200 rounded-lg shadow-lg w-40 z-20 overflow-hidden text-left py-1">
                          <button onClick={() => { setSelectedDelivery(d); setActionMenuOpen(null); }} className="w-full text-left px-4 py-2 text-[13px] font-bold text-gray-700 hover:bg-gray-50 hover:text-[#66B4B1] transition flex items-center gap-2">
                            <Eye size={14} /> View Details
                          </button>
                          <button onClick={() => updateDeliveryStatus(d.id, 'Delivered')} 
                            className="w-full text-left px-4 py-2 text-[13px] font-bold text-emerald-600 hover:bg-emerald-50 transition flex items-center gap-2">
                            <CheckCircle size={14} /> Mark Delivered
                          </button>
                          <button onClick={() => updateDeliveryStatus(d.id, 'Failed')} 
                            className="w-full text-left px-4 py-2 text-[13px] font-bold text-red-600 hover:bg-red-50 transition flex items-center gap-2">
                            <XCircle size={14} /> Mark Failed
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
          <p className="text-[13px] font-bold text-gray-500">Showing {filteredDeliveries.length > 0 ? 1 : 0}-{Math.min(5, filteredDeliveries.length)} of {filteredDeliveries.length} deliveries</p>
          <div className="flex items-center gap-2">
            <button onClick={() => alert("Action triggered: Previous")} className="px-3 py-1.5 border border-gray-200 bg-white rounded-lg text-[13px] font-bold text-gray-400 cursor-not-allowed">Previous</button>
            <button onClick={() => alert("Action triggered: Next")} className="px-3 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 rounded-lg text-[13px] font-bold text-gray-700 transition">Next</button>
          </div>
        </div>
      </div>

      {/* Side Drawer */}
      {selectedDelivery && (
        <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/40 backdrop-blur-sm transition-all duration-300">
          <div className="absolute inset-0" onClick={() => setSelectedDelivery(null)} />
          <div className="relative w-full max-w-[500px] bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-slide-in-right">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">{selectedDelivery.id}</h3>
                <p className="text-[13px] font-bold text-gray-500 mt-1">{selectedDelivery.type} • #{selectedDelivery.linkedOrder}</p>
              </div>
              <button onClick={() => setSelectedDelivery(null)} className="p-2 rounded-xl text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition">
                <XCircle size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAF7F2]">
              {/* Map Placeholder */}
              <div className="h-48 bg-gray-200 rounded-2xl overflow-hidden relative border border-gray-300 flex items-center justify-center">
                 <div className="absolute inset-0 opacity-30 bg-[url('https://maps.gstatic.com/mapfiles/api-3/images/cb_default.png')] bg-cover"></div>
                 <div className="relative z-10 flex flex-col items-center">
                    <MapPin size={32} className="text-[#66B4B1] mb-2" />
                    <span className="bg-white px-3 py-1 rounded-full text-[11px] font-bold shadow-sm">Live Location Unavailable in Mock</span>
                 </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
                 <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">Delivery Details</h4>
                 <div>
                   <p className="text-[10px] text-gray-400 font-bold uppercase">Customer</p>
                   <p className="text-[13px] font-bold text-gray-900">{selectedDelivery.customerName}</p>
                   <p className="text-[11px] font-medium text-gray-500">{selectedDelivery.phone}</p>
                 </div>
                 <div>
                   <p className="text-[10px] text-gray-400 font-bold uppercase">Address</p>
                   <p className="text-[13px] font-medium text-gray-800 leading-relaxed">{selectedDelivery.addressFull}</p>
                 </div>
                 <div className="pt-3 border-t border-gray-100">
                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Status</p>
                    {renderStatusTimeline(selectedDelivery.status)}
                 </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
                 <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">Agent Details</h4>
                 <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-lg">
                      {selectedDelivery.agentName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-gray-900">{selectedDelivery.agentName}</p>
                      <p className="text-[12px] font-medium text-gray-500">{selectedDelivery.agentPhone}</p>
                    </div>
                 </div>
                 <button onClick={() => alert('Reassigning Agent...')} className="w-full py-2 border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 transition mt-2">
                   Reassign Agent
                 </button>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 bg-white shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.03)] z-10 relative space-y-3">
               <button onClick={() => updateDeliveryStatus(selectedDelivery.id, 'Delivered')} className="w-full py-3 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-sm font-bold shadow-sm transition">
                 Mark as Delivered
               </button>
               <button onClick={() => updateDeliveryStatus(selectedDelivery.id, 'Failed')} className="w-full py-3 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-bold shadow-sm transition">
                 Mark as Failed
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
