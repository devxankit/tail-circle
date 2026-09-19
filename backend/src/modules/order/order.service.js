import { ApiError } from '../../utils/ApiError.js';
import { logger } from '../../utils/logger.js';
import { invalidate } from '../../services/cache.service.js';
import {
  registerPurposeHandler,
  createOrder as createPaymentOrder,
} from '../payment/payment.service.js';
import { notify } from '../../services/notify.js';
import { postLedgerEntry, commissionFor } from '../vendor/vendor.service.js';
import { Payment } from '../payment/payment.model.js';
import { issueRefund } from '../payment/refund.service.js';
import { Product } from '../shop/product.model.js';
import { resolveBundleDiscounts } from '../shop/bundle.service.js';
import { Address } from '../address/address.model.js';
import { Cart } from '../cart/cart.model.js';
import { Order, CANCELLABLE_STATUSES } from './order.model.js';
import { createWithUniqueRef } from '../../utils/uniqueRef.js';
import { alertVendor } from '../../services/vendorAlert.js';
import { offlineVendorIds } from '../vendor/availability.service.js';

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
  // Fetched once for the whole cart rather than per line.
  const offlineSellers = await offlineVendorIds();

  const items = [];
  for (const line of lines) {
    const product = byId.get(String(line.productId));
    if (!product) throw ApiError.badRequest('An item in your cart is no longer available');
    /*
     * A cart outlives the listing it was filled from, so a seller can close
     * between adding an item and checking out. Named rather than generic:
     * "something is unavailable" makes the buyer re-check every line.
     */
    if (product.vendorId && offlineSellers.includes(String(product.vendorId))) {
      throw ApiError.badRequest(`${product.name} is from a seller who is not taking orders right now`);
    }
    const pack = product.packSizes[line.packSizeIndex];
    if (!pack) throw ApiError.badRequest(`Invalid pack size for ${product.name}`);
    if (pack.stock < line.qty) {
      throw ApiError.badRequest(`Only ${pack.stock} left of ${product.name} (${pack.size})`);
    }
    items.push({
      productId: product.id,
      vendorId: product.vendorId || null,
      legacyId: product.legacyId,
      name: product.name,
      img: product.img || product.images[0] || '',
      size: pack.size,
      packSizeIndex: line.packSizeIndex,
      qty: line.qty,
      unitPrice: pack.price,
      total: pack.price * line.qty,
      bundleSlug: line.bundleSlug || null,
    });
  }
  return items;
}

/**
 * Amounts are in paise and always server-derived.
 *
 * `discount` was hardcoded to 0, which meant a breed Monthly Essentials Bundle
 * charged the full sum of its parts however loudly the shop advertised the box
 * price. It is now the real bundle saving, resolved from each breed's own
 * bundlePrice, and tax is charged on the discounted subtotal rather than the
 * list total.
 */
