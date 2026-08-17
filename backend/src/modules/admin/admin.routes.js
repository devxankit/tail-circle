import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { authLimiter } from '../../middleware/rateLimiter.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { adminPasswordLogin } from './admin.auth.service.js';
import {
  getDashboard,
  listActionItems,
  resolveActionItem,
  listUsers,
  setUserBlocked,
  listPets,
  listVendors,
  listPendingVendors,
  approveVendor,
  rejectVendor,
  suspendVendor,
  getVendorDocuments,
  listAllDocuments,
  verifyDocument,
  vendorPerformance,
  listBanners,
  listPublicBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  getSettings,
  updateSetting,
  listAuditLogs,
} from './admin.service.js';
import {
  listOrders,
  listBookings,
  listAppointments as listOpsAppointments,
  listDeliveries,
  listReturns,
  resolveReturn,
  listSupport,
  replySupport,
} from './admin.ops.service.js';
import {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  listProductCategories,
  createProductCategory,
  updateProductCategory,
  deleteProductCategory,
  listBreeds,
  createBreed,
  updateBreed,
  deleteBreed,
  listMealPlans,
  createMealPlan,
  updateMealPlan,
  deleteMealPlan,
  listDoctorServices,
  updateDoctorService,
  listEventCategories,
  listMemorialPackages,
  listGroomingDaycare,
  listAddons,
  updateAddon,
} from './admin.catalog.service.js';
import {
  listVetApplications,
  getVetApplication,
  approveVet,
  rejectVet,
  setVetActive,
} from './admin.vet.service.js';
import {
  listTransactions,
  paymentsOverview,
  getCommissionSettings,
  setCommission,
  listPayouts,
  markPayoutPaid,
  walletOverview,
  adjustWallet,
  taxReport,
} from './admin.finance.service.js';
import {
  broadcast,
  listReportedPosts,
  listAllPosts,
  moderatePost,
  listReviews,
  moderateReview,
  listStaff,
  createStaff,
  updateStaff,
  removeStaff,
  reportsSummary,
} from './admin.platform.service.js';
import { getMealPortalData } from './admin.meal.service.js';
import { listConfig, createConfig, updateConfig, deleteConfig } from './admin.config.service.js';

const router = Router();

/* ── Public admin auth ────────────────────────────────────── */
router.post(
  '/login',
  authLimiter,
  validate(z.object({ email: z.string().email(), password: z.string().min(1) })),
  asyncHandler(async (req, res) => {
    const data = await adminPasswordLogin(req.body.email, req.body.password, req.ip);
    sendSuccess(res, { message: 'Session initiated', data });
  })
);

/* ── Authenticated admin area ─────────────────────────────── */
router.use(authenticate, authorize('admin'));

/** Restrict to super-admins (staff/settings/security). */
const superOnly = asyncHandler(async (req, _res, next) => {
  if (req.user.adminRole !== 'super') throw ApiError.forbidden('Super-admin only');
  next();
});

router.get('/dashboard', asyncHandler(async (_req, res) => {
  sendSuccess(res, { data: await getDashboard() });
}));

router.get('/action-items', asyncHandler(async (req, res) => {
  sendSuccess(res, {
    data: await listActionItems({
      status: req.query.status,
      category: req.query.category,
      priority: req.query.priority,
    }),
  });
}));

router.post(
  '/action-items/:id/resolve',
  validate(z.object({ action: z.enum(['approve', 'reject']).optional(), note: z.string().optional() })),
  asyncHandler(async (req, res) => {
    sendSuccess(res, {
      data: await resolveActionItem(req.user, req.params.id, { action: req.body.action, note: req.body.note }, req.ip),
    });
  })
);

/* Users & pets */
router.get('/users', asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await listUsers({ search: req.query.search }) });
}));
router.patch(
  '/users/:id/block',
  validate(z.object({ blocked: z.boolean() })),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await setUserBlocked(req.user, req.params.id, req.body.blocked, req.ip) });
  })
);
router.get('/pets', asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await listPets({ search: req.query.search }) });
}));

/* Vendors & approvals */
router.get('/vendors', asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await listVendors({ type: req.query.type, status: req.query.status }) });
}));
router.get('/vendors/pending', asyncHandler(async (_req, res) => {
  sendSuccess(res, { data: await listPendingVendors() });
}));
router.get('/vendors/performance', asyncHandler(async (_req, res) => {
  sendSuccess(res, { data: await vendorPerformance() });
}));
/* Cross-vendor KYC document feed + per-document verification workflow. */
router.get('/documents', asyncHandler(async (_req, res) => {
  sendSuccess(res, { data: await listAllDocuments() });
}));
router.post(
  '/documents/:vendorId/:kind/verify',
  validate(z.object({ action: z.enum(['verify', 'reject', 'reupload']) })),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await verifyDocument(req.user, req.params.vendorId, req.params.kind, req.body.action, req.ip) });
  })
);
router.get('/vendors/:id/documents', asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await getVendorDocuments(req.params.id) });
}));
/* `force` waves a pending vendor through with unverified KYC documents — a
   deliberate override, recorded in the audit trail. */
