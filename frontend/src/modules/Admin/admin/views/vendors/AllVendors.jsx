import React, { useState, useEffect } from 'react';
import { 
  Search, Download, Filter, Eye, Edit, Trash2, Ban, X, CheckCircle, XCircle, 
  FileText, MapPin, Phone, Mail, ExternalLink, ShieldCheck, AlertTriangle, 
  RefreshCw, UserCheck, Building, CreditCard, Check, Sparkles 
} from 'lucide-react';
import { StatusBadge, ActionMenu, Pagination, PageHeader, StatCard } from '../../components/VendorShared';
import { 
  fetchAdminVendors, approveVendorGuarded, suspendVendorApi, 
  verifyAdminDocument, fetchVendorDocuments 
} from '../../../../../services/admin';

const TYPE_LABEL = { 
  shop: 'Shop Vendor', 
  meal_subscription: 'Meal Provider', 
  events: 'Event Organizer', 
  clinic: 'Doctor / Clinic', 
  memorial: 'Memorial Provider' 
};

const STATUS_LABEL = { 
  approved: 'Active', 
  pending: 'Pending', 
  suspended: 'Suspended', 
  rejected: 'Suspended' 
};

const STAGE_LABEL = { 
  approved: 'Active', 
  pending: 'Under Review', 
  suspended: 'Docs Submitted', 
  rejected: 'Rejected' 
};

