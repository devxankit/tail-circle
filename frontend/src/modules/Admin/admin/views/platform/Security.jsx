import React, { useEffect, useState } from 'react';
import { Search, KeyRound, Check, AlertCircle, Save, ToggleLeft, ToggleRight, Lock, Loader2, Info } from 'lucide-react';
import { fetchAdminAuditLogs } from '../../../../../services/admin';

/**
 * Security & audit.
 *
 * The activity log is real — it reads the `AuditLog` collection written by
 * `writeAudit()` on every privileged admin action.
 *
 * There is no IP-blocklist model or request-blocking middleware on the
 * backend, so that panel was removed rather than shipped as a UI that looks
 * functional but blocks nothing. The password/session policy panel below has
 * no backend store either and is labelled as such.
 */
export function Security() {
  const [toastMessage, setToastMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('logs');

  // Security config states
  const [sessionTimeout, setSessionTimeout] = useState('30m');
  const [mfaConfig, setMfaConfig] = useState('Admins Only');
  const [passwordMinLength, setPasswordMinLength] = useState(8);
  const [requireSpecialChar, setRequireSpecialChar] = useState(true);
  const [requireUppercase, setRequireUppercase] = useState(true);
  const [failedAttemptsLimit, setFailedAttemptsLimit] = useState(5);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Real audit trail from GET /admin/audit-logs.
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState('');
  const [logQuery, setLogQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchAdminAuditLogs()
      .then((d) => {
        if (cancelled) return;
        setLogs(
          (Array.isArray(d) ? d : []).map((l) => ({
            id: l.id,
            user: l.actor || 'system',
            action: l.action,
            target: l.targetType ? `${l.targetType}${l.targetId ? ` · ${String(l.targetId).slice(-6)}` : ''}` : '—',
            ip: l.ip || '—',
            date: l.at ? new Date(l.at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—',
            // The audit trail records completed privileged actions, so every
            // entry is by definition a success. Failed logins are not recorded.
            status: 'Success',
          }))
        );
      })
      .catch((e) => !cancelled && setLogsError(e.message || 'Could not load the audit log'))
      .finally(() => !cancelled && setLogsLoading(false));
    return () => { cancelled = true; };
  }, []);

  const visibleLogs = logQuery.trim()
    ? logs.filter((l) => `${l.user} ${l.action} ${l.target} ${l.ip}`.toLowerCase().includes(logQuery.toLowerCase()))
    : logs;

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Success': return 'bg-emerald-100 text-emerald-700';
      case 'Failed': return 'bg-rose-100 text-rose-700 font-bold animate-pulse';
      case 'MFA Required': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleSaveConfigs = () => {
    showToast('Saved to this screen only — no backend policy store exists yet.', 'warning');
  };

  return (
    <div className="p-3 sm:p-6 max-w-[1500px] mx-auto bg-[#FAF7F2] min-h-screen pb-20 relative">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 animate-slide-in-right">
          <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200 flex items-center gap-3">
             {toastMessage.type === 'success' ? (
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><Check size={14}/></div>
             ) : (
                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center"><AlertCircle size={14}/></div>
             )}
             <p className="text-[13px] font-bold text-gray-800">{toastMessage.text}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">Security & Access Auditing</h1>
        <p className="text-[13px] text-gray-500 mt-1">Real admin action audit trail, plus a draft (not yet enforced) password-policy control</p>
      </div>

      {/* Stats — only what the audit trail actually records. Active sessions,
          failed-login counts and a threat score all need tracking this app
          doesn't have, so they are not shown as if they were real. */}
      <div className="grid grid-cols-12 gap-6 mb-8">
         <div className="col-span-12 md:col-span-8 grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm flex flex-col justify-between">
              <h3 className="text-[13px] text-gray-500 font-medium">Audit Entries Logged</h3>
              <p className="text-[26px] font-bold text-gray-900">{logs.length}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm flex flex-col justify-between">
              <h3 className="text-[13px] text-gray-500 font-medium">Unique Actors</h3>
              <p className="text-[26px] font-bold text-emerald-600">{new Set(logs.map((l) => l.user)).size}</p>
            </div>
         </div>

         <div className="col-span-12 md:col-span-4 bg-amber-50 p-5 rounded-xl border border-amber-200 shadow-sm flex flex-col justify-center gap-2">
            <div className="flex items-center gap-2">
               <Info size={15} className="text-amber-600" />
               <h3 className="text-[12px] font-bold text-amber-900 uppercase tracking-wider">Not tracked yet</h3>
            </div>
            <p className="text-[11px] text-amber-800 leading-tight">
               Active session count, failed-login counts and a threat/risk score need
               login-attempt tracking and session storage this app doesn't have yet.
               Nothing here is fabricated to fill the gap.
            </p>
         </div>
      </div>

      {/* Main Container Card */}
      <div className="bg-white rounded-xl shadow-sm border border-[#FAF7F2] overflow-hidden flex flex-col">

         {/* Tabs */}
         <div className="border-b border-gray-200 flex items-center px-4">
            <button
               onClick={() => setActiveTab('logs')}
               className={`flex items-center gap-2 px-6 py-4 text-[14px] font-semibold transition border-b-2 ${activeTab === 'logs' ? 'border-[#66B4B1] text-[#66B4B1]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
               <KeyRound size={18} /> Admin Access Audit Logs
            </button>
            <button
               onClick={() => setActiveTab('configs')}
               className={`flex items-center gap-2 px-6 py-4 text-[14px] font-semibold transition border-b-2 ${activeTab === 'configs' ? 'border-[#66B4B1] text-[#66B4B1]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
               <Lock size={18} /> Security Policies Configuration
            </button>
         </div>

         {/* Access logs tab */}
         {activeTab === 'logs' && (
            <div className="overflow-x-auto min-h-[400px]">
               <div className="p-4 border-b border-[#FAF7F2] flex items-center gap-3">
                  <div className="relative min-w-[260px]">
                     <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                     <input
                        type="text"
                        value={logQuery}
                        onChange={(e) => setLogQuery(e.target.value)}
                        placeholder="Search actor, action, target, IP…"
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1]"
                     />
                  </div>
                  <span className="text-[12px] text-gray-400">{visibleLogs.length} entries</span>
               </div>

               {logsLoading ? (
                  <div className="flex items-center justify-center py-24"><Loader2 size={26} className="animate-spin text-gray-400" /></div>
               ) : logsError ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-2 text-center">
                     <AlertCircle size={26} className="text-amber-500" />
                     <p className="text-[13px] text-gray-600">{logsError}</p>
                  </div>
               ) : !visibleLogs.length ? (
                  <div className="py-24 text-center text-[13px] text-gray-400">
                     {logQuery ? 'No entries match that search.' : 'No admin activity recorded yet.'}
                  </div>
               ) : (
               <table className="w-full text-left border-collapse min-w-[800px] whitespace-nowrap">
                  <thead className="bg-[#FAF7F2] border-b border-[#FAF7F2]">
                     <tr>
                        <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Actor</th>
                        <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Action</th>
                        <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Target</th>
                        <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">IP Address</th>
                        <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Date &amp; Time</th>
                        <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-[#FAF7F2]">
                     {visibleLogs.map(log => (
                        <tr key={log.id} className="hover:bg-[#FAF7F2] transition">
                           <td className="px-5 py-4 text-[13px] font-bold text-gray-900">{log.user}</td>
                           <td className="px-5 py-4">
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[11px] font-mono">
                                 {log.action}
                              </span>
                           </td>
                           <td className="px-5 py-4 text-[13px] text-gray-600">{log.target}</td>
                           <td className="px-5 py-4 text-[13px] font-mono text-gray-700">{log.ip}</td>
                           <td className="px-5 py-4 text-[13px] text-gray-600">{log.date}</td>
                           <td className="px-5 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${getStatusBadgeStyle(log.status)}`}>
                                 {log.status}
                              </span>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
               )}
            </div>
         )}

         {/* Security configs tab */}
         {activeTab === 'configs' && (
            <div className="p-3 sm:p-6 max-w-3xl space-y-6">
               <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                  <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-[13px] text-amber-900">
                     <p className="font-semibold mb-1">Not enforced</p>
                     <p className="text-amber-800">
                        There is no policy store or middleware reading these values on the backend —
                        session timeout, MFA, password rules and the lockout threshold are not applied
                        anywhere yet. "Save" below only shows a confirmation toast; it does not persist.
                     </p>
                  </div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                     <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Session Idle Timeout</label>
                     <select 
                       value={sessionTimeout}
                       onChange={(e) => setSessionTimeout(e.target.value)}
                       className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white appearance-none pr-8 cursor-pointer"
                     >
                        <option value="15m">15 Minutes (Recommended)</option>
                        <option value="30m">30 Minutes</option>
                        <option value="1h">1 Hour</option>
                        <option value="4h">4 Hours</option>
                     </select>
                  </div>

                  <div>
                     <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Multi-Factor Authentication (MFA)</label>
                     <select 
                       value={mfaConfig}
                       onChange={(e) => setMfaConfig(e.target.value)}
                       className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white appearance-none pr-8 cursor-pointer"
                     >
                        <option value="All Staff">Enforce For All Staff & Admins</option>
                        <option value="Admins Only">Enforce For Admins Only</option>
                        <option value="Disabled">Disabled (Not Recommended)</option>
                     </select>
                  </div>
               </div>

               <div className="border-t border-gray-100 pt-5 space-y-4">
                  <h3 className="text-[13px] font-bold text-gray-900 uppercase tracking-wider">Administrative Password Complexity</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                     <div>
                        <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Minimum Length</label>
                        <input 
                           type="number" 
                           value={passwordMinLength} 
                           onChange={(e) => setPasswordMinLength(parseInt(e.target.value))}
                           className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white"
                        />
                     </div>
                     <div className="flex flex-col justify-end">
                        <label className="flex items-center gap-2 text-[13px] text-gray-700 font-semibold cursor-pointer py-2">
                           <button onClick={() => setRequireSpecialChar(!requireSpecialChar)} type="button">
                              {requireSpecialChar ? <ToggleRight size={22} className="text-[#66B4B1]" /> : <ToggleLeft size={22} className="text-gray-400" />}
                           </button>
                           Require Symbols (@#$)
                        </label>
                     </div>
                     <div className="flex flex-col justify-end">
                        <label className="flex items-center gap-2 text-[13px] text-gray-700 font-semibold cursor-pointer py-2">
                           <button onClick={() => setRequireUppercase(!requireUppercase)} type="button">
                              {requireUppercase ? <ToggleRight size={22} className="text-[#66B4B1]" /> : <ToggleLeft size={22} className="text-gray-400" />}
                           </button>
                           Require Uppercase
                        </label>
                     </div>
                  </div>
               </div>

               <div className="border-t border-gray-100 pt-5 space-y-4">
                  <h3 className="text-[13px] font-bold text-gray-900 uppercase tracking-wider">Brute Force Protection Thresholds</h3>
                  
                  <div className="w-1/2">
                     <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Max Failed Login Attempts (Before IP Lock)</label>
                     <input 
                        type="number" 
                        value={failedAttemptsLimit} 
                        onChange={(e) => setFailedAttemptsLimit(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white"
                     />
                  </div>
               </div>

               <button onClick={handleSaveConfigs} className="px-6 py-2.5 bg-[#66B4B1] hover:bg-[#66B4B1] text-white text-[13px] font-semibold rounded-lg transition shadow-sm flex items-center gap-2">
                  <Save size={15} /> Save Policy Configurations
               </button>
            </div>
         )}
      </div>

    </div>
  );
}
