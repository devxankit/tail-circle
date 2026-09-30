import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePetEvents } from './context/PetEventsContext';
import { vendorLogout } from '../../../services/vendor';
import { VendorAppShell } from '../vendor/mobile/VendorAppShell';

/**
 * The Events partner's shell.
 *
 * Chrome is the partner app shell; this keeps the Events-specific parts: the
 * notifications from the Events context (and its mark-all-read), the verified
 * gate on the bell, and logout. "+ Create Event" moved from the header to the
 * Events tab. The header search box was never wired to anything and is gone.
 */
export function PetEventsLayout() {
  const { profile, notifications, markAllRead } = usePetEvents();
  const navigate = useNavigate();

  const isVerified = profile?.approvalStatus === 'approved' || profile?.verification === 'Approved';
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = () => {
    vendorLogout();
    navigate('/vendor/login');
  };

  return (
    <VendorAppShell
      type="events"
      business={{ name: profile.businessName, logo: profile.logo, email: profile.email, approvalStatus: profile.approvalStatus }}
      verification={{ approvalStatus: profile?.approvalStatus || 'pending', kycPath: '/vendor/events-organizer/settings' }}
      onLogout={handleLogout}
      notifications={{
        disabled: !isVerified,
        unreadCount,
        showDot: unreadCount > 0 && isVerified,
        countLabel: `${unreadCount} New`,
        items: notifications.map((n) => ({ id: n.id, title: n.message, time: n.time, unread: !n.read })),
        onMarkAllRead: markAllRead,
        markAllDisabled: !unreadCount,
        emptyText: 'No notifications',
      }}
    />
  );
}
