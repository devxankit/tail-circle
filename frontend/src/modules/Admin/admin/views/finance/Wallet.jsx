import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Calendar, Check, AlertCircle, Wallet as WalletIcon, CreditCard, Gift, History, Plus, Minus, Users } from 'lucide-react';
import { fetchAdminWalletOverview, adjustAdminWallet } from '../../../../../services/admin';

export function Wallet() {
  const [toastMessage, setToastMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('wallets');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionType, setActionType] = useState('credit');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);

  const load = useCallback(() => {
    fetchAdminWalletOverview()
      .then((data) => {
        setWallets(data.wallets || []);
        setTransactions(data.transactions || []);
        setStats(data.stats || null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const getStatusStyle = (status) => {
    switch(status) {
      case 'Active': return 'bg-emerald-100 text-emerald-700';
      case 'Inactive': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTxnTypeStyle = (type) => {
    switch(type) {
      case 'Credit': return 'bg-emerald-100 text-emerald-700';
      case 'Debit': return 'bg-rose-100 text-rose-700';
      case 'Cashback': return 'bg-purple-100 text-purple-700';
      case 'Refund': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const openActionModal = (user) => {
    setSelectedUser(user);
    setAmount('');
    setReason('');
    setIsModalOpen(true);
  };

  const submitManualAction = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
       showToast('Please enter a valid amount', 'error');
       return;
    }
    if (!reason.trim()) {
       showToast('Please enter a reason', 'error');
       return;
    }

    try {
      await adjustAdminWallet(selectedUser.id, { action: actionType, amount: numAmount, reason: reason.trim() });
      showToast(`Successfully ${actionType === 'credit' ? 'credited' : 'debited'} ₹${numAmount} to ${selectedUser.customer}`);
      setIsModalOpen(false);
      load();
    } catch (e) {
      showToast(e?.response?.data?.message || 'Adjustment failed', 'error');
    }
  };

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
          <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">Customer Wallets</h1>
          <p className="text-[13px] text-gray-500 mt-1">Manage platform-wide customer wallet balances and transactions</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm flex flex-col justify-between">
          <h3 className="text-[13px] text-gray-500 font-medium">Total Wallet Balance</h3>
          <p className="text-[26px] font-bold text-gray-900">₹{(stats?.totalFloat ?? 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm flex flex-col justify-between">
          <h3 className="text-[13px] text-gray-500 font-medium">Wallets Loaded Today</h3>
          <p className="text-[26px] font-bold text-emerald-600">₹{(stats?.loadedToday ?? 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm flex flex-col justify-between">
          <h3 className="text-[13px] text-gray-500 font-medium">Redemptions Today</h3>
          <p className="text-[26px] font-bold text-gray-900">₹{(stats?.redemptionsToday ?? 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm flex flex-col justify-between">
          <h3 className="text-[13px] text-gray-500 font-medium">Cashback Issued (MTD)</h3>
          <p className="text-[26px] font-bold text-purple-600">₹{(stats?.cashbackMTD ?? 0).toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Tabs & Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-[#FAF7F2] overflow-hidden flex flex-col">
         
         <div className="border-b border-gray-200 flex items-center px-4">
            <button 
               onClick={() => setActiveTab('wallets')}
               className={`flex items-center gap-2 px-6 py-4 text-[14px] font-semibold transition border-b-2 ${activeTab === 'wallets' ? 'border-[#66B4B1] text-[#66B4B1]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
               <Users size={18} /> Customer Wallets
            </button>
            <button 
               onClick={() => setActiveTab('transactions')}
               className={`flex items-center gap-2 px-6 py-4 text-[14px] font-semibold transition border-b-2 ${activeTab === 'transactions' ? 'border-[#66B4B1] text-[#66B4B1]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
               <History size={18} /> Wallet Transactions
            </button>
         </div>

         {/* Filter Bar */}
         <div className="p-4 border-b border-[#FAF7F2] flex flex-wrap items-center gap-3 bg-gray-50/50">
            <div className="relative min-w-[200px]">
               <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
               <input type="text" placeholder={`Search ${activeTab === 'wallets' ? 'Customer, Phone' : 'Txn ID, Customer'}...`} className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white shadow-sm" />
            </div>
            
            <div className="flex items-center gap-2">
               {activeTab === 'transactions' && (
                 <>
                   <div className="relative">
                     <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                     <input type="text" placeholder="Date Range" className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white shadow-sm cursor-pointer w-40" readOnly value="May 2026" />
                   </div>
                   
                   <select className="px-3 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-600 bg-white shadow-sm focus:outline-none focus:border-[#66B4B1] outline-none appearance-none pr-8 cursor-pointer min-w-[140px]">
                     <option>All Types</option>
                     <option>Credit</option>
                     <option>Debit</option>
                     <option>Cashback</option>
                     <option>Refund</option>
                   </select>
                 </>
               )}
               
               {activeTab === 'wallets' && (
                 <select className="px-3 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-600 bg-white shadow-sm focus:outline-none focus:border-[#66B4B1] outline-none appearance-none pr-8 cursor-pointer min-w-[140px]">
                   <option>All Statuses</option>
                   <option>Active</option>
                   <option>Inactive</option>
                 </select>
               )}
               
               <button onClick={() => alert("Action triggered: Filters")} className="px-4 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-600 bg-white hover:bg-gray-50 shadow-sm transition flex items-center gap-2">
                 <Filter size={14} /> Filters
               </button>
            </div>
         </div>

         {/* Customer Wallets Table */}
         {activeTab === 'wallets' && (
            <div className="overflow-x-auto min-h-[400px]">
               <table className="w-full text-left border-collapse min-w-[800px] whitespace-nowrap">
                  <thead className="bg-[#FAF7F2] border-b border-[#FAF7F2]">
                     <tr>
                        <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                        <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Phone</th>
                        <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Balance</th>
                        <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Last Loaded</th>
                        <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Last Used</th>
                        <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-[#FAF7F2]">
                     {wallets.map(w => (
                        <tr key={w.id} className="hover:bg-[#FAF7F2] transition group">
                           <td className="px-5 py-4">
                              <span className="text-[13px] font-bold text-gray-900">{w.customer}</span>
                           </td>
                           <td className="px-5 py-4 text-[13px] font-medium text-gray-600">{w.phone}</td>
                           <td className="px-5 py-4">
                              <span className={`text-[14px] font-bold ${w.balance > 0 ? 'text-[#66B4B1]' : 'text-gray-400'}`}>₹{w.balance}</span>
                           </td>
                           <td className="px-5 py-4 text-[13px] text-gray-500">{w.lastLoaded}</td>
                           <td className="px-5 py-4 text-[13px] text-gray-500">{w.lastUsed}</td>
                           <td className="px-5 py-4">
                              <div className={`px-2.5 py-1 rounded-full w-fit ${getStatusStyle(w.status)}`}>
                                 <span className="text-[11px] font-bold">{w.status}</span>
                              </div>
                           </td>
                           <td className="px-5 py-4 text-right">
                              <button onClick={() => openActionModal(w)} className="px-3 py-1.5 border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded text-[12px] font-semibold transition inline-flex items-center gap-1.5">
                                 <WalletIcon size={14} /> Adjust Balance
                              </button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         )}

         {/* Wallet Transactions Table */}
         {activeTab === 'transactions' && (
            <div className="overflow-x-auto min-h-[400px]">
               <table className="w-full text-left border-collapse min-w-[800px] whitespace-nowrap">
                  <thead className="bg-[#FAF7F2] border-b border-[#FAF7F2]">
                     <tr>
                        <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Txn ID</th>
                        <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Date & Time</th>
                        <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                        <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Balance After</th>
                        <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Description</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-[#FAF7F2]">
                     {transactions.map(t => (
                        <tr key={t.id} className="hover:bg-[#FAF7F2] transition group">
                           <td className="px-5 py-4">
                              <span className="text-[13px] font-bold text-gray-900">{t.id}</span>
                           </td>
                           <td className="px-5 py-4 text-[13px] text-gray-500">{t.date}</td>
                           <td className="px-5 py-4 text-[13px] font-medium text-gray-800">{t.customer}</td>
                           <td className="px-5 py-4">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${getTxnTypeStyle(t.type)}`}>
                                {t.type}
                              </span>
                           </td>
                           <td className="px-5 py-4">
                              <span className={`text-[13px] font-bold ${t.type === 'Debit' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                 {t.type === 'Debit' ? '-' : '+'}₹{t.amount}
                              </span>
                           </td>
                           <td className="px-5 py-4 text-[13px] font-bold text-gray-700">₹{t.balanceAfter}</td>
                           <td className="px-5 py-4 text-[13px] text-gray-600">{t.desc}</td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         )}
      </div>

      {/* Manual Credit/Debit Modal */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm transition-all duration-300">
           <div className="bg-white rounded-xl shadow-xl w-[450px] overflow-hidden animate-fade-in">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                 <h2 className="text-[16px] font-semibold text-gray-900 flex items-center gap-2">
                    <WalletIcon size={18} className="text-[#66B4B1]" />
                    Adjust Wallet Balance
                 </h2>
              </div>
              <div className="p-6 space-y-5">
                 
                 <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 flex justify-between items-center">
                    <div>
                       <p className="text-[12px] text-gray-500 font-medium">Customer</p>
                       <p className="text-[14px] font-bold text-gray-900">{selectedUser.customer}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[12px] text-gray-500 font-medium">Current Balance</p>
                       <p className="text-[16px] font-bold text-[#66B4B1]">₹{selectedUser.balance}</p>
                    </div>
                 </div>

                 <div>
                    <label className="block text-[13px] font-semibold text-gray-700 mb-2">Action Type</label>
                    <div className="flex gap-3">
                       <button 
                          onClick={() => setActionType('credit')}
                          className={`flex-1 py-2.5 rounded-lg border text-[13px] font-semibold flex items-center justify-center gap-2 transition ${actionType === 'credit' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                       >
                          <Plus size={16} /> Credit Funds
                       </button>
                       <button 
                          onClick={() => setActionType('debit')}
                          className={`flex-1 py-2.5 rounded-lg border text-[13px] font-semibold flex items-center justify-center gap-2 transition ${actionType === 'debit' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                       >
                          <Minus size={16} /> Debit Funds
                       </button>
                    </div>
                 </div>

                 <div>
                    <label className="block text-[13px] font-semibold text-gray-700 mb-2">Amount (₹)</label>
                    <input 
                       type="number" 
                       value={amount}
                       onChange={(e) => setAmount(e.target.value)}
                       placeholder="Enter amount"
                       className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:border-[#66B4B1] bg-white shadow-sm"
                    />
                 </div>

                 <div>
                    <label className="block text-[13px] font-semibold text-gray-700 mb-2">Reason for Adjustment</label>
                    <input 
                       type="text" 
                       value={reason}
                       onChange={(e) => setReason(e.target.value)}
                       placeholder="e.g., Promotional cashback, Refund issue..."
                       className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:border-[#66B4B1] bg-white shadow-sm"
                    />
                 </div>

              </div>
              <div className="p-5 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/30">
                 <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-[13px] font-semibold transition">
                    Cancel
                 </button>
                 <button onClick={submitManualAction} className="px-6 py-2 bg-[#66B4B1] text-white hover:bg-[#66B4B1] rounded-lg text-[13px] font-semibold transition shadow-sm">
                    Confirm Action
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}
