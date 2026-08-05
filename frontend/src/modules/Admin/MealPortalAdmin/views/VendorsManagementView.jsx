import React from 'react';
import { useMealPortal } from '../context/MealPortalContext';
import { DataTable } from '../../components/DataTable';
import { Store, CheckCircle, Ban, Star, TrendingUp } from 'lucide-react';
import { cn } from '../../../user/utils/cn';

export function VendorsManagementView() {
  const { vendors, updateGlobalStatus } = useMealPortal();

  const handleStatusChange = (id, newStatus) => {
    updateGlobalStatus('vendors', id, newStatus);
  };

  const columns = [
    { key: 'id', label: 'Vendor ID' },
    { key: 'name', label: 'Business Profile', sortable: true, render: (row) => (
      <div>
        <p className="font-bold text-gray-900">{row.name}</p>
        <p className="text-[11px] text-gray-500 font-medium mt-0.5">{row.type}</p>
      </div>
    )},
    { key: 'zone', label: 'Delivery Zone' },
    { key: 'activeSubs', label: 'Active Subs', sortable: true, render: (row) => (
      <span className="font-bold text-gray-700">{row.activeSubs}</span>
    )},
    { key: 'revenue', label: 'MTD Revenue', sortable: true, render: (row) => (
      <span className="font-bold text-emerald-600">₹{(row.revenue/1000).toFixed(1)}k</span>
    )},
    { key: 'rating', label: 'Rating', render: (row) => (
      <span className="flex items-center gap-1 text-xs font-bold text-amber-500">
        <Star size={12} className="fill-amber-500" /> {row.rating > 0 ? row.rating : 'New'}
      </span>
    )},
    { key: 'status', label: 'Status', render: (row) => (
      <span className={cn(
        "px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded border",
        row.status === 'Verified' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
        row.status === 'Suspended' ? "bg-red-50 text-red-700 border-red-100" :
        "bg-amber-50 text-amber-700 border-amber-100"
      )}>
        {row.status}
      </span>
    )},
    { key: 'actions', label: 'Platform Controls', render: (row) => (
      <div className="flex items-center gap-1.5">
        {row.status !== 'Verified' && (
          <button 
            onClick={() => handleStatusChange(row.id, 'Verified')}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition shadow-sm cursor-pointer flex items-center gap-1"
          >
            <CheckCircle size={12} /> Verify
          </button>
        )}
        {row.status !== 'Suspended' && (
          <button 
            onClick={() => handleStatusChange(row.id, 'Suspended')}
            className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-100 text-[10px] font-bold uppercase tracking-wider rounded-lg transition shadow-sm cursor-pointer flex items-center gap-1"
          >
            <Ban size={12} /> Suspend
          </button>
        )}
      </div>
    )}
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] shrink-0">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Vendor Ecosystem Management</h2>
          <p className="text-sm font-semibold text-gray-500 mt-0.5">Approve, suspend, and monitor all meal subscription providers on the platform.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-xs font-bold border border-emerald-100">
            <TrendingUp size={14} /> Total Vendors: {vendors.length}
          </div>
          <button className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-sm font-bold rounded-xl transition shadow-lg shadow-slate-900/20 cursor-pointer flex items-center gap-2">
            <Store size={16} /> Add Vendor
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-[400px]">
        <DataTable
          columns={columns}
          data={vendors}
          searchKey="name"
          searchPlaceholder="Search vendors by business name..."
          filterKey="status"
          filterOptions={['Verified', 'Pending', 'Suspended']}
        />
      </div>
    </div>
  );
}
