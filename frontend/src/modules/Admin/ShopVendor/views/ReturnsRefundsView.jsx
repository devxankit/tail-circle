import React, { useState } from 'react';
import { useShopVendor } from '../context/ShopVendorContext';
import { useToast } from '../components/Toast';
import { resolveShopReturn } from '../../../../services/vendor';
import { RefreshCcw, Search, Filter, Eye, CheckCircle, XCircle, CreditCard, ChevronRight, X, AlertTriangle } from 'lucide-react';
import { cn } from '../../../user/utils/cn';

export function ReturnsRefundsView() {
  const { returns, refresh } = useShopVendor();
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [processing, setProcessing] = useState(false);

  const filteredReturns = returns.filter(r =>
    r.id.toLowerCase().includes(search.toLowerCase()) ||
    r.orderId.toLowerCase().includes(search.toLowerCase()) ||
    r.customer.toLowerCase().includes(search.toLowerCase())
  );

  // Backend only supports approve/reject — approving marks the return resolved
  // (order status 'returned'); there is no separate refund-processing step yet
  // (that needs a real Razorpay refund call, which this flow doesn't make).
  const processAction = async (req, action) => {
    setProcessing(true);
    try {
      await resolveShopReturn(req._id || req.id, action);
      await refresh();
      addToast({
        message: action === 'approve' ? 'Return request approved.' : 'Return request rejected.',
        type: action === 'approve' ? 'success' : 'error',
      });
      setSelectedRequest(null);
    } catch (err) {
      addToast({ message: err?.response?.data?.message || 'Could not update the return', type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Returns & Refunds</h2>
          <p className="text-sm font-semibold text-slate-500 mt-1">Manage product returns and process customer refunds.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by ID or Customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-full text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 transition shadow-sm"
            />
          </div>
          <button className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 shadow-sm transition cursor-pointer shrink-0">
            <Filter size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-250px)] min-h-[600px]">
        
        {/* Table View */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col overflow-hidden">
          <div className="overflow-x-auto flex-1 custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-500">Request Details</th>
                  <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-500">Product</th>
                  <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-500">Refund Amount</th>
                  <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReturns.map((req) => (
                  <tr 
                    key={req.id} 
                    onClick={() => setSelectedRequest(req)}
                    className={cn(
                      "hover:bg-slate-50 transition cursor-pointer group",
                      selectedRequest?.id === req.id && "bg-slate-50 border-l-4 border-l-slate-900"
                    )}
                  >
                    <td className="py-4 px-6">
                      <p className="text-sm font-black text-slate-900">{req.id}</p>
                      <p className="text-[11px] font-bold text-slate-500 mt-0.5">Order: {req.orderId}</p>
                      <p className="text-[11px] font-semibold text-slate-400 mt-1">{req.date}</p>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-sm font-bold text-slate-900 line-clamp-1">{req.product}</p>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">{req.customer}</p>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-sm font-black text-slate-900">₹{req.amount}</p>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">To Original Payment</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={cn("px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1", 
                        req.status === 'Requested' ? "bg-amber-100 text-amber-700" :
                        req.status === 'Approved' ? "bg-emerald-100 text-emerald-700" :
                        req.status === 'Refunded' ? "bg-blue-100 text-blue-700" :
                        "bg-slate-100 text-slate-600"
                      )}>
                        {req.status === 'Requested' && <AlertTriangle size={10} />}
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredReturns.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                  <RefreshCcw size={24} />
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-1">No return requests</h3>
                <p className="text-sm text-slate-500">You're all caught up!</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Panel */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
          {selectedRequest ? (
            <>
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-base font-black text-slate-900">{selectedRequest.id}</h3>
                  <p className="text-xs font-semibold text-slate-500">Order: <span className="font-bold">{selectedRequest.orderId}</span></p>
                </div>
                <button onClick={() => setSelectedRequest(null)} className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 transition cursor-pointer">
                  <X size={16} />
                </button>
              </div>
              
              <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6">
                
                <div className="space-y-1">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reason for Return</h4>
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                    <p className="text-sm font-bold text-amber-900">"{selectedRequest.reason}"</p>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Product to Return</h4>
                    <p className="text-sm font-semibold text-slate-900">{selectedRequest.product}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Customer Info</h4>
                    <p className="text-sm font-semibold text-slate-900">{selectedRequest.customer}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Refund Amount</h4>
                    <div className="flex items-center gap-2">
                      <p className="text-xl font-black text-slate-900">₹{selectedRequest.amount}</p>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Eligible</span>
                    </div>
                  </div>
                </div>

              </div>
              
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-3">
                {selectedRequest.status === 'Requested' && (
                  <>
                    <button disabled={processing} onClick={() => processAction(selectedRequest, 'approve')} className="w-full py-3.5 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">
                      <CheckCircle size={16} /> Approve Return
                    </button>
                    <button disabled={processing} onClick={() => processAction(selectedRequest, 'reject')} className="w-full py-3 border border-slate-200 text-red-600 hover:bg-red-50 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">
                      <XCircle size={16} /> Reject Request
                    </button>
                  </>
                )}
                {selectedRequest.status === 'Approved' && (
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                    <CreditCard size={16} /> Return approved — refund settlement isn't automated yet, process ₹{selectedRequest.amount} manually via Razorpay.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <Eye size={32} className="mb-4 opacity-30" />
              <p className="text-sm font-bold text-slate-600">Select a request</p>
              <p className="text-xs">Click on any request from the list to view details and process it.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
