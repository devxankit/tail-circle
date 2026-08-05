import React, { useState } from 'react';
import { useShopVendor } from '../context/ShopVendorContext';
import { useToast } from '../components/Toast';
import { updateVendorProfile, changeVendorPassword } from '../../../../services/vendor';
import {
  UserCircle, Store, Shield,
  CheckCircle, Save, Upload, Info, Loader2
} from 'lucide-react';
import { cn } from '../../../user/utils/cn';

export function BusinessControlCenterView() {
  const { profile, setProfile, refresh } = useShopVendor();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('Business Profile');
  const [saving, setSaving] = useState(false);

  const tabs = [
    { id: 'Business Profile', icon: UserCircle },
    { id: 'Store Settings', icon: Store },
    { id: 'Security', icon: Shield },
  ];

  // Store policy fields have no backend store yet — kept as local drafts
  // and labelled as such rather than silently discarded or faked as persisted.
  const [codEnabled, setCodEnabled] = useState(true);
  const [returnsEnabled, setReturnsEnabled] = useState(true);
  const [minOrderValue, setMinOrderValue] = useState(200);

  const [passwords, setPasswords] = useState({ current: '', new: '' });
  const [changingPassword, setChangingPassword] = useState(false);

  const isOnline = profile.status === 'Online';
  const toggleStoreStatus = async () => {
    const nextOnline = !isOnline;
    setProfile(prev => ({ ...prev, status: nextOnline ? 'Online' : 'Offline' }));
    try {
      await updateVendorProfile({ online: nextOnline });
    } catch (err) {
      setProfile(prev => ({ ...prev, status: isOnline ? 'Online' : 'Offline' }));
      addToast({ message: err?.response?.data?.message || 'Could not update store status', type: 'error' });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateVendorProfile({
        businessName: profile.businessName,
        phone: profile.phone,
        logo: profile.logo,
      });
      await refresh();
      addToast({ message: `Profile saved for ${profile.businessName}.`, type: 'success' });
    } catch (err) {
      addToast({ message: err?.response?.data?.message || 'Could not save profile', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!passwords.current || !passwords.new) {
      addToast({ message: 'Please fill in both current and new password fields.', type: 'warning' });
      return;
    }
    if (passwords.new.length < 8) {
      addToast({ message: 'New password must be at least 8 characters.', type: 'error' });
      return;
    }
    setChangingPassword(true);
    try {
      await changeVendorPassword(passwords.current, passwords.new);
      addToast({ message: 'Password updated successfully!', type: 'success' });
      setPasswords({ current: '', new: '' });
    } catch (err) {
      addToast({ message: err?.response?.data?.message || 'Could not update password', type: 'error' });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = () => {
    if (window.confirm('This will submit an account-termination request to the platform admin. Continue?')) {
      addToast({ message: 'There is no automated account-deletion flow yet — email support@tailcircle.com to request termination.', type: 'info', duration: 6000 });
    }
  };

  return (
    <div className="space-y-6 min-h-[800px] flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Business Control Center</h2>
          <p className="text-sm font-semibold text-slate-500 mt-1">Manage your shop profile, preferences, and security.</p>
        </div>
        {activeTab === 'Business Profile' && (
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-60">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6">

        <div className="w-full lg:w-64 shrink-0 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 custom-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition cursor-pointer whitespace-nowrap lg:whitespace-normal",
                activeTab === tab.id ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-500 hover:bg-white/60 hover:text-slate-700"
              )}
            >
              <tab.icon size={18} className={cn(activeTab === tab.id ? "text-orange-500" : "")} />
              {tab.id}
            </button>
          ))}
        </div>

        <div className="flex-1 bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">

          {activeTab === 'Business Profile' && (
            <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">

              <div className={cn("p-4 rounded-2xl flex items-center justify-between", profile.verification === 'Approved' ? "bg-emerald-50 border border-emerald-100" : "bg-amber-50 border border-amber-100")}>
                <div>
                  <h4 className={cn("text-sm font-black flex items-center gap-2", profile.verification === 'Approved' ? "text-emerald-900" : "text-amber-900")}>
                    <CheckCircle size={16} /> {profile.verification === 'Approved' ? 'Verified Vendor' : `Verification: ${profile.verification}`}
                  </h4>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Shop Logo</label>
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 rounded-2xl bg-slate-100 overflow-hidden shadow-inner border border-slate-200 shrink-0">
                    {profile.logo && <img src={profile.logo} alt="Logo" className="w-full h-full object-cover" />}
                  </div>
                  <div>
                    <input
                      type="file"
                      id="logoUpload"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setProfile(prev => ({ ...prev, logo: reader.result }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <button
                      onClick={() => document.getElementById('logoUpload').click()}
                      className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 transition cursor-pointer mb-2"
                    >
                      <Upload size={14} /> Change Logo
                    </button>
                    <p className="text-xs font-semibold text-slate-500">Must be JPEG, PNG, or GIF and cannot exceed 5MB. Click "Save Changes" to persist.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Business Name</label>
                  <input type="text" value={profile.businessName} onChange={(e) => setProfile({...profile, businessName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:border-slate-400 transition" />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Owner Name</label>
                  <input type="text" value={profile.ownerName} disabled className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 cursor-not-allowed" />
                  <p className="text-[11px] text-slate-400">Set from your bank account holder name — contact support to change it.</p>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</label>
                  <input type="email" value={profile.email} disabled className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 cursor-not-allowed" />
                  <p className="text-[11px] text-slate-400">Your login email can't be changed here yet.</p>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Phone Number</label>
                  <input type="text" value={profile.phone} onChange={(e) => setProfile({...profile, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:border-slate-400 transition" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Store Settings' && (
            <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-2xl bg-slate-50">
                <div>
                  <h4 className="text-sm font-black text-slate-900">Accepting New Orders</h4>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">Toggle to temporarily close your store on the app.</p>
                </div>
                <div
                  onClick={toggleStoreStatus}
                  className={cn(
                    "w-12 h-6 rounded-full relative cursor-pointer shadow-inner transition-colors duration-200",
                    isOnline ? "bg-emerald-500" : "bg-slate-350"
                  )}
                >
                  <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200", isOnline ? "right-1" : "left-1")} />
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[13px] text-amber-800">
                  The policies below have no backend store yet — they're a local draft only and aren't enforced against real orders.
                </p>
              </div>

              <div className="space-y-6 pt-4 border-t border-slate-100">
                <h3 className="text-lg font-black text-slate-900">Store Policies (draft)</h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Cash on Delivery (COD)</h4>
                      <p className="text-xs text-slate-500">Allow customers to pay on delivery.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={codEnabled}
                      onChange={(e) => setCodEnabled(e.target.checked)}
                      className="w-5 h-5 accent-slate-900 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Return Policy</h4>
                      <p className="text-xs text-slate-500">Accept returns within 7 days of delivery.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={returnsEnabled}
                      onChange={(e) => setReturnsEnabled(e.target.checked)}
                      className="w-5 h-5 accent-slate-900 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Minimum Order Value (₹)</label>
                  <input
                    type="number"
                    value={minOrderValue}
                    onChange={(e) => setMinOrderValue(Number(e.target.value))}
                    className="w-full md:w-1/2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:border-slate-400 transition"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Security' && (
            <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="space-y-4">
                <h3 className="text-lg font-black text-slate-900">Change Password</h3>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Current Password</label>
                  <input
                    type="password"
                    value={passwords.current}
                    onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:border-slate-400 transition"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">New Password</label>
                  <input
                    type="password"
                    value={passwords.new}
                    onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:border-slate-400 transition"
                  />
                </div>
                <button
                  onClick={handleUpdatePassword}
                  disabled={changingPassword}
                  className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-black transition cursor-pointer disabled:opacity-60 flex items-center gap-2"
                >
                  {changingPassword && <Loader2 size={14} className="animate-spin" />} Update Password
                </button>
              </div>

              <div className="pt-8 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border border-red-100 bg-red-50 rounded-2xl">
                  <div>
                    <h4 className="text-sm font-black text-red-900">Terminate Account</h4>
                    <p className="text-xs font-semibold text-red-700 mt-0.5">Permanently delete your shop account and all data.</p>
                  </div>
                  <button
                    onClick={handleDeleteAccount}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-red-700 transition cursor-pointer shrink-0"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
