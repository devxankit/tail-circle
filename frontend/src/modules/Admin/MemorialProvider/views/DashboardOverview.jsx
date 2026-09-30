import React, { useEffect, useState } from 'react';
import { useMemorialProvider } from '../context/MemorialProviderContext';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, Users, CalendarCheck, 
  Wallet, Clock, AlertCircle, FileText, CheckCircle,
  MoreVertical, MapPin, Phone, UserPlus, ArrowRight
} from 'lucide-react';
import { PendingBookingRequests } from '../../components/PendingBookingRequests';
import { fetchVendorLedger } from '../../../../services/vendor';
import { StatGrid, SectionLabel, SearchBar, FilterChips, ActionSheet, StatusBadge, BottomSheet, EmptyState, useVendorToast } from '../../vendor/mobile';

const REQUEST_TONE = { Completed: 'success', 'In Progress': 'primary' };

/** Requests a team member can still be sent to. */
const ASSIGNABLE = ['Pending', 'Accepted'];

const inr = (paise) => `₹${Math.round((paise || 0) / 100).toLocaleString('en-IN')}`;

/**
 * Today's and this week's memorial revenue from the ledger (gross, before
 * commission). These two figures used to be typed into the screen.
 */
function useRevenueSnapshot() {
  const [snapshot, setSnapshot] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetchVendorLedger()
      .then((entries) => {
        if (cancelled) return;
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(startOfDay);
        startOfWeek.setDate(startOfDay.getDate() - ((startOfDay.getDay() + 6) % 7)); // Monday
        const memorial = (entries || []).filter((e) => !e.vendorType || e.vendorType === 'memorial');
        const sumSince = (from) => memorial
          .filter((e) => new Date(e.createdAt) >= from)
          .reduce((s, e) => s + (Number(e.gross) || 0), 0);
        setSnapshot({ today: sumSince(startOfDay), week: sumSince(startOfWeek) });
      })
      .catch(() => { if (!cancelled) setSnapshot({ error: true }); });
    return () => { cancelled = true; };
  }, []);
  return snapshot;
}

