import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth.js';
import { withVetScope } from '../../middleware/vetScope.js';
import { withVendor, requireType } from '../../middleware/vendorGuard.js';
import { validate } from '../../middleware/validate.js';
import { authLimiter } from '../../middleware/rateLimiter.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import {
  registerVendor,
  vendorPasswordLogin,
  vendorRequestOtp,
  vendorVerifyOtp,
  changeVendorPassword,
} from './vendor.auth.service.js';
import {
  getVendorProfile,
  serializeProfile,
  updateVendorProfile,
  addVendorDocument,
  removeVendorDocument,
  getDashboard,
  listLedger,
  listPayouts,
  requestPayout,
} from './vendor.service.js';
import {
  listVendorProducts,
  createVendorProduct,
  updateVendorProduct,
  deleteVendorProduct,
  adjustStock,
  listVendorOrders,
  updateVendorOrderStatus,
  listVendorReturns,
  resolveReturn,
  listVendorFeedback,
  replyToProductFeedback,
} from './shop.vendor.service.js';
import {
  listPlans,
  createPlan,
  updatePlan,
  deletePlan,
  listSubscriptions,
  pauseVendorSubscription,
  cancelVendorSubscription,
  listTrials,
  kitchenQueue,
  listDeliveries,
  updateDeliveryStatus,
  broadcastRiderLocation,
} from './meal.vendor.service.js';
import {
  listEvents,
  createEvent,
  updateEvent,
  publishEvent,
  listEventBookings,
  checkInBooking,
  listPackages,
  createPackage,
  updatePackage,
  deletePackage,
  listAddons,
  createAddon,
  updateAddon,
  deleteAddon,
  listRequests,
  updateRequest,
  listGallery,
  addGalleryItem,
  deleteGalleryItem,
  listFeedback as listEventFeedback,
  replyToFeedback as replyToEventFeedback,
} from './events.vendor.service.js';
import {
  listServices as listMemorialServices,
  createService as createMemorialService,
  updateService as updateMemorialService,
  deleteService as deleteMemorialService,
  listAddons as listMemorialAddons,
  createAddon as createMemorialAddon,
  updateAddon as updateMemorialAddon,
  deleteAddon as deleteMemorialAddon,
  listTeam,
  addTeamMember,
  updateTeamMember,
  removeTeamMember,
  listRequests as listMemorialRequests,
  createWalkIn,
  updateRequestStatus,
  assignTeam,
  addProof,
  getKpis,
  listCustomerRequests,
  claimCustomerRequest,
  resolveCustomerRequest,
} from './memorial.vendor.service.js';
import {
  listAppointments,
  updateAppointmentStatus,
  addConsultationNotes,
  listPatients,
  listMedicalRecords,
  createMedicalRecord,
  listPrescriptions,
  createPrescription,
  listLabReports,
  createLabReport,
  listFollowUps,
  createFollowUp,
  updateFollowUp,
  listVaccinations,
  listEmergencies,
  acceptEmergency,
  declineEmergency,
  createVideoRoom,
} from './clinic.vendor.service.js';
import {
  listVets,
  addVetToClinic,
  getVetProfile,
  updateVetProfile,
  addVetDocument,
  removeVetDocument,
  getVetAvailability,
  updateVetAvailability,
  addVetBlackout,
  removeVetBlackout,
  previewVetSlots,
  getVetCalendar,
} from './vet.service.js';

const router = Router();

/* ── Auth (public) ────────────────────────────────────────── */

