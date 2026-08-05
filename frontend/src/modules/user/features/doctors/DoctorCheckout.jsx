import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft, Calendar as CalendarIcon, Clock, Video, MapPin, Home, Siren,
  Info, AlertCircle, FileCheck,
} from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { cn } from '../../utils/cn';
import { payWithRazorpay } from '../../../../services/payments';
import {
  getDoctor, getDoctorSlots, enabledModes, upcomingDates, createConsultBooking,
} from '../../../../services/doctorsApi';

const MODE_ICON = { inClinic: MapPin, video: Video, homeVisit: Home, emergency: Siren };

const PLATFORM_FEE = 29; // matches PRICING_RULES.doctor.onlinePlatformFee on the server

export function DoctorCheckout() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Router state gives us something to render immediately, but the fee, modes
  // and policies must come from the server — they drive what is actually charged.
  const [doctor, setDoctor] = useState(location.state?.doctor || null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [mode, setMode] = useState(null);
  const dates = useMemo(() => upcomingDates(14), []);
  const [dateIdx, setDateIdx] = useState(0);

  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsMessage, setSlotsMessage] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  /* ── Load the vet ─────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDoctor(id)
      .then((d) => {
        if (cancelled) return;
        setDoctor(d);
        const modes = enabledModes(d);
        setMode(modes[0]?.mode ?? null);
        setLoadError(modes.length ? '' : 'This vet is not accepting appointments right now.');
      })
      .catch((e) => !cancelled && setLoadError(e.message || 'Could not load this vet'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [id]);

  const modes = useMemo(() => enabledModes(doctor), [doctor]);
  const activeMode = useMemo(() => modes.find((m) => m.mode === mode) || null, [modes, mode]);

  /* ── Load slots whenever date or mode changes ─────────── */
  useEffect(() => {
    if (!doctor?._id || !activeMode) return undefined;
    let cancelled = false;

    setSlotsLoading(true);
    setSelectedSlot(null);
    setSlots([]);
    setSlotsMessage('');

    getDoctorSlots(doctor._id, dates[dateIdx].ymd, activeMode.visitType)
      .then(({ slots: got, message }) => {
        if (cancelled) return;
        setSlots(got);
        if (!got.length) setSlotsMessage(message || 'No slots available on this date.');
      })
      .catch((e) => !cancelled && setSlotsMessage(e.message || 'Could not load slots'))
      .finally(() => !cancelled && setSlotsLoading(false));

    return () => { cancelled = true; };
  }, [doctor?._id, activeMode, dateIdx, dates]);

  /* ── Pricing ──────────────────────────────────────────── */
  const fee = activeMode?.fee ?? 0;
  const total = fee + PLATFORM_FEE;

  const handlePay = async () => {
    if (!selectedSlot || !activeMode) return;
    setIsProcessing(true);
    setError('');
    try {
      const data = await createConsultBooking({
        doctorId: doctor._id,
        date: dates[dateIdx].ymd,
        time: selectedSlot.time,
        visitType: activeMode.visitType,
        paymentMethod: 'razorpay',
      });
      if (data.razorpay) {
        await payWithRazorpay(data.razorpay, {
          description: `${activeMode.label} — ${doctor.name}`,
        });
      }
      navigate(`/app/services/doctors/${id}/success`, {
        state: {
          doctor,
          appointmentDate: dates[dateIdx].full,
          appointmentTime: selectedSlot.time,
          consultType: activeMode.label,
          durationMinutes: selectedSlot.durationMinutes,
          total,
          bookingNo: data.booking.bookingNo,
        },
      });
    } catch (err) {
      setError(err.message || 'Payment failed, please try again');
      setIsProcessing(false);
    }
  };

  /* ── Render ───────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-white absolute inset-0 z-[70] items-center justify-center">
        <div className="w-12 h-12 border-4 border-border-light border-t-primary-main rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError || !doctor) {
    return (
      <div className="flex flex-col h-full bg-white absolute inset-0 z-[70]">
        <Header onBack={() => navigate(-1)} />
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-3">
          <AlertCircle size={40} className="text-text-secondary opacity-40" />
          <p className="font-bold text-text-primary">{loadError || 'Vet not found'}</p>
          <Button onClick={() => navigate(-1)} className="mt-2 px-6">Go back</Button>
        </div>
      </div>
    );
  }

  const policy = doctor.policies || {};

  return (
    <div className="flex flex-col h-full bg-bg-secondary absolute inset-0 z-[70] animate-in slide-in-from-right duration-300">
      <Header onBack={() => navigate(-1)} disabled={isProcessing} />

      {isProcessing ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white">
          <div className="w-16 h-16 border-4 border-border-light border-t-primary-main rounded-full animate-spin mb-6" />
          <h2 className="text-xl font-bold text-text-primary mb-2">Confirming your booking</h2>
          <p className="text-text-secondary">Please wait securely…</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pb-28">
          {/* Vet summary */}
          <div className="bg-white p-4 mb-4 border-b border-border-light flex gap-4 items-center">
            <img
              src={doctor.img || doctor.identity?.profilePhoto}
              alt={doctor.name}
              className="w-16 h-16 rounded-full object-cover shadow-sm shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <h3 className="font-bold text-text-primary truncate">{doctor.name}</h3>
              <p className="text-xs text-text-secondary truncate">
                {doctor.spec}{doctor.clinic ? ` • ${doctor.clinic}` : ''}
              </p>
              {doctor.practice?.languages?.length > 0 && (
                <p className="text-[11px] text-text-secondary mt-0.5 truncate">
                  Speaks {doctor.practice.languages.join(', ')}
                </p>
              )}
            </div>
          </div>

          {/* Consultation type — only what this vet actually offers */}
          <div className="bg-white p-4 mb-4 border-y border-border-light">
            <h3 className="font-bold text-text-primary mb-4">Consultation Type</h3>
            <div className="grid grid-cols-2 gap-3">
              {modes.map((m) => {
                const Icon = MODE_ICON[m.mode] || MapPin;
                const isSelected = mode === m.mode;
                return (
                  <button
                    key={m.mode}
                    onClick={() => setMode(m.mode)}
                    className={cn(
                      'flex flex-col items-start gap-1 p-3 rounded-2xl border-2 text-left transition-all',
                      isSelected
                        ? 'border-primary-main bg-primary-light/10'
                        : 'border-border-light bg-white'
                    )}
                  >
                    <Icon
                      size={20}
                      className={isSelected ? 'text-primary-main' : 'text-text-secondary'}
                    />
                    <span className="font-bold text-sm text-text-primary">{m.short}</span>
                    <span className="text-xs text-text-secondary">
                      ₹{m.fee} • {m.durationMinutes} min
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date */}
          <div className="bg-white p-4 mb-4 border-y border-border-light">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-text-primary flex items-center gap-2">
                <CalendarIcon size={18} className="text-primary-main" /> Select Date
              </h3>
              <span className="text-xs font-bold text-accent-teal">{dates[dateIdx].full}</span>
            </div>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {dates.map((d, idx) => {
                const isSelected = dateIdx === idx;
                return (
                  <button
                    key={d.ymd}
                    onClick={() => setDateIdx(idx)}
                    className={cn(
                      'flex flex-col items-center justify-center w-16 h-20 rounded-2xl border shrink-0 transition-all',
                      isSelected
                        ? 'bg-primary-main border-primary-main text-white shadow-md shadow-primary-main/30'
                        : 'bg-white border-border-light text-text-primary'
                    )}
                  >
                    <span className={cn('text-xs font-bold mb-1', isSelected ? 'text-white/90' : 'text-text-secondary')}>
                      {d.dayName}
                    </span>
                    <span className="text-xl font-black">{d.date}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slots — live from the vet's schedule */}
          <div className="bg-white p-4 mb-4 border-y border-border-light">
            <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
              <Clock size={18} className="text-primary-main" /> Select Time Slot
              {activeMode && (
                <span className="ml-auto text-xs font-medium text-text-secondary">
                  {activeMode.durationMinutes} min consult
                </span>
              )}
            </h3>

            {slotsLoading ? (
              <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-10 rounded-xl bg-bg-secondary animate-pulse" />
                ))}
              </div>
            ) : slots.length ? (
              <div className="grid grid-cols-3 gap-3">
                {slots.map((slot) => {
                  const isSelected = selectedSlot?.time === slot.time;
                  return (
                    <button
                      key={slot.time}
                      onClick={() => setSelectedSlot(slot)}
                      className={cn(
                        'py-2.5 rounded-xl border text-sm font-bold transition-all',
                        isSelected
                          ? 'bg-primary-main border-primary-main text-white shadow-md shadow-primary-main/30'
                          : 'bg-white border-border-light text-text-primary'
                      )}
                    >
                      {slot.time}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-start gap-2 text-sm text-text-secondary bg-bg-secondary rounded-xl p-3">
                <Info size={16} className="shrink-0 mt-0.5" />
                <span>{slotsMessage}</span>
              </div>
            )}
          </div>

          {/* Bill */}
          <div className="bg-white p-4 mb-4 border-y border-border-light">
            <h3 className="font-bold text-text-primary mb-4">Bill Details</h3>
            <div className="flex justify-between mb-2 text-sm">
              <span className="text-text-secondary">{activeMode?.label || 'Consultation'} Fee</span>
              <span className="font-medium text-text-primary">₹{fee}</span>
            </div>
            <div className="flex justify-between mb-4 text-sm">
              <span className="text-text-secondary">Platform Fee &amp; Taxes</span>
              <span className="font-medium text-text-primary">₹{PLATFORM_FEE}</span>
            </div>
            <div className="border-t border-border-light pt-4 flex justify-between">
              <span className="font-bold text-text-primary">Total Payable</span>
              <span className="font-black text-primary-main text-lg">₹{total}</span>
            </div>
          </div>

          {/* Video consult notes — the vet's own declared terms */}
          {mode === 'video' && (
            <div className="mb-4">
              {doctor.video?.overagePerMinute > 0 && (
                <div className="bg-accent-yellow/10 border-y border-accent-yellow/30 p-4 flex gap-2">
                  <Info size={16} className="text-accent-yellow shrink-0 mt-0.5" />
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Your consultation is booked for{' '}
                    <strong className="text-text-primary">{activeMode?.durationMinutes} minutes</strong>.
                    If it runs longer, extra time is charged at{' '}
                    <strong className="text-text-primary">₹{doctor.video.overagePerMinute}/min</strong>
                    {doctor.video.graceMinutes > 0 && ` after a ${doctor.video.graceMinutes} min grace period`}
                    {' '}— you'll be asked to confirm before any extra charge starts.
                  </p>
                </div>
              )}

              {/* Whether this vet issues a digital prescription after a video
                  consult — declared on their profile, shown before booking so
                  the pet parent knows what they get. */}
              <div className="bg-white border-y border-border-light p-4 flex gap-2">
                {doctor.video?.digitalPrescription ? (
                  <>
                    <FileCheck size={16} className="text-accent-teal shrink-0 mt-0.5" />
                    <p className="text-xs text-text-secondary leading-relaxed">
                      <strong className="text-text-primary">Digital prescription included.</strong>{' '}
                      {doctor.name} issues a prescription you can view and download from your
                      booking after the consultation.
                    </p>
                  </>
                ) : (
                  <>
                    <Info size={16} className="text-text-secondary shrink-0 mt-0.5" />
                    <p className="text-xs text-text-secondary leading-relaxed">
                      This vet does not issue digital prescriptions for video consults — you'll
                      receive advice during the call.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Cancellation policy — the vet's own, not a hardcoded 4h */}
          {(policy.cancellationHours != null || policy.cancellationNote) && (
            <div className="bg-white p-4 border-y border-border-light">
              <h3 className="font-bold text-text-primary mb-2 text-sm">Cancellation Policy</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                {policy.cancellationNote
                  || `Free cancellation up to ${policy.cancellationHours} hours before the appointment. Cancelling later is non-refundable.`}
              </p>
            </div>
          )}
        </div>
      )}

      {!isProcessing && (
        <div className="absolute bottom-0 w-full bg-white border-t border-border-light p-4 shadow-[0_-4px_15px_rgba(0,0,0,0.05)]">
          {error && <p className="text-center text-xs font-bold text-red-500 mb-2">{error}</p>}
          <Button
            disabled={!selectedSlot}
            onClick={handlePay}
            className="w-full h-14 rounded-full text-lg font-bold shadow-lg shadow-primary-main/30 flex justify-between items-center px-6 disabled:opacity-50 disabled:shadow-none"
          >
            <span>{selectedSlot ? 'Confirm Booking' : 'Select a time slot'}</span>
            <span>₹{total}</span>
          </Button>
        </div>
      )}
    </div>
  );
}

function Header({ onBack, disabled }) {
  return (
    <div className="flex items-center px-4 py-4 border-b border-border-light sticky top-0 bg-white z-10 shadow-sm">
      <button
        onClick={onBack}
        disabled={disabled}
        className="p-2 -ml-2 rounded-full hover:bg-bg-secondary transition-colors"
      >
        <ArrowLeft size={24} />
      </button>
      <h1 className="text-xl font-bold text-text-primary ml-2">Book Appointment</h1>
    </div>
  );
}
