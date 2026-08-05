import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, Check, AlertCircle, RefreshCw, HandCoins, Building2, Play, Pause, Eye } from 'lucide-react';
import { fetchAdminPayouts, payAdminPayout } from '../../../../../services/admin';

const STATUS_LABEL = { paid: 'Paid', pending: 'Pending', processing: 'On Hold' };
const mapPayout = (p) => ({
  id: p.id,
  vendor: p.vendor,
  account: p.utr ? `UTR ${p.utr}` : '—',
  amount: '₹' + (p.gross || 0).toLocaleString('en-IN'),
  commission: '₹' + (p.commission || 0).toLocaleString('en-IN'),
  net: '₹' + (p.net || 0).toLocaleString('en-IN'),
  scheduled: p.date,
  status: STATUS_LABEL[p.status] || 'Pending',
});

export function VendorPayouts() {
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const [payouts, setPayouts] = useState([]);

  useEffect(() => {
    fetchAdminPayouts().then((rows) => setPayouts(rows.map(mapPayout))).catch((err) => console.error('Failed to load payouts', err));
  }, []);

  const getStatusStyle = (status) => {
    switch(status) {
      case 'Paid': return 'bg-emerald-100 text-emerald-700';
      case 'Pending': return 'bg-blue-100 text-blue-700';
      case 'On Hold': return 'bg-amber-100 text-amber-700';
      case 'Failed': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const markAsPaid = async (id) => {
    try {
      const res = await payAdminPayout(id);
      setPayouts(payouts.map(p => p.id === id ? { ...p, status: 'Paid', account: res.utr ? `UTR ${res.utr}` : p.account } : p));
      showToast(`Payout ${id} marked as Paid`);
    } catch (err) {
      showToast(err?.response?.data?.message || 'Payout failed', 'error');
    }
  };

  const putOnHold = (id) => {
    setPayouts(payouts.map(p => p.id === id ? { ...p, status: 'On Hold' } : p));
    showToast(`Payout ${id} put on Hold`, 'info');
  };

  const processBulkPayout = async () => {
    const pendingIds = payouts.filter(p => p.status === 'Pending').map(p => p.id);
    if (pendingIds.length === 0) {
       showToast('No pending payouts to process', 'info');
       return;
    }
    await Promise.allSettled(pendingIds.map((id) => payAdminPayout(id)));
    setPayouts(payouts.map(p => p.status === 'Pending' ? { ...p, status: 'Paid' } : p));
    showToast(`Successfully processed ${pendingIds.length} bulk payouts`);
  };

  return (
    <div className="p-3 sm:p-6 max-w-[1500px] mx-auto bg-[#FAF7F2] min-h-screen pb-20 relative">
      
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 animate-slide-in-right">
          <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200 flex items-center gap-3">
             {toastMessage.type === 'success' ? (
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><Check size={14}/></div>
             ) : (
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><AlertCircle size={14}/></div>
             )}
             <p className="text-[13px] font-bold text-gray-800">{toastMessage.text}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">Vendor Payouts</h1>
          <p className="text-[13px] text-gray-500 mt-1">Manage scheduled and completed vendor settlements</p>
        </div>
        <button onClick={processBulkPayout} className="flex items-center gap-2 px-4 py-2 bg-[#66B4B1] hover:bg-[#66B4B1] text-white text-[13px] font-semibold rounded-lg transition shadow-sm">
          <HandCoins size={16} /> Process Bulk Payout
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm flex flex-col justify-between">
          <h3 className="text-[13px] text-gray-500 font-medium">Total Paid Out (MTD)</h3>
          <p className="text-[26px] font-bold text-emerald-600">₹18,40,500</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm flex flex-col justify-between">
          <h3 className="text-[13px] text-gray-500 font-medium">Pending Payout Amount</h3>
          <p className="text-[26px] font-bold text-blue-600">₹4,12,500</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm flex flex-col justify-between">
          <h3 className="text-[13px] text-gray-500 font-medium">Payouts This Week</h3>
          <p className="text-[26px] font-bold text-gray-900">48</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm flex flex-col justify-between">
          <h3 className="text-[13px] text-gray-500 font-medium">On-Hold Payouts</h3>
          <p className="text-[26px] font-bold text-amber-600">3</p>
        </div>
      </div>

      {/* Main Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-[#FAF7F2] overflow-hidden flex flex-col">
         
         {/* Filter Bar */}
         <div className="p-4 border-b border-[#FAF7F2] flex flex-wrap items-center gap-3 bg-gray-50/50">
            <div className="relative min-w-[200px]">
               <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
               <input type="text" placeholder="Search Payout ID, Vendor..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white shadow-sm" />
            </div>
            
            <div className="flex items-center gap-2">
               <div className="relative">
                 <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                 <input type="text" placeholder="Date Range" className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white shadow-sm cursor-pointer w-40" readOnly value="May 2026" />
               </div>
               
               <select className="px-3 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-600 bg-white shadow-sm focus:outline-none focus:border-[#66B4B1] outline-none appearance-none pr-8 cursor-pointer min-w-[140px]">
                 <option>All Statuses</option>
                 <option>Paid</option>
                 <option>Pending</option>
                 <option>On Hold</option>
                 <option>Failed</option>
               </select>
               
               <button onClick={() => alert("Action triggered: Filters")} className="px-4 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-600 bg-white hover:bg-gray-50 shadow-sm transition flex items-center gap-2">
                 <Filter size={14} /> Filters
               </button>
            </div>
         </div>

         {/* Data Table */}
         <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse min-w-[800px] whitespace-nowrap">
               <thead className="bg-[#FAF7F2] border-b border-[#FAF7F2]">
                  <tr>
                     <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Payout ID</th>
                     <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Vendor</th>
                     <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Bank/UPI Account</th>
                     <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Gross Amount</th>
                     <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Commission</th>
                     <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Net Amount</th>
                     <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Scheduled Date</th>
                     <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                     <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-[#FAF7F2]">
                  {payouts.map(p => (
                     <tr key={p.id} className="hover:bg-[#FAF7F2] transition group">
                        <td className="px-5 py-4">
                           <span className="text-[13px] font-semibold text-gray-900 group-hover:text-[#66B4B1] transition">{p.id}</span>
                        </td>
                        <td className="px-5 py-4">
                           <div className="flex items-center gap-2">
                              <Building2 size={14} className="text-gray-400" />
                              <span className="text-[13px] font-medium text-gray-800">{p.vendor}</span>
                           </div>
                        </td>
                        <td className="px-5 py-4 text-[13px] font-mono text-gray-600">{p.account}</td>
                        <td className="px-5 py-4 text-[13px] font-semibold text-gray-900">{p.amount}</td>
                        <td className="px-5 py-4 text-[13px] font-medium text-rose-500">-{p.commission}</td>
                        <td className="px-5 py-4 text-[13px] font-bold text-[#66B4B1]">{p.net}</td>
                        <td className="px-5 py-4 text-[13px] text-gray-600">{p.scheduled}</td>
                        <td className="px-5 py-4">
                           <div className={`px-2.5 py-1 rounded-full w-fit ${getStatusStyle(p.status)}`}>
                              <span className="text-[11px] font-bold">{p.status}</span>
                           </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                           <div className="flex items-center justify-end gap-1">
                              <button onClick={() => alert("Action triggered: View Breakdown")} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition" title="View Breakdown">
                                 <Eye size={16} />
                              </button>
                              {p.status === 'Pending' && (
                                 <>
                                    <button onClick={() => markAsPaid(p.id)} className="p-1.5 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 rounded transition" title="Mark as Paid">
                                       <Play size={16} />
                                    </button>
                                    <button onClick={() => putOnHold(p.id)} className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded transition" title="Put On Hold">
                                       <Pause size={16} />
                                    </button>
                                 </>
                              )}
                              {p.status === 'On Hold' && (
                                 <button onClick={() => setPayouts(payouts.map(pt => pt.id === p.id ? { ...pt, status: 'Pending' } : pt))} className="p-1.5 text-amber-500 hover:bg-amber-50 rounded transition" title="Resume">
                                    <RefreshCw size={16} />
                                 </button>
                              )}
                           </div>
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
