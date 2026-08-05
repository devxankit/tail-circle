import React from 'react';
import { useMealPortal } from '../context/MealPortalContext';
import { DataTable } from '../../components/DataTable';
import { ShieldAlert, ShieldCheck, Ban, CheckCircle, Smartphone } from 'lucide-react';
import { cn } from '../../../user/utils/cn';

export function TrialMealsAdminView() {
  const { globalTrials, blockTrial, approveTrial } = useMealPortal();

  const columns = [
    { key: 'id', label: 'Req ID' },
    { key: 'vendor', label: 'Requested Vendor', sortable: true },
    { key: 'user', label: 'User & Mobile', render: (row) => (
      <div>
        <p className="font-bold text-gray-900">{row.user}</p>
        <p className="text-[10px] text-gray-500 font-mono mt-0.5 flex items-center gap-1"><Smartphone size={10} /> {row.mobile}</p>
      </div>
    )},
    { key: 'pet', label: 'Pet Patient' },
    { key: 'eligibility', label: 'Global Eligibility', render: (row) => (
      <span className={cn(
        "flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded border w-max",
        row.eligibility === 'Verified' ? "text-emerald-700 bg-emerald-50 border-emerald-100" : "text-red-700 bg-red-50 border-red-100"
      )}>
        {row.eligibility === 'Verified' ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
        {row.eligibility}
      </span>
    )},
    { key: 'status', label: 'Status', render: (row) => (
      <span className={cn(
        "px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded border",
        row.status === 'Approved' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
        row.status === 'Blocked' ? "bg-red-50 text-red-700 border-red-100" :
        "bg-amber-50 text-amber-700 border-amber-100"
      )}>
        {row.status}
      </span>
    )},
    { key: 'actions', label: 'Admin Override', render: (row) => (
      row.status === 'Pending' ? (
        <div className="flex items-center gap-2">
          <button 
            onClick={() => approveTrial(row.id)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition shadow-sm cursor-pointer flex items-center gap-1"
          >
            <CheckCircle size={12} /> Force Approve
          </button>
          <button 
            onClick={() => blockTrial(row.id)}
            className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition cursor-pointer flex items-center gap-1 shadow-sm"
          >
            <Ban size={12} /> Block Abuse
          </button>
        </div>
      ) : (
        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Locked</span>
      )
    )}
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
      <div className="bg-slate-900 rounded-3xl p-6 flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center text-white border border-slate-800 shadow-2xl">
        <div className="flex gap-4">
          <div className="w-12 h-12 bg-red-500/20 text-red-400 rounded-2xl flex items-center justify-center shrink-0 border border-red-500/20">
            <ShieldAlert size={24} />
          </div>
          <div>
            <h3 className="text-base font-black tracking-tight">Global Anti-Abuse System Active</h3>
            <p className="text-sm text-slate-400 mt-1 font-medium max-w-xl leading-relaxed">
              Super Admins must monitor cross-vendor trial abuse. The platform strictly enforces a <b>1 trial per mobile number and pet</b> rule across the ENTIRE portal. Saturday delivery is locked globally.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[400px]">
        <DataTable
          columns={columns}
          data={globalTrials}
          searchKey="user"
          searchPlaceholder="Search global trials by user..."
          filterKey="status"
          filterOptions={['Pending', 'Approved', 'Blocked']}
        />
      </div>
    </div>
  );
}
