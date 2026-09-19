import React, { useEffect, useState } from 'react';
import {
  Clock, Search, Eye, ShoppingCart, CheckCircle2, Monitor, ShieldOff, ShieldCheck,
} from 'lucide-react';
import { fetchCustomerActivity } from '../../../../services/admin';

/**
 * One customer's journey through the app, grouped by visit.
 *
 * Grouped rather than a flat event list because a flat run of 400 rows does not
 * answer the question an operator actually has — "what was this person trying
 * to do, and where did it go wrong?" The shape of a single visit does.
 *
 * Renders an explicit "not tracked" state when the customer declined cookies.
 * Showing an empty panel would read as "this customer does nothing", which is a
 * very different — and wrong — conclusion.
 */

const ICONS = {
  screen_view: Monitor,
  search: Search,
  item_view: Eye,
  add_to_cart: ShoppingCart,
  checkout_start: ShoppingCart,
  booking: CheckCircle2,
  order: CheckCircle2,
  abandon: Clock,
};

const TONE = {
  booking: 'text-emerald-600 bg-emerald-50',
  order: 'text-emerald-600 bg-emerald-50',
  search: 'text-blue-600 bg-blue-50',
  item_view: 'text-purple-600 bg-purple-50',
  add_to_cart: 'text-amber-600 bg-amber-50',
  checkout_start: 'text-amber-600 bg-amber-50',
};

const ms = (v) => {
  const n = Number(v) || 0;
  if (n < 1000) return '<1s';
  const s = Math.round(n / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};

function describe(e) {
  switch (e.type) {
    case 'search': return `Searched for "${e.query}"`;
    case 'item_view': return `Viewed ${e.refName || e.refType || 'an item'}`;
    case 'add_to_cart': return `Added ${e.refName || 'an item'} to cart`;
    case 'checkout_start': return 'Started checkout';
    case 'booking': return 'Completed a booking';
    case 'order': return 'Placed an order';
    default: return e.screen || e.path || 'Opened a screen';
  }
}

export function CustomerActivityPanel({ userId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return undefined;
    let alive = true;
    setLoading(true);
    fetchCustomerActivity(userId, { limit: 10 })
      .then((d) => { if (alive) { setData(d); setError(null); } })
      .catch((err) => { if (alive) setError(err?.message || 'Could not load activity'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [userId]);

  if (loading) return <p className="text-[12px] text-gray-500 p-3">Loading activity…</p>;
  if (error) return <p className="text-[12px] text-red-600 p-3">{error}</p>;
  if (!data) return null;

  const declined = data.consent && data.consent.analytics === false;
  const neverAsked = !data.consent;

  if (!data.sessions.length) {
    return (
      <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
        <div className="flex items-start gap-2.5">
          <ShieldOff size={15} className="text-gray-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-[13px] font-bold text-gray-700">
              {declined
                ? 'This customer declined activity tracking'
                : neverAsked
                  ? 'No tracking decision recorded yet'
                  : 'No activity recorded'}
            </p>
            <p className="text-[12px] text-gray-500 mt-0.5">
              {declined
                ? 'Nothing about how they browse is collected. This is not a sign of inactivity - their bookings and orders are unaffected.'
                : neverAsked
                  ? 'They have not yet been shown the cookie banner, or answered it on another device.'
                  : 'They consented but have not browsed since.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Stat label="Visits" value={data.totals.sessions} />
        <Stat label="Total time" value={ms(data.totals.totalTimeMs)} />
        <Stat label="Screens" value={data.totals.screens} />
        <Stat label="Searches" value={data.totals.searches} />
        <Stat label="Booked" value={data.totals.conversions} tone="emerald" />
        {data.consent?.analytics && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-bold">
            <ShieldCheck size={12} /> Consented
          </span>
        )}
      </div>

      <div className="space-y-2">
        {data.sessions.map((s) => (
          <div key={s.sessionId} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[12px] font-bold text-gray-800">
                {new Date(s.startedAt).toLocaleString('en-IN')}
              </span>
              <div className="flex items-center gap-2 text-[11px] text-gray-500">
                <span>{ms(s.durationMs)}</span>
                {s.city && <span>· {s.city}</span>}
                {s.converted && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 font-bold">
                    {s.conversionType === 'order' ? 'Ordered' : 'Booked'}
                  </span>
                )}
              </div>
            </div>

            <div className="divide-y divide-gray-50">
              {s.events.map((e, i) => {
                const Icon = ICONS[e.type] || Monitor;
                return (
                  <div key={i} className="px-3 py-2 flex items-center gap-2.5">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                      TONE[e.type] || 'text-gray-500 bg-gray-100'}`}>
                      <Icon size={12} />
                    </div>
                    <span className="text-[12px] text-gray-700 flex-1 min-w-0 truncate">
                      {describe(e)}
                    </span>
                    {e.durationMs > 0 && (
                      <span className="text-[11px] text-gray-400 shrink-0">{ms(e.durationMs)}</span>
                    )}
                  </div>
                );
              })}
              {s.events.length === 0 && (
                <p className="px-3 py-2 text-[12px] text-gray-400">No detail recorded for this visit.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }) {
  return (
    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
      tone === 'emerald' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
      {label}: {value}
    </span>
  );
}

export default CustomerActivityPanel;
