import { api, setTokens, clearTokens } from './api';

/**
 * Super-admin panel API. Admins authenticate with email + password and share the
 * same token client as the rest of the app (an admin session overwrites any
 * other session in this browser). Session identity is cached in `admin_info`.
 */

const ADMIN_KEY = 'admin_info';

export function getStoredAdmin() {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_KEY) || 'null');
  } catch {
    return null;
  }
}

export function isAdminAuthed() {
  return Boolean(getStoredAdmin());
}

export async function adminLogin(email, password) {
  const { data } = await api.post('/admin/login', { email, password });
  setTokens({ accessToken: data.tokens.accessToken, refreshToken: data.tokens.refreshToken });
  localStorage.setItem(ADMIN_KEY, JSON.stringify(data.user));
  return data.user;
}

export function adminLogout() {
  clearTokens();
  localStorage.removeItem(ADMIN_KEY);
}

/* ── Dashboard & Action Items ──────────────────────────────── */
export async function fetchAdminDashboard() {
  const { data } = await api.get('/admin/dashboard');
  return data;
}

export async function fetchActionItems(params = {}) {
  const { data } = await api.get('/admin/action-items', { params });
  return data;
}

export async function resolveActionItemApi(id, { action = 'approve', note = '' } = {}) {
  const { data } = await api.post(`/admin/action-items/${id}/resolve`, { action, note });
  return data;
}


/* ── Users & pets ─────────────────────────────────────────── */
export async function fetchAdminUsers(search) {
  const { data } = await api.get('/admin/users', { params: search ? { search } : {} });
  return data;
}
export async function setAdminUserBlocked(id, blocked) {
  const { data } = await api.patch(`/admin/users/${id}/block`, { blocked });
  return data;
}
export async function fetchAdminPets(search) {
  const { data } = await api.get('/admin/pets', { params: search ? { search } : {} });
  return data;
}

/* ── Vendors & approvals ──────────────────────────────────── */
export async function fetchAdminVendors(params = {}) {
  const { data } = await api.get('/admin/vendors', { params });
  return data;
}
export async function fetchPendingVendors() {
  const { data } = await api.get('/admin/vendors/pending');
  return data;
}
export async function fetchVendorPerformance() {
  const { data } = await api.get('/admin/vendors/performance');
  return data;
}
export async function fetchVendorDocuments(id) {
  const { data } = await api.get(`/admin/vendors/${id}/documents`);
  return data;
}
export async function fetchAllAdminDocuments() {
  const { data } = await api.get('/admin/documents');
  return data;
}
export async function verifyAdminDocument(vendorId, kind, action) {
  const { data } = await api.post(`/admin/documents/${vendorId}/${kind}/verify`, { action });
  return data;
}
/**
 * Approve a vendor. A *pending* vendor is refused (400) while its KYC documents
 * are unverified — pass `{ force: true }` to override deliberately.
 */
export async function approveVendorApi(id, { force = false } = {}) {
  const { data } = await api.post(`/admin/vendors/${id}/approve`, force ? { force: true } : {});
  return data;
}
/**
 * Approve a vendor and surface the KYC gate instead of failing silently.
 *
 * On a refusal the reviewer is shown exactly what is unverified and can
 * override; the override is recorded as a forced approval in the audit trail.
 * Resolves true only when the vendor really ended up approved, so callers must
 * not update their list optimistically.
 */
