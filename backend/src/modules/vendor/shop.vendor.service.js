import { ApiError } from '../../utils/ApiError.js';
import { invalidate } from '../../services/cache.service.js';
import { Product } from '../shop/product.model.js';
import { Order } from '../order/order.model.js';
import { Review } from '../review/review.model.js';
import { notify } from '../../services/notify.js';

/* ── Products (scoped to vendorId) ────────────────────────── */

/** Product doc → the ShopVendorContext product shape (single price/stock). */
export function toVendorProduct(p) {
  const pack = p.packSizes?.[0] || { price: p.price, mrp: p.mrp, stock: 0, sku: '' };
  const stock = pack.stock ?? 0;
  return {
    id: p.legacyId ? `P${p.legacyId}` : String(p._id),
    _id: String(p._id),
    name: p.name,
    category: p.category,
    price: pack.mrp,
    discountPrice: pack.price,
    stock,
    alertLimit: 5,
    sku: pack.sku || '',
    status: !p.active ? 'Inactive' : stock <= 0 ? 'Out of Stock' : 'Active',
    image: p.img || p.images?.[0] || '',
  };
}

export async function listVendorProducts(vendorId) {
  const products = await Product.find({ vendorId, deletedAt: null }).sort({ createdAt: -1 });
  return products.map(toVendorProduct);
}

