import React, { useState } from 'react';
import { useMemorialProvider } from '../context/MemorialProviderContext';
import { 
  Users, MapPin, Phone, CheckCircle, 
  Clock, Plus, MoreVertical, Shield, ChevronLeft, ChevronRight, Pencil, Activity, Trash2
} from 'lucide-react';
import { BottomSheet, ActionSheet, PrimaryButton, StatusBadge, fieldClass, labelClass } from '../../vendor/mobile';

const MEMBER_TONE = { Available: 'success', Assigned: 'primary', 'On Route': 'info', Busy: 'warning', Offline: 'neutral' };

/** The +91 phone field both member forms use. */
function PhoneField({ value, onChange }) {
  return (
    <div className="flex h-12 bg-white border border-border-light rounded-xl focus-within:ring-2 focus-within:ring-accent-teal/20 focus-within:border-accent-teal overflow-hidden">
      <span className="px-4 flex items-center text-text-secondary font-semibold border-r border-border-light bg-bg-primary">+91</span>
      <input
        type="tel"
        inputMode="numeric"
        maxLength="10"
        placeholder="9888877777"
        value={value}
        onChange={onChange}
        className="w-full min-w-0 px-4 bg-transparent text-[16px] text-text-primary focus:outline-none"
      />
    </div>
  );
}