router.post(
  '/register',
  validate(
    z.object({
      businessName: z.string().trim().min(2).max(120),
      email: z.string().email(),
      phone: z.string().trim().min(10).max(15),
      role: z.enum(['shop', 'doctor', 'meal', 'event', 'memorial', 'grooming', 'daycare']),
      city: z.string().max(80).optional(),
      address: z.string().max(200).optional(),
      password: z.string().min(6).max(72).optional(),
      licenseUrl: z.string().max(1000).optional(),
      ownerIdUrl: z.string().max(1000).optional(),
      bankName: z.string().max(120).optional(),
      accountHolder: z.string().max(120).optional(),
      accountNumber: z.string().max(30).optional(),
      ifscCode: z.string().max(20).optional(),
      accountType: z.string().max(20).optional(),
      hasGst: z.boolean().optional(),
      gstNumber: z.string().max(20).optional(),

      // ── Veterinary signup (role: 'doctor') ──
      // What a vet can give before logging in. The rest of the professional
      // profile — documents, availability, per-mode fees, bio — is completed
      // from the dashboard, and an admin must verify credentials before the
      // vet appears in the user app at all.
      vetTitle: z.string().max(20).optional(),
      vetFullName: z.string().max(120).optional(),
      photoUrl: z.string().max(2000).optional(),
      registrationNumber: z.string().max(60).optional(),
      council: z.string().max(160).optional(),
      registrationYear: z.number().int().min(1900).max(2100).optional(),
      degreeUrl: z.string().max(2000).optional(),
      clinicAuthUrl: z.string().max(2000).optional(),
      clinicName: z.string().max(160).optional(),
      pincode: z.string().max(12).optional(),
      consultFee: z.number().min(0).max(100000).optional(),
      totalYears: z.number().int().min(0).max(70).optional(),
      primarySpecialties: z.array(z.string().max(80)).max(10).optional(),
      speciesTreated: z.array(z.string().max(40)).max(20).optional(),
      languages: z.array(z.string().max(40)).max(15).optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    const result = await registerVendor(req.body);
    sendSuccess(res, { statusCode: 201, message: 'Application submitted for review', data: result });
  })
);

router.post(
  '/login',
  authLimiter,
  validate(z.object({ email: z.string().email(), password: z.string().min(1) })),
  asyncHandler(async (req, res) => {
    const { user, profile, tokens } = await vendorPasswordLogin(req.body.email, req.body.password);
    sendSuccess(res, { data: { user, profile: serializeProfile(profile), ...tokens } });
  })
);

router.post(
  '/request-otp',
  authLimiter,
  validate(
    z.object({
      registrationNo: z.string().trim().min(3).max(30).optional(),
      phone: z.string().trim().min(3).max(30).optional(),
      identifier: z.string().trim().min(3).max(30).optional(),
    }).refine((data) => data.registrationNo || data.phone || data.identifier, {
      message: 'Registration number or mobile number is required',
    })
  ),
  asyncHandler(async (req, res) => {
    const identifier = req.body.registrationNo || req.body.phone || req.body.identifier;
    const data = await vendorRequestOtp(identifier);
    sendSuccess(res, { message: 'OTP sent', data });
  })
);

router.post(
  '/verify-otp',
  authLimiter,
  validate(
    z.object({
      registrationNo: z.string().trim().min(3).max(30).optional(),
      phone: z.string().trim().min(3).max(30).optional(),
      identifier: z.string().trim().min(3).max(30).optional(),
      code: z.string().trim().min(4).max(8),
    }).refine((data) => data.registrationNo || data.phone || data.identifier, {
      message: 'Registration number or mobile number is required',
    })
  ),
  asyncHandler(async (req, res) => {
    const identifier = req.body.registrationNo || req.body.phone || req.body.identifier;
    const { user, profile, tokens } = await vendorVerifyOtp(identifier, req.body.code);
    sendSuccess(res, { data: { user, profile: serializeProfile(profile), ...tokens } });
  })
);

/* ── Authenticated vendor area ────────────────────────────── */

router.use(authenticate, authorize('vendor'));

/* Guards now live in middleware/vendorGuard.js so every vendor router
   shares the same withVendor + requireType pairing. */

router.get('/me', withVendor, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: serializeProfile(req.vendor) });
}));

router.patch(
  '/profile',
  withVendor,
  validate(
    z.object({
      businessName: z.string().trim().min(2).max(120).optional(),
      phone: z.string().trim().max(15).optional(),
      city: z.string().max(80).optional(),
      address: z.string().max(200).optional(),
      logo: z.string().max(1000).optional(),
      online: z.boolean().optional(),
      gst: z.object({ hasGst: z.boolean(), number: z.string().max(20).optional() }).optional(),
      policies: z.object({
        codEnabled: z.boolean().optional(),
        returnsEnabled: z.boolean().optional(),
        minOrderValue: z.number().min(0).optional(),
      }).optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { message: 'Profile updated', data: await updateVendorProfile(req.user.id, req.body) });
  })
);

router.post(
  '/documents',
  withVendor,
  validate(z.object({ kind: z.enum(['license', 'owner_id', 'gst']), url: z.string().min(4).max(1000) })),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { statusCode: 201, data: await addVendorDocument(req.user.id, req.body) });
  })
);