router.post(
  '/vendors/:id/approve',
  validate(z.object({ force: z.boolean().optional() })),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await approveVendor(req.user, req.params.id, req.ip, { force: req.body.force }) });
  })
);
router.post('/vendors/:id/reject', asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await rejectVendor(req.user, req.params.id, req.ip) });
}));
router.post('/vendors/:id/suspend', asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await suspendVendor(req.user, req.params.id, req.ip) });
}));

/* Banners */
export const adminBannersRouter = Router();
adminBannersRouter.use(authenticate, authorize('admin', 'vendor', 'user'));

adminBannersRouter.get('/', asyncHandler(async (_req, res) => {
  sendSuccess(res, { data: await listBanners() });
}));
adminBannersRouter.post(
  '/',
  validate(
    z.object({
      key: z.string().max(60).optional(),
      title: z.string().max(160).optional(),
      subtitle: z.string().max(200).optional(),
      image: z.string().optional(),
      link: z.string().max(500).optional(),
      slot: z.string().max(60).optional(),
      btnText: z.string().max(40).optional(),
      bg: z.string().max(120).optional(),
      badge: z.string().max(40).optional(),
      active: z.boolean().optional(),
      sort: z.number().int().optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { statusCode: 201, data: await createBanner(req.user, req.body, req.ip) });
  })
);
adminBannersRouter.patch('/:id', asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await updateBanner(req.user, req.params.id, req.body, req.ip) });
}));
adminBannersRouter.delete('/:id', asyncHandler(async (req, res) => {
  await deleteBanner(req.user, req.params.id, req.ip);
  sendSuccess(res, { message: 'Banner removed' });
}));

/* Settings & audit (super-only) */
router.get('/settings', asyncHandler(async (_req, res) => {
  sendSuccess(res, { data: await getSettings() });
}));
router.put(
  '/settings/:key',
  superOnly,
  validate(z.object({ value: z.any() })),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await updateSetting(req.user, req.params.key, req.body.value, req.ip) });
  })
);
router.get('/audit-logs', superOnly, asyncHandler(async (_req, res) => {
  sendSuccess(res, { data: await listAuditLogs() });
}));

/* ── Operations ───────────────────────────────────────────── */
router.get('/orders', asyncHandler(async (_req, res) => sendSuccess(res, { data: await listOrders() })));
router.get('/bookings', asyncHandler(async (_req, res) => sendSuccess(res, { data: await listBookings() })));
router.get('/appointments', asyncHandler(async (_req, res) => sendSuccess(res, { data: await listOpsAppointments() })));
router.get('/deliveries', asyncHandler(async (_req, res) => sendSuccess(res, { data: await listDeliveries() })));
router.get('/returns', asyncHandler(async (_req, res) => sendSuccess(res, { data: await listReturns() })));
router.post(
  '/returns/:id/resolve',
  validate(z.object({ action: z.enum(['approve', 'reject']) })),
  asyncHandler(async (req, res) => sendSuccess(res, { data: await resolveReturn(req.user, req.params.id, req.body.action, req.ip) }))
);
router.get('/support', asyncHandler(async (_req, res) => sendSuccess(res, { data: await listSupport() })));
router.post(
  '/support/:id/reply',
  validate(z.object({ message: z.string().trim().min(1).max(2000) })),
  asyncHandler(async (req, res) => sendSuccess(res, { data: await replySupport(req.user, req.params.id, req.body.message, req.ip) }))
);

/* ── Catalogs ─────────────────────────────────────────────── */
router.get('/products', asyncHandler(async (req, res) => sendSuccess(res, { data: await listProducts({ search: req.query.search, category: req.query.category, vendorId: req.query.vendorId }) })));
router.post('/products', asyncHandler(async (req, res) => sendSuccess(res, { statusCode: 201, data: await createProduct(req.user, req.body, req.ip) })));
router.patch('/products/:id', asyncHandler(async (req, res) => sendSuccess(res, { data: await updateProduct(req.user, req.params.id, req.body, req.ip) })));
router.delete('/products/:id', asyncHandler(async (req, res) => { await deleteProduct(req.user, req.params.id, req.ip); sendSuccess(res, { message: 'Product removed' }); }));

