import React, { useState } from 'react';
import { useShopVendor } from '../context/ShopVendorContext';
import { useToast } from '../components/Toast';
import { updateVendorProfile, changeVendorPassword, uploadVendorFile, addVendorDocument, removeVendorDocument } from '../../../../services/vendor';
import { createSupportTicket } from '../../../../services/support';
import {
  UserCircle, Store, Shield, Building2,
  CheckCircle, Save, Upload, Info, Loader2, Trash2
} from 'lucide-react';
import { cn } from '../../../user/utils/cn';
import {
  ChipTabs, FormSection, StickyActionBar, PrimaryButton, StatusBadge, Toggle, Checkbox,
  fieldClass, labelClass, useConfirm,
} from '../../vendor/mobile';

export function BusinessControlCenterView() {
  const { profile, setProfile, refresh } = useShopVendor();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('Business Profile');
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docKind, setDocKind] = useState('license');
  const confirm = useConfirm();

  const tabs = [
    { id: 'Business Profile', icon: UserCircle },
    { id: 'Bank & KYC Verification', icon: Building2 },
    { id: 'Store Settings', icon: Store },
    { id: 'Security', icon: Shield },
  ];

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

  // Store policy fields draft state
  const [codEnabled, setCodEnabled] = useState(profile?.policies?.codEnabled ?? true);
  const [returnsEnabled, setReturnsEnabled] = useState(profile?.policies?.returnsEnabled ?? true);
  const [minOrderValue, setMinOrderValue] = useState(profile?.policies?.minOrderValue ?? 0);

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
        bank: bankData,
        gst: gstData,
        policies: {
          codEnabled,
          returnsEnabled,
          minOrderValue,
        },
      });
      await refresh();
      addToast({ message: `Settings saved successfully.`, type: 'success' });
    } catch (err) {
      addToast({ message: err?.response?.data?.message || 'Could not save profile', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = null;
    if (!file) return;
    setUploadingLogo(true);
    try {
      const url = await uploadVendorFile(file, 'vendor-logo');
      setProfile(prev => ({ ...prev, logo: url }));
      addToast({ message: 'Logo uploaded! Click Save Changes to apply.', type: 'info' });
    } catch (err) {
      addToast({ message: err?.response?.data?.message || 'Could not upload logo', type: 'error' });
    } finally {
      setUploadingLogo(false);
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

  /*
   * There is no self-serve deletion on the backend, so this files the request
   * the dialog promises: a support ticket the admin team acts on, which the
   * partner can follow under Client support.
   */
  const handleDeleteAccount = async () => {
    if (!(await confirm({ title: 'Terminate account?', message: 'This will submit an account-termination request to the platform admin. Continue?', confirmLabel: 'Continue', danger: true }))) return;
    try {
      await createSupportTicket({
        subject: 'Account termination request',
        category: 'account',
        message: `Please permanently close the shop account "${profile?.businessName || ''}" (${profile?.email || 'no email on file'}) and delete its data.`,
      });
      addToast({ message: 'Termination request sent. Track it under Client support.', type: 'success', duration: 5000 });
    } catch (err) {
      addToast({ message: err?.message || 'Could not send the termination request.', type: 'error' });
    }
  };

  const handleDocUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = null;
    if (!file) return;
    setUploadingDoc(true);
    try {
      const url = await uploadVendorFile(file, 'vendor-kyc');
      await addVendorDocument(docKind, url);
      await refresh();
      addToast({ message: 'Document uploaded for admin verification!', type: 'success' });
    } catch (err) {
      addToast({ message: err?.response?.data?.message || 'Could not upload document', type: 'error' });
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDocRemove = async (index) => {
    try {
      await removeVendorDocument(index);
      await refresh();
      addToast({ message: 'Document removed.', type: 'info' });
    } catch (err) {
      addToast({ message: err?.response?.data?.message || 'Could not remove document', type: 'error' });
    }
  };

  const disabledField = 'w-full h-12 rounded-xl border border-border-light bg-bg-primary px-4 text-[16px] text-text-secondary cursor-not-allowed';

  return (
    <div className="space-y-4">
      <p className="text-xs text-text-secondary px-1">Manage your shop profile, preferences, and security.</p>

      {/* The vertical tab rail, as chips. */}
      <ChipTabs
        items={tabs.map((t) => ({ key: t.id, label: t.id, icon: t.icon }))}
        activeKey={activeTab}
        onSelect={setActiveTab}
      />

      {activeTab === 'Business Profile' && (
        <div className="space-y-4">
          <div className={cn("p-4 rounded-[20px] flex items-center gap-2 border", profile.verification === 'Approved' ? "bg-success/10 border-success/25" : "bg-warning/10 border-warning/25")}>
            <CheckCircle size={16} className={profile.verification === 'Approved' ? 'text-success' : 'text-warning'} />
            <h4 className="text-sm font-black text-text-primary">
              {profile.verification === 'Approved' ? 'Verified Vendor' : `Verification: ${profile.verification || profile.approvalStatus}`}
            </h4>
          </div>

          <FormSection title="Shop Logo">
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-2xl bg-bg-primary overflow-hidden border border-border-light shrink-0">
                {profile.logo && <img src={profile.logo} alt="Logo" className="w-full h-full object-cover" />}
              </div>
              <div className="min-w-0">
                <input
                  type="file"
                  id="logoUpload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleLogoUpload}
                />
                <button
                  onClick={() => document.getElementById('logoUpload').click()}
                  disabled={uploadingLogo}
                  className="min-h-[44px] flex items-center gap-2 bg-white border border-border-light text-text-primary px-4 rounded-xl text-sm font-bold shadow-sm transition cursor-pointer mb-2 disabled:opacity-50"
                >
                  {uploadingLogo ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Change Logo
                </button>
                <p className="text-xs font-semibold text-text-secondary">Must be JPEG, PNG, or GIF and cannot exceed 5MB. Tap "Save Changes" to persist.</p>
              </div>
            </div>
          </FormSection>

          <FormSection title="Business details">
            <div>
              <label className={labelClass}>Business Name</label>
              <input type="text" value={profile.businessName} onChange={(e) => setProfile({...profile, businessName: e.target.value})} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Owner Name</label>
              <input type="text" value={profile.ownerName || profile.businessName} disabled className={disabledField} />
              <p className="text-[11px] text-text-secondary mt-1.5">Set from your bank account holder name.</p>
            </div>
            <div>
              <label className={labelClass}>Email Address</label>
              <input type="email" value={profile.email} disabled className={disabledField} />
              <p className="text-[11px] text-text-secondary mt-1.5">Your login email can't be changed here yet.</p>
            </div>
            <div>
              <label className={labelClass}>Phone Number</label>
              <input type="tel" inputMode="tel" value={profile.phone} onChange={(e) => setProfile({...profile, phone: e.target.value})} className={fieldClass} />
            </div>
          </FormSection>
        </div>
      )}

      {activeTab === 'Bank & KYC Verification' && (
        <div className="space-y-4">
          <FormSection title="Bank Account & Payout Details" description="Required to receive automated earnings settlements.">
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
              <input type="text" inputMode="numeric" placeholder="Enter bank account number" value={bankData.accountNumber} onChange={e => setBankData({...bankData, accountNumber: e.target.value})} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>IFSC Code</label>
              <input type="text" placeholder="HDFC0001234" value={bankData.ifsc} onChange={e => setBankData({...bankData, ifsc: e.target.value.toUpperCase()})} className={fieldClass} />
            </div>

            <div className="pt-3 border-t border-border-light space-y-3">
              <Checkbox label="Registered for GSTIN" checked={gstData.hasGst} onChange={(v) => setGstData({...gstData, hasGst: v})} />
              {gstData.hasGst && (
                <input type="text" placeholder="GSTIN Number (15 digits)" value={gstData.number} onChange={e => setGstData({...gstData, number: e.target.value})} className={fieldClass} />
              )}
            </div>
          </FormSection>

          <FormSection title="Required KYC Documents" description="Upload mandatory documents for Super Admin verification.">
            <div className="space-y-2">
              {(profile.documents || []).map((doc, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-bg-primary border border-border-light rounded-xl">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-text-primary uppercase tracking-wide">
                      {doc.kind === 'license' ? 'Shop / Trade License' : doc.kind === 'owner_id' ? 'Owner Identity Card' : doc.kind === 'gst' ? 'GST Certificate' : doc.kind}
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
              <option value="license">Shop / Trade License</option>
              <option value="owner_id">Owner ID Proof (Aadhaar/PAN)</option>
              <option value="gst">GST Registration Certificate</option>
            </select>

            <input type="file" id="shopDocInput" accept="image/*,application/pdf" className="hidden" onChange={handleDocUpload} />
            <button onClick={() => document.getElementById('shopDocInput').click()} disabled={uploadingDoc} className="w-full h-12 bg-text-primary text-white text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50">
              {uploadingDoc ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} {uploadingDoc ? 'Uploading...' : 'Upload File'}
            </button>
          </FormSection>
        </div>
      )}

      {activeTab === 'Store Settings' && (
        <div className="space-y-4">
          <div className="bg-white border border-border-light rounded-[20px] shadow-sm px-4 py-2">
            <Toggle
              label="Accepting New Orders"
              hint="Toggle to temporarily close your store on the app."
              checked={isOnline}
              onChange={toggleStoreStatus}
            />
          </div>

          <FormSection title="Store Delivery & Return Policies">
            <div className="divide-y divide-border-light -my-2">
              <Toggle
                label="Cash on Delivery (COD)"
                hint="Allow customers to pay on delivery."
                checked={codEnabled}
                onChange={setCodEnabled}
                className="py-2"
              />
              <Toggle
                label="Return Policy"
                hint="Accept returns within 7 days of delivery."
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

      {activeTab === 'Security' && (
        <div className="space-y-4">
          <FormSection title="Change Password">
            <div>
              <label className={labelClass}>Current Password</label>
              <input
                type="password"
                autoComplete="current-password"
                value={passwords.current}
                onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                placeholder="••••••••"
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>New Password</label>
              <input
                type="password"
                autoComplete="new-password"
                value={passwords.new}
                onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                placeholder="••••••••"
                className={fieldClass}
              />
            </div>
            <PrimaryButton tone="dark" className="w-full" onClick={handleUpdatePassword} disabled={changingPassword} loading={changingPassword}>
              Update Password
            </PrimaryButton>
          </FormSection>

          <div className="p-4 border border-error/25 bg-error/5 rounded-[20px]">
            <h4 className="text-sm font-black text-error">Terminate Account</h4>
            <p className="text-xs font-semibold text-text-secondary mt-0.5">Permanently delete your shop account and all data.</p>
            <button
              onClick={handleDeleteAccount}
              className="mt-3 w-full h-11 bg-error text-white rounded-xl text-sm font-bold shadow-sm transition cursor-pointer"
            >
              Delete Account
            </button>
          </div>
        </div>
      )}

      {/* Save covers the same three tabs it did before; Security keeps its own button. */}
      {(activeTab === 'Business Profile' || activeTab === 'Store Settings' || activeTab === 'Bank & KYC Verification') && (
        <StickyActionBar>
          <PrimaryButton onClick={handleSave} disabled={saving} loading={saving} icon={Save}>
            Save Changes
          </PrimaryButton>
        </StickyActionBar>
      )}
    </div>
  );
}