router.delete('/documents/:index', withVendor, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await removeVendorDocument(req.user.id, req.params.index) });
}));

router.patch(
  '/password',
  authLimiter,
  validate(z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8).max(72) })),
  asyncHandler(async (req, res) => {
    await changeVendorPassword(req.user.id, req.body.currentPassword, req.body.newPassword);
    sendSuccess(res, { message: 'Password updated' });
  })
);

router.get('/dashboard', withVendor, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await getDashboard(req.user.id, req.vendor.vendorType) });
}));

router.get('/ledger', withVendor, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await listLedger(req.user.id) });
}));

router.get('/payouts', withVendor, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await listPayouts(req.user.id) });
}));

router.post('/payouts/request', withVendor, asyncHandler(async (req, res) => {
  sendSuccess(res, { statusCode: 201, message: 'Payout requested', data: await requestPayout(req.user.id) });
}));

/* ── Shop vendor module ───────────────────────────────────── */

const shop = [withVendor, requireType('shop')];

router.get('/products', ...shop, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await listVendorProducts(req.user.id) });
}));

router.post(
  '/products',
  ...shop,
  validate(
    z.object({
      name: z.string().trim().min(1).max(160),
      category: z.string().max(80).optional(),
      petType: z.string().max(40).optional(),
      price: z.number().nonnegative(),
      discountPrice: z.number().nonnegative().optional(),
      stock: z.number().int().nonnegative().optional(),
      sku: z.string().max(60).optional(),
      size: z.string().max(40).optional(),
      image: z.string().max(1000).optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { statusCode: 201, data: await createVendorProduct(req.user.id, req.body) });
  })
);

router.patch('/products/:id', ...shop, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await updateVendorProduct(req.user.id, req.params.id, req.body) });
}));

router.delete('/products/:id', ...shop, asyncHandler(async (req, res) => {
  await deleteVendorProduct(req.user.id, req.params.id);
  sendSuccess(res, { message: 'Product removed' });
}));

router.post(
  '/products/:id/stock',
  ...shop,
  validate(z.object({ set: z.number().int().optional(), delta: z.number().int().optional() })),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await adjustStock(req.user.id, req.params.id, req.body) });
  })
);

router.get('/orders', ...shop, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await listVendorOrders(req.user.id) });
}));

router.patch(
  '/orders/:id/status',
  ...shop,
  validate(z.object({ status: z.enum(['packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled']) })),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await updateVendorOrderStatus(req.user.id, req.params.id, req.body.status) });
  })
);

router.get('/returns', ...shop, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await listVendorReturns(req.user.id) });
}));

router.post(
  '/returns/:id/resolve',
  ...shop,
  validate(z.object({ action: z.enum(['approve', 'reject']) })),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await resolveReturn(req.user.id, req.params.id, req.body.action) });
  })
);

router.get('/feedback', ...shop, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await listVendorFeedback(req.user.id) });
}));

router.post(
  '/feedback/:id/reply',
  ...shop,
  validate(z.object({ text: z.string().trim().min(1).max(1000) })),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await replyToProductFeedback(req.user.id, req.params.id, req.body.text) });
  })
);

/* ── Meal subscription vendor module ──────────────────────── */

const meal = [withVendor, requireType('meal_subscription')];

router.get('/meal-plans', ...meal, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await listPlans(req.user.id) });
}));

router.post(
  '/meal-plans',
  ...meal,
  validate(
    z.object({
      name: z.string().trim().min(1).max(160),
      price: z.number().nonnegative(),
      mealsPerWeek: z.number().int().positive().optional(),
      petType: z.string().max(40).optional(),
      mealType: z.string().max(40).optional(),
      qty: z.string().max(40).optional(),
      calories: z.string().max(40).optional(),
      protein: z.string().max(40).optional(),
      duration: z.string().max(40).optional(),
      status: z.string().max(20).optional(),
      image: z.string().max(1000).optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { statusCode: 201, data: await createPlan(req.user.id, req.body) });
  })
);

router.patch('/meal-plans/:id', ...meal, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await updatePlan(req.user.id, req.params.id, req.body) });
}));

router.delete('/meal-plans/:id', ...meal, asyncHandler(async (req, res) => {
  await deletePlan(req.user.id, req.params.id);
  sendSuccess(res, { message: 'Plan removed' });
}));

