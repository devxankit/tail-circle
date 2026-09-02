import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  fetchVendorProfile,
  fetchVendorDashboard,
  fetchShopProducts,
  fetchShopOrders,
  fetchShopReturns,
  fetchShopFeedback,
  getStoredVendor,
} from '../../../../services/vendor';

const ShopVendorContext = createContext();

/** Map the API profile shape to the fields the portal views expect. */
function toPortalProfile(p) {
  if (!p) return null;
  const verificationMap = { approved: 'Approved', pending: 'Pending', rejected: 'Rejected', suspended: 'Suspended' };
  return {
    businessName: p.businessName,
    ownerName: p.bank?.accountHolder || p.businessName,
    email: p.email,
    phone: p.phone,
    verification: verificationMap[p.approvalStatus] || 'Pending',
    status: p.online ? 'Online' : 'Offline',
    rating: p.rating || 0,
    policies: p.policies || { codEnabled: true, returnsEnabled: true, minOrderValue: 0 },
    logo: p.logo || 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=200&auto=format&fit=crop&q=60',
  };
}

export function ShopVendorProvider({ children }) {
  const stored = getStoredVendor();
  const [profile, setProfile] = useState(toPortalProfile(stored?.profile));
  const [notifications, setNotifications] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [returns, setReturns] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const [prof, prods, ords, rets, fb, dash] = await Promise.all([
      fetchVendorProfile().catch(() => null),
      fetchShopProducts().catch(() => []),
      fetchShopOrders().catch(() => []),
      fetchShopReturns().catch(() => []),
      fetchShopFeedback().catch(() => []),
      fetchVendorDashboard().catch(() => null),
    ]);
    if (prof) setProfile(toPortalProfile(prof));
    setProducts(prods);
    setOrders(ords);
    setReturns(rets);
    setFeedback(fb);
    setDashboard(dash);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <ShopVendorContext.Provider value={{
      profile, setProfile,
      notifications, setNotifications,
      products, setProducts,
      orders, setOrders,
      returns, setReturns,
      feedback, setFeedback,
      dashboard,
      loading, refresh,
    }}>
      {children}
    </ShopVendorContext.Provider>
  );
}

export function useShopVendor() {
  const context = useContext(ShopVendorContext);
  if (!context) {
    throw new Error('useShopVendor must be used within a ShopVendorProvider');
  }
  return context;
}
