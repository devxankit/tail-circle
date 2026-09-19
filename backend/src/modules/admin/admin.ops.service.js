import mongoose from 'mongoose';
import { ApiError } from '../../utils/ApiError.js';
import { Order } from '../order/order.model.js';
import { Booking } from '../booking/booking.model.js';
import { MealOrder } from '../meal/meal.models.js';
import { SupportTicket } from '../support/supportTicket.model.js';
// Imported so their schemas register for `.populate()` (providerId/doctorId refs).
import '../provider/provider.model.js';
import '../provider/doctor.model.js';
import { writeAudit } from './admin.service.js';
import { VendorLedgerEntry } from '../vendor/vendor.models.js';
import { Payment } from '../payment/payment.model.js';
import { notify } from '../../services/notify.js';
import { refundOrder, performOrderCancellation, pushOrderTimeline } from '../order/order.service.js';
import {
  performCancellation as performBookingCancellation,
  refundBooking,
  pushTimeline as pushBookingTimeline,
  resolveBookingVendor,
} from '../booking/booking.service.js';
import { canTransition, BOOKING_STATUSES } from '../booking/booking.model.js';
import { ORDER_STATUSES } from '../order/order.model.js';

/**
 * Real platform commission per reference, in paise, from the vendor ledger.
 *
 * These screens used to display `amount * 0.12`, a rate nothing in the system
 * ever charged: settlement bills the configured vendor/category rate, so the
 * ops reports contradicted the payouts they were meant to explain. Summed per
 * reference because a basket split across two sellers posts one entry each.
 * A reference with no entry yet -- unpaid, or not fulfilled -- has no
 * commission to report, which reads as a dash rather than an invented number.
 */
async function commissionByRef(refIds) {
  const ids = refIds.filter(Boolean);
  if (!ids.length) return new Map();
  const rows = await VendorLedgerEntry.find({ refId: { $in: ids } }).select('refId commission').lean();
  const map = new Map();
  for (const r of rows) {
    const key = String(r.refId);
    map.set(key, (map.get(key) || 0) + (r.commission || 0));
  }
  return map;
}

/** Commission cell for one reference: real rupees, or a dash if none is posted. */
const commissionCell = (map, id) => {
  const paise = map.get(String(id));
  return paise === undefined ? '—' : rupees(paise).toLocaleString('en-IN');
};

