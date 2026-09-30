import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMemorialProvider } from '../context/MemorialProviderContext';
import {
  MapPin, Calendar,
  Clock, CheckCircle, XCircle, Users, Plus, HeartHandshake,
} from 'lucide-react';
import {
  SearchBar, FilterChips, ListCard, StatusBadge, EmptyState, StickyActionBar, PrimaryButton,
  BottomSheet, SectionLabel, CardAction, textareaClass, labelClass, useSubScreen, useVendorToast,
} from '../../vendor/mobile';

const REQUEST_TONE = {
  Pending: 'warning', Accepted: 'info', Assigned: 'info', 'In Progress': 'primary',
  Completed: 'success', Declined: 'error', Cancelled: 'error',
};
const URGENCY_TONE = { Urgent: 'error', Priority: 'warning' };

export function ServiceRequestsView() {
  const { requests, updateRequestStatus, assignTeamToRequest, team } = useMemorialProvider();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedRequest, setSelectedRequest] = useState(null);
  
  // Drawer states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const { addToast } = useVendorToast();
  // "+ New Request" moved here from the header; the form lives in the layout.
  const { isVerified, openCreateRequest } = useOutletContext() || {};

  const filteredRequests = requests.filter(req => {
    const matchesSearch = req.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          req.petName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          req.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || req.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const openDrawer = (req) => {
    setSelectedRequest(req);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedRequest(null), 300);
  };

  const handleAction = async (status) => {
    if (!selectedRequest) return;
    try {
      const updated = await updateRequestStatus(selectedRequest.id, status);
      setSelectedRequest(updated);
    } catch (err) {
      addToast({ message: err?.response?.data?.message || 'Could not update this request', type: 'error' });
    }
  };

  // The side drawer becomes its own screen; Back closes it the same way.
  useSubScreen(isDrawerOpen && selectedRequest ? { title: selectedRequest.id, onBack: closeDrawer } : null);

  /* ── Request detail (was the side drawer) ── */
  if (isDrawerOpen && selectedRequest) {
    return (
      <div className="space-y-4">
        <div>
          <StatusBadge label={selectedRequest.status} tone={REQUEST_TONE[selectedRequest.status] || 'neutral'} />
          <h3 className="text-xl font-black text-text-primary leading-tight mt-2">{selectedRequest.serviceType}</h3>
          <p className="text-xs font-semibold text-text-secondary mt-1">{selectedRequest.id}</p>
        </div>

        {/* Pet & Customer */}
        <div className="flex items-center gap-4 bg-white p-4 rounded-[20px] border border-border-light shadow-sm">
          <div className="w-12 h-12 bg-bg-primary rounded-xl flex items-center justify-center text-text-secondary border border-border-light font-bold">
            {selectedRequest.petName.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-black text-text-primary">{selectedRequest.petName}</p>
            <p className="text-xs font-semibold text-text-secondary mt-0.5">Owner: {selectedRequest.customerName}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-3 rounded-2xl border border-border-light shadow-sm">
            <p className="text-[10px] font-bold text-text-secondary uppercase mb-1">Date & Time</p>
            <p className="text-xs font-bold text-text-primary flex items-center gap-1"><Calendar size={12}/> {selectedRequest.preferredDate}</p>
            <p className="text-xs font-bold text-text-primary flex items-center gap-1 mt-0.5"><Clock size={12}/> {selectedRequest.preferredTime}</p>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-border-light shadow-sm">
            <p className="text-[10px] font-bold text-text-secondary uppercase mb-1">Urgency</p>
            <StatusBadge label={selectedRequest.urgency} tone={URGENCY_TONE[selectedRequest.urgency] || 'neutral'} />
          </div>
        </div>

        <div>
          <SectionLabel>Location</SectionLabel>
          <div className="bg-white p-3 rounded-2xl border border-border-light shadow-sm flex gap-2">
            <MapPin size={14} className="text-text-secondary mt-0.5 shrink-0" />
            <p className="text-xs font-semibold text-text-primary">{selectedRequest.location}</p>
          </div>
        </div>

        {selectedRequest.notes && (
          <div>
            <SectionLabel>Customer Notes</SectionLabel>
            <div className="bg-warning/10 p-3 rounded-2xl border border-warning/20 text-text-primary text-xs font-medium leading-relaxed">
              "{selectedRequest.notes}"
            </div>
          </div>
        )}

        {selectedRequest.addons.length > 0 && (
          <div>
            <SectionLabel>Selected Add-ons</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {selectedRequest.addons.map(addon => (
                <span key={addon} className="px-3 py-1 bg-white border border-border-light text-text-primary text-[11px] font-bold rounded-full">
                  {addon}
                </span>
              ))}
            </div>
          </div>
        )}

        {selectedRequest.assignedTeam && (
          <div>
            <SectionLabel>Assigned Team</SectionLabel>
            <div className="flex items-center gap-3 bg-accent-teal/10 border border-accent-teal/25 p-3 rounded-2xl">
              <div className="w-8 h-8 rounded-full bg-accent-teal/20 flex items-center justify-center text-[#4C8684]">
                <Users size={14}/>
              </div>
              <p className="text-sm font-bold text-text-primary">{selectedRequest.assignedTeam}</p>
            </div>
          </div>
        )}

        {/* Actions — contextual on status, docked to the bottom. */}
        {['Pending', 'Accepted', 'Assigned', 'In Progress'].includes(selectedRequest.status) && (
          <StickyActionBar>
            {selectedRequest.status === 'Pending' && (
              <>
                <PrimaryButton tone="outline" className="text-error" onClick={() => setShowDeclineModal(true)}>
                  Decline
                </PrimaryButton>
                <PrimaryButton tone="dark" onClick={() => handleAction('Accepted')}>
                  Accept Request
                </PrimaryButton>
              </>
            )}
            {selectedRequest.status === 'Accepted' && (
              <PrimaryButton tone="dark" icon={Users} onClick={() => handleAction('Assigned')}>
                Assign Team
              </PrimaryButton>
            )}
            {selectedRequest.status === 'Assigned' && (
              <PrimaryButton tone="teal" onClick={() => handleAction('In Progress')}>
                Mark In Progress
              </PrimaryButton>
            )}
            {selectedRequest.status === 'In Progress' && (
              <PrimaryButton tone="teal" icon={CheckCircle} onClick={() => handleAction('Completed')}>
                Complete Service
              </PrimaryButton>
            )}
          </StickyActionBar>
        )}

        {/* Decline — a full-screen sheet form. The reason box was never read
            by the handler; that is unchanged. */}
        <BottomSheet
          open={showDeclineModal}
          onClose={() => setShowDeclineModal(false)}
          fullScreen
          title="Decline Request?"
          footer={(
            <div className="flex gap-2">
              <PrimaryButton tone="soft" onClick={() => setShowDeclineModal(false)}>Cancel</PrimaryButton>
              <PrimaryButton
                tone="danger"
                onClick={() => {
                  handleAction('Cancelled');
                  setShowDeclineModal(false);
                }}
              >
                Confirm Decline
              </PrimaryButton>
            </div>
          )}
        >
          <div className="pb-4">
            <div className="w-16 h-16 bg-error/10 rounded-2xl flex items-center justify-center text-error mb-5 border border-error/20">
              <XCircle size={32} />
            </div>
            <p className="text-sm font-semibold text-text-secondary mb-6">Are you sure you want to decline this request? This action cannot be undone.</p>

            <label className={labelClass}>Reason (Optional)</label>
            <textarea
              rows="4"
              placeholder="e.g., Fully booked for the day"
              className={textareaClass}
            ></textarea>
          </div>
        </BottomSheet>
      </div>
    );
  }

  /* ── Request list ── */
  return (
    <div className="space-y-4">

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-text-primary leading-tight">Service Requests</h2>
          <p className="text-xs text-text-secondary mt-1">Manage all end-of-life service requests.</p>
        </div>
        {isVerified && openCreateRequest && (
          <button
            onClick={openCreateRequest}
            className="h-11 px-4 rounded-full bg-primary-main text-white text-sm font-bold flex items-center gap-1.5 shadow-md shadow-primary-main/25 shrink-0 cursor-pointer"
          >
            <Plus size={16} /> New Request
          </button>
        )}
      </div>

      <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search requests..." />
      <FilterChips
        value={filterStatus}
        onChange={setFilterStatus}
        options={[{ value: 'All', label: 'All Statuses' }, 'Pending', 'Accepted', 'Assigned', 'In Progress', 'Completed']}
      />

      {/* Real customer "Talk to Us" callback requests */}
      <CustomerCallbackRequests />

      {filteredRequests.length === 0 ? (
        <EmptyState icon={HeartHandshake} text="No service requests found." />
      ) : (
        <div className="space-y-3">
          {filteredRequests.map(req => (
            <ListCard
              key={req.id}
              leading={(
                <div className="w-10 h-10 rounded-xl bg-bg-primary border border-border-light flex items-center justify-center text-text-secondary font-bold">
                  {req.petName.charAt(0)}
                </div>
              )}
              title={req.petName}
              subtitle={`${req.customerName} • ${req.id}`}
              badge={<StatusBadge label={req.status} tone={REQUEST_TONE[req.status] || 'neutral'} />}
              onClick={() => openDrawer(req)}
              meta={[
                { label: 'Service Type', value: <>{req.serviceType}<span className="flex items-center gap-1 text-[11px] font-medium text-text-secondary mt-0.5"><MapPin size={10} className="shrink-0" /> <span className="truncate">{req.location}</span></span></>, full: true },
                { label: 'Schedule', value: <><span className="flex items-center gap-1"><Calendar size={12}/> {req.preferredDate}</span><span className="flex items-center gap-1 text-[11px] text-text-secondary"><Clock size={10}/> {req.preferredTime}</span></> },
                { label: 'Urgency', value: <StatusBadge label={req.urgency} tone={URGENCY_TONE[req.urgency] || 'neutral'} /> },
              ]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Real customer requests from the "Talk to Us" callback form (a generic
 * Booking, type: memorial — see backend/src/modules/booking/booking.service.js).
 * Unclaimed ones are visible to every approved memorial vendor; claiming one
 * assigns it to your own Provider so it stops showing for everyone else.
 */
function CustomerCallbackRequests() {
  const { customerRequests, claimRequest, resolveRequest } = useMemorialProvider();
  const [busyId, setBusyId] = useState(null);
  const { addToast } = useVendorToast();

  const unclaimed = customerRequests.filter((r) => !r.claimed);
  const mine = customerRequests.filter((r) => r.claimed && !r.resolved);

  const handleClaim = async (id) => {
    setBusyId(id);
    try {
      await claimRequest(id);
    } catch (err) {
      addToast({ message: err?.response?.data?.message || 'Could not claim this request', type: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  const handleResolve = async (id) => {
    setBusyId(id);
    try {
      await resolveRequest(id);
    } catch (err) {
      addToast({ message: err?.response?.data?.message || 'Could not update this request', type: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  if (!unclaimed.length && !mine.length) return null;

  return (
    <div className="bg-white rounded-[20px] border border-border-light shadow-sm p-4">
      <h3 className="text-xs font-black text-text-primary uppercase tracking-wider mb-1">Customer Callback Requests</h3>
      <p className="text-xs text-text-secondary mb-3">Real families who submitted the "Talk to Us" form — claim one to take it on.</p>

      <div className="space-y-2">
        {mine.map((r) => (
          <div key={r.id} className="p-3 bg-success/5 border border-success/20 rounded-2xl">
            <p className="text-sm font-bold text-text-primary">{r.customerName} {r.petName ? `· ${r.petName}` : ''}</p>
            <p className="text-xs text-text-secondary mt-0.5">{r.phone} {r.message ? `· "${r.message}"` : ''}</p>
            <CardAction tone="teal" className="w-full mt-2" onClick={() => handleResolve(r.id)} disabled={busyId === r.id}>
              Mark Handled
            </CardAction>
          </div>
        ))}
        {unclaimed.map((r) => (
          <div key={r.id} className="p-3 bg-warning/5 border border-warning/20 rounded-2xl">
            <p className="text-sm font-bold text-text-primary">{r.customerName} {r.petName ? `· ${r.petName}` : ''}</p>
            <p className="text-xs text-text-secondary mt-0.5">{r.phone} {r.message ? `· "${r.message}"` : ''}</p>
            <CardAction tone="primary" className="w-full mt-2" onClick={() => handleClaim(r.id)} disabled={busyId === r.id}>
              Claim
            </CardAction>
          </div>
        ))}
      </div>
    </div>
  );
}
