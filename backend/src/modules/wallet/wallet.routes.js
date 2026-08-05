import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import {
  getWallet,
  listTransactions,
  startTopup,
  transfer,
  payMerchant,
} from './wallet.service.js';

const router = Router();
router.use(authenticate);

const toRupees = (paise) => Math.round(paise) / 100;

/** Shape a WalletTransaction for the UI (amount in rupees; date formatted client-side). */
function serializeTxn(t) {
  return {
    id: String(t._id),
    title: t.title || '',
    icon: t.icon || '💸',
    amount: toRupees(t.amount), // positive rupees; UI adds the sign from type
    type: t.type, // 'credit' | 'debit'
    createdAt: t.createdAt,
  };
}

/** GET /wallet — balance card. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const wallet = await getWallet(req.user.id);
    sendSuccess(res, {
      data: { balance: toRupees(wallet.balance), currency: wallet.currency, status: wallet.status },
    });
  })
);

/** GET /wallet/transactions — recent activity (newest first). */
router.get(
  '/transactions',
  asyncHandler(async (req, res) => {
    const txns = await listTransactions(req.user.id);
    sendSuccess(res, { data: txns.map(serializeTxn) });
  })
);

/** POST /wallet/topup — create a Razorpay order; balance credits on confirm. */
router.post(
  '/topup',
  validate(z.object({ amount: z.number().positive() })),
  asyncHandler(async (req, res) => {
    const payment = await startTopup(req.user, req.body.amount);
    sendSuccess(res, { statusCode: 201, data: { razorpay: payment } });
  })
);

/** POST /wallet/transfer — send money (real user by phone, or demo contact). */
router.post(
  '/transfer',
  validate(
    z.object({
      phone: z.string().trim().min(4).max(20).optional(),
      name: z.string().trim().max(80).optional(),
      icon: z.string().max(8).optional(),
      title: z.string().trim().max(120).optional(),
      amount: z.number().positive(),
      note: z.string().max(200).optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    const result = await transfer(req.user, req.body);
    sendSuccess(res, {
      data: { transaction: serializeTxn(result.transaction), balance: toRupees(result.balance) },
    });
  })
);

/** POST /wallet/pay — scan & pay a merchant from balance. */
router.post(
  '/pay',
  validate(
    z.object({
      merchantId: z.string().max(80).optional(),
      name: z.string().trim().max(80).optional(),
      title: z.string().trim().max(120).optional(),
      amount: z.number().positive(),
    })
  ),
  asyncHandler(async (req, res) => {
    const result = await payMerchant(req.user, req.body);
    sendSuccess(res, {
      data: { transaction: serializeTxn(result.transaction), balance: toRupees(result.balance) },
    });
  })
);

export default router;