export async function createVendorProduct(vendorId, body) {
  const slug = `${body.name}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80);
  const product = await Product.create({
    vendorId,
    name: body.name,
    category: body.category || 'Accessories',
    petType: body.petType || 'Dog',
    price: Number(body.discountPrice ?? body.price) || 0,
    mrp: Number(body.price) || 0,
    img: body.image || '',
    slug,
    packSizes: [
      {
        size: body.size || 'Standard',
        price: Number(body.discountPrice ?? body.price) || 0,
        mrp: Number(body.price) || 0,
        sku: body.sku || '',
        stock: Number(body.stock) || 0,
      },
    ],
    active: true,
  });
  await invalidate('shop:*');
  return toVendorProduct(product);
}

async function ownedProduct(vendorId, id) {
  const product = await Product.findOne({ _id: id, vendorId, deletedAt: null });
  if (!product) throw ApiError.notFound('Product not found');
  return product;
}

export async function updateVendorProduct(vendorId, id, body) {
  const product = await ownedProduct(vendorId, id);
  if (body.name != null) product.name = body.name;
  if (body.category != null) product.category = body.category;
  if (!product.packSizes.length) product.packSizes = [{ size: 'Standard', price: 0, mrp: 0, stock: 0 }];
  const pack = product.packSizes[0];
  if (body.price != null) pack.mrp = product.mrp = Number(body.price);
  if (body.discountPrice != null) pack.price = product.price = Number(body.discountPrice);
  if (body.stock != null) pack.stock = Number(body.stock);
  if (body.sku != null) pack.sku = body.sku;
  if (body.image != null) product.img = body.image;
  if (body.status === 'Inactive') product.active = false;
  else if (body.status) product.active = true;
  await product.save();
  await invalidate('shop:*');
  return toVendorProduct(product);
}

export async function deleteVendorProduct(vendorId, id) {
  const product = await ownedProduct(vendorId, id);
  product.deletedAt = new Date();
  product.active = false;
  await product.save();
  await invalidate('shop:*');
}

/** Inventory stock adjustment (absolute set or delta). */
export async function adjustStock(vendorId, id, { set, delta }) {
  const product = await ownedProduct(vendorId, id);
  if (!product.packSizes.length) throw ApiError.badRequest('Product has no pack size');
  const pack = product.packSizes[0];
  const next = set != null ? Number(set) : pack.stock + Number(delta || 0);
  if (next < 0) throw ApiError.badRequest('Stock cannot go negative');
  pack.stock = next;
  await product.save();
  await invalidate('shop:*');
  return toVendorProduct(product);
}

/* ── Orders (scoped to vendorId) ──────────────────────────── */

const STATUS_TO_MOCK = {
  placed: 'New',
  confirmed: 'New',
  packed: 'Packed',
  shipped: 'Dispatched',
  out_for_delivery: 'Dispatched',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  return_requested: 'Return',
  returned: 'Returned',
  refunded: 'Refunded',
};

// Forward-only transitions a vendor may drive.
const NEXT = {
  placed: ['packed', 'cancelled'],
  confirmed: ['packed', 'cancelled'],
  packed: ['shipped'],
  shipped: ['out_for_delivery', 'delivered'],
  out_for_delivery: ['delivered'],
};

/**
 * Orders this seller has a stake in.
 *
 * Matches on `items.vendorId`, not the order-level `vendorId`: an order can mix
 * this shop's goods with the platform's own, and the order-level field is only
 * set when a single seller owns every line. Querying the order-level field
 * alone (as this did) returned nothing at all, because checkout never set it.
 */
const ownedByVendor = (vendorId) => ({ 'items.vendorId': vendorId });

/** Only this seller's lines, and what they are worth in paise. */
function vendorLines(order, vendorId) {
  const mine = (order.items || []).filter((i) => String(i.vendorId || '') === String(vendorId));
  return { items: mine, grossPaise: Math.round(mine.reduce((sum, i) => sum + i.total, 0) * 100) };
}

export function toVendorOrder(o, vendorId) {
  // A seller sees their own lines and their own revenue, not the whole basket's
  // — showing the order total would overstate what a mixed order earned them.
  const mine = vendorId ? vendorLines(o, vendorId) : null;
  return {
    id: o.orderNo,
    _id: String(o._id),
    customer: o.addressSnapshot?.fullName || 'Customer',
    products: mine ? mine.items.length : o.items?.length || 0,
    items: (mine ? mine.items : o.items || []).map((i) => ({
      name: i.name, size: i.size, qty: i.qty, total: i.total,
    })),
    total: Math.round((mine ? mine.grossPaise : o.amounts?.total || 0) / 100),
    orderTotal: Math.round((o.amounts?.total || 0) / 100),
    isSharedOrder: Boolean(mine && mine.items.length !== (o.items || []).length),
    paymentStatus: o.paymentMethod === 'cod' ? 'COD' : 'Paid',
    status: STATUS_TO_MOCK[o.status] || o.status,
    rawStatus: o.status,
    date: o.createdAt,
    deliveryType: 'Standard',
  };
}

export async function listVendorOrders(vendorId) {
  const orders = await Order.find({ ...ownedByVendor(vendorId), status: { $ne: 'pending_payment' } })
    .sort({ createdAt: -1 })
    .limit(200);
  return orders.map((o) => toVendorOrder(o, vendorId));
}

export async function updateVendorOrderStatus(vendorId, id, target) {
  const order = await Order.findOne({ _id: id, ...ownedByVendor(vendorId) });
  if (!order) throw ApiError.notFound('Order not found');
  const allowed = NEXT[order.status] || [];
  if (!allowed.includes(target)) {
    throw ApiError.badRequest(`Cannot move order from ${order.status} to ${target}`);
  }
  order.status = target;
  order.timeline.push({ status: target, note: 'Updated by vendor' });
  await order.save();
  notify(order.userId, {
    title: 'Order Update',
    body: `Your order ${order.orderNo} is now ${STATUS_TO_MOCK[target] || target}.`,
    type: 'shop',
    link: '/app/profile/orders',
    data: { orderId: String(order._id), status: target },
  }).catch(() => {});
  return toVendorOrder(order, vendorId);
}

/* ── Returns ──────────────────────────────────────────────── */

export async function listVendorReturns(vendorId) {
  const orders = await Order.find({ ...ownedByVendor(vendorId), status: { $in: ['return_requested', 'returned'] } })
    .sort({ updatedAt: -1 })
    .limit(100);
  return orders.map((o) => ({
    id: `RET-${o.orderNo}`,
    _id: String(o._id),
    orderId: o.orderNo,
    customer: o.addressSnapshot?.fullName || 'Customer',
    product: vendorLines(o, vendorId).items[0]?.name || o.items?.[0]?.name || '',
    reason: o.timeline?.find((t) => t.status === 'return_requested')?.note || 'Return requested',
    amount: Math.round(vendorLines(o, vendorId).grossPaise / 100),
    status: o.status === 'returned' ? 'Approved' : 'Requested',
    date: o.updatedAt,
  }));
}

export async function resolveReturn(vendorId, id, action) {
  const order = await Order.findOne({ _id: id, ...ownedByVendor(vendorId), status: 'return_requested' });
  if (!order) throw ApiError.notFound('Return request not found');
  order.status = action === 'approve' ? 'returned' : 'delivered';
  order.timeline.push({ status: order.status, note: `Return ${action}d by vendor` });
  await order.save();
  return { id: String(order._id), status: order.status };
}

/* ── Feedback (reviews on this vendor's products) ─────────── */

export async function listVendorFeedback(vendorId) {
  const productIds = await Product.find({ vendorId }).distinct('_id');
  const reviews = await Review.find({ targetType: 'product', targetId: { $in: productIds }, status: 'visible' })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('userId', 'name');
  return reviews.map((r) => ({
    id: String(r._id),
    customer: r.userId?.name || 'Customer',
    type: 'Product Review',
    rating: r.rating,
    message: r.text || '',
    date: r.createdAt,
    status: r.vendorReply?.text ? 'Replied' : 'Unread',
    reply: r.vendorReply?.text || '',
  }));
}

/** Reply to a review left on one of this vendor's products. */
export async function replyToProductFeedback(vendorId, reviewId, text) {
  const review = await Review.findOne({ _id: reviewId, targetType: 'product' });
  if (!review) throw ApiError.notFound('Review not found');
  const owns = await Product.exists({ _id: review.targetId, vendorId });
  if (!owns) throw ApiError.forbidden('Not your product review');
  review.vendorReply = { text, repliedAt: new Date() };
  await review.save();
  return { id: String(review._id), reply: text, status: 'Replied' };
}