/** Map the API vendor profile to the shape this view renders. */
function toRow(v) {
  const docs = (v.documentStatuses || []).map(d => ({
    kind: d.kind,
    label: d.label,
    url: d.url || '',
    status: d.status || 'Pending',
    required: d.required,
    verifiedBy: d.verifiedBy || '',
    verifiedAt: d.verifiedAt || null,
  }));

  const missing = v.missing || [];

  return {
    id: v.id,
    name: v.businessName || 'Unnamed Vendor',
    avatar: v.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(v.businessName || 'Vendor')}&background=E1F5EE&color=0F6E56`,
    type: TYPE_LABEL[v.vendorType] || v.vendorType || 'Vendor',
    vendorTypeRaw: v.vendorType,
    contact: v.phone || '—',
    location: v.city || '—',
    email: v.email || '—',
    stage: v.approvalStatus === 'approved' ? 'Active' : missing.length ? 'KYC Incomplete' : STAGE_LABEL[v.approvalStatus] || 'Pending',
    docs,
    missing,
    bank: v.bank || {},
    status: STATUS_LABEL[v.approvalStatus] || 'Pending',
    approvalStatusRaw: v.approvalStatus,
    raw: v,
  };
}

export function AllVendors() {
  const [vendorsList, setVendorsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);

  // Document Lightbox Preview State
  const [selectedDocForPreview, setSelectedDocForPreview] = useState(null); // { vendor, doc }
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [selectedVendorForView, setSelectedVendorForView] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadVendors = () => {
    setLoading(true);
    fetchAdminVendors()
      .then((rows) => setVendorsList(rows.map(toRow)))
      .catch((err) => console.error('Failed to load vendors', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadVendors(); }, []);

  // Handle Document Verification Action (Verify, Reject, Reupload)
  const handleVerifyDocument = async (vendorId, docKind, action) => {
    try {
      await verifyAdminDocument(vendorId, docKind, action);
      showToast(`Document action '${action}' recorded for vendor.`);
      loadVendors();

      // Update selected drawer or preview if open
      if (selectedVendorForView?.id === vendorId) {
        fetchVendorDocuments(vendorId).then(data => {
          if (data?.documentStatuses) {
            setSelectedVendorForView(prev => prev ? {
              ...prev,
              docs: data.documentStatuses.map(d => ({
                kind: d.kind,
                label: d.label,
                url: d.url || '',
                status: d.status || 'Pending',
                required: d.required,
                verifiedBy: d.verifiedBy || '',
                verifiedAt: d.verifiedAt || null,
              })),
              missing: data.missing || [],
            } : null);
          }
        }).catch(() => {});
      }

      if (selectedDocForPreview?.vendor?.id === vendorId && selectedDocForPreview?.doc?.kind === docKind) {
        setSelectedDocForPreview(prev => prev ? {
          ...prev,
          doc: {
            ...prev.doc,
            status: action === 'verify' ? 'Verified' : action === 'reject' ? 'Rejected' : 'Re-upload',
          }
        } : null);
      }
    } catch (err) {
      alert(err?.message || 'Failed to update document status');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    if (newStatus === 'Active') {
      const vendor = vendorsList.find(v => v.id === id);
      const ok = await approveVendorGuarded(id, vendor?.name);
      if (!ok) return;
      showToast(`Vendor "${vendor?.name}" approved successfully!`);
    } else if (newStatus === 'Suspended') {
      try {
        await suspendVendorApi(id);
        showToast(`Vendor suspended.`);
      } catch (err) {
        alert(err?.message || 'Suspend failed');
        return;
      }
    }
    loadVendors();
  };

  const handleDelete = (id) => {
    if (window.confirm('Vendors cannot be deleted permanently — suspend account instead?')) {
      handleStatusChange(id, 'Suspended');
    }
  };

  const getOptions = (vendor) => {
    const base = [
      { label: 'View Profile', icon: Eye, onClick: () => setSelectedVendorForView(vendor) },
      { label: 'Edit Details', icon: Edit, onClick: () => { setEditingVendor(vendor); setIsModalOpen(true); } }
    ];
    if (vendor.status === 'Pending') {
      base.push({ label: 'Approve Vendor', icon: ShieldCheck, onClick: () => handleStatusChange(vendor.id, 'Active') });
    } else if (vendor.status === 'Suspended') {
      base.push({ label: 'Unsuspend', icon: RefreshCw, onClick: () => handleStatusChange(vendor.id, 'Active') });
    } else {
      base.push({ 
        label: 'Suspend', 
        icon: Ban, 
        warning: true, 
        onClick: () => {
          if (window.confirm(`Are you sure you want to suspend vendor ${vendor.name}?`)) {
            handleStatusChange(vendor.id, 'Suspended');
          }
        }
      });
    }
    base.push({ label: 'Delete', icon: Trash2, danger: true, onClick: () => handleDelete(vendor.id) });
    return base;
  };

  let filteredVendors = vendorsList.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          v.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          v.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          v.contact.includes(searchQuery);
    const matchesType = typeFilter === 'All Types' || v.type.toLowerCase().includes(typeFilter.toLowerCase());
    const matchesStatus = statusFilter === 'All Status' || v.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const paginatedVendors = filteredVendors.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredVendors.length / itemsPerPage);

  const handleSaveVendor = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const updated = {
      name: formData.get('name'),
      type: formData.get('type'),
      contact: formData.get('contact'),
      location: formData.get('location'),
      email: formData.get('email'),
      status: formData.get('status'),
    };

    if (editingVendor) {
      setVendorsList(prev => prev.map(v => v.id === editingVendor.id ? { ...v, ...updated } : v));
      showToast('Vendor details updated.');
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
      `"${v.docs.map(d => `${d.label}: ${d.status}`).join(' | ')}"`,
      v.status
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'tailcircle_vendors_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const TrackerMini = ({ stage, missingCount = 0 }) => {
    if (stage === 'Verified' || stage === 'Active') {
      return (
        <div className="flex items-center gap-1.5 w-max">
          <CheckCircle size={15} className="text-emerald-500" />
          <span className="text-[11.5px] font-bold text-emerald-700">{stage}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5 w-max">
        <AlertTriangle size={14} className="text-amber-500" />
        <span className="text-[11.5px] font-bold text-amber-700">
          {stage} {missingCount > 0 ? `(${missingCount} missing)` : ''}
        </span>
      </div>
    );
  };

  const getDocBadgeStyle = (status) => {
    if (status === 'Verified') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'Rejected') return 'bg-rose-50 text-rose-700 border-rose-200';
    if (status === 'Missing') return 'bg-slate-100 text-slate-500 border-slate-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  return (
    <div className="p-3 sm:px-10 sm:py-8 w-full max-w-[1600px] mx-auto min-w-0 overflow-x-hidden transition-all duration-300 relative">

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-300">
          <Sparkles className="text-teal-400 shrink-0" size={18} />
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2">
            <X size={14} />
          </button>
        </div>
      )}

      <PageHeader 
        title="All Vendors" 
        subtitle={`${vendorsList.length} registered vendors on TailCircle platform`} 
        action={{ label: '+ Add Vendor', onClick: () => { setEditingVendor(null); setIsModalOpen(true); } }} 
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard title="Total Vendors" value={vendorsList.length} />
        <StatCard title="Active" value={vendorsList.filter(v => v.status === 'Active').length} />
        <StatCard title="Pending Approval" value={vendorsList.filter(v => v.status === 'Pending').length} />
        <StatCard title="Suspended" value={vendorsList.filter(v => v.status === 'Suspended').length} />
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100/50 mb-6 flex flex-col sm:flex-row flex-wrap gap-3 p-4 sm:p-5">
        <div className="relative w-full sm:w-64 shrink-0">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by name, email, phone..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
          />
        </div>
        <div className="grid grid-cols-2 sm:flex flex-1 gap-2 sm:gap-3 w-full">
          <select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
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
            className="w-full sm:w-auto px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            <option>All Status</option>
            <option>Active</option>
            <option>Pending</option>
            <option>Suspended</option>
          </select>
          <button 
            onClick={handleExportCSV}
            className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-700 hover:bg-gray-50 transition w-full sm:w-auto cursor-pointer"
          >
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* Main Vendor Table Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100/50 mb-6 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 font-semibold flex items-center justify-center gap-2">
            <RefreshCw size={18} className="animate-spin text-teal-600" /> Loading vendor profiles from backend...
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1200px]">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Vendor</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Vendor Type</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Verification Stage</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Documents (Click to Inspect)</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedVendors.length > 0 ? paginatedVendors.map((vendor) => (
                    <tr key={vendor.id} className="hover:bg-teal-50/20 transition group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <img 
                            src={vendor.avatar} 
                            alt={vendor.name} 
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-xs shrink-0" 
                          />
                          <div>
                            <div className="text-sm font-bold text-slate-900 group-hover:text-teal-600 transition">{vendor.name}</div>
                            <StatusBadge status={vendor.status} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-700 whitespace-nowrap">{vendor.type}</td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-600 whitespace-nowrap">{vendor.contact}</td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-600 whitespace-nowrap">{vendor.location}</td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-600 whitespace-nowrap">{vendor.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <TrackerMini stage={vendor.stage} missingCount={vendor.missing?.length || 0} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap items-center gap-1.5 max-w-[260px]">
                          {vendor.docs && vendor.docs.length > 0 ? (
                            vendor.docs.map((d, i) => (
                              <button 
                                key={i}
                                onClick={() => setSelectedDocForPreview({ vendor, doc: d })}
                                className={`flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-md border transition cursor-pointer hover:shadow-xs ${getDocBadgeStyle(d.status)}`}
                                title={`Click to view & verify ${d.label}`}
                              >
                                <FileText size={11} /> {d.label}
                                <span className="ml-0.5 opacity-80 text-[9.5px]">({d.status})</span>
                              </button>
                            ))
                          ) : (
                            <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">None Uploaded</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => setSelectedVendorForView(vendor)}
                            className="px-3 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
                          >
                            <Eye size={13} /> View
                          </button>
                          <ActionMenu options={getOptions(vendor)} />
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-slate-500 font-semibold">
                        No vendors found matching your filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 0 && (
              <Pagination 
                current={currentPage} 
                total={filteredVendors.length} 
                pages={totalPages} 
                onPageChange={setCurrentPage} 
              />
            )}
          </>
        )}
      </div>

      {/* ── Document Inspection & Verification Lightbox Modal ── */}
      {selectedDocForPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition duration-200">
          <div className="absolute inset-0" onClick={() => setSelectedDocForPreview(null)} />
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full relative z-10 overflow-hidden border border-slate-200 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">{selectedDocForPreview.doc.label} Inspection</h3>
                  <p className="text-xs text-slate-500 font-semibold">Vendor: {selectedDocForPreview.vendor.name}</p>
                </div>
              </div>
              <button onClick={() => setSelectedDocForPreview(null)} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-xl transition">
                <X size={18} />
              </button>
            </div>

            {/* Body Preview */}
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Verification Status</span>
                  <span className={`font-black text-xs px-2 py-0.5 rounded-md border inline-block mt-0.5 ${getDocBadgeStyle(selectedDocForPreview.doc.status)}`}>
                    {selectedDocForPreview.doc.status}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Required Doc</span>
                  <span className="font-bold text-slate-800">{selectedDocForPreview.doc.required ? 'Yes (Mandatory)' : 'Optional'}</span>
                </div>
              </div>

              {/* Real File Viewer Block */}
              <div className="bg-slate-900 rounded-xl p-6 text-center text-white space-y-3 min-h-[160px] flex flex-col items-center justify-center">
                {selectedDocForPreview.doc.url ? (
                  <>
                    <FileText size={42} className="text-teal-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-200">File uploaded and attached in storage</p>
                    <a 
                      href={selectedDocForPreview.doc.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-black inline-flex items-center gap-1.5 transition shadow-sm"
                    >
                      <ExternalLink size={14} /> Open Full Document File
                    </a>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={36} className="text-amber-400 mx-auto" />
                    <p className="text-xs font-bold text-amber-200">No document file uploaded by vendor yet.</p>
                  </>
                )}
              </div>
            </div>

            {/* Footer Direct Action Controls */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              <button 
                onClick={() => handleVerifyDocument(selectedDocForPreview.vendor.id, selectedDocForPreview.doc.kind, 'reject')}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <XCircle size={14} /> Reject Document
              </button>
              <button 
                onClick={() => handleVerifyDocument(selectedDocForPreview.vendor.id, selectedDocForPreview.doc.kind, 'verify')}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1 shadow-md cursor-pointer"
              >
                <CheckCircle size={14} /> Verify Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Side Drawer for General Vendor Profile & KYC Inspection ── */}
      {selectedVendorForView && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs transition-all duration-300">
          <div className="absolute inset-0" onClick={() => setSelectedVendorForView(null)} />
          <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-4">
                <img 
                  src={selectedVendorForView.avatar} 
                  alt={selectedVendorForView.name} 
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-sm shrink-0" 
                />
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-tight">{selectedVendorForView.name}</h3>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">{selectedVendorForView.type}</p>
                </div>
              </div>
              <button onClick={() => setSelectedVendorForView(null)} className="text-slate-400 hover:bg-slate-200 p-2 rounded-xl transition">
                <X size={20} />
              </button>
            </div>
            
            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Account Status & Gate */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase">Status</span>
                  <StatusBadge status={selectedVendorForView.status} />
                </div>
                <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-3 py-1 rounded-xl">
                  <span className="text-xs font-black text-slate-800">{selectedVendorForView.stage}</span>
                </div>
              </div>

              {/* KYC Gate Missing Warning */}
              {selectedVendorForView.missing && selectedVendorForView.missing.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1.5">
                  <span className="text-xs font-black text-amber-800 flex items-center gap-1.5 uppercase tracking-wider">
                    <AlertTriangle size={14} /> Missing KYC Requirements ({selectedVendorForView.missing.length})
                  </span>
                  <ul className="text-xs text-amber-900 list-disc list-inside space-y-0.5 font-medium">
                    {selectedVendorForView.missing.map((m, idx) => (
                      <li key={idx}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Contact Info Block */}
              <div>
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-3">Contact & Location</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">City / Location</span>
                    <span className="text-xs font-bold text-slate-800">{selectedVendorForView.location}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Phone</span>
                    <span className="text-xs font-bold text-teal-600">{selectedVendorForView.contact}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 col-span-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Email Address</span>
                    <span className="text-xs font-bold text-slate-800">{selectedVendorForView.email}</span>
                  </div>
                </div>
              </div>

              {/* Submitted Documents & Inspection */}
              <div>
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-3">KYC Documents Submitted</h4>
                <div className="space-y-2.5">
                  {selectedVendorForView.docs && selectedVendorForView.docs.length > 0 ? (
                    selectedVendorForView.docs.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                        <div>
                          <span className="font-bold text-slate-900 block">{doc.label}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border inline-block mt-1 ${getDocBadgeStyle(doc.status)}`}>
                            {doc.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {doc.url && (
                            <a 
                              href={doc.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg font-bold flex items-center gap-1 transition"
                            >
                              <ExternalLink size={12} /> View File
                            </a>
                          )}
                          <button 
                            onClick={() => handleVerifyDocument(selectedVendorForView.id, doc.kind, 'verify')}
                            className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-black transition cursor-pointer"
                          >
                            Verify
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 font-bold italic">No document records found.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
              {selectedVendorForView.status === 'Active' ? (
                <button 
                  onClick={() => { handleStatusChange(selectedVendorForView.id, 'Suspended'); setSelectedVendorForView(null); }}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  Suspend Account
                </button>
              ) : (
                <button 
                  onClick={() => { handleStatusChange(selectedVendorForView.id, 'Active'); setSelectedVendorForView(null); }}
                  className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black transition shadow-sm"
                >
                  Approve / Activate Vendor
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Vendor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">{editingVendor ? 'Edit Vendor Details' : 'Add New Vendor'}</h3>
              <button onClick={() => { setIsModalOpen(false); setEditingVendor(null); }} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveVendor} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Business Name</label>
                <input required name="name" defaultValue={editingVendor?.name} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-teal-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Vendor Type</label>
                <select name="type" defaultValue={editingVendor?.type || 'Shop Vendor'} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-teal-500">
                  <option>Shop Vendor</option>
                  <option>Meal Provider</option>
                  <option>Event Organizer</option>
                  <option>Doctor / Clinic</option>
                  <option>Memorial Provider</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Contact Phone</label>
                  <input required name="contact" defaultValue={editingVendor?.contact} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-teal-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Location</label>
                  <input required name="location" defaultValue={editingVendor?.location} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-teal-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email</label>
                <input required type="email" name="email" defaultValue={editingVendor?.email} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-teal-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Status</label>
                <select name="status" defaultValue={editingVendor?.status || 'Pending'} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-teal-500">
                  <option>Active</option>
                  <option>Pending</option>
                  <option>Suspended</option>
                </select>
              </div>
              <div className="pt-3 flex gap-2">
                <button type="button" onClick={() => { setIsModalOpen(false); setEditingVendor(null); }} className="flex-1 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black shadow-sm">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AllVendors;

