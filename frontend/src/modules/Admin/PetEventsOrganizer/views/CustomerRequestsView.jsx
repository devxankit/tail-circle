import React, { useState } from 'react';
import { usePetEvents } from '../context/PetEventsContext';
import { 
  MessageSquare, User, Calendar, IndianRupee, 
  Send, X, Check, FileText
} from 'lucide-react';
import { cn } from '../../../user/utils/cn';

export function CustomerRequestsView() {
  const { customerRequests, updateRequest } = usePetEvents();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteMessage, setQuoteMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSendQuote = async (e) => {
    e.preventDefault();
    if (!quoteAmount) return;
    setSending(true);
    setError('');
    try {
      const updated = await updateRequest(selectedRequest.id, {
        status: 'Quotation Sent',
        budget: `₹${quoteAmount}`,
        vendorNote: quoteMessage,
      });
      setSelectedRequest(updated);
      setQuoteAmount('');
      setQuoteMessage('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not send quote');
    } finally {
      setSending(false);
    }
  };

  const getStatusColor = (status) => {
    if(status === 'New') return 'bg-orange-100 text-orange-700 border-orange-200';
    if(status === 'Quotation Sent') return 'bg-blue-100 text-blue-700 border-blue-200';
    if(status === 'Converted') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 flex h-full">
      
      {/* List */}
      <div className={cn("flex-1 transition-all duration-300", selectedRequest ? "hidden lg:block lg:w-1/2" : "w-full")}>
        <div className="flex justify-between items-center bg-white p-5 rounded-3xl border border-slate-100 shadow-sm mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Customer Requests</h2>
            <p className="text-sm font-semibold text-slate-500 mt-0.5">Manage custom event inquiries and send quotes.</p>
          </div>
        </div>

        <div className="space-y-4">
          {customerRequests.map(req => (
            <div 
              key={req.id} 
              onClick={() => setSelectedRequest(req)}
              className={cn(
                "p-5 rounded-3xl border transition cursor-pointer group hover:shadow-md",
                selectedRequest?.id === req.id ? "bg-orange-50 border-orange-200" : "bg-white border-slate-100 hover:border-orange-200"
              )}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold">
                    {req.customer.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">{req.customer}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Pet: {req.pet}</p>
                  </div>
                </div>
                <span className={cn("px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border", getStatusColor(req.status))}>
                  {req.status}
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <p className="text-sm font-bold text-slate-800">Event Type: <span className="font-semibold text-slate-600">{req.type}</span></p>
                <p className="text-sm font-bold text-slate-800">Preferred Date: <span className="font-semibold text-slate-600">{req.date}</span></p>
                <p className="text-sm font-bold text-slate-800">Est. Budget: <span className="font-black text-emerald-600">{req.budget}</span></p>
              </div>
              
              <p className="text-sm text-slate-500 line-clamp-2 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">"{req.message}"</p>
            </div>
          ))}
        </div>
      </div>

      {/* Detail & Quote Panel */}
      {selectedRequest && (
        <div className="w-full lg:w-1/2 lg:pl-6 animate-in slide-in-from-right-8">
          <div className="bg-white border border-slate-100 rounded-3xl shadow-xl overflow-hidden sticky top-6">
            <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <FileText size={18} className="text-orange-500" /> Request Details
              </h3>
              <button 
                onClick={() => setSelectedRequest(null)}
                className="lg:hidden p-2 text-slate-400 hover:text-slate-800 rounded-xl transition"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Customer Info */}
              <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 font-black text-2xl shadow-inner">
                  {selectedRequest.customer.charAt(0)}
                </div>
                <div>
                  <h4 className="text-xl font-black text-slate-900">{selectedRequest.customer}</h4>
                  <p className="text-sm font-semibold text-slate-500 flex items-center gap-1 mt-1">
                    <User size={14}/> Pet: {selectedRequest.pet}
                  </p>
                </div>
              </div>

              {/* Request Info */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Event Type</p>
                    <p className="text-sm font-black text-slate-900">{selectedRequest.type}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Preferred Date</p>
                    <p className="text-sm font-black text-slate-900">{selectedRequest.date}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Message</p>
                  <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100 text-sm font-medium text-slate-700 leading-relaxed">
                    {selectedRequest.message}
                  </div>
                </div>
              </div>

              {/* Action Form */}
              {error && <div className="bg-red-50 border border-red-100 text-red-700 text-sm font-semibold rounded-2xl p-3">{error}</div>}
              {selectedRequest.status === 'New' ? (
                <form onSubmit={handleSendQuote} className="pt-6 border-t border-slate-100 space-y-4">
                  <h4 className="text-sm font-black text-slate-900">Send Quotation</h4>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Estimated Price (₹)</label>
                    <input
                      type="number"
                      required
                      value={quoteAmount}
                      onChange={e => setQuoteAmount(e.target.value)}
                      className="w-full px-5 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-black text-emerald-600"
                      placeholder="e.g. 15000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Message to Customer</label>
                    <textarea
                      value={quoteMessage}
                      onChange={e => setQuoteMessage(e.target.value)}
                      className="w-full px-5 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-semibold resize-none"
                      rows={3}
                      placeholder="Describe what's included..."
                    />
                  </div>
                  <button type="submit" disabled={sending} className="w-full py-3 bg-slate-900 hover:bg-black disabled:opacity-60 text-white text-sm font-bold rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer">
                    <Send size={16}/> {sending ? 'Sending...' : 'Send Quote'}
                  </button>
                </form>
              ) : (
                <div className="pt-6 border-t border-slate-100 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 mb-3">
                    <Check size={24}/>
                  </div>
                  <h4 className="text-base font-black text-slate-900">Quotation Sent</h4>
                  <p className="text-xs font-semibold text-slate-500 mt-1">Quoted {selectedRequest.budget}. Waiting for customer approval.</p>
                  {selectedRequest.vendorNote && (
                    <div className="mt-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm font-medium text-slate-700 leading-relaxed text-left">
                      {selectedRequest.vendorNote}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