export async function approveVendorGuarded(id, name = 'this vendor') {
  try {
    await approveVendorApi(id);
    return true;
  } catch (err) {
    const message = err?.message || 'Approve failed';
    if (!/KYC incomplete/i.test(message)) {
      window.alert(message);
      return false;
    }
    const items = message.replace(/^.*KYC incomplete:\s*/i, '').split(', ');
    const ok = window.confirm(
      `KYC is incomplete for ${name}:\n\n• ${items.join('\n• ')}\n\n` +
      `Verify these on the Vendor Documents screen first.\n\nApprove anyway?`
    );
    if (!ok) return false;
    try {
      await approveVendorApi(id, { force: true });
      return true;
    } catch (retryErr) {
      window.alert(retryErr?.message || 'Approve failed');
      return false;
    }
  }
}
export async function rejectVendorApi(id) {
  const { data } = await api.post(`/admin/vendors/${id}/reject`);
  return data;
}
export async function suspendVendorApi(id) {
  const { data } = await api.post(`/admin/vendors/${id}/suspend`);
  return data;
}

/* ── Banners & settings ───────────────────────────────────── */
export async function fetchAdminBanners() {
  const { data } = await api.get('/admin/banners');
  return data;
}
export async function createBannerApi(body) {
  const { data } = await api.post('/admin/banners', body);
  return data;
}
export async function updateBannerApi(id, patch) {
  const { data } = await api.patch(`/admin/banners/${id}`, patch);
  return data;
}
export async function deleteBannerApi(id) {
  await api.delete(`/admin/banners/${id}`);
}
export async function fetchAdminSettings() {
  const { data } = await api.get('/admin/settings');
  return data;
}
export async function updateAdminSetting(key, value) {
  const { data } = await api.put(`/admin/settings/${key}`, { value });
  return data;
}

/* ── Operations ───────────────────────────────────────────── */
export const fetchAdminOrders = async () => (await api.get('/admin/orders')).data;
export const fetchAdminBookings = async () => (await api.get('/admin/bookings')).data;
export const fetchAdminAppointments = async () => (await api.get('/admin/appointments')).data;
export const fetchAdminDeliveries = async () => (await api.get('/admin/deliveries')).data;
export const fetchAdminReturns = async () => (await api.get('/admin/returns')).data;
export const resolveAdminReturn = async (id, action) => (await api.post(`/admin/returns/${id}/resolve`, { action })).data;
export const fetchAdminSupport = async () => (await api.get('/admin/support')).data;
export const replyAdminSupport = async (id, message) => (await api.post(`/admin/support/${id}/reply`, { message })).data;

/* ── Catalogs ─────────────────────────────────────────────── */
export const fetchAdminProducts = async (params = {}) => (await api.get('/admin/products', { params })).data;
export const createAdminProduct = async (body) => (await api.post('/admin/products', body)).data;
export const updateAdminProduct = async (id, body) => (await api.patch(`/admin/products/${id}`, body)).data;
export const deleteAdminProduct = async (id) => api.delete(`/admin/products/${id}`);
export const fetchAdminProductCategories = async () => (await api.get('/admin/product-categories')).data;
export const createAdminProductCategory = async (body) => (await api.post('/admin/product-categories', body)).data;
export const updateAdminProductCategory = async (id, body) => (await api.patch(`/admin/product-categories/${id}`, body)).data;
export const deleteAdminProductCategory = async (id) => api.delete(`/admin/product-categories/${id}`);
export const fetchAdminBreeds = async (params = {}) => (await api.get('/admin/breeds', { params })).data;
export const createAdminBreed = async (body) => (await api.post('/admin/breeds', body)).data;
export const updateAdminBreed = async (id, body) => (await api.patch(`/admin/breeds/${id}`, body)).data;
export const deleteAdminBreed = async (id) => api.delete(`/admin/breeds/${id}`);
export const fetchAdminMealPlans = async () => (await api.get('/admin/meal-plans')).data;
export const createAdminMealPlan = async (body) => (await api.post('/admin/meal-plans', body)).data;
export const updateAdminMealPlan = async (id, body) => (await api.patch(`/admin/meal-plans/${id}`, body)).data;
export const deleteAdminMealPlan = async (id) => api.delete(`/admin/meal-plans/${id}`);
export const fetchAdminDoctorServices = async () => (await api.get('/admin/doctor-services')).data;
export const updateAdminDoctorService = async (id, body) => (await api.patch(`/admin/doctor-services/${id}`, body)).data;
export const fetchAdminEventCategories = async () => (await api.get('/admin/event-categories')).data;
export const fetchAdminMemorialPackages = async () => (await api.get('/admin/memorial-packages')).data;
export const fetchAdminGroomingDaycare = async () => (await api.get('/admin/grooming-daycare')).data;
export const updateAdminGroomingService = async (id, body) => (await api.patch(`/admin/grooming-daycare/${id}`, body)).data;
/** Real partner salons/centres plus month-to-date volume for the admin console. */
export const fetchAdminGroomingFacilities = async () => (await api.get('/admin/grooming-facilities')).data;
export const fetchAdminAddons = async () => (await api.get('/admin/addons')).data;
export const updateAdminAddon = async (id, body) => (await api.patch(`/admin/addons/${id}`, body)).data;