router.get('/subscriptions', ...meal, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await listSubscriptions(req.user.id) });
}));

router.post(
  '/subscriptions/:id/pause',
  ...meal,
  validate(z.object({ resume: z.boolean().optional() })),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await pauseVendorSubscription(req.user.id, req.params.id, Boolean(req.body.resume)) });
  })
);

router.post('/subscriptions/:id/cancel', ...meal, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await cancelVendorSubscription(req.user.id, req.params.id) });
}));

router.get('/trials', ...meal, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await listTrials(req.user.id) });
}));

router.get('/kitchen-queue', ...meal, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await kitchenQueue(req.user.id) });
}));

router.get('/deliveries', ...meal, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await listDeliveries(req.user.id) });
}));

router.patch(
  '/deliveries/:id/status',
  ...meal,
  validate(z.object({ status: z.enum(['Out for Delivery', 'Delivered']) })),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await updateDeliveryStatus(req.user.id, req.params.id, req.body.status) });
  })
);

router.post(
  '/deliveries/:id/location',
  ...meal,
  validate(z.object({ lat: z.number(), lng: z.number(), eta: z.string().max(40).optional() })),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await broadcastRiderLocation(req.user.id, req.params.id, req.body) });
  })
);

/* ── Pet Events Organizer module ──────────────────────────── */

const events = [withVendor, requireType('events')];

router.get('/events', ...events, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await listEvents(req.user.id) });
}));

router.post(
  '/events',
  ...events,
  validate(
    z.object({
      title: z.string().trim().min(1).max(160),
      category: z.string().max(60).optional(),
      time: z.string().max(60).optional(),
      location: z.string().max(160).optional(),
      capacity: z.number().int().positive().optional(),
      price: z.number().nonnegative(),
      date: z.string().max(40).optional(),
      status: z.string().max(20).optional(),
      image: z.string().max(1000).optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { statusCode: 201, data: await createEvent(req.user.id, req.body) });
  })
);

router.patch('/events/:id', ...events, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await updateEvent(req.user.id, req.params.id, req.body) });
}));

router.post('/events/:id/publish', ...events, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await publishEvent(req.user.id, req.params.id) });
}));

router.get('/event-bookings', ...events, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await listEventBookings(req.user.id) });
}));

router.post('/event-bookings/:id/checkin', ...events, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await checkInBooking(req.user.id, req.params.id) });
}));

router.get('/event-packages', ...events, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await listPackages(req.user.id) });
}));
router.post(
  '/event-packages',
  ...events,
  validate(z.object({ name: z.string().min(1).max(120), price: z.number().nonnegative(), duration: z.string().max(40).optional(), maxPets: z.number().int().optional(), status: z.string().max(20).optional() })),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { statusCode: 201, data: await createPackage(req.user.id, req.body) });
  })
);
router.patch('/event-packages/:id', ...events, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await updatePackage(req.user.id, req.params.id, req.body) });
}));
router.delete('/event-packages/:id', ...events, asyncHandler(async (req, res) => {
  await deletePackage(req.user.id, req.params.id);
  sendSuccess(res, { message: 'Package removed' });
}));

router.get('/event-addons', ...events, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await listAddons(req.user.id) });
}));
router.post(
  '/event-addons',
  ...events,
  validate(z.object({ name: z.string().min(1).max(120), price: z.number().nonnegative(), status: z.string().max(20).optional() })),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { statusCode: 201, data: await createAddon(req.user.id, req.body) });
  })
);
router.patch('/event-addons/:id', ...events, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await updateAddon(req.user.id, req.params.id, req.body) });
}));
router.delete('/event-addons/:id', ...events, asyncHandler(async (req, res) => {
  await deleteAddon(req.user.id, req.params.id);
  sendSuccess(res, { message: 'Add-on removed' });
}));

router.get('/event-requests', ...events, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await listRequests(req.user.id) });
}));
router.patch('/event-requests/:id', ...events, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await updateRequest(req.user.id, req.params.id, req.body) });
}));

router.get('/event-gallery', ...events, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await listGallery(req.user.id) });
}));
router.post(
  '/event-gallery',
  ...events,
  validate(z.object({ url: z.string().min(4).max(2000), caption: z.string().max(200).optional() })),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { statusCode: 201, data: await addGalleryItem(req.user.id, req.body) });
  })
);
router.delete('/event-gallery/:id', ...events, asyncHandler(async (req, res) => {
  await deleteGalleryItem(req.user.id, req.params.id);
  sendSuccess(res, { message: 'Gallery item removed' });
}));

