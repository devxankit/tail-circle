import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { VENDOR_TYPE_LABEL } from '../../../../constants/vendorTypes';
import { getActiveVendorProfile, getVendorLines } from '../../../../services/vendor';
import { usePrefersReducedMotion } from '../../../../hooks/usePrefersReducedMotion';
import { VendorComplianceBanner } from '../../components/VendorComplianceBanner';
import VerificationBanner from '../../components/VerificationBanner';
import { VendorShellContext } from './VendorShellContext';
import { getNavForType, matchActiveTab, resolveVendorType } from './vendorNavConfig';
import { AppBar } from './AppBar';
import { VendorBottomNav } from './VendorBottomNav';
import { SegmentedTabs } from './SegmentedTabs';
import { ChipTabs } from './ChipTabs';
import { BusinessSwitcherSheet } from './BusinessSwitcherSheet';
import { NotificationsSheet } from './NotificationsSheet';
import { VendorToastProvider, VendorToastHost } from './VendorToast';
import { VendorDialogProvider } from './VendorDialogs';
import { SkeletonList } from './SkeletonList';

const NAV_SPACE = 'calc(82px + env(safe-area-inset-bottom, 0px))';

/**
 * The partner app around every vendor screen: top bar, banners, the content
 * pane (with the page transition), bottom nav, and the toast host.
 *
 * Each of the five layout files renders this with its own type, bell and
 * logout; the shell itself needs no module context, so the shared pages
 * (payouts, support, settings) get the right chrome from the stored type.
 *
 * Tab-root screens get the identity bar and the bottom nav. Everything else —
 * a More row, a detail page, a form — is a sub-screen: Back + title, no nav.
 * Screens that swap to a detail in place tell the shell via `useSubScreen`.
 */
