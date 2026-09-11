import React, { useState, useEffect, useCallback } from 'react';
import {
  Users as UsersIcon, Search, Filter, MoreVertical, CheckCircle2,
  XCircle, Mail, Phone, Calendar, ShieldCheck, ShieldAlert, MapPin,
  PawPrint, Loader2, AlertTriangle, RefreshCw, ChevronDown, Activity, Syringe
} from 'lucide-react';
import {
  fetchAdminUsers,
  fetchAdminUserStats,
  fetchAdminUserPets,
  setAdminUserBlocked,
} from '../../../../../services/admin';
import { Avatar } from '../../components/Avatar';

/** "3 days ago" for the last-active readouts; null when the user never signed in. */
const relativeTime = (value) => {
  if (!value) return null;
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return null;
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 31) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

const countLabel = (n) => (n === null || n === undefined ? '—' : n.toLocaleString());

/**
 * How recently this account was in use.
 *
 * `online` is live socket presence, so it wins outright. Otherwise fall back
 * to the last heartbeat and finally to the last sign-in, which is all there is
 * for an account that has not opened the app since the field was introduced.
 */
const presenceOf = (user) => {
  if (user.online) return { label: 'Online now', tone: 'live' };
  const seen = relativeTime(user.lastSeenAt || user.lastActiveAt);
  if (seen) return { label: seen, tone: 'seen' };
  const login = relativeTime(user.lastLoginAt);
  if (login) return { label: `Signed in ${login}`, tone: 'seen' };
  return { label: 'Never signed in', tone: 'never' };
};

