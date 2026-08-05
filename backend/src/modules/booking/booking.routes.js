import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import * as bookingService from './booking.service.js';
import { BOOKING_TYPES } from './booking.model.js';

const router = Router();

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const createBookingSchema = z.object({
  type: z.enum(BOOKING_TYPES),
  providerId: z.string().max(60).optional(),
  doctorId: z.union([z.string().max(60), z.number()]).optional(),
  eventId: z.union([z.string().max(60), z.number()]).optional(),
  petId: objectId.optional(),
  items: z
    .array(z.object({ refId: z.string().max(60), qty: z.number().int().min(1).max(30).optional() }))
    .max(30)
    .optional(),
  schedule: z
    .object({
      startDate: dateStr.optional(),
      endDate: dateStr.optional(),
      time: z.string().max(40).optional(),
      durationDays: z.number().int().min(1).max(90).optional(),
    })
    .optional(),
  visitType: z.enum(['salon', 'home', 'clinic', 'video', 'instant_video', 'instant', 'emergency']).optional(),
  addressId: objectId.optional(),
  ticketQty: z.number().int().min(1).max(10).optional(),
  paymentMethod: z.enum(['razorpay', 'pay_later']).default('razorpay'),
  meta: z.record(z.string(), z.unknown()).optional(),
});

router.use(authenticate);

/** POST /bookings */
router.post(
  '/',
  validate(createBookingSchema),
  asyncHandler(async (req, res) => {
    const data = await bookingService.createBooking(req.user, req.body);
    sendSuccess(res, { statusCode: 201, message: 'Booking created', data });
  })
);

/** GET /bookings?type= */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const type = BOOKING_TYPES.includes(req.query.type) ? req.query.type : undefined;
    sendSuccess(res, { data: await bookingService.listBookings(req.user.id, type) });
  })
);

/** GET /bookings/:id */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await bookingService.getBooking(req.user.id, req.params.id) });
  })
);

/** POST /bookings/:id/cancel */
router.post(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    const booking = await bookingService.cancelBooking(req.user.id, req.params.id);
    sendSuccess(res, { message: 'Booking cancelled', data: booking });
  })
);

/** POST /bookings/:id/reschedule — daycare/grooming only (see service). */
router.post(
  '/:id/reschedule',
  validate(z.object({ date: dateStr, time: z.string().min(1).max(40) })),
  asyncHandler(async (req, res) => {
    const booking = await bookingService.rescheduleBooking(req.user.id, req.params.id, req.body);
    sendSuccess(res, { message: 'Booking rescheduled', data: booking });
  })
);

export default router;
