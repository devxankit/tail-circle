import React, { useState } from 'react';
import { Video, Calendar, Clock, Mic, Camera, Users, ArrowRight, CheckCircle, FileText, Loader2, AlertCircle } from 'lucide-react';
import { useVendor } from '../context/ClinicVendorContext';
import { SectionLabel, StatusBadge, EmptyState, useVendorToast } from '../../vendor/mobile';
import { findPatient } from '../utils/clinicActions';

const PAST_PREVIEW = 5;

/**
 * Ask the browser for one device and release it straight away: 'ok' when it
 * works, else the reason it does not.
 */
async function testDevice(kind) {
  if (!navigator.mediaDevices?.getUserMedia) return { ok: false, reason: 'This browser cannot use a camera or microphone.' };
  try {
    const stream = await navigator.mediaDevices.getUserMedia(kind === 'camera' ? { video: true } : { audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      reason: err?.name === 'NotAllowedError'
        ? `${kind === 'camera' ? 'Camera' : 'Microphone'} access is blocked — allow it in your browser settings.`
        : err?.name === 'NotFoundError'
          ? `No ${kind === 'camera' ? 'camera' : 'microphone'} found on this device.`
          : err?.message || `Could not start the ${kind}.`,
    };
  }
}

export function VideoConsultationsListView({ onNavigate }) {
  const { doctorAppointments, doctorPatients } = useVendor();
  const { addToast } = useVendorToast();
  // Each device: 'idle' | 'testing' | 'ok' | 'failed'
  const [devices, setDevices] = useState({ camera: 'idle', mic: 'idle' });
  const [showAllPast, setShowAllPast] = useState(false);

  const videoAppointments = doctorAppointments.filter(apt => apt.type === 'Video Consultation');
  const upcoming = videoAppointments.filter(apt => apt.status === 'Confirmed');
  const past = videoAppointments.filter(apt => apt.status === 'Completed');
  const pastShown = showAllPast ? past : past.slice(0, PAST_PREVIEW);

  const runTest = async (kind) => {
    setDevices((d) => ({ ...d, [kind]: 'testing' }));
    const res = await testDevice(kind);
    setDevices((d) => ({ ...d, [kind]: res.ok ? 'ok' : 'failed' }));
    if (!res.ok) addToast({ message: res.reason, type: 'error', duration: 5000 });
  };

  const ready = devices.camera === 'ok' && devices.mic === 'ok';

  const openRecords = (apt) => {
    const patient = findPatient(doctorPatients, apt.petName, apt.owner);
    if (patient) onNavigate('patient_detail', null, patient);
    else onNavigate('medical_records');
  };

  const deviceButton = (kind, Icon, label) => {
    const state = devices[kind];
    return (
      <div className="flex flex-col items-center gap-1">
        <button
          onClick={() => runTest(kind)}
          disabled={state === 'testing'}
          aria-label={`Test ${label.toLowerCase()}`}
          className={`w-12 h-12 rounded-xl flex items-center justify-center transition cursor-pointer border ${
            state === 'ok' ? 'bg-success/10 text-success border-success/20'
              : state === 'failed' ? 'bg-error/10 text-error border-error/20'
                : 'bg-white border-border-light text-text-secondary'
          }`}
        >
          {state === 'testing' ? <Loader2 size={18} className="animate-spin" /> : state === 'failed' ? <AlertCircle size={18} /> : <Icon size={18} />}
        </button>
        <span className="text-[10px] font-bold text-text-secondary uppercase">{label}</span>
      </div>
    );
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="px-1">
        <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
          <Video className="text-text-secondary" size={20} />
          Video Consultations Hub
        </h2>
        <p className="text-xs text-text-secondary mt-1">
          Manage your upcoming tele-health appointments and check your equipment setup.
        </p>
      </div>

      {/* Equipment Check — asks the browser for each device for real. */}
      <div className="bg-white border border-border-light rounded-[20px] shadow-sm p-3 flex gap-4 items-center">
        {deviceButton('camera', Camera, 'Camera')}
        {deviceButton('mic', Mic, 'Mic')}
        <div className="h-10 w-px bg-border-light mx-1" />
        <div className="text-sm font-bold text-text-secondary flex-1 min-w-0">
          {ready ? (
            <span className="text-success flex items-center gap-1">
              <CheckCircle size={14} /> Ready for Calls
            </span>
          ) : devices.camera === 'failed' || devices.mic === 'failed' ? (
            <span className="text-error">Check your device settings</span>
          ) : (
            <span>Tap each to test your equipment</span>
          )}
        </div>
      </div>

      {/* Upcoming Consultations */}
      <div>
        <SectionLabel>
          <span className="inline-flex items-center gap-1.5"><Calendar size={13} /> Upcoming</span>
        </SectionLabel>

        {upcoming.length === 0 ? (
          <EmptyState compact icon={Video} text="No upcoming video consultations scheduled." />
        ) : (
          <div className="space-y-3">
            {upcoming.map(apt => (
              <div key={apt.id} className="bg-white border border-border-light rounded-[20px] p-4 shadow-sm">
                <div className="flex justify-between items-start gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="bg-bg-secondary w-11 h-11 rounded-xl text-text-secondary flex items-center justify-center shrink-0">
                      <Clock size={18} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-base font-black text-text-primary leading-tight">{apt.time}</h4>
                      <p className="text-xs font-semibold text-text-secondary mt-0.5 uppercase tracking-wide">{apt.date}</p>
                    </div>
                  </div>
                  <StatusBadge label="Confirmed" tone="success" />
                </div>

                <div className="bg-bg-primary border border-border-light p-3 rounded-2xl mb-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-text-primary">{apt.owner}'s {apt.petName}</p>
                      <p className="text-xs text-text-secondary mt-0.5">{[apt.species, apt.breed].filter(Boolean).join(' – ')}</p>
                    </div>
                    <button
                      onClick={() => openRecords(apt)}
                      className="min-h-[36px] text-xs font-bold text-primary-main flex items-center gap-1 shrink-0"
                    >
                      <FileText size={12} /> View Records
                    </button>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border-light">
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Reported Issue</p>
                    <p className="text-sm text-text-primary">{apt.issue || '—'}</p>
                  </div>
                </div>

                <button
                  onClick={() => onNavigate('video_call', apt)}
                  className="w-full h-12 bg-primary-main text-white font-bold rounded-2xl transition flex items-center justify-center gap-2 shadow-md shadow-primary-main/25 text-sm"
                >
                  Join Room <ArrowRight size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past Consultations */}
      <div>
        <SectionLabel>
          <span className="inline-flex items-center gap-1.5"><Users size={13} /> Past Consultations</span>
        </SectionLabel>
        <div className="bg-white border border-border-light rounded-[20px] p-3 shadow-sm space-y-2">
          {past.length === 0 ? (
            <p className="text-xs text-text-secondary text-center py-6">No past records found.</p>
          ) : (
            pastShown.map(apt => (
              <button
                key={apt.id}
                type="button"
                onClick={() => onNavigate('appointment_detail', apt)}
                className="w-full text-left flex justify-between items-center gap-2 p-3 border border-border-light bg-bg-primary rounded-2xl active:bg-white"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-text-primary">{apt.owner}'s {apt.petName}</p>
                  <p className="text-xs text-text-secondary mt-0.5">{apt.date} · {apt.time}</p>
                </div>
                <StatusBadge label="Completed" tone="neutral" />
              </button>
            ))
          )}
          {past.length > PAST_PREVIEW && (
            <button onClick={() => setShowAllPast((s) => !s)} className="w-full min-h-[40px] text-center text-xs font-bold text-primary-main transition">
              {showAllPast ? 'Show Less' : `View All History (${past.length})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