/** Photo + upload label, shared by the add and edit forms. */
function PhotoField({ image, name, onChange }) {
  return (
    <div>
      <label className={labelClass}>Profile Photo</label>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-bg-primary flex items-center justify-center text-text-secondary font-black text-2xl overflow-hidden border border-border-light shrink-0">
          {image ? (
            <img src={image} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            name ? name.charAt(0) : '?'
          )}
        </div>
        <label className="min-h-[44px] px-4 flex items-center bg-white border border-border-light text-text-primary text-xs font-bold rounded-xl cursor-pointer transition">
          Upload Photo
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onChange}
          />
        </label>
      </div>
    </div>
  );
}

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

  const dropdownMember = team.find((m) => m.id === activeDropdown);

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-text-primary leading-tight">Team Assignment</h2>
          <p className="text-xs text-text-secondary mt-1">Manage field staff, drivers, and support coordinators.</p>
        </div>
        <button
          onClick={() => setShowAddMember(true)}
          className="h-11 px-4 rounded-full bg-primary-main text-white text-sm font-bold flex items-center gap-1.5 shadow-md shadow-primary-main/25 shrink-0 cursor-pointer"
        >
          <Plus size={16} /> Add Member
        </button>
      </div>

      <div className="space-y-3">
        {currentTeam.map(member => (
          <div key={member.id} className="bg-white rounded-[20px] border border-border-light shadow-sm">
            <div className="p-4 flex items-start gap-3">
              <div className="w-14 h-14 rounded-2xl bg-bg-primary flex items-center justify-center text-text-secondary font-black text-xl border border-border-light overflow-hidden shrink-0">
                {member.image ? (
                  <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                ) : (
                  member.name.charAt(0)
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-black text-text-primary line-clamp-1">{member.name}</h3>
                <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mt-0.5">{member.role}</p>
                <StatusBadge
                  className="mt-1.5"
                  tone={MEMBER_TONE[member.status] || 'neutral'}
                  label={(
                    <span className="inline-flex items-center gap-1">
                      {member.status === 'Available' && <CheckCircle size={11}/>}
                      {member.status === 'On Route' && <MapPin size={11}/>}
                      {member.status === 'Assigned' && <Shield size={11}/>}
                      {member.status}
                    </span>
                  )}
                />
              </div>
              <button
                onClick={() => setActiveDropdown(activeDropdown === member.id ? null : member.id)}
                aria-label="Member actions"
                className="w-11 h-11 -mr-2 -mt-1 rounded-full flex items-center justify-center text-text-secondary active:bg-bg-secondary transition cursor-pointer shrink-0"
              >
                <MoreVertical size={18} />
              </button>
            </div>

            <div className="px-4 grid grid-cols-1 gap-2">
              <div className="flex items-center gap-3 bg-bg-primary p-3 rounded-xl border border-border-light">
                <Phone size={14} className="text-text-secondary" />
                <span className="text-xs font-semibold text-text-primary">+91-{member.phone}</span>
              </div>
              <div className="flex items-center gap-3 bg-bg-primary p-3 rounded-xl border border-border-light">
                <MapPin size={14} className="text-text-secondary" />
                <span className="text-xs font-semibold text-text-primary">Current: {member.location}</span>
              </div>
            </div>

            <div className="p-4">
              <button
                onClick={() => {
                  setSelectedMember(member);
                  setSelectedRequestId('');
                  setShowAssignModal(true);
                }}
                className="w-full min-h-[44px] bg-text-primary text-white text-sm font-bold rounded-xl transition shadow-sm cursor-pointer text-center"
              >
                Assign Request
              </button>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-2">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            aria-label="Previous page"
            className="w-11 h-11 rounded-xl bg-white border border-border-light flex items-center justify-center text-text-primary transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={18} />
          </button>
          {[...Array(totalPages)].map((_, idx) => (
            <button
              key={idx + 1}
              onClick={() => setCurrentPage(idx + 1)}
              className={`w-11 h-11 rounded-xl font-bold text-sm transition cursor-pointer ${currentPage === idx + 1 ? 'bg-text-primary text-white shadow-md' : 'bg-white border border-border-light text-text-primary'}`}
            >
              {idx + 1}
            </button>
          ))}
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            aria-label="Next page"
            className="w-11 h-11 rounded-xl bg-white border border-border-light flex items-center justify-center text-text-primary transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* The member dropdown, as an action sheet — same three actions. */}
      <ActionSheet
        open={!!dropdownMember}
        onClose={() => setActiveDropdown(null)}
        title={dropdownMember?.name}
        actions={dropdownMember ? [
          {
            key: 'edit',
            label: 'Edit Profile',
            icon: Pencil,
            onClick: () => {
              setEditFormData(dropdownMember);
              setShowEditModal(true);
              setActiveDropdown(null);
            },
          },
          {
            key: 'status',
            label: 'Update Status',
            icon: Activity,
            onClick: () => {
              setEditFormData(dropdownMember);
              setShowEditModal(true);
              setActiveDropdown(null);
            },
          },
          {
            key: 'remove',
            label: 'Remove Member',
            icon: Trash2,
            danger: true,
            onClick: () => {
              removeTeamMember(dropdownMember.id);
              setActiveDropdown(null);
            },
          },
        ] : []}
      />

      {/* Add member sheet */}
      <BottomSheet
        open={showAddMember}
        onClose={() => setShowAddMember(false)}
        title="New Team Member"
        footer={(
          <div className="flex gap-2">
            <PrimaryButton tone="soft" onClick={() => setShowAddMember(false)}>Cancel</PrimaryButton>
            <PrimaryButton
              tone="dark"
              onClick={() => {
                if(formData.name) {
                  addTeamMember(formData);
                  setShowAddMember(false);
                  setFormData({ name: '', role: 'Driver & Field Staff', phone: '', image: null });
                }
              }}
            >
              Save Member
            </PrimaryButton>
          </div>
        )}
      >
        <div className="space-y-4 pb-2">
          <PhotoField
            image={formData.image}
            name={formData.name}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                const url = URL.createObjectURL(e.target.files[0]);
                setFormData({...formData, image: url});
              }
            }}
          />
          <div>
            <label className={labelClass}>Full Name</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Role</label>
            <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className={fieldClass}>
              <option>Driver & Field Staff</option>
              <option>Burial Support</option>
              <option>Cremation Support</option>
              <option>Coordinator</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Phone Number</label>
            <PhoneField
              value={formData.phone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').substring(0, 10);
                setFormData({...formData, phone: val});
              }}
            />
          </div>
        </div>
      </BottomSheet>

      {/* Edit sheet */}
      <BottomSheet
        open={showEditModal && !!editFormData}
        onClose={() => setShowEditModal(false)}
        title="Edit Team Member"
        footer={(
          <div className="flex gap-2">
            <PrimaryButton tone="soft" onClick={() => setShowEditModal(false)}>Cancel</PrimaryButton>
            <PrimaryButton
              tone="dark"
              onClick={() => {
                if(editFormData.name) {
                  updateTeamMember(editFormData.id, editFormData);
                  setShowEditModal(false);
                }
              }}
            >
              Save Changes
            </PrimaryButton>
          </div>
        )}
      >
        {editFormData && (
          <div className="space-y-4 pb-2">
            <PhotoField
              image={editFormData.image}
              name={editFormData.name}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  const url = URL.createObjectURL(e.target.files[0]);
                  setEditFormData({...editFormData, image: url});
                }
              }}
            />
            <div>
              <label className={labelClass}>Full Name</label>
              <input type="text" value={editFormData.name} onChange={(e) => setEditFormData({...editFormData, name: e.target.value})} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Role</label>
              <select value={editFormData.role} onChange={(e) => setEditFormData({...editFormData, role: e.target.value})} className={fieldClass}>
                <option>Driver & Field Staff</option>
                <option>Burial Support</option>
                <option>Cremation Support</option>
                <option>Coordinator</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Phone Number</label>
              <PhoneField
                value={editFormData.phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').substring(0, 10);
                  setEditFormData({...editFormData, phone: val});
                }}
              />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select value={editFormData.status} onChange={(e) => setEditFormData({...editFormData, status: e.target.value})} className={fieldClass}>
                <option value="Available">Available</option>
                <option value="Assigned">Assigned</option>
                <option value="On Route">On Route</option>
                <option value="Busy">Busy</option>
                <option value="Offline">Offline</option>
              </select>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Assign sheet */}
      <BottomSheet
        open={showAssignModal && !!selectedMember}
        onClose={() => setShowAssignModal(false)}
        title="Assign Request"
        subtitle={selectedMember ? `Assign a service request to ${selectedMember.name}.` : undefined}
        footer={(
          <div className="flex gap-2">
            <PrimaryButton tone="soft" onClick={() => setShowAssignModal(false)}>Cancel</PrimaryButton>
            <PrimaryButton
              tone="dark"
              onClick={() => {
                if(selectedRequestId) {
                  assignTeamToRequest(selectedRequestId, selectedMember.name);
                  setShowAssignModal(false);
                }
              }}
            >
              Assign
            </PrimaryButton>
          </div>
        )}
      >
        <div className="pb-2">
          <label className={labelClass}>Select Request</label>
          <select
            value={selectedRequestId}
            onChange={(e) => setSelectedRequestId(e.target.value)}
            className={fieldClass}
          >
            <option value="" disabled>Select a pending request...</option>
            {eligibleRequests.map(req => (
              <option key={req.id} value={req.id}>
                {req.id} • {req.petName} ({req.serviceType})
              </option>
            ))}
          </select>
        </div>
      </BottomSheet>

    </div>
  );
}
