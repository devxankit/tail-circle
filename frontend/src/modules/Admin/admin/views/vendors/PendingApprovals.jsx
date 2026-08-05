import React, { useState, useMemo, useEffect } from 'react';
import { FileText, CheckCircle, Search, MapPin, Phone, Mail, MoreVertical, X, Eye, Bell, Ban } from 'lucide-react';
import { PageHeader, Pagination, ActionMenu, StatusBadge } from '../../components/VendorShared';
import { fetchPendingVendors, approveVendorApi, rejectVendorApi } from '../../../../../services/admin';

const TYPE_LABEL = { shop: 'Shop', meal_subscription: 'Meal', events: 'Event', clinic: 'Doctor', memorial: 'Memorial' };

/** Map an API pending vendor profile to this view's row shape. */
function toRow(v) {
  return {
    id: v.id,
    name: v.businessName,
    owner: v.bank?.accountHolder || v.businessName,
    avatar: v.logo || '',
    type: TYPE_LABEL[v.vendorType] || 'Vendor',
    city: v.city || '—',
    mobile: v.phone,
    email: v.email,
    stage: 'Docs Submitted',
    docs: (v.documents || []).map((name) => ({ name, status: 'verified' })),
    bank: v.bank?.accountMasked ? 'Verified' : 'Pending',
    date: 'Pending review',
    timestamp: Date.now(),
  };
}

