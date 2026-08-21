import { api, setTokens, clearTokens } from './api';

/**
 * Vendor portal API. Vendors authenticate separately from pet-parent users but
 * share the same token client (a vendor session overwrites the user session in
 * this browser — the portals are distinct entry points). Login/register map the
 * VendorAuth form's role slugs (shop/doctor/meal/event/memorial) to the backend.
 */

const VENDOR_KEY = 'vendor_info';

export function getStoredVendor() {
  try {
    return JSON.parse(localStorage.getItem(VENDOR_KEY) || 'null');
  } catch {
    return null;
  }
}

function storeSession({ accessToken, refreshToken, user, profile }) {
  setTokens({ accessToken, refreshToken });
  localStorage.setItem(VENDOR_KEY, JSON.stringify({ user, profile }));
  return { user, profile };
}

export function updateStoredVendor(updatedProfile) {
  const current = getStoredVendor() || {};
  localStorage.setItem(VENDOR_KEY, JSON.stringify({ ...current, profile: { ...current.profile, ...updatedProfile } }));
}

export function vendorLogout() {
  clearTokens();
  localStorage.removeItem(VENDOR_KEY);
}

/* ── Auth ─────────────────────────────────────────────────── */

export async function registerVendor(form) {
  const { data } = await api.post('/vendor/register', {
    businessName: form.businessName,
    email: form.email,
    phone: form.phone,
    role: form.role,
    city: form.city,
    address: form.address,
    password: form.password || undefined,
    licenseUrl: form.licenseUrl,
    ownerIdUrl: form.ownerIdUrl,
    bankName: form.bankName,
    accountHolder: form.accountHolder,
    accountNumber: form.accountNumber,
    ifscCode: form.ifscCode,
    accountType: form.accountType,
    hasGst: form.hasGst,
    gstNumber: form.gstNumber,
  });
  return data; // { registrationNo, approvalStatus }
}

export async function loginVendorPassword(email, password, role = null) {
  const { data } = await api.post('/vendor/login', { email, password, role, vendorType: role });
  return storeSession(data);
}

export async function requestVendorOtp(identifier, role = null) {
  const { data } = await api.post('/vendor/request-otp', { registrationNo: identifier, identifier, role, vendorType: role });
  return data;
}

export async function loginVendorOtp(identifier, code, role = null) {
  const { data } = await api.post('/vendor/verify-otp', { registrationNo: identifier, identifier, code, role, vendorType: role });
  return storeSession(data);
}

/* ── Common ───────────────────────────────────────────────── */

export async function fetchVendorProfile() {
  const { data } = await api.get('/vendor/me');
  return data;
}

export async function updateVendorProfile(patch) {
  const { data } = await api.patch('/vendor/profile', patch);
  if (data) updateStoredVendor(data);
  return data;
}

/** Generic KYC document re-upload (everyone but clinic, which uses /vet/documents). */
export async function addVendorDocument(kind, url) {
  const { data } = await api.post('/vendor/documents', { kind, url });
  return data;
}

export async function removeVendorDocument(index) {
  const { data } = await api.delete(`/vendor/documents/${index}`);
  return data;
}

export async function changeVendorPassword(currentPassword, newPassword) {
  const { data } = await api.patch('/vendor/password', { currentPassword, newPassword });
  return data;
}

export async function fetchVendorDashboard() {
  const { data } = await api.get('/vendor/dashboard');
  return data;
}

export async function fetchVendorLedger() {
  const { data } = await api.get('/vendor/ledger');
  return data;
}

export async function fetchVendorPayouts() {
  const { data } = await api.get('/vendor/payouts');
  return data;
}

export async function requestVendorPayout() {
  const { data } = await api.post('/vendor/payouts/request');
  return data;
}

/* ── Shop portal ──────────────────────────────────────────── */

export async function fetchShopProducts() {
  const { data } = await api.get('/vendor/products');
  return data;
}

export async function createShopProduct(body) {
  const { data } = await api.post('/vendor/products', body);
  return data;
}

export async function updateShopProduct(id, body) {
  const { data } = await api.patch(`/vendor/products/${id}`, body);
  return data;
}

export async function deleteShopProduct(id) {
  await api.delete(`/vendor/products/${id}`);
}

export async function adjustShopStock(id, payload) {
  const { data } = await api.post(`/vendor/products/${id}/stock`, payload);
  return data;
}

export async function fetchShopOrders() {
  const { data } = await api.get('/vendor/orders');
  return data;
}

export async function updateShopOrderStatus(id, status) {
  const { data } = await api.patch(`/vendor/orders/${id}/status`, { status });
  return data;
}

export async function fetchShopReturns() {
  const { data } = await api.get('/vendor/returns');
  return data;
}

