import React, { useState } from 'react';
import { useMemorialProvider } from '../context/MemorialProviderContext';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, Users, CalendarCheck, 
  Wallet, Clock, AlertCircle, FileText, CheckCircle,
  Search, MoreVertical, MapPin, Phone, UserPlus, ArrowRight
} from 'lucide-react';

export function DashboardOverview() {
  const { kpis, requests, team } = useMemorialProvider();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [activeMenu, setActiveMenu] = useState(null);

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
      case 'Available': return 'bg-emerald-500';
      case 'Assigned': return 'bg-orange-500';
      case 'On Route': return 'bg-blue-500';
      case 'Offline': return 'bg-slate-300';
      default: return 'bg-slate-300';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Memorial Overview</h2>
          <p className="text-sm font-semibold text-slate-500 mt-0.5">Manage today's end-of-life service operations.</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: 'New Requests', value: dynamicKpis.newRequests, icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Scheduled Today', value: dynamicKpis.todayScheduled, icon: CalendarCheck, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Pending Proofs', value: dynamicKpis.pendingProofs, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Total Earnings', value: dynamicKpis.totalEarnings, icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50' }
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{kpi.label}</p>
              <h3 className="text-2xl font-black text-slate-900">{kpi.value}</h3>
            </div>
            <div className={`w-12 h-12 rounded-2xl ${kpi.bg} ${kpi.color} flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform`}>
              <kpi.icon size={20} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Left Column: Timeline & Urgent */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Urgent Requests Alert */}
          {urgentRequests.length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle size={20} className="text-red-600" />
                <h3 className="text-sm font-black text-red-900 uppercase tracking-wider">Urgent Pending Requests</h3>
              </div>
              <div className="space-y-3">
                {urgentRequests.map(req => (
                  <div key={req.id} className="bg-white p-4 rounded-2xl border border-red-100 flex items-center justify-between shadow-sm">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{req.petName}</p>
                      <p className="text-[10px] font-semibold text-slate-500 mt-0.5">{req.serviceType} • {req.location}</p>
                    </div>
                    <button 
                      onClick={() => navigate('/vendor/memorial-provider/requests')}
                      className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition shadow-sm cursor-pointer"
                    >
                      Review
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Today's Timeline */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-base font-black text-slate-900 mb-6">Today's Service Timeline</h3>
            
            <div className="relative pl-6 space-y-8 border-l-2 border-slate-100 ml-4">
              {todayTimeline.map((req, i) => (
                <div key={req.id} className="relative">
                  <div className={`absolute -left-[31px] w-4 h-4 rounded-full border-4 border-white shadow-sm ${req.status === 'Completed' ? 'bg-emerald-500' : req.status === 'In Progress' ? 'bg-blue-500' : 'bg-slate-300'}`} />
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded shadow-sm inline-flex items-center gap-1 mb-2">
                          <Clock size={10}/> {req.preferredTime}
                        </span>
                        <h4 className="text-sm font-black text-slate-900">{req.serviceType}</h4>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${req.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : req.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'}`}>
                        {req.status}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-600">{req.petName} — {req.customerName}</p>
                    <p className="text-[10px] font-medium text-slate-400 mt-1">{req.location}</p>
                    {req.assignedTeam && (
                      <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-2">
                        <Users size={12} className="text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-600">Assigned: {req.assignedTeam}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Team & Quick Actions */}
        <div className="space-y-6">
          
          <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <h3 className="text-sm font-black text-white/90 mb-4 flex items-center gap-2">
              <TrendingUp size={16} /> Revenue Snapshot
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Today</p>
                <p className="text-2xl font-black text-white">₹8,500</p>
              </div>
              <div className="pt-4 border-t border-white/10">
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider">This Week</p>
                <p className="text-lg font-black text-slate-300">₹32,400</p>
              </div>
            </div>
          </div>

          {/* Team Availability Widget */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[500px]">
            {/* Header */}
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-slate-700"/>
                  <h3 className="text-base font-black text-slate-900">Team Availability</h3>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{team.length} members</span>
                </div>
                <button 
                  onClick={() => navigate('/vendor/memorial-provider/team')}
                  className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 transition cursor-pointer"
                >
                  View All <ArrowRight size={12} />
                </button>
              </div>

              {/* Status Chips */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-[10px] font-bold text-emerald-700 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/> Available: {availableCount}
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50 border border-orange-100 text-[10px] font-bold text-orange-700 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500"/> Assigned: {assignedCount}
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 text-[10px] font-bold text-blue-700 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"/> On Route: {onRouteCount}
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-600 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"/> Offline: {offlineCount}
                </div>
              </div>

              {/* Search & Tabs */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="text" 
                    placeholder="Search name or role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-200 transition"
                  />
                </div>
                <div className="flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {['All', 'Available', 'Assigned', 'On Route', 'Offline'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setStatusFilter(tab)}
                      className={`px-3 py-1.5 text-[10px] font-bold rounded-lg whitespace-nowrap transition cursor-pointer ${
                        statusFilter === tab 
                          ? 'bg-slate-800 text-white shadow-sm' 
                          : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Member List (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredTeam.map(member => (
                <div key={member.id} className="bg-white border border-slate-100 p-3 rounded-2xl hover:border-slate-200 hover:shadow-sm transition group relative">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm border border-slate-200">
                          {member.name.charAt(0)}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(member.status)}`} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 leading-tight">{member.name}</p>
                        <p className="text-[10px] font-semibold text-slate-500">{member.role}</p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => setActiveMenu(activeMenu === member.id ? null : member.id)}
                      className="p-1 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition cursor-pointer"
                    >
                      <MoreVertical size={14} />
                    </button>
                  </div>

                  {member.status !== 'Available' && member.status !== 'Offline' && (
                    <div className="mt-2.5 text-[10px] font-medium text-slate-500 bg-slate-50 px-2 py-1.5 rounded-lg flex items-center gap-1.5">
                      <MapPin size={10} className="text-slate-400" />
                      Assigned: Active Request
                    </div>
                  )}

                  {/* Quick Action Menu */}
                  {activeMenu === member.id && (
                    <div className="absolute top-10 right-8 w-40 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-10 animate-in fade-in zoom-in-95 duration-100">
                      <button className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer">
                        <UserPlus size={12} className="text-slate-400" /> Assign Request
                      </button>
                      <button className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer">
                        <Phone size={12} className="text-slate-400" /> Contact Member
                      </button>
                      <div className="h-px bg-slate-100 my-1" />
                      <button className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer">
                        <FileText size={12} className="text-slate-400" /> View Details
                      </button>
                    </div>
                  )}
                </div>
              ))}
              
              {filteredTeam.length === 0 && (
                <div className="py-8 text-center">
                  <Users className="mx-auto mb-2 text-slate-300" size={24} />
                  <p className="text-xs font-semibold text-slate-500">No team members found</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