router.get('/product-categories', asyncHandler(async (_req, res) => sendSuccess(res, { data: await listProductCategories() })));
router.post('/product-categories', asyncHandler(async (req, res) => sendSuccess(res, { statusCode: 201, data: await createProductCategory(req.user, req.body, req.ip) })));
router.patch('/product-categories/:id', asyncHandler(async (req, res) => sendSuccess(res, { data: await updateProductCategory(req.user, req.params.id, req.body, req.ip) })));
router.delete('/product-categories/:id', asyncHandler(async (req, res) => { await deleteProductCategory(req.user, req.params.id, req.ip); sendSuccess(res, { message: 'Category removed' }); }));

router.get('/breeds', asyncHandler(async (req, res) => sendSuccess(res, { data: await listBreeds({ search: req.query.search, petType: req.query.petType }) })));
router.post('/breeds', asyncHandler(async (req, res) => sendSuccess(res, { statusCode: 201, data: await createBreed(req.user, req.body, req.ip) })));
router.patch('/breeds/:id', asyncHandler(async (req, res) => sendSuccess(res, { data: await updateBreed(req.user, req.params.id, req.body, req.ip) })));
router.delete('/breeds/:id', asyncHandler(async (req, res) => { await deleteBreed(req.user, req.params.id, req.ip); sendSuccess(res, { message: 'Breed removed' }); }));

router.get('/meal-plans', asyncHandler(async (_req, res) => sendSuccess(res, { data: await listMealPlans() })));
router.post('/meal-plans', asyncHandler(async (req, res) => sendSuccess(res, { statusCode: 201, data: await createMealPlan(req.user, req.body, req.ip) })));
router.patch('/meal-plans/:id', asyncHandler(async (req, res) => sendSuccess(res, { data: await updateMealPlan(req.user, req.params.id, req.body, req.ip) })));
router.delete('/meal-plans/:id', asyncHandler(async (req, res) => { await deleteMealPlan(req.user, req.params.id, req.ip); sendSuccess(res, { message: 'Plan removed' }); }));

router.get('/doctor-services', asyncHandler(async (_req, res) => sendSuccess(res, { data: await listDoctorServices() })));
router.patch('/doctor-services/:id', asyncHandler(async (req, res) => sendSuccess(res, { data: await updateDoctorService(req.user, req.params.id, req.body, req.ip) })));

/* ── Vet credential verification ──────────────────────────
 * A vet is invisible to pet parents until approved here, so this is the gate
 * between a self-declared registration number and a bookable professional.
 * Responses include the verification documents, which are stripped from every
 * public doctor response. */

router.get('/vets', asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await listVetApplications({ status: req.query.status || 'pending' }) });
}));

router.get('/vets/:id', asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await getVetApplication(req.params.id) });
}));

router.post(
  '/vets/:id/approve',
  validate(z.object({ force: z.boolean().optional() })),
  asyncHandler(async (req, res) => {
    const data = await approveVet(req.user, req.params.id, { force: req.body.force });
    sendSuccess(res, { message: 'Vet approved and listed', data });
  })
);

router.post(
  '/vets/:id/reject',
  validate(z.object({ reason: z.string().trim().min(3).max(500), allowResubmit: z.boolean().optional() })),
  asyncHandler(async (req, res) => {
    const data = await rejectVet(req.user, req.params.id, req.body);
    sendSuccess(res, { message: 'Vet application rejected', data });
  })
);

router.patch(
  '/vets/:id/active',
  validate(z.object({ active: z.boolean() })),
  asyncHandler(async (req, res) => {
    const data = await setVetActive(req.user, req.params.id, req.body.active);
    sendSuccess(res, { message: req.body.active ? 'Vet restored' : 'Vet suspended', data });
  })
);
router.get('/event-categories', asyncHandler(async (_req, res) => sendSuccess(res, { data: await listEventCategories() })));
router.get('/memorial-packages', asyncHandler(async (_req, res) => sendSuccess(res, { data: await listMemorialPackages() })));
router.get('/grooming-daycare', asyncHandler(async (_req, res) => sendSuccess(res, { data: await listGroomingDaycare() })));
router.get('/addons', asyncHandler(async (_req, res) => sendSuccess(res, { data: await listAddons() })));
router.patch('/addons/:id', asyncHandler(async (req, res) => sendSuccess(res, { data: await updateAddon(req.user, req.params.id, req.body, req.ip) })));

/* Generic catalog-config store (product categories, doctor services, add-ons/
   amenities, memorial packages, event categories, grooming/day-care). */
router.get('/config/:group', asyncHandler(async (req, res) => sendSuccess(res, { data: await listConfig(req.params.group) })));
router.post('/config/:group', asyncHandler(async (req, res) => sendSuccess(res, { statusCode: 201, data: await createConfig(req.user, req.params.group, req.body, req.ip) })));
router.patch('/config/item/:id', asyncHandler(async (req, res) => sendSuccess(res, { data: await updateConfig(req.user, req.params.id, req.body, req.ip) })));
router.delete('/config/item/:id', asyncHandler(async (req, res) => { await deleteConfig(req.user, req.params.id, req.ip); sendSuccess(res, { message: 'Removed' }); }));