const rupees = (paise) => Math.round((paise || 0) / 100);
const fmtDate = (d) => (d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

const titleCase = (s) => (s || '').split(/[_\s]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
const timeAgoStr = (d) => {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  return `${Math.floor(hrs / 24)} day${Math.floor(hrs / 24) === 1 ? '' : 's'} ago`;
};

/* ── Payment truth ────────────────────────────────────────────────── */

/**
 * Real payment state for a batch of orders/bookings, read from the Payment
 * collection rather than guessed.
 *
 * The ops lists used to infer it: bookings showed "Paid" whenever `paymentId`
 * was set, but that id is written when the Razorpay ORDER is created — before
 * the customer has paid anything — so every unpaid booking displayed as Paid.
 * Orders were worse: any non-COD order read "Paid" unconditionally. Admin was
 * being shown the opposite of the truth on the two screens money questions get
 * asked from.
 */
async function paymentStateByIds(paymentIds) {
  const ids = paymentIds.filter(Boolean);
  if (!ids.length) return new Map();
  const rows = await Payment.find({ _id: { $in: ids } })
    .select('status amount refundedAmount method razorpayPaymentId')
    .lean();
  return new Map(rows.map((p) => [String(p._id), p]));
}

const PAYMENT_LABEL = {
  created: 'Pending',
  paid: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
  partially_refunded: 'Partly Refunded',
};

/** Display payment status for one row, honest about what actually happened. */
function paymentCell(doc, stateMap) {
  if (doc.paymentMethod === 'cod') {
    return doc.status === 'delivered' ? 'Collected' : 'COD Pending';
  }
  if (doc.paymentMethod === 'free') return 'Free';
  if (doc.paymentMethod === 'pay_later') return 'Pay at Venue';
  const payment = doc.paymentId ? stateMap.get(String(doc.paymentId)) : null;
  if (!payment) return 'Pending';
  return PAYMENT_LABEL[payment.status] || titleCase(payment.status);
}

/** Shared list paging/sorting for the ops screens. */
function pageArgs({ page = 1, limit = 50 } = {}) {
  const perPage = Math.min(200, Math.max(1, Number(limit) || 50));
  const current = Math.max(1, Number(page) || 1);
  return { perPage, current, skip: (current - 1) * perPage };
}

function dateRange(from, to) {
  if (!from && !to) return null;
  const range = {};
  if (from) range.$gte = new Date(from);
  if (to) range.$lte = new Date(`${to}T23:59:59.999Z`);
  return range;
}

/* ── Orders (cross-vendor) ────────────────────────────────────────── */

/**
 * Orders for the Admin ops screen.
 *
 * Was an unfiltered, unpaginated `.limit(300)` — Admin could not search for a
 * customer's order, filter to today's failures, or see anything past the 300
 * most recent. Filters and paging are applied in the query so the screen stays
 * usable as volume grows.
 */
export async function listOrders({ status, vendorId, search, from, to, page, limit } = {}) {
  const filter = {};
  if (status && status !== 'All') filter.status = status;
  if (vendorId && mongoose.isValidObjectId(vendorId)) filter.vendorId = vendorId;
  if (search) filter.orderNo = new RegExp(escapeRegex(search), 'i');
  const range = dateRange(from, to);
  if (range) filter.createdAt = range;

  const { perPage, current, skip } = pageArgs({ page, limit });
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('userId', 'name phone')
      .populate('vendorId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage),
    Order.countDocuments(filter),
  ]);

  const [commissions, payments] = await Promise.all([
    commissionByRef(orders.map((o) => o._id)),
    paymentStateByIds(orders.map((o) => o.paymentId)),
  ]);

  const rows = orders.map((o) => ({
    id: o.orderNo || String(o._id),
    _id: String(o._id),
    customerName: o.userId?.name || 'Guest',
    customerPhone: o.userId?.phone || '—',
    petName: '🐾',
    city: o.addressSnapshot?.city || '—',
    vendorName: o.vendorId?.name || 'Platform',
    vendorId: o.vendorId ? String(o.vendorId._id || o.vendorId) : '—',
    itemsCount: o.items?.length || 0,
    previewItem: o.items?.[0]?.name || '—',
    amount: rupees(o.amounts?.total).toLocaleString('en-IN'),
    commission: commissionCell(commissions, o._id),
    paymentMethod: o.paymentMethod === 'cod' ? 'COD' : 'UPI',
    paymentId: o.paymentId ? String(o.paymentId) : '—',
    paymentStatus: paymentCell(o, payments),
    refundStatus: titleCase(o.refundStatus || 'none'),
    refundedAmount: rupees(o.refundedAmount).toLocaleString('en-IN'),
    cancelledBy: o.cancelledBy ? titleCase(o.cancelledBy) : '—',
    orderDate: fmtDate(o.createdAt),
    timeAgo: timeAgoStr(o.createdAt),
    status: titleCase(o.status),
    rawStatus: o.status,
    courier: '—',
    eta: '—',
    itemsList: (o.items || []).map((it) => ({ name: it.name, qty: it.qty, price: it.unitPrice })),
  }));

  return { rows, total, page: current, pages: Math.ceil(total / perPage) || 1 };
}

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* ── Bookings (daycare/grooming/event/memorial) ───────────────────── */
const SERVICE_LABEL = { daycare: 'Day Care', grooming: 'Grooming', event: 'Event', memorial: 'Memorial' };
const PAY_LABEL = { razorpay: 'UPI', pay_later: 'Pay Later', free: 'Free' };
/**
 * Bookings for the Admin ops screen.
 *
 * Adds the columns the lifecycle now actually carries — who cancelled, what
 * happened to the money, whether a partner has answered — so a booking's state
 * can be read off one row instead of inferred from a status word that used to
 * mean several different things.
 */
export async function listBookings({ status, type, providerId, search, from, to, page, limit } = {}) {
  const filter = { type: { $in: ['daycare', 'grooming', 'event', 'memorial'] } };
  if (type && type !== 'All') filter.type = type;
  if (status && status !== 'All') filter.status = status;
  if (providerId && mongoose.isValidObjectId(providerId)) filter.providerId = providerId;
  if (search) filter.bookingNo = new RegExp(escapeRegex(search), 'i');
  const range = dateRange(from, to);
  if (range) filter.createdAt = range;

  const { perPage, current, skip } = pageArgs({ page, limit });
  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate('userId', 'name phone')
      .populate('providerId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage),
    Booking.countDocuments(filter),
  ]);

  const [commissions, payments] = await Promise.all([
    commissionByRef(bookings.map((b) => b._id)),
    paymentStateByIds(bookings.map((b) => b.paymentId)),
  ]);

  const rows = bookings.map((b) => ({
    id: b.bookingNo || String(b._id),
    _id: String(b._id),
    customerName: b.userId?.name || 'Guest',
    customerPhone: b.userId?.phone || '—',
    petInfo: b.petSnapshot?.name ? `${b.petSnapshot.name}${b.petSnapshot.breed ? ` (${b.petSnapshot.breed})` : ''}` : '—',
    city: b.addressSnapshot?.city || '—',
    serviceType: SERVICE_LABEL[b.type] || b.type,
    vendorName: b.providerId?.name || 'Platform',
    vendorRating: '—',
    date: b.schedule?.startDate || fmtDate(b.createdAt),
    slot: b.schedule?.time || '—',
    duration: b.schedule?.durationDays ? `${b.schedule.durationDays} days` : '—',
    addons: (b.items || []).filter((it) => it.kind === 'addon').map((it) => it.name),
    amount: rupees(b.amounts?.total).toLocaleString('en-IN'),
    commission: commissionCell(commissions, b._id),
    paymentMethod: PAY_LABEL[b.paymentMethod] || b.paymentMethod,
    paymentStatus: paymentCell(b, payments),
    refundStatus: titleCase(b.refundStatus || 'none'),
    refundedAmount: rupees(b.refundedAmount).toLocaleString('en-IN'),
    cancelledBy: b.cancelledBy ? titleCase(b.cancelledBy) : '—',
    cancellationReason: b.cancellationReason || '—',
    awaitingSince: b.status === 'awaiting_vendor' && b.vendorRespondBy ? fmtDate(b.vendorRespondBy) : '—',
    overdue: b.status === 'awaiting_vendor' && b.vendorRespondBy ? new Date(b.vendorRespondBy) < new Date() : false,
    status: titleCase(b.status),
    rawStatus: b.status,
  }));

  return { rows, total, page: current, pages: Math.ceil(total / perPage) || 1 };
}

