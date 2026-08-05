import React, { useState } from 'react';
import { useMemorialProvider } from '../context/MemorialProviderContext';
import { 
  Users, MapPin, Phone, CheckCircle, 
  Clock, Plus, MoreVertical, Shield
} from 'lucide-react';

export function TeamAssignmentView() {
  const [showAddMember, setShowAddMember] = useState(false);
  const [formData, setFormData] = useState({ name: '', role: 'Driver & Field Staff', phone: '', image: null });

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [activeDropdown, setActiveDropdown] = useState(null);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState(null);

  const { team, addTeamMember, requests, assignTeamToRequest, updateTeamMember, removeTeamMember } = useMemorialProvider();

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTeam = team.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(team.length / itemsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };
  
  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  // Eligible requests for assignment
  const eligibleRequests = requests.filter(r => r.status === 'Accepted' || r.status === 'Pending' || r.status === 'In Progress');

  const getStatusColor = (status) => {
    switch(status) {
      case 'Available': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'Assigned': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'On Route': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'Busy': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'Offline': return 'text-slate-500 bg-slate-50 border-slate-200';
      default: return 'text-slate-500 bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Team Assignment</h2>
          <p className="text-sm font-semibold text-slate-500 mt-0.5">Manage field staff, drivers, and support coordinators.</p>
        </div>
        <button 
          onClick={() => setShowAddMember(true)}
          className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-lg cursor-pointer"
        >
          <Plus size={18} /> Add Team Member
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentTeam.map(member => (
          <div key={member.id} className={`bg-white rounded-3xl border border-slate-100 shadow-sm group hover:shadow-md transition relative ${activeDropdown === member.id ? 'z-50' : 'z-10'}`}>
            <div className="p-6 pb-0">
              <div className="flex justify-between items-start mb-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 font-black text-2xl shadow-inner border border-slate-200 overflow-hidden">
                  {member.image ? (
                    <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                  ) : (
                    member.name.charAt(0)
                  )}
                </div>
                <div className={`px-3 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${getStatusColor(member.status)}`}>
                  {member.status === 'Available' && <CheckCircle size={12}/>}
                  {member.status === 'On Route' && <MapPin size={12}/>}
                  {member.status === 'Assigned' && <Shield size={12}/>}
                  {member.status}
                </div>
              </div>
              <h3 className="text-lg font-black text-slate-900 line-clamp-1">{member.name}</h3>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">{member.role}</p>
            </div>

            <div className="p-6 pt-4 space-y-3">
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <Phone size={14} className="text-slate-400" />
                <span className="text-xs font-semibold text-slate-700">+91-{member.phone}</span>
              </div>
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <MapPin size={14} className="text-slate-400" />
                <span className="text-xs font-semibold text-slate-700">Current: {member.location}</span>
              </div>
            </div>

            <div className="px-6 pb-6 pt-2 flex gap-3">
              <button 
                onClick={() => {
                  setSelectedMember(member);
                  setSelectedRequestId('');
                  setShowAssignModal(true);
                }}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition shadow-md cursor-pointer text-center"
              >
                Assign Request
              </button>
              <div className="relative">
                <button 
                  onClick={() => setActiveDropdown(activeDropdown === member.id ? null : member.id)}
                  className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 transition cursor-pointer"
                >
                  <MoreVertical size={16} />
                </button>

                {activeDropdown === member.id && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <button 
                      onClick={() => {
                        setEditFormData(member);
                        setShowEditModal(true);
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      Edit Profile
                    </button>
                    <button 
                      onClick={() => {
                        setEditFormData(member);
                        setShowEditModal(true);
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      Update Status
                    </button>
                    <div className="my-1 border-t border-slate-100"></div>
                    <button 
                      onClick={() => {
                        removeTeamMember(member.id);
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer"
                    >
                      Remove Member
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <button 
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            &lt;
          </button>
          {[...Array(totalPages)].map((_, idx) => (
            <button 
              key={idx + 1}
              onClick={() => setCurrentPage(idx + 1)}
              className={`w-10 h-10 rounded-xl font-bold text-sm transition cursor-pointer ${currentPage === idx + 1 ? 'bg-slate-900 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {idx + 1}
            </button>
          ))}
          <button 
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            &gt;
          </button>
        </div>
      )}

      {showAddMember && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-slate-900 mb-6">New Team Member</h3>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Profile Photo</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-2xl overflow-hidden border border-slate-200 shrink-0">
                    {formData.image ? (
                      <img src={formData.image} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      formData.name ? formData.name.charAt(0) : '?'
                    )}
                  </div>
                  <label className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl cursor-pointer transition">
                    Upload Photo
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const url = URL.createObjectURL(e.target.files[0]);
                          setFormData({...formData, image: url});
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Role</label>
                <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer">
                  <option>Driver & Field Staff</option>
                  <option>Burial Support</option>
                  <option>Cremation Support</option>
                  <option>Coordinator</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Phone Number</label>
                <div className="flex bg-slate-50 border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-slate-300">
                  <span className="px-4 py-3 text-slate-500 font-semibold border-r border-slate-200 bg-slate-100/50 rounded-l-xl">+91</span>
                  <input 
                    type="tel" 
                    maxLength="10"
                    placeholder="9888877777"
                    value={formData.phone} 
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').substring(0, 10);
                      setFormData({...formData, phone: val});
                    }} 
                    className="w-full px-4 py-3 bg-transparent text-sm font-semibold text-slate-700 focus:outline-none" 
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowAddMember(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition cursor-pointer">
                Cancel
              </button>
              <button 
                onClick={() => {
                  if(formData.name) {
                    addTeamMember(formData);
                    setShowAddMember(false);
                    setFormData({ name: '', role: 'Driver & Field Staff', phone: '', image: null });
                  }
                }} 
                className="flex-1 py-3 bg-slate-900 hover:bg-black text-white text-sm font-bold rounded-xl transition shadow-lg cursor-pointer"
              >
                Save Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editFormData && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-slate-900 mb-6">Edit Team Member</h3>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Profile Photo</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-2xl overflow-hidden border border-slate-200 shrink-0">
                    {editFormData.image ? (
                      <img src={editFormData.image} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      editFormData.name ? editFormData.name.charAt(0) : '?'
                    )}
                  </div>
                  <label className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl cursor-pointer transition">
                    Upload Photo
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const url = URL.createObjectURL(e.target.files[0]);
                          setEditFormData({...editFormData, image: url});
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                <input type="text" value={editFormData.name} onChange={(e) => setEditFormData({...editFormData, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Role</label>
                <select value={editFormData.role} onChange={(e) => setEditFormData({...editFormData, role: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer">
                  <option>Driver & Field Staff</option>
                  <option>Burial Support</option>
                  <option>Cremation Support</option>
                  <option>Coordinator</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Phone Number</label>
                <div className="flex bg-slate-50 border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-slate-300">
                  <span className="px-4 py-3 text-slate-500 font-semibold border-r border-slate-200 bg-slate-100/50 rounded-l-xl">+91</span>
                  <input 
                    type="tel" 
                    maxLength="10"
                    placeholder="9888877777"
                    value={editFormData.phone} 
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').substring(0, 10);
                      setEditFormData({...editFormData, phone: val});
                    }} 
                    className="w-full px-4 py-3 bg-transparent text-sm font-semibold text-slate-700 focus:outline-none" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Status</label>
                <select value={editFormData.status} onChange={(e) => setEditFormData({...editFormData, status: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer">
                  <option value="Available">Available</option>
                  <option value="Assigned">Assigned</option>
                  <option value="On Route">On Route</option>
                  <option value="Busy">Busy</option>
                  <option value="Offline">Offline</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowEditModal(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition cursor-pointer">
                Cancel
              </button>
              <button 
                onClick={() => {
                  if(editFormData.name) {
                    updateTeamMember(editFormData.id, editFormData);
                    setShowEditModal(false);
                  }
                }} 
                className="flex-1 py-3 bg-slate-900 hover:bg-black text-white text-sm font-bold rounded-xl transition shadow-lg cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && selectedMember && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-slate-900 mb-2">Assign Request</h3>
            <p className="text-sm font-medium text-slate-500 mb-6">Assign a service request to <span className="font-bold text-slate-800">{selectedMember.name}</span>.</p>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Select Request</label>
                <select 
                  value={selectedRequestId} 
                  onChange={(e) => setSelectedRequestId(e.target.value)} 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer"
                >
                  <option value="" disabled>Select a pending request...</option>
                  {eligibleRequests.map(req => (
                    <option key={req.id} value={req.id}>
                      {req.id} • {req.petName} ({req.serviceType})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowAssignModal(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition cursor-pointer">
                Cancel
              </button>
              <button 
                onClick={() => {
                  if(selectedRequestId) {
                    assignTeamToRequest(selectedRequestId, selectedMember.name);
                    setShowAssignModal(false);
                  }
                }} 
                className="flex-1 py-3 bg-slate-900 hover:bg-black text-white text-sm font-bold rounded-xl transition shadow-lg cursor-pointer"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
