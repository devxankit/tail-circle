import React, { useState, useMemo, useEffect } from 'react';
import { Search, MapPin, Phone, Mail, MoreVertical, ShieldAlert, CheckCircle, AlertTriangle, XCircle, FileBadge, X, Edit, Trash2, Ban, Eye, Building2, Home, Video, AlertCircle } from 'lucide-react';
import { StatusBadge, ActionMenu, Pagination } from '../../components/VendorShared';
import { fetchAdminVendors, approveVendorApi, suspendVendorApi } from '../../../../../services/admin';

export function DoctorsClinics() {
  const [doctors, setDoctors] = useState([]);

  useEffect(() => {
    fetchAdminVendors({ type: 'clinic' }).then((rows) => setDoctors(rows.map((v) => ({
      id: v.id, name: v.businessName, docId: '#DR' + String(v.id).slice(-4).toUpperCase(),
      clinic: v.businessName, est: '', mobile: v.phone, email: v.email, contactPhone: v.phone, contactEmail: v.email,
      city: v.city || '—', state: '—', distance: '—', spec: 'General Vet', modes: ['Clinic Visit'],
      appts: v.orders || 0, apptsClinic: v.orders || 0, apptsVideo: 0, apptsHome: 0, videoCalls: 0,
      fee: '₹0', extraFee: null, exp: 0, certs: [], rating: v.rating ? String(v.rating) : null, reviews: 0, response: 0,
      verified: v.approvalStatus === 'approved' ? 'Verified' : 'Pending',
      status: ({ approved: 'Active', pending: 'Pending', suspended: 'Suspended', rejected: 'Suspended' })[v.approvalStatus] || 'Pending',
    })))).catch((err) => console.error('Failed to load clinics', err));
  }, []);

  const _unusedSeed = ([
    { id: 1, name: 'Dr. Priya Das', docId: '#DR001', clinic: 'PetCare Clinic', est: 'Est. 2018', mobile: '+91 98765 43210', email: 'priya@example.com', contactPhone: '+91 98765 43210', contactEmail: 'contact@petcare.in', city: 'Bangalore', state: 'KA', distance: '10km radius', spec: 'General Vet', modes: ['Clinic Visit', 'Video Call', 'Emergency'], appts: 12, apptsClinic: 8, apptsVideo: 3, apptsHome: 1, videoCalls: 3, fee: '₹500', extraFee: 'home +₹200', exp: 8, certs: ['BVSc', 'VCIN'], rating: '4.8', reviews: 142, response: 98, verified: 'Verified', status: 'Active' },
    { id: 2, name: 'Dr. Rohan Shah', docId: '#DR002', clinic: 'Happy Tails', est: 'Est. 2021', mobile: '+91 87654 32109', email: 'rohan@example.com', contactPhone: '+91 87654 32109', contactEmail: 'dr.rohan@happytails.com', city: 'Hyderabad', state: 'TG', distance: 'Pan India (Video)', spec: 'Dermatology', modes: ['Video Call'], appts: 8, apptsClinic: 0, apptsVideo: 8, apptsHome: 0, videoCalls: 8, fee: '₹400', extraFee: null, exp: 5, certs: ['BVSc', 'MVSc'], rating: '4.6', reviews: 89, response: 95, verified: 'Pending', status: 'Active' },
    { id: 3, name: 'Dr. Anita Roy', docId: '#DR003', clinic: 'PawHealth', est: 'Est. 2015', mobile: '+91 76543 21098', email: 'anita@example.com', contactPhone: '+91 76543 21098', contactEmail: 'info@pawhealth.in', city: 'Delhi', state: 'DL', distance: '5km radius', spec: 'Surgery', modes: ['Clinic Visit'], appts: 6, apptsClinic: 6, apptsVideo: 0, apptsHome: 0, videoCalls: 0, fee: '₹800', extraFee: null, exp: 12, certs: ['BVSc', 'MVSc', 'PhD'], rating: '4.9', reviews: 201, response: 99, verified: 'Verified', status: 'Active' },
    { id: 4, name: 'Dr. Suresh Kumar', docId: '#DR004', clinic: 'VetPlus', est: 'Est. 2020', mobile: '+91 65432 10987', email: 'suresh@example.com', contactPhone: '+91 65432 10987', contactEmail: 'dr.suresh@vetplus.com', city: 'Chennai', state: 'TN', distance: '15km radius', spec: 'Nutrition', modes: ['Clinic Visit', 'Home Visit', 'Video Call', 'Emergency'], appts: 9, apptsClinic: 3, apptsVideo: 4, apptsHome: 2, videoCalls: 4, fee: '₹350', extraFee: null, exp: 6, certs: ['BVSc', 'VCIN'], rating: '4.3', reviews: 67, response: 90, verified: 'Verified', status: 'Active' },
    { id: 5, name: 'Dr. Kavya Nair', docId: '#DR005', clinic: 'PetMed Center', est: 'Est. 2017', mobile: '+91 54321 09876', email: 'kavya@example.com', contactPhone: '+91 54321 09876', contactEmail: 'emergency@petmed.in', city: 'Mumbai', state: 'MH', distance: '20km radius', spec: 'Emergency', modes: ['Clinic Visit', 'Emergency'], appts: 14, apptsClinic: 10, apptsVideo: 0, apptsHome: 0, videoCalls: 0, fee: '₹600', extraFee: 'emerg +₹300', exp: 10, certs: ['BVSc', 'MVSc'], rating: '4.7', reviews: 178, response: 99, verified: 'Verified', status: 'Active' },
    { id: 6, name: 'Dr. Vivek Sharma', docId: '#DR006', clinic: 'City Pet Care', est: 'Est. 2022', mobile: '+91 99887 76655', email: 'vivek@example.com', contactPhone: '+91 99887 76655', contactEmail: 'dr.vivek@citypetcare.com', city: 'Pune', state: 'MH', distance: '8km radius', spec: 'Dentistry', modes: ['Clinic Visit'], appts: 4, apptsClinic: 4, apptsVideo: 0, apptsHome: 0, videoCalls: 0, fee: '₹450', extraFee: null, exp: 4, certs: ['BVSc'], rating: '4.2', reviews: 34, response: 88, verified: 'Pending', status: 'Active' },
    { id: 7, name: 'Dr. Sneha Patil', docId: '#DR007', clinic: 'CareVet Clinic', est: 'Est. 2019', mobile: '+91 88776 65544', email: 'sneha@example.com', contactPhone: '+91 88776 65544', contactEmail: 'info@carevet.in', city: 'Jaipur', state: 'RJ', distance: '12km radius', spec: 'General Vet', modes: ['Clinic Visit', 'Video Call'], appts: 7, apptsClinic: 5, apptsVideo: 2, apptsHome: 0, videoCalls: 2, fee: '₹300', extraFee: null, exp: 7, certs: ['BVSc', 'VCIN'], rating: '4.5', reviews: 112, response: 92, verified: 'Pending', status: 'Active' },
    { id: 8, name: 'Dr. Ramesh Gupta', docId: '#DR008', clinic: 'Gupta Pet Hospital', est: 'Est. 2010', mobile: '+91 77665 54433', email: 'ramesh@example.com', contactPhone: '+91 77665 54433', contactEmail: 'dr.ramesh@guptapet.com', city: 'Kolkata', state: 'WB', distance: '25km radius', spec: 'Surgery', modes: ['Clinic Visit', 'Emergency'], appts: 18, apptsClinic: 15, apptsVideo: 0, apptsHome: 0, videoCalls: 0, fee: '₹1000', extraFee: null, exp: 18, certs: ['BVSc', 'MVSc', 'PhD'], rating: '4.9', reviews: 405, response: 96, verified: 'Pending', status: 'Active' },
    { id: 9, name: 'Dr. Meera Iyer', docId: '#DR009', clinic: 'Meera Vet', est: 'Est. 2023', mobile: '+91 66554 43322', email: 'meera@example.com', contactPhone: '+91 66554 43322', contactEmail: 'contact@meeravet.in', city: 'Chennai', state: 'TN', distance: 'Pan India (Video)', spec: 'Nutrition', modes: ['Video Call'], appts: 5, apptsClinic: 0, apptsVideo: 5, apptsHome: 0, videoCalls: 5, fee: '₹250', extraFee: null, exp: 2, certs: ['BVSc'], rating: '4.1', reviews: 12, response: 100, verified: 'Pending', status: 'Active' },
    { id: 10, name: 'Dr. Arjun Kapoor', docId: '#DR010', clinic: 'Kapoor Animal Clinic', est: 'Est. 2016', mobile: '+91 55443 32211', email: 'arjun@example.com', contactPhone: '+91 55443 32211', contactEmail: 'dr.arjun@kapoorclinic.com', city: 'Delhi', state: 'DL', distance: '10km radius', spec: 'Dermatology', modes: ['Clinic Visit', 'Home Visit'], appts: 11, apptsClinic: 8, apptsVideo: 0, apptsHome: 3, videoCalls: 0, fee: '₹550', extraFee: 'home +₹250', exp: 9, certs: ['BVSc', 'MVSc'], rating: '4.6', reviews: 215, response: 91, verified: 'Pending', status: 'Active' },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [specFilter, setSpecFilter] = useState('Specialization');
  const [modeFilter, setModeFilter] = useState('All Modes');
  const [cityFilter, setCityFilter] = useState('All Cities');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [selectedDoctorForView, setSelectedDoctorForView] = useState(null);

  const filteredDoctors = useMemo(() => {
    let result = doctors.filter(v => {
      const matchSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          v.clinic.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          v.city.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'All Status' || v.status === statusFilter;
      const matchSpec = specFilter === 'Specialization' || v.spec === specFilter;
      const matchMode = modeFilter === 'All Modes' || v.modes.includes(modeFilter);
      const matchCity = cityFilter === 'All Cities' || v.city === cityFilter;
      
      return matchSearch && matchStatus && matchSpec && matchMode && matchCity;
    });

    return result;
  }, [doctors, searchQuery, statusFilter, specFilter, modeFilter, cityFilter]);

  const totalPages = Math.ceil(filteredDoctors.length / itemsPerPage);
  const paginatedData = filteredDoctors.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const cities = [...new Set(doctors.map(v => v.city))].sort();

  const handleStatusChange = (id, newStatus) => {
    if (newStatus === 'Active') approveVendorApi(id).catch((err) => console.error(err));
    else if (newStatus === 'Suspended') suspendVendorApi(id).catch((err) => console.error(err));
    setDoctors(prev => prev.map(v => v.id === id ? { ...v, status: newStatus } : v));
  };

  const handleVerify = (id) => {
    approveVendorApi(id).catch((err) => console.error(err));
    setDoctors(prev => prev.map(v => v.id === id ? { ...v, verified: 'Verified' } : v));
  };

  const handleDelete = (id) => {
    if(window.confirm('Vendors cannot be deleted — suspend this clinic instead?')) {
      handleStatusChange(id, 'Suspended');
    }
  };

  const getOptions = (vendor) => {
    const base = [
      { label: 'View Profile', icon: Eye, onClick: () => setSelectedDoctorForView(vendor) },
      { label: 'Edit Details', icon: Edit, onClick: () => { setEditingVendor(vendor); setIsModalOpen(true); } }
    ];
    if (vendor.verified === 'Pending') {
      base.push({ label: 'Verify Docs', icon: CheckCircle, onClick: () => handleVerify(vendor.id) });
    }
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
      clinic: formData.get('clinic'),
      city: formData.get('city'),
      state: formData.get('state'),
      mobile: formData.get('mobile'),
      email: formData.get('email'),
      spec: formData.get('spec'),
      fee: formData.get('fee'),
      exp: formData.get('exp'),
      status: formData.get('status'),
    };

    if (editingVendor) {
      setDoctors(prev => prev.map(v => v.id === editingVendor.id ? { ...v, ...newVendorData } : v));
    } else {
      const newId = Math.max(0, ...doctors.map(v => v.id)) + 1;
      setDoctors(prev => [{
        id: newId,
        docId: `#DR00${newId}`,
        ...newVendorData,
        contactPhone: newVendorData.mobile,
        contactEmail: newVendorData.email,
        est: `Est. ${new Date().getFullYear()}`,
        distance: '5km radius',
        modes: ['Clinic Visit'],
        appts: 0, apptsClinic: 0, apptsVideo: 0, apptsHome: 0, videoCalls: 0,
        extraFee: null, certs: ['BVSc'], rating: null, reviews: 0, response: 100, verified: 'Pending'
      }, ...prev]);
    }
    setIsModalOpen(false);
    setEditingVendor(null);
  };

  const handleExportCSV = () => {
    if (filteredDoctors.length === 0) return;
    const headers = ['Doctor Name', 'Clinic', 'City', 'Phone', 'Email', 'Specialization', 'Appointments', 'Fee', 'Experience', 'Verified', 'Status'];
    const rows = filteredDoctors.map(v => [
      `"${v.name}"`, `"${v.clinic}"`, `"${v.city}"`, `"${v.mobile}"`, `"${v.email}"`, `"${v.spec}"`, v.appts, `"${v.fee}"`, v.exp, v.verified, v.status
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'doctors_clinics.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSpecPill = (spec) => {
    return <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-200">{spec}</span>;
  };

  const getModePill = (mode) => {
    const icons = {
      'Clinic Visit': <Building2 size={12} className="text-gray-500" />,
      'Home Visit': <Home size={12} className="text-gray-500" />,
      'Video Call': <Video size={12} className="text-gray-500" />,
      'Emergency': <AlertCircle size={12} className="text-gray-500" />
    };
    return (
      <span key={mode} className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold bg-white border border-gray-200 text-gray-700 shadow-sm">
        {icons[mode]} {mode}
      </span>
    );
  };

  return (
    <div className="p-3 sm:px-10 sm:py-8 w-full max-w-[1600px] mx-auto min-w-0 overflow-x-hidden transition-all duration-300">
      <div className="flex flex-row items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex-1">
          <h1 className="text-xl sm:text-[28px] font-black text-gray-900 tracking-tight leading-tight">Doctors / Clinics</h1>
          <p className="hidden sm:block text-sm text-gray-500 font-medium mt-1">{doctors.length} registered</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button onClick={() => { setEditingVendor(null); setIsModalOpen(true); }} className="bg-[#66B4B1] hover:bg-[#66B4B1] text-white px-3 sm:px-5 py-2.5 rounded-xl text-[11px] sm:text-sm font-bold shadow-sm shadow-[#66B4B1]/10 transition flex items-center gap-1.5 whitespace-nowrap">
            + Add Doctor
          </button>
          <button onClick={handleExportCSV} className="hidden sm:flex border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 px-3 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition whitespace-nowrap">
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1 line-clamp-1">Total Doctors</p>
          <h3 className="text-2xl sm:text-3xl font-black text-gray-900">{doctors.length}</h3>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1 line-clamp-1">Verified</p>
          <h3 className="text-2xl sm:text-3xl font-black text-gray-900">{doctors.filter(d => d.verified === 'Verified').length}</h3>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1 line-clamp-1">Appointments Today</p>
          <h3 className="text-2xl sm:text-3xl font-black text-gray-900">{doctors.reduce((acc, curr) => acc + curr.appts, 0)}</h3>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1 line-clamp-1">Video Consultations</p>
          <h3 className="text-2xl sm:text-3xl font-black text-blue-600">{doctors.reduce((acc, curr) => acc + curr.videoCalls, 0)}</h3>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1 line-clamp-1">Emergency Cases</p>
          <h3 className="text-2xl sm:text-3xl font-black text-red-500">{doctors.filter(d => d.modes.includes('Emergency')).length * 2 /* just a placeholder logic */}</h3>
        </div>
      </div>

      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm mb-6 flex flex-col sm:flex-row flex-wrap gap-3">
        <div className="relative w-full sm:w-72 shrink-0">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search doctor name, clinic, city..." 
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
          </select>
          <select value={specFilter} onChange={(e) => setSpecFilter(e.target.value)} className="w-full px-2 sm:px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-700 focus:outline-none focus:border-[#66B4B1] transition shadow-sm cursor-pointer truncate">
            <option>Specialization</option>
            <option>General Vet</option>
            <option>Dermatology</option>
            <option>Surgery</option>
            <option>Nutrition</option>
            <option>Emergency</option>
            <option>Dentistry</option>
          </select>
          <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)} className="w-full px-2 sm:px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-700 focus:outline-none focus:border-[#66B4B1] transition shadow-sm cursor-pointer truncate">
            <option>All Modes</option>
            <option>Clinic Visit</option>
            <option>Home Visit</option>
            <option>Video Call</option>
            <option>Emergency</option>
          </select>
          <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="w-full px-2 sm:px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-700 focus:outline-none focus:border-[#66B4B1] transition shadow-sm cursor-pointer truncate">
            <option>All Cities</option>
            {cities.map(c => <option key={c}>{c}</option>)}
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
                    {vendor.name.split(' ')[1]?.charAt(0) || vendor.name.charAt(0)}
                  </div>
                  <div>
                    <h3 onClick={() => setSelectedDoctorForView(vendor)} className="text-[15px] font-bold text-gray-900 leading-tight hover:text-[#66B4B1] hover:underline cursor-pointer flex items-center gap-1.5 mb-0.5">
                      {vendor.name} 
                      {vendor.verified === 'Verified' ? <CheckCircle size={14} className="text-[#66B4B1]" /> : <AlertTriangle size={14} className="text-amber-500" />}
                    </h3>
                    <p className="text-xs text-gray-500 font-medium">{vendor.docId} • {vendor.clinic}</p>
                  </div>
                </div>
                <div className="shrink-0 -mt-1 -mr-2">
                  <ActionMenu options={getOptions(vendor)} />
                </div>
              </div>
              
              {/* Tags/Info Row */}
              <div className="flex flex-wrap items-center gap-2 pl-0 sm:pl-[68px]">
                <StatusBadge status={vendor.status} />
                {getSpecPill(vendor.spec)}
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
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Appointments</span>
                  <span className="text-[15px] font-black text-gray-900">{vendor.appts}</span>
                </div>
                <div className="w-px h-8 bg-gray-200"></div>
                <div className="flex flex-col text-right">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Consult Fee</span>
                  <span className="text-[15px] font-black text-[#66B4B1]">{vendor.fee}</span>
                </div>
              </div>

            </div>
          )) : (
            <div className="p-8 md:col-span-2 text-center text-gray-400 font-bold">
              No doctors match your active filters.
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden xl:block overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[1600px]">
            <thead>
              <tr className="bg-[#FAF7F2] border-b border-[#FAF7F2]">
                <th className="px-4 py-3 w-[40px]"><input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#66B4B1]" /></th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[170px]">DOCTOR</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[130px]">CLINIC NAME</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[100px]">CONTACT</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[100px]">LOCATION</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[140px]">EMAIL</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[130px]">SPECIALIZATION</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[150px]">CONSULTATION MODES</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[110px]">APPOINTMENTS</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[90px]">VIDEO CALLS</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[100px]">CONSULT. FEE</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[80px]">EXPERIENCE</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[120px]">CERTIFICATIONS</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[80px]">RATING</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[90px]">VERIFIED</th>
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
                        {vendor.name.split(' ')[1]?.charAt(0) || vendor.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-[14px] font-medium text-gray-900 leading-tight mb-0.5 whitespace-nowrap">{vendor.name}</h3>
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <p className="text-[11px] text-gray-500 leading-tight whitespace-nowrap">{vendor.docId}</p>
                          {vendor.verified === 'Verified' ? (
                            <span className="text-[#66B4B1] text-[10px] font-bold flex items-center gap-0.5 whitespace-nowrap"><CheckCircle size={10} /> Verified</span>
                          ) : (
                            <span className="text-amber-500 text-[10px] font-bold flex items-center gap-0.5 whitespace-nowrap"><AlertTriangle size={10} /> Unverified</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="text-[13px] text-gray-900 leading-tight mb-0.5 whitespace-nowrap">{vendor.clinic}</div>
                    <div className="text-[11px] text-gray-500 leading-tight whitespace-nowrap">{vendor.est}</div>
                  </td>
                  <td className="px-4 py-2 text-[12px] text-[#5A5552] font-medium whitespace-nowrap">
                    {vendor.contactPhone}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="text-[12px] text-gray-900 font-medium whitespace-nowrap">{vendor.city}</div>
                    <div className="text-[10px] text-gray-500 whitespace-nowrap">{vendor.state} • {vendor.distance}</div>
                  </td>
                  <td className="px-4 py-2 text-[12px] text-[#5A5552] font-medium truncate max-w-[140px] whitespace-nowrap">
                    {vendor.contactEmail}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {getSpecPill(vendor.spec)}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="flex flex-col gap-1 w-max whitespace-nowrap">
                      {vendor.modes.slice(0, 2).map(getModePill)}
                      {vendor.modes.length > 2 && (
                         <div className="flex gap-1 whitespace-nowrap">
                           {vendor.modes.slice(2).map(getModePill)}
                         </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="text-[16px] font-medium text-gray-900 leading-tight whitespace-nowrap">{vendor.appts}</div>
                    <div className="text-[10px] text-gray-500 whitespace-nowrap">appointments</div>
                    <div className="text-[9px] text-gray-400 mt-0.5 whitespace-nowrap">{vendor.apptsClinic}c | {vendor.apptsVideo}v | {vendor.apptsHome}h</div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="text-[16px] font-medium text-blue-600 leading-tight whitespace-nowrap">{vendor.videoCalls}</div>
                    <div className="text-[10px] text-gray-500 whitespace-nowrap">video sessions</div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="text-[14px] font-medium text-gray-900 leading-tight whitespace-nowrap">{vendor.fee}</div>
                    <div className="text-[10px] text-gray-500 whitespace-nowrap">per session</div>
                    {vendor.extraFee && <div className="text-[11px] text-amber-500 font-medium whitespace-nowrap">{vendor.extraFee}</div>}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="text-[14px] font-medium text-gray-900 leading-tight whitespace-nowrap">{vendor.exp} yrs</div>
                    <div className="text-[10px] text-gray-500 whitespace-nowrap">experience</div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1 max-w-[120px] whitespace-nowrap">
                      {vendor.certs.slice(0, 2).map(c => (
                        <span key={c} className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 whitespace-nowrap">{c}</span>
                      ))}
                      {vendor.certs.length > 2 && (
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 whitespace-nowrap">+{vendor.certs.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {vendor.rating ? (
                      <>
                        <div className="text-[14px] text-gray-900 font-medium leading-tight flex items-center gap-1 whitespace-nowrap"><span className="text-amber-500">★</span> {vendor.rating}</div>
                        <div className="text-[10px] text-gray-500 whitespace-nowrap">{vendor.response}% resp</div>
                      </>
                    ) : (
                      <div className="text-[11px] text-gray-500 whitespace-nowrap">—</div>
                    )}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {vendor.verified === 'Verified' ? (
                      <div className="text-[#66B4B1] text-[13px] font-medium flex items-center gap-1 whitespace-nowrap"><CheckCircle size={14} /> Verified</div>
                    ) : (
                      <div className="flex flex-col gap-0.5 whitespace-nowrap">
                        <div className="text-amber-500 text-[13px] font-medium flex items-center gap-1 whitespace-nowrap"><AlertTriangle size={14} /> Pending</div>
                        <button onClick={() => handleVerify(vendor.id)} className="text-[10px] text-[#66B4B1] hover:underline font-bold text-left whitespace-nowrap">Verify Docs</button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <StatusBadge status={vendor.status} />
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                      <button onClick={() => setSelectedDoctorForView(vendor)} className="px-3 py-1.5 border border-[#66B4B1] text-[#66B4B1] rounded-lg text-[11px] font-bold hover:bg-[#FAF7F2] transition whitespace-nowrap">View</button>
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
              Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredDoctors.length)} of {filteredDoctors.length} doctors
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

      <div className="bg-white rounded-xl border border-amber-200 shadow-sm max-w-4xl overflow-hidden">
        <div className="p-4 border-b border-amber-100 flex justify-between items-center bg-amber-50/50">
          <h4 className="text-[14px] font-bold text-amber-700 flex items-center gap-2">
            <ShieldAlert size={18} />
            Pending certification verification
          </h4>
          <span className="bg-amber-100 text-amber-700 text-[11px] font-black px-2 py-0.5 rounded-full">
            {doctors.filter(d => d.verified === 'Pending').length}
          </span>
        </div>
        <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
          {doctors.filter(d => d.verified === 'Pending').map((doc) => (
            <div key={doc.id} className="p-3 sm:p-4 flex items-center justify-between gap-2 hover:bg-amber-50/30 transition">
              <div className="flex items-center gap-3 sm:gap-4 flex-1 overflow-hidden">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0"><FileBadge size={18} /></div>
                <div className="flex flex-col min-w-0">
                  <h5 className="text-[14px] sm:text-[13px] font-bold text-gray-900 leading-tight truncate">{doc.name}</h5>
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                    <p className="text-[11px] text-gray-500 whitespace-nowrap">Registration Docs</p>
                    <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-gray-300"></span>
                    <span className="text-[10px] sm:text-[11px] font-bold text-gray-700 bg-gray-50 sm:bg-transparent border border-gray-100 sm:border-transparent px-1.5 py-0.5 sm:p-0 rounded truncate max-w-[120px] sm:max-w-none">
                      {doc.certs.join(', ')}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => handleVerify(doc.id)} className="px-3 sm:px-4 py-1.5 sm:py-2 bg-amber-500 text-white rounded-lg text-[12px] font-bold hover:bg-amber-600 transition shadow-sm shrink-0">
                Verify
              </button>
            </div>
          ))}
          {doctors.filter(d => d.verified === 'Pending').length === 0 && (
             <div className="p-4 text-center text-gray-500 text-sm">No pending verifications.</div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden border border-gray-100/50">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white shrink-0">
              <h3 className="text-lg font-bold text-gray-900">{editingVendor ? 'Edit Doctor' : 'Add Doctor'}</h3>
              <button onClick={() => { setIsModalOpen(false); setEditingVendor(null); }} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-lg transition"><X size={20}/></button>
            </div>
            <div className="overflow-y-auto p-5 flex-1">
              <form onSubmit={handleSaveVendor} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Doctor Name</label>
                  <input required name="name" defaultValue={editingVendor?.name} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Clinic Name</label>
                  <input required name="clinic" defaultValue={editingVendor?.clinic} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition" />
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Specialization</label>
                    <select name="spec" defaultValue={editingVendor?.spec || 'General Vet'} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 transition">
                      <option>General Vet</option>
                      <option>Dermatology</option>
                      <option>Surgery</option>
                      <option>Nutrition</option>
                      <option>Emergency</option>
                      <option>Dentistry</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Consult Fee</label>
                    <input required name="fee" defaultValue={editingVendor?.fee || '₹500'} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Experience (Years)</label>
                    <input required type="number" name="exp" defaultValue={editingVendor?.exp || 5} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition" />
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

      {/* Side-Drawer for Doctor/Clinic Profile Details */}
      {selectedDoctorForView && (
        <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/40 backdrop-blur-sm transition-all duration-300">
          <div className="absolute inset-0" onClick={() => setSelectedDoctorForView(null)} />
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-slide-left">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
                <div className="w-12 h-12 rounded-full bg-[#FAF7F2] text-[#599D9A] flex items-center justify-center font-bold text-lg shadow-sm">
                  {selectedDoctorForView.name.charAt(4) || 'D'}
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 leading-tight">{selectedDoctorForView.name}</h3>
                  <p className="text-xs text-gray-500 font-bold mt-0.5">{selectedDoctorForView.docId} • {selectedDoctorForView.clinic} ({selectedDoctorForView.est})</p>
                </div>
              </div>
              <button onClick={() => setSelectedDoctorForView(null)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-xl transition">
                <X size={20} />
              </button>
            </div>
            
            {/* Drawer Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status & Verification Summary */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 uppercase">Status</span>
                  <StatusBadge status={selectedDoctorForView.status} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 uppercase">Verification</span>
                  {selectedDoctorForView.verified === 'Verified' ? (
                    <span className="text-[#66B4B1] text-[12px] font-black bg-[#FAF7F2] px-2.5 py-0.5 rounded-lg flex items-center gap-1"><CheckCircle size={12} /> Verified</span>
                  ) : (
                    <span className="text-amber-600 text-[12px] font-black bg-amber-50 px-2.5 py-0.5 rounded-lg flex items-center gap-1"><AlertTriangle size={12} /> Pending</span>
                  )}
                </div>
              </div>

              {/* Specialization & Experience */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Specialization</span>
                  <span className="text-sm font-black text-gray-800">{selectedDoctorForView.spec}</span>
                </div>
                <div className="bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Experience</span>
                  <span className="text-sm font-black text-gray-800">{selectedDoctorForView.exp} Years Practice</span>
                </div>
              </div>

              {/* Owner and Contact Info Block */}
              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Clinic Contact Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Clinic City</span>
                    <span className="text-sm font-black text-gray-850 flex items-center gap-1">
                      <MapPin size={13} className="text-gray-500" /> {selectedDoctorForView.city}, {selectedDoctorForView.state}
                    </span>
                  </div>
                  <div className="bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Response Rate</span>
                    <span className="text-sm font-black text-[#66B4B1]">{selectedDoctorForView.response}% on-time</span>
                  </div>
                  <div className="bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Contact Phone</span>
                    <a href={`tel:${selectedDoctorForView.contactPhone}`} className="text-sm font-bold text-[#66B4B1] hover:underline flex items-center gap-1.5">
                      <Phone size={13} /> {selectedDoctorForView.contactPhone}
                    </a>
                  </div>
                  <div className="bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Contact Email</span>
                    <a href={`mailto:${selectedDoctorForView.contactEmail}`} className="text-sm font-bold text-[#66B4B1] hover:underline flex items-center gap-1.5 truncate">
                      <Mail size={13} /> {selectedDoctorForView.contactEmail}
                    </a>
                  </div>
                </div>
              </div>

              {/* Consultation Fees & Modes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Consultation Fee</span>
                  <span className="text-sm font-black text-gray-800">{selectedDoctorForView.fee}</span>
                  {selectedDoctorForView.extraFee && (
                    <span className="text-[10px] text-gray-500 font-bold block mt-0.5">({selectedDoctorForView.extraFee})</span>
                  )}
                </div>
                <div className="bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Certs & Qualifications</span>
                  <span className="text-sm font-black text-gray-800">{selectedDoctorForView.certs.join(', ')}</span>
                </div>
              </div>

              {/* Consultation Modes */}
              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Consultation Modes</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedDoctorForView.modes.map(mode => (
                    <span key={mode} className="px-2.5 py-1 bg-teal-50 border border-teal-100 rounded-xl text-xs font-bold text-teal-700">{mode}</span>
                  ))}
                </div>
              </div>

              {/* Appointment Stats */}
              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Active Appointments Stats</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-center bg-gray-50/30 border border-gray-100 rounded-2xl p-4">
                  <div>
                    <span className="text-lg font-black text-gray-900 block">{selectedDoctorForView.apptsClinic}</span>
                    <span className="text-[9px] text-gray-400 uppercase font-bold">Clinic</span>
                  </div>
                  <div>
                    <span className="text-lg font-black text-gray-900 block">{selectedDoctorForView.apptsVideo}</span>
                    <span className="text-[9px] text-gray-400 uppercase font-bold">Video</span>
                  </div>
                  <div>
                    <span className="text-lg font-black text-gray-900 block">{selectedDoctorForView.apptsHome}</span>
                    <span className="text-[9px] text-gray-400 uppercase font-bold">Home</span>
                  </div>
                  <div>
                    <span className="text-lg font-black text-[#66B4B1] block">{selectedDoctorForView.appts}</span>
                    <span className="text-[9px] text-gray-400 uppercase font-bold">Total</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Drawer Actions Footer */}
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-3 shadow-inner">
              <button 
                onClick={() => {
                  setEditingVendor(selectedDoctorForView);
                  setSelectedDoctorForView(null);
                  setIsModalOpen(true);
                }}
                className="flex-1 py-3 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-xl text-sm font-bold shadow-sm transition"
              >
                Edit Details
              </button>
              {selectedDoctorForView.verified === 'Pending' && (
                <button 
                  onClick={() => {
                    handleVerify(selectedDoctorForView.id);
                    setSelectedDoctorForView(null);
                  }}
                  className="flex-1 py-3 bg-[#66B4B1] hover:bg-[#66B4B1] text-white rounded-xl text-sm font-bold shadow-sm transition"
                >
                  Verify Credentials
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