export function Users() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  // Pets are loaded per row on expand and kept keyed by user id, so collapsing
  // and reopening a row does not refetch what is already on screen.
  const [expandedUser, setExpandedUser] = useState(null);
  const [petsByUser, setPetsByUser] = useState({});
  const [petsLoadingFor, setPetsLoadingFor] = useState(null);
  const [petsErrors, setPetsErrors] = useState({});

  // The counters cover the whole platform while the list is capped server-side,
  // so the two are fetched side by side rather than one derived from the other.
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchAdminUsers(), fetchAdminUserStats()])
      .then(([rows, counters]) => {
        if (cancelled) return;
        setUsers(Array.isArray(rows) ? rows : []);
        setStats(counters);
        setLoadError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load users', err);
        setLoadError(err?.message || 'Could not reach the server.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const reload = useCallback(() => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  }, []);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const toggleSuspend = async (user) => {
    const blocked = user.status === 'Active';
    try {
      await setAdminUserBlocked(user.id, blocked);
      const nextStatus = blocked ? 'Suspended' : 'Active';
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u)));
      setSelectedUser((prev) => (prev && prev.id === user.id ? { ...prev, status: nextStatus } : prev));
      // Keep the header counters in step with the row that just changed rather
      // than leaving them at whatever they read when the page loaded.
      setStats((prev) => (prev ? {
        ...prev,
        suspended: prev.suspended + (blocked ? 1 : -1),
        active: prev.active + (blocked ? -1 : 1),
      } : prev));
      showToast(blocked ? `User ${user.name} suspended` : `User ${user.name} reactivated`, blocked ? 'error' : 'success');
    } catch (err) {
      showToast(err?.message || 'Action failed', 'error');
    }
  };

  const loadPets = useCallback(async (userId) => {
    setPetsLoadingFor(userId);
    try {
      const rows = await fetchAdminUserPets(userId);
      setPetsByUser((prev) => ({ ...prev, [userId]: Array.isArray(rows) ? rows : [] }));
      setPetsErrors((prev) => ({ ...prev, [userId]: null }));
    } catch (err) {
      setPetsErrors((prev) => ({ ...prev, [userId]: err?.message || 'Could not load pets' }));
    } finally {
      setPetsLoadingFor(null);
    }
  }, []);

  const togglePets = (user) => {
    if (expandedUser === user.id) return setExpandedUser(null);
    setExpandedUser(user.id);
    // Fetch only what we have never successfully loaded.
    if (!petsByUser[user.id]) loadPets(user.id);
  };

  /** The pets panel that opens under a user row, in place of the old Pets page. */
  const renderPetsPanel = (user) => {
    const pets = petsByUser[user.id];
    const error = petsErrors[user.id];

    if (petsLoadingFor === user.id && !pets) {
      return (
        <div className="flex items-center gap-2 text-slate-500 py-3">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-[13px] font-semibold">Loading pets…</span>
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex flex-wrap items-center gap-3 py-3">
          <span className="text-[13px] font-semibold text-rose-600">{error}</span>
          <button
            onClick={() => loadPets(user.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-[12px] font-bold transition"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      );
    }
    if (!pets?.length) {
      return (
        <div className="flex items-center gap-2 text-slate-500 py-3">
          <PawPrint size={16} className="text-slate-300" />
          <span className="text-[13px] font-semibold">No pets registered to this user.</span>
        </div>
      );
    }

    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 py-1">
        {pets.map((pet) => (
          <div key={pet.id} className="bg-white rounded-xl border border-slate-200 p-3 flex gap-3">
            <Avatar
              src={pet.avatar}
              name={pet.name}
              seed={pet.id}
              className="w-11 h-11 rounded-lg border border-slate-100 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-[13px] font-bold text-slate-900 truncate">{pet.name}</p>
                <span className="text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                  {pet.species}
                </span>
              </div>
              <p className="text-[11.5px] font-semibold text-slate-500 truncate mt-0.5">
                {[pet.breed, pet.gender, pet.age !== '—' ? pet.age : null, pet.weight !== '—' ? pet.weight : null]
                  .filter(Boolean)
                  .join(' · ') || 'No details recorded'}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    pet.vaccinated ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  <Syringe size={10} /> {pet.vaccinated ? 'Vaccinated' : 'Not vaccinated'}
                </span>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  {pet.healthStatus}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  /** The "N Pets" chip, which opens the panel above. */
  const renderPetsToggle = (user, compact = false) => (
    <button
      onClick={() => togglePets(user)}
      aria-expanded={expandedUser === user.id}
      className={`inline-flex items-center gap-1 font-bold rounded-md transition ${
        compact ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2 py-1'
      } ${
        expandedUser === user.id
          ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      <PawPrint size={compact ? 10 : 12} />
      {user.pets} {user.pets === 1 ? 'Pet' : 'Pets'}
      <ChevronDown
        size={compact ? 10 : 12}
        className={`transition-transform ${expandedUser === user.id ? 'rotate-180' : ''}`}
      />
    </button>
  );

  /** Online dot plus a last-seen readout, used by both the table and the cards. */
  const renderPresence = (user) => {
    const presence = presenceOf(user);
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-[12px] font-bold ${
          presence.tone === 'live'
            ? 'text-emerald-600'
            : presence.tone === 'never'
              ? 'text-slate-400'
              : 'text-slate-600'
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            presence.tone === 'live'
              ? 'bg-emerald-500 ring-2 ring-emerald-200'
              : presence.tone === 'never'
                ? 'bg-slate-300'
                : 'bg-slate-400'
          }`}
        />
        {presence.label}
      </span>
    );
  };

  const query = searchTerm.trim().toLowerCase();
  const filteredUsers = users.filter((user) => {
    // Phone is how most of these accounts are identified, so it is searchable
    // too; every field is guarded because an account may have no email at all.
    const haystack = [user.name, user.email, user.phone].filter(Boolean).join(' ').toLowerCase();
    const matchesSearch = !query || haystack.includes(query);
    const matchesPlan = filterPlan === 'All' || user.plan === filterPlan;
    const matchesStatus = filterStatus === 'All' || user.status === filterStatus;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const displayedUsers = showAll ? filteredUsers : filteredUsers.slice(0, 5);
  const activeFilterCount = (filterStatus === 'All' ? 0 : 1) + (filterPlan === 'All' ? 0 : 1);

  const handleExport = () => {
    const headers = ['ID', 'Name', 'Email', 'Phone', 'City', 'Plan', 'Pets', 'Status', 'Phone Verified', 'Joined', 'Last Active', 'Online Now', 'Last Login'];
    // Every cell is quoted and its own quotes doubled — a name or city with a
    // comma in it used to shift the rest of that row into the wrong columns.
    const cell = (value) => `"${String(value ?? '').split('"').join('""')}"`;
    const csvContent = [
      headers.join(','),
      ...filteredUsers.map((user) =>
        [user.id, user.name, user.email, user.phone, user.city, user.planName || user.plan, user.pets, user.status, user.kyc, user.joined, relativeTime(user.lastActiveAt) || 'Never', user.online ? 'Yes' : 'No', relativeTime(user.lastLoginAt) || 'Never']
          .map(cell)
          .join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'user_management_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 animate-in fade-in duration-500">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[100] animate-slide-in-right">
          <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-slate-200 flex items-center gap-3">
             <div className={`w-6 h-6 rounded-full flex items-center justify-center ${toastMessage.type === 'error' ? 'bg-rose-100 text-rose-600' : toastMessage.type === 'info' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {toastMessage.type === 'error' ? <XCircle size={14}/> : <CheckCircle2 size={14}/>}
             </div>
             <p className="text-[13px] font-bold text-slate-800">{toastMessage.text}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">User Management</h1>
          <p className="text-[12px] sm:text-sm font-semibold text-slate-500 mt-0.5 sm:mt-1">Manage pet owners, accounts, and platform access.</p>
        </div>
        <button 
          onClick={handleExport}
          className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-sm transition"
        >
          Export Users
        </button>
      </div>

      {/* KPI Cards — counted server-side across every account, not from the
          capped list below, so they stay right as the platform grows. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5">
        {[
          {
            label: 'Total Users',
            value: countLabel(stats?.total),
            trend: stats ? `+${stats.newThisWeek} this week` : 'Loading…',
            icon: UsersIcon, color: 'text-blue-600', bg: 'bg-blue-50',
          },
          {
            label: 'Premium Subscribers',
            value: countLabel(stats?.premium),
            trend: stats ? `+${stats.premiumNewThisWeek} this week` : 'Loading…',
            icon: ShieldCheck, color: 'text-amber-600', bg: 'bg-amber-50',
          },
          {
            label: 'Suspended Accounts',
            value: countLabel(stats?.suspended),
            trend: stats ? `${countLabel(stats.active)} not suspended` : 'Loading…',
            icon: ShieldAlert, color: 'text-rose-600', bg: 'bg-rose-50',
          },
          {
            // Engagement, not account state: who actually opened the app.
            label: 'Active Today',
            value: countLabel(stats?.activeToday),
            trend: stats ? `${countLabel(stats.onlineNow)} online now · ${countLabel(stats.activeThisWeek)} this week` : 'Loading…',
            icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50',
          }
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex items-center gap-3 sm:gap-4 hover:shadow-md transition">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${kpi.bg} ${kpi.color}`}>
              <kpi.icon size={20} className="sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">{kpi.label}</p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight mt-0.5">{kpi.value}</h3>
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 mt-0.5">{kpi.trend}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
        <div className="relative w-full sm:w-96">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search users by name or email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[16px] sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {['All', 'Premium', 'Free'].map(plan => (
            <button 
              key={plan}
              onClick={() => setFilterPlan(plan)}
              className={`flex-1 sm:flex-none px-3 py-2 sm:px-4 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition ${filterPlan === plan ? 'bg-blue-500 text-white shadow-md' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
            >
              {plan}
            </button>
          ))}
          <div className="relative">
            <button
              onClick={() => setIsFilterOpen((open) => !open)}
              className={`p-2 sm:p-2.5 border rounded-xl transition ${activeFilterCount ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
            >
              <Filter size={16} />
            </button>
            {isFilterOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 p-3 z-50 animate-in fade-in zoom-in-95 duration-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Account Status</p>
                  <div className="flex flex-col gap-1">
                    {['All', 'Active', 'Suspended'].map((status) => (
                      <button
                        key={status}
                        onClick={() => { setFilterStatus(status); setIsFilterOpen(false); }}
                        className={`text-left px-3 py-1.5 rounded-lg text-[13px] font-semibold transition ${filterStatus === status ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={() => { setFilterStatus('All'); setFilterPlan('All'); setIsFilterOpen(false); }}
                      className="w-full mt-2 pt-2 border-t border-slate-100 text-[12px] font-bold text-slate-500 hover:text-slate-700 transition"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Users List Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

        {/* A failed fetch used to fall through to "No users found matching your
            criteria", which reads as an empty database rather than an outage. */}
        {loading && (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 size={22} className="animate-spin" />
            <p className="text-sm font-semibold">Loading users…</p>
          </div>
        )}

        {!loading && loadError && (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-11 h-11 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Could not load users</p>
              <p className="text-[13px] font-medium text-slate-500 mt-0.5">{loadError}</p>
            </div>
            <button onClick={reload} className="mt-1 inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[13px] font-bold transition">
              <RefreshCw size={14} /> Try again
            </button>
          </div>
        )}

        {!loading && !loadError && (
        <>
        {/* Mobile/Tablet Card View */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden divide-y md:divide-y-0 md:gap-4 md:p-4 divide-slate-100">
          {displayedUsers.map((user) => (
            <div key={user.id} className="p-4 md:rounded-xl md:border md:border-slate-200 flex flex-col gap-3 bg-white hover:bg-slate-50 transition shadow-sm md:shadow-none">
              
              {/* Top Row: Avatar, Name, Status, Action */}
              <div className="flex justify-between items-start">
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <Avatar src={user.avatar} name={user.name} seed={user.id} className="w-10 h-10 rounded-full border border-slate-100 shadow-sm shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-slate-900 leading-tight">{user.name}</p>
                    <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mt-0.5">
                      <Calendar size={10} /> Joined {user.joined}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 relative">
                  <button 
                    onClick={() => setActiveDropdown(activeDropdown === user.id ? null : user.id)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 transition rounded-lg"
                  >
                    <MoreVertical size={18} />
                  </button>
                  {activeDropdown === user.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)}></div>
                      <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-200 flex flex-col">
                        <button onClick={() => { setActiveDropdown(null); setSelectedUser(user); setIsProfileOpen(true); }} className="w-full text-left px-4 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition">View Profile</button>
                        <div className="h-px bg-slate-100 my-1 w-full"></div>
                        <button onClick={() => { setActiveDropdown(null); toggleSuspend(user); }} className="w-full text-left px-4 py-2 text-[13px] font-semibold text-rose-600 hover:bg-rose-50 transition">{user.status === 'Active' ? 'Suspend' : 'Reactivate'}</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {/* Middle Row: Contact Info & Status Badges */}
              <div className="flex flex-col gap-2.5 mt-1 pl-0 sm:pl-[52px]">
                <div className="space-y-1.5">
                  <span className="flex items-center gap-2 text-[12px] font-medium text-slate-600">
                    <Mail size={12} className="text-slate-400 shrink-0" />
                    <span className={`truncate ${user.email ? '' : 'text-slate-400 italic'}`}>{user.email || 'No email on file'}</span>
                  </span>
                  <span className="flex items-center gap-2 text-[12px] font-medium text-slate-600">
                    <Phone size={12} className="text-slate-400 shrink-0" /> {user.phone}
                  </span>
                </div>
                
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${user.plan === 'Premium' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {user.planName || user.plan}
                  </span>
                  {renderPetsToggle(user, true)}
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${user.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {user.status === 'Active' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    {user.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                  {renderPresence(user)}
                  <span className="text-[11px] font-semibold text-slate-400">
                    Last login {relativeTime(user.lastLoginAt) || '—'}
                  </span>
                </div>
              </div>

              {expandedUser === user.id && (
                <div className="mt-1 pt-3 border-t border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                    Pets registered
                  </p>
                  {renderPetsPanel(user)}
                </div>
              )}

            </div>
          ))}
          {filteredUsers.length === 0 && (
            <div className="p-8 md:col-span-2 text-center text-slate-500 font-medium text-sm">
              No users found matching your criteria.
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px] whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">User Details</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">Contact Info</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">Plan & Pets</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">Activity</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {displayedUsers.map((user) => (
                <React.Fragment key={user.id}>
                <tr className={`transition group ${expandedUser === user.id ? 'bg-blue-50/40' : 'hover:bg-slate-50/50'}`}>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                      <Avatar src={user.avatar} name={user.name} seed={user.id} className="w-10 h-10 rounded-full border-2 border-white shadow-sm shrink-0" />
                      <div className="min-w-max">
                        <p className="text-sm font-bold text-slate-900">{user.name}</p>
                        <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar size={10} /> Joined {user.joined}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1 min-w-max">
                      <p className={`text-[13px] font-semibold flex items-center gap-1.5 ${user.email ? 'text-slate-700' : 'text-slate-400 italic'}`}><Mail size={12} className="text-slate-400" /> {user.email || 'No email on file'}</p>
                      <p className="text-[12px] font-medium text-slate-500 flex items-center gap-1.5"><Phone size={12} className="text-slate-400" /> {user.phone}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 min-w-max">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${user.plan === 'Premium' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {user.planName || user.plan}
                      </span>
                      {renderPetsToggle(user)}
                    </div>
                  </td>
                  <td className="px-6 py-4 min-w-max">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${user.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                      {user.status === 'Active' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 min-w-max">
                    <div className="space-y-0.5">
                      {renderPresence(user)}
                      <p className="text-[11px] font-semibold text-slate-400">
                        Last login {relativeTime(user.lastLoginAt) || '—'}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right min-w-max relative">
                    <button 
                      onClick={() => setActiveDropdown(activeDropdown === user.id ? null : user.id)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition inline-flex"
                    >
                      <MoreVertical size={18} />
                    </button>
                    {activeDropdown === user.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)}></div>
                        <div className="absolute right-6 top-10 mt-1 w-40 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-200 text-left flex flex-col">
                          <button onClick={() => { setActiveDropdown(null); setSelectedUser(user); setIsProfileOpen(true); }} className="w-full text-left px-4 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition">View Profile</button>
                            <div className="h-px bg-slate-100 my-1 w-full"></div>
                          <button onClick={() => { setActiveDropdown(null); toggleSuspend(user); }} className="w-full text-left px-4 py-2 text-[13px] font-semibold text-rose-600 hover:bg-rose-50 transition">{user.status === 'Active' ? 'Suspend' : 'Reactivate'}</button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
                {expandedUser === user.id && (
                  <tr className="bg-slate-50/70">
                    <td colSpan="6" className="px-6 pb-5 pt-1 whitespace-normal">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">
                        Pets registered to {user.name}
                      </p>
                      {renderPetsPanel(user)}
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500 font-medium text-sm">
                    No users found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </>
        )}

        {/* View All Footer */}
        {filteredUsers.length > 5 && !showAll && (
          <div className="p-4 sm:p-5 border-t border-slate-100 flex justify-center bg-slate-50/50">
            <button 
              onClick={() => setShowAll(true)}
              className="px-6 py-2.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-[13px] font-bold rounded-xl shadow-sm transition"
            >
              View All {filteredUsers.length} Users
            </button>
          </div>
        )}
      </div>

      {/* User Profile Drawer */}
      {isProfileOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm transition-all duration-300">
          <div className="absolute inset-0" onClick={() => setIsProfileOpen(false)} />
          <div className="relative w-full max-w-[500px] bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-slide-in-right">
             {/* Header */}
             <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                   <Avatar src={selectedUser.avatar} name={selectedUser.name} seed={selectedUser.id} textClassName="text-lg" className="w-16 h-16 rounded-full border-4 border-white shadow-sm" />
                   <div>
                      <h2 className="text-xl font-black text-slate-900">{selectedUser.name}</h2>
                      <p className="text-[13px] font-semibold text-slate-500 flex items-center gap-1"><Calendar size={12}/> Joined {selectedUser.joined}</p>
                   </div>
                </div>
                <button onClick={() => setIsProfileOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition">
                   <XCircle size={24} />
                </button>
             </div>
             
             {/* Body */}
             <div className="p-6 flex-1 overflow-y-auto bg-slate-50/30">
                <div className="space-y-6">
                   <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                      <h3 className="text-sm font-bold text-slate-800 mb-4">Contact Information</h3>
                      <div className="space-y-4">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0"><Mail size={14}/></div>
                            <div>
                               <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Email Address</p>
                               <p className="text-[14px] font-semibold text-slate-700">{selectedUser.email}</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0"><Phone size={14}/></div>
                            <div>
                               <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Phone Number</p>
                               <p className="text-[14px] font-semibold text-slate-700 flex items-center gap-2">
                                  {selectedUser.phone}
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${selectedUser.kyc === 'Verified' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                     {selectedUser.kyc}
                                  </span>
                               </p>
                            </div>
                         </div>
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0"><MapPin size={14}/></div>
                            <div>
                               <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">City</p>
                               <p className="text-[14px] font-semibold text-slate-700">{selectedUser.city}</p>
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                      <h3 className="text-sm font-bold text-slate-800 mb-4">Account Status</h3>
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Subscription Plan</p>
                            <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border mt-1 ${selectedUser.plan === 'Premium' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                              {selectedUser.planName || selectedUser.plan}
                            </span>
                            {selectedUser.planExpiresAt && (
                              <p className="text-[11px] font-semibold text-slate-400 mt-1">
                                Renews {new Date(selectedUser.planExpiresAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                              </p>
                            )}
                         </div>
                         <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Account Status</p>
                            <span className={`inline-flex items-center gap-1 mt-1 px-2.5 py-1 rounded-full text-xs font-bold ${selectedUser.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                              {selectedUser.status === 'Active' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                              {selectedUser.status}
                            </span>
                         </div>
                         <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Last Active</p>
                            <p className="text-[14px] font-semibold text-slate-700 mt-1">{relativeTime(selectedUser.lastActiveAt) || 'Never signed in'}</p>
                         </div>
                         <div className="col-span-2">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Registered Pets</p>
                            {selectedUser.petNames?.length ? (
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {selectedUser.petNames.map((pet, i) => (
                                  <span key={`${pet}-${i}`} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-700 text-[12px] font-bold">
                                    <PawPrint size={11} className="text-slate-400" /> {pet}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[14px] font-semibold text-slate-400 mt-1">No pets registered</p>
                            )}
                         </div>
                         <div className="col-span-2">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">User ID</p>
                            <p className="text-[13px] font-mono font-semibold text-slate-600 mt-1 break-all">{selectedUser.id}</p>
                         </div>
                      </div>
                   </div>
                </div>
             </div>

             {/* Footer Actions */}
             <div className="p-6 border-t border-slate-100 bg-white grid grid-cols-2 gap-3">
                <button onClick={() => setIsProfileOpen(false)} className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-[13px] font-bold hover:bg-slate-50 transition">
                   Close
                </button>
                <button onClick={() => { toggleSuspend(selectedUser); setIsProfileOpen(false); }} className={`px-4 py-2.5 rounded-xl text-[13px] font-bold transition shadow-sm text-white ${selectedUser.status === 'Active' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
                   {selectedUser.status === 'Active' ? 'Suspend Account' : 'Reactivate Account'}
                </button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Users;
