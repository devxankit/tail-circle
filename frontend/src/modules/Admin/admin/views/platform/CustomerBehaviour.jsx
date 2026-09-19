import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Eye, Filter, MapPin, TrendingDown, Users, Clock, RefreshCw,
  AlertTriangle, ShieldCheck, MousePointerClick,
} from 'lucide-react';
import {
  fetchBehaviourSummary, fetchTopSearches, fetchTopViewed, fetchScreenEngagement,
  fetchConversionFunnel, fetchBrowsingLocations, fetchAbandonedInterest,
} from '../../../../../services/admin';

/**
 * Customer behaviour insights.
 *
 * Answers the questions the platform previously could not: what are people
 * searching for, where do they spend their time, what do they look at without
 * booking, and where do they drop out of the funnel.
 *
 * Every figure here covers only customers who accepted analytics cookies, so
 * the opt-in rate is shown at the top rather than buried. A conversion rate
 * drawn from 30% of traffic means something different from one drawn from 95%,
 * and an operator reading these numbers has to know which they are looking at.
 */

const TABS = [
  { key: 'funnel', label: 'Funnel', icon: TrendingDown },
  { key: 'searches', label: 'Searches', icon: Search },
  { key: 'viewed', label: 'Most viewed', icon: Eye },
  { key: 'abandoned', label: 'Viewed, not booked', icon: MousePointerClick },
  { key: 'screens', label: 'Time on screens', icon: Clock },
  { key: 'locations', label: 'Locations', icon: MapPin },
];

