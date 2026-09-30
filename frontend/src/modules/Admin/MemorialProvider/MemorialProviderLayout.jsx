import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useMemorialProvider } from './context/MemorialProviderContext';
import { vendorLogout } from '../../../services/vendor';
import { CreateRequestModal } from './components/CreateRequestModal';
import { VendorAppShell } from '../vendor/mobile/VendorAppShell';
import { useApiNotifications } from '../vendor/mobile/useApiNotifications';

/**
 * The Last Ride (memorial) partner's shell.
 *
 * Chrome is the partner app shell. This keeps the Memorial-specific parts: the
 * verified gate on the bell (which now shows the account's real notifications —
 * the context's own list was never filled), logout, and the New Request form — whose button moved from the header to the Requests
 * tab, so opening it is handed down through the outlet context.
 *
 * The old sidebar linked to routes that never existed (bookings,
 * consultations, packages, tributes, products, feedback); the partner app's
 * nav lists the screens that are actually routed.
 */
export function MemorialProviderLayout() {
  const { profile, services, addons, addRequest } = useMemorialProvider();
  const navigate = useNavigate();
  const notifications = useApiNotifications();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const isVerified = profile.verification === 'Approved';
  const unreadCount = notifications.unreadCount;

  const handleLogout = () => {
    vendorLogout();
    navigate('/vendor/login');
  };

  return (
    <VendorAppShell
      type="memorial"
      business={{ name: profile.businessName, logo: profile.logo, email: profile.email, approvalStatus: profile.approvalStatus }}
      verification={{ approvalStatus: profile?.approvalStatus || 'pending', kycPath: '/vendor/memorial-provider/settings' }}
      onLogout={handleLogout}
      notifications={{
        ...notifications,
        disabled: !isVerified,
        showDot: unreadCount > 0 && isVerified,
        countLabel: `${unreadCount} New`,
        emptyText: 'No notifications',
      }}
    >
      <Outlet context={{ isVerified, openCreateRequest: () => setIsCreateModalOpen(true) }} />

      <CreateRequestModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={(data) => addRequest(data)}
        services={services}
        addons={addons}
      />
    </VendorAppShell>
  );
}
