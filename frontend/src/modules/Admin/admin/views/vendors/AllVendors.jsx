import React, { useState, useEffect } from 'react';
import { Search, Download, Filter, Eye, Edit, Trash2, Ban, X, CheckCircle, FileText, MapPin, Phone, Mail } from 'lucide-react';
import { StatusBadge, ActionMenu, Pagination, PageHeader, StatCard } from '../../components/VendorShared';
import { fetchAdminVendors, approveVendorGuarded, suspendVendorApi } from '../../../../../services/admin';

const TYPE_LABEL = { shop: 'Shop Vendor', meal_subscription: 'Meal Provider', events: 'Event Organizer', clinic: 'Doctor / Clinic', memorial: 'Memorial Provider' };
const STATUS_LABEL = { approved: 'Active', pending: 'Pending', suspended: 'Suspended', rejected: 'Suspended' };
const STAGE_LABEL = { approved: 'Active', pending: 'Under Review', suspended: 'Docs Submitted', rejected: 'Rejected' };

/** Map the API vendor profile to the shape this view was built against. */
function toRow(v) {
  return {
    id: v.id,
    name: v.businessName,
    avatar: v.logo || '',
    type: TYPE_LABEL[v.vendorType] || 'Vendor',
    contact: v.phone,
    location: v.city || '—',
    email: v.email,
    stage: STAGE_LABEL[v.approvalStatus] || v.approvalStatus,
    docs: v.documents || [],
    status: STATUS_LABEL[v.approvalStatus] || 'Pending',
  };
}

