import { ApiError } from '../../utils/ApiError.js';
import { logger } from '../../utils/logger.js';
import { invalidate } from '../../services/cache.service.js';
import { refundPayment } from '../../services/razorpay.service.js';
import {
  registerPurposeHandler,
  createOrder as createPaymentOrder,
} from '../payment/payment.service.js';
import { notify } from '../../services/notify.js';
import { postLedgerEntry } from '../vendor/vendor.service.js';
import { VendorProfile } from '../vendor/vendor.models.js';
import { Payment } from '../payment/payment.model.js';
import { Product } from '../shop/product.model.js';
import { Address } from '../address/address.model.js';
import { Cart } from '../cart/cart.model.js';
import { Order, CANCELLABLE_STATUSES } from './order.model.js';

// Mirrors the UI's summary math exactly: 5% tax, free delivery.
const TAX_RATE = 0.05;

/**
 * Validate requested lines against the live catalog and build price-trusted
 * order items. Client prices are NEVER used.
 */
async function buildOrderItems(lines) {
  const products = await Product.find({
    _id: { $in: lines.map((l) => l.productId) },
    active: true,
    deletedAt: null,
  });
  const byId = new Map(products.map((p) => [String(p.id), p]));

  const items = [];
  for (const line of lines) {
    const product = byId.get(String(line.productId));
    if (!product) throw ApiError.badRequest('An item in your cart is no longer available');
    const pack = product.packSizes[line.packSizeIndex];
    if (!pack) throw ApiError.badRequest(`Invalid pack size for ${product.name}`);
    if (pack.stock < line.qty) {
      throw ApiError.badRequest(`Only ${pack.stock} left of ${product.name} (${pack.size})`);
    }
    items.push({
      productId: product.id,
      legacyId: product.legacyId,
      name: product.name,
      img: product.img || product.images[0] || '',
      size: pack.size,
      packSizeIndex: line.packSizeIndex,
      qty: line.qty,
      unitPrice: pack.price,
      total: pack.price * line.qty,
    });
  }
  return items;
}

function computeAmounts(items) {
  const subtotalRupees = items.reduce((sum, i) => sum + i.total, 0);
  const subtotal = Math.round(subtotalRupees * 100); // paise
  const tax = Math.round(subtotal * TAX_RATE);
  const delivery = 0;
  return { subtotal, tax, delivery, discount: 0, total: subtotal + tax + delivery };
}

/**
 * Atomically decrement stock for every line; compensates already-decremented
 * lines if one runs out mid-flight. Returns false if stock was insufficient.
 */
async function decrementStock(items) {
  const done = [];
  for (const item of items) {
    const path = `packSizes.${item.packSizeIndex}.stock`;
    const res = await Product.updateOne(
      { _id: item.productId, [path]: { $gte: item.qty } },
      { $inc: { [path]: -item.qty } }
    );
    if (res.modifiedCount === 0) {
      await restoreStock(done);
      return false;
    }
    done.push(item);
  }
  return true;
}

async function restoreStock(items) {
  for (const item of items) {
    const path = `packSizes.${item.packSizeIndex}.stock`;
    await Product.updateOne({ _id: item.productId }, { $inc: { [path]: item.qty } });
  }
}

/**
 * POST /orders/checkout — creates the order server-priced.
 * Razorpay: order stays pending_payment until the dispatcher confirms.
 * COD: stock is taken immediately and the order is placed.
 */
export async function checkout(user, { items: lines, addressId, paymentMethod }) {
  const address = await Address.findOne({ _id: addressId, userId: user.id, deletedAt: null });
  if (!address) throw ApiError.badRequest('Select a valid delivery address');

  const items = await buildOrderItems(lines);
  if (!items.length) throw ApiError.badRequest('Your cart is empty');
  const amounts = computeAmounts(items);

  const order = await Order.create({
    userId: user.id,
    items,
    amounts,
    addressSnapshot: address.toObject(),
    paymentMethod,
    status: 'pending_payment',
    timeline: [{ status: 'pending_payment', note: 'Order created' }],
  });

  if (paymentMethod === 'cod') {
    if (!(await decrementStock(items))) {
      await Order.deleteOne({ _id: order.id });
      throw ApiError.badRequest('An item just went out of stock — please review your cart');
    }
    order.status = 'placed';
    order.timeline.push({ status: 'placed', note: 'Cash on delivery' });
    await order.save();
    await afterPlacement(user.id);
    await notifyOrderPlaced(order);
    await recordVendorLedger(order);
    return { order };
  }

  // Razorpay path: hand off to the shared payment dispatcher.
  const payment = await createPaymentOrder(user, 'order', { orderId: order.id });
  order.paymentId = payment.paymentId;
  await order.save();
  return { order, razorpay: payment };
}

