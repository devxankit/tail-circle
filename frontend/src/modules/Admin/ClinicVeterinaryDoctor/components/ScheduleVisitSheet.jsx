import React, { useState } from 'react';
import { useVendor } from '../context/ClinicVendorContext';
import { BottomSheet, PrimaryButton, InlineError, useVendorToast, errorMessage, fieldClass, labelClass } from '../../vendor/mobile';

const TIMES = ['10:00 AM', '11:30 AM', '02:00 PM', '04:15 PM', '05:30 PM'];

/**
 * Schedule a return visit for a pet the clinic already knows.
 *
 * The vendor API has no way to create a customer booking, so a visit the
 * clinic arranges is stored where the clinic tracks planned visits: as a
 * follow-up (with the date, time and reason), which then shows on the
 * Follow-ups screen with Call / Mark done / Reschedule.
 *
 *   <ScheduleVisitSheet open pet={{ petName, owner, phone }} defaultReason="…" onClose onScheduled />
 */
export function ScheduleVisitSheet(props) {
  // Mounted only while open, so each opening starts with a fresh form.
  return props.open ? <ScheduleVisitForm {...props} /> : null;
}

function ScheduleVisitForm({ onClose, pet, title = 'Schedule Visit', defaultReason = '', onScheduled }) {
  const { addFollowUp } = useVendor();
  const { addToast } = useVendorToast();
  const [date, setDate] = useState('');
  const [time, setTime] = useState(TIMES[0]);
  const [reason, setReason] = useState(defaultReason);
  const [priority, setPriority] = useState('Medium');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!date || !reason.trim()) {
      setError('Pick a date and add a reason for the visit.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await addFollowUp({
        petName: pet?.petName || '',
        owner: pet?.owner || '',
        phone: pet?.phone || '',
        reason: `${reason.trim()} (${time})`.slice(0, 500),
        dueDate: date,
        priority,
      });
      addToast({ message: `Visit scheduled for ${pet?.petName || 'the pet'} — it's on the Follow-ups list.`, type: 'success' });
      onScheduled?.();
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Could not schedule the visit.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      open
      onClose={() => { if (!saving) onClose(); }}
      title={pet?.petName ? `${title} for ${pet.petName}` : title}
      subtitle={pet?.owner || undefined}
      hideClose={saving}
      footer={(
        <div className="flex gap-2">
          <PrimaryButton tone="soft" onClick={onClose} disabled={saving}>Cancel</PrimaryButton>
          <PrimaryButton tone="dark" onClick={submit} disabled={saving} loading={saving}>
            {saving ? 'Scheduling...' : 'Confirm Appointment'}
          </PrimaryButton>
        </div>
      )}
    >
      <div className="space-y-4 pb-2">
        <InlineError>{error}</InlineError>
        <div>
          <label className={labelClass}>Select Date</label>
          <input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>Select Time</label>
          <select value={time} onChange={(e) => setTime(e.target.value)} className={fieldClass}>
            {TIMES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Reason for Visit</label>
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g., General Checkup, Vaccination..." className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className={fieldClass}>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
        </div>
      </div>
    </BottomSheet>
  );
}

export default ScheduleVisitSheet;
