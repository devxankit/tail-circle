import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, Check, AlertCircle, RefreshCw, Flag, Wallet, Building2, CreditCard, Landmark, Download } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { ChartCard, CustomTooltip, COLORS } from '../../../components/ChartCard';
import { fetchAdminPaymentsOverview, fetchAdminTransactions } from '../../../../../services/admin';

const METHOD_COLORS = { UPI: COLORS.blue, Card: COLORS.purple, COD: COLORS.amber, Wallet: COLORS.teal, NetBanking: '#94A3B8', EMI: COLORS.red, Other: '#CBD5E0' };
// A backend Payment `method` → the gateway label + normalized method the UI renders.
const GATEWAY = (method) => {
  const m = (method || '').toLowerCase();
  if (m === 'wallet') return 'Internal Wallet';
  if (m === 'cod') return 'COD (Delivery)';
  return 'Razorpay';
};
const METHOD_DISPLAY = { UPI: 'UPI', CARD: 'Card', NETBANKING: 'NetBanking', WALLET: 'Wallet', COD: 'Cash', EMI: 'EMI' };
const STATUS_MAP = { Success: 'Captured', Pending: 'Pending', Failed: 'Failed', Refund: 'Disputed' };

export function Payments() {
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const [payments, setPayments] = useState([]);
  const [overview, setOverview] = useState(null);
  const [paymentMethodData, setPaymentMethodData] = useState([]);

  useEffect(() => {
    fetchAdminPaymentsOverview()
      .then((o) => {
        setOverview(o);
        setPaymentMethodData((o.methodDistribution || []).map((d) => ({ ...d, color: METHOD_COLORS[d.name] || METHOD_COLORS.Other })));
      })
      .catch(() => {});
    fetchAdminTransactions()
      .then((rows) => {
        setPayments(
          rows.map((t) => ({
            id: t.id,
            ref: t.ref,
            customer: t.customer,
            vendor: t.vendor,
            amount: t.amount,
            gateway: GATEWAY(t.method),
            method: METHOD_DISPLAY[t.method] || (t.method || '—'),
            status: STATUS_MAP[t.status] || t.status,
            timestamp: t.date,
            reconciled: t.status === 'Success',
          }))
        );
      })
      .catch(() => {});
  }, []);

  const handleExportCSV = () => {
    const headers = "Payment ID,Reference,Customer,Vendor,Amount,Gateway,Method,Timestamp,Status\n";
    const csvContent = "data:text/csv;charset=utf-8," + headers + payments.map(p => `${p.id},"${p.ref}","${p.customer}","${p.vendor}","${p.amount.replace('₹', '')}","${p.gateway}","${p.method}","${p.timestamp}","${p.status}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "incoming_payments.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSV exported successfully!");
  };

  const getStatusStyle = (status) => {
    switch(status) {
      case 'Captured': return 'bg-emerald-100 text-emerald-700';
      case 'Pending': return 'bg-amber-100 text-amber-700';
      case 'Failed': return 'bg-red-100 text-red-700';
      case 'Disputed': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getGatewayIcon = (method) => {
    switch(method) {
      case 'UPI': return <Building2 size={14} className="text-blue-500" />;
      case 'Card': return <CreditCard size={14} className="text-indigo-500" />;
      case 'NetBanking': return <Landmark size={14} className="text-gray-500" />;
      case 'Wallet': return <Wallet size={14} className="text-[#66B4B1]" />;
      default: return <RefreshCw size={14} className="text-gray-400" />;
    }
  };

  const toggleReconcile = (id) => {
    setPayments(payments.map(p => p.id === id ? { ...p, reconciled: !p.reconcile, status: !p.reconciled ? 'Captured' : 'Disputed' } : p));
    showToast('Payment reconciliation status updated');
  };

  return (
    <div className="p-3 sm:p-6 max-w-[1500px] mx-auto bg-[#FAF7F2] min-h-screen pb-20 relative">
      
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 animate-slide-in-right">
          <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200 flex items-center gap-3">
             <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><Check size={14}/></div>
             <p className="text-[13px] font-bold text-gray-800">{toastMessage.text}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">Incoming Payments</h1>
          <p className="text-[13px] text-gray-500 mt-1">Manage incoming platform payments</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button onClick={handleExportCSV} className="flex justify-center w-full sm:w-auto items-center gap-2 px-4 py-2.5 sm:py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-[13px] font-semibold rounded-lg transition shadow-sm">
            <Download size={16} /> Export to CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 mb-8">
         {/* Stats */}
         <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm flex flex-col justify-between">
              <h3 className="text-[13px] text-gray-500 font-medium">Total Collected Today</h3>
              <p className="text-[26px] font-bold text-emerald-600">₹{(overview?.collectedToday ?? 0).toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm flex flex-col justify-between">
              <h3 className="text-[13px] text-gray-500 font-medium">This Month</h3>
              <p className="text-[26px] font-bold text-gray-900">₹{(overview?.thisMonth ?? 0).toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm flex flex-col justify-between">
              <h3 className="text-[13px] text-gray-500 font-medium">UPI Share %</h3>
              <p className="text-[26px] font-bold text-blue-600">{overview?.upiSharePct ?? 0}%</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm flex flex-col justify-between">
              <h3 className="text-[13px] text-gray-500 font-medium">COD Share %</h3>
              <p className="text-[26px] font-bold text-gray-900">{overview?.codSharePct ?? 0}%</p>
            </div>
         </div>

         {/* Distribution Chart (Simple Visual) */}
         <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm flex flex-col items-center justify-center relative min-h-[200px]">
            <h3 className="text-[13px] text-gray-500 font-medium absolute top-5 left-5">Method Distribution</h3>
            <div className="relative mt-4 w-32 h-32">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={paymentMethodData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2} dataKey="value" animationDuration={600}>
                     {paymentMethodData.map((d,i)=><Cell key={i} fill={d.color} stroke="none"/>)}
                   </Pie>
                   <RechartsTooltip content={<CustomTooltip/>}/>
                 </PieChart>
               </ResponsiveContainer>
            </div>
            <div className="flex gap-4 mt-2 w-full justify-center">
               {paymentMethodData.map((d, i) => (
                 <div key={i} className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{background:d.color}}></span><span className="text-[11px] text-gray-600">{d.name}</span></div>
               ))}
            </div>
         </div>
      </div>

      {/* Main Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-[#FAF7F2] overflow-hidden flex flex-col">
         
         {/* Filter Bar */}
         <div className="p-4 border-b border-[#FAF7F2] flex flex-col lg:flex-row gap-3 bg-gray-50/50">
            <div className="relative w-full lg:w-[250px] shrink-0">
               <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
               <input type="text" placeholder="Search Payment ID, Ref..." className="w-full pl-9 pr-3 py-2.5 sm:py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white shadow-sm" />
            </div>
            
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full">
               <div className="relative col-span-2 sm:col-span-1 sm:w-auto">
                 <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                 <input type="text" placeholder="Date Range" className="w-full sm:w-40 pl-9 pr-3 py-2.5 sm:py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white shadow-sm cursor-pointer" readOnly value="May 29, 2026" />
               </div>
               
               <select className="col-span-1 px-3 py-2.5 sm:py-2 border border-gray-200 rounded-lg text-[13px] text-gray-600 bg-white shadow-sm focus:outline-none focus:border-[#66B4B1] outline-none appearance-none cursor-pointer w-full sm:w-auto">
                 <option>All Gateways</option>
                 <option>Razorpay</option>
                 <option>Stripe</option>
                 <option>COD</option>
               </select>

               <select className="col-span-1 px-3 py-2.5 sm:py-2 border border-gray-200 rounded-lg text-[13px] text-gray-600 bg-white shadow-sm focus:outline-none focus:border-[#66B4B1] outline-none appearance-none cursor-pointer w-full sm:w-auto">
                 <option>All Statuses</option>
                 <option>Captured</option>
                 <option>Pending</option>
                 <option>Failed</option>
                 <option>Disputed</option>
               </select>
               
               <button onClick={() => showToast("Filters applied")} className="col-span-2 sm:col-span-1 justify-center px-4 py-2.5 sm:py-2 border border-gray-200 rounded-lg text-[13px] text-gray-600 bg-white hover:bg-gray-50 shadow-sm transition flex items-center gap-2 w-full sm:w-auto">
                 <Filter size={14} /> Filters
               </button>
            </div>
         </div>

         {/* Data Table */}
         <div className="overflow-x-auto min-h-[500px]">
            <table className="w-full text-left border-collapse min-w-[800px] whitespace-nowrap">
               <thead className="bg-[#FAF7F2] border-b border-[#FAF7F2]">
                  <tr>
                     <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Payment ID</th>
                     <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Reference</th>
                     <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                     <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Vendor</th>
                     <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                     <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Gateway</th>
                     <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Timestamp</th>
                     <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                     <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-[#FAF7F2]">
                  {payments.map(p => (
                     <tr key={p.id} className="hover:bg-[#FAF7F2] transition group">
                        <td className="px-5 py-4">
                           <span className="text-[13px] font-semibold text-gray-900">{p.id}</span>
                        </td>
                        <td className="px-5 py-4 text-[13px] text-[#66B4B1] font-medium">{p.ref}</td>
                        <td className="px-5 py-4 text-[13px] text-gray-800">{p.customer}</td>
                        <td className="px-5 py-4 text-[13px] font-medium text-gray-700">{p.vendor}</td>
                        <td className="px-5 py-4 text-[13px] font-bold text-gray-900">{p.amount}</td>
                        <td className="px-5 py-4">
                           <div className="flex items-center gap-2">
                              {getGatewayIcon(p.method)}
                              <span className="text-[13px] text-gray-600 font-medium">{p.gateway}</span>
                           </div>
                        </td>
                        <td className="px-5 py-4 text-[12px] text-gray-500">{p.timestamp}</td>
                        <td className="px-5 py-4">
                           <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full w-fit ${getStatusStyle(p.status)}`}>
                              <span className="text-[11px] font-bold">{p.status}</span>
                           </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                           <button 
                              onClick={() => toggleReconcile(p.id)}
                              className={`p-1.5 rounded transition border ${p.reconciled ? 'border-[#66B4B1] text-[#66B4B1] bg-[#FAF7F2]' : 'border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200'}`} 
                              title={p.reconciled ? 'Reconciled' : 'Flag for Reconciliation'}
                           >
                              <Flag size={14} className={p.reconciled ? 'fill-[#66B4B1]' : ''} />
                           </button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
         
         <div className="p-4 border-t border-[#FAF7F2] flex flex-col sm:flex-row items-center justify-between bg-white gap-4 sm:gap-0">
            <p className="text-[13px] text-gray-500 font-medium text-center sm:text-left">Showing 1 to 7 of 1,284 entries</p>
            <div className="flex gap-1">
               <button onClick={() => showToast("Already on first page", "info")} className="px-3 py-1.5 border border-gray-200 rounded text-[13px] font-medium text-gray-400 cursor-not-allowed">Previous</button>
               <button className="px-3 py-1.5 bg-[#66B4B1] text-white rounded text-[13px] font-medium">1</button>
               <button onClick={() => showToast("Loading page 2...")} className="px-3 py-1.5 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded text-[13px] font-medium transition">2</button>
               <button onClick={() => showToast("Loading next page...")} className="px-3 py-1.5 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded text-[13px] font-medium transition">Next</button>
            </div>
         </div>
      </div>

    </div>
  );
}
