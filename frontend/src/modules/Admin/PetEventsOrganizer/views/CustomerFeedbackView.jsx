import React, { useState } from 'react';
import { usePetEvents } from '../context/PetEventsContext';
import { 
  Star, MessageCircle, Reply, CheckCircle, Search, Filter
} from 'lucide-react';
import { cn } from '../../../user/utils/cn';

export function CustomerFeedbackView() {
  const { feedback, replyFeedback } = usePetEvents();
  const [selectedReview, setSelectedReview] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText) return;
    setSending(true);
    setError('');
    try {
      await replyFeedback(selectedReview.id, replyText);
      setSelectedReview((r) => ({ ...r, reply: replyText, status: 'Replied' }));
      setReplyText('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not post reply');
    } finally {
      setSending(false);
    }
  };

  const getStatusColor = (status) => {
    if(status === 'New') return 'bg-orange-100 text-orange-700 border-orange-200';
    if(status === 'Replied') return 'bg-blue-100 text-blue-700 border-blue-200';
    if(status === 'Resolved') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 flex h-full">
      
      {/* List */}
      <div className={cn("flex-1 transition-all duration-300", selectedReview ? "hidden lg:block lg:w-1/2" : "w-full")}>
        <div className="flex justify-between items-center bg-white p-5 rounded-3xl border border-slate-100 shadow-sm mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Customer Feedback</h2>
            <p className="text-sm font-semibold text-slate-500 mt-0.5">Manage reviews and ratings from attendees.</p>
          </div>
        </div>

        <div className="space-y-4">
          {feedback.map(fb => (
            <div 
              key={fb.id} 
              onClick={() => setSelectedReview(fb)}
              className={cn(
                "p-5 rounded-3xl border transition cursor-pointer group hover:shadow-md",
                selectedReview?.id === fb.id ? "bg-orange-50 border-orange-200" : "bg-white border-slate-100 hover:border-orange-200"
              )}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold">
                    {fb.customer.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">{fb.customer}</h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">{fb.date}</p>
                  </div>
                </div>
                <span className={cn("px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border", getStatusColor(fb.status))}>
                  {fb.status}
                </span>
              </div>
              
              <div className="flex gap-1 mb-3">
                {[1,2,3,4,5].map(star => (
                  <Star key={star} size={14} className={star <= fb.rating ? "fill-orange-500 text-orange-500" : "fill-slate-100 text-slate-200"} />
                ))}
              </div>
              
              <p className="text-sm font-bold text-slate-800 mb-2">Event: <span className="font-semibold text-slate-600">{fb.event}</span></p>
              
              <p className="text-sm text-slate-500 line-clamp-2 italic">"{fb.message}"</p>
            </div>
          ))}
        </div>
      </div>

      {/* Detail & Reply Panel */}
      {selectedReview && (
        <div className="w-full lg:w-1/2 lg:pl-6 animate-in slide-in-from-right-8">
          <div className="bg-white border border-slate-100 rounded-3xl shadow-xl overflow-hidden sticky top-6">
            <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <MessageCircle size={18} className="text-orange-500" /> Review Details
              </h3>
              <button 
                onClick={() => setSelectedReview(null)}
                className="lg:hidden p-2 text-slate-400 hover:text-slate-800 rounded-xl transition"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Customer Info */}
              <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 font-black text-2xl shadow-inner">
                  {selectedReview.customer.charAt(0)}
                </div>
                <div>
                  <h4 className="text-xl font-black text-slate-900">{selectedReview.customer}</h4>
                  <div className="flex gap-1 mt-1">
                    {[1,2,3,4,5].map(star => (
                      <Star key={star} size={14} className={star <= selectedReview.rating ? "fill-orange-500 text-orange-500" : "fill-slate-100 text-slate-200"} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Review Content */}
              <div className="space-y-4 border-b border-slate-100 pb-6">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Event: {selectedReview.event}</p>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm font-medium text-slate-700 leading-relaxed italic">
                  "{selectedReview.message}"
                </div>
              </div>

              {/* Reply Form */}
              {error && <div className="bg-red-50 border border-red-100 text-red-700 text-sm font-semibold rounded-2xl p-3">{error}</div>}
              {selectedReview.status === 'New' ? (
                <form onSubmit={handleReply} className="space-y-4">
                  <h4 className="text-sm font-black text-slate-900">Reply to Customer</h4>
                  <div>
                    <textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      required
                      className="w-full px-5 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-semibold resize-none"
                      rows={4}
                      placeholder="Write a professional response..."
                    />
                  </div>
                  <button type="submit" disabled={sending} className="w-full py-3 bg-slate-900 hover:bg-black disabled:opacity-60 text-white text-sm font-bold rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer">
                    <Reply size={16}/> {sending ? 'Sending...' : 'Post Reply'}
                  </button>
                </form>
              ) : (
                <div>
                  <div className="text-center mb-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 text-blue-500 mb-3">
                      <CheckCircle size={24}/>
                    </div>
                    <h4 className="text-base font-black text-slate-900">Reply Sent</h4>
                    <p className="text-xs font-semibold text-slate-500 mt-1">You have already responded to this review.</p>
                  </div>
                  {selectedReview.reply && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm font-medium text-slate-700 leading-relaxed">
                      {selectedReview.reply}
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
