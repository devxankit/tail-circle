import React, { useState } from 'react';
import { useShopVendor } from '../context/ShopVendorContext';
import { useToast } from '../components/Toast';
import { replyToShopFeedback } from '../../../../services/vendor';
import { formatDate } from '../utils/formatDate';
import { Star, MessageSquare, CornerUpLeft, CheckCircle } from 'lucide-react';
import { cn } from '../../../user/utils/cn';
import { SearchBar, EmptyState, StickyActionBar, PrimaryButton, textareaClass, useSubScreen } from '../../vendor/mobile';

export function CustomerFeedbackView() {
  const { feedback, setFeedback, refresh } = useShopVendor();
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [activeFeedbackId, setActiveFeedbackId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const activeFeedback = feedback.find(f => f.id === activeFeedbackId);

  // The detail pane becomes its own screen; Back returns to the list.
  useSubScreen(activeFeedback ? { title: activeFeedback.customer, onBack: () => setActiveFeedbackId(null) } : null);

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
      addToast({ message: err?.response?.data?.message || err?.message || 'Could not send reply', type: 'error' });
    } finally {
      setSending(false);
    }
  };

  /* ── Detail ── */
  if (activeFeedback) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-start gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-full bg-text-primary text-white flex items-center justify-center font-bold text-lg shrink-0">
              {activeFeedback.customer.charAt(0)}
            </div>
            <div className="min-w-0">
              <h3 className="text-[17px] font-black text-text-primary truncate">{activeFeedback.customer}</h3>
              <p className="text-xs font-semibold text-text-secondary mt-0.5">Reference: {activeFeedback.orderId}</p>
            </div>
          </div>
          {activeFeedback.rating && (
            <div className="flex items-center gap-1 bg-warning/10 px-3 py-1.5 rounded-xl border border-warning/25 text-warning shrink-0">
              <Star size={16} fill="currentColor" />
              <span className="font-black text-sm">{activeFeedback.rating}.0</span>
            </div>
          )}
        </div>

        <div className="bg-white border border-border-light rounded-[20px] rounded-tl-md p-4 shadow-sm">
          <p className="text-sm font-semibold text-text-primary leading-relaxed">"{activeFeedback.message}"</p>
        </div>

        {/* Reply Box */}
        {activeFeedback.status !== 'Replied' && (
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2 px-1">
              <CornerUpLeft size={12} /> Reply to Customer
            </h4>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your response here... (shown publicly under the review)"
              rows={5}
              className={cn(textareaClass, 'resize-none')}
            />
          </div>
        )}

        {activeFeedback.status === 'Replied' && (
          <div className="space-y-3">
            <div className="bg-success/10 border border-success/25 rounded-[20px] p-4 flex items-center gap-3">
              <CheckCircle size={20} className="text-success shrink-0" />
              <div>
                <h4 className="text-sm font-black text-text-primary">Replied</h4>
                <p className="text-xs font-semibold text-text-secondary">Your response is now shown under this review.</p>
              </div>
            </div>
            {activeFeedback.reply && (
              <div className="bg-white border border-border-light rounded-[20px] rounded-tr-md p-4 shadow-sm">
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">Your Response</p>
                <p className="text-sm font-semibold text-text-primary leading-relaxed">"{activeFeedback.reply}"</p>
              </div>
            )}
          </div>
        )}

        {activeFeedback.status !== 'Replied' && (
          <StickyActionBar>
            <PrimaryButton tone="teal" disabled={!replyText || sending} loading={sending} onClick={handleSendReply}>
              Send Reply
            </PrimaryButton>
          </StickyActionBar>
        )}
      </div>
    );
  }

  /* ── List ── */
  return (
    <div className="space-y-4">
      <div className="px-1">
        <h2 className="text-lg font-bold text-text-primary leading-tight">Customer Feedback</h2>
        <p className="text-xs text-text-secondary mt-1">Manage reviews, queries, and complaints.</p>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search feedback..." />

      {filteredFeedback.length === 0 ? (
        <EmptyState icon={MessageSquare} text="No feedback found" />
      ) : (
        <div className="bg-white border border-border-light rounded-[20px] shadow-sm overflow-hidden">
          {filteredFeedback.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectFeedback(item)}
              className={cn(
                "w-full text-left p-4 active:bg-bg-primary transition relative",
                i > 0 && "border-t border-border-light"
              )}
            >
              {item.status === 'Unread' && <span className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-primary-main" />}
              <div className="flex justify-between items-start mb-1 pr-5 gap-2">
                <h4 className="text-sm font-bold text-text-primary">{item.customer}</h4>
                <span className="text-[10px] font-bold text-text-secondary shrink-0">{formatDate(item.date)}</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[9px] font-bold uppercase tracking-widest text-text-secondary bg-bg-secondary px-2 py-0.5 rounded">{item.type}</span>
                {item.rating && (
                  <div className="flex items-center gap-0.5 text-warning">
                    <Star size={11} fill="currentColor" />
                    <span className="text-[11px] font-bold">{item.rating}</span>
                  </div>
                )}
              </div>
              <p className="text-xs font-medium text-text-secondary line-clamp-2">{item.message}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