/* ── Appointments (doctor bookings, cross-clinic) ─────────────────── */
export async function listAppointments() {
  const appts = await Booking.find({ type: 'doctor' })
    .populate('userId', 'name')
    .populate('doctorId', 'name spec clinic')
    .sort({ createdAt: -1 })
    .limit(300);
  const commissions = await commissionByRef(appts.map((b) => b._id));
  return appts.map((b) => {
    const fee = rupees(b.amounts?.total);
    return {
      id: b.bookingNo || String(b._id),
      _id: String(b._id),
      petName: b.petSnapshot?.name ? `${b.petSnapshot.name}${b.petSnapshot.breed ? ` (${b.petSnapshot.breed})` : ''}` : '—',
      ownerName: b.meta?.ownerName || b.userId?.name || 'Guest',
      city: '—',
      doctorName: b.doctorId?.name || 'Doctor',
      doctorRating: '—',
      specialization: b.doctorId?.spec || 'General Vet',
      clinicName: b.doctorId?.clinic || '—',
      type: b.visitType === 'video' ? 'Video Call' : 'Clinic Visit',
      date: b.schedule?.startDate || '',
      time: b.schedule?.time || '',
      duration: '30 min',
      issue: b.meta?.issue || b.meta?.symptoms || '—',
      prescription: '—',
      fee: fee.toLocaleString('en-IN'),
      commission: commissionCell(commissions, b._id),
      emergencySurcharge: 0,
      status: b.meta?.clinicStatus || titleCase(b.status),
    };
  });
}

