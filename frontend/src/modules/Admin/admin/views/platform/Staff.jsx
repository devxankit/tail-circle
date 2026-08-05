import React, { useState, useEffect } from 'react';
import { Search, Filter, Shield, Plus, Check, AlertCircle, Trash2, Edit2, Key, Users, Mail, ToggleLeft, ToggleRight } from 'lucide-react';
import { fetchAdminStaff, createAdminStaff, updateAdminStaff, removeAdminStaff } from '../../../../../services/admin';

const ROLE_TO_SLUG = { 'Super Admin': 'super', 'Finance Admin': 'finance', 'Ops Manager': 'ops', 'Support Agent': 'support', 'Moderator': 'moderator' };
const SLUG_TO_ROLE = { super: 'Super Admin', finance: 'Finance Admin', ops: 'Ops Manager', support: 'Support Agent', moderator: 'Moderator' };
const mapStaff = (s) => ({
  id: s.id,
  name: s.name,
  email: s.email,
  role: SLUG_TO_ROLE[s.adminRole] || 'Ops Manager',
  status: s.status === 'Active' ? 'Active' : 'Inactive',
  lastActive: s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never',
});

export function Staff() {
  const [toastMessage, setToastMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('staff');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  // Invite member form states
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Support Agent');

  // Create role form states
  const [roleTitle, setRoleTitle] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [rolePermissions, setRolePermissions] = useState({
    vendors: { read: true, write: false },
    operations: { read: true, write: false },
    services: { read: true, write: false },
    finance: { read: false, write: false },
    platform: { read: false, write: false },
  });

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const initialRoles = [
    { id: 'ROL-01', title: 'Super Admin', desc: 'Full, unrestricted administrative capabilities over all settings, finance, databases, and roles.', membersCount: 1, permissions: { vendors: 'Full R/W', operations: 'Full R/W', services: 'Full R/W', finance: 'Full R/W', platform: 'Full R/W' } },
    { id: 'ROL-02', title: 'Finance Admin', desc: 'Access to commission settings, vendor payouts processing, wallet adjustments, and tax reports.', membersCount: 1, permissions: { vendors: 'Read Only', operations: 'Read Only', services: 'Read Only', finance: 'Full R/W', platform: 'No Access' } },
    { id: 'ROL-03', title: 'Ops Manager', desc: 'Process booking cancellations, verify documents, assign orders, and monitor customer issues.', membersCount: 1, permissions: { vendors: 'Full R/W', operations: 'Full R/W', services: 'Full R/W', finance: 'No Access', platform: 'No Access' } },
    { id: 'ROL-04', title: 'Support Agent', desc: 'View order histories and bookings, chat with users, resolve complaints, and toggle alerts.', membersCount: 1, permissions: { vendors: 'Read Only', operations: 'Full R/W', services: 'Read Only', finance: 'No Access', platform: 'No Access' } },
  ];

  const [staffList, setStaffList] = useState([]);
  const [rolesList, setRolesList] = useState(initialRoles);

  useEffect(() => {
    fetchAdminStaff().then((rows) => setStaffList(rows.map(mapStaff))).catch((err) => console.error('Failed to load staff', err));
  }, []);

  const toggleStaffStatus = async (id) => {
    const member = staffList.find(s => s.id === id);
    try {
      await updateAdminStaff(id, { disabled: member.status === 'Active' });
      setStaffList(staffList.map(s => s.id === id ? { ...s, status: s.status === 'Active' ? 'Inactive' : 'Active' } : s));
      showToast('Staff access status updated');
    } catch (err) {
      showToast(err?.response?.data?.message || 'Update failed', 'error');
    }
  };

  const handleInviteStaff = async (e) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) {
      showToast('Name and email are required', 'error');
      return;
    }
    try {
      const created = await createAdminStaff({ name: inviteName, email: inviteEmail, adminRole: ROLE_TO_SLUG[inviteRole] || 'ops' });
      setStaffList([...staffList, mapStaff(created)]);
      setIsInviteModalOpen(false);
      setInviteName('');
      setInviteEmail('');
      showToast(`Staff member ${inviteEmail} created!`);
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to add staff', 'error');
    }
  };

  const handleCreateRole = (e) => {
    e.preventDefault();
    if (!roleTitle.trim()) {
      showToast('Role title is required', 'error');
      return;
    }

    const formatPerm = (perm) => {
      if (perm.read && perm.write) return 'Full R/W';
      if (perm.read) return 'Read Only';
      return 'No Access';
    };

    const newRole = {
      id: `ROL-0${rolesList.length + 1}`,
      title: roleTitle,
      desc: roleDesc || 'Custom defined administrative permissions.',
      membersCount: 0,
      permissions: {
        vendors: formatPerm(rolePermissions.vendors),
        operations: formatPerm(rolePermissions.operations),
        services: formatPerm(rolePermissions.services),
        finance: formatPerm(rolePermissions.finance),
        platform: formatPerm(rolePermissions.platform),
      }
    };

    setRolesList([...rolesList, newRole]);
    setIsRoleModalOpen(false);
    setRoleTitle('');
    setRoleDesc('');
    showToast(`Role ${roleTitle} created successfully!`);
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Active': return 'bg-emerald-100 text-emerald-700';
      case 'Inactive': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-3 sm:p-6 max-w-[1500px] mx-auto bg-[#FAF7F2] min-h-screen pb-20 relative">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 animate-slide-in-right">
          <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200 flex items-center gap-3">
             {toastMessage.type === 'success' ? (
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><Check size={14}/></div>
             ) : (
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><Trash2 size={14}/></div>
             )}
             <p className="text-[13px] font-bold text-gray-800">{toastMessage.text}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">Admin Staff & Role Permissions</h1>
          <p className="text-[13px] text-gray-500 mt-1">Audit panel staff members, invite support agents, and customize platform security permissions</p>
        </div>
        {activeTab === 'staff' ? (
          <button onClick={() => setIsInviteModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-[#66B4B1] hover:bg-[#66B4B1] text-white text-[13px] font-semibold rounded-lg transition shadow-sm">
            <Plus size={16} /> Invite Admin Staff
          </button>
        ) : (
          <button onClick={() => setIsRoleModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-[#66B4B1] hover:bg-[#66B4B1] text-white text-[13px] font-semibold rounded-lg transition shadow-sm">
            <Plus size={16} /> Create Custom Role
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-[#FAF7F2] overflow-hidden flex flex-col mb-6">
         <div className="border-b border-gray-200 flex items-center px-4">
            <button 
               onClick={() => setActiveTab('staff')}
               className={`flex items-center gap-2 px-6 py-4 text-[14px] font-semibold transition border-b-2 ${activeTab === 'staff' ? 'border-[#66B4B1] text-[#66B4B1]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
               <Users size={18} /> Administrative Staff ({staffList.length})
            </button>
            <button 
               onClick={() => setActiveTab('roles')}
               className={`flex items-center gap-2 px-6 py-4 text-[14px] font-semibold transition border-b-2 ${activeTab === 'roles' ? 'border-[#66B4B1] text-[#66B4B1]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
               <Shield size={18} /> Roles & Authorization Scopes ({rolesList.length})
            </button>
         </div>
      </div>

      {/* Staff Members Tab */}
      {activeTab === 'staff' && (
         <div className="bg-white rounded-xl shadow-sm border border-[#FAF7F2] overflow-hidden flex flex-col">
            <div className="overflow-x-auto min-h-[400px]">
               <table className="w-full text-left border-collapse min-w-[800px] whitespace-nowrap">
                  <thead className="bg-[#FAF7F2] border-b border-[#FAF7F2]">
                     <tr>
                        <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Staff ID</th>
                        <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Name & Email</th>
                        <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Last Active</th>
                        <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-[#FAF7F2]">
                     {staffList.map(st => (
                        <tr key={st.id} className="hover:bg-[#FAF7F2] transition">
                           <td className="px-5 py-4">
                              <span className="text-[13px] font-semibold text-gray-900 font-mono">{st.id}</span>
                           </td>
                           <td className="px-5 py-4">
                              <div className="flex flex-col">
                                 <span className="text-[13px] font-bold text-gray-900">{st.name}</span>
                                 <span className="text-[11px] text-gray-500 font-mono mt-0.5">{st.email}</span>
                              </div>
                           </td>
                           <td className="px-5 py-4">
                              <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded text-[11px] font-semibold">
                                 {st.role}
                              </span>
                           </td>
                           <td className="px-5 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${getStatusBadgeStyle(st.status)}`}>
                                 {st.status}
                              </span>
                           </td>
                           <td className="px-5 py-4 text-[13px] text-gray-500">{st.lastActive}</td>
                           <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-3">
                                 <button onClick={() => toggleStaffStatus(st.id)} className="text-[12px] font-bold text-gray-600 hover:text-gray-900 transition flex items-center gap-1.5">
                                    {st.status === 'Active' ? (
                                       <>
                                          <ToggleRight size={18} className="text-[#66B4B1]" /> Suspend
                                       </>
                                    ) : (
                                       <>
                                          <ToggleLeft size={18} className="text-gray-400" /> Activate
                                       </>
                                    )}
                                 </button>
                                 
                                 <button onClick={async () => {
                                    try {
                                      await removeAdminStaff(st.id);
                                      setStaffList(staffList.filter(s => s.id !== st.id));
                                      showToast('Staff member deleted', 'info');
                                    } catch (err) {
                                      showToast(err?.response?.data?.message || 'Cannot remove', 'error');
                                    }
                                 }} className="p-1.5 text-gray-400 hover:text-rose-600 rounded transition" title="Revoke Invitation">
                                    <Trash2 size={15} />
                                 </button>
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
      )}

      {/* Roles & Permissions Tab */}
      {activeTab === 'roles' && (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rolesList.map(r => (
               <div key={r.id} className="bg-white rounded-xl border border-[#FAF7F2] p-5 shadow-sm hover:border-[#66B4B1] transition flex flex-col justify-between">
                  <div className="space-y-3">
                     <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                        <div className="flex items-center gap-2">
                           <Shield size={16} className="text-[#66B4B1]" />
                           <h3 className="text-[14px] font-bold text-gray-900">{r.title}</h3>
                        </div>
                        <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold font-mono">
                           {r.membersCount} Members
                        </span>
                     </div>
                     <p className="text-[12px] text-gray-500 leading-normal">{r.desc}</p>
                     
                     <div className="space-y-1 pt-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Scope Authorization Mapping</span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-center text-[10px] font-bold text-gray-700">
                           {Object.keys(r.permissions).map((permKey) => (
                              <div key={permKey} className="bg-gray-50 border border-gray-100 p-1.5 rounded">
                                 <p className="capitalize text-gray-400 mb-0.5">{permKey}</p>
                                 <p className={r.permissions[permKey].includes('W') ? 'text-[#66B4B1]' : r.permissions[permKey].includes('R') ? 'text-indigo-600' : 'text-gray-400'}>
                                    {r.permissions[permKey]}
                                 </p>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
                  
                  {r.title !== 'Super Admin' && (
                     <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
                        <button onClick={() => alert("Action triggered: Modify Permissions")} className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition" title="Modify Permissions">
                           <Edit2 size={14} />
                        </button>
                        <button onClick={() => {
                           setRolesList(rolesList.filter(role => role.id !== r.id));
                           showToast(`Role ${r.title} deleted`, 'info');
                        }} className="p-1.5 text-gray-400 hover:text-rose-600 rounded transition" title="Delete Role Schema">
                           <Trash2 size={14} />
                        </button>
                     </div>
                  )}
               </div>
            ))}
         </div>
      )}

      {/* Invite Staff Modal */}
      {isInviteModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm transition-all duration-300">
            <div className="bg-white rounded-xl shadow-xl w-[450px] overflow-hidden animate-fade-in">
               <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <h2 className="text-[16px] font-semibold text-gray-900 flex items-center gap-2">
                     <Mail size={18} className="text-[#66B4B1]" />
                     Invite Admin Staff Member
                  </h2>
               </div>
               <form onSubmit={handleInviteStaff}>
                  <div className="p-6 space-y-4">
                     <div>
                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Full Name</label>
                        <input 
                           type="text" 
                           value={inviteName}
                           onChange={(e) => setInviteName(e.target.value)}
                           placeholder="e.g., Jane Doe"
                           className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white shadow-sm"
                           required
                        />
                     </div>

                     <div>
                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Corporate Email Address</label>
                        <input 
                           type="email" 
                           value={inviteEmail}
                           onChange={(e) => setInviteEmail(e.target.value)}
                           placeholder="e.g., jane.doe@tailcircle.com"
                           className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white shadow-sm"
                           required
                        />
                     </div>

                     <div>
                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Administrative Role</label>
                        <select 
                           value={inviteRole}
                           onChange={(e) => setInviteRole(e.target.value)}
                           className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white appearance-none pr-8 cursor-pointer"
                        >
                           <option value="Super Admin">Super Admin</option>
                           <option value="Finance Admin">Finance Admin</option>
                           <option value="Ops Manager">Ops Manager</option>
                           <option value="Support Agent">Support Agent</option>
                        </select>
                     </div>
                  </div>
                  
                  <div className="p-5 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/30">
                     <button type="button" onClick={() => setIsInviteModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-[13px] font-semibold transition">
                        Cancel
                     </button>
                     <button onClick={() => alert("Action triggered: Send Invite Code")} type="submit" className="px-6 py-2 bg-[#66B4B1] text-white hover:bg-[#66B4B1] rounded-lg text-[13px] font-semibold transition shadow-sm">
                        Send Invite Code
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}

      {/* Create Custom Role Modal */}
      {isRoleModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm transition-all duration-300">
            <div className="bg-white rounded-xl shadow-xl w-[500px] overflow-hidden animate-fade-in">
               <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <h2 className="text-[16px] font-semibold text-gray-900 flex items-center gap-2">
                     <Shield size={18} className="text-[#66B4B1]" />
                     Create Custom Authorization Role
                  </h2>
               </div>
               <form onSubmit={handleCreateRole}>
                  <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
                     <div>
                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Role Title</label>
                        <input 
                           type="text" 
                           value={roleTitle}
                           onChange={(e) => setRoleTitle(e.target.value)}
                           placeholder="e.g., Marketing Moderator"
                           className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white shadow-sm"
                           required
                        />
                     </div>

                     <div>
                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Description</label>
                        <input 
                           type="text" 
                           value={roleDesc}
                           onChange={(e) => setRoleDesc(e.target.value)}
                           placeholder="What are the responsibilities for this role?"
                           className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white shadow-sm"
                        />
                     </div>

                     <div className="space-y-3">
                        <label className="block text-[13px] font-semibold text-gray-700">Module Access Control Matrix</label>
                        
                        <div className="border border-gray-200 rounded-lg overflow-hidden text-[12px]">
                           <div className="grid grid-cols-3 bg-gray-50 p-2.5 border-b border-gray-200 font-bold text-gray-600">
                              <div>Module Name</div>
                              <div className="text-center">Read Access</div>
                              <div className="text-center">Write Access</div>
                           </div>

                           {Object.keys(rolePermissions).map((module) => (
                              <div key={module} className="grid grid-cols-3 p-2.5 border-b border-gray-100 items-center">
                                 <span className="capitalize font-bold text-gray-700">{module}</span>
                                 
                                 <div className="flex justify-center">
                                    <input 
                                       type="checkbox" 
                                       checked={rolePermissions[module].read}
                                       onChange={(e) => setRolePermissions({
                                          ...rolePermissions,
                                          [module]: { ...rolePermissions[module], read: e.target.checked }
                                       })}
                                       className="rounded text-[#66B4B1] focus:ring-[#66B4B1] cursor-pointer"
                                    />
                                 </div>
                                 <div className="flex justify-center">
                                    <input 
                                       type="checkbox" 
                                       checked={rolePermissions[module].write}
                                       onChange={(e) => setRolePermissions({
                                          ...rolePermissions,
                                          [module]: { ...rolePermissions[module], write: e.target.checked }
                                       })}
                                       className="rounded text-[#66B4B1] focus:ring-[#66B4B1] cursor-pointer"
                                    />
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
                  
                  <div className="p-5 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/30">
                     <button type="button" onClick={() => setIsRoleModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-[13px] font-semibold transition">
                        Cancel
                     </button>
                     <button onClick={() => alert("Action triggered: Create Role")} type="submit" className="px-6 py-2 bg-[#66B4B1] text-white hover:bg-[#66B4B1] rounded-lg text-[13px] font-semibold transition shadow-sm">
                        Create Role
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}

    </div>
  );
}
