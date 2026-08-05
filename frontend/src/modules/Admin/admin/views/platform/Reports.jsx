import React, { useState } from 'react';
import { Check, AlertCircle, Download, FileSpreadsheet, Loader } from 'lucide-react';
import {
  fetchAdminTaxReport, fetchVendorPerformance, fetchAdminUsers,
  fetchAdminBookings, fetchAdminAppointments, fetchMealPortalData,
} from '../../../../../services/admin';

/**
 * Platform reports.
 *
 * Every export below reads real collections through admin endpoints already
 * used elsewhere in this dashboard (tax report, vendor performance, users,
 * bookings, meal portal) and turns them into a CSV client-side — there is no
 * server-side report-generation job, so "recently generated" is this
 * session's exports only, not a persisted history.
 */

const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
function toCsv(rows, columns) {
  const header = columns.map((c) => c.label).join(',');
  const body = rows.map((r) => columns.map((c) => esc(typeof c.value === 'function' ? c.value(r) : r[c.key])).join(',')).join('\n');
  return `${header}\n${body}`;
}
function downloadCsv(filename, csv) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const REPORT_TYPES = [
  {
    id: 'fin',
    title: 'Financial & GST Report',
    desc: 'Real per-payment ledger: taxable value, GST and total for every paid transaction.',
    format: 'CSV',
    fetchRows: async () => (await fetchAdminTaxReport()).invoices,
    columns: [
      { key: 'id', label: 'Payment ID' }, { key: 'orderId', label: 'Order ID' },
      { key: 'customer', label: 'Customer' }, { key: 'purpose', label: 'Purpose' },
      { key: 'method', label: 'Method' }, { key: 'taxable', label: 'Taxable' },
      { key: 'gst', label: 'GST' }, { key: 'total', label: 'Total' },
      { label: 'Date', value: (r) => new Date(r.date).toLocaleString('en-IN') },
    ],
  },
  {
    id: 'ven',
    title: 'Vendor Performance',
    desc: 'Settled gross revenue, commission, net and order count per approved vendor.',
    format: 'CSV',
    fetchRows: async () => fetchVendorPerformance(),
    columns: [
      { key: 'name', label: 'Vendor' }, { key: 'type', label: 'Type' },
      { key: 'gross', label: 'Gross' }, { key: 'commission', label: 'Commission' },
      { key: 'net', label: 'Net' }, { key: 'orders', label: 'Orders' }, { key: 'rating', label: 'Rating' },
    ],
  },
  {
    id: 'cust',
    title: 'Customer Directory',
    desc: 'Registered pet owners: signup date, city, pet count and account status.',
    format: 'CSV',
    fetchRows: async () => fetchAdminUsers(),
    columns: [
      { key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' },
      { key: 'city', label: 'City' }, { key: 'joined', label: 'Joined' },
      { key: 'pets', label: 'Pets' }, { key: 'status', label: 'Status' }, { key: 'kyc', label: 'Phone Verified' },
    ],
  },
  {
    id: 'srv',
    title: 'Service Bookings Summary',
    desc: 'Daycare, grooming, event and memorial bookings across every vendor.',
    format: 'CSV',
    fetchRows: async () => fetchAdminBookings(),
    columns: [
      { key: 'id', label: 'Booking' }, { key: 'customerName', label: 'Customer' },
      { key: 'serviceType', label: 'Service' }, { key: 'vendorName', label: 'Vendor' },
      { key: 'date', label: 'Date' }, { key: 'amount', label: 'Amount' },
      { key: 'paymentStatus', label: 'Payment' }, { key: 'status', label: 'Status' },
    ],
  },
  {
    id: 'apt',
    title: 'Vet Appointments Summary',
    desc: 'Clinic and video consultations across every registered vet.',
    format: 'CSV',
    fetchRows: async () => fetchAdminAppointments(),
    columns: [
      { key: 'id', label: 'Appointment' }, { key: 'ownerName', label: 'Owner' },
      { key: 'doctorName', label: 'Doctor' }, { key: 'clinicName', label: 'Clinic' },
      { key: 'type', label: 'Type' }, { key: 'date', label: 'Date' }, { key: 'time', label: 'Time' },
    ],
  },
  {
    id: 'meal',
    title: 'Meal Subscriptions Board',
    desc: 'Active meal-plan subscriptions and their delivery/payment status.',
    format: 'CSV',
    fetchRows: async () => (await fetchMealPortalData()).globalSubscriptions,
    columns: [
      { key: 'id', label: 'Order' }, { key: 'user', label: 'Customer' }, { key: 'pet', label: 'Pet' },
      { key: 'plan', label: 'Plan' }, { key: 'vendor', label: 'Vendor' },
      { key: 'status', label: 'Status' }, { key: 'payment', label: 'Payment' },
    ],
  },
];

export function Reports() {
  const [toastMessage, setToastMessage] = useState(null);
  const [exportingId, setExportingId] = useState(null);
  const [recentReports, setRecentReports] = useState([]);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleExport = async (rep) => {
    setExportingId(rep.id);
    try {
      const rows = await rep.fetchRows();
      if (!rows || !rows.length) {
        showToast(`No data to export for ${rep.title} yet.`, 'error');
        return;
      }
      const csv = toCsv(rows, rep.columns);
      const filename = `${rep.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}.csv`;
      downloadCsv(filename, csv);
      setRecentReports((prev) => [
        { id: `${rep.id}-${Date.now()}`, name: rep.title, date: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }), rows: rows.length, filename },
        ...prev,
      ].slice(0, 10));
      showToast(`${rep.title} exported (${rows.length} rows).`);
    } catch (e) {
      showToast(e.message || `Could not export ${rep.title}`, 'error');
    } finally {
      setExportingId(null);
    }
  };

  return (
    <div className="p-3 sm:p-6 max-w-[1500px] mx-auto bg-[#FAF7F2] min-h-screen pb-20 relative">

      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 animate-slide-in-right">
          <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200 flex items-center gap-3 max-w-md">
             {toastMessage.type === 'success' ? (
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0"><Check size={14}/></div>
             ) : (
                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0"><AlertCircle size={14}/></div>
             )}
             <p className="text-[13px] font-bold text-gray-800">{toastMessage.text}</p>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">Platform Reports</h1>
        <p className="text-[13px] text-gray-500 mt-1">Export real platform data as CSV</p>
      </div>

      <h2 className="text-[13px] font-bold text-gray-900 uppercase tracking-wider mb-4">Export a Report</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
         {REPORT_TYPES.map((rep) => (
            <div key={rep.id} className="bg-white rounded-xl border border-[#FAF7F2] p-5 shadow-sm hover:border-[#66B4B1] hover:shadow-md transition duration-300 flex flex-col justify-between h-48">
               <div>
                  <div className="flex items-start justify-between">
                     <h3 className="text-[14px] font-bold text-gray-900">{rep.title}</h3>
                     <span className="text-[10px] bg-gray-100 text-gray-500 font-bold px-2 py-0.5 rounded font-mono">
                        {rep.format}
                     </span>
                  </div>
                  <p className="text-[12px] text-gray-500 leading-normal mt-2 line-clamp-3">{rep.desc}</p>
               </div>

               <button
                  onClick={() => handleExport(rep)}
                  disabled={exportingId !== null}
                  className="w-fit px-3.5 py-1.5 border border-[#66B4B1] text-[#66B4B1] hover:bg-[#66B4B1] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed text-[12px] font-bold rounded-lg transition inline-flex items-center gap-1.5 shadow-2xs mt-4"
               >
                  {exportingId === rep.id ? (
                     <><Loader size={14} className="animate-spin" /> Exporting...</>
                  ) : (
                     <><Download size={14} /> Export CSV</>
                  )}
               </button>
            </div>
         ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#FAF7F2] overflow-hidden flex flex-col">
         <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h2 className="text-[13px] font-bold text-gray-900 uppercase tracking-wider">Exported This Session</h2>
            <span className="text-[11px] text-gray-400">Not persisted — clears on reload</span>
         </div>

         <div className="overflow-x-auto">
            {recentReports.length ? (
            <table className="w-full text-left border-collapse min-w-[600px] whitespace-nowrap">
               <thead className="bg-[#FAF7F2] border-b border-[#FAF7F2]">
                  <tr>
                     <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Report Name</th>
                     <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Generated At</th>
                     <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Rows</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-[#FAF7F2]">
                  {recentReports.map((r) => (
                     <tr key={r.id} className="hover:bg-[#FAF7F2] transition">
                        <td className="px-4 py-4">
                           <div className="flex items-center gap-2">
                              <FileSpreadsheet size={16} className="text-gray-400" />
                              <span className="text-[13px] font-bold text-gray-800">{r.name}</span>
                           </div>
                        </td>
                        <td className="px-4 py-4 text-[12px] text-gray-600">{r.date}</td>
                        <td className="px-4 py-4 text-[13px] font-semibold text-gray-700">{r.rows}</td>
                     </tr>
                  ))}
               </tbody>
            </table>
            ) : (
               <div className="py-16 text-center text-[13px] text-gray-400">Export a report above to see it listed here.</div>
            )}
         </div>
      </div>

    </div>
  );
}