export function PendingApprovals() {
  const [approvals, setApprovals] = useState([]);

  useEffect(() => {
    fetchPendingVendors().then((rows) => setApprovals(rows.map(toRow))).catch((err) => console.error('Failed to load pending vendors', err));
  }, []);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectedVendorForView, setSelectedVendorForView] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Vendor Types');
  const [bankFilter, setBankFilter] = useState('All Bank Status');
  const [stageFilter, setStageFilter] = useState('All Stages');
  const [sortFilter, setSortFilter] = useState('Newest First');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  const getOptions = (vendor) => {
    return [
      { label: 'View Full Profile', icon: Eye, onClick: () => setSelectedVendorForView(vendor) },
      { label: 'Send Reminder', icon: Bell, onClick: () => alert(`Reminder sent to ${vendor.email}`) },
      { label: 'Block Vendor', icon: Ban, danger: true, onClick: () => handleReject(vendor.id) }
    ];
  };

  const handleApprove = async (id) => {
    try { await approveVendorApi(id); } catch (err) { console.error('Approve failed', err); return; }
    setApprovals(prev => prev.filter(v => v.id !== id));
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const handleReject = async (id) => {
    try { await rejectVendorApi(id); } catch (err) { console.error('Reject failed', err); return; }
    setApprovals(prev => prev.filter(v => v.id !== id));
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const handleApproveSelected = async () => {
    if (selectedIds.size === 0) return;
    const ids = [...selectedIds];
    await Promise.allSettled(ids.map((id) => approveVendorApi(id)));
    setApprovals(prev => prev.filter(v => !selectedIds.has(v.id)));
    setSelectedIds(new Set());
  };

  const handleRejectSelected = async () => {
    if (selectedIds.size === 0) return;
    const ids = [...selectedIds];
    await Promise.allSettled(ids.map((id) => rejectVendorApi(id)));
    setApprovals(prev => prev.filter(v => !selectedIds.has(v.id)));
    setSelectedIds(new Set());
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredApprovals.map(v => v.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('All Vendor Types');
    setBankFilter('All Bank Status');
    setStageFilter('All Stages');
    setSortFilter('Newest First');
    setCurrentPage(1);
  };

  const filteredApprovals = useMemo(() => {
    let result = approvals.filter(v => {
      const matchSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          v.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          v.owner.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = typeFilter === 'All Vendor Types' || v.type === typeFilter;
      const matchBank = bankFilter === 'All Bank Status' || v.bank === bankFilter;
      const matchStage = stageFilter === 'All Stages' || v.stage === stageFilter;
      
      return matchSearch && matchType && matchBank && matchStage;
    });

    result.sort((a, b) => {
      if (sortFilter === 'Newest First') return b.timestamp - a.timestamp;
      if (sortFilter === 'Oldest First') return a.timestamp - b.timestamp;
      return 0;
    });

    return result;
  }, [approvals, searchQuery, typeFilter, bankFilter, stageFilter, sortFilter]);

  const totalPages = Math.ceil(filteredApprovals.length / itemsPerPage);
  const paginatedData = filteredApprovals.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const Tracker = ({ stage }) => {
    if (stage === 'Verified' || stage === 'Active') {
      return (
        <div className="flex items-center gap-2">
          <CheckCircle size={18} className="text-[#66B4B1]" />
          <span className="text-[12px] font-bold text-[#66B4B1]">{stage}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
        <span className="text-[12px] font-bold text-amber-600">{stage}</span>
      </div>
    );
  };

  const getTypeBadge = (type) => {
    return <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">{type}</span>;
  };

  const handleExportCSV = () => {
    if (filteredApprovals.length === 0) return;
    const headers = ['Vendor Name', 'Owner', 'Type', 'City', 'Mobile', 'Email', 'Stage', 'Bank Status', 'Date'];
    const rows = filteredApprovals.map(v => [
      `"${v.name}"`, `"${v.owner}"`, v.type, `"${v.city}"`, `"${v.mobile}"`, `"${v.email}"`, v.stage, v.bank, `"${v.date}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'pending_approvals.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-3 sm:px-10 sm:py-8 w-full max-w-[1600px] mx-auto min-w-0 overflow-x-hidden transition-all duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-[22px] font-semibold text-gray-900 tracking-tight">Pending Approvals</h1>
          <p className="text-[12px] sm:text-[13px] text-gray-500 mt-0.5">{approvals.length} vendors awaiting review</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button 
            onClick={handleApproveSelected}
            disabled={selectedIds.size === 0}
            className={`flex-1 sm:flex-none px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${selectedIds.size > 0 ? 'bg-[#66B4B1] hover:bg-[#66B4B1] text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
            ✓ Approve
          </button>
          <button 
            onClick={handleRejectSelected}
            disabled={selectedIds.size === 0}
            className={`flex-1 sm:flex-none border px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${selectedIds.size > 0 ? 'border-red-500 text-red-500 hover:bg-red-50' : 'border-gray-200 text-gray-400 cursor-not-allowed'}`}>
            ✗ Reject
          </button>
          <button onClick={handleExportCSV} className="w-full sm:w-auto border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition">
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-[#FAF7F2] mb-4 sm:mb-6 flex flex-col sm:flex-row flex-wrap gap-3">
        <div className="relative w-full sm:w-64 shrink-0">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search vendor name or email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition"
          />
        </div>
        <div className="grid grid-cols-2 sm:flex flex-1 gap-2 sm:gap-3 w-full">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full sm:w-auto px-2 sm:px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#66B4B1]/20">
            <option>All Vendor Types</option>
            <option>Shop</option>
            <option>Meal</option>
            <option>Event</option>
            <option>Doctor</option>
            <option>Memorial</option>
          </select>
          <select value={bankFilter} onChange={(e) => setBankFilter(e.target.value)} className="w-full sm:w-auto px-2 sm:px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#66B4B1]/20">
            <option>All Bank Status</option>
            <option>Verified</option>
            <option>Pending</option>
          </select>
          <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className="w-full sm:w-auto px-2 sm:px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#66B4B1]/20">
            <option>All Stages</option>
            <option>Docs Submitted</option>
            <option>Under Review</option>
            <option>Verified</option>
          </select>
          <select value={sortFilter} onChange={(e) => setSortFilter(e.target.value)} className="w-full sm:w-auto px-2 sm:px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#66B4B1]/20">
            <option>Newest First</option>
            <option>Oldest First</option>
          </select>
        </div>
        <button onClick={clearFilters} className="w-full sm:w-auto text-[13px] font-semibold text-[#66B4B1] hover:underline sm:ml-2 py-2 text-center">Clear Filters</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-[#FAF7F2] shadow-sm">
          <p className="text-gray-500 text-[10px] sm:text-[11px] font-bold uppercase tracking-wide mb-1">Pending Review</p>
          <h3 className="text-xl sm:text-2xl font-semibold text-gray-900">{approvals.length}</h3>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-[#FAF7F2] shadow-sm">
          <p className="text-gray-500 text-[10px] sm:text-[11px] font-bold uppercase tracking-wide mb-1 line-clamp-1">Docs Submitted</p>
          <h3 className="text-xl sm:text-2xl font-semibold text-gray-900">{approvals.filter(v => v.stage === 'Docs Submitted').length}</h3>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-[#FAF7F2] shadow-sm">
          <p className="text-gray-500 text-[10px] sm:text-[11px] font-bold uppercase tracking-wide mb-1">Under Review</p>
          <h3 className="text-xl sm:text-2xl font-semibold text-gray-900">{approvals.filter(v => v.stage === 'Under Review').length}</h3>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-[#FAF7F2] shadow-sm">
          <p className="text-gray-500 text-[10px] sm:text-[11px] font-bold uppercase tracking-wide mb-1 line-clamp-1">Bank Pending</p>
          <h3 className="text-xl sm:text-2xl font-semibold text-gray-900">{approvals.filter(v => v.bank === 'Pending').length}</h3>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#FAF7F2] overflow-hidden">
        
        {/* Mobile/Tablet Card View */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden divide-y md:divide-y-0 md:gap-4 md:p-4 divide-gray-100">
          {paginatedData.length > 0 ? paginatedData.map((vendor) => (
            <div key={vendor.id} className={`p-4 md:rounded-2xl md:border md:border-[#FAF7F2] flex flex-col gap-3.5 bg-white transition shadow-sm md:shadow-none ${selectedIds.has(vendor.id) ? 'border-[#66B4B1] bg-[#FAF7F2]' : ''}`}>
              
              {/* Header: Checkbox, Avatar, Name, Action */}
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.has(vendor.id)}
                    onChange={() => toggleSelect(vendor.id)}
                    className="w-4 h-4 rounded border-gray-300 text-[#66B4B1] focus:ring-[#66B4B1] shrink-0 mt-1" 
                  />
                  <img src={vendor.avatar || `https://ui-avatars.com/api/?name=${vendor.owner.replace(/\s+/g, '+')}&background=E1F5EE&color=0F6E56`} alt={vendor.owner} className="w-10 h-10 rounded-full object-cover border border-gray-100 shadow-sm shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-[15px] font-bold text-gray-900 leading-tight mb-0.5">
                      {vendor.name}
                    </h3>
                    <p className="text-xs text-gray-500 font-medium">{vendor.owner}</p>
                  </div>
                </div>
                <div className="shrink-0 -mt-1 -mr-2">
                  <ActionMenu options={getOptions(vendor)} />
                </div>
              </div>

              {/* Tags/Info Row */}
              <div className="flex flex-wrap items-center gap-2 pl-0 sm:pl-[68px]">
                {getTypeBadge(vendor.type)}
                <span className="flex items-center gap-1 text-[11px] font-bold text-gray-600 bg-gray-50 px-2 py-1 rounded-md border border-gray-200">
                  <MapPin size={12} className="text-gray-400" /> {vendor.city}
                </span>
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#66B4B1] bg-[#FAF7F2] px-2 py-1 rounded-md border border-[#66B4B1]/20">
                  <Phone size={12} /> {vendor.mobile}
                </span>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 mt-1 pl-0 sm:pl-[68px]">
                <Tracker stage={vendor.stage} />
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 pl-0 sm:pl-[68px]">
                <button onClick={() => handleApprove(vendor.id)} className="flex-1 py-2 bg-[#FAF7F2] text-[#599D9A] hover:bg-[#66B4B1] hover:text-white rounded-xl text-[13px] font-bold transition flex items-center justify-center gap-1.5">
                  <CheckCircle size={15} /> Approve
                </button>
                <button onClick={() => handleReject(vendor.id)} className="flex-1 py-2 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded-xl text-[13px] font-bold transition flex items-center justify-center gap-1.5">
                  <X size={15} /> Reject
                </button>
              </div>
              
            </div>
          )) : (
            <div className="p-8 md:col-span-2 text-center text-gray-500 font-medium text-sm">
              No pending approvals match your criteria.
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-[#FAF7F2] border-b border-[#FAF7F2]">
                <th className="px-4 py-3 w-[40px]">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.size > 0 && selectedIds.size === filteredApprovals.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-[#66B4B1] focus:ring-[#66B4B1]" 
                  />
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[200px]">Vendor</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[120px]">Contact</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[100px]">Location</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[150px]">Email</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[240px]">Verification Stage</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[180px]">Documents</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[120px]">Bank Details</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[110px]">Submitted On</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[150px]">Actions</th>
                <th className="px-4 py-3 w-[40px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FAF7F2]">
              {paginatedData.length > 0 ? paginatedData.map((vendor, idx) => (
                <tr key={vendor.id} className={`hover:bg-[#FAF7F2] transition h-[72px] ${idx % 2 !== 0 ? 'bg-[#FAF7F2]' : 'bg-white'} ${selectedIds.has(vendor.id) ? 'bg-[#FAF7F2]' : ''}`}>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.has(vendor.id)}
                      onChange={() => toggleSelect(vendor.id)}
                      className="w-4 h-4 rounded border-gray-300 text-[#66B4B1] focus:ring-[#66B4B1]" 
                    />
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="flex items-start gap-3">
                      <img src={vendor.avatar || `https://ui-avatars.com/api/?name=${vendor.owner.replace(/\s+/g, '+')}&background=E1F5EE&color=0F6E56`} alt={vendor.owner} className="w-9 h-9 rounded-full object-cover border border-gray-100 shadow-sm shrink-0" />
                      <div>
                        <h3 className="text-[14px] font-medium text-gray-900 leading-tight mb-0.5 whitespace-nowrap">{vendor.name}</h3>
                        <p className="text-[12px] text-gray-500 mb-1 leading-tight whitespace-nowrap">{vendor.owner}</p>
                        {getTypeBadge(vendor.type)}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-[12px] text-[#5A5552] font-medium whitespace-nowrap">
                    {vendor.mobile}
                  </td>
                  <td className="px-4 py-2 text-[12px] text-[#5A5552] font-medium whitespace-nowrap">
                    {vendor.city}
                  </td>
                  <td className="px-4 py-2 text-[12px] text-[#5A5552] font-medium whitespace-nowrap">
                    {vendor.email}
                  </td>
                  <td className="px-4 py-2 pr-8 whitespace-nowrap">
                    <Tracker stage={vendor.stage} />
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="flex flex-col gap-1.5">
                      {vendor.docs.map(doc => (
                        doc.status === 'verified' ? (
                          <span key={doc.name} className="flex items-center gap-1.5 text-[#599D9A] bg-[#FAF7F2] px-2 py-0.5 rounded text-[11px] font-medium w-max cursor-pointer hover:opacity-80 whitespace-nowrap">
                            <FileText size={11} /> {doc.name}
                          </span>
                        ) : (
                          <span key={doc.name} className="flex items-center gap-1.5 text-amber-600 px-1 py-0.5 text-[11px] font-medium w-max whitespace-nowrap">
                            {doc.name} <span className="text-amber-500">⚠ Not uploaded</span>
                          </span>
                        )
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {vendor.bank === 'Verified' ? (
                      <span className="text-[#66B4B1] text-[13px] font-medium flex items-center gap-1 whitespace-nowrap"><CheckCircle size={14} /> Verified</span>
                    ) : (
                      <button onClick={() => alert("Action triggered: Pending")} className="text-[#F87B68] text-[13px] font-medium flex items-center gap-1 hover:underline whitespace-nowrap"><div className="w-2 h-2 rounded-full bg-[#F87B68]" /> Pending</button>
                    )}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="text-[13px] text-gray-900 leading-tight mb-0.5 whitespace-nowrap">{vendor.date}</div>
                    <div className="text-[11px] text-gray-500 whitespace-nowrap">just now</div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleApprove(vendor.id)} className="px-3 py-2 bg-[#FAF7F2] text-[#599D9A] hover:bg-[#66B4B1] hover:text-white rounded-lg text-[12px] font-bold transition flex items-center justify-center gap-1 shadow-sm">
                        <CheckCircle size={14} /> Approve
                      </button>
                      <button onClick={() => handleReject(vendor.id)} className="px-3 py-2 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded-lg text-[12px] font-bold transition flex items-center justify-center gap-1 shadow-sm">
                        <X size={14} /> Reject
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <ActionMenu options={getOptions(vendor)} />
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="11" className="px-6 py-12 text-center text-gray-500 font-medium">
                    No pending approvals match your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
          
        {totalPages > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6 py-4 border-t border-[#FAF7F2] bg-white">
            <p className="text-[13px] text-gray-500 text-center sm:text-left">
              Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredApprovals.length)} of {filteredApprovals.length} pending vendors
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="text-[13px] border border-gray-200 rounded px-2 py-1.5 text-gray-600 focus:outline-none w-full sm:w-auto">
                <option value={8}>8 per page</option>
                <option value={16}>16 per page</option>
                <option value={50}>50 per page</option>
              </select>
              <div className="flex items-center justify-center gap-1 w-full sm:w-auto">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 text-[13px] text-gray-500 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50">← Prev</button>
                <div className="flex gap-1 overflow-x-auto max-w-[150px] sm:max-w-none">
                  {[...Array(totalPages)].map((_, i) => (
                    <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded text-[13px] font-medium ${currentPage === i + 1 ? 'bg-[#66B4B1] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 text-[13px] text-gray-500 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50">Next →</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedVendorForView && (
        <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/40 backdrop-blur-sm transition-all duration-300">
          <div className="absolute inset-0" onClick={() => setSelectedVendorForView(null)} />
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-slide-left">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
                <img src={selectedVendorForView.avatar || `https://ui-avatars.com/api/?name=${selectedVendorForView.owner.replace(/\s+/g, '+')}&background=E1F5EE&color=0F6E56`} alt={selectedVendorForView.owner} className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-sm shrink-0" />
                <div>
                  <h3 className="text-lg font-black text-gray-900 leading-tight">{selectedVendorForView.name}</h3>
                  <p className="text-xs text-gray-500 font-bold mt-0.5">{selectedVendorForView.owner}</p>
                </div>
              </div>
              <button onClick={() => setSelectedVendorForView(null)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-xl transition">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 uppercase">Vendor Type</span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-200">{selectedVendorForView.type}</span>
                </div>
                <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/50 px-2.5 py-1 rounded-xl">
                  <span className="text-xs font-black text-amber-600">{selectedVendorForView.stage}</span>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Contact Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Location / City</span>
                    <span className="text-sm font-bold text-gray-800 flex items-center gap-1">
                      <MapPin size={13} className="text-gray-500" /> {selectedVendorForView.city}
                    </span>
                  </div>
                  <div className="bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Contact Phone</span>
                    <a href={`tel:${selectedVendorForView.mobile}`} className="text-sm font-bold text-[#66B4B1] hover:underline flex items-center gap-1.5">
                      <Phone size={13} /> {selectedVendorForView.mobile}
                    </a>
                  </div>
                  <div className="bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100 sm:col-span-2">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Contact Email</span>
                    <a href={`mailto:${selectedVendorForView.email}`} className="text-sm font-bold text-[#66B4B1] hover:underline flex items-center gap-1.5 truncate">
                      <Mail size={13} /> {selectedVendorForView.email}
                    </a>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Submitted Documents</h4>
                <div className="space-y-2">
                  {selectedVendorForView.docs.map(doc => (
                    <div key={doc.name} className={`flex items-center justify-between p-3 border rounded-2xl ${doc.status === 'verified' ? 'bg-[#FAF7F2] border-[#66B4B1]/20' : 'bg-amber-50/50 border-amber-200/50'}`}>
                      <span className={`text-xs font-bold flex items-center gap-2 ${doc.status === 'verified' ? 'text-[#599D9A]' : 'text-amber-700'}`}>
                        <FileText size={14} className={doc.status === 'verified' ? 'text-[#66B4B1]' : 'text-amber-500'} /> {doc.name}
                      </span>
                      {doc.status === 'verified' ? (
                        <span className="text-[10px] font-black uppercase text-[#66B4B1] flex items-center gap-0.5"><CheckCircle size={10} /> Verified</span>
                      ) : (
                        <span className="text-[10px] font-black uppercase text-amber-600 flex items-center gap-0.5">Missing</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-3 shadow-inner">
              <button onClick={() => { handleReject(selectedVendorForView.id); setSelectedVendorForView(null); }} className="flex-1 py-3 bg-[#FAF7F2] text-[#F87B68] border border-[#F87B68] hover:bg-[#F87B68] hover:text-white rounded-xl text-sm font-bold shadow-sm transition">
                Reject Vendor
              </button>
              <button onClick={() => { handleApprove(selectedVendorForView.id); setSelectedVendorForView(null); }} className="flex-1 py-3 bg-[#66B4B1] hover:bg-[#66B4B1] text-white rounded-xl text-sm font-bold shadow-sm transition">
                Approve Vendor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
