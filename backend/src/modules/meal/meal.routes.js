import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import { cacheResponse } from '../../services/cache.service.js';
import { MealPlan, Meal } from './meal.models.js';
import * as mealService from './meal.service.js';

const router = Router();

const linesSchema = z
  .array(
    z.object({
      mealId: z.string().max(20),
      qty: z.number().int().min(1).max(20),
      customisationId: z.string().max(20).optional(),
    })
  )
  .min(1)
  .max(20);

/* ── public catalog ───────────────────────────────────── */

router.get(
  '/plans',
  cacheResponse('meals', 300),
  asyncHandler(async (_req, res) => {
    const plans = await MealPlan.find({ active: true }).sort({ sort: 1 });
    sendSuccess(res, { data: plans });
  })
);

router.get(
  '/recipes',
  cacheResponse('meals', 300),
  asyncHandler(async (req, res) => {
    const filter = { active: true };
    if (req.query.category) filter.category = req.query.category;
    const meals = await Meal.find(filter).sort({ legacyId: 1 });
    sendSuccess(res, { data: meals });
  })
);

/* ── account + orders (auth) ──────────────────────────── */

router.use(authenticate);

router.get(
  '/account',
  asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await mealService.getAccount(req.user.id) });
  })
);

router.post(
  '/purchase-package',
  validate(z.object({ planId: z.string().max(30) })),
  asyncHandler(async (req, res) => {
    const data = await mealService.purchasePackage(req.user, req.body.planId);
    sendSuccess(res, { statusCode: 201, message: 'Package order created', data });
  })
);

router.post(
  '/orders/prepaid',
  validate(z.object({ items: linesSchema })),
  asyncHandler(async (req, res) => {
    const order = await mealService.orderWithPrepaid(req.user, req.body.items);
    sendSuccess(res, { statusCode: 201, message: 'Ordered using prepaid balance', data: order });
  })
);

router.post(
  '/orders/alacarte',
  validate(z.object({ items: linesSchema })),
  asyncHandler(async (req, res) => {
    const data = await mealService.orderALaCarte(req.user, req.body.items);
    sendSuccess(res, { statusCode: 201, message: 'Order created', data });
  })
);

router.post(
  '/trial',
  validate(
    z.object({
      name: z.string().trim().min(2).max(60),
      phone: z.string().trim().regex(/^\+?[0-9]{10,15}$/),
      address: z.string().trim().min(5).max(300),
    })
  ),
  asyncHandler(async (req, res) => {
    const order = await mealService.claimTrial(req.user, req.body);
    sendSuccess(res, { statusCode: 201, message: 'Free trial claimed', data: order });
  })
);

router.get(
  '/orders',
  asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await mealService.listOrders(req.user.id) });
  })
);

router.patch(
  '/allergies',
  validate(z.object({ allergies: z.array(z.string().trim().max(40)).max(20) })),
  asyncHandler(async (req, res) => {
    const account = await mealService.updateAllergies(req.user.id, req.body.allergies);
    sendSuccess(res, { message: 'Allergies updated', data: account });
  })
);

router.post(
  '/pause',
  validate(
    z.object({
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      till: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      reason: z.string().trim().max(200).optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    const account = await mealService.pause(req.user.id, req.body);
    sendSuccess(res, { message: 'Plan paused', data: account });
  })
);

router.post(
  '/resume',
  asyncHandler(async (req, res) => {
    const account = await mealService.resume(req.user.id);
    sendSuccess(res, { message: 'Plan resumed', data: account });
  })
);

export default router;
