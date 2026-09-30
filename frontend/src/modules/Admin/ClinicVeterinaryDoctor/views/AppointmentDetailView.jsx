import React, { useRef, useState } from 'react';
import { User, Calendar, Clock, MapPin, CheckCircle, Video, FileText, AlertTriangle, MessageSquare, Send } from 'lucide-react';
import { useVendor } from '../context/ClinicVendorContext';
import {
  FormSection, StickyActionBar, PrimaryButton, StatusBadge, BottomSheet, SkeletonList, EmptyState,
  useSubScreen, useVendorToast, useConfirm, textareaClass, labelClass, fieldClass,
} from '../../vendor/mobile';
import { ScheduleVisitSheet } from '../components/ScheduleVisitSheet';
import { callPhone, textPhone, whatsappPhone, hasPhone, findPatient } from '../utils/clinicActions';

const STATUS_TONE = { Confirmed: 'success', Completed: 'info', Pending: 'warning', Cancelled: 'error' };

export function AppointmentDetailView({ appointment: selected, onNavigate }) {
  const { doctorAppointments, doctorPatients, loading, updateDoctorAppointmentStatus, addDoctorConsultationNotes } = useVendor();
  const { addToast } = useVendorToast();
  const confirm = useConfirm();
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggest, setSuggest] = useState({ date: '', time: '', note: '' });
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const notesRef = useRef(null);

  // The app bar's Back returns to the list, as "Back to Appointments" did.
  useSubScreen({ title: 'Appointment', onBack: () => onNavigate('appointments_list') });

  /*
   * A link with `?bookingId=` only carries the id, so the full appointment is
   * looked up in the clinic's list (it used to render from the bare id and
   * crash on the missing fields).
   */
  const appointment = (selected?.id && doctorAppointments.find((a) => String(a.id) === String(selected.id))) || selected;

  if (!selected) return null;

  if (!appointment?.petName) {
    if (loading) return <SkeletonList rows={3} />;
    return (
      <EmptyState
        icon={Calendar}
        title="Appointment not found"
        text="It may have been cancelled, or it belongs to another clinic."
        action={(
          <button onClick={() => onNavigate('appointments_list')} className="min-h-[44px] px-5 rounded-xl bg-text-primary text-white text-sm font-bold">
            Back to Appointments
          </button>
        )}
      />
    );
  }

  const ownerPhone = appointment.phone;
  const canContact = hasPhone(ownerPhone);

  const handleConfirm = async () => {
    setBusy(true);
    const ok = await updateDoctorAppointmentStatus(appointment.id, 'Confirmed');
    setBusy(false);
    if (ok) {
      addToast({ message: 'Appointment confirmed. The pet parent has been notified.', type: 'success' });
      onNavigate('appointments_list');
    }
  };

  const handleDecline = async () => {
    if (!(await confirm({
      title: 'Decline this appointment?',
      message: 'The booking is cancelled, the time slot is released, and the pet parent is notified and refunded.',
      confirmLabel: 'Decline',
      danger: true,
    }))) return;
    setBusy(true);
    const ok = await updateDoctorAppointmentStatus(appointment.id, 'Cancelled');
    setBusy(false);
    if (ok) {
      addToast({ message: 'Appointment declined.', type: 'success' });
      onNavigate('appointments_list');
    }
  };

  const handleComplete = async () => {
    if (!notes.trim()) {
      addToast({ message: 'Please add consultation notes before completing.', type: 'error' });
      notesRef.current?.focus();
      return;
    }
    setBusy(true);
    const ok = await addDoctorConsultationNotes(appointment.id, notes);
    setBusy(false);
    if (ok) {
      addToast({ message: 'Consultation completed and added to medical records.', type: 'success' });
      onNavigate('appointments_list');
    }
  };

  // In-clinic and home visits have no call to join: starting the checkup opens
  // the notes the visit is completed with.
  const startCheckup = () => {
    notesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    notesRef.current?.focus();
    addToast({ message: 'Checkup started — record your findings, then Mark as Complete.', type: 'info' });
  };

  const openMedicalRecord = () => {
    const patient = findPatient(doctorPatients, appointment.petName, appointment.owner);
    if (patient) onNavigate('patient_detail', null, patient);
    else onNavigate('medical_records');
  };

  const suggestionText = () => {
    const when = [suggest.date && new Date(`${suggest.date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }), suggest.time].filter(Boolean).join(' at ');
    return `Hi ${appointment.owner || ''}, this is about ${appointment.petName}'s appointment on ${appointment.date} at ${appointment.time}${appointment.bookingNo ? ` (${appointment.bookingNo})` : ''}. Could we move it to ${when}?${suggest.note ? ` ${suggest.note}` : ''} Please reply to confirm.`.replace(/\s+/g, ' ');
  };

  const sendSuggestion = (via) => {
    if (!suggest.date || !suggest.time) {
      addToast({ message: 'Pick the new date and time first.', type: 'warning' });
      return;
    }
    const sent = via === 'whatsapp' ? whatsappPhone(ownerPhone, suggestionText()) : textPhone(ownerPhone, suggestionText());
    if (sent) setSuggestOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 px-1">
        <span className="text-xs font-bold text-text-secondary uppercase tracking-wider truncate">
          {appointment.bookingNo ? `Booking ${appointment.bookingNo}` : `ID: ${appointment.id}`}
        </span>
        <StatusBadge label={appointment.status} tone={STATUS_TONE[appointment.status] || 'warning'} />
      </div>

      {/* Section 1: Patient & Owner */}
      <FormSection title="Patient Information">
        <div className="flex gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary-light/40 flex items-center justify-center text-primary-main font-bold text-2xl shrink-0">
            {appointment.petName.charAt(0)}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-text-primary">{appointment.petName}</h2>
            <p className="text-sm font-medium text-text-secondary">{[appointment.species, appointment.breed].filter(Boolean).join(' • ')}</p>
            <button onClick={openMedicalRecord} className="mt-1 min-h-[36px] text-xs font-bold text-primary-main">View Full Medical Record</button>
          </div>
        </div>
        <div className="pt-4 border-t border-border-light space-y-2">
          <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Owner Details</h4>
          <div>
            <p className="text-sm font-bold text-text-primary">{appointment.owner || '—'}</p>
            <p className="text-xs text-text-secondary flex items-center gap-1 mt-1"><User size={12}/> {ownerPhone || 'No phone number on file'}</p>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => callPhone(ownerPhone)}
              disabled={!canContact}
              className="flex-1 min-h-[44px] bg-bg-secondary text-text-primary rounded-xl text-sm font-bold disabled:opacity-50"
            >
              Call
            </button>
            <button
              onClick={() => textPhone(ownerPhone)}
              disabled={!canContact}
              className="flex-1 min-h-[44px] bg-bg-secondary text-text-primary rounded-xl text-sm font-bold disabled:opacity-50"
            >
              Message
            </button>
          </div>
        </div>
      </FormSection>

      {/* Section 2: Appointment Details */}
      <FormSection title="Consultation Details">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Date</p>
            <p className="text-sm font-bold text-text-primary flex items-center gap-1.5"><Calendar size={14} className="text-primary-main shrink-0"/> {appointment.date}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Time</p>
            <p className="text-sm font-bold text-text-primary flex items-center gap-1.5"><Clock size={14} className="text-primary-main shrink-0"/> {appointment.time}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Type</p>
            <p className="text-sm font-bold text-text-primary flex items-center gap-1.5">
              {appointment.type === 'Video Consultation' ? <Video size={14} className="text-text-secondary shrink-0"/> : <MapPin size={14} className="text-accent-teal shrink-0"/>}
              {appointment.type}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Fee</p>
            <p className="text-sm font-bold text-success">₹{appointment.fee} (Paid)</p>
          </div>
        </div>

        <div className="bg-bg-primary border border-border-light rounded-2xl p-4">
          <h4 className="text-xs font-bold text-text-primary uppercase mb-2">Chief Complaint / Issue</h4>
          <p className="text-sm text-text-primary leading-relaxed">{appointment.issue || '—'}</p>
        </div>
      </FormSection>

      {/* Consultation Notes Form */}
      {(appointment.status === 'Confirmed' || appointment.status === 'Completed') && (
        <FormSection title="Consultation Notes & Prescription">
          {appointment.status === 'Completed' ? (
            <p className="text-sm text-text-primary whitespace-pre-wrap">{appointment.notes || 'No notes recorded.'}</p>
          ) : (
            <>
              <div>
                <label className={labelClass}>Diagnosis & Treatment Plan</label>
                <textarea
                  ref={notesRef}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={textareaClass}
                  rows="4"
                  placeholder="Enter your diagnosis, symptoms observed, and treatment prescribed..."
                ></textarea>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('prescriptions')}
                className="w-full min-h-[48px] px-4 py-2.5 bg-primary-main/10 text-primary-dark rounded-2xl text-sm font-bold transition flex items-center justify-center gap-2 text-center"
              >
                <FileText size={16} className="shrink-0" /> Open Prescription Pad (Digital / Photo Upload)
              </button>
            </>
          )}
        </FormSection>
      )}

      {/* Required actions: the status notes stay in the page, the buttons dock to the bottom. */}
      {appointment.status === 'Pending' && (
        <div className="bg-warning/10 border border-warning/25 rounded-2xl p-3 flex items-start gap-3">
          <AlertTriangle className="text-warning shrink-0 mt-0.5" size={16} />
          <p className="text-xs text-text-primary font-medium">This appointment is waiting for your confirmation. The time slot is reserved.</p>
        </div>
      )}
      {appointment.status === 'Completed' && (
        <div className="bg-success/10 border border-success/20 rounded-2xl p-3 flex items-center gap-3">
          <CheckCircle className="text-success shrink-0" size={16} />
          <p className="text-xs text-text-primary font-bold">Consultation Completed</p>
        </div>
      )}
      {appointment.status === 'Cancelled' && (
        <div className="bg-error/5 border border-error/20 rounded-2xl p-3 flex items-center gap-3">
          <AlertTriangle className="text-error shrink-0" size={16} />
          <p className="text-xs text-text-primary font-bold">This appointment was cancelled.</p>
        </div>
      )}

      {appointment.status === 'Pending' && (
        <StickyActionBar>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex gap-2">
              <PrimaryButton tone="outline" className="h-11 text-sm" disabled={busy || !canContact} onClick={() => setSuggestOpen(true)}>
                Suggest New Time
              </PrimaryButton>
              <PrimaryButton tone="outline" className="h-11 text-sm text-error" disabled={busy} onClick={handleDecline}>
                Decline
              </PrimaryButton>
            </div>
            <PrimaryButton tone="dark" onClick={handleConfirm} disabled={busy} loading={busy} className="w-full">Confirm Appointment</PrimaryButton>
          </div>
        </StickyActionBar>
      )}

      {appointment.status === 'Confirmed' && (
        <StickyActionBar>
          {appointment.type === 'Video Consultation' ? (
            <PrimaryButton tone="teal" icon={Video} onClick={() => onNavigate('video_call', appointment)} className="text-sm">
              Join Video Call
            </PrimaryButton>
          ) : (
            <PrimaryButton tone="teal" icon={CheckCircle} onClick={startCheckup} className="text-sm">
              Start Checkup
            </PrimaryButton>
          )}
          <PrimaryButton tone="dark" onClick={handleComplete} disabled={busy} loading={busy} className="text-sm">
            Mark as Complete
          </PrimaryButton>
        </StickyActionBar>
      )}

      {appointment.status === 'Completed' && (
        <StickyActionBar>
          <PrimaryButton tone="outline" icon={Calendar} onClick={() => setFollowUpOpen(true)}>Schedule Follow-up</PrimaryButton>
        </StickyActionBar>
      )}

      {/* Suggest a new time: goes to the pet parent as a message. */}
      <BottomSheet
        open={suggestOpen}
        onClose={() => setSuggestOpen(false)}
        title="Suggest New Time"
        subtitle={`Sent to ${appointment.owner || 'the pet parent'} at ${ownerPhone || '—'}`}
        footer={(
          <div className="flex gap-2">
            <PrimaryButton tone="outline" icon={MessageSquare} onClick={() => sendSuggestion('sms')} className="text-sm">SMS</PrimaryButton>
            <PrimaryButton tone="teal" icon={Send} onClick={() => sendSuggestion('whatsapp')} className="text-sm">WhatsApp</PrimaryButton>
          </div>
        )}
      >
        <div className="space-y-4 pb-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <label className={labelClass}>New Date</label>
              <input type="date" value={suggest.date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setSuggest((s) => ({ ...s, date: e.target.value }))} className={fieldClass} />
            </div>
            <div className="min-w-0">
              <label className={labelClass}>New Time</label>
              <input type="time" value={suggest.time} onChange={(e) => setSuggest((s) => ({ ...s, time: e.target.value }))} className={fieldClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Note (optional)</label>
            <textarea rows={2} value={suggest.note} onChange={(e) => setSuggest((s) => ({ ...s, note: e.target.value }))} placeholder="e.g. The doctor is in surgery at the booked time." className={textareaClass} />
          </div>
          {suggest.date && suggest.time && (
            <p className="text-xs text-text-secondary bg-bg-primary border border-border-light rounded-xl p-3 leading-relaxed">{suggestionText()}</p>
          )}
        </div>
      </BottomSheet>

      <ScheduleVisitSheet
        open={followUpOpen}
        onClose={() => setFollowUpOpen(false)}
        title="Schedule Follow-up"
        pet={{ petName: appointment.petName, owner: appointment.owner, phone: ownerPhone }}
        defaultReason={appointment.issue ? `Follow-up: ${appointment.issue}` : 'Follow-up visit'}
      />
    </div>
  );
}
