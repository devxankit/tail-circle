import React from 'react';
import { Calendar, AlertTriangle, Video, IndianRupee, Users, Clock, Activity } from 'lucide-react';
import { useVendor } from '../context/ClinicVendorContext';
import { StatGrid, SectionLabel, ListCard, CardAction, StatusBadge, EmptyState } from '../../vendor/mobile';

import VerificationBanner from '../../components/VerificationBanner';

const STATUS_TONE = { Confirmed: 'info', Completed: 'success', Pending: 'warning' };

export function DoctorDashboardView({ onNavigate }) {
  const { profile, doctorAppointments, doctorPatients } = useVendor();

  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const todayAppointments = doctorAppointments.filter(a => a.date === today);
  const pendingAppointments = todayAppointments.filter(a => a.status === 'Pending');
  const videoAppointments = todayAppointments.filter(a => a.type === 'Video Consultation');
  const emergencyRequests = todayAppointments.filter(a => a.type === 'Emergency' && a.status === 'Pending');
  const todayEarnings = todayAppointments
    .filter(a => a.status === 'Completed')
    .reduce((sum, a) => sum + (a.fee || 0), 0);

  return (
    <div className="space-y-5">
      <VerificationBanner
        approvalStatus={profile?.approvalStatus || 'pending'}
        onOpenKyc={() => onNavigate('vet_profile')}
      />

      {/* KPIs — the first three open their lists, as the cards did. */}
      <StatGrid
        tiles={[
          { label: "Today's Appointments", value: todayAppointments.length, icon: Calendar, tone: 'teal', onClick: () => onNavigate('appointments_list') },
          {
            label: 'Emergency Requests',
            value: emergencyRequests.length,
            icon: AlertTriangle,
            tone: emergencyRequests.length > 0 ? 'error' : 'neutral',
            hint: emergencyRequests.length > 0 ? 'Needs attention' : undefined,
            onClick: () => onNavigate('emergency'),
          },
          { label: 'Video Consults', value: videoAppointments.length, icon: Video, tone: 'primary', onClick: () => onNavigate('video_consultations') },
          { label: "Today's Earnings", value: `₹${todayEarnings.toLocaleString('en-IN')}`, icon: IndianRupee, tone: 'success' },
        ]}
      />

      {/* Action required */}
      <div>
        <SectionLabel
          action={pendingAppointments.length > 0 ? (
            <span className="bg-primary-main text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {pendingAppointments.length}
            </span>
          ) : null}
        >
          Action Required
        </SectionLabel>

        {pendingAppointments.length === 0 ? (
          <EmptyState compact icon={Activity} text="No pending actions" />
        ) : (
          <div className="space-y-3">
            {pendingAppointments.map(apt => (
              <ListCard
                key={apt.id}
                highlight={apt.type === 'Emergency'}
                title={`${apt.owner}'s ${apt.petName}`}
                subtitle={apt.issue}
                badge={(
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-text-secondary">
                    {apt.type === 'Emergency' && <span className="w-1.5 h-1.5 rounded-full bg-error" />}
                    {apt.type === 'Emergency' ? 'Emergency Request' : 'New Request'}
                  </span>
                )}
                amount={<span className="text-[11px] font-semibold text-text-secondary">{apt.time}</span>}
                footer={(
                  <>
                    <CardAction
                      tone="primary"
                      className="flex-1"
                      onClick={() => apt.type === 'Emergency' ? onNavigate('emergency') : onNavigate('appointment_detail', apt)}
                    >
                      {apt.type === 'Emergency' ? 'Review & Accept' : 'Confirm'}
                    </CardAction>
                    <CardAction tone="outline" className="flex-1" onClick={() => onNavigate('schedule')}>
                      Reschedule
                    </CardAction>
                  </>
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Today's appointments */}
      <div>
        <SectionLabel
          action={(
            <button
              onClick={() => onNavigate('appointments_list')}
              className="min-h-[36px] text-xs font-bold text-primary-main cursor-pointer"
            >
              View full schedule
            </button>
          )}
        >
          Today's Appointments
        </SectionLabel>

        {todayAppointments.length === 0 ? (
          <EmptyState compact icon={Calendar} text="No appointments scheduled for today." />
        ) : (
          <div className="space-y-3">
            {todayAppointments.map((apt) => (
              <ListCard
                key={apt.id}
                title={`${apt.owner}'s ${apt.petName}`}
                subtitle={apt.breed ? `(${apt.breed})` : undefined}
                badge={<StatusBadge label={apt.status} tone={STATUS_TONE[apt.status] || 'neutral'} />}
                amount={(
                  <span className="inline-flex items-center gap-1 text-[12px] font-bold text-text-primary">
                    <Clock size={12} className="text-text-secondary" /> {apt.time}
                  </span>
                )}
                footer={(
                  <>
                    {apt.status === 'Confirmed' && apt.type === 'Video Consultation' && (
                      <CardAction tone="primary" icon={Video} className="flex-1" onClick={() => onNavigate('video_call', apt)}>
                        Join Call
                      </CardAction>
                    )}
                    {apt.status === 'Confirmed' && apt.type !== 'Video Consultation' && (
                      <CardAction tone="primary" className="flex-1" onClick={() => onNavigate('appointment_detail', apt)}>
                        Start Checkup
                      </CardAction>
                    )}
                    <CardAction tone="outline" className="flex-1" onClick={() => onNavigate('appointment_detail', apt)}>
                      View Record
                    </CardAction>
                  </>
                )}
              >
                <p className="text-xs text-text-secondary">Issue: {apt.issue}</p>
                <div className="mt-2">
                  <StatusBadge label={apt.type} tone={apt.type === 'Emergency' ? 'error' : 'neutral'} size="xs" />
                </div>
              </ListCard>
            ))}
          </div>
        )}
      </div>

      {/* Quick stats */}
      <StatGrid
        tiles={[
          { label: 'Total Patients', value: doctorPatients.length, icon: Users, hint: 'View Directory', onClick: () => onNavigate('patients_list') },
          { label: 'Queue', value: pendingAppointments.length, icon: Clock, hint: 'Manage Queue', onClick: () => onNavigate('appointments_list') },
        ]}
      />
    </div>
  );
}
