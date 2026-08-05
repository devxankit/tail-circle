import React, { useState } from 'react';
import { useMemorialProvider } from '../context/MemorialProviderContext';
import { 
  Search, Filter, ChevronRight, MapPin, Calendar, 
  Clock, AlertCircle, CheckCircle, XCircle, Users,
  X, Check
} from 'lucide-react';

export function ServiceRequestsView() {
  const { requests, updateRequestStatus, assignTeamToRequest, team } = useMemorialProvider();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedRequest, setSelectedRequest] = useState(null);
  
  // Drawer states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const filteredRequests = requests.filter(req => {
    const matchesSearch = req.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          req.petName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          req.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || req.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch(status) {
      case 'Pending': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Accepted': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Assigned': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'In Progress': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'Completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Declined': 
      case 'Cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getUrgencyColor = (urgency) => {
    switch(urgency) {
      case 'Urgent': return 'text-red-600 bg-red-50';
      case 'Priority': return 'text-orange-600 bg-orange-50';
      default: return 'text-slate-500 bg-slate-50';
    }
  };

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
      alert(err?.response?.data?.message || 'Could not update this request');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 flex h-[calc(100vh-80px)] overflow-hidden relative">
      
      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${isDrawerOpen ? 'mr-[400px]' : ''} overflow-y-auto custom-scrollbar pr-4`}>
        
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Service Requests</h2>
            <p className="text-sm font-semibold text-slate-500 mt-0.5">Manage all end-of-life service requests.</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search requests..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
            <div className="relative">
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="appearance-none pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Accepted">Accepted</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
              <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Real customer "Talk to Us" callback requests */}
        <CustomerCallbackRequests />

        {/* Table */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="p-4 pl-6">Request details</th>
                  <th className="p-4">Service Type</th>
                  <th className="p-4">Schedule</th>
                  <th className="p-4">Urgency</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition cursor-pointer group" onClick={() => openDrawer(req)}>
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold shadow-inner">
                          {req.petName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{req.petName}</p>
                          <p className="text-[10px] font-semibold text-slate-500">{req.customerName} • {req.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-bold text-slate-700">{req.serviceType}</p>
                      <p className="text-[10px] font-medium text-slate-400 flex items-center gap-1 mt-0.5 truncate max-w-[150px]">
                        <MapPin size={10} /> {req.location}
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <Calendar size={12}/> {req.preferredDate}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock size={10}/> {req.preferredTime}
                      </p>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg ${getUrgencyColor(req.urgency)}`}>
                        {req.urgency}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border rounded-lg ${getStatusColor(req.status)}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition mx-auto cursor-pointer">
                        <ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredRequests.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-10 text-center text-slate-500 text-sm font-semibold">
                      No service requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Side Drawer Component */}
      <div className={`fixed inset-y-0 right-0 w-[400px] bg-white shadow-2xl border-l border-slate-100 transform transition-transform duration-300 z-40 flex flex-col ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {selectedRequest && (
          <>
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
              <div>
                <span className={`inline-block px-2 py-1 text-[10px] font-bold uppercase tracking-wider border rounded mb-2 ${getStatusColor(selectedRequest.status)}`}>
                  {selectedRequest.status}
                </span>
                <h3 className="text-xl font-black text-slate-900 leading-tight">{selectedRequest.serviceType}</h3>
                <p className="text-xs font-semibold text-slate-500 mt-1">{selectedRequest.id}</p>
              </div>
              <button onClick={closeDrawer} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shadow-sm border border-slate-200 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              
              {/* Pet & Customer */}
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm border border-slate-100 font-bold">
                  {selectedRequest.petName.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">{selectedRequest.petName}</p>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">Owner: {selectedRequest.customerName}</p>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Date & Time</p>
                  <p className="text-xs font-bold text-slate-700 flex items-center gap-1"><Calendar size={12}/> {selectedRequest.preferredDate}</p>
                  <p className="text-xs font-bold text-slate-700 flex items-center gap-1 mt-0.5"><Clock size={12}/> {selectedRequest.preferredTime}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Urgency</p>
                  <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase rounded ${getUrgencyColor(selectedRequest.urgency)}`}>
                    {selectedRequest.urgency}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Location</p>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex gap-2">
                  <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
                  <p className="text-xs font-semibold text-slate-700">{selectedRequest.location}</p>
                </div>
              </div>

              {selectedRequest.notes && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Customer Notes</p>
                  <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100 text-yellow-800 text-xs font-medium leading-relaxed">
                    "{selectedRequest.notes}"
                  </div>
                </div>
              )}

              {selectedRequest.addons.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Selected Add-ons</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedRequest.addons.map(addon => (
                      <span key={addon} className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold rounded-full">
                        {addon}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedRequest.assignedTeam && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Assigned Team</p>
                  <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 p-3 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700">
                      <Users size={14}/>
                    </div>
                    <p className="text-sm font-bold text-indigo-900">{selectedRequest.assignedTeam}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Actions - Contextual based on status */}
            <div className="p-6 border-t border-slate-100 bg-white space-y-3">
              
              {selectedRequest.status === 'Pending' && (
                <div className="flex gap-3">
                  <button onClick={() => setShowDeclineModal(true)} className="flex-1 py-3 bg-white border-2 border-red-100 text-red-600 hover:bg-red-50 text-sm font-bold rounded-xl transition cursor-pointer">
                    Decline
                  </button>
                  <button onClick={() => handleAction('Accepted')} className="flex-1 py-3 bg-slate-900 hover:bg-black text-white text-sm font-bold rounded-xl transition shadow-lg cursor-pointer">
                    Accept Request
                  </button>
                </div>
              )}

              {selectedRequest.status === 'Accepted' && (
                <button onClick={() => handleAction('Assigned')} className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-xl transition shadow-lg cursor-pointer flex justify-center items-center gap-2">
                  <Users size={16}/> Assign Team
                </button>
              )}

              {selectedRequest.status === 'Assigned' && (
                <button onClick={() => handleAction('In Progress')} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition shadow-lg cursor-pointer">
                  Mark In Progress
                </button>
              )}

              {selectedRequest.status === 'In Progress' && (
                <button onClick={() => handleAction('Completed')} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition shadow-lg cursor-pointer flex justify-center items-center gap-2">
                  <CheckCircle size={16}/> Complete Service
                </button>
              )}

            </div>
          </>
        )}
      </div>

      {/* Overlay for Drawer */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30 transition-opacity duration-300" 
          onClick={closeDrawer}
        />
      )}

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mb-6 border border-red-100">
              <XCircle size={32} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Decline Request?</h3>
            <p className="text-sm font-semibold text-slate-500 mb-6">Are you sure you want to decline this request? This action cannot be undone.</p>
            
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Reason (Optional)</label>
            <textarea 
              rows="3" 
              placeholder="e.g., Fully booked for the day"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 mb-8"
            ></textarea>

            <div className="flex gap-3">
              <button onClick={() => setShowDeclineModal(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition cursor-pointer">
                Cancel
              </button>
              <button
                onClick={() => {
                  handleAction('Cancelled');
                  setShowDeclineModal(false);
                }}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition shadow-lg cursor-pointer"
              >
                Confirm Decline
              </button>
            </div>
          </div>
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

  const unclaimed = customerRequests.filter((r) => !r.claimed);
  const mine = customerRequests.filter((r) => r.claimed && !r.resolved);

  const handleClaim = async (id) => {
    setBusyId(id);
    try {
      await claimRequest(id);
    } catch (err) {
      alert(err?.response?.data?.message || 'Could not claim this request');
    } finally {
      setBusyId(null);
    }
  };

  const handleResolve = async (id) => {
    setBusyId(id);
    try {
      await resolveRequest(id);
    } catch (err) {
      alert(err?.response?.data?.message || 'Could not update this request');
    } finally {
      setBusyId(null);
    }
  };

  if (!unclaimed.length && !mine.length) return null;

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-6">
      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-1">Customer Callback Requests</h3>
      <p className="text-xs text-slate-500 mb-4">Real families who submitted the "Talk to Us" form — claim one to take it on.</p>

      <div className="space-y-3">
        {mine.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-4 p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900">{r.customerName} {r.petName ? `· ${r.petName}` : ''}</p>
              <p className="text-xs text-slate-500 mt-0.5">{r.phone} {r.message ? `· "${r.message}"` : ''}</p>
            </div>
            <button
              onClick={() => handleResolve(r.id)}
              disabled={busyId === r.id}
              className="shrink-0 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition"
            >
              Mark Handled
            </button>
          </div>
        ))}
        {unclaimed.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-4 p-4 bg-orange-50/50 border border-orange-100 rounded-2xl">
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900">{r.customerName} {r.petName ? `· ${r.petName}` : ''}</p>
              <p className="text-xs text-slate-500 mt-0.5">{r.phone} {r.message ? `· "${r.message}"` : ''}</p>
            </div>
            <button
              onClick={() => handleClaim(r.id)}
              disabled={busyId === r.id}
              className="shrink-0 px-3 py-2 bg-slate-900 hover:bg-black disabled:opacity-50 text-white text-xs font-bold rounded-xl transition"
            >
              Claim
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