/* ── Finance ──────────────────────────────────────────────── */
router.get('/transactions', asyncHandler(async (req, res) => sendSuccess(res, { data: await listTransactions({ status: req.query.status }) })));
router.get('/payments-overview', asyncHandler(async (_req, res) => sendSuccess(res, { data: await paymentsOverview() })));
router.get('/commission', asyncHandler(async (_req, res) => sendSuccess(res, { data: await getCommissionSettings() })));
router.put(
  '/commission/:key',
  superOnly,
  validate(z.object({ value: z.number() })),
  asyncHandler(async (req, res) => sendSuccess(res, { data: await setCommission(req.user, req.params.key, req.body.value, req.ip) }))
);
router.get('/payouts', asyncHandler(async (req, res) => sendSuccess(res, { data: await listPayouts({ status: req.query.status }) })));
router.post(
  '/payouts/:id/pay',
  validate(z.object({ utr: z.string().max(40).optional() })),
  asyncHandler(async (req, res) => sendSuccess(res, { data: await markPayoutPaid(req.user, req.params.id, req.body.utr, req.ip) }))
);
router.get('/wallet-overview', asyncHandler(async (_req, res) => sendSuccess(res, { data: await walletOverview() })));
router.post(
  '/wallet/:id/adjust',
  validate(z.object({ action: z.enum(['credit', 'debit']), amount: z.number().positive(), reason: z.string().trim().min(1).max(200) })),
  asyncHandler(async (req, res) => sendSuccess(res, { data: await adjustWallet(req.user, req.params.id, req.body, req.ip) }))
);
router.get('/tax-report', asyncHandler(async (_req, res) => sendSuccess(res, { data: await taxReport() })));

/* ── Platform tools ───────────────────────────────────────── */
router.post(
  '/broadcast',
  validate(z.object({ scope: z.enum(['All', 'Users', 'Vendors']).optional(), title: z.string().trim().min(1).max(160), message: z.string().trim().min(1).max(1000), confirm: z.literal(true) })),
  asyncHandler(async (req, res) => sendSuccess(res, { data: await broadcast(req.user, req.body, req.ip) }))
);
router.get('/posts', asyncHandler(async (req, res) => sendSuccess(res, { data: req.query.reported ? await listReportedPosts() : await listAllPosts() })));
router.post(
  '/posts/:id/moderate',
  validate(z.object({ action: z.enum(['hide', 'restore', 'delete']) })),
  asyncHandler(async (req, res) => sendSuccess(res, { data: await moderatePost(req.user, req.params.id, req.body.action, req.ip) }))
);
router.get('/reviews', asyncHandler(async (req, res) => sendSuccess(res, { data: await listReviews({ status: req.query.status }) })));
router.post(
  '/reviews/:id/moderate',
  validate(z.object({ action: z.enum(['hide', 'restore']) })),
  asyncHandler(async (req, res) => sendSuccess(res, { data: await moderateReview(req.user, req.params.id, req.body.action, req.ip) }))
);
router.get('/reports', asyncHandler(async (_req, res) => sendSuccess(res, { data: await reportsSummary() })));
router.get('/meal-portal', asyncHandler(async (_req, res) => sendSuccess(res, { data: await getMealPortalData() })));

router.get('/staff', superOnly, asyncHandler(async (_req, res) => sendSuccess(res, { data: await listStaff() })));
router.post(
  '/staff',
  superOnly,
  validate(z.object({ name: z.string().trim().min(2).max(120), email: z.string().email(), password: z.string().min(6).max(72).optional(), adminRole: z.enum(['super', 'ops', 'finance', 'support', 'moderator']).optional(), permissions: z.array(z.string()).optional() })),
  asyncHandler(async (req, res) => sendSuccess(res, { statusCode: 201, data: await createStaff(req.user, req.body, req.ip) }))
);
router.patch('/staff/:id', superOnly, asyncHandler(async (req, res) => sendSuccess(res, { data: await updateStaff(req.user, req.params.id, req.body, req.ip) })));
router.delete('/staff/:id', superOnly, asyncHandler(async (req, res) => { await removeStaff(req.user, req.params.id, req.ip); sendSuccess(res, { message: 'Staff removed' }); }));

export default router;

/* ── Public banners (user-app Home rails) ─────────────────── */
export const bannersRouter = Router();
bannersRouter.get('/', asyncHandler(async (_req, res) => {
  sendSuccess(res, { data: await listPublicBanners() });
}));
