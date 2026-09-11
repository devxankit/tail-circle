import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, Check, Edit2, Percent, Loader2, AlertCircle, RotateCcw, Layers,
  Building2, Globe, Info, RefreshCw, ShieldAlert, CalendarClock, Trash2, X, Receipt,
} from 'lucide-react';
import {
  fetchCommissionMatrix,
  setCategoryCommission,
  setVendorCommission,
  setCommissionBounds,
  setTaxPercent,
  scheduleCommissionChange,
  cancelCommissionSchedule,
} from '../../../../../services/admin';

/**
 * Commission Structure — the rate every settlement is billed at.
 *
 * Three levels, most specific first: a vendor's own override, then its
 * category default, then the global default. A vendor with no override
 * inherits, which is the normal state, so changing a category rate reaches
 * every vendor in it that has not been singled out.
 *
 * Everything on this screen is a percentage. The server stores fractions and
 * converts at the edge; nothing here should ever do that arithmetic itself.
 */

const SOURCE_LABEL = {
  vendor: 'Own rate',
  category: 'From category',
  global: 'From global default',
  floor: 'Built-in fallback',
};

const SOURCE_STYLE = {
  vendor: 'bg-blue-50 text-blue-700 border-blue-200',
  category: 'bg-slate-100 text-slate-600 border-slate-200',
  global: 'bg-slate-100 text-slate-500 border-slate-200',
  floor: 'bg-amber-50 text-amber-700 border-amber-200',
};

const pct = (n) => (n === null || n === undefined ? '—' : `${Number(n) % 1 === 0 ? n : n.toFixed(2)}%`);