router.get('/event-feedback', ...events, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await listEventFeedback(req.user.id) });
}));
router.post(
  '/event-feedback/:id/reply',
  ...events,
  validate(z.object({ text: z.string().trim().min(1).max(1000) })),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await replyToEventFeedback(req.user.id, req.params.id, req.body.text) });
  })
);

/* ── Memorial Provider module ─────────────────────────────── */

const memorial = [withVendor, requireType('memorial')];

router.get('/memorial-kpis', ...memorial, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await getKpis(req.user.id) });
}));

router.get('/memorial-services', ...memorial, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await listMemorialServices(req.user.id) });
}));
router.post(
  '/memorial-services',
  ...memorial,
  validate(z.object({ name: z.string().min(1).max(160), category: z.string().max(60).optional(), description: z.string().max(1000).optional(), price: z.number().nonnegative(), duration: z.string().max(40).optional(), distance: z.string().max(40).optional(), staff: z.number().int().optional(), status: z.string().max(20).optional() })),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { statusCode: 201, data: await createMemorialService(req.user.id, req.body) });
  })
);
router.patch('/memorial-services/:id', ...memorial, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await updateMemorialService(req.user.id, req.params.id, req.body) });
}));
router.delete('/memorial-services/:id', ...memorial, asyncHandler(async (req, res) => {
  await deleteMemorialService(req.user.id, req.params.id);
  sendSuccess(res, { message: 'Service removed' });
}));

router.get('/memorial-addons', ...memorial, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await listMemorialAddons(req.user.id) });
}));
router.post(
  '/memorial-addons',
  ...memorial,
  validate(z.object({ name: z.string().min(1).max(160), description: z.string().max(1000).optional(), price: z.number().nonnegative(), status: z.string().max(20).optional(), image: z.string().max(2000).optional() })),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { statusCode: 201, data: await createMemorialAddon(req.user.id, req.body) });
  })
);
router.patch('/memorial-addons/:id', ...memorial, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await updateMemorialAddon(req.user.id, req.params.id, req.body) });
}));
router.delete('/memorial-addons/:id', ...memorial, asyncHandler(async (req, res) => {
  await deleteMemorialAddon(req.user.id, req.params.id);
  sendSuccess(res, { message: 'Add-on removed' });
}));

router.get('/memorial-team', ...memorial, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await listTeam(req.user.id) });
}));
router.post(
  '/memorial-team',
  ...memorial,
  validate(z.object({ name: z.string().min(1).max(120), role: z.string().max(60).optional(), phone: z.string().max(20).optional(), status: z.string().max(20).optional(), location: z.string().max(60).optional(), image: z.string().max(2000).optional() })),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { statusCode: 201, data: await addTeamMember(req.user.id, req.body) });
  })
);
router.patch('/memorial-team/:id', ...memorial, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await updateTeamMember(req.user.id, req.params.id, req.body) });
}));
router.delete('/memorial-team/:id', ...memorial, asyncHandler(async (req, res) => {
  await removeTeamMember(req.user.id, req.params.id);
  sendSuccess(res, { message: 'Team member removed' });
}));

router.get('/memorial-requests', ...memorial, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await listMemorialRequests(req.user.id) });
}));
router.post(
  '/memorial-requests',
  ...memorial,
  validate(z.object({ customerName: z.string().min(1).max(120), petName: z.string().max(120).optional(), serviceType: z.string().max(120).optional(), location: z.string().max(200).optional(), preferredDate: z.string().max(40).optional(), preferredTime: z.string().max(40).optional(), urgency: z.string().max(20).optional(), notes: z.string().max(1000).optional(), addons: z.array(z.string()).optional(), amount: z.number().nonnegative().optional() })),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { statusCode: 201, data: await createWalkIn(req.user.id, req.body) });
  })
);
router.patch(
  '/memorial-requests/:id/status',
  ...memorial,
  validate(z.object({ status: z.enum(['Pending', 'Accepted', 'Assigned', 'In Progress', 'Completed', 'Cancelled']) })),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await updateRequestStatus(req.user.id, req.params.id, req.body.status) });
  })
);
router.post(
  '/memorial-requests/:id/assign',
  ...memorial,
  validate(z.object({ teamId: z.string().min(1) })),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await assignTeam(req.user.id, req.params.id, req.body.teamId) });
  })
);
router.post(
  '/memorial-requests/:id/proof',
  ...memorial,
  validate(z.object({ url: z.string().min(4).max(2000), note: z.string().max(500).optional() })),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await addProof(req.user.id, req.params.id, req.body) });
  })
);