/** Clear the server cart + refresh catalog caches after a successful order. */
async function afterPlacement(userId) {
  await Cart.updateOne({ userId }, { $set: { items: [] } }).catch(() => {});
  await invalidate('shop:*');
}

/** Post a vendor commission ledger entry once an order is paid/placed. */
async function recordVendorLedger(order) {
  if (!order.vendorId) return; // platform-owned catalog — nothing to settle
  try {
    const profile = await VendorProfile.findOne({ userId: order.vendorId });
    await postLedgerEntry({
      vendorId: order.vendorId,
      refType: 'order',
      refId: order._id,
      label: `Order ${order.orderNo}`,
      gross: order.amounts.total,
      commissionRate: profile?.commissionRate ?? 0.15,
    });
  } catch {
    // ledger is best-effort — never block fulfilment
  }
}

/** In-app + push notification for a freshly placed order. Best-effort. */
async function notifyOrderPlaced(order) {
  await notify(order.userId, {
    title: 'Order Placed!',
    body: `Your TailShop order ${order.orderNo} has been placed successfully.`,
    type: 'shop',
    link: '/app/profile/orders',
    data: { orderId: String(order._id), orderNo: order.orderNo },
  }).catch(() => {});
}

/** Idempotent fulfilment — runs from verify AND webhook. */
async function fulfillPaidOrder(payment) {
  const order = await Order.findOneAndUpdate(
    { _id: payment.refId, status: 'pending_payment' },
    {
      $set: { paymentId: payment.id },
      $push: { timeline: { status: 'placed', note: 'Payment received' } },
    },
    { new: true }
  );
  if (!order) return; // already fulfilled

  if (await decrementStock(order.items)) {
    order.status = 'placed';
  } else {
    // Paid but someone bought the last unit between checkout and payment.
    order.status = 'placed';
    order.timeline.push({
      status: 'placed',
      note: 'Stock conflict — flagged for support',
    });
    logger.error(`Order ${order.orderNo}: paid but stock insufficient — needs manual resolution`);
  }
  await order.save();
  await afterPlacement(order.userId);
  await notifyOrderPlaced(order);
  await recordVendorLedger(order);
}

registerPurposeHandler('order', {
  computeAmount: async (user, payload) => {
    const order = await Order.findOne({
      _id: payload.orderId,
      userId: user.id,
      status: 'pending_payment',
      paymentMethod: 'razorpay',
    });
    if (!order) throw ApiError.badRequest('Order not found or already paid');
    return { amountPaise: order.amounts.total, refId: order.id };
  },
  onPaid: fulfillPaidOrder,
  onFailed: async (payment) => {
    await Order.updateOne(
      { _id: payment.refId, status: 'pending_payment' },
      { $push: { timeline: { status: 'pending_payment', note: 'Payment failed — retry available' } } }
    );
  },
});

export async function listOrders(userId) {
  return Order.find({ userId, status: { $ne: 'pending_payment' } }).sort({ createdAt: -1 }).limit(100);
}

export async function getOrder(userId, orderId) {
  const order = await Order.findOne({ _id: orderId, userId });
  if (!order) throw ApiError.notFound('Order not found');
  return order;
}

/** Cancel pre-shipment; paid Razorpay orders are auto-refunded. */
export async function cancelOrder(userId, orderId) {
  const order = await Order.findOne({ _id: orderId, userId });
  if (!order) throw ApiError.notFound('Order not found');
  if (!CANCELLABLE_STATUSES.includes(order.status)) {
    throw ApiError.badRequest('This order can no longer be cancelled');
  }

  const wasCharged = order.status !== 'pending_payment';

  if (wasCharged) await restoreStock(order.items);

  if (wasCharged && order.paymentMethod === 'razorpay' && order.paymentId) {
    const payment = await Payment.findById(order.paymentId);
    if (payment?.status === 'paid' && payment.razorpayPaymentId) {
      await refundPayment(payment.razorpayPaymentId);
      payment.status = 'refunded';
      payment.refundedAmount = payment.amount;
      await payment.save();
      order.timeline.push({ status: 'refunded', note: 'Refund initiated to source' });
    }
  }

  order.status = 'cancelled';
  order.timeline.push({ status: 'cancelled', note: 'Cancelled by customer' });
  await order.save();
  return order;
}

/** Request a return post-delivery (vendor processes it in Phase 9). */
export async function requestReturn(userId, orderId, reason) {
  const order = await Order.findOne({ _id: orderId, userId });
  if (!order) throw ApiError.notFound('Order not found');
  if (order.status !== 'delivered') {
    throw ApiError.badRequest('Returns are available after delivery');
  }
  order.status = 'return_requested';
  order.timeline.push({ status: 'return_requested', note: reason || 'Return requested' });
  await order.save();
  return order;
}
