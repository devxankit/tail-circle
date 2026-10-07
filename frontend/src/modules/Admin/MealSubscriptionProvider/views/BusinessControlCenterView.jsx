import React, { useState } from 'react';
import { useMealProvider } from '../context/MealProviderContext';
import { updateVendorProfile, changeVendorPassword, uploadVendorFile, addVendorDocument, removeVendorDocument } from '../../../../services/vendor';
import { Building2, ShieldCheck, Upload, Save, CheckCircle, Loader2, Store, CreditCard, Trash2 } from 'lucide-react';
import { cn } from '../../../user/utils/cn';
import {
  ChipTabs, FormSection, StickyActionBar, PrimaryButton, StatusBadge, Checkbox, Toggle, InlineError,
  fieldClass, labelClass,
} from '../../vendor/mobile';

export function BusinessControlCenterView() {
  const { profile, updateProfile, refresh } = useMealProvider();
  const [activeTab, setActiveTab] = useState('profile');

  // Sync profile edits with state
  const [formData, setFormData] = useState({
    businessName: profile.businessName || '',
    phone: profile.phone || '',
    address: profile.address || '',
    logo: profile.logo || '',
  });
  const [codEnabled, setCodEnabled] = useState(profile?.policies?.codEnabled ?? true);
  const [returnsEnabled, setReturnsEnabled] = useState(profile?.policies?.returnsEnabled ?? true);
  const [minOrderValue, setMinOrderValue] = useState(profile?.policies?.minOrderValue ?? 0);

  // Bank & GST state
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

  // Re-sync form state if profile updates asynchronously
  React.useEffect(() => {
    setFormData({
      businessName: profile.businessName || '',
      phone: profile.phone || '',
      address: profile.address || '',
      logo: profile.logo || '',
    });
    if (profile?.policies) {
      setCodEnabled(profile.policies.codEnabled ?? true);
      setReturnsEnabled(profile.policies.returnsEnabled ?? true);
      setMinOrderValue(profile.policies.minOrderValue ?? 0);
    }
  }, [profile]);

  const [isSaving, setIsSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [error, setError] = useState('');

  const [passwords, setPasswords] = useState({ current: '', next: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordDone, setPasswordDone] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const isOnline = profile.status === 'Online';
  const toggleStoreStatus = async () => {
    const nextOnline = !isOnline;
    updateProfile({ status: nextOnline ? 'Online' : 'Offline' });
    try {
      await updateVendorProfile({ online: nextOnline });
    } catch (err) {
      updateProfile({ status: isOnline ? 'Online' : 'Offline' });
    }
  };

  const navItems = [
    { id: 'profile', label: 'Business Profile', icon: <Building2 size={18} /> },
    { id: 'bank_kyc', label: 'Bank & KYC Verification', icon: <CreditCard size={18} /> },
    { id: 'settings', label: 'Kitchen & Policies', icon: <Store size={18} /> },
    { id: 'security', label: 'Security & Access', icon: <ShieldCheck size={18} /> },
  ];

  const handleDocUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = null;
    if (!file) return;
    setUploadingDoc(true);
    try {
      const url = await uploadVendorFile(file, 'meal-kyc');
      await addVendorDocument(docKind, url);
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Could not upload document');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDocRemove = async (index) => {
    try {
      await removeVendorDocument(index);
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Could not remove document');
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = null;
    if (!file) return;
    setUploadingLogo(true);
    try {
      const url = await uploadVendorFile(file, 'meal-logos');
      setFormData(prev => ({ ...prev, logo: url }));
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Could not upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setError('');
    try {
      const updated = await updateVendorProfile({
        ...formData,
        bank: bankData,
        gst: gstData,
        policies: { codEnabled, returnsEnabled, minOrderValue },
      });
      updateProfile({ businessName: updated.businessName, phone: updated.phone, address: updated.address, logo: updated.logo });
      await refresh();
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Could not save profile');
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
      setPasswordError(err?.response?.data?.message || err?.message || 'Could not change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const disabledField = 'w-full h-12 rounded-xl border border-border-light bg-bg-primary px-4 text-[16px] text-text-secondary cursor-not-allowed';

  return (
    <div className="space-y-4">

      {/* Success toast — the same message and timing, as the app's centred pill. */}
      <div
        className={cn(
          "fixed left-4 right-4 z-[90] flex justify-center pointer-events-none transition-all duration-500",
          showToast ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        )}
        style={{ bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="bg-text-primary text-white px-5 py-3 rounded-full shadow-xl flex items-center gap-2.5">
          <CheckCircle size={18} className="text-success" />
          <p className="font-bold text-[13px]">Settings updated successfully!</p>
        </div>
      </div>

      <p className="text-xs text-text-secondary px-1">Manage your kitchen profile, delivery policies, and security.</p>

      {/* The vertical tab rail, as chips. */}
      <ChipTabs
        items={navItems.map((item) => ({ key: item.id, label: item.label }))}
        activeKey={activeTab}
        onSelect={setActiveTab}
      />

      {/* PROFILE TAB */}
      {activeTab === 'profile' && (
        <div className="space-y-4">
          <InlineError>{error}</InlineError>
          <FormSection>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 bg-bg-primary border border-border-light rounded-2xl flex flex-col items-center justify-center text-text-secondary relative overflow-hidden shrink-0">
                {formData.logo ? (
                  <img src={formData.logo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Upload size={24} />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-black text-text-primary truncate">{profile.businessName}</h3>
                <p className="text-xs font-medium text-text-secondary mt-1 flex items-center gap-1 flex-wrap">Status: <StatusBadge label={profile.verification} tone="success" /></p>
                <input type="file" id="kitchenLogo" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                <button
                  onClick={() => document.getElementById('kitchenLogo').click()}
                  disabled={uploadingLogo}
                  className="mt-2 min-h-[44px] px-3 bg-white border border-border-light text-text-primary rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {uploadingLogo ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Change Kitchen Logo
                </button>
              </div>
            </div>
          </FormSection>

          <FormSection title="Business details">
            <div>
              <label className={labelClass}>Business Name</label>
              <input
                type="text"
                value={formData.businessName}
                onChange={e => setFormData({...formData, businessName: e.target.value})}
                className={cn(fieldClass, 'font-bold')}
              />
            </div>
            <div>
              <label className={labelClass}>Business Email</label>
              <input type="email" value={profile.email || ''} disabled className={disabledField} />
            </div>
            <div>
              <label className={labelClass}>Support Phone</label>
              <input
                type="tel"
                inputMode="tel"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Kitchen Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
                className={fieldClass}
              />
            </div>
          </FormSection>
        </div>
      )}

      {/* BANK & KYC VERIFICATION TAB */}
      {activeTab === 'bank_kyc' && (
        <div className="space-y-4">
          <InlineError>{error}</InlineError>
          <FormSection title="Bank Account & Payout Details" description="Required to receive meal subscription payouts.">
            <div>
              <label className={labelClass}>Bank Name</label>
              <input type="text" placeholder="e.g. HDFC Bank" value={bankData.bankName} onChange={e => setBankData({...bankData, bankName: e.target.value})} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Account Holder Name</label>
              <input type="text" placeholder="Full name on bank account" value={bankData.accountHolder} onChange={e => setBankData({...bankData, accountHolder: e.target.value})} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Account Number</label>
              <input type="text" inputMode="numeric" placeholder="Enter account number" value={bankData.accountNumber} onChange={e => setBankData({...bankData, accountNumber: e.target.value})} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>IFSC Code</label>
              <input type="text" placeholder="HDFC0001234" value={bankData.ifsc} onChange={e => setBankData({...bankData, ifsc: e.target.value.toUpperCase()})} className={fieldClass} />
            </div>

            <div className="pt-3 border-t border-border-light space-y-3">
              <Checkbox label="GSTIN Registered" checked={gstData.hasGst} onChange={(v) => setGstData({...gstData, hasGst: v})} />
              {gstData.hasGst && (
                <input type="text" placeholder="GSTIN Number (15 digits)" value={gstData.number} onChange={e => setGstData({...gstData, number: e.target.value})} className={fieldClass} />
              )}
            </div>
          </FormSection>

          <FormSection title="Required KYC Documents" description="Upload FSSAI License, Kitchen Permit & Owner ID for Super Admin approval.">
            <div className="space-y-2">
              {(profile.documents || []).map((doc, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-bg-primary border border-border-light rounded-xl">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-text-primary uppercase tracking-wide">
                      {doc.kind === 'license' ? 'FSSAI / Food License' : doc.kind === 'clinic_auth' ? 'Kitchen Permit' : doc.kind === 'owner_id' ? 'Owner ID Proof' : doc.kind === 'gst' ? 'GST Certificate' : doc.kind}
                    </p>
                    <a href={doc.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#4C8684] underline">View Document</a>
                  </div>
                  <StatusBadge status={doc.status || 'Pending'} />
                  <button onClick={() => handleDocRemove(idx)} aria-label="Remove document" className="w-10 h-10 rounded-xl flex items-center justify-center text-error bg-error/5 shrink-0">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              {(!profile.documents || profile.documents.length === 0) && (
                <p className="text-xs text-text-disabled font-medium py-2">No KYC documents uploaded yet.</p>
              )}
            </div>

            <select value={docKind} onChange={e => setDocKind(e.target.value)} className={fieldClass}>
              <option value="license">FSSAI Food License</option>
              <option value="clinic_auth">Kitchen Premises / Sanitary Permit</option>
              <option value="owner_id">Owner ID Proof (Aadhaar/PAN)</option>
              <option value="gst">GST Registration Certificate</option>
            </select>

            <input type="file" id="mealDocInput" accept="image/*,application/pdf" className="hidden" onChange={handleDocUpload} />
            <button onClick={() => document.getElementById('mealDocInput').click()} disabled={uploadingDoc} className="w-full h-12 bg-text-primary text-white text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50">
              {uploadingDoc ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} {uploadingDoc ? 'Uploading...' : 'Upload File'}
            </button>
          </FormSection>
        </div>
      )}

      {/* KITCHEN & POLICIES TAB */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          <div className="bg-white border border-border-light rounded-[20px] shadow-sm px-4 py-2">
            <Toggle
              label="Accepting Meal Subscriptions"
              hint="Toggle to temporarily pause new meal subscriptions on the platform."
              checked={isOnline}
              onChange={toggleStoreStatus}
            />
          </div>

          <FormSection title="Kitchen & Delivery Policies">
            <div className="divide-y divide-border-light -my-2">
              <Toggle
                label="Cash on Delivery (COD)"
                hint="Allow customers to pay on delivery for trial meals and plan renewals."
                checked={codEnabled}
                onChange={setCodEnabled}
                className="py-2"
              />
              <Toggle
                label="Flex Return Policy"
                hint="Accept trial refunds or plan adjustments within 7 days."
                checked={returnsEnabled}
                onChange={setReturnsEnabled}
                className="py-2"
              />
            </div>

            <div>
              <label className={labelClass}>Minimum Order Value (₹)</label>
              <input
                type="number"
                inputMode="decimal"
                value={minOrderValue}
                onChange={(e) => setMinOrderValue(Number(e.target.value))}
                className={fieldClass}
              />
            </div>
          </FormSection>
        </div>
      )}

      {/* SECURITY TAB */}
      {activeTab === 'security' && (
        <FormSection title="Security & Access">
          {passwordDone && (
            <div className="p-3 bg-success/10 text-success border border-success/20 rounded-xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle size={14} /> Password updated.
            </div>
          )}
          <InlineError>{passwordError}</InlineError>
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Current password"
            value={passwords.current}
            onChange={(e) => setPasswords(p => ({ ...p, current: e.target.value }))}
            className={fieldClass}
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="New password (min 8 chars)"
            value={passwords.next}
            onChange={(e) => setPasswords(p => ({ ...p, next: e.target.value }))}
            className={fieldClass}
          />
          <PrimaryButton tone="dark" className="w-full" onClick={handleChangePassword} disabled={changingPassword} loading={changingPassword}>
            Change Password
          </PrimaryButton>
        </FormSection>
      )}

      {/* Save covers the same two tabs it did before. */}
      {(activeTab === 'profile' || activeTab === 'settings') && (
        <StickyActionBar>
          <PrimaryButton onClick={handleSaveProfile} disabled={isSaving} loading={isSaving} icon={Save}>
            Save Changes
          </PrimaryButton>
        </StickyActionBar>
      )}

    </div>
  );
}
