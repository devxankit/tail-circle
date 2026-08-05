import React, { useState } from 'react';
import { usePetEvents } from '../context/PetEventsContext';
import { updateVendorProfile, changeVendorPassword, uploadVendorFile } from '../../../../services/vendor';
import {
  Building2, ShieldCheck,
  Upload, Save, CheckCircle, Loader2
} from 'lucide-react';
import { cn } from '../../../user/utils/cn';

export function BusinessControlCenterView() {
  const { profile, updateProfile, refresh } = usePetEvents();
  const [activeTab, setActiveTab] = useState('profile');

  const [formData, setFormData] = useState({ ...profile });
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = React.useRef(null);

  const [passwords, setPasswords] = useState({ current: '', next: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordDone, setPasswordDone] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = null;
    if (!file) return;
    setUploadingLogo(true);
    try {
      const url = await uploadVendorFile(file, 'vendor-logo');
      setFormData((f) => ({ ...f, logo: url }));
    } catch (err) {
      setSaveError(err?.response?.data?.message || 'Could not upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError('');
    try {
      const updated = await updateVendorProfile({
        businessName: formData.businessName,
        phone: formData.phone,
        address: formData.address,
        logo: formData.logo,
      });
      updateProfile({ businessName: updated.businessName, phone: updated.phone, address: updated.address, logo: updated.logo });
      await refresh();
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      setSaveError(err?.response?.data?.message || 'Could not save profile');
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

  const tabs = [
    { id: 'profile', label: 'Business Profile', icon: Building2 },
    { id: 'security', label: 'Security', icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 flex flex-col md:flex-row gap-6 relative h-full">

      <div className="w-full md:w-64 shrink-0">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-6">Settings</h2>
        <div className="space-y-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition cursor-pointer",
                  activeTab === tab.id ? "bg-slate-900 text-white shadow-lg" : "bg-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6 sm:p-10 min-h-[600px]">

        {activeTab === 'profile' && (
          <div className="max-w-2xl animate-in slide-in-from-right-4">
            <h3 className="text-xl font-black text-slate-900 mb-6">Business Profile</h3>

            {saveError && <div className="mb-4 bg-red-50 border border-red-100 text-red-700 text-sm font-semibold rounded-2xl p-4">{saveError}</div>}

            <form onSubmit={handleSaveProfile} className="space-y-6">

              <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
                <input
                  type="file"
                  ref={logoInputRef}
                  onChange={handleLogoUpload}
                  accept="image/*"
                  className="hidden"
                />
                <div
                  onClick={() => logoInputRef.current?.click()}
                  className="w-24 h-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center text-slate-400 hover:border-orange-500 hover:bg-orange-50 transition cursor-pointer overflow-hidden relative group"
                >
                  {uploadingLogo ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : formData.logo ? (
                    <>
                      <img src={formData.logo} alt="Logo" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <Upload size={20} className="text-white" />
                      </div>
                    </>
                  ) : (
                    <Upload size={24} />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">Brand Logo</h4>
                  <p className="text-xs font-semibold text-slate-500 mb-3">Recommended size 512x512px.</p>
                  <button type="button" onClick={() => logoInputRef.current?.click()} className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition border border-slate-200 cursor-pointer shadow-sm hover:shadow">
                    Change Logo
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Business Name</label>
                  <input
                    type="text" value={formData.businessName} onChange={e => setFormData({...formData, businessName: e.target.value})}
                    className="w-full px-5 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-black text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Account Status</label>
                  <div className={cn("w-full px-5 py-3 text-sm border rounded-xl font-black flex items-center gap-2",
                    formData.verification === 'Approved' ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700")}>
                    <CheckCircle size={16} /> {formData.verification}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Support Email</label>
                  <input
                    type="email" value={formData.email} disabled
                    className="w-full px-5 py-3 text-sm border border-slate-200 bg-slate-100 rounded-xl font-semibold text-slate-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Helpline Phone</label>
                  <input
                    type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-5 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-semibold text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Registered Address</label>
                <input
                  type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}
                  className="w-full px-5 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-semibold text-slate-700"
                />
              </div>

              <div className="pt-6">
                <button type="submit" disabled={isSaving} className="px-8 py-3 bg-[#F87B68] hover:bg-[#F87B68] disabled:opacity-60 text-white text-sm font-bold rounded-xl transition shadow-lg shadow-orange-900/20 flex items-center gap-2 cursor-pointer">
                  {isSaving ? <><Loader2 size={18} className="animate-spin"/> Saving...</> : isSaved ? <><CheckCircle size={18}/> Saved Successfully</> : <><Save size={18}/> Save Profile Updates</>}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="max-w-md animate-in slide-in-from-right-4">
            <h3 className="text-xl font-black text-slate-900 mb-6">Change Password</h3>
            {passwordDone && (
              <div className="mb-3 p-3 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle size={14} /> Password updated.
              </div>
            )}
            {passwordError && (
              <div className="mb-3 p-3 bg-red-50 text-red-700 border border-red-100 rounded-xl text-xs font-semibold">{passwordError}</div>
            )}
            <div className="space-y-3">
              <input
                type="password"
                placeholder="Current password"
                value={passwords.current}
                onChange={(e) => setPasswords(p => ({ ...p, current: e.target.value }))}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 bg-slate-50"
              />
              <input
                type="password"
                placeholder="New password (min 8 chars)"
                value={passwords.next}
                onChange={(e) => setPasswords(p => ({ ...p, next: e.target.value }))}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 bg-slate-50"
              />
              <button
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="w-full py-3 bg-slate-900 hover:bg-black disabled:opacity-60 text-white text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {changingPassword && <Loader2 size={14} className="animate-spin" />} Change Password
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
