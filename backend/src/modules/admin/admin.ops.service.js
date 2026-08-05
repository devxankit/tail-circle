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

/* ── Orders (cross-vendor) ────────────────────────────────────────── */
export async function listOrders() {
  const orders = await Order.find().populate('userId', 'name').populate('vendorId', 'name').sort({ createdAt: -1 }).limit(300);
  return orders.map((o) => {
    const total = rupees(o.amounts?.total);
    return {
      id: o.orderNo || String(o._id),
      _id: String(o._id),
      customerName: o.userId?.name || 'Guest',
      petName: '🐾',
      city: o.addressSnapshot?.city || '—',
      vendorName: o.vendorId?.name || 'Platform',
      vendorId: o.vendorId ? String(o.vendorId._id || o.vendorId) : '—',
      itemsCount: o.items?.length || 0,
      previewItem: o.items?.[0]?.name || '—',
      amount: total.toLocaleString('en-IN'),
      commission: Math.round(total * 0.12).toLocaleString('en-IN'),
      paymentMethod: o.paymentMethod === 'cod' ? 'COD' : 'UPI',
      paymentId: o.paymentId ? String(o.paymentId) : '—',
      paymentStatus: o.paymentMethod === 'cod' ? 'Pending' : 'Paid',
      orderDate: fmtDate(o.createdAt),
      timeAgo: timeAgoStr(o.createdAt),
      status: titleCase(o.status),
      courier: '—',
      eta: '—',
      itemsList: (o.items || []).map((it) => ({ name: it.name, qty: it.qty, price: it.unitPrice })),
    };
  });
}

/* ── Bookings (daycare/grooming/event/memorial) ───────────────────── */
const SERVICE_LABEL = { daycare: 'Day Care', grooming: 'Grooming', event: 'Event', memorial: 'Memorial' };
const PAY_LABEL = { razorpay: 'UPI', pay_later: 'Pay Later', free: 'Free' };
export async function listBookings() {
  const bookings = await Booking.find({ type: { $in: ['daycare', 'grooming', 'event', 'memorial'] } })
    .populate('userId', 'name')
    .populate('providerId', 'name')
    .sort({ createdAt: -1 })
    .limit(300);
  return bookings.map((b) => {
    const total = rupees(b.amounts?.total);
    return {
      id: b.bookingNo || String(b._id),
      _id: String(b._id),
      customerName: b.userId?.name || 'Guest',
      petInfo: b.petSnapshot?.name ? `${b.petSnapshot.name}${b.petSnapshot.breed ? ` (${b.petSnapshot.breed})` : ''}` : '—',
      city: b.addressSnapshot?.city || '—',
      serviceType: SERVICE_LABEL[b.type] || b.type,
      vendorName: b.providerId?.name || 'Platform',
      vendorRating: '—',
      date: b.schedule?.startDate || fmtDate(b.createdAt),
      slot: b.schedule?.time || '—',
      duration: b.schedule?.durationDays ? `${b.schedule.durationDays} days` : '—',
      addons: (b.items || []).filter((it) => it.kind === 'addon').map((it) => it.name),
      amount: total.toLocaleString('en-IN'),
      commission: Math.round(total * 0.12).toLocaleString('en-IN'),
      paymentMethod: PAY_LABEL[b.paymentMethod] || b.paymentMethod,
      paymentStatus: b.paymentId ? 'Paid' : 'Pending',
      status: titleCase(b.status),
    };
  });
}

/* ── Appointments (doctor bookings, cross-clinic) ─────────────────── */
export async function listAppointments() {
  const appts = await Booking.find({ type: 'doctor' })
    .populate('userId', 'name')
    .populate('doctorId', 'name spec clinic')
    .sort({ createdAt: -1 })
    .limit(300);
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
      commission: Math.round(fee * 0.12).toLocaleString('en-IN'),
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

export async function resolveReturn(actor, orderId, action, ip) {
  if (!mongoose.isValidObjectId(orderId)) throw ApiError.badRequest('Invalid order id');
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound('Order not found');
  const before = { status: order.status };
  order.status = action === 'approve' ? 'refunded' : 'delivered';
  order.timeline.push({ status: order.status, at: new Date(), note: `Return ${action}d by admin` });
  await order.save();
  await writeAudit(actor, { action: `return.${action}`, targetType: 'order', targetId: orderId, before, after: { status: order.status }, ip });
  return { id: order.orderNo || String(order._id), status: order.status };
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
