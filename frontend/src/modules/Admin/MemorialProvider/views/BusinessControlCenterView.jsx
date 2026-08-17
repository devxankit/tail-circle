import React, { useState } from 'react';
import { useMemorialProvider } from '../context/MemorialProviderContext';
import { updateVendorProfile, changeVendorPassword, uploadVendorFile, addVendorDocument, removeVendorDocument } from '../../../../services/vendor';
import {
  Building2, ShieldCheck, Mail, Phone,
  MapPin, Upload, CheckCircle, Loader2, CreditCard, Trash2
} from 'lucide-react';
import { cn } from '../../../user/utils/cn';

export function BusinessControlCenterView() {
  const { profile, updateProfile, refresh } = useMemorialProvider();

  // Form states
  const [formData, setFormData] = useState({ ...profile });
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const logoInputRef = React.useRef(null);

  // Bank & GST details state
  const [bankData, setBankData] = useState({
    bankName: profile?.bank?.bankName || '',
    accountHolder: profile?.bank?.accountHolder || profile?.businessName || '',
    accountNumber: '',
    ifsc: profile?.bank?.ifsc || '',
    accountType: profile?.bank?.accountType || 'Saving',
  });
  const [gstData, setGstData] = useState({
    hasGst: profile?.gst?.hasGst || false,
    number: profile?.gst?.number || '',
  });
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docKind, setDocKind] = useState('license');

  const [passwords, setPasswords] = useState({ current: '', next: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordDone, setPasswordDone] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleDocUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = null;
    if (!file) return;
    setUploadingDoc(true);
    try {
      const url = await uploadVendorFile(file, 'memorial-kyc');
      await addVendorDocument(docKind, url);
      await refresh();
    } catch (err) {
      setSaveError(err?.response?.data?.message || 'Could not upload document');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDocRemove = async (index) => {
    try {
      await removeVendorDocument(index);
      await refresh();
    } catch (err) {
      setSaveError(err?.response?.data?.message || 'Could not remove document');
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, logo: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError('');
    try {
      const updated = await updateVendorProfile({
        businessName: formData.businessName,
        phone: formData.phone,
        address: formData.address,
        bank: bankData,
        gst: gstData,
      });
      updateProfile({ businessName: updated.businessName, phone: updated.phone, address: updated.address });
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-5xl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Business Control Center</h2>
          <p className="text-sm font-semibold text-slate-500 mt-0.5">Manage your business profile, service areas, and account settings.</p>
        </div>
        <div className="flex gap-3">
          {isSaved && (
            <span className="flex items-center gap-2 text-emerald-600 text-sm font-bold bg-emerald-50 px-4 py-2 rounded-xl animate-in fade-in">
              <CheckCircle size={16} /> Settings Saved
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-slate-900 hover:bg-black disabled:opacity-60 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition shadow-lg cursor-pointer"
          >
            {isSaving && <Loader2 size={14} className="animate-spin" />} Save Profile Updates
          </button>
        </div>
      </div>

      {saveError && <div className="bg-red-50 border border-red-100 text-red-700 text-sm font-semibold rounded-2xl p-4">{saveError}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col - Forms */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Business Profile */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500"><Building2 size={20} /></div>
              <h3 className="text-lg font-black text-slate-900">Business Profile</h3>
            </div>
            
            <div className="p-6 space-y-6">
              
              <div className="flex items-center gap-6">
                <div 
                  className="w-24 h-24 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-slate-400 transition cursor-pointer relative overflow-hidden group"
                  onClick={() => logoInputRef.current?.click()}
                >
                  {formData.logo ? (
                    <>
                      <img src={formData.logo} className="w-full h-full object-cover" alt="Logo" />
                      <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white">
                        <Upload size={20} />
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload size={20} className="mb-1" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-center px-2">Brand Logo</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" ref={logoInputRef} onChange={handleLogoUpload} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">Company Logo</h4>
                  <p className="text-xs font-semibold text-slate-500 max-w-xs">Upload a clear logo. Recommended size: 512x512px. Max 2MB.</p>
                  <button onClick={() => logoInputRef.current?.click()} className="mt-3 px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer">
                    Change Logo
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Business Name</label>
                  <input type="text" name="businessName" value={formData.businessName} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Owner / Manager Name</label>
                  <input type="text" name="ownerName" value={formData.ownerName} disabled className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 cursor-not-allowed" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Support Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="email" name="email" value={formData.email} disabled className="w-full pl-11 pr-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 cursor-not-allowed" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Helpline Phone</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Registered Address</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-4 top-4 text-slate-400" />
                  <textarea name="address" value={formData.address} onChange={handleChange} rows="2" className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"></textarea>
                </div>
              </div>

              {/* BANK & KYC CARD */}
              <div className="pt-6 border-t border-slate-100 space-y-6">
                <div>
                  <h3 className="text-base font-black text-slate-900 mb-1 flex items-center gap-2">
                    <CreditCard size={18} className="text-slate-700" /> Bank Account & Payout Details
                  </h3>
                  <p className="text-xs font-semibold text-slate-500">Required to receive payouts for memorial packages and remembrance services.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Bank Name</label>
                    <input type="text" placeholder="e.g. ICICI Bank" value={bankData.bankName} onChange={e => setBankData({...bankData, bankName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-900" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Account Holder Name</label>
                    <input type="text" placeholder="Name on account" value={bankData.accountHolder} onChange={e => setBankData({...bankData, accountHolder: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-900" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Account Number</label>
                    <input type="text" placeholder="Enter account number" value={bankData.accountNumber} onChange={e => setBankData({...bankData, accountNumber: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-900" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">IFSC Code</label>
                    <input type="text" placeholder="ICIC0001234" value={bankData.ifsc} onChange={e => setBankData({...bankData, ifsc: e.target.value.toUpperCase()})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-900" />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={gstData.hasGst} onChange={e => setGstData({...gstData, hasGst: e.target.checked})} className="accent-slate-900 w-4 h-4" />
                    GSTIN Registered
                  </label>
                  {gstData.hasGst && (
                    <input type="text" placeholder="GSTIN Number" value={gstData.number} onChange={e => setGstData({...gstData, number: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-900 flex-1" />
                  )}
                </div>

                {/* KYC DOCUMENTS */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <h4 className="text-sm font-black text-slate-900">Required KYC Documents</h4>
                  <p className="text-xs font-semibold text-slate-500">Upload Memorial Business Permit & Owner ID for Super Admin verification.</p>

                  <div className="space-y-2">
                    {(profile.documents || []).map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-xs text-slate-900 uppercase tracking-wide">
                            {doc.kind === 'license' ? 'Memorial Permit' : doc.kind === 'clinic_auth' ? 'Premises Auth' : doc.kind === 'owner_id' ? 'Owner ID' : doc.kind === 'gst' ? 'GST Certificate' : doc.kind}
                          </span>
                          <a href={doc.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-blue-600 hover:underline truncate max-w-[160px]">View File</a>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "px-2 py-0.5 text-[10px] font-extrabold uppercase rounded",
                            doc.status === 'Verified' ? "bg-emerald-100 text-emerald-800" : doc.status === 'Rejected' ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
                          )}>
                            {doc.status || 'Pending'}
                          </span>
                          <button onClick={() => handleDocRemove(idx)} className="text-slate-400 hover:text-red-600 transition">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <select value={docKind} onChange={e => setDocKind(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800">
                      <option value="license">Memorial Centre Business Permit</option>
                      <option value="clinic_auth">Premises / Crematorium Authorization</option>
                      <option value="owner_id">Owner ID Proof (Aadhaar/PAN)</option>
                      <option value="gst">GST Registration Certificate</option>
                    </select>

                    <input type="file" id="memorialDocInput" accept="image/*,application/pdf" className="hidden" onChange={handleDocUpload} />
                    <button onClick={() => document.getElementById('memorialDocInput').click()} disabled={uploadingDoc} className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition flex items-center gap-2 disabled:opacity-50">
                      {uploadingDoc ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} {uploadingDoc ? 'Uploading...' : 'Upload'}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Right Col - Security & Verification */}
        <div className="space-y-6">
          
          {/* Verification Status */}
          <div className="bg-slate-900 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-white/5 rounded-full blur-2xl" />
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400"><ShieldCheck size={20} /></div>
              <h3 className="text-lg font-black text-white">Trust & Safety</h3>
            </div>
            
            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <span className="text-xs font-semibold text-slate-400">Account Status</span>
                <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded border ${formData.verification === 'Approved' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>{formData.verification}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-400">GSTIN</span>
                <span className="text-sm font-bold text-white">{formData.gst || '—'}</span>
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-sm font-black text-slate-900 mb-4">Change Password</h3>
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
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 bg-slate-50"
              />
              <input
                type="password"
                placeholder="New password (min 8 chars)"
                value={passwords.next}
                onChange={(e) => setPasswords(p => ({ ...p, next: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 bg-slate-50"
              />
              <button
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="w-full py-2.5 bg-slate-900 hover:bg-black disabled:opacity-60 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2"
              >
                {changingPassword && <Loader2 size={12} className="animate-spin" />} Change Password
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
