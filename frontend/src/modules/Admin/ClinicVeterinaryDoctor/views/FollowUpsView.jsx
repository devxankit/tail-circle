import React, { useState } from 'react';
import { Search, Phone, Calendar, CheckCircle, Activity, User, X, Plus, Clock, MessageSquare, AlertTriangle, ChevronDown } from 'lucide-react';
import { useVendor } from '../context/ClinicVendorContext';

const PRIORITY_STYLES = {
  High: 'bg-red-50 text-red-700 border-red-200',
  Medium: 'bg-amber-50 text-amber-700 border-amber-200',
  Low: 'bg-blue-50 text-blue-700 border-blue-200',
};

const STATUS_STYLES = {
  'Pending Call': 'text-amber-600',
  Scheduled: 'text-blue-600',
  Completed: 'text-emerald-600',
  Rescheduled: 'text-slate-500',
};

export function FollowUpsView({ onNavigate }) {
  const { followUps, addFollowUp, patchFollowUp } = useVendor();
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

  const handleCallNow = (item) => {
    if (processingId) return;
    setProcessingId(item.id);
    patchFollowUp(item._id, { status: 'In Call' }).catch(() => {});
    setTimeout(() => {
      setProcessingId(null);
      onNavigate('video_consultations');
    }, 700);
  };

  const handleMarkDone = async (item) => {
    if (processingId) return;
    setProcessingId(item.id);
    try {
      await patchFollowUp(item._id, { status: 'Completed' });
    } catch (err) {
      console.error('Failed to complete follow-up', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleDate) return;
    try {
      await patchFollowUp(rescheduleItem._id, { dueDate: rescheduleDate, status: 'Rescheduled' });
    } catch (err) {
      console.error('Failed to reschedule', err);
    }
    setRescheduleItem(null);
    setRescheduleDate('');
  };

  const handleSaveNotes = async (item) => {
    try {
      await patchFollowUp(item._id, { notes: notesDraft });
    } catch (err) {
      console.error('Failed to save notes', err);
    }
    setEditingNotes(null);
    setNotesDraft('');
  };

  const handleAddFollowUp = async () => {
    if (!newFU.petName || !newFU.reason || !newFU.dueDate) return;
    setIsSaving(true);
    try {
      await addFollowUp(newFU);
      setShowAddModal(false);
      setNewFU({ petName: '', owner: '', phone: '', reason: '', dueDate: '', priority: 'Medium' });
      setAddSuccess(true);
      setTimeout(() => setAddSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to add follow-up', err);
    } finally {
      setIsSaving(false);
    }
  };

  const activeCount = followUps.filter(f => f.status !== 'Completed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Activity className="text-[#F87B68]" /> Patient Follow-Ups
          </h2>
          <p className="text-xs text-gray-500 mt-1">Manage post-visit care calls and recovery tracking. <span className="font-bold text-amber-600">{activeCount} active</span></p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F87B68]/50 focus:border-[#F87B68] w-52 transition"
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 focus:outline-none focus:border-[#F87B68] cursor-pointer"
            >
              <option value="All">All Status</option>
              <option>Pending Call</option>
              <option>Scheduled</option>
              <option>Rescheduled</option>
              <option>Completed</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-900 transition flex items-center gap-2 shadow-sm"
          >
            <Plus size={16} /> Add Follow-Up
          </button>
        </div>
      </div>

      {/* Success Toast */}
      {addSuccess && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-3 text-sm font-bold shadow-sm">
          <CheckCircle size={18} /> Follow-Up scheduled successfully!
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending Calls', value: followUps.filter(f => f.status === 'Pending Call').length, color: 'text-amber-600 bg-amber-50 border-amber-200' },
          { label: 'Scheduled', value: followUps.filter(f => f.status === 'Scheduled' || f.status === 'Rescheduled').length, color: 'text-blue-600 bg-blue-50 border-blue-200' },
          { label: 'Completed', value: followUps.filter(f => f.status === 'Completed').length, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 text-center ${s.color}`}>
            <p className="text-2xl font-black">{s.value}</p>
            <p className="text-xs font-bold uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-3 text-center py-12 bg-white border border-dashed border-gray-300 rounded-xl">
            <p className="text-gray-500 text-sm">No follow-ups found matching your filters.</p>
          </div>
        ) : filtered.map((item) => (
          <div key={item.id} className={`bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition ${item.status === 'Completed' ? 'opacity-70 border-gray-200' : 'border-gray-200'}`}>
            {/* Card Header */}
            <div className={`p-4 border-b flex justify-between items-center ${item.dueDate === 'Today' ? 'bg-orange-50 border-orange-100' : 'bg-gray-50 border-gray-100'}`}>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${item.dueDate === 'Today' ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-600'}`}>
                  Due: {item.dueDate}
                </span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${PRIORITY_STYLES[item.priority] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                  {item.priority}
                </span>
              </div>
              <span className={`text-xs font-bold ${STATUS_STYLES[item.status] || 'text-gray-600'}`}>
                {item.status === 'Completed' ? '✓ Done' : item.status}
              </span>
            </div>

            <div className="p-5">
              <h3 className="text-base font-bold text-gray-900">{item.petName}</h3>
              <p className="text-sm font-medium text-gray-700 mt-1">{item.reason}</p>

              <div className="mt-4 pt-4 border-t border-gray-100 space-y-1.5">
                <p className="text-xs text-gray-600 flex items-center gap-2"><User size={13} className="text-gray-400" /> {item.owner}</p>
                <p className="text-xs text-gray-600 flex items-center gap-2"><Phone size={13} className="text-gray-400" /> {item.phone}</p>
              </div>

              {/* Notes section */}
              <div className="mt-3">
                {editingNotes === item.id ? (
                  <div className="space-y-1.5">
                    <textarea
                      autoFocus
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      rows={2}
                      placeholder="Type your notes..."
                      className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:border-[#F87B68] resize-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveNotes(item)} className="text-[10px] font-bold px-2 py-1 bg-slate-800 text-white rounded transition">Save</button>
                      <button onClick={() => setEditingNotes(null)} className="text-[10px] font-bold px-2 py-1 bg-gray-100 text-gray-600 rounded transition">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditingNotes(item.id); setNotesDraft(item.notes || ''); }}
                    className="text-xs text-gray-400 hover:text-[#F87B68] flex items-center gap-1.5 transition"
                  >
                    <MessageSquare size={12} />
                    {item.notes ? <span className="text-gray-600 truncate max-w-[180px]">{item.notes}</span> : 'Add notes...'}
                  </button>
                )}
              </div>
            </div>

            {/* Actions */}
            {item.status !== 'Completed' ? (
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2">
                <button
                  onClick={() => handleCallNow(item)}
                  disabled={processingId === item.id}
                  className={`flex-1 py-2 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm ${processingId === item.id ? 'bg-slate-800/60 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-900'}`}
                >
                  <Phone size={14} /> {processingId === item.id ? 'Dialing...' : 'Call Now'}
                </button>
                <button
                  onClick={() => handleMarkDone(item)}
                  disabled={processingId === item.id}
                  className="flex-1 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition flex items-center justify-center gap-1.5"
                >
                  <CheckCircle size={14} /> Mark Done
                </button>
                <button
                  onClick={() => setRescheduleItem(item)}
                  className="px-3 py-2 bg-white border border-gray-200 text-gray-500 rounded-lg text-xs hover:bg-gray-100 transition"
                  title="Reschedule"
                >
                  <Calendar size={14} />
                </button>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 border-t border-emerald-100 flex items-center justify-center gap-2 text-emerald-700 text-xs font-bold">
                <CheckCircle size={14} /> Follow-Up Completed
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Reschedule Modal */}
      {rescheduleItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2"><Calendar size={16} className="text-[#F87B68]" /> Reschedule Follow-Up</h3>
              <button onClick={() => setRescheduleItem(null)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Patient</p>
                <p className="font-bold text-gray-900">{rescheduleItem.petName} — {rescheduleItem.owner}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">New Follow-Up Date</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F87B68]"
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setRescheduleItem(null)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-lg transition">Cancel</button>
              <button
                onClick={handleReschedule}
                disabled={!rescheduleDate}
                className={`px-5 py-2 text-sm font-bold text-white rounded-lg transition shadow-sm ${!rescheduleDate ? 'bg-slate-800/50 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-900'}`}
              >
                Confirm Reschedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Follow-Up Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-black text-gray-900 flex items-center gap-2"><Plus size={18} className="text-[#F87B68]" /> Schedule Follow-Up</h3>
              <button onClick={() => setShowAddModal(false)} disabled={isSaving} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Pet Name *</label>
                <input value={newFU.petName} onChange={e => setNewFU(p => ({ ...p, petName: e.target.value }))} placeholder="e.g., Fluffy" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F87B68]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Owner Name</label>
                <input value={newFU.owner} onChange={e => setNewFU(p => ({ ...p, owner: e.target.value }))} placeholder="e.g., Aisha Khan" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F87B68]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Phone</label>
                <input value={newFU.phone} onChange={e => setNewFU(p => ({ ...p, phone: e.target.value }))} placeholder="+91-XXXXX-XXXXX" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F87B68]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Priority</label>
                <select value={newFU.priority} onChange={e => setNewFU(p => ({ ...p, priority: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F87B68]">
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Reason for Follow-Up *</label>
                <input value={newFU.reason} onChange={e => setNewFU(p => ({ ...p, reason: e.target.value }))} placeholder="e.g., Post-surgery check, medication review..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F87B68]" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Due Date *</label>
                <input type="date" value={newFU.dueDate} onChange={e => setNewFU(p => ({ ...p, dueDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F87B68]" />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setShowAddModal(false)} disabled={isSaving} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-lg transition">Cancel</button>
              <button
                onClick={handleAddFollowUp}
                disabled={isSaving || !newFU.petName || !newFU.reason || !newFU.dueDate}
                className={`px-6 py-2 text-sm font-bold text-white rounded-lg transition shadow-sm ${isSaving || !newFU.petName || !newFU.reason || !newFU.dueDate ? 'bg-slate-800/50 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-900'}`}
              >
                {isSaving ? 'Scheduling...' : 'Schedule Follow-Up'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