export async function resolveShopReturn(id, action) {
  const { data } = await api.post(`/vendor/returns/${id}/resolve`, { action });
  return data;
}

export async function fetchShopFeedback() {
  const { data } = await api.get('/vendor/feedback');
  return data;
}

export async function replyToShopFeedback(id, text) {
  const { data } = await api.post(`/vendor/feedback/${id}/reply`, { text });
  return data;
}

/* ── Meal Subscription portal ─────────────────────────────── */

export async function fetchMealPlans() {
  const { data } = await api.get('/vendor/meal-plans');
  return data;
}

export async function createMealPlan(body) {
  const { data } = await api.post('/vendor/meal-plans', body);
  return data;
}

export async function updateMealPlan(id, body) {
  const { data } = await api.patch(`/vendor/meal-plans/${id}`, body);
  return data;
}

export async function deleteMealPlan(id) {
  await api.delete(`/vendor/meal-plans/${id}`);
}

export async function fetchMealSubscriptions() {
  const { data } = await api.get('/vendor/subscriptions');
  return data;
}

export async function pauseMealSubscription(id, resume = false) {
  const { data } = await api.post(`/vendor/subscriptions/${id}/pause`, { resume });
  return data;
}

export async function cancelMealSubscription(id) {
  const { data } = await api.post(`/vendor/subscriptions/${id}/cancel`);
  return data;
}

export async function fetchMealTrials() {
  const { data } = await api.get('/vendor/trials');
  return data;
}

export async function fetchKitchenQueue() {
  const { data } = await api.get('/vendor/kitchen-queue');
  return data;
}

export async function fetchMealDeliveries() {
  const { data } = await api.get('/vendor/deliveries');
  return data;
}

export async function updateMealDeliveryStatus(id, status) {
  const { data } = await api.patch(`/vendor/deliveries/${id}/status`, { status });
  return data;
}

export async function sendRiderLocation(id, coords) {
  const { data } = await api.post(`/vendor/deliveries/${id}/location`, coords);
  return data;
}

/* ── Events Partner portal ──────────────────────────── */

export async function fetchEvents() {
  const { data } = await api.get('/vendor/events');
  return data;
}
export async function createEvent(body) {
  const { data } = await api.post('/vendor/events', body);
  return data;
}
export async function updateEvent(id, body) {
  const { data } = await api.patch(`/vendor/events/${id}`, body);
  return data;
}
export async function publishEvent(id) {
  const { data } = await api.post(`/vendor/events/${id}/publish`);
  return data;
}
export async function fetchEventBookings() {
  const { data } = await api.get('/vendor/event-bookings');
  return data;
}
export async function checkInEventBooking(id) {
  const { data } = await api.post(`/vendor/event-bookings/${id}/checkin`);
  return data;
}
export async function fetchEventPackages() {
  const { data } = await api.get('/vendor/event-packages');
  return data;
}
export async function createEventPackage(body) {
  const { data } = await api.post('/vendor/event-packages', body);
  return data;
}
export async function updateEventPackage(id, body) {
  const { data } = await api.patch(`/vendor/event-packages/${id}`, body);
  return data;
}
export async function deleteEventPackage(id) {
  await api.delete(`/vendor/event-packages/${id}`);
}
export async function fetchEventAddons() {
  const { data } = await api.get('/vendor/event-addons');
  return data;
}
export async function createEventAddon(body) {
  const { data } = await api.post('/vendor/event-addons', body);
  return data;
}
export async function updateEventAddon(id, body) {
  const { data } = await api.patch(`/vendor/event-addons/${id}`, body);
  return data;
}
export async function deleteEventAddon(id) {
  await api.delete(`/vendor/event-addons/${id}`);
}
export async function fetchEventRequests() {
  const { data } = await api.get('/vendor/event-requests');
  return data;
}
export async function updateEventRequest(id, body) {
  const { data } = await api.patch(`/vendor/event-requests/${id}`, body);
  return data;
}
export async function fetchEventGallery() {
  const { data } = await api.get('/vendor/event-gallery');
  return data;
}
export async function addEventGalleryItem(body) {
  const { data } = await api.post('/vendor/event-gallery', body);
  return data;
}
export async function deleteEventGalleryItem(id) {
  await api.delete(`/vendor/event-gallery/${id}`);
}
export async function fetchEventFeedback() {
  const { data } = await api.get('/vendor/event-feedback');
  return data;
}

export async function replyToEventFeedback(id, text) {
  const { data } = await api.post(`/vendor/event-feedback/${id}/reply`, { text });
  return data;
}

/* ── Last Ride Partner portal ─────────────────────────────── */

