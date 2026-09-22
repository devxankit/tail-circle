import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Edit2, Trash2, Check, X, Search, Loader2, Crown, Heart, Users,
  TrendingUp, Star, Calendar, Infinity as InfinityIcon, AlertTriangle, Gift,
} from 'lucide-react';
import {
  fetchMatchPlans, createMatchPlan, updateMatchPlan, deleteMatchPlan, setDefaultMatchPlan,
  fetchMatchSubscriptions, fetchMatchSubscriptionStats, extendMatchSubscription,
  revokeMatchSubscription,
} from '../../../../../services/admin';

/**
 * Match Subscriptions — the super-admin control room for the swipe deck's
 * like limits.
 *
 * Three tabs, in the order an operator actually needs them: the plans (where
 * the free allowance and the paid prices are set), the people on them, and the
 * money. The free plan gets first-class treatment on the Plans tab rather than
 * being buried in a settings list, because "how many likes does a new user
 * get" is the single most-tuned number in the whole feature.
 */

const TABS = ['Plans', 'Subscribers', 'Insights'];

const EMPTY_FORM = {
  name: '',
  tagline: '',
  priceInr: 0,
  durationDays: 30,
  unlimited: false,
  likeLimit: 25,
  limitPeriod: 'day',
  features: '',
  badge: '',
  accentColor: '#599D9A',
  tier: 1,
  active: true,
};

