import React, { useState, useEffect } from 'react';
import {
  Users as UsersIcon, Search, Filter, MoreVertical, CheckCircle2,
  XCircle, Mail, Phone, Calendar, ShieldCheck, ShieldAlert, ChevronRight
} from 'lucide-react';
import { fetchAdminUsers, setAdminUserBlocked } from '../../../../../services/admin';

export function Users() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState('All');
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    fetchAdminUsers().then(setUsers).catch((err) => console.error('Failed to load users', err));
  }, []);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const toggleSuspend = async (user) => {
    const blocked = user.status === 'Active';
    try {
      await setAdminUserBlocked(user.id, blocked);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: blocked ? 'Suspended' : 'Active' } : u)));
      showToast(blocked ? `User ${user.name} suspended` : `User ${user.name} reactivated`, blocked ? 'error' : 'success');
    } catch (err) {
      showToast(err?.response?.data?.message || 'Action failed', 'error');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = filterPlan === 'All' || user.plan === filterPlan;
    return matchesSearch && matchesPlan;
  });

  const displayedUsers = showAll ? filteredUsers : filteredUsers.slice(0, 5);

  const handleExport = () => {
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Plan', 'Pets', 'Status', 'Joined'];
    const csvContent = [
      headers.join(','),
      ...filteredUsers.map(user => 
        [user.id, `"${user.name}"`, user.email, `"${user.phone}"`, user.plan, user.pets, user.status, `"${user.joined}"`].join(',')
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
        {[
          { label: 'Total Users', value: '12,450', trend: '+156 this week', icon: UsersIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Premium Subscribers', value: '3,820', trend: '+42 this week', icon: ShieldCheck, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Suspended Accounts', value: '18', trend: '-2 since yesterday', icon: ShieldAlert, color: 'text-rose-600', bg: 'bg-rose-50' }
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
          <button onClick={() => showToast("Filters opened")} className="p-2 sm:p-2.5 bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl transition">
            <Filter size={16} />
          </button>
        </div>
      </div>

      {/* Users List Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        
        {/* Mobile/Tablet Card View */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden divide-y md:divide-y-0 md:gap-4 md:p-4 divide-slate-100">
          {displayedUsers.map((user) => (
            <div key={user.id} className="p-4 md:rounded-xl md:border md:border-slate-200 flex flex-col gap-3 bg-white hover:bg-slate-50 transition shadow-sm md:shadow-none">
              
              {/* Top Row: Avatar, Name, Status, Action */}
              <div className="flex justify-between items-start">
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full border border-slate-100 shadow-sm shrink-0" />
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
                        <button onClick={() => { setActiveDropdown(null); showToast(`Edit mode for ${user.name}`, 'info'); }} className="w-full text-left px-4 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition">Edit User</button>
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
                    <Mail size={12} className="text-slate-400 shrink-0" /> <span className="truncate">{user.email}</span>
                  </span>
                  <span className="flex items-center gap-2 text-[12px] font-medium text-slate-600">
                    <Phone size={12} className="text-slate-400 shrink-0" /> {user.phone}
                  </span>
                </div>
                
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${user.plan === 'Premium' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {user.plan}
                  </span>
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                    {user.pets} {user.pets === 1 ? 'Pet' : 'Pets'}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${user.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {user.status === 'Active' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    {user.status}
                  </span>
                </div>
              </div>

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
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {displayedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition group">
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                      <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full border-2 border-white shadow-sm shrink-0" />
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
                      <p className="text-[13px] font-semibold text-slate-700 flex items-center gap-1.5"><Mail size={12} className="text-slate-400" /> {user.email}</p>
                      <p className="text-[12px] font-medium text-slate-500 flex items-center gap-1.5"><Phone size={12} className="text-slate-400" /> {user.phone}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 min-w-max">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${user.plan === 'Premium' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {user.plan}
                      </span>
                      <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                        {user.pets} {user.pets === 1 ? 'Pet' : 'Pets'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 min-w-max">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${user.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                      {user.status === 'Active' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                      {user.status}
                    </span>
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
                          <button onClick={() => { setActiveDropdown(null); showToast(`Edit mode for ${user.name}`, 'info'); }} className="w-full text-left px-4 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition">Edit User</button>
                          <div className="h-px bg-slate-100 my-1 w-full"></div>
                          <button onClick={() => { setActiveDropdown(null); toggleSuspend(user); }} className="w-full text-left px-4 py-2 text-[13px] font-semibold text-rose-600 hover:bg-rose-50 transition">{user.status === 'Active' ? 'Suspend' : 'Reactivate'}</button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500 font-medium text-sm">
                    No users found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
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
                   <img src={selectedUser.avatar} alt={selectedUser.name} className="w-16 h-16 rounded-full border-4 border-white shadow-sm" />
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
                               <p className="text-[14px] font-semibold text-slate-700">{selectedUser.phone}</p>
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
                              {selectedUser.plan}
                            </span>
                         </div>
                         <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Account Status</p>
                            <span className={`inline-flex items-center gap-1 mt-1 px-2.5 py-1 rounded-full text-xs font-bold ${selectedUser.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                              {selectedUser.status === 'Active' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                              {selectedUser.status}
                            </span>
                         </div>
                         <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Registered Pets</p>
                            <p className="text-[14px] font-semibold text-slate-700 mt-1">{selectedUser.pets} {selectedUser.pets === 1 ? 'Pet' : 'Pets'}</p>
                         </div>
                         <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">User ID</p>
                            <p className="text-[14px] font-semibold text-slate-700 mt-1">{selectedUser.id}</p>
                         </div>
                      </div>
                   </div>
                </div>
             </div>

             {/* Footer Actions */}
             <div className="p-6 border-t border-slate-100 bg-white grid grid-cols-2 gap-3">
                <button onClick={() => { showToast('Edit interface loaded', 'info'); setIsProfileOpen(false); }} className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-[13px] font-bold hover:bg-slate-50 transition">
                   Edit Details
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
