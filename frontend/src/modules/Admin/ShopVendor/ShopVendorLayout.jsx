import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useShopVendor } from './context/ShopVendorContext';
import { GlobalSearch } from './components/GlobalSearch';
import { updateVendorProfile, vendorLogout } from '../../../services/vendor';
import { VendorAppShell } from '../vendor/mobile/VendorAppShell';
import { AppBarIconButton } from '../vendor/mobile/AppBar';
import { useApiNotifications } from '../vendor/mobile/useApiNotifications';
import { reportVendorError } from '../vendor/mobile/toastContext';

/**
 * The Shop partner's shell.
 *
 * Chrome is the partner app shell; this keeps what is Shop's own: the store
 * open/closed switch (the profile's `online` flag — separate from the
 * availability toggle in the app bar), the verified-only navigation, the
 * search sheet and logout. Notifications are the account's real feed (the
 * shop's own list was never filled, so the bell was always empty).
 *
 * The store switch now lives at the top of Shop Home, so its state and handler
 * are handed down through the outlet context.
 */
export function ShopVendorLayout() {
  const { profile, setProfile } = useShopVendor();
  const navigate = useNavigate();
  const notifications = useApiNotifications();
  const [togglingStore, setTogglingStore] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const storeOpen = profile.status === 'Online';
  const toggleStoreOpen = async () => {
    if (togglingStore) return;
    const nextOnline = !storeOpen;
    setTogglingStore(true);
    setProfile(prev => ({ ...prev, status: nextOnline ? 'Online' : 'Offline' }));
    try {
      await updateVendorProfile({ online: nextOnline });
    } catch (err) {
      setProfile(prev => ({ ...prev, status: storeOpen ? 'Online' : 'Offline' }));
      reportVendorError(err, 'Could not change the store status.');
    } finally {
      setTogglingStore(false);
    }
  };

  const isVerified = profile.verification === 'Approved';
  const unreadCount = notifications.unreadCount;

  // Clears the session like every other panel (Shop's used to only navigate,
  // leaving the partner signed in).
  const handleLogout = () => {
    vendorLogout();
    navigate('/vendor/login');
  };

  return (
    <VendorAppShell
      type="shop"
      business={{ name: profile.businessName, logo: profile.logo, email: profile.email, approvalStatus: profile.approvalStatus }}
      verification={{ approvalStatus: profile?.approvalStatus || 'pending', kycPath: '/vendor/shop-provider/settings' }}
      navDisabled={!isVerified}
      badges={{ orders: isVerified ? unreadCount : 0 }}
      onLogout={handleLogout}
      appBarActions={(
        <AppBarIconButton icon={Search} label="Search" onClick={() => setSearchOpen(true)} disabled={!isVerified} />
      )}
      notifications={{
        ...notifications,
        disabled: !isVerified,
        showCount: true,
        showDot: isVerified && notifications.showDot,
        footer: unreadCount === 0 ? (
          <p className="text-center text-[10px] font-bold text-text-secondary uppercase tracking-wider">All caught up!</p>
        ) : null,
        emptyText: 'No notifications',
      }}
    >
      <Outlet context={{ storeOpen, toggleStoreOpen, togglingStore, isVerified }} />
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} disabled={!isVerified} />
    </VendorAppShell>
  );
}
