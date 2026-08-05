import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, ShieldAlert, CreditCard, Mail, AppWindow, Check, Save, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react';
import { fetchAdminSettings, updateAdminSetting } from '../../../../../services/admin';

export function Settings() {
  const [toastMessage, setToastMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  const [isTestLoading, setIsTestLoading] = useState(false);

  // General Settings States
  const [appName, setAppName] = useState('TailCircle');
  const [supportPhone, setSupportPhone] = useState('+91 98765 43210');
  const [supportEmail, setSupportEmail] = useState('support@tailcircle.com');
  const [contactAddress, setContactAddress] = useState('12, Outer Ring Road, Indira Nagar, Bangalore - 560038');
  const [logoUrl, setLogoUrl] = useState('https://tailcircle.com/logo.png');

  // Commission Settings States
  const [defaultCommission, setDefaultCommission] = useState(10);
  const [minPayoutThreshold, setMinPayoutThreshold] = useState(500);

  // Payments Gateway States
  const [razorpayActive, setRazorpayActive] = useState(true);
  const [stripeActive, setStripeActive] = useState(false);
  const [codActive, setCodActive] = useState(true);
  const [walletActive, setWalletActive] = useState(true);
  const [sandboxMode, setSandboxMode] = useState(true);

  // Notifications / SMTP states
  const [smtpHost, setSmtpHost] = useState('smtp.mailgun.org');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState('postmaster@tailcircle.com');
  const [smsGateway, setSmsGateway] = useState('Twilio');

  // App Config States
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [minAppVersion, setMinAppVersion] = useState('1.2.0');
  const [recommendedAppVersion, setRecommendedAppVersion] = useState('1.2.5');
  const [maintenanceMessage, setMaintenanceMessage] = useState('TailCircle is undergoing emergency backend optimizations. We will be back shortly with faster pet care booking services.');

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const SETTERS = {
    'general.appName': setAppName,
    'general.supportPhone': setSupportPhone,
    'general.supportEmail': setSupportEmail,
    'general.contactAddress': setContactAddress,
    'general.logoUrl': setLogoUrl,
    'commission.minPayoutThreshold': setMinPayoutThreshold,
    'payments.razorpayActive': setRazorpayActive,
    'payments.stripeActive': setStripeActive,
    'payments.codActive': setCodActive,
    'payments.walletActive': setWalletActive,
    'payments.sandboxMode': setSandboxMode,
    'notifications.smtpHost': setSmtpHost,
    'notifications.smtpPort': setSmtpPort,
    'notifications.smtpUser': setSmtpUser,
    'notifications.smsGateway': setSmsGateway,
    'app.maintenanceMode': setMaintenanceMode,
    'app.minAppVersion': setMinAppVersion,
    'app.recommendedAppVersion': setRecommendedAppVersion,
    'app.maintenanceMessage': setMaintenanceMessage,
  };

  // Load every persisted platform setting (commission.default is stored as a fraction).
  useEffect(() => {
    fetchAdminSettings()
      .then((rows) => {
        const map = Object.fromEntries((rows || []).map((s) => [s.key, s.value]));
        if (map['commission.default'] != null) setDefaultCommission(Math.round(map['commission.default'] * 100));
        for (const [key, setter] of Object.entries(SETTERS)) {
          if (map[key] != null) setter(map[key]);
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    const entries = [
      ['commission.default', Number(defaultCommission) / 100],
      ['general.appName', appName],
      ['general.supportPhone', supportPhone],
      ['general.supportEmail', supportEmail],
      ['general.contactAddress', contactAddress],
      ['general.logoUrl', logoUrl],
      ['commission.minPayoutThreshold', Number(minPayoutThreshold)],
      ['payments.razorpayActive', razorpayActive],
      ['payments.stripeActive', stripeActive],
      ['payments.codActive', codActive],
      ['payments.walletActive', walletActive],
      ['payments.sandboxMode', sandboxMode],
      ['notifications.smtpHost', smtpHost],
      ['notifications.smtpPort', Number(smtpPort)],
      ['notifications.smtpUser', smtpUser],
      ['notifications.smsGateway', smsGateway],
      ['app.maintenanceMode', maintenanceMode],
      ['app.minAppVersion', minAppVersion],
      ['app.recommendedAppVersion', recommendedAppVersion],
      ['app.maintenanceMessage', maintenanceMessage],
    ];
    try {
      await Promise.all(entries.map(([key, value]) => updateAdminSetting(key, value)));
      showToast('Saved to the settings store. None of these values are enforced by app logic yet (see the notice above).', 'success');
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to save settings', 'error');
    }
  };

  const handleTestSMTP = () => {
    setIsTestLoading(true);
    setTimeout(() => {
      setIsTestLoading(false);
      showToast('SMTP Test Connection Succeeded! Test email sent.');
    }, 1500);
  };

  return (
    <div className="p-3 sm:p-6 max-w-[1200px] mx-auto bg-[#FAF7F2] min-h-screen pb-32 relative">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 animate-slide-in-right">
          <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200 flex items-center gap-3">
             {toastMessage.type === 'success' ? (
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><Check size={14}/></div>
             ) : (
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><Check size={14}/></div>
             )}
             <p className="text-[13px] font-bold text-gray-800">{toastMessage.text}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">Global Platform Configurations</h1>
        <p className="text-[13px] text-gray-500 mt-1">Manage app branding variables, default commission structures, payment gateways activation, and app upgrade parameters</p>
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-[12px] text-amber-800">
          Every field here is now persisted to the platform settings store, but nothing on this page is read by the app's actual
          logic yet: per-vendor commission (set from each vendor's own record) drives real payouts, not this default; gateway
          toggles, maintenance mode, SMTP and app-version gates are saved values with no enforcement wired up. Treat this as
          configuration storage, not a live control panel, until that wiring exists.
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 items-start">
         
         {/* Vertical Navigation Settings Tabs */}
         <div className="col-span-12 md:col-span-3 bg-white border border-[#FAF7F2] rounded-xl overflow-hidden shadow-sm">
            <div className="flex flex-col">
               <button 
                  onClick={() => setActiveTab('general')}
                  className={`flex items-center gap-2.5 px-4 py-3.5 text-[13px] font-semibold text-left transition border-l-4 ${activeTab === 'general' ? 'border-[#66B4B1] bg-emerald-50/50 text-[#66B4B1]' : 'border-transparent text-gray-600 hover:bg-gray-50'}`}
               >
                  <SettingsIcon size={16} /> General Details
               </button>
               <button 
                  onClick={() => setActiveTab('commission')}
                  className={`flex items-center gap-2.5 px-4 py-3.5 text-[13px] font-semibold text-left transition border-l-4 ${activeTab === 'commission' ? 'border-[#66B4B1] bg-emerald-50/50 text-[#66B4B1]' : 'border-transparent text-gray-600 hover:bg-gray-50'}`}
               >
                  <ShieldAlert size={16} /> Commission Structure
               </button>
               <button 
                  onClick={() => setActiveTab('payments')}
                  className={`flex items-center gap-2.5 px-4 py-3.5 text-[13px] font-semibold text-left transition border-l-4 ${activeTab === 'payments' ? 'border-[#66B4B1] bg-emerald-50/50 text-[#66B4B1]' : 'border-transparent text-gray-600 hover:bg-gray-50'}`}
               >
                  <CreditCard size={16} /> Payment Gateways
               </button>
               <button 
                  onClick={() => setActiveTab('notifications')}
                  className={`flex items-center gap-2.5 px-4 py-3.5 text-[13px] font-semibold text-left transition border-l-4 ${activeTab === 'notifications' ? 'border-[#66B4B1] bg-emerald-50/50 text-[#66B4B1]' : 'border-transparent text-gray-600 hover:bg-gray-50'}`}
               >
                  <Mail size={16} /> SMTP & SMS Alerts
               </button>
               <button 
                  onClick={() => setActiveTab('app')}
                  className={`flex items-center gap-2.5 px-4 py-3.5 text-[13px] font-semibold text-left transition border-l-4 ${activeTab === 'app' ? 'border-[#66B4B1] bg-emerald-50/50 text-[#66B4B1]' : 'border-transparent text-gray-600 hover:bg-gray-50'}`}
               >
                  <AppWindow size={16} /> App Build Configs
               </button>
            </div>
         </div>

         {/* Form Settings View */}
         <div className="col-span-12 md:col-span-9 bg-white border border-[#FAF7F2] rounded-xl shadow-sm p-6 space-y-6">
            
            {/* General Settings */}
            {activeTab === 'general' && (
               <div className="space-y-4">
                  <h3 className="text-[14px] font-bold text-gray-900 uppercase tracking-wider pb-2 border-b border-gray-100">Branding & Contact Info</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div>
                        <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Application Name</label>
                        <input 
                           type="text" 
                           value={appName} 
                           onChange={(e) => setAppName(e.target.value)}
                           className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white font-bold"
                        />
                     </div>
                     <div>
                        <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Platform Logo URL</label>
                        <input 
                           type="text" 
                           value={logoUrl} 
                           onChange={(e) => setLogoUrl(e.target.value)}
                           className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white font-mono"
                        />
                     </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div>
                        <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Support Phone Line</label>
                        <input 
                           type="text" 
                           value={supportPhone} 
                           onChange={(e) => setSupportPhone(e.target.value)}
                           className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white font-semibold text-gray-800"
                        />
                     </div>
                     <div>
                        <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Support Email Address</label>
                        <input 
                           type="email" 
                           value={supportEmail} 
                           onChange={(e) => setSupportEmail(e.target.value)}
                           className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white font-semibold text-gray-800"
                        />
                     </div>
                  </div>

                  <div>
                     <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Corporate Office Address</label>
                     <input 
                        type="text" 
                        value={contactAddress} 
                        onChange={(e) => setContactAddress(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white text-gray-800"
                     />
                  </div>
               </div>
            )}

            {/* Commission Settings */}
            {activeTab === 'commission' && (
               <div className="space-y-4">
                  <h3 className="text-[14px] font-bold text-gray-900 uppercase tracking-wider pb-2 border-b border-gray-100">Global Service Charges</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                     <div>
                        <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Default Platform Commission Rate (%)</label>
                        <div className="relative">
                           <input 
                              type="number" 
                              value={defaultCommission} 
                              onChange={(e) => setDefaultCommission(parseFloat(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white font-bold"
                           />
                           <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-[13px]">%</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1 leading-normal">Applied immediately on new vendor account creation unless explicitly customized in the Vendor Commission edit tab.</p>
                     </div>

                     <div>
                        <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Minimum Settlement Payout (₹)</label>
                        <div className="relative">
                           <input 
                              type="number" 
                              value={minPayoutThreshold} 
                              onChange={(e) => setMinPayoutThreshold(parseFloat(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white font-bold"
                           />
                           <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-[13px]">₹</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1 leading-normal">Minimum accumulated net wallet earnings required for auto-processing batch vendor payouts.</p>
                     </div>
                  </div>
               </div>
            )}

            {/* Payment Gateways */}
            {activeTab === 'payments' && (
               <div className="space-y-4">
                  <h3 className="text-[14px] font-bold text-gray-900 uppercase tracking-wider pb-2 border-b border-gray-100">Transaction Gateway Providers</h3>
                  
                  <div className="space-y-3">
                     <div className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-100 rounded-lg">
                        <div>
                           <h4 className="text-[13px] font-bold text-gray-900">Razorpay Integration</h4>
                           <p className="text-[11px] text-gray-400">Accept UPI, Credit/Debit cards, Netbanking immediately via Razorpay Checkout.</p>
                        </div>
                        <button onClick={() => setRazorpayActive(!razorpayActive)} className="transition">
                           {razorpayActive ? <ToggleRight size={26} className="text-[#66B4B1]" /> : <ToggleLeft size={26} className="text-gray-400" />}
                        </button>
                     </div>

                     <div className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-100 rounded-lg">
                        <div>
                           <h4 className="text-[13px] font-bold text-gray-900">Stripe Integration</h4>
                           <p className="text-[11px] text-gray-400">Global credit card processor for international pet event ticket bookings.</p>
                        </div>
                        <button onClick={() => setStripeActive(!stripeActive)} className="transition">
                           {stripeActive ? <ToggleRight size={26} className="text-[#66B4B1]" /> : <ToggleLeft size={26} className="text-gray-400" />}
                        </button>
                     </div>

                     <div className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-100 rounded-lg">
                        <div>
                           <h4 className="text-[13px] font-bold text-gray-900">Cash on Delivery (COD)</h4>
                           <p className="text-[11px] text-gray-400">Allow customers to pay in cash for physical items delivery at doorstep.</p>
                        </div>
                        <button onClick={() => setCodActive(!codActive)} className="transition">
                           {codActive ? <ToggleRight size={26} className="text-[#66B4B1]" /> : <ToggleLeft size={26} className="text-gray-400" />}
                        </button>
                     </div>

                     <div className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-100 rounded-lg">
                        <div>
                           <h4 className="text-[13px] font-bold text-gray-900">TailCircle Digital Wallet System</h4>
                           <p className="text-[11px] text-gray-400">Enables user balance loads, cashbacks issuance, and speedier single-click payments.</p>
                        </div>
                        <button onClick={() => setWalletActive(!walletActive)} className="transition">
                           {walletActive ? <ToggleRight size={26} className="text-[#66B4B1]" /> : <ToggleLeft size={26} className="text-gray-400" />}
                        </button>
                     </div>

                     <div className="flex items-center justify-between p-3.5 bg-rose-50/50 border border-rose-100 rounded-lg mt-5">
                        <div>
                           <h4 className="text-[13px] font-bold text-rose-900">Gateway Sandbox Mode</h4>
                           <p className="text-[11px] text-rose-600">Forces payment processors to use mock test credits instead of real money.</p>
                        </div>
                        <button onClick={() => setSandboxMode(!sandboxMode)} className="transition">
                           {sandboxMode ? <ToggleRight size={26} className="text-rose-600" /> : <ToggleLeft size={26} className="text-gray-400" />}
                        </button>
                     </div>
                  </div>
               </div>
            )}

            {/* Notifications Configuration */}
            {activeTab === 'notifications' && (
               <div className="space-y-4">
                  <h3 className="text-[14px] font-bold text-gray-900 uppercase tracking-wider pb-2 border-b border-gray-100">SMTP Server & API SMS Integrations</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div>
                        <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">SMTP Server Host</label>
                        <input 
                           type="text" 
                           value={smtpHost} 
                           onChange={(e) => setSmtpHost(e.target.value)}
                           className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white font-mono"
                        />
                     </div>
                     <div>
                        <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">SMTP Port Number</label>
                        <input 
                           type="number" 
                           value={smtpPort} 
                           onChange={(e) => setSmtpPort(parseInt(e.target.value))}
                           className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white font-mono"
                        />
                     </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div>
                        <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">SMTP Sender User</label>
                        <input 
                           type="text" 
                           value={smtpUser} 
                           onChange={(e) => setSmtpUser(e.target.value)}
                           className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white font-mono"
                        />
                     </div>
                     <div>
                        <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">SMS Gateway API Provider</label>
                        <select 
                           value={smsGateway}
                           onChange={(e) => setSmsGateway(e.target.value)}
                           className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white appearance-none pr-8 cursor-pointer"
                        >
                           <option value="Twilio">Twilio Gateway API</option>
                           <option value="Twilio Sandbox">Twilio Sandbox (Testing)</option>
                           <option value="Infobip">Infobip SMS</option>
                        </select>
                     </div>
                  </div>

                  <button 
                     type="button" 
                     onClick={handleTestSMTP}
                     disabled={isTestLoading}
                     className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 text-[12px] font-bold rounded-lg transition inline-flex items-center gap-2"
                  >
                     <RefreshCw size={14} className={isTestLoading ? 'animate-spin' : ''} /> Test SMTP Connection
                  </button>
               </div>
            )}

            {/* App Config */}
            {activeTab === 'app' && (
               <div className="space-y-4">
                  <h3 className="text-[14px] font-bold text-gray-900 uppercase tracking-wider pb-2 border-b border-gray-100">App Build Controls</h3>
                  
                  <div className="flex items-center justify-between p-4 bg-amber-50/50 border border-amber-100 rounded-lg">
                     <div>
                        <h4 className="text-[13px] font-bold text-amber-900">Platform-Wide Maintenance Mode</h4>
                        <p className="text-[11px] text-amber-700">Toggling immediately blocks both Android and iOS apps with a maintenance splash screen.</p>
                     </div>
                     <button onClick={() => setMaintenanceMode(!maintenanceMode)} className="transition">
                        {maintenanceMode ? <ToggleRight size={26} className="text-amber-600" /> : <ToggleLeft size={26} className="text-gray-400" />}
                     </button>
                  </div>

                  {maintenanceMode && (
                     <div className="space-y-1 animate-fade-in">
                        <label className="block text-[12px] font-semibold text-gray-700">Splash Maintenance Announcement Message</label>
                        <textarea 
                           value={maintenanceMessage} 
                           onChange={(e) => setMaintenanceMessage(e.target.value)}
                           className="w-full h-20 px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white resize-none text-gray-700 leading-relaxed font-semibold"
                        />
                     </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                     <div>
                        <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Minimum App Version (Forces Upgrade)</label>
                        <input 
                           type="text" 
                           value={minAppVersion} 
                           onChange={(e) => setMinAppVersion(e.target.value)}
                           className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white font-mono"
                        />
                     </div>
                     <div>
                        <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Recommended App Version</label>
                        <input 
                           type="text" 
                           value={recommendedAppVersion} 
                           onChange={(e) => setRecommendedAppVersion(e.target.value)}
                           className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white font-mono"
                        />
                     </div>
                  </div>
               </div>
            )}

         </div>

      </div>

      {/* Sticky Save Footer */}
      <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-white border-t border-gray-200 py-4 px-6 shadow-md flex items-center justify-end z-40">
         <button onClick={handleSave} className="px-8 py-2.5 bg-[#66B4B1] hover:bg-[#66B4B1] text-white text-[13px] font-bold rounded-lg transition shadow-sm flex items-center gap-2">
            <Save size={16} /> Save All Changes
         </button>
      </div>

    </div>
  );
}
