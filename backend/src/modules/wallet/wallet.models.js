import mongoose from 'mongoose';

/**
 * TailCircle Wallet. One Wallet per user holding an integer paise balance;
 * every movement is an append-only WalletTransaction carrying the running
 * `balanceAfter` so history is self-verifying. All credits/debits go through
 * wallet.service.js which guards the balance atomically and keys each entry
 * with a unique `idempotencyKey` so webhook double-fires can't double-credit.
 */
const walletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    balance: { type: Number, default: 0, min: 0 }, // paise
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['active', 'frozen'], default: 'active' },
  },
  { timestamps: true }
);
export const Wallet = mongoose.model('Wallet', walletSchema);

export const WALLET_TXN_PURPOSES = [
  'topup',
  'order_payment',
  'booking_payment',
  'refund',
  'transfer_in',
  'transfer_out',
  'merchant_pay',
  'admin_adjust',
];

const walletTransactionSchema = new mongoose.Schema(
  {
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    purpose: { type: String, enum: WALLET_TXN_PURPOSES, required: true },
    amount: { type: Number, required: true, min: 1 }, // paise (absolute)
    balanceAfter: { type: Number, required: true }, // paise, running balance
    refType: { type: String, default: null }, // 'payment' | 'order' | 'transfer' | ...
    refId: { type: mongoose.Schema.Types.ObjectId, default: null },
    counterparty: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      merchantId: { type: String, default: null },
      name: { type: String, default: null },
    },
    title: { type: String, default: '' }, // display label ("Added Money", "Dr. Sarah Jenkins")
    note: { type: String, default: '' },
    icon: { type: String, default: '💸' }, // display emoji, mirrors mock
    status: { type: String, enum: ['pending', 'success', 'failed'], default: 'success' },
    idempotencyKey: { type: String }, // set only for gateway-fulfilled credits
    seedKey: { type: String }, // set only by the seeder
  },
  { timestamps: true }
);
walletTransactionSchema.index({ walletId: 1, createdAt: -1 });
// Partial-unique so many rows without the key don't collide on null.
walletTransactionSchema.index(
  { idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);
walletTransactionSchema.index(
  { seedKey: 1 },
  { unique: true, partialFilterExpression: { seedKey: { $type: 'string' } } }
);

export const WalletTransaction = mongoose.model('WalletTransaction', walletTransactionSchema);
