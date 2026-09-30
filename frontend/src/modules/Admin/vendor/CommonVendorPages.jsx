import React, { useState, useEffect } from 'react';
import { Save, User, Plus, Check, ShieldAlert, Send, Info, Wallet, ChevronRight, MessageSquare, KeyRound } from 'lucide-react';
import { fetchVendorLedger, fetchVendorPayouts, requestVendorPayout, changeVendorPassword, getVendorLines } from '../../../services/vendor';
import { VENDOR_TYPE_LABEL } from '../../../constants/vendorTypes';
import { fetchMyTickets, createSupportTicket, replySupportTicket } from '../../../services/support';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import {
  StatGrid, StatusBadge, StickyActionBar, PrimaryButton, SectionLabel, SearchBar, ListCard,
  EmptyState, SkeletonList, InlineError, FilterChips, Toggle as KitToggle, Select, Input,
  Textarea, fieldClass, textareaClass, useSubScreen,
} from './mobile';

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
  // Earnings are settled per account, not per business, so the totals here are
  // deliberately the combined figure. This filter only narrows the ledger view
  // so a vendor running several businesses can see what each one brought in.
  const [lineFilter, setLineFilter] = useState('all');

  const lines = getVendorLines();
  const isMultiLine = lines.length > 1;

  const load = () => {
    setLoading(true);
    Promise.all([fetchVendorLedger(), fetchVendorPayouts()])
      .then(([l, p]) => { setLedger(l); setPayouts(p); })
      .catch((e) => setError(e?.response?.data?.message || 'Could not load payout data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const visibleLedger = lineFilter === 'all' ? ledger : ledger.filter((l) => l.vendorType === lineFilter);
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
      render: (row) => (
        <StatusBadge
          status={row.status}
          label={<span className="inline-flex items-center gap-1"><Check size={10} /> {row.status}</span>}
        />
      ),
    },
    { key: 'utr', label: 'UTR', render: (row) => row.utr || '—' },
  ];

  if (loading) return <SkeletonList rows={4} />;

  return (
    <div className="space-y-5">
      <InlineError>{error}</InlineError>

      {/* Balance card — the Wallet screen's hero. */}
      <div className="bg-gradient-to-tr from-[#4C8684] to-[#80C1BF] text-white p-5 rounded-[28px] shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-x-10 -translate-y-10" />
        <p className="text-xs font-bold uppercase tracking-wide opacity-85">Pending Payout</p>
        <p className="text-[34px] font-black leading-none mt-1.5">₹{rupees(pendingNet).toLocaleString('en-IN')}</p>
        <p className="text-[11px] opacity-85 mt-2">{unsettled.length} unsettled {unsettled.length === 1 ? 'entry' : 'entries'}</p>
      </div>

      <StatGrid
        tiles={[
          { label: 'Total Settled', value: `₹${rupees(grossPaid).toLocaleString('en-IN')}`, icon: Wallet, tone: 'teal' },
          { label: 'Platform Commission', value: `${commissionPct}%`, icon: Info, tone: 'primary' },
        ]}
      />

      <div>
        <SectionLabel>Payout History</SectionLabel>
        <DataTable
          forceMobile
          columns={payoutColumns}
          data={payouts}
          emptyMessage="No payouts requested yet."
        />
      </div>

      <div className="space-y-3">
        <SectionLabel className="mb-0">Ledger (Unsettled + Settled)</SectionLabel>

        {/* Only shown to a vendor who runs more than one business — for
            everyone else there is nothing to filter between. */}
        {isMultiLine && (
          <FilterChips
            value={lineFilter}
            onChange={setLineFilter}
            options={[{ vendorType: 'all' }, ...lines].map(({ vendorType }) => ({
              value: vendorType,
              label: vendorType === 'all' ? 'All businesses' : VENDOR_TYPE_LABEL[vendorType] || vendorType,
            }))}
          />
        )}

        <DataTable
          forceMobile
          columns={[
            { key: 'createdAt', label: 'Date', render: (row) => new Date(row.createdAt).toLocaleDateString('en-IN') },
            ...(isMultiLine
              ? [{
                  key: 'vendorType',
                  label: 'Business',
                  // Entries written before per-line tagging have no vendorType.
                  render: (row) => VENDOR_TYPE_LABEL[row.vendorType] || '—',
                }]
              : []),
            { key: 'refType', label: 'Source' },
            { key: 'gross', label: 'Gross', render: (row) => `₹${rupees(row.gross).toLocaleString('en-IN')}` },
            { key: 'net', label: 'Net', render: (row) => `₹${rupees(row.net).toLocaleString('en-IN')}` },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
          ]}
          data={visibleLedger}
          emptyMessage="No ledger entries yet."
        />
      </div>

      <StickyActionBar aboveNav>
        <PrimaryButton
          onClick={handleRequestPayout}
          disabled={requesting || unsettled.length === 0}
          loading={requesting}
          icon={Send}
          tone="dark"
        >
          {unsettled.length === 0 ? 'Nothing to settle' : 'Request Payout'}
        </PrimaryButton>
      </StickyActionBar>
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
  const [searchQuery, setSearchQuery] = useState('');

  const load = () => {
    setLoading(true);
    fetchMyTickets()
      .then(setTickets)
      .catch((e) => setError(e?.response?.data?.message || 'Could not load tickets'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // An open ticket is its own screen: Back returns to the list.
  useSubScreen(selectedTicket ? { title: selectedTicket.ticketNo, onBack: () => setSelectedTicket(null) } : null);

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

  // The list's search box: the same subject match the table's search did.
  const visibleTickets = searchQuery.trim()
    ? tickets.filter((t) => String(t.subject).toLowerCase().includes(searchQuery.toLowerCase()))
    : tickets;

  /* ── Thread ── */
  if (selectedTicket) {
    return (
      <div className="space-y-3">
        <InlineError>{error}</InlineError>
        <div className="bg-white rounded-[20px] border border-border-light shadow-sm p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[15px] font-bold text-text-primary">{selectedTicket.subject}</p>
            <StatusBadge status={selectedTicket.status} label={String(selectedTicket.status || '').replace('_', ' ')} />
          </div>
          <p className="text-xs text-text-secondary mt-1">
            {selectedTicket.category} · {new Date(selectedTicket.createdAt).toLocaleDateString('en-IN')}
          </p>
        </div>

        {/* The opening message and every reply, as a chat. */}
        <div className="space-y-2.5 pt-1">
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-[20px] rounded-br-md bg-primary-main text-white px-4 py-3 text-sm leading-relaxed">
              {selectedTicket.message}
            </div>
          </div>
          {(selectedTicket.replies || []).map((r, i) => (
            <div key={i} className={`flex ${r.by === 'support' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[85%] rounded-[20px] px-4 py-3 text-sm leading-relaxed ${
                r.by === 'support'
                  ? 'rounded-bl-md bg-white border border-border-light text-text-primary'
                  : 'rounded-br-md bg-primary-main text-white'
              }`}>
                <span className="font-bold uppercase text-[10px] tracking-wider block mb-0.5 opacity-80">{r.by === 'support' ? 'Support' : 'You'}</span>
                {r.message}
              </div>
            </div>
          ))}
          {!(selectedTicket.replies || []).length && <p className="text-xs text-text-secondary text-center py-2">No replies yet.</p>}
        </div>

        <StickyActionBar>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Add a reply..."
            rows={1}
            className={`${textareaClass} flex-1 min-h-[48px] max-h-32 resize-none py-3`}
          />
          <button
            type="button"
            onClick={handleReplySubmit}
            disabled={saving || !replyText}
            aria-label="Send Reply"
            className="w-12 h-12 rounded-full bg-primary-main text-white flex items-center justify-center shrink-0 disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </StickyActionBar>
      </div>
    );
  }

  /* ── List ── */
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <SectionLabel className="mb-0">Support Tickets</SectionLabel>
        <button
          onClick={() => setModalOpen(true)}
          className="h-11 px-4 rounded-full bg-primary-main text-white text-sm font-bold flex items-center gap-1.5 shadow-md shadow-primary-main/25"
        >
          <Plus size={16} />
          <span>Open Ticket</span>
        </button>
      </div>

      <InlineError>{error}</InlineError>

      <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search tickets..." />

      {loading ? (
        <SkeletonList rows={3} />
      ) : !visibleTickets.length ? (
        <EmptyState icon={MessageSquare} text="No support tickets yet." />
      ) : (
        <div className="space-y-3">
          {visibleTickets.map((row) => (
            <ListCard
              key={row._id || row.ticketNo}
              title={row.subject}
              subtitle={`${row.ticketNo} · ${row.category} · ${new Date(row.createdAt).toLocaleDateString('en-IN')}`}
              badge={<StatusBadge status={row.status} label={row.status.replace('_', ' ')} />}
              onClick={() => setSelectedTicket(row)}
            />
          ))}
        </div>
      )}

      {/* New Ticket sheet */}
      <Modal
        forceSheet
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Open Support Ticket"
        footer={(
          <div className="flex gap-2">
            <PrimaryButton tone="soft" onClick={() => setModalOpen(false)}>Cancel</PrimaryButton>
            <PrimaryButton onClick={handleCreateTicket} disabled={saving} loading={saving}>Submit Ticket</PrimaryButton>
          </div>
        )}
      >
        <form onSubmit={handleCreateTicket} className="space-y-4">
          <Select
            label="Category *"
            value={newTicket.category}
            onChange={(v) => setNewTicket(prev => ({ ...prev, category: v }))}
            options={[
              { value: 'payment', label: 'Payouts & Settlements' },
              { value: 'account', label: 'KYC / Compliance' },
              { value: 'other', label: 'Technical Issue' },
            ]}
          />
          <Input
            label="Subject *"
            required
            value={newTicket.subject}
            onChange={(v) => setNewTicket(prev => ({ ...prev, subject: v }))}
            placeholder="Short summary"
          />
          <Textarea
            label="Issue Description * (min 10 chars)"
            required
            rows={4}
            value={newTicket.message}
            onChange={(v) => setNewTicket(prev => ({ ...prev, message: v }))}
            placeholder="Describe the issue, including transaction or account details."
          />
        </form>
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
  // Which screen is showing: the grouped settings, or the password sub-screen.
  const [passwordOpen, setPasswordOpen] = useState(false);

  useSubScreen(passwordOpen ? { title: 'Security & Login', onBack: () => setPasswordOpen(false) } : null);

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

  /* ── Password sub-screen ── */
  if (passwordOpen) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-[20px] border border-border-light shadow-sm p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-teal/10 flex items-center justify-center text-[#4C8684]">
              <ShieldAlert size={20} />
            </div>
            <h3 className="text-[15px] font-bold text-text-primary">Change password</h3>
          </div>

          {passwordDone && (
            <div className="p-3 bg-success/10 text-success border border-success/20 rounded-xl text-xs font-semibold flex items-center gap-2">
              <Check size={14} /> Password updated.
            </div>
          )}
          <InlineError>{passwordError}</InlineError>

          <input
            type="password"
            placeholder="Current password"
            autoComplete="current-password"
            value={passwords.current}
            onChange={(e) => setPasswords(p => ({ ...p, current: e.target.value }))}
            className={fieldClass}
          />
          <input
            type="password"
            placeholder="New password (min 8 chars)"
            autoComplete="new-password"
            value={passwords.next}
            onChange={(e) => setPasswords(p => ({ ...p, next: e.target.value }))}
            className={fieldClass}
          />
        </div>

        <StickyActionBar>
          <PrimaryButton onClick={handleChangePassword} disabled={changingPassword} loading={changingPassword} icon={KeyRound}>
            Change Password
          </PrimaryButton>
        </StickyActionBar>
      </div>
    );
  }

  /* ── Grouped settings ── */
  return (
    <div className="space-y-5">
      <div className="px-1">
        <h2 className="text-lg font-bold text-text-primary">Account Settings</h2>
        <p className="text-xs text-text-secondary mt-0.5">Manage your security, notifications, and privacy preferences.</p>
      </div>

      {saved && (
        <div className="p-4 bg-success/10 text-text-primary border border-success/20 rounded-[20px] text-sm font-semibold flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-success/15 flex items-center justify-center shrink-0"><Check size={16} className="text-success" /></div>
          Saved to this screen only — see the notice below, these preferences aren't backed by the server yet.
        </div>
      )}

      <div>
        <SectionLabel>Security</SectionLabel>
        <div className="bg-white rounded-[24px] border border-border-light overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => setPasswordOpen(true)}
            className="w-full flex items-center p-4 min-h-[56px] active:bg-bg-primary"
          >
            <ShieldAlert size={20} className="text-text-secondary mr-3" />
            <span className="flex-1 text-left">
              <span className="block text-sm font-semibold text-text-primary">Security & Login</span>
              <span className="block text-xs text-text-secondary">Change your password</span>
            </span>
            <ChevronRight size={20} className="text-text-disabled" />
          </button>
        </div>
      </div>

      <div>
        <SectionLabel>Privacy & Data</SectionLabel>
        <div className="bg-white rounded-[24px] border border-border-light overflow-hidden shadow-sm">
          <div className="m-4 mb-1 p-3 bg-warning/10 border border-warning/25 rounded-xl text-xs text-text-primary flex gap-2">
            <Info size={14} className="shrink-0 mt-0.5 text-warning" /> Not persisted yet — local draft only.
          </div>
          <div className="px-4 divide-y divide-border-light">
            <div className="flex items-center gap-3 py-2">
              <User size={20} className="text-text-secondary shrink-0" />
              <KitToggle
                label="Public Profile Visibility"
                hint="Allow pet parents to find you in the Tail Circle global directory and book appointments."
                checked={settings.publicProfile}
                onChange={() => toggleSetting('publicProfile')}
              />
            </div>
            <div className="flex items-center gap-3 py-2">
              <MessageSquare size={20} className="text-text-secondary shrink-0" />
              <KitToggle
                label="Marketing & Promos"
                hint="Receive occasional offers, partner discounts, and feature announcements."
                checked={settings.marketingEmails}
                onChange={() => toggleSetting('marketingEmails')}
              />
            </div>
          </div>
        </div>
      </div>

      <StickyActionBar>
        <PrimaryButton onClick={handleSave} icon={Save} tone="dark">Save Draft</PrimaryButton>
      </StickyActionBar>
    </div>
  );
}
