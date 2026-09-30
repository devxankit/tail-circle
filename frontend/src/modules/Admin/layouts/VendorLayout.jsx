import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { vendorLogout } from '../../../services/vendor';
import { VendorAppShell } from '../vendor/mobile/VendorAppShell';
import { useApiNotifications } from '../vendor/mobile/useApiNotifications';

/**
 * The shell for the clinic, grooming, daycare and adoption panels and for the
 * shared pages (payouts, support, settings, service standing, More).
 *
 * All chrome now lives in the partner app shell; this keeps only what is not
 * visual: the session check, the header bell's notifications and logout. The
 * business type — and so which tabs show — comes from the path for a module
 * page and from the stored active type on the shared pages.
 */
export function VendorLayout() {
  const navigate = useNavigate();
  const notifications = useApiNotifications();

  const handleLogout = () => {
    vendorLogout();
    navigate('/vendor/login');
  };

  useEffect(() => {
    const token = localStorage.getItem('tc_access_token');
    const info = localStorage.getItem('vendor_info');
    if (!token || !info) {
      navigate('/vendor/login', { replace: true });
    }
  }, [navigate]);

  return <VendorAppShell notifications={notifications} onLogout={handleLogout} />;
}

export default VendorLayout;