export async function fetchMemorialKpis() {
  const { data } = await api.get('/vendor/memorial-kpis');
  return data;
}
export async function fetchMemorialServices() {
  const { data } = await api.get('/vendor/memorial-services');
  return data;
}
export async function createMemorialService(body) {
  const { data } = await api.post('/vendor/memorial-services', body);
  return data;
}
export async function updateMemorialService(id, body) {
  const { data } = await api.patch(`/vendor/memorial-services/${id}`, body);
  return data;
}
export async function deleteMemorialService(id) {
  await api.delete(`/vendor/memorial-services/${id}`);
}
export async function fetchMemorialAddons() {
  const { data } = await api.get('/vendor/memorial-addons');
  return data;
}
export async function createMemorialAddon(body) {
  const { data } = await api.post('/vendor/memorial-addons', body);
  return data;
}
export async function updateMemorialAddon(id, body) {
  const { data } = await api.patch(`/vendor/memorial-addons/${id}`, body);
  return data;
}
export async function deleteMemorialAddon(id) {
  await api.delete(`/vendor/memorial-addons/${id}`);
}
export async function fetchMemorialTeam() {
  const { data } = await api.get('/vendor/memorial-team');
  return data;
}
export async function createTeamMember(body) {
  const { data } = await api.post('/vendor/memorial-team', body);
  return data;
}
export async function updateTeamMemberApi(id, body) {
  const { data } = await api.patch(`/vendor/memorial-team/${id}`, body);
  return data;
}
export async function deleteTeamMember(id) {
  await api.delete(`/vendor/memorial-team/${id}`);
}
export async function fetchMemorialRequests() {
  const { data } = await api.get('/vendor/memorial-requests');
  return data;
}
export async function createMemorialWalkIn(body) {
  const { data } = await api.post('/vendor/memorial-requests', body);
  return data;
}
export async function updateMemorialRequestStatus(id, status) {
  const { data } = await api.patch(`/vendor/memorial-requests/${id}/status`, { status });
  return data;
}
export async function assignMemorialTeam(id, teamId) {
  const { data } = await api.post(`/vendor/memorial-requests/${id}/assign`, { teamId });
  return data;
}
export async function addMemorialProof(id, body) {
  const { data } = await api.post(`/vendor/memorial-requests/${id}/proof`, body);
  return data;
}

/** Real customer "Talk to Us" callback requests — claimable by any approved memorial vendor. */
export async function fetchMemorialCustomerRequests() {
  const { data } = await api.get('/vendor/memorial-customer-requests');
  return data;
}
export async function claimMemorialCustomerRequest(id) {
  const { data } = await api.post(`/vendor/memorial-customer-requests/${id}/claim`);
  return data;
}
export async function resolveMemorialCustomerRequest(id) {
  const { data } = await api.post(`/vendor/memorial-customer-requests/${id}/resolve`);
  return data;
}

/* ── Clinic / Veterinary Doctor portal ────────────────────── */

export async function fetchClinicAppointments() {
  const { data } = await api.get('/vendor/appointments');
  return data;
}
export async function updateClinicAppointmentStatus(id, status) {
  const { data } = await api.patch(`/vendor/appointments/${id}/status`, { status });
  return data;
}
export async function addClinicConsultationNotes(id, notes) {
  const { data } = await api.post(`/vendor/appointments/${id}/notes`, { notes });
  return data;
}
export async function createClinicVideoRoom(id) {
  const { data } = await api.post(`/vendor/appointments/${id}/video-room`);
  return data;
}
export async function fetchClinicPatients() {
  const { data } = await api.get('/vendor/patients');
  return data;
}
export async function fetchClinicMedicalRecords() {
  const { data } = await api.get('/vendor/medical-records');
  return data;
}
export async function createClinicMedicalRecord(body) {
  const { data } = await api.post('/vendor/medical-records', body);
  return data;
}
export async function fetchClinicPrescriptions() {
  const { data } = await api.get('/vendor/prescriptions');
  return data;
}
export async function createClinicPrescription(body) {
  const { data } = await api.post('/vendor/prescriptions', body);
  return data;
}
export async function fetchClinicLabReports() {
  const { data } = await api.get('/vendor/lab-reports');
  return data;
}
export async function createClinicLabReport(body) {
  const { data } = await api.post('/vendor/lab-reports', body);
  return data;
}
export async function fetchClinicFollowUps() {
  const { data } = await api.get('/vendor/follow-ups');
  return data;
}
export async function createClinicFollowUp(body) {
  const { data } = await api.post('/vendor/follow-ups', body);
  return data;
}
export async function updateClinicFollowUp(id, patch) {
  const { data } = await api.patch(`/vendor/follow-ups/${id}`, patch);
  return data;
}
export async function fetchClinicVaccinations() {
  const { data } = await api.get('/vendor/vaccinations');
  return data;
}
export async function fetchClinicEmergencies() {
  const { data } = await api.get('/vendor/emergencies');
  return data;
}
export async function acceptClinicEmergency(id) {
  const { data } = await api.post(`/vendor/emergencies/${id}/accept`);
  return data;
}
export async function declineClinicEmergency(id) {
  const { data } = await api.post(`/vendor/emergencies/${id}/decline`);
  return data;
}

