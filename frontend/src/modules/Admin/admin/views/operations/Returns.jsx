import React, { useState, useEffect, useRef } from 'react';
import { Search, Download, Calendar, MoreVertical, CheckCircle, XCircle, RefreshCw, Box, AlertTriangle, Image as ImageIcon, Check, Eye } from 'lucide-react';
import { fetchAdminReturns, resolveAdminReturn } from '../../../../../services/admin';

export function Returns() {
  const [search, setSearch] = useState('');
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const actionMenuRef = useRef(null);

  const stats = [
    { title: 'Open Requests', value: '42', color: 'text-amber-600' },
    { title: 'Requires Review', value: '18', color: 'text-red-600' },
    { title: 'Approved Today', value: '12', color: 'text-emerald-600' },
    { title: 'Refunded (INR)', value: '₹14,500', color: 'text-gray-900' }
  ];

  const initialReturns = [
    {
      id: 'RET-3310',
      orderId: 'ORD-8821',
      customerName: 'Rahul Sharma',
      vendorName: 'Paws & Claws Store',
      item: 'Premium Dog Food 5kg',
      amount: '850',
      reason: 'Package was torn upon delivery',
      type: 'Refund',
      requestDate: '29 May 2025',
      evidence: ['torn_bag.jpg', 'spilled_food.jpg'],
      status: 'Under Review'
    },
    {
      id: 'RET-3309',
      orderId: 'ORD-8799',
      customerName: 'Sneha Roy',
      vendorName: 'PetZone India',
      item: 'Dog Collar (Size L)',
      amount: '350',
      reason: 'Size is too big',
      type: 'Replacement',
      requestDate: '28 May 2025',
      evidence: [],
      status: 'Approved'
    },
    {
      id: 'RET-3308',
      orderId: 'ORD-8750',
      customerName: 'Amit Das',
      vendorName: 'FurLove Shop',
      item: 'Cat Tree Tower',
      amount: '4,200',
      reason: 'Missing assembly parts',
      type: 'Replacement',
      requestDate: '27 May 2025',
      evidence: ['parts_manual.jpg'],
      status: 'Vendor Action Pending'
    },
    {
      id: 'RET-3307',
      orderId: 'ORD-8712',
      customerName: 'Priya Nair',
      vendorName: 'Ravi Pet Shop',
      item: 'Bird Cage',
      amount: '1,500',
      reason: 'Changed my mind',
      type: 'Refund',
      requestDate: '25 May 2025',
      evidence: [],
      status: 'Rejected'
    },
    {
      id: 'RET-3306',
      orderId: 'ORD-8699',
      customerName: 'Vijay Kumar',
      vendorName: 'Paws & Claws Store',
      item: 'Puppy Shampoo',
      amount: '320',
      reason: 'Bottle leaked completely',
      type: 'Refund',
      requestDate: '24 May 2025',
      evidence: ['empty_bottle.mp4', 'box.jpg'],
      status: 'Completed'
    }
  ];

  const [returns, setReturns] = useState([]);

  useEffect(() => {
    fetchAdminReturns().then(setReturns).catch((err) => console.error('Failed to load returns', err));
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

  const getStatusPill = (status) => {
    switch(status) {
      case 'Under Review': return 'bg-red-100 text-red-700 font-bold border border-red-200';
      case 'Vendor Action Pending': return 'bg-amber-100 text-amber-700 font-bold border border-amber-200';
      case 'Approved': return 'bg-blue-100 text-blue-700 font-bold border border-blue-200';
      case 'Completed': return 'bg-emerald-100 text-emerald-700 font-bold border border-emerald-200';
      case 'Rejected': return 'bg-gray-200 text-gray-700 font-bold border border-gray-300';
      default: return 'bg-gray-100 text-gray-700 font-bold';
    }
  };

  const handleActionClick = (e, retId) => {
    e.stopPropagation();
    setActionMenuOpen(actionMenuOpen === retId ? null : retId);
  };

  const updateReturnStatus = (retId, newStatus) => {
    const row = returns.find(r => r.id === retId);
    if (row?._id && (newStatus === 'Approved' || newStatus === 'Completed' || newStatus === 'Rejected')) {
      const action = newStatus === 'Rejected' ? 'reject' : 'approve';
      resolveAdminReturn(row._id, action).catch((err) => console.error('Resolve return failed', err));
    }
    setReturns(returns.map(r => r.id === retId ? { ...r, status: newStatus } : r));
    if (selectedReturn && selectedReturn.id === retId) {
      setSelectedReturn({ ...selectedReturn, status: newStatus });
    }
    setActionMenuOpen(null);
  };

  const filteredReturns = returns.filter(r => 
    r.id.toLowerCase().includes(search.toLowerCase()) || 
    r.orderId.toLowerCase().includes(search.toLowerCase()) ||
    r.customerName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto relative min-h-screen pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Returns & Refunds</h1>
          <p className="text-[13px] text-gray-500 mt-1 font-medium">Manage product returns, replacements, and customer refunds</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button onClick={() => alert("Downloading CSV...")} className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 text-[13px] font-bold rounded-xl hover:bg-gray-50 transition shadow-sm">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
            placeholder="Return ID, Order ID, Customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-[13px] font-medium focus:outline-none focus:border-[#66B4B1] focus:ring-1 focus:ring-[#66B4B1] transition"
          />
        </div>
        <select className="flex-1 min-w-[130px] pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-[13px] font-bold text-gray-700 bg-white focus:outline-none text-ellipsis overflow-hidden whitespace-nowrap">
          <option>Type: All</option>
          <option>Refund</option>
          <option>Replacement</option>
        </select>
        <select className="flex-1 min-w-[130px] pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-[13px] font-bold text-gray-700 bg-white focus:outline-none text-ellipsis overflow-hidden whitespace-nowrap">
          <option>Status: All</option>
          <option>Under Review</option>
          <option>Vendor Action Pending</option>
          <option>Approved</option>
          <option>Completed</option>
          <option>Rejected</option>
        </select>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-visible">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse min-w-[800px] whitespace-nowrap">
            <thead>
              <tr className="bg-[#FAF7F2] border-b border-gray-200">
                <th className="px-4 py-3 w-10 text-center"><input type="checkbox" className="rounded border-gray-300" /></th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Return ID / Order</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Customer & Vendor</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Item Details</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Reason</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Evidence</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Amount</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredReturns.map((r) => (
                <tr key={r.id} className="hover:bg-[#FAF7F2] transition group cursor-pointer" onClick={() => setSelectedReturn(r)}>
                  <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}><input type="checkbox" className="rounded border-gray-300" /></td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <p className="text-[13px] font-bold text-red-600 hover:underline">{r.id}</p>
                    <p className="text-[11px] font-bold text-gray-400 mt-0.5 hover:text-[#66B4B1] hover:underline cursor-pointer">{r.orderId}</p>
                    <p className="text-[10px] font-medium text-gray-400">{r.requestDate}</p>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <p className="text-[13px] font-bold text-gray-900">{r.customerName}</p>
                    <p className="text-[11px] font-medium text-gray-500 mt-0.5">from: {r.vendorName}</p>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                         <Box size={14} className="text-gray-400" />
                      </div>
                      <p className="text-[12px] font-bold text-gray-900 w-32 truncate" title={r.item}>{r.item}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-[12px] font-medium text-gray-700 w-40 truncate" title={r.reason}>{r.reason}</p>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {r.evidence.length > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        <ImageIcon size={10} /> {r.evidence.length} Files
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${r.type === 'Refund' ? 'text-amber-600' : 'text-blue-600'}`}>
                      {r.type}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right">
                    <p className="text-[14px] font-black text-gray-900">₹{r.amount}</p>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] ${getStatusPill(r.status)}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right relative">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedReturn(r); }} className="px-3 py-1.5 border border-[#66B4B1] text-[#66B4B1] rounded-lg text-[11px] font-bold hover:bg-[#FAF7F2] transition">
                        Review
                      </button>
                      <button onClick={(e) => handleActionClick(e, r.id)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition">
                        <MoreVertical size={16} />
                      </button>
                    </div>

                    {/* Action Menu */}
                    {actionMenuOpen === r.id && (
                      <div ref={actionMenuRef} className="absolute right-8 top-10 bg-white border border-gray-200 rounded-lg shadow-lg w-40 z-20 overflow-hidden text-left py-1">
                        <button onClick={() => { setSelectedReturn(r); setActionMenuOpen(null); }} className="w-full text-left px-4 py-2 text-[13px] font-bold text-gray-700 hover:bg-gray-50 hover:text-[#66B4B1] transition flex items-center gap-2">
                          <Eye size={14} /> Review Request
                        </button>
                        <button onClick={() => updateReturnStatus(r.id, 'Approved')} 
                          className="w-full text-left px-4 py-2 text-[13px] font-bold text-emerald-600 hover:bg-emerald-50 transition flex items-center gap-2">
                          <Check size={14} /> Approve
                        </button>
                        <button onClick={() => updateReturnStatus(r.id, 'Rejected')} 
                          className="w-full text-left px-4 py-2 text-[13px] font-bold text-red-600 hover:bg-red-50 transition flex items-center gap-2">
                          <XCircle size={14} /> Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-200 flex items-center justify-between bg-gray-50/50">
          <p className="text-[13px] font-bold text-gray-500">Showing {filteredReturns.length > 0 ? 1 : 0}-{Math.min(5, filteredReturns.length)} of {filteredReturns.length} requests</p>
          <div className="flex items-center gap-2">
            <button onClick={() => alert("Action triggered: Previous")} className="px-3 py-1.5 border border-gray-200 bg-white rounded-lg text-[13px] font-bold text-gray-400 cursor-not-allowed">Previous</button>
            <button onClick={() => alert("Action triggered: Next")} className="px-3 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 rounded-lg text-[13px] font-bold text-gray-700 transition">Next</button>
          </div>
        </div>
      </div>

      {/* Side Drawer */}
      {selectedReturn && (
        <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/40 backdrop-blur-sm transition-all duration-300">
          <div className="absolute inset-0" onClick={() => setSelectedReturn(null)} />
          <div className="relative w-full max-w-[600px] bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-slide-in-right">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">{selectedReturn.id}</h3>
                <p className="text-[13px] font-bold text-gray-500 mt-1">Requested {selectedReturn.requestDate}</p>
              </div>
              <button onClick={() => setSelectedReturn(null)} className="p-2 rounded-xl text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition">
                <XCircle size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAF7F2]">
              
              {/* Evidence Section */}
              {selectedReturn.evidence.length > 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                   <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Customer Evidence</h4>
                   <div className="flex gap-3 overflow-x-auto pb-2">
                      {selectedReturn.evidence.map((ev, i) => (
                        <div key={i} className="min-w-[120px] h-[120px] bg-gray-100 rounded-xl border border-gray-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-200 transition">
                           <ImageIcon size={24} className="text-gray-400" />
                           <span className="text-[10px] font-bold text-gray-500 px-2 truncate w-full text-center">{ev}</span>
                        </div>
                      ))}
                   </div>
                </div>
              ) : (
                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-center gap-3">
                  <AlertTriangle size={18} className="text-orange-500" />
                  <p className="text-[13px] font-bold text-orange-800">No evidence provided by customer.</p>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
                 <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">Dispute Summary</h4>
                 <div>
                   <p className="text-[10px] text-gray-400 font-bold uppercase">Customer Reason</p>
                   <p className="text-[13px] font-medium text-gray-900 mt-1">"{selectedReturn.reason}"</p>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-3">
                   <div>
                     <p className="text-[10px] text-gray-400 font-bold uppercase">Item</p>
                     <p className="text-[13px] font-bold text-gray-900">{selectedReturn.item}</p>
                     <p className="text-[11px] font-medium text-gray-500">Order: {selectedReturn.orderId}</p>
                   </div>
                   <div>
                     <p className="text-[10px] text-gray-400 font-bold uppercase">Vendor</p>
                     <p className="text-[13px] font-bold text-gray-900">{selectedReturn.vendorName}</p>
                   </div>
                 </div>
                 <div className="pt-3 border-t border-gray-100 flex justify-between items-center bg-gray-50 p-3 rounded-xl mt-2">
                    <span className="text-sm font-bold text-gray-900">Total {selectedReturn.type} Value</span>
                    <span className="text-lg font-black text-gray-900">₹{selectedReturn.amount}</span>
                 </div>
              </div>

              {/* Status Update manually */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Current Status</h4>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                   <span className={`px-3 py-1.5 rounded-full text-[12px] ${getStatusPill(selectedReturn.status)}`}>
                     {selectedReturn.status}
                   </span>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 bg-white flex gap-3 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.03)] z-10 relative">
               <button onClick={() => updateReturnStatus(selectedReturn.id, 'Rejected')} className="flex-1 py-3 border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-sm font-bold shadow-sm transition">
                 Reject
               </button>
               <button onClick={() => updateReturnStatus(selectedReturn.id, 'Vendor Action Pending')} className="flex-1 py-3 border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-sm font-bold shadow-sm transition">
                 Forward to Vendor
               </button>
               <button onClick={() => updateReturnStatus(selectedReturn.id, 'Approved')} className="flex-1 py-3 border border-transparent bg-[#66B4B1] hover:bg-[#66B4B1] text-white rounded-xl text-sm font-bold shadow-sm transition flex items-center justify-center gap-2">
                 <Check size={16} /> Approve {selectedReturn.type}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
