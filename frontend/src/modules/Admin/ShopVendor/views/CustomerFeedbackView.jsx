import React, { useState } from 'react';
import { useShopVendor } from '../context/ShopVendorContext';
import { useToast } from '../components/Toast';
import { replyToShopFeedback } from '../../../../services/vendor';
import { Search, Star, MessageSquare, CornerUpLeft, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '../../../user/utils/cn';

export function CustomerFeedbackView() {
  const { feedback, setFeedback, refresh } = useShopVendor();
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [activeFeedbackId, setActiveFeedbackId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const activeFeedback = feedback.find(f => f.id === activeFeedbackId);

  const filteredFeedback = feedback.filter(f =>
    f.customer.toLowerCase().includes(search.toLowerCase()) ||
    f.message.toLowerCase().includes(search.toLowerCase()) ||
    f.type.toLowerCase().includes(search.toLowerCase()) ||
    f.id.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectFeedback = (item) => {
    setActiveFeedbackId(item.id);
    setReplyText(item.reply || '');
    // "Unread" here is client-side UI state only (no backend read-tracking) —
    // it doesn't overwrite the real Replied/Unread status from the server.
    if (item.status === 'Unread') {
      setFeedback(prev => prev.map(f => f.id === item.id ? { ...f, status: 'Read' } : f));
    }
  };

  const handleSendReply = async () => {
    if (!replyText || !activeFeedbackId) return;
    setSending(true);
    try {
      await replyToShopFeedback(activeFeedbackId, replyText);
      await refresh();
      addToast({ message: 'Reply saved.', type: 'success' });
    } catch (err) {
      addToast({ message: err?.response?.data?.message || 'Could not send reply', type: 'error' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Customer Feedback</h2>
          <p className="text-sm font-semibold text-slate-500 mt-1">Manage reviews, queries, and complaints.</p>
        </div>
      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col md:flex-row">
        
        {/* Left List */}
        <div className="w-full md:w-1/3 border-r border-slate-100 flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search feedback..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-full text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 transition"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredFeedback.map(item => (
              <div 
                key={item.id} 
                onClick={() => handleSelectFeedback(item)}
                className={cn(
                  "p-4 border-b border-slate-50 hover:bg-slate-50 transition cursor-pointer relative",
                  activeFeedback?.id === item.id && "bg-slate-50 border-l-4 border-l-slate-900"
                )}
              >
                {item.status === 'Unread' && <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[#F87B68]" />}
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-sm font-bold text-slate-900">{item.customer}</h4>
                  <span className="text-[10px] font-bold text-slate-400">{item.date}</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{item.type}</span>
                  {item.rating && (
                    <div className="flex items-center gap-0.5 text-yellow-500">
                      <Star size={10} fill="currentColor" />
                      <span className="text-[10px] font-bold">{item.rating}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs font-medium text-slate-600 line-clamp-2">{item.message}</p>
              </div>
            ))}
            {filteredFeedback.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-sm font-semibold">
                No feedback found
              </div>
            )}
          </div>
        </div>

        {/* Right Detail */}
        <div className="w-full md:w-2/3 flex flex-col bg-slate-50/30">
          {activeFeedback ? (
            <>
              <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-lg">
                      {activeFeedback.customer.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900">{activeFeedback.customer}</h3>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">Reference: {activeFeedback.orderId}</p>
                    </div>
                  </div>
                  {activeFeedback.rating && (
                    <div className="flex items-center gap-1 bg-yellow-50 px-3 py-1.5 rounded-lg border border-yellow-100 text-yellow-600">
                      <Star size={16} fill="currentColor" />
                      <span className="font-black text-sm">{activeFeedback.rating}.0</span>
                    </div>
                  )}
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-6 relative">
                  <div className="absolute -left-2 top-6 w-4 h-4 bg-white border-l border-b border-slate-200 transform rotate-45" />
                  <p className="text-sm font-semibold text-slate-800 leading-relaxed relative z-10">"{activeFeedback.message}"</p>
                </div>

                {/* Reply Box */}
                {activeFeedback.status !== 'Replied' && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <CornerUpLeft size={12} /> Reply to Customer
                    </h4>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your response here... (shown publicly under the review)"
                      className="w-full h-32 bg-white border border-slate-200 rounded-2xl p-4 text-sm font-medium text-slate-700 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition resize-none shadow-sm"
                    />
                  </div>
                )}
                
                {activeFeedback.status === 'Replied' && (
                  <div className="space-y-4">
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3">
                      <CheckCircle size={20} className="text-emerald-500 shrink-0" />
                      <div>
                        <h4 className="text-sm font-black text-emerald-900">Replied</h4>
                        <p className="text-xs font-semibold text-emerald-700">Your response is now shown under this review.</p>
                      </div>
                    </div>
                    {activeFeedback.reply && (
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative">
                        <div className="absolute -left-2 top-6 w-4 h-4 bg-white border-l border-b border-slate-200 transform rotate-45" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Your Response</p>
                        <p className="text-sm font-semibold text-slate-850 leading-relaxed relative z-10">"{activeFeedback.reply}"</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
                {activeFeedback.status !== 'Replied' && (
                  <button
                    disabled={!replyText || sending}
                    onClick={handleSendReply}
                    className="px-6 py-2.5 bg-[#40716F] hover:bg-black disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold shadow-md transition cursor-pointer flex items-center gap-2"
                  >
                    {sending && <Loader2 size={14} className="animate-spin" />} Send Reply
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
              <MessageSquare size={40} className="mb-4 opacity-20" />
              <p className="text-sm font-bold text-slate-600">No feedback selected</p>
              <p className="text-xs">Select a review or message from the left to read and respond.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
