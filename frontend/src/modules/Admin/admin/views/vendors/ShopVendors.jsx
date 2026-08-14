import React, { useState, useMemo, useEffect } from 'react';
import { Search, MapPin, Phone, Mail, MoreVertical, X, Edit, Trash2, Ban, Filter, Eye, CheckCircle, FileText, ShoppingBag, Star, AlertTriangle } from 'lucide-react';
import { StatusBadge, ActionMenu, Pagination } from '../../components/VendorShared';
import { fetchAdminVendors, approveVendorApi, approveVendorGuarded, suspendVendorApi, fetchAdminProducts, fetchVendorDocuments } from '../../../../../services/admin';

const STATUS_LABEL = { approved: 'Active', pending: 'Pending', suspended: 'Suspended', rejected: 'Suspended' };
const DOC_LABEL = { license: 'Business Tax License', owner_id: 'ID Proof', gst: 'GST Certificate' };
/** Map an API shop-vendor profile to this view's row shape. */
function toRow(v) {
  return {
    id: v.id,
    shopName: v.businessName,
    shopId: '#SH' + String(v.id).slice(-4).toUpperCase(),
    owner: v.owner || v.businessName,
    mobile: v.phone,
    email: v.email,
    contactPhone: v.phone,
    contactEmail: v.email,
    city: v.city || '—',
    state: '—',
    products: v.productCount || 0,
    active: v.activeProductCount || 0,
    orders: v.orders || 0,
    revenue: '₹' + (v.revenue || 0).toLocaleString('en-IN'),
    rating: v.rating ? String(v.rating) : null,
    reviews: 0,
    commission: Math.round((v.commissionRate || 0) * 100),
    status: STATUS_LABEL[v.approvalStatus] || 'Pending',
    timestamp: Date.now(),
  };
}