export function VendorAppShell({
  type: typeProp,
  business: businessProp,
  notifications,
  verification,
  appBarActions,
  badges: badgeProp,
  navDisabled = false,
  onLogout,
  children,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const reducedMotion = usePrefersReducedMotion();

  const type = typeProp || resolveVendorType(location.pathname);
  const nav = getNavForType(type);
  const match = matchActiveTab(type, location);

  const business = useMemo(() => {
    if (businessProp) return businessProp;
    const p = getActiveVendorProfile();
    return { name: p?.businessName, logo: p?.logo, approvalStatus: p?.approvalStatus };
  }, [businessProp]);
  const isMulti = getVendorLines().length > 1;

  /* ── Registrations from screens ─────────────────────────────── */

  const [screens, setScreens] = useState([]);
  const pushScreen = useCallback((id, config) => {
    setScreens((prev) => [...prev.filter((s) => s.id !== id), { id, config }]);
  }, []);
  const popScreen = useCallback((id) => {
    setScreens((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const [ctxBadges, setCtxBadges] = useState({});
  const setBadge = useCallback((key, count) => {
    setCtxBadges((prev) => (prev[key] === count ? prev : { ...prev, [key]: count }));
  }, []);

  const [stickies, setStickies] = useState({});
  const registerSticky = useCallback((id, height, aboveNav = false) => {
    setStickies((prev) => (
      prev[id]?.height === height && prev[id]?.aboveNav === aboveNav ? prev : { ...prev, [id]: { height, aboveNav } }
    ));
  }, []);
  const unregisterSticky = useCallback((id) => {
    setStickies((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const [bottomSlot, setBottomSlot] = useState(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  /* ── Where we are ───────────────────────────────────────────── */

  const override = screens.length ? screens[screens.length - 1].config : null;
  const stickyList = Object.values(stickies);
  const stickyHeight = Math.max(0, ...stickyList.map((s) => s.height));
  const hasSticky = stickyList.length > 0;
  // A bar that replaces the nav hides it; an `aboveNav` bar docks on top of it.
  const stickyHidesNav = stickyList.some((s) => !s.aboveNav);

  const isSub = Boolean(override) || !match.isRoot;
  const immersive = Boolean(override?.immersive ?? match.immersive);
  const hideBanners = immersive || Boolean(override?.hideBanners);
  const showNav = !isSub && !stickyHidesNav && !immersive;

  const defaultBack = useCallback(() => {
    const idx = window.history.state?.idx;
    if (typeof idx === 'number' && idx > 0) navigate(-1);
    else navigate(match.back || nav.home, { replace: true });
  }, [navigate, match.back, nav.home]);

  const onBack = override?.onBack || defaultBack;
  const title = override?.title ?? match.title;

  const activeTab = nav.tabs.find((t) => t.key === match.tabKey);
  const segments = !override && match.isRoot && activeTab?.segments ? activeTab.segments : null;

  const badges = { ...(badgeProp || {}), ...ctxBadges };
  // Shop keeps its panel shut until verified; More (and Log out) stay open.
  const disabledKeys = navDisabled ? nav.tabs.filter((t) => t.key !== 'more').map((t) => t.key) : [];

  /* ── Page transition + scroll reset ─────────────────────────── */

  const scrollRef = useRef(null);
  const pageRef = useRef(null);
  const routeKey = `${location.pathname}${location.search}`;
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    // Replayed in place rather than by re-keying the tree: a remount would
    // throw away module state (and, above it, the live booking alerts).
    if (reducedMotion || !pageRef.current?.animate) return;
    pageRef.current.animate(
      [
        { opacity: 0.65, transform: 'translate3d(12px, 0, 0)' },
        { opacity: 1, transform: 'translate3d(0, 0, 0)' },
      ],
      { duration: 280, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
    );
  }, [routeKey, reducedMotion]);

  // An in-place detail opening or closing starts at the top, as a page would.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [override?.title]);

  const contextValue = useMemo(() => ({
    type,
    nav,
    business,
    typeLabel: VENDOR_TYPE_LABEL[type] || 'Partner',
    isMulti,
    openSwitcher: () => setSwitcherOpen(true),
    onLogout,
    navDisabled,
    pushScreen,
    popScreen,
    setBadge,
    registerSticky,
    unregisterSticky,
    bottomSlot,
    navShown: showNav,
  }), [type, nav, business, isMulti, onLogout, navDisabled, pushScreen, popScreen, setBadge, registerSticky, unregisterSticky, bottomSlot, showNav]);

  const contentPadding = showNav
    ? (hasSticky ? `calc(${stickyHeight + 12}px + ${NAV_SPACE})` : NAV_SPACE)
    : hasSticky
      ? `${stickyHeight + 16}px`
      : 'calc(24px + env(safe-area-inset-bottom, 0px))';

  const toastBottom = showNav
    ? `calc(${hasSticky ? stickyHeight + 92 : 92}px + env(safe-area-inset-bottom, 0px))`
    : hasSticky
      ? `${stickyHeight + 12}px`
      : 'calc(24px + env(safe-area-inset-bottom, 0px))';

  return (
    <VendorShellContext.Provider value={contextValue}>
      <VendorToastProvider>
        <VendorDialogProvider>
          <div className="flex-1 min-h-0 w-full flex flex-col relative overflow-hidden bg-bg-primary">
            {!immersive && (
              isSub ? (
                <AppBar
                  variant="sub"
                  title={title}
                  onBack={onBack}
                  action={override?.action}
                />
              ) : (
                <AppBar
                  business={business}
                  typeLabel={VENDOR_TYPE_LABEL[type] || 'Partner'}
                  isMulti={isMulti}
                  onIdentityClick={() => setSwitcherOpen(true)}
                  actions={appBarActions}
                  bell={notifications}
                  onBellClick={() => setNotifOpen(true)}
                />
              )
            )}

            <div
              ref={scrollRef}
              data-vendor-scroll=""
              className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden hide-scrollbar"
              style={{ paddingBottom: contentPadding }}
            >
              <div ref={pageRef} className={immersive ? 'h-full' : 'px-4 pt-4 space-y-4'}>
                {!hideBanners && (
                  <>
                    {verification && (
                      <VerificationBanner
                        approvalStatus={verification.approvalStatus || 'pending'}
                        kycPath={verification.kycPath}
                        onOpenKyc={verification.onOpenKyc}
                      />
                    )}
                    <VendorComplianceBanner />
                  </>
                )}

                {segments && (
                  segments.length <= 3 && !activeTab.chips ? (
                    <SegmentedTabs items={segments} activeKey={match.segmentKey} />
                  ) : (
                    <ChipTabs items={segments} activeKey={match.segmentKey} />
                  )
                )}

                <Suspense fallback={<SkeletonList rows={4} />}>
                  {children ?? <Outlet />}
                </Suspense>
              </div>
            </div>

            {showNav && (
              <VendorBottomNav tabs={nav.tabs} activeKey={match.tabKey} badges={badges} disabledKeys={disabledKeys} />
            )}

            {/* Sticky action bars portal in here, outside the animated pane —
                on top of the nav when it shows, at the very bottom otherwise. */}
            <div
              ref={setBottomSlot}
              className="absolute inset-x-0 z-40"
              style={{ bottom: showNav ? 'calc(80px + env(safe-area-inset-bottom, 0px))' : 0 }}
            />

            <VendorToastHost bottom={toastBottom} />
          </div>

          <BusinessSwitcherSheet open={switcherOpen} onClose={() => setSwitcherOpen(false)} />
          {notifications && !notifications.decorative && (
            <NotificationsSheet open={notifOpen} onClose={() => setNotifOpen(false)} config={notifications} />
          )}
        </VendorDialogProvider>
      </VendorToastProvider>
    </VendorShellContext.Provider>
  );
}

export default VendorAppShell;
