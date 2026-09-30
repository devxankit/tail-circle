/**
 * Shop's toast API, now served by the partner app's single toast host (a
 * centred pill above the bottom nav). The names and the
 * `addToast({ message, type, duration })` call are unchanged, so every Shop
 * screen keeps its calls; the provider is mounted by the partner app shell.
 */
export { ToastProvider } from '../../vendor/mobile/VendorToast';
export { useToast } from '../../vendor/mobile/toastContext';
