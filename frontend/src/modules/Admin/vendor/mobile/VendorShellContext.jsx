import { createContext, useContext, useEffect, useId, useRef } from 'react';

/**
 * What a screen inside the partner app can tell the shell around it.
 *
 * Screens that swap to a detail view in place (an order opened from a list, a
 * form replacing its list) are not separate routes, so the shell cannot see
 * them from the URL. They register here instead: a sub-screen title and Back
 * handler, a badge on a tab, or a sticky action bar that should replace the
 * bottom nav while it shows.
 *
 * Every hook is a no-op outside the shell, so a screen still renders if it is
 * mounted somewhere else.
 */
export const VendorShellContext = createContext(null);

export function useVendorShell() {
  return useContext(VendorShellContext);
}

/**
 * Turn the current screen into a sub-screen while `config` is truthy.
 *
 *   useSubScreen(selected ? { title: selected.id, onBack: () => setSelected(null) } : null);
 *
 * `onBack` replaces the default Back (history, falling back to the tab root).
 * `action` is an optional `{ label, icon, onClick, disabled }` for the app bar.
 * `hideBanners` hides the verification/compliance banners; `immersive` hides
 * the app bar too (a video call).
 */
export function useSubScreen(config) {
  const shell = useContext(VendorShellContext);
  const id = useId();

  // Handlers are read through a ref so the registration below does not have
  // to be redone every time a parent re-renders with a fresh closure.
  const handlers = useRef({});
  useEffect(() => {
    handlers.current = { onBack: config?.onBack, onAction: config?.action?.onClick };
  });

  const active = Boolean(config);
  const title = config?.title;
  const hideBanners = Boolean(config?.hideBanners);
  const immersive = Boolean(config?.immersive);
  const hasBack = Boolean(config?.onBack);
  const actionLabel = config?.action?.label;
  const actionIcon = config?.action?.icon;
  const actionDisabled = Boolean(config?.action?.disabled);

  const push = shell?.pushScreen;
  const pop = shell?.popScreen;
  useEffect(() => {
    if (!push || !active) return undefined;
    push(id, {
      title,
      hideBanners,
      immersive,
      onBack: hasBack ? () => handlers.current.onBack?.() : null,
      action: actionLabel
        ? { label: actionLabel, icon: actionIcon, disabled: actionDisabled, onClick: () => handlers.current.onAction?.() }
        : null,
    });
    return () => pop(id);
  }, [push, pop, id, active, title, hideBanners, immersive, hasBack, actionLabel, actionIcon, actionDisabled]);
}

/** Show a count on a tab (by the tab's `badgeKey`). 0 or null hides it. */
export function useNavBadge(badgeKey, count) {
  const shell = useContext(VendorShellContext);
  const set = shell?.setBadge;
  useEffect(() => {
    if (!set) return undefined;
    set(badgeKey, count);
    return () => set(badgeKey, null);
  }, [set, badgeKey, count]);
}
