import mongoose from 'mongoose';

export const ORDER_STATUSES = [
  'pending_payment',
  'placed',
  'confirmed',
  'packed',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'return_requested',
  'returned',
  'refunded',
];

/** States a user may still cancel from (pre-shipment). */
export const CANCELLABLE_STATUSES = ['pending_payment', 'placed', 'confirmed', 'packed'];

/**
 * Shop order. Item prices are RUPEE snapshots of what the user saw;
 * `amounts` are integer PAISE (what Razorpay is charged). Address is a
 * snapshot — editing the address book never rewrites order history.
 */
const orderSchema = new mongoose.Schema(
  {
    orderNo: { type: String, unique: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    /**
     * Set only when every line in the order belongs to the same seller. An
     * order can mix one shop's products with the platform's own, so the
     * authoritative owner of a line is `items[].vendorId` — that is what the
     * vendor portal queries and what the ledger settles against.
     */
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    items: [
      {
        _id: false,
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        // Who sells this line (null = the platform's own catalogue). Captured
        // at checkout so a later change of product ownership cannot rewrite
        // who an existing order belongs to.
        vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        legacyId: { type: Number, default: null },
        name: { type: String, required: true },
        img: { type: String, default: '' },
        size: { type: String, default: '' },
        packSizeIndex: { type: Number, default: 0 },
        qty: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true }, // rupees
        total: { type: Number, required: true }, // rupees
        // Which breed Monthly Essentials Bundle this line was bought as part
        // of, so the discount on the order can be explained after the fact.
        bundleSlug: { type: String, default: null },
      },
    ],
    amounts: {
      subtotal: { type: Number, required: true }, // paise
      tax: { type: Number, required: true },
      delivery: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      total: { type: Number, required: true },
    },
    addressSnapshot: { type: Object, default: null },
    paymentMethod: { type: String, enum: ['razorpay', 'cod'], required: true },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'pending_payment',
      index: true,
    },
    timeline: [
      {
        _id: false,
        status: { type: String, required: true },
        at: { type: Date, default: Date.now },
        note: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1, createdAt: -1 });

orderSchema.pre('save', function assignOrderNo() {
  if (!this.orderNo) {
    this.orderNo = `TC${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 900 + 100)}`;
  }
});

export const Order = mongoose.model('Order', orderSchema);
export default Order;