export function ShopVendors() {
  const [vendors, setVendors] = useState([]);

  useEffect(() => {
    fetchAdminVendors({ type: 'shop' }).then((rows) => setVendors(rows.map(toRow))).catch((err) => console.error('Failed to load shop vendors', err));
  }, []);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectedVendorForView, setSelectedVendorForView] = useState(null);
  const [vendorTopProducts, setVendorTopProducts] = useState([]);
  const [vendorDocs, setVendorDocs] = useState([]);
  const [vendorDetailLoading, setVendorDetailLoading] = useState(false);

  useEffect(() => {
    if (!selectedVendorForView) { setVendorTopProducts([]); setVendorDocs([]); return; }
    let cancelled = false;
    setVendorDetailLoading(true);
    Promise.all([
      fetchAdminProducts({ vendorId: selectedVendorForView.id }),
      fetchVendorDocuments(selectedVendorForView.id),
    ])
      .then(([products, docData]) => {
        if (cancelled) return;
        setVendorTopProducts(products || []);
        setVendorDocs(docData?.documents || []);
      })
      .catch(() => { if (!cancelled) { setVendorTopProducts([]); setVendorDocs([]); } })
      .finally(() => !cancelled && setVendorDetailLoading(false));
    return () => { cancelled = true; };
  }, [selectedVendorForView]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [cityFilter, setCityFilter] = useState('All Cities');
  const [sortFilter, setSortFilter] = useState('Sort: Newest');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);

  const parseNum = (str) => {
    if (!str) return 0;
    return Number(str.toString().replace(/[^0-9.-]+/g,""));
  };

  const filteredVendors = useMemo(() => {
    let result = vendors.filter(v => {
      const matchSearch = v.shopName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          v.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          v.city.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'All Status' || v.status === statusFilter;
      const matchCity = cityFilter === 'All Cities' || v.city === cityFilter;
      
      return matchSearch && matchStatus && matchCity;
    });

    result.sort((a, b) => {
      if (sortFilter === 'Sort: Revenue ↓') return parseNum(b.revenue) - parseNum(a.revenue);
      if (sortFilter === 'Sort: Rating ↓') return parseNum(b.rating) - parseNum(a.rating);
      if (sortFilter === 'Sort: Orders ↓') return b.orders - a.orders;
      if (sortFilter === 'Sort: Newest') return b.timestamp - a.timestamp;
      return 0;
    });

    return result;
  }, [vendors, searchQuery, statusFilter, cityFilter, sortFilter]);

  const totalPages = Math.ceil(filteredVendors.length / itemsPerPage);
  const paginatedData = filteredVendors.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const cities = useMemo(() => [...new Set(vendors.map(v => v.city))].sort(), [vendors]);

  // Only reflect the new status once the server accepted it — approval can be
  // refused while the vendor's KYC documents are unverified.
  const handleStatusChange = async (id, newStatus) => {
    if (newStatus === 'Active') {
      const name = vendors.find(v => v.id === id)?.shopName;
      if (!(await approveVendorGuarded(id, name))) return;
    } else if (newStatus === 'Suspended') {
      try { await suspendVendorApi(id); } catch (err) { window.alert(err?.message || 'Suspend failed'); return; }
    }
    setVendors(prev => prev.map(v => v.id === id ? { ...v, status: newStatus } : v));
  };

  const handleDelete = (id) => {
    if(window.confirm('Vendors cannot be deleted — suspend this shop instead?')) {
      handleStatusChange(id, 'Suspended');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredVendors.map(v => v.id)));
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

  // Bulk activation never forces past the KYC gate; refused vendors keep their
  // current status and stay selected so the reviewer can handle them one by one.
  const handleBulkActivate = async () => {
    const ids = [...selectedIds];
    const results = await Promise.allSettled(ids.map((id) => approveVendorApi(id)));
    const activated = new Set(ids.filter((_, i) => results[i].status === 'fulfilled'));

    setVendors(prev => prev.map(v => activated.has(v.id) ? { ...v, status: 'Active' } : v));
    setSelectedIds(new Set(ids.filter((id) => !activated.has(id))));
    if (activated.size < ids.length) {
      window.alert(`${activated.size} of ${ids.length} activated — the rest have unverified KYC documents.`);
    }
  };

  const handleBulkSuspend = () => {
    [...selectedIds].forEach((id) => suspendVendorApi(id).catch(() => {}));
    setVendors(prev => prev.map(v => selectedIds.has(v.id) ? { ...v, status: 'Suspended' } : v));
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Suspend the ${selectedIds.size} selected shops?`)) {
      handleBulkSuspend();
    }
  };

  const getOptions = (vendor) => {
    const base = [
      { label: 'View Profile', icon: Eye, onClick: () => setSelectedVendorForView(vendor) },
      { label: 'Edit Details', icon: Edit, onClick: () => { setEditingVendor(vendor); setIsModalOpen(true); } }
    ];
    if (vendor.status === 'Pending') {
      base.push({ label: 'Approve', icon: CheckCircle, onClick: () => handleStatusChange(vendor.id, 'Active') });
    } else if (vendor.status === 'Suspended') {
      base.push({ label: 'Unsuspend', icon: Ban, onClick: () => handleStatusChange(vendor.id, 'Active') });
    } else {
      base.push({ label: 'Suspend', icon: Ban, warning: true, onClick: () => {
        if(window.confirm('Are you sure you want to suspend this vendor?')) handleStatusChange(vendor.id, 'Suspended');
      }});
    }
    base.push({ label: 'Delete', icon: Trash2, danger: true, onClick: () => handleDelete(vendor.id) });
    return base;
  };

  const handleSaveVendor = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newVendorData = {
      shopName: formData.get('shopName'),
      owner: formData.get('owner'),
      city: formData.get('city'),
      state: formData.get('state'),
      mobile: formData.get('mobile'),
      email: formData.get('email'),
      status: formData.get('status'),
    };

    if (editingVendor) {
      setVendors(prev => prev.map(v => v.id === editingVendor.id ? { ...v, ...newVendorData } : v));
    } else {
      const newId = Math.max(0, ...vendors.map(v => v.id)) + 1;
      setVendors(prev => [{
        id: newId,
        shopId: `#SH00${newId}`,
        ...newVendorData,
        contactPhone: newVendorData.mobile,
        contactEmail: newVendorData.email,
        products: 0,
        active: 0,
        orders: 0,
        revenue: '₹0',
        rating: null,
        reviews: 0,
        commission: 12,
        timestamp: Date.now()
      }, ...prev]);
    }
    setIsModalOpen(false);
    setEditingVendor(null);
  };

  const handleExportCSV = () => {
    if (filteredVendors.length === 0) return;
    const headers = ['Shop Name', 'Owner', 'City', 'Phone', 'Email', 'Products', 'Orders', 'Revenue', 'Status'];
    const rows = filteredVendors.map(v => [
      `"${v.shopName}"`, `"${v.owner}"`, `"${v.city}"`, `"${v.mobile}"`, `"${v.email}"`, v.products, v.orders, `"${v.revenue}"`, v.status
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'shop_vendors.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-3 sm:px-10 sm:py-8 w-full max-w-full min-w-0 overflow-x-hidden transition-all duration-300">
      {/* Page Header */}
      <div className="flex flex-row items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex-1">
          <h1 className="text-xl sm:text-[28px] font-black text-gray-900 tracking-tight leading-tight">Shop Vendors</h1>
          <p className="hidden sm:block text-sm text-gray-500 font-medium mt-1">{vendors.length} registered shops platform-wide</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {selectedIds.size > 0 && (
            <div className="hidden sm:flex items-center gap-2 bg-[#FAF7F2] border border-[#66B4B1]/30 px-3 py-1.5 rounded-xl text-xs font-bold text-[#599D9A]">
              <span>{selectedIds.size} selected</span>
              <button onClick={handleBulkActivate} className="bg-[#66B4B1] hover:bg-[#66B4B1] text-white px-2 py-1 rounded-lg transition">Activate</button>
              <button onClick={handleBulkSuspend} className="bg-amber-500 hover:bg-amber-600 text-white px-2 py-1 rounded-lg transition">Suspend</button>
              <button onClick={handleBulkDelete} className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-lg transition">Delete</button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button onClick={() => { setEditingVendor(null); setIsModalOpen(true); }} className="bg-[#66B4B1] hover:bg-[#66B4B1] text-white px-3 sm:px-5 py-2.5 rounded-xl text-[11px] sm:text-sm font-bold shadow-sm shadow-[#66B4B1]/10 transition flex items-center gap-1.5 whitespace-nowrap">
              + Add Shop
            </button>
            <button onClick={handleExportCSV} className="hidden sm:flex border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 px-3 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition whitespace-nowrap">
              Export CSV
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex sm:hidden items-center justify-between mb-4 bg-[#FAF7F2] border border-[#66B4B1]/30 p-2 rounded-xl text-xs font-bold text-[#599D9A]">
          <span>{selectedIds.size} selected</span>
          <div className="flex gap-1">
            <button onClick={handleBulkActivate} className="bg-[#66B4B1] hover:bg-[#66B4B1] text-white px-2 py-1 rounded-lg transition">Act</button>
            <button onClick={handleBulkSuspend} className="bg-amber-500 hover:bg-amber-600 text-white px-2 py-1 rounded-lg transition">Sus</button>
            <button onClick={handleBulkDelete} className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-lg transition">Del</button>
          </div>
        </div>
      )}

      {/* Spacious Premium Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm col-span-2 md:col-span-1 lg:col-span-1">
          <p className="text-gray-400 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1">Total Shop Vendors</p>
          <h3 className="text-2xl sm:text-3xl font-black text-gray-900">{vendors.length}</h3>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1 line-clamp-1">Active Shops</p>
          <h3 className="text-2xl sm:text-3xl font-black text-[#66B4B1]">{vendors.filter(v => v.status === 'Active').length}</h3>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1 line-clamp-1">Total Products</p>
          <h3 className="text-2xl sm:text-3xl font-black text-gray-900">{vendors.reduce((acc, curr) => acc + curr.products, 0).toLocaleString()}</h3>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1 line-clamp-1">Orders Today</p>
          <h3 className="text-2xl sm:text-3xl font-black text-gray-900">{vendors.reduce((acc, curr) => acc + curr.orders, 0).toLocaleString()}</h3>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1 line-clamp-1">Today Revenue</p>
          <h3 className="text-2xl sm:text-3xl font-black text-[#66B4B1]">₹{vendors.reduce((acc, curr) => acc + parseNum(curr.revenue), 0).toLocaleString()}</h3>
        </div>
      </div>

      {/* Spacious Filter Card */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm mb-6 flex flex-col sm:flex-row flex-wrap gap-3">
        <div className="relative w-full sm:w-72 shrink-0">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search shop name, owner, city..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#66B4B1] focus:ring-2 focus:ring-[#66B4B1]/10 focus:bg-white transition" 
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 flex-1 gap-2 sm:gap-3 w-full">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-2 sm:px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-700 focus:outline-none focus:border-[#66B4B1] transition shadow-sm cursor-pointer truncate">
            <option>All Status</option>
            <option>Active</option>
            <option>Pending</option>
            <option>Suspended</option>
            <option>Blocked</option>
          </select>
          <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="w-full px-2 sm:px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-700 focus:outline-none focus:border-[#66B4B1] transition shadow-sm cursor-pointer truncate">
            <option>All Cities</option>
            {cities.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={sortFilter} onChange={(e) => setSortFilter(e.target.value)} className="col-span-2 sm:col-span-1 w-full px-2 sm:px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-700 focus:outline-none focus:border-[#66B4B1] transition shadow-sm cursor-pointer truncate">
            <option>Sort: Revenue ↓</option>
            <option>Sort: Rating ↓</option>
            <option>Sort: Orders ↓</option>
            <option>Sort: Newest</option>
          </select>
        </div>
      </div>

      {/* Spacious Premium Table Card */}
      {/* Spacious Premium Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden w-full transition-all duration-300">
        
        {/* Mobile Stacked Card View */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:hidden divide-y md:divide-y-0 md:gap-4 md:p-4 divide-gray-100">
          {paginatedData.length > 0 ? paginatedData.map((vendor) => (
            <div key={vendor.id} className={`p-4 md:rounded-2xl md:border md:border-gray-100 flex flex-col gap-3.5 bg-white hover:bg-gray-50 transition shadow-sm md:shadow-none ${selectedIds.has(vendor.id) ? 'border-[#66B4B1] bg-[#FAF7F2]' : ''}`}>
              
              {/* Header: Checkbox, Avatar, Name, Action */}
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.has(vendor.id)}
                    onChange={() => toggleSelect(vendor.id)}
                    className="w-4 h-4 rounded border-gray-300 text-[#66B4B1] focus:ring-[#66B4B1] mt-1 shrink-0" 
                  />
                  <div className="w-10 h-10 rounded-full bg-[#FAF7F2] text-[#599D9A] flex items-center justify-center font-bold text-lg shrink-0 shadow-sm mt-0.5">
                    {vendor.owner.charAt(0)}
                  </div>
                  <div>
                    <h3 onClick={() => setSelectedVendorForView(vendor)} className="text-[15px] font-bold text-gray-900 leading-tight hover:text-[#66B4B1] hover:underline cursor-pointer mb-0.5">{vendor.shopName}</h3>
                    <p className="text-xs text-gray-500 font-medium">{vendor.shopId} • {vendor.owner}</p>
                  </div>
                </div>
                <div className="shrink-0 -mt-1 -mr-2">
                  <ActionMenu options={getOptions(vendor)} />
                </div>
              </div>
              
              {/* Tags/Info Row */}
              <div className="flex flex-wrap items-center gap-2 pl-0 sm:pl-[68px]">
                <StatusBadge status={vendor.status} />
                <span className="flex items-center gap-1 text-[11px] font-bold text-gray-600 bg-gray-50 px-2 py-1 rounded-md border border-gray-200">
                  <MapPin size={12} className="text-gray-400" /> {vendor.city}, {vendor.state}
                </span>
                <span className="flex items-center gap-1 text-[11px] font-bold text-gray-600 bg-gray-50 px-2 py-1 rounded-md border border-gray-200">
                  <Phone size={12} className="text-gray-400" /> {vendor.mobile}
                </span>
              </div>

              {/* Stats Block */}
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100 ml-0 sm:ml-[68px]">
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Orders</span>
                  <span className="text-[15px] font-black text-gray-900">{vendor.orders}</span>
                </div>
                <div className="w-px h-8 bg-gray-200"></div>
                <div className="flex flex-col text-right">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Revenue</span>
                  <span className="text-[15px] font-black text-[#66B4B1]">{vendor.revenue}</span>
                </div>
              </div>

            </div>
          )) : (
            <div className="p-8 md:col-span-2 text-center text-gray-400 font-bold">
              No shop vendors match your active filters.
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden xl:block overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-[#FAF7F2] border-b border-gray-100 h-12">
                <th className="px-5 py-3 w-[50px] text-center">
                  <input 
                    type="checkbox" 
                    checked={filteredVendors.length > 0 && selectedIds.size === filteredVendors.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-[#66B4B1] focus:ring-[#66B4B1] transition" 
                  />
                </th>
                <th className="px-5 py-3 text-[11px] font-bold text-gray-505 uppercase tracking-wider w-[200px]">SHOP</th>
                <th className="px-5 py-3 text-[11px] font-bold text-gray-505 uppercase tracking-wider w-[150px]">OWNER & BASIC INFO</th>
                <th className="px-5 py-3 text-[11px] font-bold text-gray-505 uppercase tracking-wider w-[130px]">CONTACT PHONE</th>
                <th className="px-5 py-3 text-[11px] font-bold text-gray-505 uppercase tracking-wider w-[110px]">LOCATION</th>
                <th className="px-5 py-3 text-[11px] font-bold text-gray-505 uppercase tracking-wider w-[180px]">CONTACT EMAIL</th>
                <th className="px-5 py-3 text-[11px] font-bold text-gray-505 uppercase tracking-wider w-[100px]">PRODUCTS</th>
                <th className="px-5 py-3 text-[11px] font-bold text-gray-505 uppercase tracking-wider w-[100px]">ACTIVE LISTINGS</th>
                <th className="px-5 py-3 text-[11px] font-bold text-gray-505 uppercase tracking-wider w-[100px]">ORDERS TODAY</th>
                <th className="px-5 py-3 text-[11px] font-bold text-gray-505 uppercase tracking-wider w-[120px]">MONTHLY REVENUE</th>
                <th className="px-5 py-3 text-[11px] font-bold text-gray-505 uppercase tracking-wider w-[110px]">RATING</th>
                <th className="px-5 py-3 text-[11px] font-bold text-gray-505 uppercase tracking-wider w-[100px]">COMMISSION</th>
                <th className="px-5 py-3 text-[11px] font-bold text-gray-505 uppercase tracking-wider w-[90px]">STATUS</th>
                <th className="px-5 py-3 text-[11px] font-bold text-gray-505 uppercase tracking-wider w-[130px] text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedData.length > 0 ? paginatedData.map((vendor, idx) => (
                <tr key={vendor.id} className={`hover:bg-[#FAF7F2] transition-colors h-[68px] ${idx % 2 !== 0 ? 'bg-[#FAF7F2]' : 'bg-white'} ${selectedIds.has(vendor.id) ? 'bg-[#FAF7F2]' : ''}`}>
                  <td className="px-5 py-3 text-center whitespace-nowrap">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.has(vendor.id)}
                      onChange={() => toggleSelect(vendor.id)}
                      className="w-4 h-4 rounded border-gray-300 text-[#66B4B1] focus:ring-[#66B4B1] transition" 
                    />
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="w-9 h-9 rounded-full bg-[#FAF7F2] text-[#599D9A] flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                        {vendor.owner.charAt(0)}
                      </div>
                      <div>
                        <h3 onClick={() => setSelectedVendorForView(vendor)} className="text-[14px] font-bold text-gray-900 leading-tight mb-0.5 hover:text-[#66B4B1] hover:underline cursor-pointer transition whitespace-nowrap">{vendor.shopName}</h3>
                        <p className="text-[11px] text-gray-400 font-semibold leading-tight whitespace-nowrap">{vendor.shopId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <div className="text-[13px] font-bold text-gray-900 leading-tight mb-0.5 whitespace-nowrap">{vendor.owner}</div>
                    <div className="text-[11px] text-gray-400 font-semibold leading-tight whitespace-nowrap">{vendor.mobile}</div>
                  </td>
                  <td className="px-5 py-3 text-[13px] text-gray-700 font-bold whitespace-nowrap">
                    <a href={`tel:${vendor.contactPhone}`} className="hover:text-[#66B4B1] transition">{vendor.contactPhone}</a>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <div className="text-[13px] text-gray-800 font-bold whitespace-nowrap">{vendor.city}</div>
                    <div className="text-[10px] text-gray-400 font-bold whitespace-nowrap">{vendor.state}</div>
                  </td>
                  <td className="px-5 py-3 text-[13px] text-gray-700 font-semibold whitespace-nowrap">
                    <a href={`mailto:${vendor.contactEmail}`} className="hover:text-[#66B4B1] transition">{vendor.contactEmail}</a>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <div className="text-[15px] font-bold text-gray-900 leading-tight whitespace-nowrap">{vendor.products}</div>
                    <div className="text-[10px] text-gray-400 font-bold whitespace-nowrap">items listed</div>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    {vendor.active > 0 ? (
                      <div className="text-[15px] font-bold text-[#66B4B1] leading-tight whitespace-nowrap">{vendor.active}</div>
                    ) : (
                      <div className="text-[15px] font-bold text-red-500 leading-tight whitespace-nowrap">{vendor.active}</div>
                    )}
                    <div className="text-[10px] text-gray-400 font-bold whitespace-nowrap">active</div>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <div className="text-[15px] font-bold text-gray-900 leading-tight flex items-center gap-1 whitespace-nowrap">
                      {vendor.orders}
                      {vendor.orders > 0 ? <span className="text-[#66B4B1] text-xs">↑</span> : null}
                    </div>
                    <div className="text-[10px] text-gray-400 font-bold whitespace-nowrap">orders</div>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <div className="text-[15px] font-bold text-gray-900 leading-tight whitespace-nowrap">{vendor.revenue}</div>
                    <div className="text-[10px] text-[#66B4B1] font-bold whitespace-nowrap">+14% vs last mo</div>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    {vendor.rating ? (
                      <>
                        <div className="text-[13px] text-gray-900 font-bold leading-tight flex items-center gap-1 whitespace-nowrap"><span className="text-amber-500">★</span> {vendor.rating}</div>
                        <div className="text-[10px] text-gray-400 font-bold whitespace-nowrap">({vendor.reviews} reviews)</div>
                      </>
                    ) : (
                      <div className="text-[11px] text-gray-400 font-bold whitespace-nowrap">— No reviews</div>
                    )}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <div className="text-[14px] font-bold text-gray-900 leading-tight whitespace-nowrap">{vendor.commission}%</div>
                    <button onClick={() => { setEditingVendor(vendor); setIsModalOpen(true); }} className="text-[11px] text-[#66B4B1] font-bold hover:underline">Edit Rate</button>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <StatusBadge status={vendor.status} />
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                      <button onClick={() => setSelectedVendorForView(vendor)} className="px-3 py-1.5 border border-[#66B4B1] text-[#66B4B1] rounded-xl text-[11px] font-extrabold hover:bg-[#FAF7F2] transition shadow-sm whitespace-nowrap">View Profile</button>
                      <ActionMenu options={getOptions(vendor)} />
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="14" className="px-5 py-12 text-center text-gray-400 font-bold">
                    No shop vendors match your active filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
          
        {totalPages > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6 py-4 border-t border-gray-100 bg-white">
            <p className="text-[13px] text-gray-505 font-semibold text-center sm:text-left">
              Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredVendors.length)} of {filteredVendors.length} shops
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="text-[13px] font-bold border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:border-[#66B4B1] transition w-full sm:w-auto">
                <option value={5}>5 per page</option>
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
              </select>
              <div className="flex items-center justify-center gap-1 w-full sm:w-auto">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 text-[13px] font-bold text-gray-505 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition">← Prev</button>
                <div className="flex gap-1 overflow-x-auto max-w-[140px] sm:max-w-none">
                  {[...Array(totalPages)].map((_, i) => (
                    <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-[13px] font-bold transition ${currentPage === i + 1 ? 'bg-[#66B4B1] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 text-[13px] font-bold text-gray-505 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition">Next →</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Side-Drawer for Vendor Profile Details (Full Process) */}
      {selectedVendorForView && (
        <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/40 backdrop-blur-sm transition-all duration-300">
          <div className="absolute inset-0" onClick={() => setSelectedVendorForView(null)} />
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-slide-left">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
                <div className="w-12 h-12 rounded-full bg-[#FAF7F2] text-[#599D9A] flex items-center justify-center font-bold text-lg shadow-sm">
                  {selectedVendorForView.owner.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 leading-tight">{selectedVendorForView.shopName}</h3>
                  <p className="text-xs text-gray-500 font-bold mt-0.5">{selectedVendorForView.shopId} • Managed by {selectedVendorForView.owner}</p>
                </div>
              </div>
              <button onClick={() => setSelectedVendorForView(null)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-xl transition">
                <X size={20} />
              </button>
            </div>
            
            {/* Drawer Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status & Review Summary */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 uppercase">Vendor Status</span>
                  <StatusBadge status={selectedVendorForView.status} />
                </div>
                <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/50 px-2.5 py-1 rounded-xl">
                  <Star size={14} className="text-amber-500 fill-amber-500" />
                  <span className="text-xs font-black text-amber-700">{selectedVendorForView.rating || '—'}</span>
                  <span className="text-[10px] text-amber-600 font-bold">({selectedVendorForView.reviews} reviews)</span>
                </div>
              </div>

              {/* Owner and Contact Info Block */}
              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Owner Contact Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Owner Name</span>
                    <span className="text-sm font-black text-gray-800">{selectedVendorForView.owner}</span>
                  </div>
                  <div className="bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Commission Rate</span>
                    <span className="text-sm font-black text-gray-800">{selectedVendorForView.commission}% platform fee</span>
                  </div>
                  <div className="bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Contact Phone</span>
                    <a href={`tel:${selectedVendorForView.contactPhone}`} className="text-sm font-bold text-[#66B4B1] hover:underline flex items-center gap-1.5">
                      <Phone size={13} /> {selectedVendorForView.contactPhone}
                    </a>
                  </div>
                  <div className="bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Contact Email</span>
                    <a href={`mailto:${selectedVendorForView.contactEmail}`} className="text-sm font-bold text-[#66B4B1] hover:underline flex items-center gap-1.5 truncate">
                      <Mail size={13} /> {selectedVendorForView.contactEmail}
                    </a>
                  </div>
                </div>
              </div>

              {/* Stats Bar */}
              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Performance & Inventory</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center bg-gray-50/30 border border-gray-100 rounded-2xl p-4">
                  <div>
                    <span className="text-xl font-black text-gray-900 block">{selectedVendorForView.products}</span>
                    <span className="text-[10px] text-gray-400 uppercase font-bold">Catalog Items</span>
                  </div>
                  <div className="border-x border-gray-200">
                    <span className="text-xl font-black text-gray-900 block">{selectedVendorForView.orders}</span>
                    <span className="text-[10px] text-gray-400 uppercase font-bold">Orders Today</span>
                  </div>
                  <div>
                    <span className="text-xl font-black text-[#66B4B1] block">{selectedVendorForView.revenue}</span>
                    <span className="text-[10px] text-gray-400 uppercase font-bold">Today Revenue</span>
                  </div>
                </div>
              </div>

              {/* Catalog — this vendor's real products, no sales/trend tracked yet. */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Catalog</h4>
                </div>
                <div className="space-y-2">
                  {vendorDetailLoading ? (
                    <p className="text-[12px] text-gray-400 py-4 text-center">Loading catalog…</p>
                  ) : vendorTopProducts.length ? (
                    vendorTopProducts.slice(0, 5).map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3.5 border border-gray-100 rounded-2xl hover:bg-gray-50 transition duration-200">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#FAF7F2] flex items-center justify-center text-[#599D9A] font-bold text-xs shrink-0">
                            <ShoppingBag size={14} />
                          </div>
                          <div>
                            <span className="text-sm font-bold text-gray-800 block leading-tight">{item.name}</span>
                            <span className="text-[10px] text-gray-400 font-bold">{item.category}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-gray-900 block">₹{Number(item.price).toLocaleString('en-IN')}</span>
                          <span className={`text-[9px] font-black uppercase tracking-wider ${item.status === 'Active' ? 'text-[#66B4B1]' : item.status === 'Out of Stock' ? 'text-rose-500 bg-rose-50 px-1 rounded' : 'text-amber-500 bg-amber-50 px-1 rounded'}`}>{item.status}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-[12px] text-gray-400 py-4 text-center">No products listed by this vendor yet.</p>
                  )}
                </div>
              </div>

              {/* Compliance — real KYC documents from VendorProfile.documents. */}
              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Compliance & Licenses</h4>
                <div className="space-y-2">
                  {vendorDetailLoading ? (
                    <p className="text-[12px] text-gray-400 py-4 text-center">Loading documents…</p>
                  ) : vendorDocs.length ? (
                    vendorDocs.map((d, i) => {
                      const status = d.status || (d.verifiedAt ? 'verified' : 'pending');
                      const isVerified = status === 'verified';
                      return (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50/50 border border-gray-100 rounded-2xl">
                          <span className="text-xs font-bold text-gray-700 flex items-center gap-2"><FileText size={14} className="text-[#66B4B1]" /> {DOC_LABEL[d.kind] || d.kind}</span>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg flex items-center gap-0.5 ${isVerified ? 'text-[#66B4B1] bg-[#FAF7F2]' : 'text-amber-600 bg-amber-50'}`}>
                            {isVerified ? <CheckCircle size={10} /> : <AlertTriangle size={10} />} {isVerified ? 'Verified' : status === 'rejected' ? 'Rejected' : 'Pending'}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-[12px] text-gray-400 py-4 text-center">No documents uploaded yet.</p>
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
                Edit Vendor Details
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

      {/* Modern Premium Add/Edit Modal (Full Process) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-zoomIn border border-gray-100/50">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50 shrink-0">
              <h3 className="text-lg font-black text-gray-900">{editingVendor ? 'Edit Shop Vendor' : 'Register New Shop Vendor'}</h3>
              <button onClick={() => { setIsModalOpen(false); setEditingVendor(null); }} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-lg transition"><X size={20}/></button>
            </div>
            <div className="overflow-y-auto p-5 flex-1">
              <form onSubmit={handleSaveVendor} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Shop Business Name</label>
                  <input required name="shopName" defaultValue={editingVendor?.shopName} className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:outline-none focus:border-[#66B4B1] focus:ring-2 focus:ring-[#66B4B1]/10 focus:bg-white transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Owner Full Name</label>
                  <input required name="owner" defaultValue={editingVendor?.owner} className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:outline-none focus:border-[#66B4B1] focus:ring-2 focus:ring-[#66B4B1]/10 focus:bg-white transition" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">City</label>
                    <input required name="city" defaultValue={editingVendor?.city} className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:outline-none focus:border-[#66B4B1] focus:ring-2 focus:ring-[#66B4B1]/10 focus:bg-white transition" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">State Code</label>
                    <input required name="state" defaultValue={editingVendor?.state} placeholder="e.g. MH" className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:outline-none focus:border-[#66B4B1] focus:ring-2 focus:ring-[#66B4B1]/10 focus:bg-white transition" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Mobile Number</label>
                    <input required name="mobile" defaultValue={editingVendor?.mobile} className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:outline-none focus:border-[#66B4B1] focus:ring-2 focus:ring-[#66B4B1]/10 focus:bg-white transition" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Email Address</label>
                    <input required type="email" name="email" defaultValue={editingVendor?.email} className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:outline-none focus:border-[#66B4B1] focus:ring-2 focus:ring-[#66B4B1]/10 focus:bg-white transition" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Platform Account Status</label>
                  <select name="status" defaultValue={editingVendor?.status || 'Pending'} className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:outline-none focus:border-[#66B4B1] focus:ring-2 focus:ring-[#66B4B1]/10 focus:bg-white transition">
                    <option>Active</option>
                    <option>Pending</option>
                    <option>Suspended</option>
                    <option>Blocked</option>
                  </select>
                </div>
                <div className="pt-6 pb-2 flex gap-3">
                  <button type="button" onClick={() => { setIsModalOpen(false); setEditingVendor(null); }} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
                  <button onClick={() => alert("Action triggered: Save Changes")} type="submit" className="flex-1 px-4 py-2.5 bg-[#66B4B1] hover:bg-[#66B4B1] rounded-xl text-sm font-bold text-white shadow-sm shadow-[#66B4B1]/20 transition">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