// Real customer "Talk to Us" callback requests — unclaimed ones are visible
// to every approved memorial vendor until one of them claims it.
router.get('/memorial-customer-requests', ...memorial, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await listCustomerRequests(req.user.id) });
}));
router.post('/memorial-customer-requests/:id/claim', ...memorial, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await claimCustomerRequest(req.user.id, req.params.id) });
}));
router.post('/memorial-customer-requests/:id/resolve', ...memorial, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await resolveCustomerRequest(req.user.id, req.params.id) });
}));

/* ── Clinic / veterinary doctor module ────────────────────── */

const clinic = [withVendor, requireType('clinic'), withVetScope];

router.get('/appointments', ...clinic, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await listAppointments(req.vetScope) });
}));

router.patch(
  '/appointments/:id/status',
  ...clinic,
  validate(z.object({ status: z.enum(['Pending', 'Confirmed', 'Completed', 'Cancelled']) })),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await updateAppointmentStatus(req.vetScope, req.params.id, req.body.status) });
  })
);

router.post(
  '/appointments/:id/notes',
  ...clinic,
  validate(z.object({ notes: z.string().trim().min(1).max(5000) })),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await addConsultationNotes(req.vetScope, req.params.id, req.body.notes) });
  })
);

router.post('/appointments/:id/video-room', ...clinic, asyncHandler(async (req, res) => {
  sendSuccess(res, { statusCode: 201, data: await createVideoRoom(req.vetScope, req.params.id) });
}));

router.get('/patients', ...clinic, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await listPatients(req.vetScope) });
}));

router.get('/medical-records', ...clinic, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await listMedicalRecords(req.vetScope) });
}));
router.post(
  '/medical-records',
  ...clinic,
  validate(
    z.object({
      petName: z.string().trim().min(1).max(120),
      owner: z.string().max(120).optional(),
      phone: z.string().max(30).optional(),
      type: z.string().max(40).optional(),
      diagnosis: z.string().max(1000).optional(),
      treatment: z.string().max(2000).optional(),
      weight: z.string().max(20).optional(),
      temp: z.string().max(20).optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { statusCode: 201, data: await createMedicalRecord(req.vetScope, req.body) });
  })
);

router.get('/prescriptions', ...clinic, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await listPrescriptions(req.vetScope) });
}));
router.post(
  '/prescriptions',
  ...clinic,
  validate(
    z.object({
      patientId: z.string().optional(),
      petName: z.string().max(120).optional(),
      owner: z.string().max(120).optional(),
      diagnosis: z.string().max(1000).optional(),
      medicines: z
        .array(
          z.object({
            name: z.string().max(120).optional(),
            dosage: z.string().max(60).optional(),
            frequency: z.string().max(60).optional(),
            duration: z.string().max(60).optional(),
          })
        )
        .optional(),
      notes: z.string().max(2000).optional(),
      followUpDate: z.string().max(40).optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { statusCode: 201, data: await createPrescription(req.vetScope, req.body) });
  })
);

router.get('/lab-reports', ...clinic, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await listLabReports(req.vetScope) });
}));
router.post(
  '/lab-reports',
  ...clinic,
  validate(
    z.object({
      patient: z.string().max(120).optional(),
      owner: z.string().max(120).optional(),
      testType: z.string().max(160).optional(),
      status: z.string().max(30).optional(),
      resultUrl: z.string().max(2000).optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { statusCode: 201, data: await createLabReport(req.vetScope, req.body) });
  })
);

router.get('/follow-ups', ...clinic, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await listFollowUps(req.vetScope) });
}));
router.post(
  '/follow-ups',
  ...clinic,
  validate(
    z.object({
      petName: z.string().trim().min(1).max(120),
      owner: z.string().max(120).optional(),
      phone: z.string().max(30).optional(),
      reason: z.string().max(500).optional(),
      dueDate: z.string().max(40).optional(),
      priority: z.string().max(20).optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { statusCode: 201, data: await createFollowUp(req.vetScope, req.body) });
  })
);
router.patch(
  '/follow-ups/:id',
  ...clinic,
  validate(
    z.object({
      status: z.string().max(30).optional(),
      dueDate: z.string().max(40).optional(),
      notes: z.string().max(1000).optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await updateFollowUp(req.vetScope, req.params.id, req.body) });
  })
);

