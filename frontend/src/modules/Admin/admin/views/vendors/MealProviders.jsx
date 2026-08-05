import React, { useState, useMemo, useEffect } from 'react';
import { Search, MapPin, Phone, Mail, MoreVertical, CheckCircle, AlertTriangle, X, Edit, Trash2, Ban, Eye, ClipboardList } from 'lucide-react';
import { fetchAdminVendors, approveVendorApi, suspendVendorApi } from '../../../../../services/admin';

const MP_STATUS = { approved: 'Active', pending: 'Pending', suspended: 'Suspended', rejected: 'Suspended' };
function mealProviderRow(v) {
  return {
    id: v.id, name: v.businessName, providerId: '#ML' + String(v.id).slice(-4).toUpperCase(),
    owner: v.owner || v.businessName, mobile: v.phone, email: v.email, contactPhone: v.phone, contactEmail: v.email,
    city: v.city || '—', state: '—', subs: v.orders || 0, subsMax: Math.max(v.orders || 0, 100), plans: [],
    trialsUsed: 0, trialsMax: 20, deliveries: 0, delStatus: 'On Time', area: v.city || '—',
    revenue: '₹' + (v.revenue || 0).toLocaleString('en-IN'), rating: v.rating ? String(v.rating) : '0',
    status: MP_STATUS[v.approvalStatus] || 'Pending',
  };
}
import { StatusBadge, ActionMenu, Pagination } from '../../components/VendorShared';