export function AllVendors() {
  const [vendorsList, setVendorsList] = useState([]);

  const loadVendors = () => {
    fetchAdminVendors().then((rows) => setVendorsList(rows.map(toRow))).catch((err) => console.error('Failed to load vendors', err));
  };
  useEffect(() => { loadVendors(); }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [selectedVendorForView, setSelectedVendorForView] = useState(null);

  const handleDelete = (id) => {
    // Vendor deletion is not exposed by the platform; suspend instead.
    if (window.confirm('Vendors cannot be deleted — suspend this vendor instead?')) {
      handleStatusChange(id, 'Suspended');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    // Approval can be refused while the vendor's KYC documents are unverified,
    // so the row only changes once the server actually accepted it.
    if (newStatus === 'Active') {
      const name = vendorsList.find(v => v.id === id)?.name;
      if (!(await approveVendorGuarded(id, name))) return;
    } else if (newStatus === 'Suspended') {
      try { await suspendVendorApi(id); } catch (err) { window.alert(err?.message || 'Suspend failed'); return; }
    }
    setVendorsList(prev => prev.map(v => v.id === id ? { ...v, status: newStatus, stage: newStatus === 'Active' ? 'Active' : 'Docs Submitted' } : v));
  };

  const getOptions = (vendor) => {
    const base = [
      { label: 'View Profile', icon: Eye, onClick: () => setSelectedVendorForView(vendor) },
      { label: 'Edit Details', icon: Edit, onClick: () => { setEditingVendor(vendor); setIsModalOpen(true); } }
    ];
    if (vendor.status === 'Pending') {
      base.push({ label: 'Approve Vendor', icon: Filter, onClick: () => handleStatusChange(vendor.id, 'Active') });
    } else if (vendor.status === 'Suspended') {
      base.push({ label: 'Unsuspend', icon: Ban, onClick: () => handleStatusChange(vendor.id, 'Active') });
    } else {
      base.push({ label: 'Suspend', icon: Ban, warning: true, onClick: () => {
        if(window.confirm('Are you sure you want to suspend this vendor?')) {
          handleStatusChange(vendor.id, 'Suspended');
        }
      }});
    }
    base.push({ label: 'Delete', icon: Trash2, danger: true, onClick: () => handleDelete(vendor.id) });
    return base;
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  let filteredVendors = vendorsList.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          v.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          v.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'All Types' || v.type === typeFilter || v.type.includes(typeFilter);
    const matchesStatus = statusFilter === 'All Status' || v.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const paginatedVendors = filteredVendors.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredVendors.length / itemsPerPage);

  const handleSaveVendor = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newVendorData = {
      name: formData.get('name'),
      type: formData.get('type'),
      contact: formData.get('contact'),
      location: formData.get('location'),
      email: formData.get('email'),
      status: formData.get('status'),
    };

    if (editingVendor) {
      setVendorsList(prev => prev.map(v => v.id === editingVendor.id ? { ...v, ...newVendorData } : v));
    } else {
      const newId = Math.max(0, ...vendorsList.map(v => v.id)) + 1;
      setVendorsList(prev => [{
        id: newId,
        ...newVendorData,
        stage: 'Docs Submitted',
        docs: []
      }, ...prev]);
    }
    setIsModalOpen(false);
    setEditingVendor(null);
  };

  const handleExportCSV = () => {
    if (filteredVendors.length === 0) {
      alert("No vendors to export.");
      return;
    }
    
    const headers = ['Vendor', 'Vendor Type', 'Contact', 'Location', 'Email', 'Verification Stage', 'Documents', 'Status'];
    
    const rows = filteredVendors.map(v => [
      `"${v.name}"`, 
      `"${v.type}"`,
      `"${v.contact}"`,
      `"${v.location}"`,
      `"${v.email}"`,
      `"${v.stage}"`,
      `"${v.docs.join(' | ')}"`,
      v.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'tailcircle_vendors_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const TrackerMini = ({ stage }) => {
    if (stage === 'Verified' || stage === 'Active') {
      return (
        <div className="flex items-center gap-2 w-max">
          <CheckCircle size={18} className="text-[#66B4B1]" />
          <span className="text-[12px] font-bold text-[#66B4B1]">{stage}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 w-max">
        <div className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
        <span className="text-[12px] font-bold text-amber-600">{stage}</span>
      </div>
    );
  };

  return (
    <div className="p-3 sm:px-10 sm:py-8 w-full max-w-[1600px] mx-auto min-w-0 overflow-x-hidden transition-all duration-300">
      <PageHeader 
        title="All Vendors" 
        subtitle={`${vendorsList.length} vendors registered on the platform`} 
        action={{ label: '+ Add Vendor', onClick: () => { setEditingVendor(null); setIsModalOpen(true); } }} 
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard title="Total Vendors" value={vendorsList.length} />
        <StatCard title="Active" value={vendorsList.filter(v => v.status === 'Active').length} />
        <StatCard title="Pending Approval" value={vendorsList.filter(v => v.status === 'Pending').length} />
        <StatCard title="Suspended" value={vendorsList.filter(v => v.status === 'Suspended').length} />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100/50 mb-6 flex flex-col sm:flex-row flex-wrap gap-3 p-4 sm:p-5">
        <div className="relative w-full sm:w-64 shrink-0">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by name, email, location..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition"
          />
        </div>
        <div className="grid grid-cols-2 sm:flex flex-1 gap-2 sm:gap-3 w-full">
          <select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full sm:w-auto px-2 sm:px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#66B4B1]/20"
          >
            <option>All Types</option>
            <option>Shop</option>
            <option>Meal</option>
            <option>Event</option>
            <option>Doctor</option>
            <option>Memorial</option>
          </select>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-2 sm:px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#66B4B1]/20"
          >
            <option>All Status</option>
            <option>Active</option>
            <option>Pending</option>
            <option>Suspended</option>
          </select>
          <button 
            onClick={handleExportCSV}
            className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gray-600 hover:bg-gray-50 transition w-full sm:w-auto"
          >
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100/50 mb-6 overflow-hidden">

        {/* Mobile/Tablet Card View */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden divide-y md:divide-y-0 md:gap-4 md:p-4 divide-gray-100">
          {paginatedVendors.length > 0 ? paginatedVendors.map((vendor) => (
            <div key={vendor.id} className="p-4 md:rounded-2xl md:border md:border-gray-100 flex flex-col gap-3.5 bg-white hover:bg-gray-50 transition shadow-sm md:shadow-none">
              
              {/* Header: Avatar, Name, Action */}
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                  <img src={vendor.avatar || `https://ui-avatars.com/api/?name=${vendor.name.replace(/\s+/g, '+')}&background=E1F5EE&color=0F6E56`} alt={vendor.name} className="w-10 h-10 rounded-full object-cover border border-gray-100 shadow-sm shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-[15px] font-bold text-gray-900 leading-tight mb-0.5">
                      {vendor.name}
                    </h3>
                    <p className="text-xs text-gray-500 font-medium">{vendor.type}</p>
                  </div>
                </div>
                <div className="shrink-0 -mt-1 -mr-2">
                   <ActionMenu options={getOptions(vendor)} />
                </div>
              </div>
              
              {/* Tags/Info Row */}
              <div className="flex flex-wrap items-center gap-2 pl-0 sm:pl-[52px]">
                <StatusBadge status={vendor.status} />
                <TrackerMini stage={vendor.stage} />
                <span className="flex items-center gap-1 text-[11px] font-bold text-gray-600 bg-gray-50 px-2 py-1 rounded-md border border-gray-200">
                  <MapPin size={12} className="text-gray-400" /> {vendor.location}
                </span>
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#66B4B1] bg-[#FAF7F2] px-2 py-1 rounded-md border border-[#66B4B1]/20">
                  <Phone size={12} /> {vendor.contact}
                </span>
              </div>

              {/* Email Row */}
              <div className="flex items-center gap-2 mt-1 pl-0 sm:pl-[52px]">
                <Mail size={12} className="text-gray-400" />
                <span className="text-[12px] font-medium text-gray-600 truncate">{vendor.email}</span>
              </div>

            </div>
          )) : (
            <div className="p-8 md:col-span-2 text-center text-gray-500 font-medium text-sm">
              No vendors found matching your criteria.
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Vendor</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Vendor Type</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[180px]">Verification Stage</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Document</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedVendors.length > 0 ? paginatedVendors.map((vendor, index) => (
                <tr key={vendor.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <img src={vendor.avatar || `https://ui-avatars.com/api/?name=${vendor.name.replace(/\s+/g, '+')}&background=E1F5EE&color=0F6E56`} alt={vendor.name} className="w-9 h-9 rounded-full object-cover border border-gray-100 shadow-sm shrink-0" />
                      <div>
                        <div className="text-sm font-bold text-gray-900 whitespace-nowrap">{vendor.name}</div>
                        <StatusBadge status={vendor.status} />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-medium whitespace-nowrap">{vendor.type}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-medium whitespace-nowrap">{vendor.contact}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{vendor.location}</td>
                  <td className="px-6 py-4 text-sm text-gray-505 whitespace-nowrap">{vendor.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <TrackerMini stage={vendor.stage} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1 w-max whitespace-nowrap">
                      {vendor.docs.length > 0 ? vendor.docs.map(doc => (
                        <span key={doc} className="flex items-center gap-1 text-[#66B4B1] font-semibold bg-[#66B4B1]/10 px-2 py-0.5 rounded text-[10px] whitespace-nowrap">
                          <FileText size={10} /> {doc}
                        </span>
                      )) : (
                        <span className="text-[10px] text-amber-500 font-medium whitespace-nowrap">None</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                      <button className="text-[12px] font-bold text-[#66B4B1] hover:text-[#66B4B1] transition whitespace-nowrap" onClick={() => setSelectedVendorForView(vendor)}>View</button>
                      <ActionMenu options={getOptions(vendor)} />
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500 font-medium">
                    No vendors found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 0 && (
          <Pagination 
            current={currentPage} 
            total={filteredVendors.length} 
            pages={totalPages} 
            onPageChange={setCurrentPage} 
          />
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-gray-900/40 backdrop-blur-sm transition-all duration-300 pb-safe sm:pb-0">
          <div className="absolute inset-0 bg-gray-900/40" onClick={() => { setIsModalOpen(false); setEditingVendor(null); }} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden border border-gray-100/50">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white shrink-0">
              <h3 className="text-lg font-bold text-gray-900">{editingVendor ? 'Edit Vendor' : 'Add New Vendor'}</h3>
              <button onClick={() => { setIsModalOpen(false); setEditingVendor(null); }} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-lg transition"><X size={20}/></button>
            </div>
            <div className="overflow-y-auto p-5 flex-1">
              <form onSubmit={handleSaveVendor} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Vendor Name</label>
                  <input required name="name" defaultValue={editingVendor?.name} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Vendor Type</label>
                    <select name="type" defaultValue={editingVendor?.type || 'Shop Vendor'} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 transition">
                      <option>Shop Vendor</option>
                      <option>Meal Provider</option>
                      <option>Event Organizer</option>
                      <option>Doctor / Clinic</option>
                      <option>Memorial Provider</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Location</label>
                    <input required name="location" defaultValue={editingVendor?.location} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Contact Number</label>
                  <input required name="contact" defaultValue={editingVendor?.contact} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
                  <input required type="email" name="email" defaultValue={editingVendor?.email} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Status</label>
                  <select name="status" defaultValue={editingVendor?.status || 'Pending'} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 transition">
                    <option>Active</option>
                    <option>Pending</option>
                    <option>Suspended</option>
                    <option>Blocked</option>
                  </select>
                </div>
                <div className="pt-6 pb-8 sm:pb-2 flex gap-3 shrink-0">
                  <button type="button" onClick={() => { setIsModalOpen(false); setEditingVendor(null); }} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2.5 bg-[#66B4B1] hover:bg-[#66B4B1] rounded-xl text-sm font-bold text-white shadow-sm shadow-[#66B4B1]/20 transition">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Side-Drawer for General Vendor Profile Details */}
      {selectedVendorForView && (
        <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/40 backdrop-blur-sm transition-all duration-300">
          <div className="absolute inset-0" onClick={() => setSelectedVendorForView(null)} />
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-slide-left">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
                <img src={selectedVendorForView.avatar || `https://ui-avatars.com/api/?name=${selectedVendorForView.name.replace(/\s+/g, '+')}&background=E1F5EE&color=0F6E56`} alt={selectedVendorForView.name} className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-sm shrink-0" />
                <div>
                  <h3 className="text-lg font-black text-gray-900 leading-tight">{selectedVendorForView.name}</h3>
                  <p className="text-xs text-gray-500 font-bold mt-0.5">{selectedVendorForView.type}</p>
                </div>
              </div>
              <button onClick={() => setSelectedVendorForView(null)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-xl transition">
                <X size={20} />
              </button>
            </div>
            
            {/* Drawer Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status & Stage */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 uppercase">Account Status</span>
                  <StatusBadge status={selectedVendorForView.status} />
                </div>
                <div className="flex items-center gap-1 bg-[#FAF7F2] border border-[#66B4B1]/30 px-2.5 py-1 rounded-xl">
                  <span className="text-xs font-black text-[#599D9A]">{selectedVendorForView.stage}</span>
                </div>
              </div>

              {/* Vendor & Contact Info Block */}
              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Contact Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Vendor Type</span>
                    <span className="text-sm font-black text-gray-800">{selectedVendorForView.type}</span>
                  </div>
                  <div className="bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Location / City</span>
                    <span className="text-sm font-bold text-gray-800 flex items-center gap-1">
                      <MapPin size={13} className="text-gray-500" /> {selectedVendorForView.location}
                    </span>
                  </div>
                  <div className="bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Contact Phone</span>
                    <a href={`tel:${selectedVendorForView.contact}`} className="text-sm font-bold text-[#66B4B1] hover:underline flex items-center gap-1.5">
                      <Phone size={13} /> {selectedVendorForView.contact}
                    </a>
                  </div>
                  <div className="bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Contact Email</span>
                    <a href={`mailto:${selectedVendorForView.email}`} className="text-sm font-bold text-[#66B4B1] hover:underline flex items-center gap-1.5 truncate">
                      <Mail size={13} /> {selectedVendorForView.email}
                    </a>
                  </div>
                </div>
              </div>

              {/* Verified Documents */}
              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Submitted Documents</h4>
                <div className="space-y-2">
                  {selectedVendorForView.docs.length > 0 ? selectedVendorForView.docs.map(doc => (
                    <div key={doc} className="flex items-center justify-between p-3 bg-gray-50/50 border border-gray-100 rounded-2xl">
                      <span className="text-xs font-bold text-gray-700 flex items-center gap-2"><FileText size={14} className="text-[#66B4B1]" /> {doc}</span>
                      <span className="text-[10px] font-black uppercase text-[#66B4B1] bg-[#FAF7F2] px-2 py-0.5 rounded-lg flex items-center gap-0.5"><CheckCircle size={10} /> Verified</span>
                    </div>
                  )) : (
                    <div className="text-xs text-amber-500 bg-amber-50 border border-amber-150 p-3 rounded-2xl font-bold">No documents submitted yet.</div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Drawer Actions Footer */}
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-3 shadow-inner">
              <button 
                onClick={() => {
                  setEditingVendor(selectedVendorForView);
                  setSelectedVendorForView(null);
                  setIsModalOpen(true);
                }}
                className="flex-1 py-3 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-xl text-sm font-bold shadow-sm transition"
              >
                Edit Details
              </button>
              {selectedVendorForView.status === 'Active' ? (
                <button 
                  onClick={() => {
                    handleStatusChange(selectedVendorForView.id, 'Suspended');
                    setSelectedVendorForView(null);
                  }}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold shadow-sm transition"
                >
                  Suspend Account
                </button>
              ) : (
                <button 
                  onClick={() => {
                    handleStatusChange(selectedVendorForView.id, 'Active');
                    setSelectedVendorForView(null);
                  }}
                  className="flex-1 py-3 bg-[#66B4B1] hover:bg-[#66B4B1] text-white rounded-xl text-sm font-bold shadow-sm transition"
                >
                  Activate Vendor
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
