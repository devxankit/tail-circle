import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, MessageCircle, Mail, Phone, FileText, Loader2, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../../../services/api';

const CATEGORIES = [
  { value: 'order', label: 'Order' },
  { value: 'booking', label: 'Booking' },
  { value: 'payment', label: 'Payment' },
  { value: 'account', label: 'Account' },
  { value: 'pet', label: 'Pet' },
  { value: 'other', label: 'Other' },
];

const STATUS_STYLE = {
  open: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
};

export function HelpSupport() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ subject: '', category: 'other', message: '' });

  const loadTickets = useCallback(async () => {
    try {
      const { data } = await api.get('/support/tickets');
      setTickets(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleSubmit = async () => {
    setIsSaving(true);
    setError('');
    try {
      await api.post('/support/tickets', form);
      setForm({ subject: '', category: 'other', message: '' });
      setShowForm(false);
      await loadTickets();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-secondary animate-in slide-in-from-right-4 duration-300">
      <div className="bg-white px-4 pt-6 pb-4 flex items-center shadow-sm border-b border-border-light z-10 sticky top-0">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-primary hover:bg-bg-secondary rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-text-primary ml-2 flex-1">Help & Support</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <p className="text-sm text-text-secondary mb-6 text-center">How can we help you today?</p>

        <div className="bg-white rounded-[24px] border border-border-light mb-6 overflow-hidden shadow-sm">
          <button
            onClick={() => setShowForm((v) => !v)}
            className="w-full flex items-center p-4 hover:bg-bg-secondary transition-colors border-b border-border-light/50"
          >
            <MessageCircle size={20} className="text-primary-main mr-3" />
            <span className="flex-1 text-left text-sm font-semibold text-text-primary">Raise a Support Ticket</span>
          </button>
          <a href="mailto:support@tailcircle.in" className="w-full flex items-center p-4 hover:bg-bg-secondary transition-colors border-b border-border-light/50">
            <Mail size={20} className="text-primary-main mr-3" />
            <span className="flex-1 text-left text-sm font-semibold text-text-primary">Email Us</span>
          </a>
          <a href="tel:+919000000000" className="w-full flex items-center p-4 hover:bg-bg-secondary transition-colors border-b border-border-light/50">
            <Phone size={20} className="text-primary-main mr-3" />
            <span className="flex-1 text-left text-sm font-semibold text-text-primary">Call Us</span>
          </a>
          <button className="w-full flex items-center p-4 hover:bg-bg-secondary transition-colors">
            <FileText size={20} className="text-primary-main mr-3" />
            <span className="flex-1 text-left text-sm font-semibold text-text-primary">FAQs</span>
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-[24px] border border-border-light mb-6 p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
            <h3 className="font-bold text-text-primary mb-3">New Ticket</h3>
            <input
              type="text"
              placeholder="Subject"
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              className="w-full bg-bg-secondary border border-border-light rounded-2xl px-4 py-3 text-sm font-medium mb-3 outline-none focus:border-primary-main"
            />
            <div className="flex gap-2 flex-wrap mb-3">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, category: c.value }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                    form.category === c.value
                      ? 'bg-primary-main text-white border-primary-main'
                      : 'bg-white text-text-secondary border-border-light'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <textarea
              rows="4"
              placeholder="Describe your issue (min 10 characters)"
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              className="w-full bg-bg-secondary border border-border-light rounded-2xl px-4 py-3 text-sm font-medium mb-3 outline-none focus:border-primary-main resize-none"
            />
            {error && <p className="text-xs font-bold text-red-500 mb-3 text-center">{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={isSaving || form.subject.length < 3 || form.message.length < 10}
              className="w-full py-3 rounded-full font-bold text-white text-sm bg-primary-main disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {isSaving ? 'Submitting…' : 'Submit Ticket'}
            </button>
          </div>
        )}

        <h3 className="text-xs font-bold text-text-secondary uppercase pl-2 mb-2">My Tickets</h3>
        {isLoading ? (
          <div className="flex justify-center py-8 text-primary-main">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <p className="text-center text-sm text-text-secondary py-6">No tickets yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {tickets.map((t) => (
              <div key={t._id} className="bg-white rounded-[20px] border border-border-light p-4 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-text-disabled">{t.ticketNo}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${STATUS_STYLE[t.status] || ''}`}>
                    {t.status.replace('_', ' ')}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-text-primary">{t.subject}</h4>
                <p className="text-xs text-text-secondary mt-1 line-clamp-2">{t.message}</p>
                {t.replies?.length > 0 && (
                  <p className="text-[11px] font-bold text-primary-main mt-2">
                    {t.replies.length} repl{t.replies.length === 1 ? 'y' : 'ies'} — latest: {t.replies[t.replies.length - 1].message.slice(0, 60)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
