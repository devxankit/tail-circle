import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, BarChart3, Check, Trash2 } from 'lucide-react';
import { fetchConsentState, setConsent } from '../../../../../services/analytics';

/**
 * The customer's own privacy controls.
 *
 * The cookie banner tells people they can change their mind "any time in
 * Settings", so this screen has to exist — a promise made at the point of
 * consent that leads nowhere would make the consent itself questionable.
 *
 * Turning analytics off does not merely stop future collection: the server
 * deletes everything already gathered for this device. That is stated plainly
 * on the button, because a withdrawal that quietly keeps the old data is not
 * really a withdrawal.
 */
export function PrivacySettings() {
  const navigate = useNavigate();
  const [consent, setConsentState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchConsentState()
      .then((s) => { if (alive) setConsentState(s?.consent || null); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const change = async (accepted) => {
    if (!accepted && consent?.analytics) {
      const ok = window.confirm(
        'Turn off activity tracking?\n\nWe will stop recording how you use the app, and everything already collected from this device will be deleted.'
      );
      if (!ok) return;
    }
    setBusy(true);
    try {
      await setConsent(accepted, 'settings');
      setConsentState({ analytics: accepted, decidedAt: new Date().toISOString() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setBusy(false);
    }
  };

  const on = consent?.analytics === true;

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-24">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100" aria-label="Back">
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-[16px] font-bold text-gray-900">Privacy &amp; Cookies</h1>
      </header>

      <div className="p-4 space-y-3">
        {saved && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <Check size={15} className="text-emerald-600" />
            <p className="text-[13px] font-bold text-emerald-800">Your preference has been saved</p>
          </div>
        )}

        {/* Essential — described, not offered, because it is not optional. */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
              <Shield size={18} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[14px] font-bold text-gray-900">Essential</h2>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Always on</span>
              </div>
              <p className="text-[13px] text-gray-600 mt-1 leading-relaxed">
                Keeps you signed in, remembers your cart and keeps payments secure.
                Tail Circle cannot work without these, so they cannot be turned off.
              </p>
            </div>
          </div>
        </div>

        {/* Analytics — the real choice. */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#66B4B1]/15 text-[#66B4B1] flex items-center justify-center shrink-0">
              <BarChart3 size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[14px] font-bold text-gray-900">Activity &amp; analytics</h2>
                <button
                  role="switch"
                  aria-checked={on}
                  aria-label="Activity and analytics"
                  disabled={busy || loading}
                  onClick={() => change(!on)}
                  className={`relative w-12 h-7 rounded-full transition shrink-0 disabled:opacity-50 ${
                    on ? 'bg-[#66B4B1]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${
                      on ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              <p className="text-[13px] text-gray-600 mt-1 leading-relaxed">
                Which screens you open, what you search for and which services you look at.
                We use it to work out what to improve — never to identify you to anyone else,
                and we never sell it.
              </p>

              <p className="text-[12px] text-gray-400 mt-2">
                {loading
                  ? 'Checking your preference…'
                  : on
                    ? 'Currently on. Turn it off and we delete what we already have.'
                    : 'Currently off. Nothing about how you use the app is being recorded.'}
              </p>
            </div>
          </div>
        </div>

        {on && (
          <button
            onClick={() => change(false)}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-white border border-red-200 text-red-700 text-[13px] font-bold hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 size={16} /> Turn off and delete my activity data
          </button>
        )}

        <p className="text-[12px] text-gray-400 px-1 pt-2 leading-relaxed">
          Your bookings, orders and payments are kept regardless of this setting — we need
          those to run your account and to meet our legal obligations. This controls only
          how you browse.
        </p>
      </div>
    </div>
  );
}

export default PrivacySettings;