export function Commission() {
  const [matrix, setMatrix] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [toast, setToast] = useState(null);
  const [savingKey, setSavingKey] = useState(null);
  const [editing, setEditing] = useState(null); // { kind: 'category'|'vendor', id, value }
  const [vendorSearch, setVendorSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  // A rate change that needs a second look before it is sent.
  const [confirming, setConfirming] = useState(null);
  const [scheduling, setScheduling] = useState(null);
  const [limitsDraft, setLimitsDraft] = useState(null);

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3200);
  };

  /*
   * Refetches are driven by a key rather than by calling a loader directly, so
   * the effect never sets state synchronously in its own body. A save bumps
   * the key and the table updates in place -- deliberately without a spinner,
   * because flashing the whole page after every rate edit reads as a failure.
   */
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    fetchCommissionMatrix()
      .then((data) => {
        if (cancelled) return;
        setMatrix(data);
        setLoadError(null);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || 'Could not reach the server.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [reloadKey]);

  /*
   * A save reloads the whole matrix rather than patching one row in place.
   *
   * Changing a category rate silently changes the effective rate of every
   * vendor inheriting it, so the rest of the table is stale the moment one
   * cell is written. Refetching is the only way the screen stays honest about
   * what each vendor will actually be billed.
   */
  const commitCategory = async (vendorType, percent, allowZero = false) => {
    setSavingKey(`category:${vendorType}`);
    try {
      await setCategoryCommission(vendorType, percent, allowZero);
      showToast(`${vendorType === 'default' ? 'Global default' : vendorType} set to ${percent}%`);
      setEditing(null);
      reload();
    } catch (err) {
      showToast(err?.message || 'Could not save that rate', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  const commitVendor = async (profileId, percent, name, allowZero = false) => {
    setSavingKey(`vendor:${profileId}`);
    try {
      await setVendorCommission(profileId, percent, allowZero);
      showToast(
        percent === null
          ? `${name} now inherits its category rate`
          : `${name} set to ${percent}%`
      );
      setEditing(null);
      reload();
    } catch (err) {
      showToast(err?.message || 'Could not save that rate', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  /**
   * What makes a change worth a second look.
   *
   * A rate cut is the expensive direction, and zero is the expensive value, so
   * both get an explicit confirmation naming the old and new numbers. The
   * server enforces the limits regardless; this only catches the slip early,
   * while the operator still has the context to notice it.
   */
  const RISKY_DROP_POINTS = 5;
  const riskOf = (current, next) => {
    if (next === 0) return 'This sets the rate to 0%. The platform will take nothing from these transactions.';
    if (current !== null && current !== undefined && current - next >= RISKY_DROP_POINTS) {
      return `This lowers the rate by ${(current - next).toFixed(2)} points, from ${current}% to ${next}%.`;
    }
    return null;
  };

  const submitEdit = () => {
    if (!editing) return;
    const value = parseFloat(editing.value);
    if (Number.isNaN(value) || value < 0 || value > 100) {
      return showToast('Enter a percentage between 0 and 100', 'error');
    }
    const warning = riskOf(editing.current, value);
    if (warning) {
      return setConfirming({ ...editing, value, warning, allowZero: value === 0 });
    }
    if (editing.kind === 'category') return commitCategory(editing.id, value);
    return commitVendor(editing.id, value, editing.name);
  };

  const confirmEdit = () => {
    const c = confirming;
    setConfirming(null);
    if (!c) return;
    if (c.kind === 'category') return commitCategory(c.id, c.value, c.allowZero);
    return commitVendor(c.id, c.value, c.name, c.allowZero);
  };

  const saveLimits = async () => {
    const min = parseFloat(limitsDraft.min);
    const max = parseFloat(limitsDraft.max);
    if (Number.isNaN(min) || Number.isNaN(max) || min < 0 || max > 100 || min > max) {
      return showToast('Enter a valid range between 0 and 100', 'error');
    }
    setSavingKey('bounds');
    try {
      await setCommissionBounds(min, max);
      showToast(`Limits set to ${min}%–${max}%`);
      setLimitsDraft(null);
      reload();
    } catch (err) {
      showToast(err?.message || 'Could not save limits', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  const saveTax = async (percent) => {
    setSavingKey('tax');
    try {
      await setTaxPercent(percent);
      showToast(`Payout tax set to ${percent}%`);
      setLimitsDraft(null);
      reload();
    } catch (err) {
      showToast(err?.message || 'Could not save the tax rate', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  const submitSchedule = async () => {
    const { scope, targetKey, value, when, note } = scheduling;
    const percent = parseFloat(value);
    if (Number.isNaN(percent)) return showToast('Enter a percentage', 'error');
    if (!when) return showToast('Pick a date and time', 'error');
    setSavingKey('schedule');
    try {
      await scheduleCommissionChange({
        scope,
        targetKey,
        percent,
        effectiveFrom: new Date(when).toISOString(),
        note: note || '',
      });
      showToast('Change scheduled');
      setScheduling(null);
      reload();
    } catch (err) {
      showToast(err?.message || 'Could not schedule that change', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  const dropSchedule = async (id) => {
    setSavingKey(`schedule:${id}`);
    try {
      await cancelCommissionSchedule(id);
      showToast('Scheduled change cancelled');
      reload();
    } catch (err) {
      showToast(err?.message || 'Could not cancel that change', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  const vendors = useMemo(() => matrix?.vendors || [], [matrix]);
  const filteredVendors = useMemo(() => {
    const q = vendorSearch.trim().toLowerCase();
    return vendors.filter((v) => {
      const matchesType = typeFilter === 'All' || v.vendorType === typeFilter;
      const matchesQuery = !q || v.businessName.toLowerCase().includes(q);
      return matchesType && matchesQuery;
    });
  }, [vendors, vendorSearch, typeFilter]);

  const overrideCount = vendors.filter((v) => v.overridePercent !== null).length;

  const rateInput = (onCancel) => (
    <span className="inline-flex items-center gap-1">
      <input
        autoFocus
        type="number"
        min="0"
        max="100"
        step="0.01"
        value={editing.value}
        onChange={(e) => setEditing((p) => ({ ...p, value: e.target.value }))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submitEdit();
          if (e.key === 'Escape') onCancel();
        }}
        className="w-20 px-2 py-1 border border-blue-300 rounded-lg text-[13px] font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
      />
      <button
        onClick={submitEdit}
        className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
        title="Save"
      >
        <Check size={13} />
      </button>
      <button onClick={onCancel} className="p-1.5 text-slate-400 hover:text-slate-600 transition" title="Cancel">
        <AlertCircle size={13} />
      </button>
    </span>
  );

  const dialogShell = (title, icon, body, actions, onClose) => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-start gap-3 p-5 pb-3">
          {icon}
          <h3 className="text-[15px] font-bold text-slate-900 flex-1 min-w-0">{title}</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition">
            <X size={17} />
          </button>
        </div>
        <div className="px-5 pb-4">{body}</div>
        <div className="flex gap-2 justify-end px-5 py-3 bg-slate-50 border-t border-slate-100">{actions}</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {confirming &&
        dialogShell(
          'Confirm this rate change',
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <ShieldAlert size={18} />
          </div>,
          <>
            <p className="text-[13px] text-slate-600 leading-relaxed">{confirming.warning}</p>
            <p className="text-[13px] text-slate-600 leading-relaxed mt-2">
              <span className="font-bold">{confirming.name}</span> will be billed{' '}
              <span className="font-bold">{confirming.value}%</span> on every transaction settled
              from now on. Earnings already recorded keep the rate they were billed at.
            </p>
          </>,
          <>
            <button
              onClick={() => setConfirming(null)}
              className="px-4 py-2 text-[13px] font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={confirmEdit}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-[13px] font-bold rounded-lg transition"
            >
              Apply {confirming.value}%
            </button>
          </>,
          () => setConfirming(null)
        )}

      {scheduling &&
        dialogShell(
          `Schedule a change for ${scheduling.name}`,
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <CalendarClock size={18} />
          </div>,
          <div className="space-y-3">
            <p className="text-[12px] text-slate-500 leading-relaxed">
              The rate stays as it is until the moment you pick, then changes on its own. It is
              checked against the limits both now and when it lands.
            </p>
            <label className="block">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                New rate (%)
              </span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={scheduling.value}
                onChange={(e) => setScheduling((p) => ({ ...p, value: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-[13px] font-semibold focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
              />
            </label>
            <label className="block">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                Takes effect
              </span>
              <input
                type="datetime-local"
                value={scheduling.when}
                onChange={(e) => setScheduling((p) => ({ ...p, when: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-[13px] font-semibold focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
              />
            </label>
            <label className="block">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                Note (optional)
              </span>
              <input
                type="text"
                maxLength={200}
                value={scheduling.note}
                onChange={(e) => setScheduling((p) => ({ ...p, note: e.target.value }))}
                placeholder="Why this change is happening"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-[13px] font-semibold focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
              />
            </label>
          </div>,
          <>
            <button
              onClick={() => setScheduling(null)}
              className="px-4 py-2 text-[13px] font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={submitSchedule}
              disabled={savingKey === 'schedule'}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-[13px] font-bold rounded-lg transition inline-flex items-center gap-1.5"
            >
              {savingKey === 'schedule' && <Loader2 size={14} className="animate-spin" />}
              Schedule
            </button>
          </>,
          () => setScheduling(null)
        )}

      <div className="mx-auto w-full max-w-[1200px] px-3 sm:px-6 py-4 sm:py-6 pb-20">
        {toast && (
          <div className="fixed z-50 top-4 left-4 right-4 sm:left-auto sm:right-6 sm:top-6 sm:max-w-sm">
            <div className="bg-white px-4 py-3 rounded-xl shadow-lg border border-slate-200 flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  toast.type === 'error' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                }`}
              >
                {toast.type === 'error' ? <AlertCircle size={14} /> : <Check size={14} />}
              </div>
              <p className="text-[13px] font-bold text-slate-800 min-w-0">{toast.text}</p>
            </div>
          </div>
        )}

        <header className="mb-5">
          <h1 className="text-xl sm:text-[22px] font-semibold text-slate-900 tracking-tight">
            Commission Structure
          </h1>
          <p className="text-[13px] text-slate-500 mt-1 max-w-3xl">
            Set what the platform charges, per category and per vendor. Every settlement reads
            these rates.
          </p>
        </header>

        <div className="mb-6 bg-sky-50 border border-sky-100 rounded-xl p-3 sm:p-4 flex items-start gap-3">
          <Info size={17} className="text-sky-600 mt-0.5 shrink-0" />
          <p className="text-[12px] text-sky-900 leading-relaxed min-w-0">
            <span className="font-bold">How a rate is chosen. </span>
            A vendor&apos;s own rate wins if it has one. Otherwise it inherits its category, and a
            category with no rate of its own falls back to the global default. Set a category to
            change everyone in it; set a vendor only to single that one out.
          </p>
        </div>

        {loading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 flex items-center justify-center gap-3 text-slate-500">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-[13px] font-semibold">Loading commission structure…</span>
          </div>
        )}

        {!loading && loadError && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center gap-3 text-center">
            <div className="w-11 h-11 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Could not load commission structure</p>
              <p className="text-[13px] font-medium text-slate-500 mt-0.5">{loadError}</p>
            </div>
            <button
              onClick={reload}
              className="mt-1 inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[13px] font-bold transition"
            >
              <RefreshCw size={14} /> Try again
            </button>
          </div>
        )}

        {!loading && !loadError && matrix && (
          <div className="space-y-6">
            {/* ── Limits and payout tax ── */}
            <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <ShieldAlert size={19} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-[15px] font-bold text-slate-900">Limits and payout tax</h2>
                    <p className="text-[12px] text-slate-500 mt-0.5">
                      Any rate outside the range is refused by the server, not just by this screen.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 shrink-0">
                  {limitsDraft ? (
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="block">
                        <span className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Min %</span>
                        <input
                          type="number" min="0" max="100" step="0.01"
                          value={limitsDraft.min}
                          onChange={(e) => setLimitsDraft((p) => ({ ...p, min: e.target.value }))}
                          className="w-20 px-2 py-1.5 border border-slate-300 rounded-lg text-[13px] font-bold focus:outline-none focus:border-amber-400"
                        />
                      </label>
                      <label className="block">
                        <span className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Max %</span>
                        <input
                          type="number" min="0" max="100" step="0.01"
                          value={limitsDraft.max}
                          onChange={(e) => setLimitsDraft((p) => ({ ...p, max: e.target.value }))}
                          className="w-20 px-2 py-1.5 border border-slate-300 rounded-lg text-[13px] font-bold focus:outline-none focus:border-amber-400"
                        />
                      </label>
                      <button
                        onClick={saveLimits}
                        disabled={savingKey === 'bounds'}
                        className="h-[34px] px-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-[12px] font-bold rounded-lg transition inline-flex items-center gap-1.5"
                      >
                        {savingKey === 'bounds' ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                        Save
                      </button>
                      <button
                        onClick={() => setLimitsDraft(null)}
                        className="h-[34px] px-3 text-[12px] font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Allowed range</p>
                        <p className="text-[17px] font-black text-slate-900 mt-0.5">
                          {matrix.bounds.minPercent}% – {matrix.bounds.maxPercent}%
                        </p>
                      </div>
                      <button
                        onClick={() => setLimitsDraft({ min: String(matrix.bounds.minPercent), max: String(matrix.bounds.maxPercent) })}
                        className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                        title="Change the limits"
                      >
                        <Edit2 size={15} />
                      </button>
                      <div className="pl-4 border-l border-slate-200 flex items-center gap-2">
                        <Receipt size={15} className="text-slate-400" />
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Payout tax</p>
                          <p className="text-[17px] font-black text-slate-900 mt-0.5">{pct(matrix.taxPercent)}</p>
                        </div>
                        <button
                          onClick={() => {
                            const next = window.prompt('Payout tax withheld from vendor earnings (%)', String(matrix.taxPercent));
                            if (next !== null && next.trim() !== '') saveTax(parseFloat(next));
                          }}
                          disabled={savingKey === 'tax'}
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition disabled:opacity-50"
                          title="Change the payout tax rate"
                        >
                          {savingKey === 'tax' ? <Loader2 size={15} className="animate-spin" /> : <Edit2 size={15} />}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </section>

            {/* ── Scheduled changes ── */}
            {matrix.scheduled.length > 0 && (
              <section className="bg-white rounded-2xl border border-indigo-200 p-4 sm:p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <CalendarClock size={19} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-[15px] font-bold text-slate-900">Upcoming changes</h2>
                    <p className="text-[12px] text-slate-500 mt-0.5">
                      These apply on their own. Until then the current rates above are what is billed.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {matrix.scheduled.map((sc) => (
                    <div key={sc.id} className="flex flex-wrap items-center gap-3 justify-between border border-slate-200 rounded-xl px-3.5 py-2.5">
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-slate-900">
                          {sc.targetLabel}{' '}
                          <span className="text-slate-400 font-semibold">→</span>{' '}
                          {sc.clearsOverride ? 'inherits category' : `${sc.percent}%`}
                        </p>
                        <p className="text-[11.5px] font-semibold text-slate-500 mt-0.5">
                          {new Date(sc.effectiveFrom).toLocaleString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                          })}
                          {sc.note && ` · ${sc.note}`}
                        </p>
                      </div>
                      <button
                        onClick={() => dropSchedule(sc.id)}
                        disabled={savingKey === `schedule:${sc.id}`}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-50 shrink-0"
                        title="Cancel this scheduled change"
                      >
                        {savingKey === `schedule:${sc.id}` ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Global default ── */}
            <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                    <Globe size={19} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-[15px] font-bold text-slate-900">Global default</h2>
                    <p className="text-[12px] text-slate-500 mt-0.5">
                      Used by any category that has no rate of its own.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {editing?.kind === 'category' && editing.id === 'default' ? (
                    rateInput(() => setEditing(null))
                  ) : (
                    <>
                      <span className="text-2xl font-black text-slate-900">
                        {pct(matrix.globalPercent)}
                      </span>
                      <button
                        onClick={() => setEditing({ kind: 'category', id: 'default', name: 'Global default', current: matrix.globalPercent, value: String(matrix.globalPercent ?? '') })}
                        disabled={savingKey !== null}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-50"
                        title="Edit global default"
                      >
                        {savingKey === 'category:default' ? <Loader2 size={16} className="animate-spin" /> : <Edit2 size={16} />}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </section>

            {/* ── Per-category rates ── */}
            <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
              <div className="flex items-start gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Layers size={19} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[15px] font-bold text-slate-900">Category rates</h2>
                  <p className="text-[12px] text-slate-500 mt-0.5">
                    Applies to every vendor in the category that has no rate of its own.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {matrix.categories.map((cat) => {
                  const isEditing = editing?.kind === 'category' && editing.id === cat.vendorType;
                  return (
                    <div key={cat.vendorType} className="border border-slate-200 rounded-xl p-3.5 bg-white">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-slate-900 truncate">{cat.label}</p>
                          <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                            {cat.vendorCount} vendor{cat.vendorCount === 1 ? '' : 's'}
                            {cat.overrideCount > 0 && ` · ${cat.overrideCount} on own rate`}
                          </p>
                        </div>
                        <span
                          className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${SOURCE_STYLE[cat.source]}`}
                        >
                          {cat.source === 'category' ? 'Set' : 'Inherited'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-3">
                        {isEditing ? (
                          rateInput(() => setEditing(null))
                        ) : (
                          <>
                            <span className="text-xl font-black text-slate-900">
                              {pct(cat.effectivePercent)}
                            </span>
                            <span className="inline-flex items-center gap-0.5">
                              <button
                                onClick={() => setEditing({ kind: 'category', id: cat.vendorType, name: cat.label, current: cat.effectivePercent, value: String(cat.effectivePercent ?? '') })}
                                disabled={savingKey !== null}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-50"
                                title={`Edit ${cat.label} rate`}
                              >
                                {savingKey === `category:${cat.vendorType}` ? (
                                  <Loader2 size={15} className="animate-spin" />
                                ) : (
                                  <Edit2 size={15} />
                                )}
                              </button>
                              <button
                                onClick={() => setScheduling({ scope: 'category', targetKey: cat.vendorType, name: cat.label, value: String(cat.effectivePercent ?? ''), when: '', note: '' })}
                                disabled={savingKey !== null}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition disabled:opacity-50"
                                title={`Schedule a change for ${cat.label}`}
                              >
                                <CalendarClock size={15} />
                              </button>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ── Per-vendor overrides ── */}
            <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="p-4 sm:p-6 pb-4">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Building2 size={19} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-[15px] font-bold text-slate-900">Vendor rates</h2>
                    <p className="text-[12px] text-slate-500 mt-0.5">
                      {overrideCount} of {vendors.length} vendors are on their own rate. The rest
                      inherit their category.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1 min-w-0">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={vendorSearch}
                      onChange={(e) => setVendorSearch(e.target.value)}
                      placeholder="Search vendors…"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                    />
                  </div>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 shrink-0"
                  >
                    <option value="All">All categories</option>
                    {matrix.categories.map((c) => (
                      <option key={c.vendorType} value={c.vendorType}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[680px]">
                  <thead>
                    <tr className="bg-slate-50 border-y border-slate-100">
                      <th className="px-4 sm:px-6 py-3 text-[11px] font-black text-slate-500 uppercase tracking-wider">Vendor</th>
                      <th className="px-4 py-3 text-[11px] font-black text-slate-500 uppercase tracking-wider">Category</th>
                      <th className="px-4 py-3 text-[11px] font-black text-slate-500 uppercase tracking-wider">Rate</th>
                      <th className="px-4 py-3 text-[11px] font-black text-slate-500 uppercase tracking-wider">Source</th>
                      <th className="px-4 sm:px-6 py-3 text-[11px] font-black text-slate-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredVendors.map((v) => {
                      const isEditing = editing?.kind === 'vendor' && editing.id === v.id;
                      const busy = savingKey === `vendor:${v.id}`;
                      return (
                        <tr key={v.id} className="hover:bg-slate-50/60 transition">
                          <td className="px-4 sm:px-6 py-3">
                            <p className="text-[13px] font-bold text-slate-900">{v.businessName}</p>
                            {v.approvalStatus !== 'approved' && (
                              <p className="text-[11px] font-semibold text-amber-600 capitalize mt-0.5">
                                {v.approvalStatus}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-[12.5px] font-semibold text-slate-600 whitespace-nowrap">
                            {v.vendorTypeLabel}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {isEditing ? (
                              rateInput(() => setEditing(null))
                            ) : (
                              <span
                                className={`text-[15px] font-black ${
                                  v.source === 'vendor' ? 'text-blue-700' : 'text-slate-500'
                                }`}
                              >
                                {pct(v.effectivePercent)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border ${SOURCE_STYLE[v.source]}`}
                            >
                              {SOURCE_LABEL[v.source]}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => setEditing({ kind: 'vendor', id: v.id, name: v.businessName, current: v.effectivePercent, value: String(v.effectivePercent ?? '') })}
                                disabled={savingKey !== null}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-50"
                                title="Set this vendor's own rate"
                              >
                                {busy ? <Loader2 size={15} className="animate-spin" /> : <Percent size={15} />}
                              </button>
                              <button
                                onClick={() => setScheduling({ scope: 'vendor', targetKey: v.id, name: v.businessName, value: String(v.effectivePercent ?? ''), when: '', note: '' })}
                                disabled={savingKey !== null}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition disabled:opacity-50"
                                title="Schedule a change for this vendor"
                              >
                                <CalendarClock size={15} />
                              </button>
                              {v.overridePercent !== null && (
                                <button
                                  onClick={() => commitVendor(v.id, null, v.businessName)}
                                  disabled={savingKey !== null}
                                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition disabled:opacity-50"
                                  title="Clear the override and inherit the category rate"
                                >
                                  <RotateCcw size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredVendors.length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-6 py-10 text-center text-slate-500 font-medium text-sm">
                          No vendors match that search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

export default Commission;