router.get('/vaccinations', ...clinic, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await listVaccinations(req.vetScope) });
}));

router.get('/emergencies', ...clinic, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await listEmergencies() });
}));
router.post('/emergencies/:id/accept', ...clinic, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await acceptEmergency(req.vetScope, req.params.id) });
}));
router.post('/emergencies/:id/decline', ...clinic, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await declineEmergency(req.vetScope, req.params.id) });
}));

/* ── Vet profile, fees & availability ─────────────────────── */
// `?doctorId=` selects a vet in a multi-vet clinic; omitted, it resolves to the
// clinic's own (or first) vet, which is the solo-practitioner case.

const HHMM = z.string().regex(/^\d{1,2}:\d{2}$/, 'time must be HH:mm');
const YMD = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD');
const MODE = z.enum(['inClinic', 'video', 'homeVisit', 'emergency']);

const blockSchema = z.object({
  start: HHMM,
  end: HHMM,
  modes: z.array(MODE).optional(),
  capacity: z.number().int().min(1).max(20).optional(),
});

const modeConfigSchema = z.object({
  enabled: z.boolean().optional(),
  fee: z.number().min(0).optional(),
  followUpFee: z.number().min(0).nullable().optional(),
  durationMinutes: z.number().int().min(5).max(180).optional(),
});

const doctorIdOf = (req) => req.query.doctorId || req.body?.doctorId || null;

router.get('/vets', ...clinic, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: { vets: await listVets(req.vetScope), isOwner: req.vetScope.isOwner } });
}));

router.post(
  '/vets',
  ...clinic,
  validate(
    z.object({
      fullName: z.string().trim().min(2).max(120),
      title: z.string().trim().max(20).optional(),
      email: z.string().email(),
      phone: z.string().trim().max(15).optional(),
      password: z.string().min(6).max(72),
      consultFee: z.number().min(0).optional(),
      registrationNumber: z.string().max(60).optional(),
      council: z.string().max(120).optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { statusCode: 201, message: 'Vet added', data: await addVetToClinic(req.vetScope, req.body) });
  })
);

router.get('/vet/profile', ...clinic, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await getVetProfile(req.vetScope, doctorIdOf(req)) });
}));

router.patch(
  '/vet/profile',
  ...clinic,
  validate(
    z.object({
      doctorId: z.string().optional(),
      identity: z.object({
        title: z.string().max(20).optional(),
        fullName: z.string().min(2).max(120).optional(),
        profilePhoto: z.string().max(2000).optional(),
      }).optional(),
      credentials: z.object({
        registrationNumber: z.string().max(60).optional(),
        council: z.string().max(160).optional(),
        registrationYear: z.number().int().min(1900).max(2100).nullable().optional(),
      }).optional(),
      practice: z.object({
        primarySpecialties: z.array(z.string().max(80)).max(10).optional(),
        secondarySpecialties: z.array(z.string().max(80)).max(10).optional(),
        speciesTreated: z.array(z.string().max(40)).max(20).optional(),
        conditionsHandled: z.array(z.string().max(80)).max(40).optional(),
        languages: z.array(z.string().max(40)).max(15).optional(),
      }).optional(),
      experience: z.object({
        totalYears: z.number().int().min(0).max(70).optional(),
        yearsInCurrentClinic: z.number().int().min(0).max(70).optional(),
      }).optional(),
      clinicInfo: z.object({
        clinicName: z.string().max(160).optional(),
        address: z.object({
          line1: z.string().max(240).optional(),
          landmark: z.string().max(160).optional(),
          locality: z.string().max(120).optional(),
          city: z.string().max(120).optional(),
          state: z.string().max(120).optional(),
          pincode: z.string().max(12).optional(),
          mapsUrl: z.string().max(2000).optional(),
        }).optional(),
        geo: z.object({ coordinates: z.array(z.number()).length(2) }).optional(),
        facilities: z.object({
          medicines: z.boolean().optional(),
          diagnostics: z.boolean().optional(),
          surgery: z.boolean().optional(),
          grooming: z.boolean().optional(),
          vaccination: z.boolean().optional(),
          labSampleCollection: z.boolean().optional(),
          hospitalization: z.boolean().optional(),
        }).optional(),
      }).optional(),
      modes: z.object({
        inClinic: modeConfigSchema.optional(),
        video: modeConfigSchema.optional(),
        homeVisit: modeConfigSchema.optional(),
        emergency: modeConfigSchema.optional(),
      }).optional(),
      about: z.object({
        bio: z.string().max(2000).optional(),
        treatmentApproach: z.string().max(2000).optional(),
      }).optional(),
      video: z.object({
        digitalPrescription: z.boolean().optional(),
        overagePerMinute: z.number().min(0).max(1000).optional(),
        graceMinutes: z.number().int().min(0).max(15).optional(),
        maxOverageMinutes: z.number().int().min(0).max(180).optional(),
      }).optional(),
      policies: z.object({
        cancellationHours: z.number().int().min(0).max(168).optional(),
        cancellationNote: z.string().max(500).optional(),
        rescheduleHours: z.number().int().min(0).max(168).optional(),
        rescheduleNote: z.string().max(500).optional(),
        refundNote: z.string().max(500).optional(),
        noShowNote: z.string().max(500).optional(),
        followUpWindowDays: z.number().int().min(0).max(90).optional(),
      }).optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await updateVetProfile(req.vetScope, doctorIdOf(req), req.body) });
  })
);

