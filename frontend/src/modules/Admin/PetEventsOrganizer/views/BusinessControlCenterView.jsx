import React, { useState } from 'react';
import { usePetEvents } from '../context/PetEventsContext';
import { updateVendorProfile, changeVendorPassword, uploadVendorFile, addVendorDocument, removeVendorDocument } from '../../../../services/vendor';
import {
  Building2, ShieldCheck,
  Upload, Save, CheckCircle, Loader2, CreditCard, Trash2
} from 'lucide-react';
import { cn } from '../../../user/utils/cn';
import {
  SegmentedTabs, FormSection, StickyActionBar, PrimaryButton, StatusBadge, Checkbox, InlineError,
  fieldClass, labelClass,
} from '../../vendor/mobile';

export function BusinessControlCenterView() {
  const { profile, updateProfile, refresh } = usePetEvents();
  const [activeTab, setActiveTab] = useState('profile');

  const [formData, setFormData] = useState({ ...profile });
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
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
      const url = await uploadVendorFile(file, 'events-kyc');
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
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveError('');
    try {
      const updated = await updateVendorProfile({
        businessName: formData.businessName,
        phone: formData.phone,
        address: formData.address,
        logo: formData.logo,
        bank: bankData,
        gst: gstData,
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
    { id: 'bank_kyc', label: 'Bank & KYC Verification', icon: CreditCard },
    { id: 'security', label: 'Security', icon: ShieldCheck },
  ];

  const disabledField = 'w-full h-12 rounded-xl border border-border-light bg-bg-primary px-4 text-[16px] text-text-secondary cursor-not-allowed';

  return (
    <div className="space-y-4">

      {/* The vertical tab rail, as segments. */}
      <SegmentedTabs
        items={tabs.map((t) => ({ key: t.id, label: t.id === 'bank_kyc' ? 'Bank & KYC' : t.id === 'profile' ? 'Profile' : t.label }))}
        activeKey={activeTab}
        onSelect={setActiveTab}
      />

      {activeTab === 'profile' && (
        <form id="events-profile-form" onSubmit={handleSaveProfile} className="space-y-4">
          <InlineError>{saveError}</InlineError>

          <FormSection title="Business Profile">
            <div className="flex items-center gap-4">
              <input
                type="file"
                ref={logoInputRef}
                onChange={handleLogoUpload}
                accept="image/*"
                className="hidden"
              />
              <div
                onClick={() => logoInputRef.current?.click()}
                className="w-24 h-24 bg-bg-primary border-2 border-dashed border-border-light rounded-3xl flex items-center justify-center text-text-secondary transition cursor-pointer overflow-hidden relative shrink-0"
              >
                {uploadingLogo ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : formData.logo ? (
                  <img src={formData.logo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Upload size={24} />
                )}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-black text-text-primary">Brand Logo</h4>
                <p className="text-xs font-semibold text-text-secondary mb-2">Recommended size 512x512px.</p>
                <button type="button" onClick={() => logoInputRef.current?.click()} className="min-h-[44px] px-4 bg-white text-text-primary text-xs font-bold rounded-xl transition border border-border-light cursor-pointer shadow-sm flex items-center gap-1.5">
                  <Upload size={14} /> Change Logo
                </button>
              </div>
            </div>

            <div>
              <label className={labelClass}>Business Name</label>
              <input
                type="text" value={formData.businessName} onChange={e => setFormData({...formData, businessName: e.target.value})}
                className={cn(fieldClass, 'font-black')}
              />
            </div>
            <div>
              <label className={labelClass}>Account Status</label>
              <div className={cn("w-full h-12 px-4 text-sm border rounded-xl font-black flex items-center gap-2",
                formData.verification === 'Approved' ? "border-success/25 bg-success/10 text-success" : "border-warning/25 bg-warning/10 text-warning")}>
                <CheckCircle size={16} /> {formData.verification}
              </div>
            </div>
            <div>
              <label className={labelClass}>Support Email</label>
              <input type="email" value={formData.email} disabled className={disabledField} />
            </div>
            <div>
              <label className={labelClass}>Helpline Phone</label>
              <input
                type="tel" inputMode="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Registered Address</label>
              <input
                type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}
                className={fieldClass}
              />
            </div>
          </FormSection>

          <StickyActionBar>
            <PrimaryButton type="submit" form="events-profile-form" disabled={isSaving} loading={isSaving} icon={isSaving ? undefined : isSaved ? CheckCircle : Save}>
              {isSaving ? 'Saving...' : isSaved ? 'Saved Successfully' : 'Save Profile Updates'}
            </PrimaryButton>
          </StickyActionBar>
        </form>
      )}

      {/* BANK & KYC TAB */}
      {activeTab === 'bank_kyc' && (
        <div className="space-y-4">
          <InlineError>{saveError}</InlineError>
          <FormSection title="Bank Account & Payout Details" description="Required to receive ticket sales and event earnings settlements.">
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

          <FormSection title="Required KYC Documents" description="Upload Event Trade License & Owner ID Proof for Super Admin verification.">
            <div className="space-y-2">
              {(profile.documents || []).map((doc, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-bg-primary border border-border-light rounded-xl">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-text-primary uppercase tracking-wide">
                      {doc.kind === 'license' ? 'Event Agency / Trade License' : doc.kind === 'owner_id' ? 'Owner Identity Card' : doc.kind === 'gst' ? 'GST Certificate' : doc.kind}
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
              <option value="license">Event Agency Trade License</option>
              <option value="owner_id">Owner ID Proof (Aadhaar/PAN)</option>
              <option value="gst">GST Registration Certificate</option>
            </select>

            <input type="file" id="eventDocInput" accept="image/*,application/pdf" className="hidden" onChange={handleDocUpload} />
            <button onClick={() => document.getElementById('eventDocInput').click()} disabled={uploadingDoc} className="w-full h-12 bg-text-primary text-white text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50">
              {uploadingDoc ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} {uploadingDoc ? 'Uploading...' : 'Upload File'}
            </button>
          </FormSection>

          <StickyActionBar>
            <PrimaryButton onClick={handleSaveProfile} disabled={isSaving} loading={isSaving} icon={Save}>
              Save Bank Details
            </PrimaryButton>
          </StickyActionBar>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="space-y-4">
          <FormSection title="Change Password">
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
          </FormSection>
          <StickyActionBar>
            <PrimaryButton tone="dark" onClick={handleChangePassword} disabled={changingPassword} loading={changingPassword}>
              Change Password
            </PrimaryButton>
          </StickyActionBar>
        </div>
      )}

    </div>
  );
}