/* ── Deliveries (meal + shop) ─────────────────────────────────────── */
export async function listDeliveries() {
  const [shop, meals] = await Promise.all([
    Order.find({ status: { $in: ['shipped', 'out_for_delivery', 'delivered'] } }).populate('userId', 'name').populate('vendorId', 'name').sort({ createdAt: -1 }).limit(150),
    MealOrder.find({}).populate('userId', 'name').sort({ createdAt: -1 }).limit(150),
  ]);
  const shopRows = shop.map((o) => ({
    id: 'DEL-' + String(o._id).slice(-5).toUpperCase(),
    linkedOrder: o.orderNo || String(o._id),
    type: 'Shop Order',
    customerName: o.userId?.name || 'Guest',
    phone: '—',
    addressShort: o.addressSnapshot?.city || '—',
    addressFull: o.addressSnapshot?.line1 ? `${o.addressSnapshot.line1}, ${o.addressSnapshot.city || ''}` : '—',
    vendorName: o.vendorId?.name || 'Platform',
    vendorType: 'Shop',
    agentName: 'Unassigned',
    agentPhone: '—',
    dispatched: '—',
    date: fmtDate(o.createdAt),
    eta: '--',
    etaStatus: 'On time',
    delayReason: null,
    status: titleCase(o.status),
    lastUpdate: timeAgoStr(o.updatedAt || o.createdAt),
  }));
  const mealRows = meals.map((m) => ({
    id: 'DEL-' + String(m._id).slice(-5).toUpperCase(),
    linkedOrder: m.orderNo || String(m._id),
    type: 'Meal Delivery',
    customerName: m.userId?.name || 'Guest',
    phone: '—',
    addressShort: '—',
    addressFull: '—',
    vendorName: 'Meal Kitchen',
    vendorType: 'Meal',
    agentName: 'Unassigned',
    agentPhone: '—',
    dispatched: '—',
    date: fmtDate(m.createdAt),
    eta: m.deliveryTime || '--',
    etaStatus: 'On time',
    delayReason: null,
    status: titleCase(m.status || 'preparing'),
    lastUpdate: timeAgoStr(m.updatedAt || m.createdAt),
  }));
  return [...shopRows, ...mealRows];
}

/* ── Returns / refunds queue ──────────────────────────────────────── */
const RETURN_STATUS = { return_requested: 'Under Review', returned: 'Approved', refunded: 'Completed', cancelled: 'Rejected' };
export async function listReturns() {
  const orders = await Order.find({ status: { $in: ['return_requested', 'returned', 'cancelled', 'refunded'] } })
    .populate('userId', 'name')
    .populate('vendorId', 'name')
    .sort({ createdAt: -1 })
    .limit(200);
  return orders.map((o) => ({
    id: o.orderNo || String(o._id),
    _id: String(o._id),
    orderId: o.orderNo || String(o._id),
    customerName: o.userId?.name || 'Guest',
    vendorName: o.vendorId?.name || 'Platform',
    item: o.items?.[0]?.name || '—',
    amount: rupees(o.amounts?.total).toLocaleString('en-IN'),
    reason: o.timeline?.slice(-1)[0]?.note || 'Return requested',
    type: 'Refund',
    requestDate: fmtDate(o.createdAt),
    evidence: [],
    status: RETURN_STATUS[o.status] || 'Under Review',
  }));
}

/**
 * Approve or reject a return.
 *
 * Approving used to flip the order to `refunded` and stop there: no gateway
 * call, no Refund row, no ledger reversal. Admin believed they had refunded
 * the customer, the customer was never paid, and the seller kept their
 * earning. Approval now actually moves the money, and the order only reads
 * `refunded` once the gateway confirms — a failed refund stays visible as
 * `return_requested` with a retryable Refund row against it.
 *
 * `amountPaise` supports partial refunds (one line of a basket, a restocking
 * deduction); omitted means the full remaining balance.
 */
export async function resolveReturn(actor, orderId, action, ip, { amountPaise = null, reason = '' } = {}) {
  if (!mongoose.isValidObjectId(orderId)) throw ApiError.badRequest('Invalid order id');
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound('Order not found');
  const before = { status: order.status, refundStatus: order.refundStatus };

  if (action !== 'approve') {
    order.status = 'delivered';
    pushOrderTimeline(order, 'delivered', reason || 'Return rejected by admin', 'admin', actor);
    await order.save();
    await writeAudit(actor, {
      action: 'return.reject',
      targetType: 'order',
      targetId: orderId,
      before,
      after: { status: order.status },
      ip,
    });
    await notify(order.userId, {
      title: 'Return request declined',
      body: `Your return for order ${order.orderNo} was not approved.${reason ? ` ${reason}` : ''}`,
      type: 'shop',
      link: '/app/profile/orders',
      data: { orderId: String(order._id) },
    }).catch(() => {});
    return { id: order.orderNo || String(order._id), status: order.status };
  }

  order.status = 'returned';
  pushOrderTimeline(order, 'returned', reason || 'Return approved by admin', 'admin', actor);
  await order.save();

  const refund = await refundOrder(order, {
    amountPaise,
    reason: reason || `Return approved by ${actor?.name || 'admin'}`,
    initiatedBy: 'admin',
    actor,
  });

  // Only a confirmed refund earns the `refunded` status.
  if (refund?.status === 'processed' && order.refundStatus === 'full') {
    order.status = 'refunded';
    pushOrderTimeline(order, 'refunded', `Refund ${refund.refundNo} completed`, 'admin', actor);
    await order.save();
  }

  await writeAudit(actor, {
    action: 'return.approve',
    targetType: 'order',
    targetId: orderId,
    before,
    after: {
      status: order.status,
      refundStatus: order.refundStatus,
      refundNo: refund?.refundNo || null,
      refundState: refund?.status || 'none',
    },
    ip,
  });

  return {
    id: order.orderNo || String(order._id),
    status: order.status,
    refund: refund
      ? { refundNo: refund.refundNo, status: refund.status, amount: Math.round(refund.amount / 100) }
      : null,
  };
}