const ms = (v) => {
  const n = Number(v) || 0;
  if (n < 1000) return '0s';
  const s = Math.round(n / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};

export function CustomerBehaviour() {
  const [tab, setTab] = useState('funnel');
  const [summary, setSummary] = useState(null);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, funnel, searches, viewed, abandoned, screens, locations] = await Promise.all([
        fetchBehaviourSummary(),
        fetchConversionFunnel(),
        fetchTopSearches({ limit: 25 }),
        fetchTopViewed({ limit: 25 }),
        fetchAbandonedInterest({ limit: 25 }),
        fetchScreenEngagement({ limit: 25 }),
        fetchBrowsingLocations(),
      ]);
      setSummary(s);
      setData({ funnel, searches, viewed, abandoned, screens, locations });
      setError(null);
    } catch (err) {
      setError(err?.message || 'Could not load behaviour data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const noData = summary && summary.sessions === 0;

  return (
    <div className="p-3 sm:p-6 max-w-[1500px] mx-auto bg-[#FAF7F2] min-h-screen pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">Customer Behaviour</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            What customers search for, where they spend time, and where they drop off
          </p>
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

      {summary && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
            <Tile label="Visits" value={summary.sessions.toLocaleString('en-IN')} icon={Users} tone="teal" />
            <Tile label="Unique visitors" value={summary.visitors.toLocaleString('en-IN')} icon={Users} tone="blue" />
            <Tile label="Converted visits" value={summary.convertedSessions.toLocaleString('en-IN')}
              sub={`${summary.conversionRate}% of visits`} icon={TrendingDown} tone="emerald" />
            <Tile label="Avg visit length" value={ms(summary.avgSessionMs)} icon={Clock} tone="amber" />
            <Tile label="Screens per visit" value={summary.avgScreensPerSession} icon={Eye} tone="purple" />
          </div>

          {/*
            Stated plainly. These numbers describe consenting customers only,
            and reading them as "all customers" would be wrong.
          */}
          <div className="mb-6 flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <ShieldCheck size={15} className="text-blue-600 mt-0.5 shrink-0" />
            <p className="text-[12px] text-blue-800">
              <b>{summary.consent.granted}</b> of <b>{summary.consent.asked}</b> visitors
              ({summary.consent.grantRate}%) accepted analytics cookies. Everything below covers
              only those customers — {summary.consent.declined} declined and are not tracked at all.
            </p>
          </div>
        </>
      )}

      <div className="flex gap-1 mb-5 bg-white p-1 rounded-xl border border-gray-200 w-fit flex-wrap">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-3.5 py-2 text-[13px] font-semibold rounded-lg transition ${
              tab === key ? 'bg-[#66B4B1] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {loading && <p className="text-[13px] text-gray-500">Loading…</p>}

      {!loading && noData && (
        <Empty
          title="No activity recorded yet"
          body="Customers are tracked only after they accept analytics cookies. Once they start browsing, their searches, screens and drop-off points appear here."
        />
      )}

      {!loading && !noData && (
        <>
          {tab === 'funnel' && <Funnel funnel={data.funnel} />}

          {tab === 'searches' && (
            <Table
              empty="No searches recorded yet."
              rows={data.searches}
              cols={[
                ['What they searched for', (r) => <b className="text-gray-900">{r.query}</b>],
                ['Searches', (r) => r.searches],
                ['People', (r) => r.people],
                ['Avg results', (r) => (
                  r.avgResults === null ? '—'
                    : <span className={r.avgResults < 1 ? 'text-red-600 font-bold' : ''}>{r.avgResults}</span>
                )],
              ]}
              note="A common search returning close to zero results is a gap in the catalogue — demand you are not serving."
            />
          )}

          {tab === 'viewed' && (
            <Table
              empty="No item views recorded yet."
              rows={data.viewed}
              cols={[
                ['Service / product', (r) => <b className="text-gray-900">{r.name}</b>],
                ['Type', (r) => <span className="capitalize text-gray-500">{r.refType || '—'}</span>],
                ['Category', (r) => r.category],
                ['Views', (r) => r.views],
                ['People', (r) => r.people],
                ['Avg time', (r) => ms(r.avgTimeMs)],
              ]}
            />
          )}

          {tab === 'abandoned' && (
            <Table
              empty="Nothing abandoned yet."
              rows={data.abandoned}
              cols={[
                ['Service / product', (r) => <b className="text-gray-900">{r.name}</b>],
                ['Views', (r) => r.views],
                ['Visits', (r) => r.sessions],
                ['Visits that booked', (r) => r.sessionsThatBooked],
                ['Abandon rate', (r) => (
                  <span className={r.abandonRate > 80 ? 'text-red-600 font-bold' : 'text-amber-600 font-bold'}>
                    {r.abandonRate}%
                  </span>
                )],
              ]}
              note="High views with almost no bookings usually means price, availability or the listing itself — worth a look before spending on more traffic."
            />
          )}

          {tab === 'screens' && (
            <Table
              empty="No screen views recorded yet."
              rows={data.screens}
              cols={[
                ['Screen', (r) => <b className="text-gray-900">{r.screen}</b>],
                ['Path', (r) => <span className="text-gray-400 font-mono text-[11px]">{r.path}</span>],
                ['Views', (r) => r.views],
                ['People', (r) => r.people],
                ['Avg time', (r) => ms(r.avgTimeMs)],
                ['Total time', (r) => ms(r.totalTimeMs)],
              ]}
            />
          )}

          {tab === 'locations' && (
            <Table
              empty="No location data yet."
              rows={data.locations}
              cols={[
                ['City', (r) => <b className="text-gray-900">{r.city}</b>],
                ['Visits', (r) => r.sessions],
                ['People', (r) => r.people],
                ['Booked', (r) => r.converted],
                ['Conversion', (r) => `${r.conversionRate}%`],
                ['Avg visit', (r) => ms(r.avgTimeMs)],
              ]}
              note="Cities with traffic but low conversion are usually a supply problem — people are looking, but there is nobody nearby to book."
            />
          )}
        </>
      )}
    </div>
  );
}

/* ── funnel ─────────────────────────────────────────────────────────── */

function Funnel({ funnel }) {
  if (!funnel?.stages?.length) return <Empty title="No funnel data yet" body="" />;
  const top = funnel.stages[0].sessions || 1;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-[15px] font-bold text-gray-900">Browse to booking</h2>
          <span className="text-[13px] text-gray-500">
            Overall conversion <b className="text-gray-900">{funnel.overallConversion}%</b>
          </span>
        </div>

        <div className="space-y-3">
          {funnel.stages.map((s, i) => (
            <div key={s.stage}>
              <div className="flex items-center justify-between text-[12px] mb-1">
                <span className="font-bold text-gray-800">{s.stage}</span>
                <span className="text-gray-500">
                  {s.sessions.toLocaleString('en-IN')} visits
                  {i > 0 && <span className="ml-2 text-gray-400">{s.ofPrevious}% of previous step</span>}
                </span>
              </div>
              <div className="h-7 rounded-lg bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-lg bg-[#66B4B1] transition-all flex items-center px-2"
                  style={{ width: `${Math.max(2, (s.sessions / top) * 100)}%` }}
                >
                  <span className="text-[11px] font-bold text-white">{s.ofTotal}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {funnel.biggestDropOff && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <TrendingDown size={18} />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-gray-900">Biggest drop-off</h3>
              <p className="text-[13px] text-gray-600 mt-1">
                <b>{funnel.biggestDropOff.lost.toLocaleString('en-IN')}</b> visits are lost between{' '}
                <b>{funnel.biggestDropOff.from}</b> and <b>{funnel.biggestDropOff.to}</b>.
                That is the single step to fix first.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── shared bits ────────────────────────────────────────────────────── */

const TONE = {
  teal: 'bg-[#66B4B1]/15 text-[#66B4B1]', blue: 'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600',
  purple: 'bg-purple-50 text-purple-600',
};

function Tile({ label, value, sub, icon: Icon, tone }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-gray-500 font-medium">{label}</p>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${TONE[tone]}`}><Icon size={14} /></div>
      </div>
      <p className="text-[22px] font-bold text-gray-900 mt-1.5">{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function Table({ rows = [], cols, empty, note }) {
  if (!rows.length) return <Empty title={empty} body="" />;
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                {cols.map(([h]) => (
                  <th key={h} className="text-left px-4 py-3 font-bold text-[12px] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-gray-100 hover:bg-gray-50/60">
                  {cols.map(([h, render]) => (
                    <td key={h} className="px-4 py-3 text-gray-600">{render(r)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {note && (
        <div className="flex items-start gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <Filter size={14} className="text-gray-500 mt-0.5 shrink-0" />
          <p className="text-[12px] text-gray-600">{note}</p>
        </div>
      )}
    </div>
  );
}

function Empty({ title, body }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center mx-auto mb-3">
        <Eye size={20} />
      </div>
      <p className="text-[14px] font-bold text-gray-800">{title}</p>
      {body && <p className="text-[13px] text-gray-500 mt-1 max-w-md mx-auto">{body}</p>}
    </div>
  );
}

export default CustomerBehaviour;
