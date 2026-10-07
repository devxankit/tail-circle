import React, { useState } from 'react';
import { useMemorialProvider } from '../context/MemorialProviderContext';
import { updateVendorProfile, changeVendorPassword, uploadVendorFile, addVendorDocument, removeVendorDocument } from '../../../../services/vendor';
import {
  Building2, ShieldCheck, Mail, Phone,
  MapPin, Upload, CheckCircle, Loader2, CreditCard, Trash2
} from 'lucide-react';
import {
  FormSection, StickyActionBar, PrimaryButton, StatusBadge, Checkbox, InlineError,
  fieldClass, textareaClass, labelClass,
} from '../../vendor/mobile';

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
      setSaveError(err?.response?.data?.message || err?.message || 'Could not upload document');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDocRemove = async (index) => {
    try {
      await removeVendorDocument(index);
      await refresh();
    } catch (err) {
      setSaveError(err?.response?.data?.message || err?.message || 'Could not remove document');
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
      setSaveError(err?.response?.data?.message || err?.message || 'Could not save profile');
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

  const disabledField = 'w-full h-12 rounded-xl border border-border-light bg-bg-primary text-[16px] text-text-secondary cursor-not-allowed';

  return (
    <div className="space-y-4">

      <p className="text-xs text-text-secondary px-1">Manage your business profile, service areas, and account settings.</p>

      <InlineError>{saveError}</InlineError>

      {/* Business Profile */}
      <FormSection icon={Building2} title="Business Profile">
        <div className="flex items-center gap-4">
          <div
            className="w-24 h-24 rounded-2xl bg-bg-primary border-2 border-dashed border-border-light flex flex-col items-center justify-center text-text-secondary transition cursor-pointer relative overflow-hidden shrink-0"
            onClick={() => logoInputRef.current?.click()}
          >
            {formData.logo ? (
              <img src={formData.logo} className="w-full h-full object-cover" alt="Logo" />
            ) : (
              <>
                <Upload size={20} className="mb-1" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-center px-2">Brand Logo</span>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" ref={logoInputRef} onChange={handleLogoUpload} />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-text-primary mb-1">Company Logo</h4>
            <p className="text-xs font-semibold text-text-secondary">Upload a clear logo. Recommended size: 512x512px. Max 2MB.</p>
            <button onClick={() => logoInputRef.current?.click()} className="mt-2 min-h-[44px] px-4 bg-white border border-border-light text-text-primary text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5">
              <Upload size={14} /> Change Logo
            </button>
          </div>
        </div>

        <div>
          <label className={labelClass}>Business Name</label>
          <input type="text" name="businessName" value={formData.businessName} onChange={handleChange} className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>Owner / Manager Name</label>
          <input type="text" name="ownerName" value={formData.ownerName} disabled className={`${disabledField} px-4`} />
        </div>
        <div>
          <label className={labelClass}>Support Email</label>
          <div className="relative">
            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
            <input type="email" name="email" value={formData.email} disabled className={`${disabledField} pl-11 pr-4`} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Helpline Phone</label>
          <div className="relative">
            <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
            <input type="tel" inputMode="tel" name="phone" value={formData.phone} onChange={handleChange} className={`${fieldClass} pl-11`} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Registered Address</label>
          <div className="relative">
            <MapPin size={16} className="absolute left-4 top-4 text-text-secondary pointer-events-none" />
            <textarea name="address" value={formData.address} onChange={handleChange} rows="2" className={`${textareaClass} pl-11`}></textarea>
          </div>
        </div>
      </FormSection>

      {/* BANK & KYC CARD */}
      <FormSection icon={CreditCard} title="Bank Account & Payout Details" description="Required to receive payouts for memorial packages and remembrance services.">
        <div>
          <label className={labelClass}>Bank Name</label>
          <input type="text" placeholder="e.g. ICICI Bank" value={bankData.bankName} onChange={e => setBankData({...bankData, bankName: e.target.value})} className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>Account Holder Name</label>
          <input type="text" placeholder="Name on account" value={bankData.accountHolder} onChange={e => setBankData({...bankData, accountHolder: e.target.value})} className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>Account Number</label>
          <input type="text" inputMode="numeric" placeholder="Enter account number" value={bankData.accountNumber} onChange={e => setBankData({...bankData, accountNumber: e.target.value})} className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>IFSC Code</label>
          <input type="text" placeholder="ICIC0001234" value={bankData.ifsc} onChange={e => setBankData({...bankData, ifsc: e.target.value.toUpperCase()})} className={fieldClass} />
        </div>

        <div className="pt-3 border-t border-border-light space-y-3">
          <Checkbox label="GSTIN Registered" checked={gstData.hasGst} onChange={(v) => setGstData({...gstData, hasGst: v})} />
          {gstData.hasGst && (
            <input type="text" placeholder="GSTIN Number" value={gstData.number} onChange={e => setGstData({...gstData, number: e.target.value})} className={fieldClass} />
          )}
        </div>
      </FormSection>

      {/* KYC DOCUMENTS */}
      <FormSection title="Required KYC Documents" description="Upload Memorial Business Permit & Owner ID for Super Admin verification.">
        <div className="space-y-2">
          {(profile.documents || []).map((doc, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-bg-primary border border-border-light rounded-xl">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-xs text-text-primary uppercase tracking-wide">
                  {doc.kind === 'license' ? 'Memorial Permit' : doc.kind === 'clinic_auth' ? 'Premises Auth' : doc.kind === 'owner_id' ? 'Owner ID' : doc.kind === 'gst' ? 'GST Certificate' : doc.kind}
                </p>
                <a href={doc.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#4C8684] underline">View File</a>
              </div>
              <StatusBadge status={doc.status || 'Pending'} />
              <button onClick={() => handleDocRemove(idx)} aria-label="Remove document" className="w-10 h-10 rounded-xl flex items-center justify-center text-error bg-error/5 shrink-0">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        <select value={docKind} onChange={e => setDocKind(e.target.value)} className={fieldClass}>
          <option value="license">Memorial Centre Business Permit</option>
          <option value="clinic_auth">Premises / Crematorium Authorization</option>
          <option value="owner_id">Owner ID Proof (Aadhaar/PAN)</option>
          <option value="gst">GST Registration Certificate</option>
        </select>

        <input type="file" id="memorialDocInput" accept="image/*,application/pdf" className="hidden" onChange={handleDocUpload} />
        <button onClick={() => document.getElementById('memorialDocInput').click()} disabled={uploadingDoc} className="w-full h-12 bg-text-primary text-white text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50">
          {uploadingDoc ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} {uploadingDoc ? 'Uploading...' : 'Upload'}
        </button>
      </FormSection>

      {/* Verification Status */}
      <div className="bg-gradient-to-tr from-[#4C8684] to-[#80C1BF] p-5 rounded-[24px] text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
        <div className="flex items-center gap-3 mb-4 relative z-10">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><ShieldCheck size={20} /></div>
          <h3 className="text-base font-black">Trust & Safety</h3>
        </div>
        <div className="space-y-3 relative z-10">
          <div className="flex justify-between items-center border-b border-white/20 pb-3">
            <span className="text-xs font-semibold opacity-85">Account Status</span>
            <span className="px-2 py-1 text-[10px] font-bold uppercase rounded-full bg-white/90 text-[#4C8684]">{formData.verification}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold opacity-85">GSTIN</span>
            <span className="text-sm font-bold">{formData.gst || '—'}</span>
          </div>
        </div>
      </div>

      {/* Security — keeps its own button, as before. */}
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
        <PrimaryButton tone="soft" className="w-full" onClick={handleChangePassword} disabled={changingPassword} loading={changingPassword}>
          Change Password
        </PrimaryButton>
      </FormSection>

      <StickyActionBar
        note={isSaved ? (
          <span className="flex items-center justify-center gap-1.5 text-success text-xs font-bold">
            <CheckCircle size={14} /> Settings Saved
          </span>
        ) : null}
      >
        <PrimaryButton onClick={handleSave} disabled={isSaving} loading={isSaving}>
          Save Profile Updates
        </PrimaryButton>
      </StickyActionBar>
    </div>
  );
}
