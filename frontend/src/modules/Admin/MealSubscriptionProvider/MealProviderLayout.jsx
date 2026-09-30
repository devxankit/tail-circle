import { Outlet, useNavigate } from 'react-router-dom';
import { vendorLogout, updateVendorProfile } from '../../../services/vendor';
import { useMealProvider } from './context/MealProviderContext';
import { VendorAppShell } from '../vendor/mobile/VendorAppShell';
import { useApiNotifications } from '../vendor/mobile/useApiNotifications';
import { reportVendorError } from '../vendor/mobile/toastContext';

/**
 * The Fresh Meals partner's shell.
 *
 * Chrome is the partner app shell; this keeps the Meals-specific parts: the
 * kitchen open/closed switch (the profile's `online` flag — separate from the
 * availability toggle in the app bar), shown as a row at the top of Home via
 * the outlet context, and logout. The bell opens the account's notifications
 * (it used to be a decorative icon).
 */
export function MealProviderLayout() {
  const navigate = useNavigate();
  const { profile, updateProfile } = useMealProvider();
  const notifications = useApiNotifications();

  const toggleKitchen = async () => {
    const nextOnline = profile.status !== 'Online';
    updateProfile({ status: nextOnline ? 'Online' : 'Offline' });
    try { await updateVendorProfile({ online: nextOnline }); }
    catch (err) {
      updateProfile({ status: profile.status === 'Online' ? 'Online' : 'Offline' });
      reportVendorError(err, 'Could not change the kitchen status.');
    }
  };

  const handleLogout = () => {
    vendorLogout();
    navigate('/vendor/login');
  };

  return (
    <VendorAppShell
      type="meal_subscription"
      business={{ name: profile.businessName, logo: profile.logo, email: profile.email, approvalStatus: profile.approvalStatus }}
      verification={{ approvalStatus: profile?.approvalStatus || 'pending', kycPath: '/vendor/meal-provider/settings' }}
      onLogout={handleLogout}
      notifications={notifications}
    >
      <Outlet context={{ kitchenOpen: profile.status === 'Online', toggleKitchen }} />
    </VendorAppShell>
  );
}
