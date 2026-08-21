import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Scissors, Home, Star, MapPin, Search, Loader2, AlertCircle } from 'lucide-react';
import {
  fetchAdminGroomingDaycare,
  updateAdminGroomingService,
  fetchAdminGroomingFacilities,
} from '../../../../../services/admin';

/**
 * Admin console for the grooming and daycare verticals.
 *
 * Everything on this screen is the live catalogue: the service tables list real
 * `ServiceOffering` rows created by the salons themselves, and the facilities
 * table lists real `Provider` records with their month-to-date volume. It used
 * to read free-form `admin_config` rows next to four hard-coded counters, so it
 * showed neither the salons that existed nor what they were selling — and the
 * "Add Facility" / "Add Service Type" forms only closed themselves.
 *
 * Salons and their menus are owned by the vendors; admin's job here is
 * oversight and taking an offering off the platform, which is what the status
 * toggle does.
 */
export function GroomingDayCare() {
  const [toastMessage, setToastMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('grooming');

  const [services, setServices] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [facilitySearch, setFacilitySearch] = useState('');

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [rows, overview] = await Promise.all([
        fetchAdminGroomingDaycare(),
        fetchAdminGroomingFacilities(),
      ]);
      setServices(rows || []);
      setFacilities(overview?.facilities || []);
      setStats(overview?.stats || null);
    } catch (e) {
      setError(e?.message || 'Could not load grooming & day care data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const groomingRows = useMemo(() => services.filter((s) => s.type === 'grooming'), [services]);
  const daycareRows = useMemo(() => services.filter((s) => s.type === 'daycare'), [services]);

  const visibleFacilities = useMemo(() => {
    const q = facilitySearch.trim().toLowerCase();
    if (!q) return facilities;
    return facilities.filter((f) => `${f.name} ${f.city}`.toLowerCase().includes(q));
  }, [facilities, facilitySearch]);

  const toggleStatus = async (row) => {
    const nextStatus = row.status === 'Active' ? 'Inactive' : 'Active';
    setServices((list) => list.map((x) => (x.id === row.id ? { ...x, status: nextStatus } : x)));
    try {
      await updateAdminGroomingService(row.id, { status: nextStatus });
      showToast(`${row.name} is now ${nextStatus.toLowerCase()}`);
    } catch (e) {
      showToast(e?.message || 'Could not update this service', 'error');
      load();
    }
  };

  const statCards = [
    { label: 'Active Facilities', value: stats ? `${stats.activeFacilities}` : '—', sub: stats ? `of ${stats.totalFacilities} partners` : '' },
    { label: 'Grooming Bookings MTD', value: stats ? stats.groomingBookingsMtd.toLocaleString('en-IN') : '—' },
    { label: 'Day Care Days MTD', value: stats ? stats.daycareDaysMtd.toLocaleString('en-IN') : '—' },
    { label: 'Avg Rating', value: stats ? stats.avgRating || '—' : '—', star: true },
  ];

  return (
    <div className="p-3 sm:p-6 max-w-[1400px] mx-auto bg-[#FAF7F2] min-h-screen pb-20 relative">

      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 animate-slide-in-right">
          <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200 flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              toastMessage.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
            }`}>
              {toastMessage.type === 'error' ? <AlertCircle size={14} /> : <Check size={14} />}
            </div>
            <p className="text-[13px] font-bold text-gray-800">{toastMessage.text}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">Grooming &amp; Day Care</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            Live catalogue across every partner salon and centre. Salons manage their own menus; use the toggle
            to pull an offering off the platform.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="px-4 py-2 border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 text-[13px] font-semibold rounded-lg transition shadow-sm disabled:opacity-50 shrink-0"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-[13px] font-semibold text-red-700 flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm">
            <h3 className="text-[13px] text-gray-500 mb-1">{s.label}</h3>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-semibold text-gray-900">{s.value}</p>
              {s.star && <Star size={20} className="text-amber-400 fill-amber-400" />}
            </div>
            {s.sub && <p className="text-[11px] text-gray-400 mt-0.5">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Service Types Section */}
      <div className="bg-white rounded-xl shadow-sm border border-[#FAF7F2] overflow-hidden mb-8">
        <div className="border-b border-gray-200 flex items-center px-4">
          <button
            onClick={() => setActiveTab('grooming')}
            className={`flex items-center gap-2 px-6 py-4 text-[14px] font-semibold transition border-b-2 ${
              activeTab === 'grooming' ? 'border-[#66B4B1] text-[#66B4B1]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Scissors size={18} /> Grooming Services ({groomingRows.length})
          </button>
          <button
            onClick={() => setActiveTab('daycare')}
            className={`flex items-center gap-2 px-6 py-4 text-[14px] font-semibold transition border-b-2 ${
              activeTab === 'daycare' ? 'border-[#66B4B1] text-[#66B4B1]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Home size={18} /> Day Care / Boarding ({daycareRows.length})
          </button>
        </div>

        <ServiceTable
          rows={activeTab === 'grooming' ? groomingRows : daycareRows}
          loading={loading}
          onToggle={toggleStatus}
          emptyText={
            activeTab === 'grooming'
              ? 'No grooming packages or add-ons published by any salon yet.'
              : 'No daycare plans published by any centre yet.'
          }
        />
      </div>

      {/* Facilities Table */}
      <div className="bg-white rounded-xl shadow-sm border border-[#FAF7F2] overflow-hidden flex flex-col">
        <div className="p-4 sm:p-5 border-b border-[#FAF7F2] flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
          <h3 className="text-[16px] font-semibold text-gray-900">Partner Facilities</h3>
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={facilitySearch}
              onChange={(e) => setFacilitySearch(e.target.value)}
              type="text"
              placeholder="Search by name or city…"
              className="w-full pl-9 pr-3 py-2 sm:py-1.5 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:border-[#66B4B1]"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px] whitespace-nowrap">
            <thead className="bg-[#FAF7F2] border-b border-[#FAF7F2]">
              <tr>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Facility Name</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Vertical</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">City</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Rating</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Live Services</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Active Bookings</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FAF7F2]">
              {loading && (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400">
                  <Loader2 size={20} className="animate-spin inline" />
                </td></tr>
              )}
              {!loading && !visibleFacilities.length && (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-[13px] text-gray-400">
                  {facilitySearch ? 'No facility matches that search.' : 'No grooming or daycare partners registered yet.'}
                </td></tr>
              )}
              {!loading && visibleFacilities.map((f) => (
                <tr key={f.id} className="hover:bg-[#FAF7F2] transition">
                  <td className="px-6 py-4 text-[13px] font-bold text-gray-900">{f.name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      f.type === 'grooming' ? 'bg-[#66B4B1]/10 text-[#40716F]' : 'bg-violet-50 text-violet-700'
                    }`}>
                      {f.type === 'grooming' ? 'Grooming' : 'Day Care'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <MapPin size={14} className="text-gray-400" />
                      <span className="text-[13px] font-medium">{f.city}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-gray-900">
                      <Star size={14} className="text-amber-400 fill-amber-400" />
                      <span className="text-[13px] font-semibold">{f.rating || '—'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[13px] font-medium text-gray-700">{f.services}</td>
                  <td className="px-6 py-4 text-[13px] font-semibold text-gray-900">{f.activeBookings}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      f.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {f.status === 'Active' ? 'Active' : f.approvalStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ServiceTable({ rows, loading, onToggle, emptyText }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[800px] whitespace-nowrap">
        <thead className="bg-[#FAF7F2] border-b border-[#FAF7F2]">
          <tr>
            <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Name</th>
            <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Kind</th>
            <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Facility</th>
            <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Price</th>
            <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Status</th>
            <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase text-right">Listed</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#FAF7F2]">
          {loading && (
            <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">
              <Loader2 size={20} className="animate-spin inline" />
            </td></tr>
          )}
          {!loading && !rows.length && (
            <tr><td colSpan={6} className="px-6 py-10 text-center text-[13px] text-gray-400">{emptyText}</td></tr>
          )}
          {!loading && rows.map((s) => (
            <tr key={s.id} className="hover:bg-[#FAF7F2] transition">
              <td className="px-6 py-4 text-[13px] font-bold text-gray-900">{s.name}</td>
              <td className="px-6 py-4 text-[13px] font-medium text-gray-700 capitalize">{(s.kind || '').replace('_', ' ')}</td>
              <td className="px-6 py-4 text-[13px] font-medium text-gray-700">{s.facilityName}</td>
              <td className="px-6 py-4 text-[13px] font-semibold text-gray-900">₹{s.price}</td>
              <td className="px-6 py-4">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                  s.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {s.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <div
                  onClick={() => onToggle(s)}
                  title={s.status === 'Active' ? 'Hide from customers' : 'Show to customers'}
                  className={`inline-block w-8 h-4 rounded-full relative cursor-pointer transition-colors ${
                    s.status === 'Active' ? 'bg-[#66B4B1]' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${
                    s.status === 'Active' ? 'right-0.5' : 'left-0.5'
                  }`} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default GroomingDayCare;
