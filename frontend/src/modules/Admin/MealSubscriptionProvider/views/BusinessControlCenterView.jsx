import React, { useState } from 'react';
import { useMealProvider } from '../context/MealProviderContext';
import { updateVendorProfile, changeVendorPassword } from '../../../../services/vendor';
import { Building2, ShieldCheck, Upload, Save, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '../../../user/utils/cn';

export function BusinessControlCenterView() {
  const { profile, updateProfile, refresh } = useMealProvider();
  const [activeTab, setActiveTab] = useState('profile');

  // Profile Form State
  const [formData, setFormData] = useState({
    businessName: profile.businessName || '',
    phone: profile.phone || '',
    address: profile.address || ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [error, setError] = useState('');

  const [passwords, setPasswords] = useState({ current: '', next: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordDone, setPasswordDone] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const navItems = [
    { id: 'profile', label: 'Business Profile', icon: <Building2 size={18} /> },
    { id: 'security', label: 'Security & Access', icon: <ShieldCheck size={18} /> },
  ];

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setError('');
    try {
      const updated = await updateVendorProfile(formData);
      updateProfile({ businessName: updated.businessName, phone: updated.phone, address: updated.address });
      await refresh();
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    if (!passwords.current || passwords.next.length < 8) {
      setPasswordError('Enter your current password and a new one of at least 8 characters.');
      return;
    }
    setChangingPassword(true);
    try {
      await changeVendorPassword(passwords.current, passwords.next);
      setPasswords({ current: '', next: '' });
      setPasswordDone(true);
      setTimeout(() => setPasswordDone(false), 3000);
    } catch (err) {
      setPasswordError(err?.response?.data?.message || 'Could not change password');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col pb-10 relative">
      
      {/* Success Toast */}
      <div className={cn(
        "fixed top-6 right-6 bg-emerald-50 text-emerald-700 px-6 py-4 rounded-2xl border border-emerald-200 shadow-xl z-50 flex items-center gap-3 transition-all duration-500 transform",
        showToast ? "translate-y-0 opacity-100" : "-translate-y-8 opacity-0 pointer-events-none"
      )}>
        <CheckCircle size={20} className="text-emerald-500" />
        <p className="font-bold text-sm">Profile updated successfully!</p>
      </div>

      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] shrink-0">
        <h2 className="text-xl font-black text-gray-900 tracking-tight">Business Control Center</h2>
        <p className="text-sm font-semibold text-gray-500 mt-0.5">Manage your entire enterprise platform settings.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 flex-1">
        
        {/* Left Navigation */}
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
          {navItems.map(item => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex items-center gap-3 px-5 py-3.5 rounded-2xl transition text-sm font-bold text-left cursor-pointer",
                activeTab === item.id 
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20" 
                  : "bg-white border border-gray-100 text-gray-600 hover:text-gray-900 hover:border-gray-200 hover:bg-gray-50 shadow-sm"
              )}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] min-h-[500px] overflow-hidden">
          
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="p-8 space-y-8 animate-in fade-in">
              {error && <div className="bg-red-50 border border-red-100 text-red-700 text-sm font-semibold rounded-2xl p-4">{error}</div>}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-gray-100 pb-6 gap-4">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-300 relative overflow-hidden">
                    <Upload size={24} className="mb-2" />
                    <span className="text-[9px] font-bold uppercase text-center px-1">Logo upload not available here yet</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900">{profile.businessName}</h3>
                    <p className="text-sm font-medium text-gray-500 mt-1 flex items-center gap-1">Status: <CheckCircle size={14} className="text-emerald-500"/> <span className="text-emerald-600 font-bold">{profile.verification}</span></p>
                  </div>
                </div>
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="px-6 py-3 bg-[#F87B68] text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-[#F87B68] transition shadow-lg shadow-orange-900/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Saving...</>
                  ) : (
                    <><Save size={16} /> Save Changes</>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Business Name</label>
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={e => setFormData({...formData, businessName: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:border-[#F87B68] focus:ring-2 focus:ring-[#F87B68]/20 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Business Email</label>
                  <input
                    type="email"
                    value={profile.email || ''}
                    disabled
                    className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm font-bold text-gray-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Support Phone</label>
                  <input 
                    type="text" 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})} 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:border-[#F87B68] focus:ring-2 focus:ring-[#F87B68]/20 transition" 
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Kitchen Address</label>
                  <input 
                    type="text" 
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})} 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:border-[#F87B68] focus:ring-2 focus:ring-[#F87B68]/20 transition" 
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'security' && (
            <div className="p-8 space-y-8 animate-in fade-in">
              <h3 className="text-lg font-black text-gray-900 border-b border-gray-100 pb-4">Security & Access</h3>
              
              {passwordDone && (
                <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle size={14} /> Password updated.
                </div>
              )}
              {passwordError && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-100 rounded-xl text-xs font-semibold">{passwordError}</div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                <input
                  type="password"
                  placeholder="Current password"
                  value={passwords.current}
                  onChange={(e) => setPasswords(p => ({ ...p, current: e.target.value }))}
                  className="px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#F87B68] focus:ring-2 focus:ring-[#F87B68]/20 bg-gray-50"
                />
                <input
                  type="password"
                  placeholder="New password (min 8 chars)"
                  value={passwords.next}
                  onChange={(e) => setPasswords(p => ({ ...p, next: e.target.value }))}
                  className="px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#F87B68] focus:ring-2 focus:ring-[#F87B68]/20 bg-gray-50"
                />
              </div>
              <button
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="px-5 py-2.5 bg-gray-900 hover:bg-black disabled:opacity-60 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2"
              >
                {changingPassword && <Loader2 size={14} className="animate-spin" />} Change Password
              </button>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
