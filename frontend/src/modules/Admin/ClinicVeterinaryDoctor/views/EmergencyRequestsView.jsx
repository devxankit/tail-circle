import React, { useState } from 'react';
import { Clock, Phone, MapPin, XCircle, Activity } from 'lucide-react';
import { useVendor } from '../context/ClinicVendorContext';
import { EmptyState, useVendorToast, useConfirm, errorMessage } from '../../vendor/mobile';
import { callPhone, hasPhone } from '../utils/clinicActions';

/*
 * An emergency request is not a booking — there is no consultation room to
 * join — so accepting one now rings the owner's phone. (It used to open the
 * video-call screen with no booking behind it, which could never connect.)
 */
export function EmergencyRequestsView() {
  const { emergencies, acceptEmergency, declineEmergency } = useVendor();
  const { addToast } = useVendorToast();
  const confirm = useConfirm();
  const [processing, setProcessing] = useState(null);

  const handleAction = async (req, action) => {
    if (processing) return;
    if (action === 'decline' && !(await confirm({
      title: `Pass on ${req.petName}'s emergency?`,
      message: 'It stays open for other available clinics.',
      confirmLabel: 'Pass',
      danger: true,
    }))) return;
    setProcessing(req.id);
    try {
      if (action === 'accept') {
        await acceptEmergency(req._id);
        if (hasPhone(req.phone)) {
          addToast({ message: `Accepted — calling ${req.ownerName || 'the owner'}.`, type: 'success' });
          callPhone(req.phone);
        } else {
          addToast({ message: 'Accepted. The owner has been notified that help is on the way.', type: 'success' });
        }
      } else {
        await declineEmergency(req._id);
        addToast({ message: 'Passed to other clinics.', type: 'info' });
      }
    } catch (err) {
      addToast({ message: errorMessage(err, 'Could not update this emergency.'), type: 'error' });
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="px-1">
        <h2 className="text-lg font-bold text-text-primary">Emergency Command Center</h2>
        <p className="text-xs text-text-secondary mt-1">
          Respond immediately to critical cases. Average response time today: &lt; 2 mins.
        </p>
      </div>

      {/* Live alert badge */}
      {emergencies.length > 0 && (
        <div className="bg-white border border-error/25 shadow-sm px-4 py-3 rounded-2xl flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-error" />
          </span>
          <span className="text-sm font-bold text-text-primary">{emergencies.length} Active Alert{emergencies.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Emergency cards */}
      {emergencies.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No Active Emergencies"
          text="All clear. You can focus on your scheduled appointments."
        />
      ) : (
        <div className="space-y-3">
          {emergencies.map((req) => (
            <div
              key={req.id}
              className="bg-white border border-error/25 rounded-[20px] overflow-hidden shadow-sm"
            >
              {/* Top priority strip */}
              <div className="bg-error/5 border-b border-error/10 px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-2 text-error">
                  <span className="w-1.5 h-1.5 rounded-full bg-error" />
                  <span className="font-black uppercase tracking-widest text-[10px]">
                    {req.severity} Priority
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-text-secondary text-[11px] font-bold">
                  <Clock size={12} /> {req.timeElapsed}
                </div>
              </div>

              {/* Card body */}
              <div className="p-4">
                <div className="mb-4">
                  <h3 className="text-base font-black text-text-primary leading-tight">
                    {req.petName}{' '}
                    <span className="text-sm text-text-secondary font-medium">({req.species} – {req.breed})</span>
                  </h3>
                  <p className="text-sm text-text-secondary mt-1 font-semibold">{req.ownerName}</p>
                </div>

                <div className="space-y-3 mb-4">
                  {/* Issue Box */}
                  <div className="bg-bg-primary border border-border-light p-3 rounded-2xl">
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">
                      Reported Issue
                    </p>
                    <p className="text-sm text-text-primary font-semibold">{req.issue}</p>
                  </div>

                  {/* Location + Phone */}
                  <div className="flex flex-col gap-2 px-1">
                    <div className="flex items-start gap-2.5 text-sm text-text-secondary">
                      <MapPin size={15} className="shrink-0 mt-0.5" />
                      <span className="font-medium break-words">{req.location}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                      <Phone size={15} className="shrink-0" />
                      <span className="font-medium">{req.phone}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(req, 'accept')}
                    disabled={processing === req.id}
                    className={`flex-1 h-12 font-bold rounded-2xl text-sm transition flex items-center justify-center gap-2 shadow-sm ${
                      processing === req.id
                        ? 'bg-text-primary text-white/50 cursor-not-allowed'
                        : 'bg-error text-white shadow-error/25 cursor-pointer'
                    }`}
                  >
                    <Phone size={16} />
                    {processing === req.id ? 'Connecting...' : 'Accept & Start Call'}
                  </button>
                  <button
                    onClick={() => handleAction(req, 'decline')}
                    disabled={processing === req.id}
                    className={`w-12 h-12 rounded-2xl transition flex items-center justify-center border shrink-0 ${
                      processing === req.id
                        ? 'bg-bg-primary text-text-disabled border-border-light cursor-not-allowed'
                        : 'bg-white border-border-light text-text-secondary shadow-sm cursor-pointer'
                    }`}
                    title="Forward to another available doctor"
                    aria-label="Forward to another available doctor"
                  >
                    <XCircle size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