/* ── Vet profile, fees & availability ─────────────────────── */
/**
 * The vet's own settings — what they charge, which consult modes they offer,
 * and when they work. `doctorId` is only needed in a clinic with several vets;
 * a solo practitioner (and a staff vet) resolves to themselves.
 */

export async function fetchVets() {
  const { data } = await api.get('/vendor/vets');
  return data;
}

/** Clinic owner only — onboard another vet under the same clinic. */
export async function addVet(payload) {
  const { data } = await api.post('/vendor/vets', payload);
  return data;
}

export async function fetchVetProfile(doctorId) {
  const { data } = await api.get('/vendor/vet/profile', { params: { doctorId } });
  return data;
}

export async function updateVetProfile(patch, doctorId) {
  const { data } = await api.patch('/vendor/vet/profile', { ...patch, ...(doctorId ? { doctorId } : {}) });
  return data;
}

/** Real Cloudinary upload — used instead of pasting a URL by hand. */
export async function uploadVendorFile(file, folder = 'vendor-docs') {
  const form = new FormData();
  form.append('files', file);
  form.append('folder', folder);
  const { data } = await api.post('/uploads/files', form);
  const uploaded = data[0];
  return uploaded?.url || uploaded?.secure_url;
}

export async function addVetDocument(body, doctorId) {
  const { data } = await api.post('/vendor/vet/documents', { ...body, ...(doctorId ? { doctorId } : {}) });
  return data;
}

export async function removeVetDocument(index, doctorId) {
  const { data } = await api.delete(`/vendor/vet/documents/${index}`, { params: { doctorId } });
  return data;
}

export async function fetchVetAvailability(doctorId) {
  const { data } = await api.get('/vendor/vet/availability', { params: { doctorId } });
  return data;
}

/** Replace the working schedule. `weekly` is sent whole (all 7 days). */
export async function saveVetAvailability(patch, doctorId) {
  const { data } = await api.put('/vendor/vet/availability', { ...patch, ...(doctorId ? { doctorId } : {}) });
  return data;
}

export async function addVetBlackout(body, doctorId) {
  const { data } = await api.post('/vendor/vet/blackouts', { ...body, ...(doctorId ? { doctorId } : {}) });
  return data;
}

export async function removeVetBlackout(date, doctorId) {
  const { data } = await api.delete(`/vendor/vet/blackouts/${date}`, { params: { doctorId } });
  return data;
}

/** Exactly what patients see for a date — dashboard and booking screen agree. */
export async function fetchVetSlotPreview({ date, visitType = 'clinic', doctorId }) {
  const { data, meta } = await api.get('/vendor/vet/slots', { params: { date, visitType, doctorId } });
  return { slots: data || [], reason: meta?.reason || null };
}

/** Working-day flags across the booking horizon. */
export async function fetchVetCalendar({ days = 30, doctorId } = {}) {
  const { data } = await api.get('/vendor/vet/calendar', { params: { days, doctorId } });
  return data;
}


/* ── Adoption partner (shelter / rescue / breeder) ───────── */

/**
 * The shelter side of adoption. The vetting steps live here because an
 * applicant used to walk their own application to "approved" with nobody
 * reviewing it.
 */
export async function fetchAdoptionSummary() {
  const { data } = await api.get('/vendor/adoption-summary');
  return data;
}

export async function fetchAdoptionListings() {
  const { data } = await api.get('/vendor/adoption-listings');
  return data;
}

export async function createAdoptionListing(body) {
  const { data } = await api.post('/vendor/adoption-listings', body);
  return data;
}

export async function updateAdoptionListing(id, body) {
  const { data } = await api.patch(`/vendor/adoption-listings/${id}`, body);
  return data;
}

export async function withdrawAdoptionListing(id) {
  const { data } = await api.delete(`/vendor/adoption-listings/${id}`);
  return data;
}

export async function fetchAdoptionApplications(status) {
  const { data } = await api.get('/vendor/adoption-applications', { params: { status } });
  return data;
}

/** Move an application along one of the shelter's vetting steps. */
export async function reviewAdoptionApplication(id, body) {
  const { data } = await api.post(`/vendor/adoption-applications/${id}/review`, body);
  return data;
}

export async function declineAdoptionApplication(id, reason) {
  const { data } = await api.post(`/vendor/adoption-applications/${id}/decline`, { reason });
  return data;
}