router.post(
  '/vet/documents',
  ...clinic,
  validate(
    z.object({
      doctorId: z.string().optional(),
      kind: z.enum(['degree', 'license', 'clinic_auth', 'id_proof', 'other']),
      url: z.string().min(4).max(2000),
      label: z.string().max(160).optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { statusCode: 201, data: await addVetDocument(req.vetScope, doctorIdOf(req), req.body) });
  })
);

router.delete('/vet/documents/:index', ...clinic, asyncHandler(async (req, res) => {
  const data = await removeVetDocument(req.vetScope, doctorIdOf(req), Number(req.params.index));
  sendSuccess(res, { data });
}));

router.get('/vet/availability', ...clinic, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await getVetAvailability(req.vetScope, doctorIdOf(req)) });
}));

router.put(
  '/vet/availability',
  ...clinic,
  validate(
    z.object({
      doctorId: z.string().optional(),
      weekly: z.array(
        z.object({
          day: z.number().int().min(0).max(6).optional(),
          enabled: z.boolean(),
          blocks: z.array(blockSchema).max(12).optional(),
        })
      ).length(7).optional(),
      emergency: z.object({
        enabled: z.boolean().optional(),
        alwaysOn: z.boolean().optional(),
        blocks: z.array(blockSchema).max(12).optional(),
      }).optional(),
      slotMinutes: z.number().int().min(5).max(180).optional(),
      bufferMinutes: z.number().int().min(0).max(60).optional(),
      leadTimeMinutes: z.number().int().min(0).max(10080).optional(),
      horizonDays: z.number().int().min(1).max(180).optional(),
      timezone: z.string().max(64).optional(),
      active: z.boolean().optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await updateVetAvailability(req.vetScope, doctorIdOf(req), req.body) });
  })
);

router.post(
  '/vet/blackouts',
  ...clinic,
  validate(z.object({ doctorId: z.string().optional(), date: YMD, reason: z.string().max(200).optional() })),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { statusCode: 201, data: await addVetBlackout(req.vetScope, doctorIdOf(req), req.body) });
  })
);

router.delete('/vet/blackouts/:date', ...clinic, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await removeVetBlackout(req.vetScope, doctorIdOf(req), req.params.date) });
}));

/** Exactly what patients will see — the dashboard and booking screen can't diverge. */
router.get('/vet/slots', ...clinic, asyncHandler(async (req, res) => {
  const { slots, meta } = await previewVetSlots(req.vetScope, doctorIdOf(req), {
    date: req.query.date,
    visitType: req.query.visitType || 'clinic',
  });
  sendSuccess(res, { data: slots, meta });
}));

router.get('/vet/calendar', ...clinic, asyncHandler(async (req, res) => {
  const days = Math.min(90, Math.max(1, Number(req.query.days) || 30));
  sendSuccess(res, { data: await getVetCalendar(req.vetScope, doctorIdOf(req), { days }) });
}));

export default router;