export function MatchSubscriptions() {
  const [tab, setTab] = useState('Plans');
  const [toast, setToast] = useState(null);

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3200);
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-black text-slate-900">Match Subscriptions</h1>
        <p className="text-sm text-slate-500 mt-1">
          Like limits, pricing and plan durations for the pet match deck. Changes here
          reach every user immediately — no app update needed.
        </p>
      </header>

      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit mb-6">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-[13px] font-bold transition-all ${
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Plans' && <PlansTab showToast={showToast} />}
      {tab === 'Subscribers' && <SubscribersTab showToast={showToast} />}
      {tab === 'Insights' && <InsightsTab />}

      {toast && (
        <div
          className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-white text-sm font-semibold ${
            toast.type === 'error' ? 'bg-red-600' : 'bg-slate-900'
          }`}
        >
          {toast.type === 'error' ? <AlertTriangle size={16} /> : <Check size={16} />}
          {toast.text}
        </div>
      )}
    </div>
  );
}

/* ── Plans ────────────────────────────────────────────────────────────── */

function PlansTab({ showToast }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // plan object, or 'new'
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchMatchPlans()
      .then(setPlans)
      .catch(() => showToast('Could not load plans', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (plan) => {
    try {
      const res = await deleteMatchPlan(plan.id);
      showToast(
        res.deactivated
          ? `${plan.name} has ${res.activeSubscribers} active subscriber(s) — deactivated instead of deleted, so their plan keeps running.`
          : `${plan.name} deleted`
      );
      setConfirmDelete(null);
      load();
    } catch (err) {
      showToast(err?.message || 'Could not delete plan', 'error');
    }
  };

  const makeDefault = async (plan) => {
    try {
      await setDefaultMatchPlan(plan.id);
      showToast(`${plan.name} is now the plan every new user starts on`);
      load();
    } catch (err) {
      showToast(err?.message || 'Could not set default', 'error');
    }
  };

  const freePlan = plans.find((p) => p.isDefault);

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-slate-400">
        <Loader2 size={26} className="animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* The free allowance, pulled out of the grid because it is the number
          operators come to this screen to change. */}
      {freePlan && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-5 mb-6 text-white flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center">
              <Heart size={20} fill="white" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/50">
                Free allowance · every new user
              </p>
              <p className="text-[15px] font-black mt-0.5">
                {freePlan.unlimited
                  ? 'Unlimited likes'
                  : `${freePlan.likeLimit} likes ${freePlan.limitPeriod === 'day' ? 'per day' : 'in total'}`}
                <span className="text-white/40 font-bold"> · plan “{freePlan.name}”</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setEditing(freePlan)}
            className="ml-auto px-4 py-2 rounded-lg bg-white text-slate-900 text-[13px] font-bold hover:bg-slate-100 transition-colors flex items-center gap-2"
          >
            <Edit2 size={14} /> Change the free limit
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-black text-slate-900">
          All plans <span className="text-slate-400 font-bold">({plans.length})</span>
        </h2>
        <button
          onClick={() => setEditing('new')}
          className="px-4 py-2 rounded-lg bg-[#599D9A] text-white text-[13px] font-bold hover:bg-[#4a8582] transition-colors flex items-center gap-2"
        >
          <Plus size={15} /> New plan
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => (
          <AdminPlanCard
            key={plan.id}
            plan={plan}
            onEdit={() => setEditing(plan)}
            onDelete={() => setConfirmDelete(plan)}
            onMakeDefault={() => makeDefault(plan)}
          />
        ))}
      </div>

      {editing && (
        <PlanModal
          plan={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(msg) => {
            setEditing(null);
            showToast(msg);
            load();
          }}
          onError={(msg) => showToast(msg, 'error')}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title={`Delete “${confirmDelete.name}”?`}
          body={
            confirmDelete.activeSubscribers > 0
              ? `${confirmDelete.activeSubscribers} user(s) are on this plan right now. It will be hidden from the app instead of deleted, and their subscriptions will run to their end dates.`
              : 'Nobody is on this plan. It will be removed permanently.'
          }
          confirmLabel={confirmDelete.activeSubscribers > 0 ? 'Hide plan' : 'Delete plan'}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => remove(confirmDelete)}
        />
      )}
    </>
  );
}

function AdminPlanCard({ plan, onEdit, onDelete, onMakeDefault }) {
  const accent = plan.accentColor || '#599D9A';

  return (
    <div
      className={`relative rounded-2xl border-2 bg-white p-5 transition-shadow hover:shadow-md ${
        plan.active ? '' : 'opacity-60'
      }`}
      style={{ borderColor: accent }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[16px] font-black text-slate-900 truncate">{plan.name}</h3>
            {plan.isDefault && (
              <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[9.5px] font-black tracking-wide">
                DEFAULT
              </span>
            )}
            {!plan.active && (
              <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[9.5px] font-black">
                HIDDEN
              </span>
            )}
          </div>
          {plan.tagline && <p className="text-[12px] text-slate-500 mt-1">{plan.tagline}</p>}
        </div>
        <div className="text-right shrink-0">
          <div className="text-[22px] font-black leading-none" style={{ color: accent }}>
            {plan.priceInr > 0 ? `₹${plan.priceInr}` : 'Free'}
          </div>
          {plan.durationDays > 0 && (
            <div className="text-[11px] text-slate-400 font-bold mt-1">
              {plan.durationDays} days
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Stat
          icon={plan.unlimited ? InfinityIcon : Heart}
          label="Likes"
          value={
            plan.unlimited
              ? 'Unlimited'
              : `${plan.likeLimit} / ${plan.limitPeriod === 'day' ? 'day' : 'term'}`
          }
          accent={accent}
        />
        <Stat icon={Users} label="Active now" value={plan.activeSubscribers ?? 0} accent={accent} />
      </div>

      {plan.features?.length > 0 && (
        <ul className="mt-3 space-y-1">
          {plan.features.slice(0, 4).map((f) => (
            <li key={f} className="flex items-start gap-1.5 text-[11.5px] text-slate-600">
              <Check size={12} className="mt-0.5 shrink-0" style={{ color: accent }} />
              {f}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={onEdit}
          className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[12.5px] font-bold transition-colors flex items-center justify-center gap-1.5"
        >
          <Edit2 size={13} /> Edit
        </button>
        {!plan.isDefault && plan.priceInr === 0 && (
          <button
            onClick={onMakeDefault}
            title="Make this the plan every new user starts on"
            className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <Star size={14} />
          </button>
        )}
        {!plan.isDefault && (
          <button
            onClick={onDelete}
            className="px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }) {
  return (
    <div className="rounded-xl px-3 py-2" style={{ backgroundColor: `${accent}12` }}>
      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
        <Icon size={11} /> {label}
      </div>
      <p className="text-[13.5px] font-black text-slate-800 mt-0.5">{value}</p>
    </div>
  );
}

/**
 * Plan editor.
 *
 * The default plan hides price and duration rather than showing them disabled:
 * they are not editable and never will be, so an input the operator cannot use
 * is just a question they will ask support about.
 */
function PlanModal({ plan, onClose, onSaved, onError }) {
  const isDefault = Boolean(plan?.isDefault);
  const [form, setForm] = useState(() =>
    plan
      ? {
          name: plan.name,
          tagline: plan.tagline || '',
          priceInr: plan.priceInr,
          durationDays: plan.durationDays,
          unlimited: plan.unlimited,
          likeLimit: plan.likeLimit ?? 25,
          limitPeriod: plan.limitPeriod,
          features: (plan.features || []).join('\n'),
          badge: plan.badge || '',
          accentColor: plan.accentColor,
          tier: plan.tier,
          active: plan.active,
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const body = {
      name: form.name.trim(),
      tagline: form.tagline.trim(),
      unlimited: Boolean(form.unlimited),
      likeLimit: form.unlimited ? null : Math.max(0, Number(form.likeLimit) || 0),
      limitPeriod: form.limitPeriod,
      features: form.features
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean)
        .slice(0, 12),
      badge: form.badge.trim(),
      accentColor: form.accentColor,
      tier: Number(form.tier) || 0,
      active: Boolean(form.active),
    };
    // The API pins these on the default plan anyway; not sending them keeps the
    // audit-log diff honest about what was actually changed.
    if (!isDefault) {
      body.priceInr = Number(form.priceInr) || 0;
      body.durationDays = Number(form.durationDays) || 0;
    }

    try {
      if (plan) {
        await updateMatchPlan(plan.id, body);
        onSaved(`${body.name} updated`);
      } else {
        await createMatchPlan(body);
        onSaved(`${body.name} created`);
      }
    } catch (err) {
      onError(err?.message || 'Could not save the plan');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-[16px] font-black text-slate-900">
            {plan ? `Edit ${plan.name}` : 'New plan'}
          </h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X size={17} className="text-slate-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {isDefault && (
            <p className="text-[12px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 leading-relaxed">
              This is the plan every user is on before they buy anything. Its price and
              duration are fixed at free and forever — change the name and the like
              allowance here.
            </p>
          )}

          <Field label="Plan name" required>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              required
              minLength={2}
              maxLength={60}
              placeholder="e.g. Standard"
              className={inputCls}
            />
          </Field>

          <Field label="Tagline" hint="One line under the name on the plan card">
            <input
              value={form.tagline}
              onChange={(e) => set('tagline', e.target.value)}
              maxLength={160}
              placeholder="e.g. For pet parents who mingle"
              className={inputCls}
            />
          </Field>

          {/* Likes */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Like allowance
            </p>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.unlimited}
                onChange={(e) => set('unlimited', e.target.checked)}
                className="w-4 h-4 accent-[#599D9A]"
              />
              <span className="text-[13px] font-bold text-slate-700 flex items-center gap-1.5">
                <Crown size={14} className="text-amber-500" /> Unlimited likes
              </span>
            </label>

            {!form.unlimited && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Number of likes" required>
                  <input
                    type="number"
                    min={0}
                    max={100000}
                    value={form.likeLimit}
                    onChange={(e) => set('likeLimit', e.target.value)}
                    required
                    className={inputCls}
                  />
                </Field>
                <Field label="Resets">
                  <select
                    value={form.limitPeriod}
                    onChange={(e) => set('limitPeriod', e.target.value)}
                    className={inputCls}
                  >
                    <option value="day">Every day (midnight IST)</option>
                    <option value="total">Never — total for the plan</option>
                  </select>
                </Field>
              </div>
            )}
          </div>

          {!isDefault && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price (₹)" required>
                <input
                  type="number"
                  min={0}
                  value={form.priceInr}
                  onChange={(e) => set('priceInr', e.target.value)}
                  required
                  className={inputCls}
                />
              </Field>
              <Field label="Duration (days)" required>
                <input
                  type="number"
                  min={1}
                  max={3650}
                  value={form.durationDays}
                  onChange={(e) => set('durationDays', e.target.value)}
                  required
                  className={inputCls}
                />
              </Field>
            </div>
          )}

          <Field
            label="Features"
            hint="One per line — these are the ticks on the plan card in the app"
          >
            <textarea
              value={form.features}
              onChange={(e) => set('features', e.target.value)}
              rows={4}
              placeholder={'25 likes every day\nValid for 30 days\nPriority in the match deck'}
              className={`${inputCls} resize-y`}
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Badge" hint="Optional ribbon">
              <input
                value={form.badge}
                onChange={(e) => set('badge', e.target.value)}
                maxLength={40}
                placeholder="MOST POPULAR"
                className={inputCls}
              />
            </Field>
            <Field label="Accent">
              <input
                type="color"
                value={form.accentColor}
                onChange={(e) => set('accentColor', e.target.value)}
                className="w-full h-[38px] rounded-lg border border-slate-200 cursor-pointer"
              />
            </Field>
            <Field label="Tier" hint="Higher wins on upgrade">
              <input
                type="number"
                min={0}
                max={99}
                value={form.tier}
                onChange={(e) => set('tier', e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          {!isDefault && (
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => set('active', e.target.checked)}
                className="w-4 h-4 accent-[#599D9A]"
              />
              <span className="text-[13px] font-bold text-slate-700">
                Show this plan in the app
              </span>
            </label>
          )}
        </div>

        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-slate-100 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[13px] font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg bg-[#599D9A] hover:bg-[#4a8582] text-white text-[13px] font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {plan ? 'Save changes' : 'Create plan'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── Subscribers ──────────────────────────────────────────────────────── */

function SubscribersTab({ showToast }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [confirmRevoke, setConfirmRevoke] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchMatchSubscriptions({ search: search || undefined, status: status || undefined })
      .then(setRows)
      .catch(() => showToast('Could not load subscribers', 'error'))
      .finally(() => setLoading(false));
  }, [search, status, showToast]);

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0); // debounce typing, not filters
    return () => clearTimeout(t);
  }, [load, search]);

  const extend = async (row, days) => {
    setBusyId(row.id);
    try {
      await extendMatchSubscription(row.id, days);
      showToast(`${row.user?.name || 'User'}'s plan extended by ${days} days`);
      load();
    } catch (err) {
      showToast(err?.message || 'Could not extend', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const revoke = async (row) => {
    setBusyId(row.id);
    try {
      await revokeMatchSubscription(row.id, 'Revoked from admin panel');
      showToast(`${row.user?.name || 'User'} moved back to the free plan`);
      setConfirmRevoke(null);
      load();
    } catch (err) {
      showToast(err?.message || 'Could not revoke', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone or email…"
            className={`${inputCls} pl-9`}
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputCls} w-auto`}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Cancelled</option>
          <option value="superseded">Upgraded</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[860px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Likes today</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-slate-400">
                    <Loader2 size={22} className="animate-spin inline" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <p className="text-[13px] font-bold text-slate-500">No subscribers yet</p>
                    <p className="text-[12px] text-slate-400 mt-1">
                      Everyone is on the free plan. Paid plans appear here as they sell.
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <p className="text-[13px] font-bold text-slate-800">{r.user?.name || '—'}</p>
                      <p className="text-[11.5px] text-slate-400">{r.user?.phone || r.user?.email || ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-1 rounded-md text-[11.5px] font-black"
                        style={{ backgroundColor: `${r.accentColor}1a`, color: r.accentColor }}
                      >
                        {r.planName}
                      </span>
                      {r.grantedByAdmin && (
                        <span className="ml-1.5 text-[9.5px] font-black text-emerald-600">GIFTED</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[13px] font-bold text-slate-700">
                      {r.usedToday}
                      <span className="text-slate-400 font-semibold">
                        {r.unlimited ? ' / ∞' : ` / ${r.likeLimit}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-slate-500">
                      {fmtDate(r.startsAt)} → {fmtDate(r.expiresAt)}
                    </td>
                    <td className="px-4 py-3 text-[13px] font-black text-slate-800">
                      {r.priceInr > 0 ? `₹${r.priceInr}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {r.status === 'active' && (
                          <>
                            <button
                              onClick={() => extend(r, 30)}
                              disabled={busyId === r.id}
                              title="Add 30 days"
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11.5px] font-bold transition-colors disabled:opacity-50"
                            >
                              +30d
                            </button>
                            <button
                              onClick={() => setConfirmRevoke(r)}
                              disabled={busyId === r.id}
                              className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-[11.5px] font-bold transition-colors disabled:opacity-50"
                            >
                              Revoke
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {confirmRevoke && (
        <ConfirmModal
          title={`Revoke ${confirmRevoke.user?.name || 'this user'}'s plan?`}
          body={`Their ${confirmRevoke.planName} plan ends immediately and they go back to the free daily allowance. This does not issue a refund — do that in Razorpay separately.`}
          confirmLabel="Revoke plan"
          danger
          onCancel={() => setConfirmRevoke(null)}
          onConfirm={() => revoke(confirmRevoke)}
        />
      )}
    </>
  );
}

/* ── Insights ─────────────────────────────────────────────────────────── */

function InsightsTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatchSubscriptionStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-slate-400">
        <Loader2 size={26} className="animate-spin" />
      </div>
    );
  }
  if (!stats) {
    return <p className="text-center text-slate-400 py-16 text-[13px]">No data yet.</p>;
  }

  const cards = [
    { label: 'Active subscribers', value: stats.activeSubscribers, icon: Users, color: '#599D9A' },
    { label: 'Revenue this month', value: `₹${stats.revenueThisMonthInr.toLocaleString('en-IN')}`, icon: TrendingUp, color: '#F87B68' },
    { label: 'Revenue all time', value: `₹${stats.revenueAllTimeInr.toLocaleString('en-IN')}`, icon: Gift, color: '#8B5CF6' },
    { label: 'Expiring in 7 days', value: stats.expiringIn7Days, icon: Calendar, color: '#F59E0B' },
    { label: 'Likes sent today', value: stats.likesToday.toLocaleString('en-IN'), icon: Heart, color: '#EC4899' },
    { label: 'Users who liked today', value: stats.likersToday.toLocaleString('en-IN'), icon: Users, color: '#0EA5E9' },
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-slate-400">
              <c.icon size={13} style={{ color: c.color }} /> {c.label}
            </div>
            <p className="text-[26px] font-black text-slate-900 mt-2 leading-none">{c.value}</p>
          </div>
        ))}
      </div>

      {stats.byPlan?.length > 0 && (
        <div className="mt-6 bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-[13px] font-black text-slate-900 mb-4">Active subscribers by plan</h3>
          <div className="space-y-3">
            {stats.byPlan.map((p) => {
              const max = Math.max(...stats.byPlan.map((x) => x.subscribers), 1);
              return (
                <div key={p.planKey}>
                  <div className="flex items-center justify-between text-[12.5px] mb-1">
                    <span className="font-bold text-slate-700 capitalize">{p.planKey}</span>
                    <span className="text-slate-500 font-semibold">
                      {p.subscribers} · ₹{p.revenueInr.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#599D9A]"
                      style={{ width: `${(p.subscribers / max) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

/* ── Small shared pieces ──────────────────────────────────────────────── */

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-800 outline-none focus:border-[#599D9A] focus:ring-2 focus:ring-[#599D9A]/15 transition';

function Field({ label, hint, required, children }) {
  return (
    <div>
      <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    active: 'bg-emerald-100 text-emerald-700',
    expired: 'bg-slate-100 text-slate-600',
    cancelled: 'bg-red-100 text-red-700',
    superseded: 'bg-indigo-100 text-indigo-700',
  };
  const label = status === 'superseded' ? 'Upgraded' : status;
  return (
    <span className={`px-2 py-1 rounded-md text-[11px] font-black capitalize ${map[status] || map.expired}`}>
      {label}
    </span>
  );
}

function ConfirmModal({ title, body, confirmLabel, danger, onCancel, onConfirm }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <h3 className="text-[16px] font-black text-slate-900">{title}</h3>
        <p className="text-[13px] text-slate-500 mt-2 leading-relaxed">{body}</p>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[13px] font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setBusy(true);
              onConfirm();
            }}
            disabled={busy}
            className={`flex-1 py-2.5 rounded-lg text-white text-[13px] font-bold transition-colors disabled:opacity-60 ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
}

export default MatchSubscriptions;
