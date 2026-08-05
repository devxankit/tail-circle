import React, { useState, useEffect, useRef } from 'react';
import { Save, User, Plus, Check, ShieldAlert, Loader2, Send, Info } from 'lucide-react';
import { fetchVendorLedger, fetchVendorPayouts, requestVendorPayout, changeVendorPassword } from '../../../services/vendor';
import { fetchMyTickets, createSupportTicket, replySupportTicket } from '../../../services/support';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';

const rupees = (paise) => Math.round((paise || 0) / 100);

/* =========================================================================
   2. VENDOR PAYOUTS COMPONENT — real ledger + payouts (GET /vendor/ledger,
   GET /vendor/payouts, POST /vendor/payouts/request). Works for any vendor
   type since those endpoints scope by the caller's own userId.
   ========================================================================= */
export function VendorPayouts() {
  const [ledger, setLedger] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([fetchVendorLedger(), fetchVendorPayouts()])
      .then(([l, p]) => { setLedger(l); setPayouts(p); })
      .catch((e) => setError(e?.response?.data?.message || 'Could not load payout data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const unsettled = ledger.filter((l) => l.status === 'unsettled');
  const pendingNet = unsettled.reduce((s, l) => s + l.net, 0);
  const settledPayouts = payouts.filter((p) => p.status === 'paid');
  const grossPaid = settledPayouts.reduce((s, p) => s + p.netAmount, 0);
  const totalCommission = ledger.reduce((s, l) => s + l.commission, 0);
  const totalGross = ledger.reduce((s, l) => s + l.gross, 0);
  const commissionPct = totalGross ? Math.round((totalCommission / totalGross) * 100) : 0;

  const handleRequestPayout = async () => {
    setRequesting(true);
    try {
      await requestVendorPayout();
      load();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not request payout');
    } finally {
      setRequesting(false);
    }
  };

  const payoutColumns = [
    { key: '_id', label: 'Payout ID', render: (row) => row._id.slice(-8).toUpperCase() },
    { key: 'period', label: 'Period', sortable: true },
    { key: 'netAmount', label: 'Amount Settled', sortable: true, render: (row) => `₹${rupees(row.netAmount).toLocaleString('en-IN')}` },
    {
      key: 'status',
      label: 'State',
      render: (row) => {
        let style = "bg-gray-50 text-gray-600 border-gray-200";
        if (row.status === 'paid') style = "bg-emerald-50 text-emerald-600 border-emerald-100";
        if (row.status === 'pending') style = "bg-amber-50 text-amber-600 border-amber-100";
        return (
          <span className={`px-2 py-0.5 border rounded text-[10px] font-bold uppercase flex items-center gap-1 self-start max-w-max ${style}`}>
            <Check size={10} /> {row.status}
          </span>
        );
      }
    },
    { key: 'utr', label: 'UTR', render: (row) => row.utr || '—' },
  ];

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 size={26} className="animate-spin text-gray-400" /></div>;

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 border border-red-100 text-red-700 text-sm font-semibold rounded-xl p-4">{error}</div>}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Settled</p>
          <h3 className="text-2xl font-bold text-gray-800 mt-1">₹{rupees(grossPaid).toLocaleString('en-IN')}</h3>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Payout</p>
          <h3 className="text-2xl font-bold text-gray-800 mt-1">₹{rupees(pendingNet).toLocaleString('en-IN')}</h3>
          <p className="text-[11px] text-gray-400 mt-1">{unsettled.length} unsettled {unsettled.length === 1 ? 'entry' : 'entries'}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Platform Commission</p>
          <h3 className="text-2xl font-bold text-purple-600 mt-1">{commissionPct}%</h3>
        </div>
      </div>

      <button
        onClick={handleRequestPayout}
        disabled={requesting || unsettled.length === 0}
        className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-black disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-bold rounded-xl transition cursor-pointer"
      >
        {requesting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        {unsettled.length === 0 ? 'Nothing to settle' : 'Request Payout'}
      </button>

      <div className="space-y-3">
        <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Payout History</h4>
        <DataTable
          columns={payoutColumns}
          data={payouts}
          emptyMessage="No payouts requested yet."
        />
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Ledger (Unsettled + Settled)</h4>
        <DataTable
          columns={[
            { key: 'createdAt', label: 'Date', render: (row) => new Date(row.createdAt).toLocaleDateString('en-IN') },
            { key: 'refType', label: 'Source' },
            { key: 'gross', label: 'Gross', render: (row) => `₹${rupees(row.gross).toLocaleString('en-IN')}` },
            { key: 'net', label: 'Net', render: (row) => `₹${rupees(row.net).toLocaleString('en-IN')}` },
            { key: 'status', label: 'Status' },
          ]}
          data={ledger}
          emptyMessage="No ledger entries yet."
        />
      </div>
    </div>
  );
}

/* =========================================================================
   3. VENDOR SUPPORT COMPONENT — real tickets via GET/POST /support/tickets.
   The old "Client Reviews Queue" tab was fake local state with no backend;
   reviews are handled per-vertical (see each module's Feedback view) instead.
   ========================================================================= */
export function VendorSupport() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject: '', category: 'other', message: '' });
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    fetchMyTickets()
      .then(setTickets)
      .catch((e) => setError(e?.response?.data?.message || 'Could not load tickets'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newTicket.subject || newTicket.message.length < 10) return;
    setSaving(true);
    try {
      await createSupportTicket(newTicket);
      setModalOpen(false);
      setNewTicket({ subject: '', category: 'other', message: '' });
      load();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not open ticket');
    } finally {
      setSaving(false);
    }
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyText || !selectedTicket) return;
    setSaving(true);
    try {
      const updated = await replySupportTicket(selectedTicket._id, replyText);
      setSelectedTicket(updated);
      setReplyText('');
      load();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not send reply');
    } finally {
      setSaving(false);
    }
  };

  const ticketColumns = [
    { key: 'ticketNo', label: 'Ticket', render: (row) => <button onClick={() => setSelectedTicket(row)} className="font-bold text-purple-600 hover:underline">{row.ticketNo}</button> },
    { key: 'subject', label: 'Subject', sortable: true },
    { key: 'category', label: 'Category' },
    { key: 'createdAt', label: 'Date Filed', sortable: true, render: (row) => new Date(row.createdAt).toLocaleDateString('en-IN') },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase border ${
          row.status === 'resolved' || row.status === 'closed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
        }`}>
          {row.status.replace('_', ' ')}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-2">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Support Tickets</h3>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 transition shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <Plus size={14} />
          <span>Open Ticket</span>
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-100 text-red-700 text-sm font-semibold rounded-xl p-4">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={26} className="animate-spin text-gray-400" /></div>
      ) : (
        <DataTable
          columns={ticketColumns}
          data={tickets}
          searchKey="subject"
          searchPlaceholder="Search tickets..."
          emptyMessage="No support tickets yet."
        />
      )}

      {/* New Ticket Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Open Support Ticket"
        footer={(
          <>
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border border-gray-200 text-xs font-bold rounded-lg text-gray-500 hover:bg-gray-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateTicket}
              disabled={saving}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-xs font-bold rounded-lg transition cursor-pointer"
            >
              Submit Ticket
            </button>
          </>
        )}
      >
        <form onSubmit={handleCreateTicket} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Category *</label>
            <select
              value={newTicket.category}
              onChange={(e) => setNewTicket(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
            >
              <option value="payment">Payouts & Settlements</option>
              <option value="account">KYC / Compliance</option>
              <option value="other">Technical Issue</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Subject *</label>
            <input
              required
              value={newTicket.subject}
              onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Short summary"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Issue Description * (min 10 chars)</label>
            <textarea
              required
              value={newTicket.message}
              onChange={(e) => setNewTicket(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Describe the issue, including transaction or account details."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 min-h-[90px] bg-white"
            />
          </div>
        </form>
      </Modal>

      {/* Ticket Detail / Reply Modal */}
      <Modal
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        title={selectedTicket?.ticketNo}
        footer={(
          <>
            <button
              onClick={() => setSelectedTicket(null)}
              className="px-4 py-2 border border-gray-200 text-xs font-bold rounded-lg text-gray-500 hover:bg-gray-50 transition cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleReplySubmit}
              disabled={saving || !replyText}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-xs font-bold rounded-lg transition cursor-pointer"
            >
              Send Reply
            </button>
          </>
        )}
      >
        {selectedTicket && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
              <p className="text-xs font-bold text-gray-800">{selectedTicket.subject}</p>
              <p className="text-xs text-gray-600 mt-1">{selectedTicket.message}</p>
            </div>
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {(selectedTicket.replies || []).map((r, i) => (
                <div key={i} className={`p-2.5 rounded-lg text-xs ${r.by === 'support' ? 'bg-purple-50 text-purple-800' : 'bg-gray-100 text-gray-700'}`}>
                  <span className="font-bold uppercase text-[10px] tracking-wider block mb-0.5">{r.by === 'support' ? 'Support' : 'You'}</span>
                  {r.message}
                </div>
              ))}
              {!(selectedTicket.replies || []).length && <p className="text-xs text-gray-400">No replies yet.</p>}
            </div>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Add a reply..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 min-h-[70px] bg-white"
            />
          </div>
        )}
      </Modal>
    </div>
  );
}

/* =========================================================================
   5. VENDOR SETTINGS COMPONENT — password change is real (PATCH
   /vendor/password); the toggles below have no backend store yet and are
   labelled as a local draft rather than faked as persisted.
   ========================================================================= */
export function VendorSettings() {
  const [settings, setSettings] = useState({
    publicProfile: true,
    marketingEmails: false
  });

  const [saved, setSaved] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', next: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordDone, setPasswordDone] = useState(false);

  const toggleSetting = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    if (!passwords.current || passwords.next.length < 8) {
      setPasswordError('Enter your current password and a new one of at least 8 characters.');
      return;
    }
    setChangingPassword(true);
    try {
      await changeVendorPassword(passwords.current, passwords.next);
      setPasswords({ current: '', next: '' });
      setPasswordDone(true);
      setTimeout(() => setPasswordDone(false), 3000);
    } catch (err) {
      setPasswordError(err?.response?.data?.message || 'Could not change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const Toggle = ({ label, description, checked, onChange }) => (
    <div className="flex items-start justify-between py-4 border-b border-gray-100 last:border-0">
      <div className="pr-8">
        <h4 className="text-sm font-bold text-gray-900">{label}</h4>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </div>
      <button 
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#F3AB9D]/20 focus:ring-offset-2 ${checked ? 'bg-[#F87B68]' : 'bg-gray-200'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto pb-12 animate-in fade-in duration-500">
      
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Account Settings</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Manage your security, notifications, and privacy preferences.</p>
        </div>
        <button
          onClick={handleSave}
          className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white text-sm font-bold rounded-xl transition shadow-lg shadow-gray-900/20 cursor-pointer flex items-center gap-2"
        >
          <Save size={16} /> Save Draft
        </button>
      </div>

      {saved && (
        <div className="mb-6 p-4 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-2xl text-sm font-semibold flex items-center gap-3 shadow-sm animate-in slide-in-from-top-2">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0"><Check size={16} className="text-emerald-600" /></div>
          Saved to this screen only — see the notice below, these preferences aren't backed by the server yet.
        </div>
      )}

      <div className="space-y-6">
        {/* Security Section */}
        <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <ShieldAlert size={20} />
            </div>
            <h3 className="text-base font-bold text-gray-900">Security & Login</h3>
          </div>

          {passwordDone && (
            <div className="mb-4 p-3 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl text-xs font-semibold flex items-center gap-2">
              <Check size={14} /> Password updated.
            </div>
          )}
          {passwordError && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-100 rounded-xl text-xs font-semibold">{passwordError}</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="password"
              placeholder="Current password"
              value={passwords.current}
              onChange={(e) => setPasswords(p => ({ ...p, current: e.target.value }))}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F3AB9D]/20 focus:border-[#F87B68] bg-white"
            />
            <input
              type="password"
              placeholder="New password (min 8 chars)"
              value={passwords.next}
              onChange={(e) => setPasswords(p => ({ ...p, next: e.target.value }))}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F3AB9D]/20 focus:border-[#F87B68] bg-white"
            />
          </div>
          <button
            onClick={handleChangePassword}
            disabled={changingPassword}
            className="mt-3 px-4 py-2 bg-gray-900 hover:bg-black disabled:opacity-60 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-2"
          >
            {changingPassword && <Loader2 size={12} className="animate-spin" />} Change Password
          </button>
        </div>

        {/* Privacy Section */}
        <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <User size={20} />
            </div>
            <h3 className="text-base font-bold text-gray-900">Privacy & Data</h3>
          </div>

          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex gap-2">
            <Info size={14} className="shrink-0 mt-0.5" /> Not persisted yet — local draft only.
          </div>

          <div className="space-y-2">
            <Toggle 
              label="Public Profile Visibility" 
              description="Allow pet parents to find you in the Tail Circle global directory and book appointments."
              checked={settings.publicProfile}
              onChange={() => toggleSetting('publicProfile')}
            />
            <Toggle 
              label="Marketing & Promos" 
              description="Receive occasional offers, partner discounts, and feature announcements."
              checked={settings.marketingEmails}
              onChange={() => toggleSetting('marketingEmails')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}