/* ── Support tickets ──────────────────────────────────────────────── */
const titleCaseOps = (s) => (s || '').split(/[_\s]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
export async function listSupport() {
  const tickets = await SupportTicket.find().populate('userId', 'name phone role').sort({ createdAt: -1 }).limit(300);
  return tickets.map((t) => {
    const isVendor = t.userId?.role === 'vendor';
    const senderTag = isVendor ? 'vendor' : 'customer';
    const timeStr = (d) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const messages = [
      { sender: senderTag, text: t.message, time: timeStr(t.createdAt) },
      ...(t.thread || []).map((m) => ({ sender: m.by === 'support' ? 'support' : senderTag, text: m.message, time: timeStr(m.at) })),
    ];
    return {
      id: t.ticketNo || String(t._id),
      _id: String(t._id),
      subject: t.subject,
      type: isVendor ? 'Vendor' : 'Customer',
      name: t.userId?.name || 'Guest',
      phone: t.userId?.phone || '—',
      category: titleCaseOps(t.category),
      priority: 'Medium',
      status: titleCaseOps(t.status),
      createdDate: fmtDate(t.createdAt),
      createdTime: timeStr(t.createdAt),
      slaStatus: t.status === 'open' ? 'SLA: pending' : 'SLA: met',
      slaColor: t.status === 'open' ? 'text-amber-600' : 'text-emerald-600',
      messages,
    };
  });
}

export async function replySupport(actor, ticketId, message, ip) {
  if (!mongoose.isValidObjectId(ticketId)) throw ApiError.badRequest('Invalid ticket id');
  const ticket = await SupportTicket.findById(ticketId);
  if (!ticket) throw ApiError.notFound('Ticket not found');
  ticket.thread = ticket.thread || [];
  ticket.thread.push({ by: 'support', authorId: actor.id, message, at: new Date() });
  if (ticket.status === 'open') ticket.status = 'in_progress';
  await ticket.save();
  await writeAudit(actor, { action: 'support.reply', targetType: 'ticket', targetId: ticketId, ip });
  return { id: ticket.ticketNo || String(ticket._id), status: ticket.status };
}

/* ── Admin control over bookings & orders ─────────────────────────── */

/**
 * Everything Admin needs to answer a question about one booking, in one call:
 * the customer, the pet, the partner who earns it, the real payment state,
 * every refund attempt, the commission split, and the full attributed timeline.
 *
 * Admin previously had a list view and nothing else — no way to open a booking,
 * no way to see why it was cancelled or whether the money actually moved.
 */
export async function getBookingDetail(bookingId) {
  if (!mongoose.isValidObjectId(bookingId)) throw ApiError.badRequest('Invalid booking id');
  const booking = await Booking.findById(bookingId)
    .populate('userId', 'name phone email')
    .populate('providerId', 'name')
    .populate('doctorId', 'name spec clinic');
  if (!booking) throw ApiError.notFound('Booking not found');

  const { Refund } = await import('../payment/refund.model.js');
  const [payment, refunds, ledger, vendor] = await Promise.all([
    booking.paymentId ? Payment.findById(booking.paymentId).lean() : null,
    Refund.find({ refType: 'booking', refId: booking._id }).sort({ createdAt: -1 }).lean(),
    VendorLedgerEntry.find({ refType: 'booking', refId: booking._id }).lean(),
    resolveBookingVendor(booking),
  ]);

  return {
    id: booking.bookingNo,
    _id: String(booking._id),
    type: booking.type,
    status: booking.status,
    statusLabel: titleCase(booking.status),
    customer: {
      id: booking.userId ? String(booking.userId._id || booking.userId) : null,
      name: booking.userId?.name || 'Guest',
      phone: booking.userId?.phone || '—',
      email: booking.userId?.email || '—',
    },
    pet: booking.petSnapshot || null,
    vendor: {
      id: vendor.vendorId ? String(vendor.vendorId) : null,
      name: booking.providerId?.name || booking.doctorId?.name || 'Platform',
      type: vendor.vendorType,
    },
    schedule: booking.schedule,
    visitType: booking.visitType,
    items: booking.items,
    amounts: {
      base: rupees(booking.amounts?.base),
      addons: rupees(booking.amounts?.addons),
      discount: rupees(booking.amounts?.discount),
      tax: rupees(booking.amounts?.tax),
      total: rupees(booking.amounts?.total),
    },
    payment: payment
      ? {
          id: String(payment._id),
          status: payment.status,
          method: payment.method || '—',
          amount: rupees(payment.amount),
          refundedAmount: rupees(payment.refundedAmount),
          refundable: rupees((payment.amount || 0) - (payment.refundedAmount || 0)),
          razorpayPaymentId: payment.razorpayPaymentId || '—',
          webhookVerifiedAt: payment.webhookVerifiedAt,
          failureReason: payment.failureReason,
        }
      : null,
    refundStatus: booking.refundStatus,
    refundedAmount: rupees(booking.refundedAmount),
    refunds: refunds.map((r) => ({
      refundNo: r.refundNo,
      _id: String(r._id),
      amount: rupees(r.amount),
      status: r.status,
      reason: r.reason,
      initiatedBy: r.initiatedBy,
      actorName: r.actorName,
      attempts: r.attempts,
      failureReason: r.failureReason,
      ledgerReversed: r.ledgerReversed,
      createdAt: r.createdAt,
      processedAt: r.processedAt,
    })),
    commission: {
      gross: rupees(ledger.reduce((s, e) => s + (e.gross || 0), 0)),
      platform: rupees(ledger.reduce((s, e) => s + (e.commission || 0), 0)),
      vendorNet: rupees(ledger.reduce((s, e) => s + (e.net || 0), 0)),
      entries: ledger.map((e) => ({
        kind: e.kind || 'earning',
        gross: rupees(e.gross),
        commission: rupees(e.commission),
        net: rupees(e.net),
        rate: e.commissionRate,
        status: e.status,
      })),
    },
    cancelledBy: booking.cancelledBy,
    cancellationReason: booking.cancellationReason,
    cancelledAt: booking.cancelledAt,
    vendorRespondBy: booking.vendorRespondBy,
    vendorRespondedAt: booking.vendorRespondedAt,
    dispute: booking.dispute?.raisedAt ? booking.dispute : null,
    meta: booking.meta,
    timeline: (booking.timeline || []).map((t) => ({
      status: t.status,
      label: titleCase(t.status),
      note: t.note,
      at: t.at,
      by: t.by || 'system',
      byName: t.byName || '',
    })),
    createdAt: booking.createdAt,
  };
}

/** Admin cancels a booking on the customer's or partner's behalf. */
export async function adminCancelBooking(
  actor,
  bookingId,
  { reason, refund = true, onBehalfOf = 'admin', amountPaise = null },
  ip
) {
  if (!mongoose.isValidObjectId(bookingId)) throw ApiError.badRequest('Invalid booking id');
  if (!reason?.trim()) throw ApiError.badRequest('A reason is required to cancel a booking');
  const booking = await Booking.findById(bookingId);
  if (!booking) throw ApiError.notFound('Booking not found');
  const before = { status: booking.status, refundStatus: booking.refundStatus };

  await performBookingCancellation(booking, {
    by: onBehalfOf === 'vendor' ? 'vendor' : 'admin',
    actor,
    reason: reason.trim(),
    refund,
    refundAmountPaise: amountPaise,
    force: true,
  });

  await writeAudit(actor, {
    action: 'booking.cancel',
    targetType: 'booking',
    targetId: bookingId,
    before,
    after: { status: booking.status, refundStatus: booking.refundStatus, reason: reason.trim() },
    ip,
  });
  return getBookingDetail(bookingId);
}

/** Admin refunds a booking without cancelling it (goodwill, partial service). */
export async function adminRefundBooking(actor, bookingId, { amountPaise = null, reason }, ip) {
  if (!mongoose.isValidObjectId(bookingId)) throw ApiError.badRequest('Invalid booking id');
  if (!reason?.trim()) throw ApiError.badRequest('A reason is required to issue a refund');
  const booking = await Booking.findById(bookingId);
  if (!booking) throw ApiError.notFound('Booking not found');

  const refund = await refundBooking(booking, {
    amountPaise,
    reason: reason.trim(),
    initiatedBy: 'admin',
    actor,
  });
  if (!refund) throw ApiError.badRequest('This booking has no settled payment to refund');

  await writeAudit(actor, {
    action: 'booking.refund',
    targetType: 'booking',
    targetId: bookingId,
    // Only a processed refund moved the counter, so a failed attempt must not
    // be logged as though it had.
    before: {
      refundedAmount: rupees(
        refund.status === 'processed' ? (booking.refundedAmount || 0) - refund.amount : booking.refundedAmount || 0
      ),
    },
    after: {
      refundNo: refund.refundNo,
      amount: rupees(refund.amount),
      status: refund.status,
      reason: reason.trim(),
    },
    ip,
  });
  return {
    refund: { refundNo: refund.refundNo, status: refund.status, amount: rupees(refund.amount) },
    booking: await getBookingDetail(bookingId),
  };
}

/**
 * Admin moves a booking to a state it could not reach on its own.
 *
 * Deliberately gated and loudly audited. Operators genuinely need this — a
 * partner who forgot to mark a service complete, a no-show that has to be
 * recorded — but an unlogged status edit is exactly how the three panels drift
 * apart, so every override records the old state, the new state, the reason and
 * whether it broke the normal lifecycle.
 */
export async function adminSetBookingStatus(actor, bookingId, { status, reason, force = false }, ip) {
  if (!mongoose.isValidObjectId(bookingId)) throw ApiError.badRequest('Invalid booking id');
  if (!BOOKING_STATUSES.includes(status)) throw ApiError.badRequest(`Unknown booking status: ${status}`);
  if (!reason?.trim()) throw ApiError.badRequest('A reason is required to change a booking status');

  const booking = await Booking.findById(bookingId);
  if (!booking) throw ApiError.notFound('Booking not found');

  const legal = canTransition(booking.status, status);
  if (!legal && !force) {
    throw ApiError.badRequest(
      `${titleCase(booking.status)} cannot become ${titleCase(status)}. Re-submit with force to override.`
    );
  }

  const before = { status: booking.status };
  booking.status = status;
  pushBookingTimeline(
    booking,
    status,
    `${legal ? 'Status changed' : 'FORCED override'} by admin: ${reason.trim()}`,
    'admin',
    actor
  );
  await booking.save();

  await writeAudit(actor, {
    action: legal ? 'booking.status_change' : 'booking.status_force',
    targetType: 'booking',
    targetId: bookingId,
    before,
    after: { status, reason: reason.trim(), forced: !legal },
    ip,
  });

  await notify(booking.userId, {
    title: 'Booking updated',
    body: `Your booking ${booking.bookingNo} is now ${titleCase(status)}.`,
    type: 'booking',
    link: '/app/profile/bookings',
    data: { bookingId: String(booking._id) },
  }).catch(() => {});

  return getBookingDetail(bookingId);
}

/** Order equivalent of `getBookingDetail`. */
export async function getOrderDetail(orderId) {
  if (!mongoose.isValidObjectId(orderId)) throw ApiError.badRequest('Invalid order id');
  const order = await Order.findById(orderId)
    .populate('userId', 'name phone email')
    .populate('vendorId', 'name');
  if (!order) throw ApiError.notFound('Order not found');

  const { Refund } = await import('../payment/refund.model.js');
  const [payment, refunds, ledger] = await Promise.all([
    order.paymentId ? Payment.findById(order.paymentId).lean() : null,
    Refund.find({ refType: 'order', refId: order._id }).sort({ createdAt: -1 }).lean(),
    VendorLedgerEntry.find({ refType: 'order', refId: order._id }).lean(),
  ]);

  return {
    id: order.orderNo,
    _id: String(order._id),
    status: order.status,
    statusLabel: titleCase(order.status),
    customer: {
      id: order.userId ? String(order.userId._id || order.userId) : null,
      name: order.userId?.name || 'Guest',
      phone: order.userId?.phone || '—',
      email: order.userId?.email || '—',
    },
    vendorName: order.vendorId?.name || 'Platform',
    address: order.addressSnapshot,
    items: order.items,
    amounts: {
      subtotal: rupees(order.amounts?.subtotal),
      tax: rupees(order.amounts?.tax),
      delivery: rupees(order.amounts?.delivery),
      discount: rupees(order.amounts?.discount),
      total: rupees(order.amounts?.total),
    },
    paymentMethod: order.paymentMethod,
    payment: payment
      ? {
          id: String(payment._id),
          status: payment.status,
          method: payment.method || '—',
          amount: rupees(payment.amount),
          refundedAmount: rupees(payment.refundedAmount),
          refundable: rupees((payment.amount || 0) - (payment.refundedAmount || 0)),
          razorpayPaymentId: payment.razorpayPaymentId || '—',
        }
      : null,
    refundStatus: order.refundStatus,
    refundedAmount: rupees(order.refundedAmount),
    refunds: refunds.map((r) => ({
      refundNo: r.refundNo,
      _id: String(r._id),
      amount: rupees(r.amount),
      status: r.status,
      reason: r.reason,
      initiatedBy: r.initiatedBy,
      actorName: r.actorName,
      failureReason: r.failureReason,
      ledgerReversed: r.ledgerReversed,
      createdAt: r.createdAt,
    })),
    commission: {
      gross: rupees(ledger.reduce((s, e) => s + (e.gross || 0), 0)),
      platform: rupees(ledger.reduce((s, e) => s + (e.commission || 0), 0)),
      vendorNet: rupees(ledger.reduce((s, e) => s + (e.net || 0), 0)),
    },
    cancelledBy: order.cancelledBy,
    cancellationReason: order.cancellationReason,
    timeline: (order.timeline || []).map((t) => ({
      status: t.status,
      label: titleCase(t.status),
      note: t.note,
      at: t.at,
      by: t.by || 'system',
      byName: t.byName || '',
    })),
    createdAt: order.createdAt,
  };
}

export async function adminCancelOrder(actor, orderId, { reason, refund = true, amountPaise = null }, ip) {
  if (!mongoose.isValidObjectId(orderId)) throw ApiError.badRequest('Invalid order id');
  if (!reason?.trim()) throw ApiError.badRequest('A reason is required to cancel an order');
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound('Order not found');
  const before = { status: order.status, refundStatus: order.refundStatus };

  await performOrderCancellation(order, {
    by: 'admin',
    actor,
    reason: reason.trim(),
    refund,
    refundAmountPaise: amountPaise,
  });

  await writeAudit(actor, {
    action: 'order.cancel',
    targetType: 'order',
    targetId: orderId,
    before,
    after: { status: order.status, refundStatus: order.refundStatus, reason: reason.trim() },
    ip,
  });
  return getOrderDetail(orderId);
}

export async function adminRefundOrder(actor, orderId, { amountPaise = null, reason }, ip) {
  if (!mongoose.isValidObjectId(orderId)) throw ApiError.badRequest('Invalid order id');
  if (!reason?.trim()) throw ApiError.badRequest('A reason is required to issue a refund');
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound('Order not found');

  const refund = await refundOrder(order, {
    amountPaise,
    reason: reason.trim(),
    initiatedBy: 'admin',
    actor,
  });
  if (!refund) throw ApiError.badRequest('This order has no settled payment to refund');

  await writeAudit(actor, {
    action: 'order.refund',
    targetType: 'order',
    targetId: orderId,
    before: {},
    after: {
      refundNo: refund.refundNo,
      amount: rupees(refund.amount),
      status: refund.status,
      reason: reason.trim(),
    },
    ip,
  });
  return {
    refund: { refundNo: refund.refundNo, status: refund.status, amount: rupees(refund.amount) },
    order: await getOrderDetail(orderId),
  };
}

export async function adminSetOrderStatus(actor, orderId, { status, reason }, ip) {
  if (!mongoose.isValidObjectId(orderId)) throw ApiError.badRequest('Invalid order id');
  if (!ORDER_STATUSES.includes(status)) throw ApiError.badRequest(`Unknown order status: ${status}`);
  if (!reason?.trim()) throw ApiError.badRequest('A reason is required to change an order status');

  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound('Order not found');
  const before = { status: order.status };

  order.status = status;
  pushOrderTimeline(order, status, `Status changed by admin: ${reason.trim()}`, 'admin', actor);
  await order.save();

  await writeAudit(actor, {
    action: 'order.status_change',
    targetType: 'order',
    targetId: orderId,
    before,
    after: { status, reason: reason.trim() },
    ip,
  });

  await notify(order.userId, {
    title: 'Order updated',
    body: `Your order ${order.orderNo} is now ${titleCase(status)}.`,
    type: 'shop',
    link: '/app/profile/orders',
    data: { orderId: String(order._id) },
  }).catch(() => {});

  return getOrderDetail(orderId);
}
