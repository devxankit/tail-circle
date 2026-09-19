import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock, Check, X, MapPin, PawPrint, Calendar, IndianRupee, AlertTriangle, RefreshCw,
} from 'lucide-react';
import {
  fetchPendingBookingRequests, acceptBookingRequest, rejectBookingRequest,
} from '../../../services/providerVendor';
import { useVendorAlerts } from '../../../context/VendorAlertContext';

/**
 * Booking requests waiting on this partner's answer.
 *
 * The counterpart to the ringing alert: the alert interrupts, this is where the
 * partner actually decides. Both matter — a partner who dismisses the ring while
 * driving still needs the request sitting in front of them when they sit down.
 *
 * One component for every vertical. The API resolves ownership per vertical, so
 * grooming, daycare, clinics, events and memorials all render from the same
 * shape rather than five near-identical tables drifting apart.
 *
 * Renders nothing when there is nothing to answer, so it can be dropped at the
 * top of any dashboard without costing space on a normal day.
 */

const SERVICE_LABEL = {
  grooming: 'Grooming',
  daycare: 'Day care',
  doctor: 'Consultation',
  event: 'Event',
  memorial: 'Memorial',
};

export function PendingBookingRequests({ onChange, className = '' }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  /*
   * Optional: the alert provider is only mounted inside partner panels, and
   * this component may be previewed outside one. Falling back to a no-op keeps
   * it from throwing in that case.
   */
  let alerts = null;
  try {
    alerts = useVendorAlerts();
  } catch {
    alerts = null;
  }

  const load = useCallback(async () => {
    try {
      setRows(await fetchPendingBookingRequests());
      setError(null);
    } catch (err) {
      setError(err?.message || 'Could not load booking requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /*
   * Re-fetch when a ring arrives, so a request that lands while the partner is
   * looking at this screen appears without a refresh.
   */
  const alertCount = alerts?.alerts?.length ?? 0;
  useEffect(() => { if (alertCount > 0) load(); }, [alertCount, load]);

  const settle = async (row, fn, successVerb) => {
    setBusyId(row._id);
    try {
      await fn();
      setRows((cur) => cur.filter((r) => r._id !== row._id));
      // Silence the ring for this booking immediately rather than waiting for
      // the server's resolve event to come back round.
      alerts?.dismiss?.(`booking_request:${row._id}`);
      onChange?.({ bookingNo: row.bookingNo, action: successVerb });
    } catch (err) {
      setError(err?.message || `Could not ${successVerb} this booking`);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const onAccept = (row) => settle(row, () => acceptBookingRequest(row._id), 'accept');

  const onReject = (row) => {
    const reason = window.prompt(
      `Decline ${row.bookingNo}?\n\n${row.customerName} will be refunded in full, and declining is recorded on your service standing.\n\nReason (the customer is told):`
    );
    if (!reason || reason.trim().length < 3) return;
    settle(row, () => rejectBookingRequest(row._id, reason.trim()), 'decline');
  };

  if (loading || (!rows.length && !error)) return null;

  return (
    <div className={`mb-6 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#66B4B1]/15 text-[#66B4B1] flex items-center justify-center">
            <Clock size={15} />
          </div>
          <h2 className="text-[15px] font-bold text-gray-900">
            {rows.length} booking {rows.length === 1 ? 'request' : 'requests'} awaiting your answer
          </h2>
        </div>
        <button onClick={load} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" title="Refresh">
          <RefreshCw size={15} />
        </button>
      </div>

      {error && (
        <div className="mb-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle size={15} className="text-red-600 mt-0.5 shrink-0" />
          <p className="text-[12px] text-red-800">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r._id}
            className={`bg-white rounded-xl border-2 p-4 ${r.overdue ? 'border-red-300' : 'border-[#66B4B1]/40'}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[14px] font-bold text-gray-900">
                    {SERVICE_LABEL[r.type] || r.type}
                  </span>
                  <span className="text-[12px] text-gray-400 font-mono">{r.bookingNo}</span>
                  {r.visitType === 'home' && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700">
                      home visit
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-2 text-[13px] text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <PawPrint size={13} className="text-gray-400" />
                    {r.pet || '—'}{r.petBreed ? ` (${r.petBreed})` : ''} · {r.customerName}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-gray-400" />
                    {r.schedule?.startDate || 'date TBC'}{r.schedule?.time ? ` · ${r.schedule.time}` : ''}
                    {r.schedule?.durationDays ? ` · ${r.schedule.durationDays} days` : ''}
                  </span>
                  <span className="flex items-center gap-1.5 font-bold text-gray-800">
                    <IndianRupee size={13} className="text-gray-400" />
                    {r.amount.toLocaleString('en-IN')}
                  </span>
                </div>

                {r.address?.city && (
                  <p className="flex items-center gap-1.5 mt-1.5 text-[12px] text-gray-500">
                    <MapPin size={12} className="text-gray-400" />
                    {[r.address.line1, r.address.city].filter(Boolean).join(', ')}
                  </p>
                )}

                {r.items?.length > 0 && (
                  <p className="text-[12px] text-gray-500 mt-1.5">
                    {r.items.map((i) => i.name).join(' · ')}
                  </p>
                )}

                <Deadline respondBy={r.respondBy} overdue={r.overdue} />
              </div>

              <div className="flex gap-2 shrink-0">
                <button onClick={() => onAccept(r)} disabled={busyId === r._id}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-[#66B4B1] hover:opacity-90 disabled:opacity-50 text-white rounded-lg text-[13px] font-bold">
                  <Check size={15} /> Accept
                </button>
                <button onClick={() => onReject(r)} disabled={busyId === r._id}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-700 rounded-lg text-[13px] font-bold">
                  <X size={15} /> Decline
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/*
        Stated plainly rather than buried. A partner declining should know the
        cost before they click, not discover it on their standing afterwards.
      */}
      <p className="text-[11px] text-gray-400 mt-2.5">
        Requests you do not answer in time are declined automatically, the customer is refunded,
        and it counts against your service standing.
      </p>
    </div>
  );
}

/** Live countdown to the response deadline. */
function Deadline({ respondBy, overdue }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!respondBy) return null;
  const left = new Date(respondBy) - now;

  if (overdue || left <= 0) {
    return (
      <p className="flex items-center gap-1.5 mt-2 text-[12px] font-bold text-red-600">
        <AlertTriangle size={13} /> Overdue — this will be auto-declined
      </p>
    );
  }

  const hrs = Math.floor(left / 3_600_000);
  const mins = Math.floor((left % 3_600_000) / 60_000);
  const secs = Math.floor((left % 60_000) / 1000);
  const urgent = left < 15 * 60_000;

  return (
    <p className={`flex items-center gap-1.5 mt-2 text-[12px] font-bold ${urgent ? 'text-red-600' : 'text-amber-600'}`}>
      <Clock size={13} />
      {hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m ${secs}s`} left to respond
    </p>
  );
}

export default PendingBookingRequests;
