import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, Check, Edit2, TrendingUp, Download, Building2, AlertCircle } from 'lucide-react';
import { fetchVendorPerformance } from '../../../../../services/admin';

export function Commission() {
  const [toastMessage, setToastMessage] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const [vendors, setVendors] = useState([]);

  useEffect(() => {
    fetchVendorPerformance()
      .then((rows) => setVendors(rows.map((v) => ({
        id: v.id,
        name: v.name,
        category: v.type,
        orders: v.orders,
        gross: '₹' + (v.gross || 0).toLocaleString('en-IN'),
        rate: Math.round((v.commissionRate || 0) * 100),
        earned: '₹' + (v.commission || 0).toLocaleString('en-IN'),
        status: v.net > 0 ? 'Pending' : 'Settled',
      }))))
      .catch((err) => console.error('Failed to load commission data', err));
  }, []);

  const getStatusStyle = (status) => {
    switch(status) {
      case 'Settled': return 'bg-emerald-100 text-emerald-700';
      case 'Pending': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleEditSave = (id) => {
    const newRate = parseFloat(editValue);
    if (!isNaN(newRate) && newRate >= 0 && newRate <= 100) {
      setVendors(vendors.map(v => v.id === id ? { ...v, rate: newRate } : v));
      showToast(`Commission rate updated to ${newRate}%`);
    } else {
      showToast('Invalid commission rate', 'error');
    }
    setEditingId(null);
  };

  const startEdit = (v) => {
    setEditingId(v.id);
    setEditValue(v.rate.toString());
  };

  const topVendorsData = [
    { name: 'Ravi Pet Shop', value: 100 },
    { name: 'City Vet Hospital', value: 92 },
    { name: 'Happy Tails Clinic', value: 85 },
    { name: 'PetZone India', value: 45 },
    { name: 'FurLove Grooming', value: 40 },
    { name: 'Pawsome Training', value: 22 },
  ];

  return (
    <div className="p-3 sm:p-6 max-w-[1500px] mx-auto bg-[#FAF7F2] min-h-screen pb-20 relative">
      
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 animate-slide-in-right">
          <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200 flex items-center gap-3">
             {toastMessage.type === 'success' ? (
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><Check size={14}/></div>
             ) : (
                <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center"><AlertCircle size={14}/></div>
             )}
             <p className="text-[13px] font-bold text-gray-800">{toastMessage.text}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">Commission</h1>
          <p className="text-[13px] text-gray-500 mt-1">Manage platform commission earned from vendors</p>
        </div>
        <button onClick={() => alert("Action triggered: Export Data")} className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 text-[13px] font-semibold rounded-lg transition shadow-sm">
          <Download size={16} /> Export Data
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm flex flex-col justify-between">
          <h3 className="text-[13px] text-gray-500 font-medium">Total Commission (All Time)</h3>
          <p className="text-[26px] font-bold text-gray-900">₹84,50,000</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm flex flex-col justify-between">
          <h3 className="text-[13px] text-gray-500 font-medium">This Month</h3>
          <p className="text-[26px] font-bold text-emerald-600">₹4,68,300</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm flex flex-col justify-between">
          <h3 className="text-[13px] text-gray-500 font-medium">Pending Commission</h3>
          <p className="text-[26px] font-bold text-amber-600">₹2,46,300</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm flex flex-col justify-between">
          <h3 className="text-[13px] text-gray-500 font-medium">Top Earning Vendor</h3>
          <div className="flex items-center gap-2 mt-1">
             <Building2 size={16} className="text-[#66B4B1]" />
             <p className="text-[18px] font-bold text-gray-900 line-clamp-1">Ravi Pet Shop</p>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white p-6 rounded-xl border border-[#FAF7F2] shadow-sm mb-8">
         <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={18} className="text-[#66B4B1]" />
            <h3 className="text-[14px] font-bold text-gray-900 uppercase tracking-wider">Top 10 Vendors by Commission</h3>
         </div>
         <div className="flex items-end gap-4 h-48 pt-4 border-b border-gray-100">
            {topVendorsData.map((v, i) => (
               <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-10 bg-gray-900 text-white text-[11px] py-1 px-2 rounded whitespace-nowrap transition-opacity pointer-events-none z-10">
                     {v.name}
                  </div>
                  {/* Bar */}
                  <div className="w-full bg-[#FAF7F2] rounded-t-sm group-hover:bg-[#66B4B1] transition-colors relative" style={{ height: `${v.value}%` }}>
                     <div className="absolute top-0 left-0 right-0 h-1 bg-[#66B4B1] rounded-t-sm"></div>
                  </div>
               </div>
            ))}
         </div>
         <div className="flex gap-4 mt-3">
            {topVendorsData.map((v, i) => (
               <div key={i} className="flex-1 text-center">
                  <p className="text-[10px] text-gray-500 truncate px-1" title={v.name}>{v.name}</p>
               </div>
            ))}
         </div>
      </div>

      {/* Main Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-[#FAF7F2] overflow-hidden flex flex-col">
         
         {/* Filter Bar */}
         <div className="p-4 border-b border-[#FAF7F2] flex flex-wrap items-center gap-3 bg-gray-50/50">
            <div className="relative min-w-[200px]">
               <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
               <input type="text" placeholder="Search Vendor Name..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white shadow-sm" />
            </div>
            
            <div className="flex items-center gap-2">
               <div className="relative">
                 <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                 <input type="text" placeholder="Date Range" className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white shadow-sm cursor-pointer w-40" readOnly value="May 2026" />
               </div>
               
               <select className="px-3 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-600 bg-white shadow-sm focus:outline-none focus:border-[#66B4B1] outline-none appearance-none pr-8 cursor-pointer min-w-[140px]">
                 <option>All Categories</option>
                 <option>Pet Shop</option>
                 <option>Clinic</option>
                 <option>Grooming</option>
                 <option>Training</option>
               </select>

               <select className="px-3 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-600 bg-white shadow-sm focus:outline-none focus:border-[#66B4B1] outline-none appearance-none pr-8 cursor-pointer min-w-[140px]">
                 <option>All Statuses</option>
                 <option>Settled</option>
                 <option>Pending</option>
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
                     <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Vendor Name</th>
                     <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Category</th>
                     <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Orders Count</th>
                     <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Gross Revenue</th>
                     <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Commission Rate</th>
                     <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Commission Earned</th>
                     <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Settlement Status</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-[#FAF7F2]">
                  {vendors.map(v => (
                     <tr key={v.id} className="hover:bg-[#FAF7F2] transition group">
                        <td className="px-5 py-4">
                           <div className="flex flex-col">
                              <span className="text-[13px] font-bold text-gray-900">{v.name}</span>
                              <span className="text-[11px] text-gray-500 font-mono">{v.id}</span>
                           </div>
                        </td>
                        <td className="px-5 py-4">
                           <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[11px] font-medium">
                              {v.category}
                           </span>
                        </td>
                        <td className="px-5 py-4 text-[13px] font-semibold text-gray-700">{v.orders}</td>
                        <td className="px-5 py-4 text-[13px] font-semibold text-gray-900">{v.gross}</td>
                        
                        <td className="px-5 py-4">
                           {editingId === v.id ? (
                              <div className="flex items-center gap-2">
                                 <input 
                                    type="number" 
                                    value={editValue} 
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className="w-16 px-2 py-1 border border-[#66B4B1] rounded text-[13px] font-bold text-gray-900 focus:outline-none"
                                    autoFocus
                                 />
                                 <span className="text-[13px] text-gray-500">%</span>
                                 <button onClick={() => handleEditSave(v.id)} className="p-1 bg-[#66B4B1] text-white rounded hover:bg-[#66B4B1] transition">
                                    <Check size={14} />
                                 </button>
                              </div>
                           ) : (
                              <div className="flex items-center gap-2">
                                 <span className="text-[13px] font-bold text-indigo-600">{v.rate}%</span>
                                 <button onClick={() => startEdit(v)} className="p-1 text-gray-300 hover:text-gray-600 rounded transition opacity-0 group-hover:opacity-100">
                                    <Edit2 size={14} />
                                 </button>
                              </div>
                           )}
                        </td>

                        <td className="px-5 py-4 text-[13px] font-bold text-[#66B4B1]">{v.earned}</td>
                        <td className="px-5 py-4">
                           <div className={`px-2.5 py-1 rounded-full w-fit ${getStatusStyle(v.status)}`}>
                              <span className="text-[11px] font-bold">{v.status}</span>
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
