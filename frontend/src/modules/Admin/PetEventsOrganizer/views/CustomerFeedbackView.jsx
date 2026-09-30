import React, { useState } from 'react';
import { usePetEvents } from '../context/PetEventsContext';
import { 
  Star, MessageCircle, Reply, CheckCircle
} from 'lucide-react';
import { cn } from '../../../user/utils/cn';
import { StatusBadge, EmptyState, InlineError, StickyActionBar, PrimaryButton, textareaClass, useSubScreen } from '../../vendor/mobile';

const FEEDBACK_TONE = { New: 'warning', Replied: 'info', Resolved: 'success' };

function Stars({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(star => (
        <Star key={star} size={14} className={star <= rating ? "fill-warning text-warning" : "fill-bg-secondary text-border-light"} />
      ))}
    </div>
  );
}

export function CustomerFeedbackView() {
  const { feedback, replyFeedback } = usePetEvents();
  const [selectedReview, setSelectedReview] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useSubScreen(selectedReview ? { title: 'Review Details', onBack: () => setSelectedReview(null) } : null);

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

  /* ── Detail & reply ── */
  if (selectedReview) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-bg-secondary rounded-2xl flex items-center justify-center text-text-secondary font-black text-xl shrink-0">
            {selectedReview.customer.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-[17px] font-black text-text-primary truncate">{selectedReview.customer}</h4>
            <div className="mt-1"><Stars rating={selectedReview.rating} /></div>
          </div>
          <StatusBadge label={selectedReview.status} tone={FEEDBACK_TONE[selectedReview.status] || 'neutral'} />
        </div>

        <div>
          <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2 px-1">Event: {selectedReview.event}</p>
          <div className="bg-white p-4 rounded-[20px] border border-border-light shadow-sm text-sm font-medium text-text-primary leading-relaxed italic">
            "{selectedReview.message}"
          </div>
        </div>

        <InlineError>{error}</InlineError>
        {selectedReview.status === 'New' ? (
          <form id="event-review-reply" onSubmit={handleReply} className="space-y-2">
            <h4 className="text-sm font-black text-text-primary px-1">Reply to Customer</h4>
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              required
              className={cn(textareaClass, 'resize-none')}
              rows={5}
              placeholder="Write a professional response..."
            />
          </form>
        ) : (
          <div className="bg-white rounded-[20px] border border-border-light shadow-sm p-5">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent-teal/10 text-[#4C8684] mb-3">
                <CheckCircle size={24}/>
              </div>
              <h4 className="text-base font-black text-text-primary">Reply Sent</h4>
              <p className="text-xs font-semibold text-text-secondary mt-1">You have already responded to this review.</p>
            </div>
            {selectedReview.reply && (
              <div className="bg-bg-primary p-4 rounded-2xl border border-border-light text-sm font-medium text-text-primary leading-relaxed">
                {selectedReview.reply}
              </div>
            )}
          </div>
        )}

        {selectedReview.status === 'New' && (
          <StickyActionBar>
            <PrimaryButton type="submit" form="event-review-reply" tone="dark" disabled={sending} icon={Reply}>
              {sending ? 'Sending...' : 'Post Reply'}
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
        <p className="text-xs text-text-secondary mt-1">Manage reviews and ratings from attendees.</p>
      </div>

      {feedback.length === 0 ? (
        <EmptyState icon={MessageCircle} text="No reviews yet." />
      ) : (
        <div className="space-y-3">
          {feedback.map(fb => (
            <button
              key={fb.id}
              type="button"
              onClick={() => setSelectedReview(fb)}
              className="w-full text-left p-4 rounded-[20px] border border-border-light bg-white shadow-sm transition cursor-pointer active:bg-bg-primary"
            >
              <div className="flex justify-between items-start gap-2 mb-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-bg-secondary rounded-full flex items-center justify-center text-text-secondary font-bold shrink-0">
                    {fb.customer.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-black text-text-primary truncate">{fb.customer}</h3>
                    <p className="text-[10px] font-bold text-text-secondary mt-0.5">{fb.date}</p>
                  </div>
                </div>
                <StatusBadge label={fb.status} tone={FEEDBACK_TONE[fb.status] || 'neutral'} />
              </div>
              <div className="mb-2"><Stars rating={fb.rating} /></div>
              <p className="text-[13px] font-bold text-text-primary mb-1">Event: <span className="font-semibold text-text-secondary">{fb.event}</span></p>
              <p className="text-sm text-text-secondary line-clamp-2 italic">"{fb.message}"</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