/* Generic catalog-config store (services screens: product categories, doctor
   services, add-ons/amenities, memorial packages, event categories, grooming). */
export const fetchAdminConfig = async (group) => (await api.get(`/admin/config/${group}`)).data;
export const createAdminConfig = async (group, body) => (await api.post(`/admin/config/${group}`, body)).data;
export const updateAdminConfig = async (id, body) => (await api.patch(`/admin/config/item/${id}`, body)).data;
export const deleteAdminConfig = async (id) => api.delete(`/admin/config/item/${id}`);

/* ── Finance ──────────────────────────────────────────────── */
export const fetchAdminTransactions = async (params = {}) => (await api.get('/admin/transactions', { params })).data;
export const fetchAdminPaymentsOverview = async () => (await api.get('/admin/payments-overview')).data;
export const fetchAdminCommission = async () => (await api.get('/admin/commission')).data;
export const setAdminCommission = async (key, value) => (await api.put(`/admin/commission/${key}`, { value })).data;
export const fetchAdminPayouts = async (params = {}) => (await api.get('/admin/payouts', { params })).data;
export const payAdminPayout = async (id, utr) => (await api.post(`/admin/payouts/${id}/pay`, { utr })).data;
export const fetchAdminWalletOverview = async () => (await api.get('/admin/wallet-overview')).data;
export const adjustAdminWallet = async (id, body) => (await api.post(`/admin/wallet/${id}/adjust`, body)).data;
export const fetchAdminTaxReport = async () => (await api.get('/admin/tax-report')).data;

/* ── Platform ─────────────────────────────────────────────── */
export const sendAdminBroadcast = async (body) => (await api.post('/admin/broadcast', { ...body, confirm: true })).data;
export const fetchAdminPosts = async (reported) => (await api.get('/admin/posts', { params: reported ? { reported: 1 } : {} })).data;
export const moderateAdminPost = async (id, action) => (await api.post(`/admin/posts/${id}/moderate`, { action })).data;
export const fetchAdminReviews = async (params = {}) => (await api.get('/admin/reviews', { params })).data;
export const moderateAdminReview = async (id, action) => (await api.post(`/admin/reviews/${id}/moderate`, { action })).data;
export const fetchAdminReports = async () => (await api.get('/admin/reports')).data;
export const fetchAdminAuditLogs = async () => (await api.get('/admin/audit-logs')).data;
export const fetchAdminStaff = async () => (await api.get('/admin/staff')).data;
export const createAdminStaff = async (body) => (await api.post('/admin/staff', body)).data;
export const updateAdminStaff = async (id, body) => (await api.patch(`/admin/staff/${id}`, body)).data;
export const removeAdminStaff = async (id) => api.delete(`/admin/staff/${id}`);

/* ── Meal-ops super-admin portal ──────────────────────────── */
export const fetchMealPortalData = async () => (await api.get('/admin/meal-portal')).data;

/* ── Public banners (user-app Home) ───────────────────────── */
export async function fetchPublicBanners() {
  const { data } = await api.get('/banners');
  return data;
}