function computeAmounts(items, bundleDiscountRupees = 0) {
  const subtotalRupees = items.reduce((sum, i) => sum + i.total, 0);
  const subtotal = Math.round(subtotalRupees * 100); // paise
  const discount = Math.min(subtotal, Math.round(bundleDiscountRupees * 100));
  const taxable = subtotal - discount;
  const tax = Math.round(taxable * TAX_RATE);
  const delivery = 0;
  return { subtotal, tax, delivery, discount, total: taxable + tax + delivery };
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
  // Resolved from the breed catalogue, never from anything the client sent.
  const { discount: bundleDiscount } = await resolveBundleDiscounts(
    items.map((i) => ({
      productId: i.productId,
      packSizeIndex: i.packSizeIndex,
      qty: i.qty,
      bundleSlug: i.bundleSlug || null,
    }))
  );
  const amounts = computeAmounts(items, bundleDiscount);

  const order = await createWithUniqueRef(
    Order,
    {
      userId: user.id,
      // Nothing ever set this, so every order was `vendorId: null` — the shop
      // vendor portal queries orders by vendor, so sellers saw an empty order
      // list forever and the commission ledger skipped every sale.
      vendorId: singleVendorOf(items),
      items,
      amounts,
      addressSnapshot: address.toObject(),
      paymentMethod,
      status: 'pending_payment',
      timeline: [
        { status: 'pending_payment', note: 'Order created', by: 'customer', byId: user.id, byName: user.name || '' },
      ],
    },
    'orderNo'
  );

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

/** The single seller behind every line, or null for a mixed / platform order. */
function singleVendorOf(items) {
  const owners = new Set(items.map((i) => String(i.vendorId || '')));
  if (owners.size !== 1) return null;
  const [only] = [...owners];
  return only || null;
}

/**
 * Credit each seller once an order is paid/placed.
 *
 * An order can carry lines from more than one shop plus the platform's own
 * stock, so each seller is settled on the value of *their* lines — with tax
 * apportioned by their share — rather than on the order total. Crediting the
 * whole total to one `order.vendorId` would have overpaid a seller whose goods
 * were part of a larger basket.
 */
async function recordVendorLedger(order) {
  const byVendor = new Map();
  for (const item of order.items || []) {
    const vendorId = item.vendorId ? String(item.vendorId) : null;
    if (!vendorId) continue; // platform-owned line — nothing to settle
    byVendor.set(vendorId, (byVendor.get(vendorId) || 0) + Math.round(item.total * 100));
  }
  if (!byVendor.size) return;

  const subtotal = order.amounts?.subtotal || 0;
  const extras = (order.amounts?.tax || 0) + (order.amounts?.delivery || 0);

  for (const [vendorId, linesPaise] of byVendor) {
    try {
      const share = subtotal > 0 ? linesPaise / subtotal : 0;
      const gross = linesPaise + Math.round(extras * share);
      // A seller may also run other business lines (a shop that offers
      // grooming), each with its own negotiated commission — so read the rate
      // from the shop profile specifically, not from whichever came first.
      const commissionRate = await commissionFor(vendorId, 'shop');
      await postLedgerEntry({
        vendorId,
        refType: 'order',
        // The ledger is unique on (refType, refId), so a multi-vendor order
        // needs a distinct reference per seller.
        // Idempotent per (vendor, refType, refId), so re-fulfilment cannot
        // double-credit while two sellers on one order both get paid.
        refId: order._id,
        label: `Order ${order.orderNo}`,
        gross,
        commissionRate,
        vendorType: 'shop',
      });
    } catch {
      // ledger is best-effort — never block fulfilment
    }
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

  /*
   * Tell the SELLER, which nothing here ever did.
   *
   * A paid order landed in the database and the only way a shop vendor found
   * out was by refreshing their orders tab. That is the direct cause of the
   * "order sat unshipped for days" failure the compliance sweeps now penalise
   * partners for — so penalising them without ever telling them would be
   * unfair as well as useless. Rings the panel, pushes to their phone.
   *
   * Alerted per seller: a basket split across two shops is two pieces of work.
   */
  const perVendor = new Map();
  for (const item of order.items || []) {
    if (!item.vendorId) continue; // platform stock, nobody to alert
    const key = String(item.vendorId);
    const bucket = perVendor.get(key) || { qty: 0, names: [] };
    bucket.qty += item.qty || 1;
    if (bucket.names.length < 2) bucket.names.push(item.name);
    perVendor.set(key, bucket);
  }

  for (const [vendorId, bucket] of perVendor) {
    const preview = bucket.names.join(', ');
    const more = bucket.qty > bucket.names.length ? ` +${bucket.qty - bucket.names.length} more` : '';
    await alertVendor(vendorId, {
      kind: 'order_new',
      title: 'New order',
      body: `Order ${order.orderNo} — ${preview}${more}. Pack and dispatch to avoid an SLA breach.`,
      link: '/vendor/shop/orders',
      refId: order._id,
      refLabel: order.orderNo,
      data: { orderId: String(order._id), orderNo: order.orderNo },
    });
  }
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

/**
 * Cancel pre-shipment; paid Razorpay orders are auto-refunded.
 *
 * Shared by the customer's cancel and an Admin override so both leave the same
 * state. Ordering mirrors the booking path: the order is closed and stock
 * restored first, then the refund runs as a recorded, retryable step — it
 * previously threw on a gateway failure after stock had already moved.
 */
export async function cancelOrder(userId, orderId, options = {}) {
  const query = userId ? { _id: orderId, userId } : { _id: orderId };
  const order = await Order.findOne(query);
  if (!order) throw ApiError.notFound('Order not found');
  if (!CANCELLABLE_STATUSES.includes(order.status) && !options.force) {
    throw ApiError.badRequest('This order can no longer be cancelled');
  }
  return performOrderCancellation(order, {
    by: 'customer',
    reason: 'Cancelled by customer',
    ...options,
  });
}

export async function performOrderCancellation(
  order,
  { by = 'customer', actor = null, reason = '', refund = true, refundAmountPaise = null } = {}
) {
  const wasCharged = order.status !== 'pending_payment';

  if (wasCharged) await restoreStock(order.items);

  order.status = 'cancelled';
  order.cancelledBy = by;
  order.cancellationReason = reason || `Cancelled by ${by}`;
  order.cancelledAt = new Date();
  pushOrderTimeline(order, 'cancelled', order.cancellationReason, by, actor);
  await order.save();

  if (refund && wasCharged && order.paymentMethod === 'razorpay' && order.paymentId) {
    await refundOrder(order, {
      amountPaise: refundAmountPaise,
      reason: reason || `Order cancelled by ${by}`,
      initiatedBy: by,
      actor,
    });
  }

  await notify(order.userId, {
    title: 'Order cancelled',
    body:
      by === 'customer'
        ? `Order ${order.orderNo} has been cancelled.`
        : `Order ${order.orderNo} was cancelled by the ${by}. Any payment is being refunded.`,
    type: 'shop',
    link: '/app/profile/orders',
    data: { orderId: String(order._id) },
  }).catch(() => {});

  return order;
}

/**
 * Push money back for an order and keep its refund columns in step with the
 * Refund register. Also reverses the seller's earning — a refunded order used
 * to leave the vendor's ledger entry standing, so the platform paid out on a
 * sale it had handed back.
 */
export async function refundOrder(order, { amountPaise = null, reason, initiatedBy = 'system', actor = null }) {
  if (!order.paymentId) return null;
  const payment = await Payment.findById(order.paymentId);
  if (!payment || (payment.status !== 'paid' && payment.status !== 'partially_refunded')) return null;

  const refund = await issueRefund({
    payment,
    amountPaise,
    reason,
    initiatedBy,
    actor,
    refType: 'order',
    refId: order._id,
    label: `Order ${order.orderNo}`,
  });

  if (refund.status === 'processed') {
    const totalRefunded = (order.refundedAmount || 0) + refund.amount;
    order.refundedAmount = totalRefunded;
    order.refundStatus = totalRefunded >= (order.amounts?.total || 0) ? 'full' : 'partial';
    pushOrderTimeline(
      order,
      'refunded',
      `Refund ${refund.refundNo} of ${Math.round(refund.amount / 100).toLocaleString('en-IN')} initiated to source`,
      initiatedBy,
      actor
    );
  } else {
    order.refundStatus = 'failed';
    pushOrderTimeline(
      order,
      order.status,
      `Refund ${refund.refundNo} FAILED: ${refund.failureReason || 'gateway error'} - queued for Admin retry`,
      'system'
    );
  }
  await order.save();
  return refund;
}

/** Append a timeline entry that records who caused it. */
export function pushOrderTimeline(order, status, note, by = 'system', actor = null) {
  order.timeline.push({
    status,
    at: new Date(),
    note: note || '',
    by,
    byId: actor?.id || actor?._id || null,
    byName: actor?.name || actor?.email || '',
  });
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
