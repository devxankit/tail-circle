import mongoose from 'mongoose';

/**
 * One server cart per user. Only references + qty are stored — prices are
 * revalidated from the Product catalog on every read so a stale cart can
 * never carry old prices into checkout.
 */
const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    items: [
      {
        _id: false,
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        packSizeIndex: { type: Number, default: 0, min: 0 },
        qty: { type: Number, required: true, min: 1, max: 99 },
      },
    ],
  },
  { timestamps: true }
);

export const Cart = mongoose.model('Cart', cartSchema);
export default Cart;
