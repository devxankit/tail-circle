import React, { useEffect, useState } from 'react';
import { Cookie, X, Shield, BarChart3 } from 'lucide-react';
import { fetchConsentState, setConsent } from '../../services/analytics';

/**
 * Cookie consent, shown on a visitor's first arrival.
 *
 * Three things this gets right that a decorative banner does not:
 *
 *   - Declining is as easy as accepting. A "Decline" that is hidden behind a
 *     settings screen is not a free choice, and in most jurisdictions is not
 *     valid consent.
 *   - Nothing is tracked until a choice is made. There is no pre-ticked box and
 *     no "by continuing to browse you agree" — the tracker stays silent until
 *     the visitor presses a button.
 *   - Dismissing with X is a decline, not a deferral. Closing a banner is not
 *     agreement, and treating silence as a yes is exactly what the law forbids.
 *
 * Renders nothing once a decision exists, and re-appears if the policy version
 * changes — which is what a material change to what we collect requires.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [details, setDetails] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchConsentState()
      .then((state) => { if (alive && state?.mustAsk) setVisible(true); })
      .catch(() => {/* never block the app over a banner */});
    return () => { alive = false; };
  }, []);

  if (!visible) return null;

  const decide = async (accepted) => {
    setBusy(true);
    try {
      await setConsent(accepted, 'banner');
    } finally {
      setVisible(false);
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[10000] p-3 sm:p-4"
      role="dialog"
      aria-live="polite"
      aria-label="Cookie preferences"
    >
      <div className="mx-auto max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#66B4B1]/15 text-[#66B4B1] flex items-center justify-center shrink-0">
              <Cookie size={18} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-[15px] font-bold text-gray-900">We use cookies</h2>
                {/* Closing is a decline. Nothing is recorded either way. */}
                <button
                  onClick={() => decide(false)}
                  disabled={busy}
                  aria-label="Decline and close"
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 shrink-0"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="text-[13px] text-gray-600 mt-1 leading-relaxed">
                Some are needed to keep you signed in and remember your cart. We would also
                like to understand how you use Tail Circle so we can improve it — only if
                you are happy with that.
              </p>

              {details && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <Shield size={15} className="text-gray-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[12px] font-bold text-gray-800">
                        Essential <span className="font-medium text-gray-500">· always on</span>
                      </p>
                      <p className="text-[12px] text-gray-600 mt-0.5">
                        Keeps you signed in, remembers your cart and keeps your payment secure.
                        The app cannot work without these.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <BarChart3 size={15} className="text-gray-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[12px] font-bold text-gray-800">
                        Analytics <span className="font-medium text-gray-500">· your choice</span>
                      </p>
                      <p className="text-[12px] text-gray-600 mt-0.5">
                        Which screens you visit, what you search for and which services you
                        look at — so we know what to improve. If you decline we record none
                        of this, and you can change your mind any time in Settings.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 mt-4">
                <button
                  onClick={() => decide(true)}
                  disabled={busy}
                  className="px-4 py-2.5 rounded-xl bg-[#66B4B1] hover:opacity-90 disabled:opacity-50 text-white text-[13px] font-bold"
                >
                  Accept all
                </button>
                {/* Same size, same prominence as Accept - a real choice. */}
                <button
                  onClick={() => decide(false)}
                  disabled={busy}
                  className="px-4 py-2.5 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-700 text-[13px] font-bold"
                >
                  Essential only
                </button>
                <button
                  onClick={() => setDetails((d) => !d)}
                  className="px-3 py-2.5 text-[12px] font-bold text-gray-500 hover:text-gray-700"
                >
                  {details ? 'Hide details' : 'What do you collect?'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CookieConsent;
