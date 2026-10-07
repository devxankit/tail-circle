import React, { useState } from 'react';
import { usePetEvents } from '../context/PetEventsContext';
import { 
  MessageSquare, User,
  Send, Check
} from 'lucide-react';
import { cn } from '../../../user/utils/cn';
import { StatusBadge, EmptyState, InlineError, SectionLabel, StickyActionBar, PrimaryButton, fieldClass, textareaClass, labelClass, useSubScreen } from '../../vendor/mobile';

const REQUEST_TONE = { New: 'warning', 'Quotation Sent': 'info', Converted: 'success' };

export function CustomerRequestsView() {
  const { customerRequests, updateRequest } = usePetEvents();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteMessage, setQuoteMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  // The list-then-detail swap this screen already did, as a sub-screen.
  useSubScreen(selectedRequest ? { title: 'Request Details', onBack: () => setSelectedRequest(null) } : null);

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
      setError(err?.response?.data?.message || err?.message || 'Could not send quote');
    } finally {
      setSending(false);
    }
  };

  /* ── Detail & quote ── */
  if (selectedRequest) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-bg-secondary rounded-2xl flex items-center justify-center text-text-secondary font-black text-xl shrink-0">
            {selectedRequest.customer.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-[17px] font-black text-text-primary truncate">{selectedRequest.customer}</h4>
            <p className="text-sm font-semibold text-text-secondary flex items-center gap-1 mt-0.5">
              <User size={14}/> Pet: {selectedRequest.pet}
            </p>
          </div>
          <StatusBadge label={selectedRequest.status} tone={REQUEST_TONE[selectedRequest.status] || 'neutral'} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-[20px] border border-border-light shadow-sm">
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Event Type</p>
            <p className="text-sm font-black text-text-primary">{selectedRequest.type}</p>
          </div>
          <div className="bg-white p-4 rounded-[20px] border border-border-light shadow-sm">
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Preferred Date</p>
            <p className="text-sm font-black text-text-primary">{selectedRequest.date}</p>
          </div>
        </div>

        <div>
          <SectionLabel>Message</SectionLabel>
          <div className="bg-white p-4 rounded-[20px] border border-border-light shadow-sm text-sm font-medium text-text-primary leading-relaxed">
            {selectedRequest.message}
          </div>
        </div>

        <InlineError>{error}</InlineError>
        {selectedRequest.status === 'New' ? (
          <form id="event-quote-form" onSubmit={handleSendQuote} className="bg-white rounded-[20px] border border-border-light shadow-sm p-4 space-y-4">
            <h4 className="text-[15px] font-black text-text-primary">Send Quotation</h4>
            <div>
              <label className={labelClass}>Estimated Price (₹)</label>
              <input
                type="number"
                inputMode="numeric"
                required
                value={quoteAmount}
                onChange={e => setQuoteAmount(e.target.value)}
                className={cn(fieldClass, 'font-black text-success')}
                placeholder="e.g. 15000"
              />
            </div>
            <div>
              <label className={labelClass}>Message to Customer</label>
              <textarea
                value={quoteMessage}
                onChange={e => setQuoteMessage(e.target.value)}
                className={cn(textareaClass, 'resize-none')}
                rows={3}
                placeholder="Describe what's included..."
              />
            </div>
          </form>
        ) : (
          <div className="bg-white rounded-[20px] border border-border-light shadow-sm p-5 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/10 text-success mb-3">
              <Check size={24}/>
            </div>
            <h4 className="text-base font-black text-text-primary">Quotation Sent</h4>
            <p className="text-xs font-semibold text-text-secondary mt-1">Quoted {selectedRequest.budget}. Waiting for customer approval.</p>
            {selectedRequest.vendorNote && (
              <div className="mt-4 bg-bg-primary p-4 rounded-2xl border border-border-light text-sm font-medium text-text-primary leading-relaxed text-left">
                {selectedRequest.vendorNote}
              </div>
            )}
          </div>
        )}

        {selectedRequest.status === 'New' && (
          <StickyActionBar>
            <PrimaryButton type="submit" form="event-quote-form" tone="dark" disabled={sending} icon={Send}>
              {sending ? 'Sending...' : 'Send Quote'}
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
        <h2 className="text-lg font-bold text-text-primary leading-tight">Customer Requests</h2>
        <p className="text-xs text-text-secondary mt-1">Manage custom event inquiries and send quotes.</p>
      </div>

      {customerRequests.length === 0 ? (
        <EmptyState icon={MessageSquare} text="No customer requests yet." />
      ) : (
        <div className="space-y-3">
          {customerRequests.map(req => (
            <button
              key={req.id}
              type="button"
              onClick={() => setSelectedRequest(req)}
              className="w-full text-left p-4 rounded-[20px] border border-border-light bg-white shadow-sm transition cursor-pointer active:bg-bg-primary"
            >
              <div className="flex justify-between items-start gap-2 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-bg-secondary rounded-full flex items-center justify-center text-text-secondary font-bold shrink-0">
                    {req.customer.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-black text-text-primary truncate">{req.customer}</h3>
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mt-0.5">Pet: {req.pet}</p>
                  </div>
                </div>
                <StatusBadge label={req.status} tone={REQUEST_TONE[req.status] || 'neutral'} />
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-2 mb-3">
                <div className="col-span-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-text-secondary">Event Type</p>
                  <p className="text-[13px] font-semibold text-text-primary">{req.type}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-text-secondary">Preferred Date</p>
                  <p className="text-[13px] font-semibold text-text-primary">{req.date}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-text-secondary">Est. Budget</p>
                  <p className="text-[13px] font-black text-success">{req.budget}</p>
                </div>
              </div>

              <p className="text-sm text-text-secondary line-clamp-2 bg-bg-primary p-3 rounded-xl border border-border-light italic">"{req.message}"</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
