import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import * as paymentService from './payment.service.js';

/** POST /payments/create-order */
export const createOrder = asyncHandler(async (req, res) => {
  const { purpose, payload } = req.body;
  const data = await paymentService.createOrder(req.user, purpose, payload);
  sendSuccess(res, { statusCode: 201, message: 'Payment order created', data });
});

/** POST /payments/verify */
export const verify = asyncHandler(async (req, res) => {
  const data = await paymentService.verifyPayment(req.user, req.body);
  sendSuccess(res, { message: 'Payment verified', data });
});

/** POST /payments/webhook — mounted with express.raw() in app.js. */
export const webhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'] || '';
  const result = await paymentService.handleWebhook(req.body, signature);
  res.json({ received: true, ...result });
});