export function DashboardOverview() {
  const { kpis, requests, team, assignTeamToRequest } = useMemorialProvider();
  const navigate = useNavigate();
  const { addToast } = useVendorToast();
  const revenue = useRevenueSnapshot();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [activeMenu, setActiveMenu] = useState(null);
  const [assignFor, setAssignFor] = useState(null);   // member picking a request
  const [detailsFor, setDetailsFor] = useState(null); // member whose details are open

  const urgentRequests = requests.filter(r => r.urgency === 'Urgent' && r.status === 'Pending');
  const todayTimeline = requests; 
  
  const dynamicKpis = {
    newRequests: requests.filter(r => r.status === 'Pending').length,
    todayScheduled: requests.filter(r => r.status === 'Accepted' || r.status === 'Assigned' || r.status === 'In Progress').length,
    pendingProofs: requests.filter(r => r.status === 'In Progress' || r.status === 'Completed').length,
    totalEarnings: kpis.totalEarnings
  };

  // Team widget logic
  const availableCount = team.filter(m => m.status === 'Available').length;
  const assignedCount = team.filter(m => m.status === 'Assigned').length;
  const onRouteCount = team.filter(m => m.status === 'On Route').length;
  const offlineCount = team.filter(m => m.status === 'Offline').length;

  const filteredTeam = team.filter(member => {
    if (statusFilter !== 'All' && member.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return member.name.toLowerCase().includes(q) || member.role.toLowerCase().includes(q);
    }
    return true;
  });

  const getStatusColor = (status) => {
    switch(status) {
      case 'Available': return 'bg-success';
      case 'Assigned': return 'bg-warning';
      case 'On Route': return 'bg-accent-teal';
      case 'Offline': return 'bg-text-disabled';
      default: return 'bg-text-disabled';
    }
  };

  const menuMember = team.find((m) => m.id === activeMenu);
  const assignable = requests.filter((r) => ASSIGNABLE.includes(r.status));

  const contactMember = (member) => {
    if (!member?.phone) {
      addToast({ message: `No phone number on file for ${member?.name || 'this member'}.`, type: 'warning' });
      return;
    }
    window.location.href = `tel:${String(member.phone).replace(/[^\d+]/g, '')}`;
  };

  const assignTo = async (member, req) => {
    await assignTeamToRequest(req.id, member.name);
    setAssignFor(null);
    addToast({ message: `${member.name} assigned to ${req.petName}'s ${req.serviceType}.`, type: 'success' });
  };

  return (
    <div className="space-y-5">
      <PendingBookingRequests compact />

      <div className="px-1">
        <h2 className="text-lg font-bold text-text-primary leading-tight">Memorial Overview</h2>
        <p className="text-xs text-text-secondary mt-1">Manage today's end-of-life service operations.</p>
      </div>

      {/* KPIs */}
      <StatGrid
        tiles={[
          { label: 'New Requests', value: dynamicKpis.newRequests, icon: AlertCircle, tone: 'warning' },
          { label: 'Scheduled Today', value: dynamicKpis.todayScheduled, icon: CalendarCheck, tone: 'teal' },
          { label: 'Pending Proofs', value: dynamicKpis.pendingProofs, icon: FileText, tone: 'primary' },
          { label: 'Total Earnings', value: dynamicKpis.totalEarnings, icon: Wallet, tone: 'success' },
        ]}
      />

      {/* Urgent Requests Alert */}
      {urgentRequests.length > 0 && (
        <div className="bg-white border border-error/30 rounded-[20px] p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={18} className="text-error" />
            <h3 className="text-xs font-black text-error uppercase tracking-wider">Urgent Pending Requests</h3>
          </div>
          <div className="space-y-2">
            {urgentRequests.map(req => (
              <div key={req.id} className="bg-error/5 p-3 rounded-2xl border border-error/15 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-text-primary">{req.petName}</p>
                  <p className="text-[11px] font-semibold text-text-secondary mt-0.5 truncate">{req.serviceType} • {req.location}</p>
                </div>
                <button
                  onClick={() => navigate('/vendor/memorial-provider/requests')}
                  className="min-h-[40px] px-4 bg-error text-white text-[11px] font-bold uppercase tracking-wider rounded-xl transition shadow-sm cursor-pointer shrink-0"
                >
                  Review
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revenue snapshot — gross memorial earnings from the ledger. */}
      <button
        type="button"
        onClick={() => navigate('/vendor/memorial-provider/finance')}
        className="w-full text-left bg-gradient-to-tr from-[#4C8684] to-[#80C1BF] rounded-[28px] p-5 text-white shadow-lg relative overflow-hidden"
      >
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <h3 className="text-sm font-black mb-3 flex items-center gap-2">
          <TrendingUp size={16} /> Revenue Snapshot
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-bold opacity-80 uppercase tracking-wider">Today</p>
            <p className="text-2xl font-black">{revenue && !revenue.error ? inr(revenue.today) : '—'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold opacity-80 uppercase tracking-wider">This Week</p>
            <p className="text-2xl font-black">{revenue && !revenue.error ? inr(revenue.week) : '—'}</p>
          </div>
        </div>
        {revenue?.error && <p className="text-[11px] font-semibold opacity-85 mt-2">Could not load earnings — open Finance for details.</p>}
      </button>

      {/* Today's Timeline */}
      <div>
        <SectionLabel>Today's Service Timeline</SectionLabel>
        <div className="relative pl-5 space-y-4 border-l-2 border-border-light ml-3">
          {todayTimeline.map((req) => (
            <div key={req.id} className="relative">
              <div className={`absolute -left-[29px] top-4 w-4 h-4 rounded-full border-4 border-bg-primary shadow-sm ${req.status === 'Completed' ? 'bg-success' : req.status === 'In Progress' ? 'bg-accent-teal' : 'bg-text-disabled'}`} />
              <div className="bg-white p-4 rounded-[20px] border border-border-light shadow-sm">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-text-secondary bg-bg-primary px-2 py-0.5 rounded-md inline-flex items-center gap-1 mb-1.5">
                      <Clock size={10}/> {req.preferredTime}
                    </span>
                    <h4 className="text-sm font-black text-text-primary">{req.serviceType}</h4>
                  </div>
                  <StatusBadge label={req.status} tone={REQUEST_TONE[req.status] || 'neutral'} />
                </div>
                <p className="text-xs font-semibold text-text-primary">{req.petName} — {req.customerName}</p>
                <p className="text-[11px] font-medium text-text-secondary mt-1">{req.location}</p>
                {req.assignedTeam && (
                  <div className="mt-3 pt-3 border-t border-border-light flex items-center gap-2">
                    <Users size={12} className="text-text-secondary" />
                    <span className="text-[11px] font-bold text-text-primary">Assigned: {req.assignedTeam}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team Availability Widget */}
      <div>
        <SectionLabel
          action={(
            <button
              onClick={() => navigate('/vendor/memorial-provider/team')}
              className="min-h-[36px] text-xs font-bold text-primary-main flex items-center gap-1 cursor-pointer"
            >
              View All <ArrowRight size={12} />
            </button>
          )}
        >
          <span className="inline-flex items-center gap-1.5">Team Availability <span className="normal-case tracking-normal text-[10px] font-bold bg-bg-secondary text-text-secondary px-2 py-0.5 rounded-full">{team.length} members</span></span>
        </SectionLabel>

        <div className="bg-white rounded-[20px] border border-border-light shadow-sm p-4 space-y-3">
          {/* Status counts */}
          <div className="grid grid-cols-2 gap-2">
            {[
              ['Available', availableCount, 'bg-success'],
              ['Assigned', assignedCount, 'bg-warning'],
              ['On Route', onRouteCount, 'bg-accent-teal'],
              ['Offline', offlineCount, 'bg-text-disabled'],
            ].map(([label, count, dot]) => (
              <div key={label} className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-bg-primary border border-border-light text-[11px] font-bold text-text-primary">
                <span className={`w-2 h-2 rounded-full ${dot}`}/> {label}: {count}
              </div>
            ))}
          </div>

          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search name or role..." />
          <FilterChips options={['All', 'Available', 'Assigned', 'On Route', 'Offline']} value={statusFilter} onChange={setStatusFilter} />

          <div className="space-y-2">
            {filteredTeam.map(member => (
              <div key={member.id} className="bg-bg-primary border border-border-light p-3 rounded-2xl">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-text-primary font-bold text-sm border border-border-light">
                        {member.name.charAt(0)}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(member.status)}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-text-primary leading-tight truncate">{member.name}</p>
                      <p className="text-[11px] font-semibold text-text-secondary">{member.role}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveMenu(activeMenu === member.id ? null : member.id)}
                    aria-label="Member actions"
                    className="w-10 h-10 flex items-center justify-center text-text-secondary rounded-full active:bg-white transition cursor-pointer shrink-0"
                  >
                    <MoreVertical size={18} />
                  </button>
                </div>

                {member.status !== 'Available' && member.status !== 'Offline' && (
                  <div className="mt-2.5 text-[11px] font-medium text-text-secondary bg-white px-2 py-1.5 rounded-lg flex items-center gap-1.5">
                    <MapPin size={11} className="text-text-secondary shrink-0" />
                    {(() => {
                      const job = requests.find((r) => r.assignedTeam === member.name && ['Assigned', 'In Progress'].includes(r.status));
                      return job ? `Assigned: ${job.petName} — ${job.serviceType}` : `${member.status}${member.location ? ` • ${member.location}` : ''}`;
                    })()}
                  </div>
                )}
              </div>
            ))}

            {filteredTeam.length === 0 && (
              <div className="py-6 text-center">
                <Users className="mx-auto mb-2 text-text-disabled" size={24} />
                <p className="text-xs font-semibold text-text-secondary">No team members found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* The member quick-action menu. */}
      <ActionSheet
        open={!!menuMember}
        onClose={() => setActiveMenu(null)}
        title={menuMember?.name}
        actions={menuMember ? [
          { key: 'assign', label: 'Assign Request', icon: UserPlus, onClick: () => { setAssignFor(menuMember); setActiveMenu(null); } },
          { key: 'contact', label: 'Contact Member', icon: Phone, hint: menuMember.phone || 'No phone on file', onClick: () => { contactMember(menuMember); setActiveMenu(null); } },
          { key: 'details', label: 'View Details', icon: FileText, onClick: () => { setDetailsFor(menuMember); setActiveMenu(null); } },
        ] : []}
      />

      {/* Pick the request to send this member to. */}
      <BottomSheet
        open={!!assignFor}
        onClose={() => setAssignFor(null)}
        title={assignFor ? `Assign ${assignFor.name}` : ''}
        subtitle="Requests waiting for a team"
      >
        <div className="space-y-2 pb-2">
          {assignable.length === 0 ? (
            <EmptyState compact icon={CalendarCheck} text="No pending or accepted requests to assign." />
          ) : assignable.map((req) => (
            <button
              key={req.id}
              type="button"
              onClick={() => assignTo(assignFor, req)}
              className="w-full text-left p-3.5 rounded-2xl border border-border-light bg-white active:bg-bg-primary flex items-center justify-between gap-3"
            >
              <span className="min-w-0">
                <span className="block text-sm font-bold text-text-primary truncate">{req.petName} — {req.customerName}</span>
                <span className="block text-[11px] font-semibold text-text-secondary truncate">
                  {req.serviceType} • {req.preferredDate || 'date TBC'}{req.preferredTime ? ` • ${req.preferredTime}` : ''}
                </span>
                {req.assignedTeam && <span className="block text-[11px] text-text-secondary">Currently: {req.assignedTeam}</span>}
              </span>
              <StatusBadge label={req.status} tone={req.status === 'Pending' ? 'warning' : 'info'} />
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* Member details */}
      <BottomSheet
        open={!!detailsFor}
        onClose={() => setDetailsFor(null)}
        title={detailsFor?.name}
        subtitle={detailsFor?.role}
        footer={detailsFor ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate('/vendor/memorial-provider/team')}
              className="flex-1 h-12 rounded-2xl bg-bg-secondary text-text-primary text-[15px] font-bold"
            >
              Manage Team
            </button>
            <button
              type="button"
              onClick={() => contactMember(detailsFor)}
              className="flex-1 h-12 rounded-2xl bg-accent-teal text-white text-[15px] font-bold flex items-center justify-center gap-2"
            >
              <Phone size={16} /> Call
            </button>
          </div>
        ) : null}
      >
        {detailsFor && (
          <div className="grid grid-cols-2 gap-3 pb-2">
            {[
              ['Status', <span key="s" className="inline-flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${getStatusColor(detailsFor.status)}`} /> {detailsFor.status}</span>],
              ['Phone', detailsFor.phone || '—'],
              ['Location', detailsFor.location || '—'],
              ['Current job', requests.find((r) => r.assignedTeam === detailsFor.name && ['Assigned', 'In Progress'].includes(r.status))?.petName || '—'],
            ].map(([label, value]) => (
              <div key={label} className="bg-bg-primary border border-border-light rounded-2xl p-3 min-w-0">
                <p className="text-[10px] font-bold text-text-secondary uppercase mb-1">{label}</p>
                <div className="text-sm font-bold text-text-primary break-words">{value}</div>
              </div>
            ))}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
