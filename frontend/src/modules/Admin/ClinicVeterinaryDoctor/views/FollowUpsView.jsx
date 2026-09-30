import React, { useState } from 'react';
import { Phone, Calendar, CheckCircle, Activity, User, Plus, MessageSquare } from 'lucide-react';
import { useVendor } from '../context/ClinicVendorContext';
import { SearchBar, FilterChips, BottomSheet, PrimaryButton, EmptyState, InlineError, useVendorToast, errorMessage, fieldClass, textareaClass, labelClass } from '../../vendor/mobile';
import { callPhone, hasPhone } from '../utils/clinicActions';

const PRIORITY_STYLES = {
  High: 'bg-error/10 text-error border-error/20',
  Medium: 'bg-warning/10 text-warning border-warning/25',
  Low: 'bg-accent-teal/10 text-[#4C8684] border-accent-teal/25',
};

const STATUS_STYLES = {
  'Pending Call': 'text-warning',
  Scheduled: 'text-[#4C8684]',
  Completed: 'text-success',
  Rescheduled: 'text-text-secondary',
  'In Call': 'text-primary-main',
};

export function FollowUpsView() {
  const { followUps, addFollowUp, patchFollowUp } = useVendor();
  const { addToast } = useVendorToast();
  const [addError, setAddError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [processingId, setProcessingId] = useState(null);

  // Notes inline edit
  const [editingNotes, setEditingNotes] = useState(null);
  const [notesDraft, setNotesDraft] = useState('');

  // Add Follow-up modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newFU, setNewFU] = useState({ petName: '', owner: '', phone: '', reason: '', dueDate: '', priority: 'Medium' });
  const [addSuccess, setAddSuccess] = useState(false);

  // Reschedule modal
  const [rescheduleItem, setRescheduleItem] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');

  const filtered = followUps.filter(r => {
    const matchesSearch = r.petName.toLowerCase().includes(searchQuery.toLowerCase()) || r.owner.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pending = filtered.filter(f => f.status !== 'Completed').length;
  const done = filtered.filter(f => f.status === 'Completed').length;

  /*
   * A follow-up is a care call: this opens the phone dialler to the owner.
   * (It used to open the video-consultations list, which has no way to call
   * a follow-up, and silently ignored a failed status update.)
   */
  const handleCallNow = async (item) => {
    if (processingId) return;
    if (!hasPhone(item.phone)) {
      addToast({ message: `No phone number on file for ${item.owner || item.petName}.`, type: 'warning' });
      return;
    }
    setProcessingId(item.id);
    try {
      await patchFollowUp(item._id, { status: 'In Call' });
    } catch (err) {
      addToast({ message: errorMessage(err, 'Could not update the follow-up.'), type: 'error' });
    } finally {
      setProcessingId(null);
    }
    callPhone(item.phone);
  };

  const handleMarkDone = async (item) => {
    if (processingId) return;
    setProcessingId(item.id);
    try {
      await patchFollowUp(item._id, { status: 'Completed' });
    } catch (err) {
      addToast({ message: errorMessage(err, 'Could not complete the follow-up.'), type: 'error' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleDate) return;
    try {
      await patchFollowUp(rescheduleItem._id, { dueDate: rescheduleDate, status: 'Rescheduled' });
      addToast({ message: 'Follow-up rescheduled.', type: 'success' });
    } catch (err) {
      addToast({ message: errorMessage(err, 'Could not reschedule.'), type: 'error' });
      return;
    }
    setRescheduleItem(null);
    setRescheduleDate('');
  };

  const handleSaveNotes = async (item) => {
    try {
      await patchFollowUp(item._id, { notes: notesDraft });
    } catch (err) {
      addToast({ message: errorMessage(err, 'Could not save the notes.'), type: 'error' });
      return;
    }
    setEditingNotes(null);
    setNotesDraft('');
  };

  const handleAddFollowUp = async () => {
    if (!newFU.petName || !newFU.reason || !newFU.dueDate) return;
    setIsSaving(true);
    setAddError('');
    try {
      await addFollowUp(newFU);
      setShowAddModal(false);
      setNewFU({ petName: '', owner: '', phone: '', reason: '', dueDate: '', priority: 'Medium' });
      setAddSuccess(true);
      setTimeout(() => setAddSuccess(false), 3000);
    } catch (err) {
      setAddError(errorMessage(err, 'Could not schedule the follow-up.'));
    } finally {
      setIsSaving(false);
    }
  };

  const activeCount = followUps.filter(f => f.status !== 'Completed').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 px-1">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <Activity size={20} className="text-primary-main shrink-0" /> Patient Follow-Ups
          </h2>
          <p className="text-xs text-text-secondary mt-1">Manage post-visit care calls and recovery tracking. <span className="font-bold text-warning">{activeCount} active</span></p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="h-11 px-4 rounded-full bg-primary-main text-white text-sm font-bold flex items-center gap-1.5 shadow-md shadow-primary-main/25 shrink-0"
        >
          <Plus size={16} /> Add Follow-Up
        </button>
      </div>

      {/* Success notice */}
      {addSuccess && (
        <div className="flex items-center gap-3 bg-success/10 border border-success/20 text-success rounded-2xl p-3 text-sm font-bold shadow-sm">
          <CheckCircle size={18} /> Follow-Up scheduled successfully!
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Pending Calls', value: followUps.filter(f => f.status === 'Pending Call').length, color: 'text-warning bg-warning/10 border-warning/25' },
          { label: 'Scheduled', value: followUps.filter(f => f.status === 'Scheduled' || f.status === 'Rescheduled').length, color: 'text-[#4C8684] bg-accent-teal/10 border-accent-teal/25' },
          { label: 'Completed', value: followUps.filter(f => f.status === 'Completed').length, color: 'text-success bg-success/10 border-success/20' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border p-3 text-center ${s.color}`}>
            <p className="text-2xl font-black">{s.value}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide mt-1 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search patients..." />
      <FilterChips
        options={[{ value: 'All', label: 'All Status' }, 'Pending Call', 'Scheduled', 'Rescheduled', 'Completed']}
        value={statusFilter}
        onChange={setStatusFilter}
      />

      {/* Cards */}
      {filtered.length === 0 ? (
        <EmptyState icon={Activity} text="No follow-ups found matching your filters." />
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div key={item.id} className={`bg-white border border-border-light rounded-[20px] overflow-hidden shadow-sm ${item.status === 'Completed' ? 'opacity-70' : ''}`}>
              {/* Card Header */}
              <div className={`px-4 py-3 border-b flex justify-between items-center gap-2 ${item.dueDate === 'Today' ? 'bg-primary-light/30 border-primary-main/15' : 'bg-bg-primary border-border-light'}`}>
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${item.dueDate === 'Today' ? 'bg-primary-main/15 text-primary-dark' : 'bg-bg-secondary text-text-secondary'}`}>
                    Due: {item.dueDate}
                  </span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${PRIORITY_STYLES[item.priority] || 'bg-bg-primary text-text-secondary border-border-light'}`}>
                    {item.priority}
                  </span>
                </div>
                <span className={`text-xs font-bold shrink-0 ${STATUS_STYLES[item.status] || 'text-text-secondary'}`}>
                  {item.status === 'Completed' ? '✓ Done' : item.status}
                </span>
              </div>

              <div className="p-4">
                <h3 className="text-base font-bold text-text-primary">{item.petName}</h3>
                <p className="text-sm font-medium text-text-primary mt-1">{item.reason}</p>

                <div className="mt-3 pt-3 border-t border-border-light space-y-1.5">
                  <p className="text-xs text-text-secondary flex items-center gap-2"><User size={13} /> {item.owner}</p>
                  <p className="text-xs text-text-secondary flex items-center gap-2"><Phone size={13} /> {item.phone}</p>
                </div>

                {/* Notes section */}
                <div className="mt-2">
                  {editingNotes === item.id ? (
                    <div className="space-y-2">
                      <textarea
                        autoFocus
                        value={notesDraft}
                        onChange={(e) => setNotesDraft(e.target.value)}
                        rows={2}
                        placeholder="Type your notes..."
                        className={textareaClass}
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveNotes(item)} className="min-h-[40px] px-4 text-xs font-bold bg-text-primary text-white rounded-xl transition">Save</button>
                        <button onClick={() => setEditingNotes(null)} className="min-h-[40px] px-4 text-xs font-bold bg-bg-secondary text-text-secondary rounded-xl transition">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingNotes(item.id); setNotesDraft(item.notes || ''); }}
                      className="min-h-[40px] max-w-full text-xs text-text-secondary flex items-center gap-1.5 transition"
                    >
                      <MessageSquare size={13} className="shrink-0" />
                      {item.notes ? <span className="text-text-primary truncate">{item.notes}</span> : 'Add notes...'}
                    </button>
                  )}
                </div>
              </div>

              {/* Actions */}
              {item.status !== 'Completed' ? (
                <div className="px-4 pb-4 pt-3 border-t border-border-light flex gap-2">
                  <button
                    onClick={() => handleCallNow(item)}
                    disabled={processingId === item.id}
                    className={`flex-1 min-h-[44px] text-white rounded-xl text-[13px] font-bold transition flex items-center justify-center gap-1.5 shadow-sm ${processingId === item.id ? 'bg-primary-main/60 cursor-not-allowed' : 'bg-primary-main'}`}
                  >
                    <Phone size={15} /> {processingId === item.id ? 'Dialing...' : 'Call Now'}
                  </button>
                  <button
                    onClick={() => handleMarkDone(item)}
                    disabled={processingId === item.id}
                    className="flex-1 min-h-[44px] bg-white border border-border-light text-text-primary rounded-xl text-[13px] font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle size={15} /> Mark Done
                  </button>
                  <button
                    onClick={() => setRescheduleItem(item)}
                    className="w-11 min-h-[44px] bg-white border border-border-light text-text-secondary rounded-xl flex items-center justify-center transition shrink-0"
                    title="Reschedule"
                    aria-label="Reschedule"
                  >
                    <Calendar size={16} />
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-success/10 border-t border-success/15 flex items-center justify-center gap-2 text-success text-xs font-bold">
                  <CheckCircle size={14} /> Follow-Up Completed
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reschedule sheet */}
      <BottomSheet
        open={!!rescheduleItem}
        onClose={() => setRescheduleItem(null)}
        title="Reschedule Follow-Up"
        footer={(
          <div className="flex gap-2">
            <PrimaryButton tone="soft" onClick={() => setRescheduleItem(null)}>Cancel</PrimaryButton>
            <PrimaryButton tone="dark" onClick={handleReschedule} disabled={!rescheduleDate}>Confirm Reschedule</PrimaryButton>
          </div>
        )}
      >
        {rescheduleItem && (
          <div className="space-y-4 pb-2">
            <div className="bg-bg-primary border border-border-light rounded-2xl p-3">
              <p className="text-[10px] font-bold text-text-secondary uppercase mb-1">Patient</p>
              <p className="font-bold text-text-primary">{rescheduleItem.petName} — {rescheduleItem.owner}</p>
            </div>
            <div>
              <label className={labelClass}>New Follow-Up Date</label>
              <input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Add Follow-Up sheet */}
      <BottomSheet
        open={showAddModal}
        onClose={() => { if (!isSaving) setShowAddModal(false); }}
        title="Schedule Follow-Up"
        fullScreen
        footer={(
          <div className="flex gap-2">
            <PrimaryButton tone="soft" onClick={() => setShowAddModal(false)} disabled={isSaving}>Cancel</PrimaryButton>
            <PrimaryButton
              tone="dark"
              onClick={handleAddFollowUp}
              disabled={isSaving || !newFU.petName || !newFU.reason || !newFU.dueDate}
              loading={isSaving}
            >
              {isSaving ? 'Scheduling...' : 'Schedule Follow-Up'}
            </PrimaryButton>
          </div>
        )}
      >
        <div className="space-y-4 pb-2">
          <InlineError>{addError}</InlineError>
          <div>
            <label className={labelClass}>Pet Name *</label>
            <input value={newFU.petName} onChange={e => setNewFU(p => ({ ...p, petName: e.target.value }))} placeholder="e.g., Fluffy" className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Owner Name</label>
            <input value={newFU.owner} onChange={e => setNewFU(p => ({ ...p, owner: e.target.value }))} placeholder="e.g., Aisha Khan" className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input type="tel" inputMode="tel" value={newFU.phone} onChange={e => setNewFU(p => ({ ...p, phone: e.target.value }))} placeholder="+91-XXXXX-XXXXX" className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Priority</label>
            <select value={newFU.priority} onChange={e => setNewFU(p => ({ ...p, priority: e.target.value }))} className={fieldClass}>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Reason for Follow-Up *</label>
            <input value={newFU.reason} onChange={e => setNewFU(p => ({ ...p, reason: e.target.value }))} placeholder="e.g., Post-surgery check, medication review..." className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Due Date *</label>
            <input type="date" value={newFU.dueDate} onChange={e => setNewFU(p => ({ ...p, dueDate: e.target.value }))} className={fieldClass} />
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
