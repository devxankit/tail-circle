import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getStoredVendor,
  fetchMemorialKpis,
  fetchMemorialServices,
  createMemorialService,
  updateMemorialService as apiUpdateService,
  deleteMemorialService,
  fetchMemorialAddons,
  createMemorialAddon,
  updateMemorialAddon as apiUpdateAddon,
  deleteMemorialAddon,
  fetchMemorialTeam,
  createTeamMember,
  updateTeamMemberApi,
  deleteTeamMember,
  fetchMemorialRequests,
  createMemorialWalkIn,
  updateMemorialRequestStatus,
  assignMemorialTeam,
  addMemorialProof,
  fetchMemorialCustomerRequests,
  claimMemorialCustomerRequest,
  resolveMemorialCustomerRequest,
} from '../../../../services/vendor';

const MemorialProviderContext = createContext();

export const useMemorialProvider = () => {
  const context = useContext(MemorialProviderContext);
  if (!context) {
    throw new Error('useMemorialProvider must be used within a MemorialProviderContext.Provider');
  }
  return context;
};

// '₹4,500' | 4500 | '4500' → 4500 (number)
const parsePrice = (p) => Number(String(p ?? '').replace(/[^0-9.]/g, '')) || 0;

function toPortalProfile(p) {
  const base = { businessName: 'Memorial Provider', ownerName: '', email: '', phone: '', address: '', verification: 'Pending', status: 'Online', logo: null, gst: '' };
  if (!p) return base;
  const vmap = { approved: 'Approved', pending: 'Pending', rejected: 'Rejected', suspended: 'Suspended' };
  return { ...base, businessName: p.businessName, ownerName: p.bank?.accountHolder || p.businessName, email: p.email, phone: p.phone, address: p.address, verification: vmap[p.approvalStatus] || 'Pending', status: p.online ? 'Online' : 'Offline', logo: p.logo || null, gst: p.gst?.number || '' };
}

export const MemorialProviderProvider = ({ children }) => {
  const stored = getStoredVendor();
  const [profile, setProfile] = useState(toPortalProfile(stored?.profile));
  const [kpis, setKpis] = useState({ newRequests: 0, todayScheduled: 0, assignedTeams: 0, completedServices: 0, pendingProofs: 0, totalEarnings: '₹0' });
  const [requests, setRequests] = useState([]);
  const [customerRequests, setCustomerRequests] = useState([]);
  const [team, setTeam] = useState([]);
  const [services, setServices] = useState([]);
  const [addons, setAddons] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const [k, reqs, tm, svc, add, custReqs] = await Promise.all([
      fetchMemorialKpis().catch(() => null),
      fetchMemorialRequests().catch(() => []),
      fetchMemorialTeam().catch(() => []),
      fetchMemorialServices().catch(() => []),
      fetchMemorialAddons().catch(() => []),
      fetchMemorialCustomerRequests().catch(() => []),
    ]);
    if (k) setKpis(k);
    setRequests(reqs);
    setTeam(tm);
    setServices(svc);
    setAddons(add);
    setCustomerRequests(custReqs);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const updateProfile = (newData) => setProfile((prev) => ({ ...prev, ...newData }));

  /* ── Requests ─────────────────────────────────────────── */

  const updateRequestStatus = async (id, newStatus) => {
    const updated = await updateMemorialRequestStatus(id, newStatus);
    setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
    return updated;
  };

  const assignTeamToRequest = async (id, teamName) => {
    const member = team.find((t) => t.name === teamName || t.id === teamName || t._id === teamName);
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, assignedTeam: member?.name || teamName, status: 'Assigned' } : r)));
    setTeam((prev) => prev.map((t) => (t.id === member?.id ? { ...t, status: 'Assigned' } : t)));
    if (member?._id || member?.id) await assignMemorialTeam(id, member._id || member.id).catch(() => {});
  };

  const addRequest = async (req) => {
    const created = await createMemorialWalkIn({
      customerName: req.customerName,
      petName: req.petName,
      serviceType: req.serviceType,
      location: req.location,
      preferredDate: req.preferredDate,
      preferredTime: req.preferredTime,
      urgency: req.urgency,
      notes: req.notes,
      addons: req.addons || [],
      amount: parsePrice(req.amount || req.price),
    }).catch(() => null);
    if (created) setRequests((prev) => [created, ...prev]);
  };

  const addProof = async (id, proofData) => {
    const url = proofData?.url || proofData?.image || (typeof proofData === 'string' ? proofData : '');
    if (!url) throw new Error('A file is required for proof of completion');
    const updated = await addMemorialProof(id, { url, note: proofData?.note || '' });
    setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
    return updated;
  };

  /* ── Real customer callback requests ─────────────────────── */

  const claimRequest = async (id) => {
    const updated = await claimMemorialCustomerRequest(id);
    setCustomerRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
    return updated;
  };

  const resolveRequest = async (id) => {
    const updated = await resolveMemorialCustomerRequest(id);
    setCustomerRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
    return updated;
  };

  /* ── Team ─────────────────────────────────────────────── */

  const addTeamMember = async (member) => {
    const created = await createTeamMember(member).catch(() => null);
    if (created) setTeam((prev) => [...prev, created]);
  };
  const updateTeamMember = async (id, updates) => {
    setTeam((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    await updateTeamMemberApi(id, updates).catch(() => {});
  };
  const removeTeamMember = async (id) => {
    setTeam((prev) => prev.filter((t) => t.id !== id));
    await deleteTeamMember(id).catch(() => {});
  };

  /* ── Services ─────────────────────────────────────────── */

  const addService = async (service) => {
    const created = await createMemorialService({ ...service, price: parsePrice(service.price), staff: Number(service.staff) || 1 }).catch(() => null);
    if (created) setServices((prev) => [...prev, created]);
  };
  const updateService = async (id, updates) => {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    const patch = { ...updates };
    if (patch.price != null) patch.price = parsePrice(patch.price);
    if (patch.staff != null) patch.staff = Number(patch.staff);
    await apiUpdateService(id, patch).catch(() => {});
  };
  const removeService = async (id) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
    await deleteMemorialService(id).catch(() => {});
  };

  /* ── Add-ons ──────────────────────────────────────────── */

  const addAddon = async (addon) => {
    const created = await createMemorialAddon({ ...addon, price: parsePrice(addon.price) }).catch(() => null);
    if (created) setAddons((prev) => [...prev, created]);
  };
  const updateAddon = async (id, updates) => {
    setAddons((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
    const patch = { ...updates };
    if (patch.price != null) patch.price = parsePrice(patch.price);
    await apiUpdateAddon(id, patch).catch(() => {});
  };
  const removeAddon = async (id) => {
    setAddons((prev) => prev.filter((a) => a.id !== id));
    await deleteMemorialAddon(id).catch(() => {});
  };

  const markAllNotificationsRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  return (
    <MemorialProviderContext.Provider value={{
      profile, updateProfile,
      kpis,
      requests, updateRequestStatus, assignTeamToRequest, addRequest, addProof,
      customerRequests, claimRequest, resolveRequest,
      team, addTeamMember, updateTeamMember, removeTeamMember,
      notifications, markAllNotificationsRead,
      services, addService, updateService, removeService,
      addons, addAddon, updateAddon, removeAddon,
      loading, refresh,
    }}>
      {children}
    </MemorialProviderContext.Provider>
  );
};