export function MealProviders() {
  const [providers, setProviders] = useState([]);

  useEffect(() => {
    fetchAdminVendors({ type: 'meal_subscription' }).then((rows) => setProviders(rows.map(mealProviderRow))).catch((err) => console.error('Failed to load meal providers', err));
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [planFilter, setPlanFilter] = useState('All Plan Types');
  const [cityFilter, setCityFilter] = useState('All Cities');
  const [sortFilter, setSortFilter] = useState('Sort: Subscriptions ↓');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [selectedProviderForView, setSelectedProviderForView] = useState(null);

  const parseNum = (str) => {
    if (!str) return 0;
    return Number(str.toString().replace(/[^0-9.-]+/g,""));
  };

  const filteredProviders = useMemo(() => {
    let result = providers.filter(v => {
      const matchSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          v.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          v.city.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'All Status' || v.status === statusFilter;
      const matchPlan = planFilter === 'All Plan Types' || v.plans.includes(planFilter);
      const matchCity = cityFilter === 'All Cities' || v.city === cityFilter;
      
      return matchSearch && matchStatus && matchPlan && matchCity;
    });

    result.sort((a, b) => {
      if (sortFilter === 'Sort: Subscriptions ↓') return b.subs - a.subs;
      if (sortFilter === 'Sort: Revenue ↓') return parseNum(b.revenue) - parseNum(a.revenue);
      if (sortFilter === 'Sort: Deliveries ↓') return b.deliveries - a.deliveries;
      return 0;
    });

    return result;
  }, [providers, searchQuery, statusFilter, planFilter, cityFilter, sortFilter]);

  const totalPages = Math.ceil(filteredProviders.length / itemsPerPage);
  const paginatedData = filteredProviders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const cities = [...new Set(providers.map(v => v.city))].sort();

  const handleStatusChange = (id, newStatus) => {
    if (newStatus === 'Active') approveVendorApi(id).catch((err) => console.error(err));
    else if (newStatus === 'Suspended') suspendVendorApi(id).catch((err) => console.error(err));
    setProviders(prev => prev.map(v => v.id === id ? { ...v, status: newStatus } : v));
  };

  const handleDelete = (id) => {
    if(window.confirm('Vendors cannot be deleted — suspend this provider instead?')) {
      handleStatusChange(id, 'Suspended');
    }
  };

  const getOptions = (vendor) => {
    const base = [
      { label: 'View Profile', icon: Eye, onClick: () => setSelectedProviderForView(vendor) },
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
      name: formData.get('name'),
      owner: formData.get('owner'),
      city: formData.get('city'),
      state: formData.get('state'),
      mobile: formData.get('mobile'),
      email: formData.get('email'),
      status: formData.get('status'),
    };

    if (editingVendor) {
      setProviders(prev => prev.map(v => v.id === editingVendor.id ? { ...v, ...newVendorData } : v));
    } else {
      const newId = Math.max(0, ...providers.map(v => v.id)) + 1;
      setProviders(prev => [{
        id: newId,
        providerId: `#ML00${newId}`,
        ...newVendorData,
        contactPhone: newVendorData.mobile,
        contactEmail: newVendorData.email,
        subs: 0, subsMax: 100, plans: ['Starter'], trialsUsed: 0, trialsMax: 20, deliveries: 0, delStatus: 'On Time', area: `${newVendorData.city} — 5km`, revenue: '₹0', rating: null
      }, ...prev]);
    }
    setIsModalOpen(false);
    setEditingVendor(null);
  };

  const handleExportCSV = () => {
    if (filteredProviders.length === 0) return;
    const headers = ['Provider Name', 'Owner', 'City', 'Phone', 'Email', 'Subscriptions', 'Trials', 'Deliveries', 'Revenue', 'Status'];
    const rows = filteredProviders.map(v => [
      `"${v.name}"`, `"${v.owner}"`, `"${v.city}"`, `"${v.mobile}"`, `"${v.email}"`, v.subs, v.trialsUsed, v.deliveries, `"${v.revenue}"`, v.status
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'meal_providers.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPlanPill = (plan) => {
    const styles = {
      'Starter': 'bg-blue-100 text-blue-700',
      'Popular': 'bg-teal-100 text-teal-700',
      'Best Value': 'bg-green-100 text-green-700',
      'Custom': 'bg-purple-100 text-purple-700',
    };
    return <span key={plan} className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${styles[plan] || 'bg-gray-100 text-gray-700'}`}>{plan}</span>;
  };

  return (
    <div className="p-3 sm:px-10 sm:py-8 w-full max-w-[1600px] mx-auto min-w-0 overflow-x-hidden transition-all duration-300">
      {/* Page Header */}
      <div className="flex flex-row items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex-1">
          <h1 className="text-xl sm:text-[28px] font-black text-gray-900 tracking-tight leading-tight">Meal Providers</h1>
          <p className="hidden sm:block text-sm text-gray-500 font-medium mt-1">{providers.length} registered kitchens</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button onClick={() => { setEditingVendor(null); setIsModalOpen(true); }} className="bg-[#66B4B1] hover:bg-[#66B4B1] text-white px-3 sm:px-5 py-2.5 rounded-xl text-[11px] sm:text-sm font-bold shadow-sm shadow-[#66B4B1]/10 transition flex items-center gap-1.5 whitespace-nowrap">
            + Add Provider
          </button>
          <button onClick={handleExportCSV} className="hidden sm:flex border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 px-3 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition whitespace-nowrap">
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm col-span-2 md:col-span-1 lg:col-span-1">
          <p className="text-gray-400 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1">Total Providers</p>
          <h3 className="text-2xl sm:text-3xl font-black text-gray-900">{providers.length}</h3>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1 line-clamp-1">Active Subs</p>
          <h3 className="text-2xl sm:text-3xl font-black text-[#66B4B1]">{providers.reduce((acc, curr) => acc + curr.subs, 0).toLocaleString()}</h3>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1 line-clamp-1">Trials Week</p>
          <h3 className="text-2xl sm:text-3xl font-black text-gray-900">{providers.reduce((acc, curr) => acc + curr.trialsUsed, 0).toLocaleString()}</h3>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1 line-clamp-1">Deliveries</p>
          <h3 className="text-2xl sm:text-3xl font-black text-gray-900">{providers.reduce((acc, curr) => acc + curr.deliveries, 0).toLocaleString()}</h3>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1 line-clamp-1">Monthly Rev</p>
          <h3 className="text-2xl sm:text-3xl font-black text-[#66B4B1]">₹{providers.reduce((acc, curr) => acc + parseNum(curr.revenue), 0).toLocaleString()}</h3>
        </div>
      </div>

      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm mb-6 flex flex-col sm:flex-row flex-wrap gap-3">
        <div className="relative w-full sm:w-72 shrink-0">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search provider name, city..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#66B4B1] focus:ring-2 focus:ring-[#66B4B1]/10 focus:bg-white transition" 
          />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 flex-1 gap-2 sm:gap-3 w-full">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-2 sm:px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-700 focus:outline-none focus:border-[#66B4B1] transition shadow-sm cursor-pointer truncate">
            <option>All Status</option>
            <option>Active</option>
            <option>Pending</option>
            <option>Suspended</option>
            <option>Blocked</option>
          </select>
          <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className="w-full px-2 sm:px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-700 focus:outline-none focus:border-[#66B4B1] transition shadow-sm cursor-pointer truncate">
            <option>All Plan Types</option>
            <option>Starter</option>
            <option>Popular</option>
            <option>Best Value</option>
            <option>Custom</option>
          </select>
          <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="w-full px-2 sm:px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-700 focus:outline-none focus:border-[#66B4B1] transition shadow-sm cursor-pointer truncate">
            <option>All Cities</option>
            {cities.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={sortFilter} onChange={(e) => setSortFilter(e.target.value)} className="w-full px-2 sm:px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-700 focus:outline-none focus:border-[#66B4B1] transition shadow-sm cursor-pointer truncate">
            <option>Sort: Subscriptions ↓</option>
            <option>Sort: Revenue ↓</option>
            <option>Sort: Deliveries ↓</option>
          </select>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mb-6 rounded-2xl">
        {/* Mobile Stacked Card View */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:hidden divide-y md:divide-y-0 md:gap-4 md:p-4 divide-gray-100">
          {paginatedData.length > 0 ? paginatedData.map((vendor) => (
            <div key={vendor.id} className="p-4 md:rounded-2xl md:border md:border-gray-100 flex flex-col gap-3.5 bg-white hover:bg-gray-50 transition shadow-sm md:shadow-none">
              
              {/* Header: Checkbox, Avatar, Name, Action */}
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                  <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#66B4B1] mt-1 shrink-0" />
                  <div className="w-10 h-10 rounded-full bg-[#FAF7F2] text-[#599D9A] flex items-center justify-center font-bold text-lg shrink-0 shadow-sm mt-0.5">
                    {vendor.owner.charAt(0)}
                  </div>
                  <div>
                    <h3 onClick={() => setSelectedProviderForView(vendor)} className="text-[15px] font-bold text-gray-900 leading-tight hover:text-[#66B4B1] hover:underline cursor-pointer mb-0.5">{vendor.name}</h3>
                    <p className="text-xs text-gray-500 font-medium">{vendor.providerId} • {vendor.owner}</p>
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
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Active Subs</span>
                  <span className="text-[15px] font-black text-[#66B4B1]">{vendor.subs}</span>
                </div>
                <div className="w-px h-8 bg-gray-200"></div>
                <div className="flex flex-col text-right">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Revenue</span>
                  <span className="text-[15px] font-black text-gray-900">{vendor.revenue}</span>
                </div>
              </div>

            </div>
          )) : (
            <div className="p-8 md:col-span-2 text-center text-gray-400 font-bold">
              No providers match your active filters.
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden xl:block overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[1500px]">
            <thead>
              <tr className="bg-[#FAF7F2] border-b border-[#FAF7F2]">
                <th className="px-4 py-3 w-[40px]"><input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#66B4B1]" /></th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[160px]">PROVIDER</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[130px]">OWNER</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[100px]">CONTACT</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[100px]">LOCATION</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[140px]">EMAIL</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[110px]">ACTIVE SUBSCRIPTIONS</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[130px]">PLANS OFFERED</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[100px]">TRIALS USED (MTD)</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[100px]">DELIVERIES TODAY</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[100px]">DELIVERY AREA</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[120px]">MONTHLY REVENUE</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[80px]">RATING</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[100px]">STATUS</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[130px] text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FAF7F2]">
              {paginatedData.map((vendor, idx) => (
                <tr key={vendor.id} className={`hover:bg-[#FAF7F2] transition h-[64px] ${idx % 2 !== 0 ? 'bg-[#FAF7F2]' : 'bg-white'}`}>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#66B4B1]" />
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="w-8 h-8 rounded-full bg-[#FAF7F2] text-[#599D9A] flex items-center justify-center font-bold text-xs shrink-0">
                        {vendor.owner.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-[14px] font-medium text-gray-900 leading-tight mb-0.5 whitespace-nowrap">{vendor.name}</h3>
                        <p className="text-[11px] text-gray-500 leading-tight whitespace-nowrap">{vendor.providerId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="text-[13px] text-gray-900 leading-tight mb-0.5 whitespace-nowrap">{vendor.owner}</div>
                    <div className="text-[11px] text-gray-500 leading-tight whitespace-nowrap">{vendor.mobile}</div>
                  </td>
                  <td className="px-4 py-2 text-[12px] text-[#5A5552] font-medium whitespace-nowrap">
                    {vendor.contactPhone}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="text-[12px] text-gray-900 font-medium whitespace-nowrap">{vendor.city}</div>
                    <div className="text-[10px] text-gray-500 whitespace-nowrap">{vendor.state}</div>
                  </td>
                  <td className="px-4 py-2 text-[12px] text-[#5A5552] font-medium truncate max-w-[140px] whitespace-nowrap">
                    {vendor.contactEmail}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="text-[16px] font-medium text-[#66B4B1] leading-tight whitespace-nowrap">{vendor.subs}</div>
                    <div className="text-[10px] text-gray-500 mb-1 whitespace-nowrap">subscribers</div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-[#66B4B1] h-1.5 rounded-full" style={{ width: `${(vendor.subs / vendor.subsMax) * 100}%` }}></div>
                    </div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1 whitespace-nowrap">
                      {vendor.plans.map(getPlanPill)}
                    </div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="text-[13px] text-gray-900 leading-tight mb-1 whitespace-nowrap">{vendor.trialsUsed} / {vendor.trialsMax} limit</div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden mb-1">
                      <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${(vendor.trialsUsed / vendor.trialsMax) * 100}%` }}></div>
                    </div>
                    <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[9px] font-bold uppercase whitespace-nowrap">Sat Only</span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="text-[16px] font-medium text-gray-900 leading-tight whitespace-nowrap">{vendor.deliveries}</div>
                    <div className="text-[10px] text-gray-500 mb-0.5 whitespace-nowrap">deliveries</div>
                    {vendor.delStatus === 'On Time' ? (
                      <div className="text-[10px] font-bold text-green-600 flex items-center gap-0.5 whitespace-nowrap"><CheckCircle size={10} /> On Time</div>
                    ) : (
                      <div className="text-[10px] font-bold text-amber-500 flex items-center gap-0.5 whitespace-nowrap"><AlertTriangle size={10} /> Delayed</div>
                    )}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="text-[12px] text-gray-700 leading-tight whitespace-nowrap">{vendor.area}</div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="text-[16px] font-medium text-gray-900 leading-tight whitespace-nowrap">{vendor.revenue}</div>
                    <div className="text-[11px] text-green-500 whitespace-nowrap">+X% vs last mo</div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {vendor.rating ? (
                      <>
                        <div className="text-[14px] text-gray-900 font-medium leading-tight flex items-center gap-1 whitespace-nowrap"><span className="text-amber-500">★</span> {vendor.rating}</div>
                        <div className="text-[10px] text-gray-500 whitespace-nowrap">(X reviews)</div>
                      </>
                    ) : (
                      <div className="text-[11px] text-gray-500 whitespace-nowrap">— No reviews</div>
                    )}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <StatusBadge status={vendor.status} />
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                      <button onClick={() => setSelectedProviderForView(vendor)} className="px-3 py-1.5 border border-[#66B4B1] text-[#66B4B1] rounded-lg text-[11px] font-bold hover:bg-[#FAF7F2] transition whitespace-nowrap">View</button>
                      <ActionMenu options={getOptions(vendor)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6 py-4 border-t border-gray-100 bg-white">
            <p className="text-[13px] text-gray-505 font-semibold text-center sm:text-left">
              Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredProviders.length)} of {filteredProviders.length} providers
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

      <div className="bg-white p-6 rounded-xl border border-[#FAF7F2] shadow-sm max-w-lg">
        <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <ClipboardList size={16} className="text-[#66B4B1]" />
          Trial Meal Rules (Admin Controlled)
        </h4>
        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-2 text-[13px] text-gray-700 font-medium"><CheckCircle size={14} className="text-[#66B4B1]" /> 1 trial per user account</div>
          <div className="flex items-center gap-2 text-[13px] text-gray-700 font-medium"><CheckCircle size={14} className="text-[#66B4B1]" /> 1 trial per registered pet</div>
          <div className="flex items-center gap-2 text-[13px] text-gray-700 font-medium"><CheckCircle size={14} className="text-[#66B4B1]" /> Available Saturdays only</div>
          <div className="flex items-center gap-2 text-[13px] text-gray-700 font-medium"><CheckCircle size={14} className="text-[#66B4B1]" /> Fresh meal delivery by vendor</div>
          <div className="flex items-center gap-2 text-[13px] text-gray-700 font-medium"><CheckCircle size={14} className="text-[#66B4B1]" /> Post-trial paid subscription required</div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
          <div className="flex justify-between text-[12px] font-bold text-gray-700 mb-1">
            <span>Trial usage this month: {providers.reduce((acc, curr) => acc + curr.trialsUsed, 0)} / 500</span>
            <span className="text-[#66B4B1]">{Math.round((providers.reduce((acc, curr) => acc + curr.trialsUsed, 0) / 500) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mb-4">
            <div className="bg-[#66B4B1] h-2 rounded-full" style={{ width: `${(providers.reduce((acc, curr) => acc + curr.trialsUsed, 0) / 500) * 100}%` }}></div>
          </div>
          <button onClick={() => alert("Action triggered: Edit Trial Rules →")} className="w-full py-2 bg-white border border-gray-300 rounded-lg text-[13px] font-semibold text-gray-700 hover:bg-gray-50 transition">
            Edit Trial Rules →
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden border border-gray-100/50">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
              <h3 className="text-lg font-bold text-gray-900">{editingVendor ? 'Edit Meal Provider' : 'Add Meal Provider'}</h3>
              <button onClick={() => { setIsModalOpen(false); setEditingVendor(null); }} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-lg transition"><X size={20}/></button>
            </div>
            <div className="overflow-y-auto p-5 flex-1">
              <form onSubmit={handleSaveVendor} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Provider Name</label>
                  <input required name="name" defaultValue={editingVendor?.name} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Owner Name</label>
                  <input required name="owner" defaultValue={editingVendor?.owner} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">City</label>
                    <input required name="city" defaultValue={editingVendor?.city} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">State (Code)</label>
                    <input required name="state" defaultValue={editingVendor?.state} placeholder="e.g. MH" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Mobile Number</label>
                    <input required name="mobile" defaultValue={editingVendor?.mobile} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
                    <input required type="email" name="email" defaultValue={editingVendor?.email} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition" />
                  </div>
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
                <div className="pt-6 pb-2 flex gap-3">
                  <button type="button" onClick={() => { setIsModalOpen(false); setEditingVendor(null); }} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
                  <button onClick={() => alert("Action triggered: Save Changes")} type="submit" className="flex-1 px-4 py-2.5 bg-[#66B4B1] hover:bg-[#66B4B1] rounded-xl text-sm font-bold text-white shadow-sm shadow-[#66B4B1]/20 transition">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Side-Drawer for Meal Provider Profile Details */}
      {selectedProviderForView && (
        <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/40 backdrop-blur-sm transition-all duration-300">
          <div className="absolute inset-0" onClick={() => setSelectedProviderForView(null)} />
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-slide-left">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
                <div className="w-12 h-12 rounded-full bg-[#FAF7F2] text-[#599D9A] flex items-center justify-center font-bold text-lg shadow-sm">
                  {selectedProviderForView.owner.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 leading-tight">{selectedProviderForView.name}</h3>
                  <p className="text-xs text-gray-500 font-bold mt-0.5">{selectedProviderForView.providerId} • Managed by {selectedProviderForView.owner}</p>
                </div>
              </div>
              <button onClick={() => setSelectedProviderForView(null)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-xl transition">
                <X size={20} />
              </button>
            </div>
            
            {/* Drawer Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status & Review Summary */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 uppercase">Provider Status</span>
                  <StatusBadge status={selectedProviderForView.status} />
                </div>
                <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/50 px-2.5 py-1 rounded-xl">
                  <span className="text-amber-500">★</span>
                  <span className="text-xs font-black text-amber-700">{selectedProviderForView.rating || '—'}</span>
                  <span className="text-[10px] text-amber-600 font-bold">Rating</span>
                </div>
              </div>

              {/* Owner and Contact Info Block */}
              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Owner Contact Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Owner Name</span>
                    <span className="text-sm font-black text-gray-800">{selectedProviderForView.owner}</span>
                  </div>
                  <div className="bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Delivery Area</span>
                    <span className="text-sm font-bold text-gray-800 flex items-center gap-1">
                      <MapPin size={13} className="text-gray-500" /> {selectedProviderForView.area}
                    </span>
                  </div>
                  <div className="bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Contact Phone</span>
                    <a href={`tel:${selectedProviderForView.contactPhone}`} className="text-sm font-bold text-[#66B4B1] hover:underline flex items-center gap-1.5">
                      <Phone size={13} /> {selectedProviderForView.contactPhone}
                    </a>
                  </div>
                  <div className="bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Contact Email</span>
                    <a href={`mailto:${selectedProviderForView.contactEmail}`} className="text-sm font-bold text-[#66B4B1] hover:underline flex items-center gap-1.5 truncate">
                      <Mail size={13} /> {selectedProviderForView.contactEmail}
                    </a>
                  </div>
                </div>
              </div>

              {/* Performance Stats */}
              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Operational Performance</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center bg-gray-50/30 border border-gray-100 rounded-2xl p-4">
                  <div>
                    <span className="text-xl font-black text-gray-900 block">{selectedProviderForView.subs}</span>
                    <span className="text-[10px] text-gray-400 uppercase font-bold">Active Subs</span>
                  </div>
                  <div className="border-x border-gray-200">
                    <span className="text-xl font-black text-gray-900 block">{selectedProviderForView.deliveries}</span>
                    <span className="text-[10px] text-gray-400 uppercase font-bold">Total Deliveries</span>
                  </div>
                  <div>
                    <span className="text-xl font-black text-[#66B4B1] block">{selectedProviderForView.revenue}</span>
                    <span className="text-[10px] text-gray-400 uppercase font-bold">Revenue</span>
                  </div>
                </div>
              </div>

              {/* Meal Plans Offered */}
              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Meal Plans Offered</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedProviderForView.plans.map(plan => getPlanPill(plan))}
                </div>
              </div>

              {/* Trials Used this Month */}
              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Trial Usage Limit</h4>
                <div className="bg-gray-50/50 p-4 border border-gray-100 rounded-2xl">
                  <div className="flex justify-between text-xs font-bold text-gray-700 mb-2">
                    <span>Trials Used: {selectedProviderForView.trialsUsed} / {selectedProviderForView.trialsMax} limit</span>
                    <span className="text-[#66B4B1]">{Math.round((selectedProviderForView.trialsUsed / selectedProviderForView.trialsMax) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div className="bg-[#66B4B1] h-2 rounded-full" style={{ width: `${(selectedProviderForView.trialsUsed / selectedProviderForView.trialsMax) * 100}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Drawer Actions Footer */}
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-3 shadow-inner">
              <button 
                onClick={() => {
                  setEditingVendor(selectedProviderForView);
                  setSelectedProviderForView(null);
                  setIsModalOpen(true);
                }}
                className="flex-1 py-3 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-xl text-sm font-bold shadow-sm transition"
              >
                Edit Details
              </button>
              {selectedProviderForView.status === 'Active' ? (
                <button 
                  onClick={() => {
                    handleStatusChange(selectedProviderForView.id, 'Suspended');
                    setSelectedProviderForView(null);
                  }}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold shadow-sm transition"
                >
                  Suspend Account
                </button>
              ) : (
                <button 
                  onClick={() => {
                    handleStatusChange(selectedProviderForView.id, 'Active');
                    setSelectedProviderForView(null);
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
