import React, { useState, useEffect, useCallback } from 'react';
import {
  Siren, Timer, PackageX, CopyX, UserX, RefreshCw, AlertTriangle, Check,
} from 'lucide-react';
import {
  fetchEmergencyQueue, fetchResponseTimes, fetchLowStock,
  fetchDuplicateBookings, fetchOrphanedBookings,
} from '../../../../../services/admin';

/**
 * Operational queues — the things that need a human today.
 *
 * Five separate questions the platform could previously only answer by someone
 * happening to notice: which emergencies are live, which partners answer
 * slowly, what is about to sell out, who has been charged twice, and which
 * customers are stranded behind a suspended partner.
 *
 * Grouped onto one screen rather than five, because they share an audience and
 * a rhythm: an operator works this list once or twice a day, and five separate
 * nav entries would mean four of them never get opened.
 */

const TABS = [
  { key: 'emergencies', label: 'Emergencies', icon: Siren },
  { key: 'orphaned', label: 'Stranded customers', icon: UserX },
  { key: 'duplicates', label: 'Duplicate bookings', icon: CopyX },
  { key: 'response', label: 'Partner response times', icon: Timer },
  { key: 'stock', label: 'Low stock', icon: PackageX },
];

export function OpsQueues() {
  const [tab, setTab] = useState('emergencies');
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [emergencies, orphaned, duplicates, response, stock] = await Promise.all([
        fetchEmergencyQueue(),
        fetchOrphanedBookings(),
        fetchDuplicateBookings(),
        fetchResponseTimes({ days: 30 }),
        fetchLowStock({ threshold: 5 }),
      ]);
      setData({ emergencies, orphaned, duplicates, response, stock });
      setError(null);
    } catch (err) {
      setError(err?.message || 'Could not load the queues');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = {
    emergencies: (data.emergencies || []).filter((e) => e.critical).length,
    orphaned: (data.orphaned || []).length,
    duplicates: (data.duplicates || []).length,
    response: (data.response || []).filter((r) => r.responseRate < 80).length,
    stock: (data.stock || []).filter((s) => s.outOfStock).length,
  };

  return (
    <div className="p-3 sm:p-6 max-w-[1500px] mx-auto bg-[#FAF7F2] min-h-screen pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">Operational Queues</h1>
          <p className="text-[13px] text-gray-500 mt-1">Problems worth a human today, before a customer finds them</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#66B4B1] hover:opacity-90 disabled:opacity-50 text-white text-[13px] font-semibold rounded-lg shadow-sm">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle size={15} className="text-red-600 mt-0.5 shrink-0" />
          <p className="text-[12px] text-red-800">{error}</p>
        </div>
      )}

      <div className="flex gap-1 mb-5 bg-white p-1 rounded-xl border border-gray-200 w-fit flex-wrap">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-3.5 py-2 text-[13px] font-semibold rounded-lg transition ${
              tab === key ? 'bg-[#66B4B1] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Icon size={15} /> {label}
            {counts[key] > 0 && (
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                tab === key ? 'bg-white/25 text-white' : 'bg-red-100 text-red-700'}`}>
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && <p className="text-[13px] text-gray-500">Loading…</p>}

      {!loading && tab === 'emergencies' && (
        <Table
          rows={data.emergencies}
          empty="No live emergency requests."
          rowClass={(r) => (r.critical ? 'bg-red-50/60' : '')}
          cols={[
            ['Booking', (r) => <b className="text-gray-900">{r.bookingNo}</b>],
            ['Customer', (r) => <>{r.customerName}<br /><span className="text-[11px] text-gray-400">{r.customerPhone}</span></>],
            ['Pet', (r) => `${r.pet}${r.petBreed ? ` (${r.petBreed})` : ''}`],
            ['Issue', (r) => r.issue],
            ['Vet', (r) => r.doctorName],
            ['Waiting', (r) => (
              <span className={r.critical ? 'text-red-600 font-bold' : ''}>{r.waitingMinutes}m</span>
            )],
            ['Status', (r) => <Badge text={r.status} tone={r.critical ? 'red' : 'gray'} />],
          ]}
          note="An emergency unanswered for more than 15 minutes is highlighted — that one needs a phone call, not a click."
        />
      )}

      {!loading && tab === 'orphaned' && (
        <Table
          rows={data.orphaned}
          empty="No customers stranded by a suspension."
          rowClass={(r) => (r.overdue ? 'bg-red-50/60' : '')}
          cols={[
            ['Booking', (r) => <b className="text-gray-900">{r.bookingNo}</b>],
            ['Customer', (r) => <>{r.customerName}<br /><span className="text-[11px] text-gray-400">{r.customerPhone}</span></>],
            ['Suspended partner', (r) => <>{r.businessName}<br /><span className="text-[11px] text-gray-400 capitalize">{r.vendorType}</span></>],
            ['Service date', (r) => (
              <span className={r.overdue ? 'text-red-600 font-bold' : ''}>
                {r.scheduledFor || '—'}{r.time ? ` · ${r.time}` : ''}
              </span>
            )],
            ['Paid', (r) => `₹${r.amount.toLocaleString('en-IN')}`],
            ['Status', (r) => <Badge text={r.status} tone="amber" />],
          ]}
          note="These customers have paid for a service the partner can no longer deliver. Reassign or cancel and refund from the booking screen."
        />
      )}

      {!loading && tab === 'duplicates' && (
        <div className="space-y-3">
          {(data.duplicates || []).length === 0 ? (
            <Empty title="No duplicate bookings detected" />
          ) : (
            (data.duplicates || []).map((g, i) => (
              <div key={i} className="bg-white rounded-xl border border-amber-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[14px] font-bold text-gray-900">
                      {g.customerName} · {g.count} bookings {g.minutesApart} minutes apart
                    </p>
                    <p className="text-[12px] text-gray-500 mt-0.5">
                      {g.customerPhone} · {g.type} · {g.scheduledFor || 'no date'}{g.time ? ` ${g.time}` : ''}
                    </p>
                  </div>
                  <span className="text-[13px] font-bold text-amber-700">
                    ₹{g.totalCharged.toLocaleString('en-IN')} charged
                  </span>
                </div>
                <div className="mt-3 space-y-1.5">
                  {g.bookings.map((b) => (
                    <div key={b._id} className="flex items-center justify-between text-[12px] px-3 py-2 rounded-lg bg-gray-50">
                      <span className="font-bold text-gray-800">{b.bookingNo}</span>
                      <span className="text-gray-500">{b.pet}</span>
                      <span className="text-gray-500 capitalize">{b.status}</span>
                      <span className="text-gray-700 font-bold">₹{b.amount.toLocaleString('en-IN')}</span>
                      <span className="text-gray-400">{new Date(b.createdAt).toLocaleTimeString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
          <Note text="Usually a double submit or an impatient retry — the customer has been charged twice for one intention. Bookings for different pets in the same slot are excluded, since those are genuine." />
        </div>
      )}

      {!loading && tab === 'response' && (
        <Table
          rows={data.response}
          empty="No booking requests answered in the last 30 days."
          rowClass={(r) => (r.responseRate < 80 ? 'bg-amber-50/60' : '')}
          cols={[
            ['Partner', (r) => <>{<b className="text-gray-900">{r.businessName}</b>}<br /><span className="text-[11px] text-gray-400">{r.category}</span></>],
            ['Requests', (r) => r.requests],
            ['Answered', (r) => r.answered],
            ['Expired', (r) => (
              <span className={r.expired > 0 ? 'text-red-600 font-bold' : 'text-gray-400'}>{r.expired}</span>
            )],
            ['Response rate', (r) => (
              <span className={r.responseRate < 80 ? 'text-amber-700 font-bold' : 'text-emerald-700 font-bold'}>
                {r.responseRate}%
              </span>
            )],
            ['Median reply', (r) => (r.medianMinutes == null ? '—' : `${r.medianMinutes}m`)],
            ['Accept rate', (r) => `${r.acceptRate}%`],
          ]}
          note="Sorted worst first. A partner whose response rate is slipping is one bad week from auto-declines and refunds — worth a conversation before that happens."
        />
      )}

      {!loading && tab === 'stock' && (
        <Table
          rows={data.stock}
          empty="Nothing running low."
          rowClass={(r) => (r.outOfStock ? 'bg-red-50/60' : '')}
          cols={[
            ['Product', (r) => <b className="text-gray-900">{r.name}</b>],
            ['Size', (r) => r.size],
            ['Seller', (r) => r.vendorName],
            ['Category', (r) => r.category],
            ['Stock', (r) => (
              <span className={r.outOfStock ? 'text-red-600 font-bold' : 'text-amber-700 font-bold'}>
                {r.outOfStock ? 'Out of stock' : r.stock}
              </span>
            )],
            ['Price', (r) => `₹${Number(r.price || 0).toLocaleString('en-IN')}`],
          ]}
          note="Out-of-stock lines are still listed to customers and will be refused at checkout. Chase the seller or deactivate the listing."
        />
      )}
    </div>
  );
}

/* ── shared ─────────────────────────────────────────────────────────── */

function Table({ rows = [], cols, empty, note, rowClass }) {
  if (!rows.length) return <Empty title={empty} />;
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                {cols.map(([h]) => (
                  <th key={h} className="text-left px-4 py-3 font-bold text-[12px] uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className={`border-t border-gray-100 hover:bg-gray-50/60 align-top ${rowClass ? rowClass(r) : ''}`}>
                  {cols.map(([h, render]) => (
                    <td key={h} className="px-4 py-3 text-gray-600">{render(r)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {note && <Note text={note} />}
    </div>
  );
}

const Note = ({ text }) => (
  <div className="flex items-start gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
    <AlertTriangle size={14} className="text-gray-500 mt-0.5 shrink-0" />
    <p className="text-[12px] text-gray-600">{text}</p>
  </div>
);

const Badge = ({ text, tone }) => (
  <span className={`px-2 py-1 rounded-md text-[11px] font-bold capitalize whitespace-nowrap ${
    tone === 'red' ? 'bg-red-100 text-red-700'
      : tone === 'amber' ? 'bg-amber-100 text-amber-700'
        : 'bg-gray-100 text-gray-700'}`}>
    {String(text).replace(/_/g, ' ')}
  </span>
);

function Empty({ title }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
        <Check size={20} />
      </div>
      <p className="text-[14px] font-bold text-gray-800">{title}</p>
    </div>
  );
}

export default OpsQueues;
