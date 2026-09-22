import { Payment } from '../payment/payment.model.js';
import { Refund } from '../payment/refund.model.js';
import { Booking } from '../booking/booking.model.js';
import { Order } from '../order/order.model.js';
import { VendorLedgerEntry } from '../vendor/vendor.models.js';

/**
 * Daily reconciliation: does the platform's own record of money agree with
 * itself, and with what actually happened at the gateway?
 *
 * This is the one class of problem that is invisible from inside the app. Every
 * screen reads the same database, so if a payment succeeded at Razorpay but the
 * fulfilment never ran, every screen agrees — and every screen is wrong. The
 * customer knows before anyone here does.
 *
 * Read-only by design. It names discrepancies; a human decides what to do,
 * because "fix it automatically" on money is how small problems become big
 * ones.
 */

const rupees = (paise) => Math.round((paise || 0) / 100);

function resolveRange({ from, to } = {}) {
  const end = to ? new Date(`${to}T23:59:59.999Z`) : new Date();
  const start = from ? new Date(from) : new Date(end.getTime() - 7 * 86_400_000);
  return { start, end };
}

export async function reconciliationReport({ from, to } = {}) {
  const { start, end } = resolveRange({ from, to });
  const range = { $gte: start, $lte: end };

  const [totals, issues] = await Promise.all([
    moneyTotals(range),
    findDiscrepancies(range),
  ]);

  return {
    range: { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) },
    totals,
    issues,
    /* The single number to look at: is anything unexplained? */
    clean: Object.values(issues).every((v) => v.count === 0),
  };
}

async function moneyTotals(range) {
  const [paid] = await Payment.aggregate([
    { $match: { status: { $in: ['paid', 'partially_refunded', 'refunded'] }, createdAt: range } },
    {
      $group: {
        _id: null,
        captured: { $sum: '$amount' },
        refunded: { $sum: '$refundedAmount' },
        count: { $sum: 1 },
      },
    },
  ]);

  const [refunds] = await Refund.aggregate([
    { $match: { status: 'processed', createdAt: range } },
    { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);

  const [ledger] = await VendorLedgerEntry.aggregate([
    { $match: { createdAt: range } },
    {
      $group: {
        _id: null,
        gross: { $sum: '$gross' },
        commission: { $sum: '$commission' },
        net: { $sum: '$net' },
      },
    },
  ]);

  const captured = paid?.captured || 0;
  const refundedOnPayment = paid?.refunded || 0;
  const refundedInRegister = refunds?.total || 0;

  return {
    captured: rupees(captured),
    transactions: paid?.count || 0,
    refundedPerPayments: rupees(refundedOnPayment),
    refundedPerRegister: rupees(refundedInRegister),
    /*
     * These two count the same money from opposite ends. A gap means a refund
     * exists on one side and not the other, which is exactly what this report
     * is for.
     */
    refundVariance: rupees(refundedOnPayment - refundedInRegister),
    netCaptured: rupees(captured - refundedOnPayment),
    ledgerGross: rupees(ledger?.gross || 0),
    platformCommission: rupees(ledger?.commission || 0),
    payableToPartners: rupees(ledger?.net || 0),
  };
}

/**
 * The specific rows that do not add up.
 *
 * Each entry names the money involved and enough identifiers to chase it,
 * because "3 discrepancies" without the references is not actionable.
 */
async function findDiscrepancies(range) {
  const [
    paidNotFulfilledBookings,
    paidNotFulfilledOrders,
    refundedNoRegister,
    processedNotReversed,
    failedRefunds,
    unverifiedWebhooks,
    earningsWithoutPayment,
  ] = await Promise.all([
    /*
     * Paid, but the booking never left the pre-payment state. The customer has
     * been charged for something that was never confirmed.
     */
    Booking.find({
      createdAt: range,
      paymentMethod: 'razorpay',
      status: { $in: ['pending_payment', 'payment_failed'] },
      paymentId: { $ne: null },
    })
      .populate({ path: 'paymentId', select: 'status amount razorpayPaymentId' })
      .select('bookingNo amounts status paymentId createdAt')
      .limit(100)
      .lean(),

    Order.find({
      createdAt: range,
      paymentMethod: 'razorpay',
      status: 'pending_payment',
      paymentId: { $ne: null },
    })
      .populate({ path: 'paymentId', select: 'status amount razorpayPaymentId' })
      .select('orderNo amounts status paymentId createdAt')
      .limit(100)
      .lean(),

    /* Payment says money went back; the refund register has no record of it. */
    Payment.find({ createdAt: range, refundedAmount: { $gt: 0 } })
      .select('_id amount refundedAmount status razorpayPaymentId purpose refId')
      .limit(200)
      .lean(),

    /* Customer refunded, partner never clawed back — the platform is out of pocket. */
    Refund.find({ createdAt: range, status: 'processed', ledgerReversed: false })
      .select('refundNo amount label ledgerReversalError createdAt')
      .limit(100)
      .lean(),

    /* Money the customer is still owed. */
    Refund.find({ createdAt: range, status: 'failed' })
      .select('refundNo amount label failureReason attempts createdAt')
      .limit(100)
      .lean(),

    /*
     * Marked paid by the client-side confirm but the webhook never arrived.
     * Usually benign, occasionally the sign of a spoofed confirmation.
     */
    Payment.find({ createdAt: range, status: 'paid', webhookVerifiedAt: null })
      .select('_id amount purpose refId razorpayPaymentId createdAt')
      .limit(100)
      .lean(),

    /* A partner credited for a reference with no captured payment behind it. */
    VendorLedgerEntry.find({ createdAt: range, kind: 'earning' })
      .select('refType refId gross label')
      .limit(500)
      .lean(),
  ]);

  const chargedNotConfirmed = [
    ...paidNotFulfilledBookings
      .filter((b) => b.paymentId?.status === 'paid')
      .map((b) => ({
        kind: 'booking',
        ref: b.bookingNo,
        id: String(b._id),
        amount: rupees(b.paymentId.amount),
        status: b.status,
        gatewayRef: b.paymentId.razorpayPaymentId,
        at: b.createdAt,
      })),
    ...paidNotFulfilledOrders
      .filter((o) => o.paymentId?.status === 'paid')
      .map((o) => ({
        kind: 'order',
        ref: o.orderNo,
        id: String(o._id),
        amount: rupees(o.paymentId.amount),
        status: o.status,
        gatewayRef: o.paymentId.razorpayPaymentId,
        at: o.createdAt,
      })),
  ];

  // Refund register cross-check, per payment.
  const registerByPayment = new Map();
  for (const r of await Refund.find({ status: 'processed' }).select('paymentId amount').lean()) {
    const k = String(r.paymentId);
    registerByPayment.set(k, (registerByPayment.get(k) || 0) + r.amount);
  }
  const refundsUnrecorded = refundedNoRegister
    .map((p) => {
      const inRegister = registerByPayment.get(String(p._id)) || 0;
      return {
        paymentId: String(p._id),
        gatewayRef: p.razorpayPaymentId,
        purpose: p.purpose,
        onPayment: rupees(p.refundedAmount),
        inRegister: rupees(inRegister),
        variance: rupees(p.refundedAmount - inRegister),
      };
    })
    .filter((r) => r.variance !== 0);

  // Ledger entries whose reference has no captured payment.
  const bookingIds = earningsWithoutPayment.filter((e) => e.refType === 'booking').map((e) => e.refId);
  const orderIds = earningsWithoutPayment.filter((e) => e.refType === 'order').map((e) => e.refId);
  const [paidBookings, paidOrders] = await Promise.all([
    Booking.find({ _id: { $in: bookingIds } }).select('_id paymentMethod paymentId status').lean(),
    Order.find({ _id: { $in: orderIds } }).select('_id paymentMethod paymentId status').lean(),
  ]);
  const settled = new Set([
    ...paidBookings
      .filter((b) => b.paymentMethod !== 'razorpay' || b.paymentId)
      .map((b) => String(b._id)),
    ...paidOrders
      .filter((o) => o.paymentMethod !== 'razorpay' || o.paymentId)
      .map((o) => String(o._id)),
  ]);
  const creditedWithoutPayment = earningsWithoutPayment
    .filter((e) => ['booking', 'order'].includes(e.refType) && !settled.has(String(e.refId)))
    .map((e) => ({ label: e.label, refType: e.refType, refId: String(e.refId), amount: rupees(e.gross) }));

  const wrap = (rows, severity, title, why) => ({
    title,
    why,
    severity,
    count: rows.length,
    amount: rows.reduce((s, r) => s + (r.amount || r.variance || 0), 0),
    rows: rows.slice(0, 50),
  });

  return {
    chargedNotConfirmed: wrap(
      chargedNotConfirmed, 'critical',
      'Customer charged but booking/order never confirmed',
      'The gateway took the money and fulfilment never ran. The customer has paid for nothing.'
    ),
    refundsUnrecorded: wrap(
      refundsUnrecorded, 'critical',
      'Refund on the payment with no matching register entry',
      'Money went back but the platform has no record of who authorised it or why.'
    ),
    partnerNotClawedBack: wrap(
      processedNotReversed.map((r) => ({
        ref: r.refundNo, amount: rupees(r.amount), label: r.label,
        error: r.ledgerReversalError, at: r.createdAt,
      })),
      'high',
      'Customer refunded but partner earning not reversed',
      'The platform refunded the customer and is still paying the partner for that sale.'
    ),
    customersStillOwed: wrap(
      failedRefunds.map((r) => ({
        ref: r.refundNo, amount: rupees(r.amount), label: r.label,
        error: r.failureReason, attempts: r.attempts, at: r.createdAt,
      })),
      'critical',
      'Refunds that failed at the gateway',
      'These customers were told they would be repaid and have not been.'
    ),
    unverifiedPayments: wrap(
      unverifiedWebhooks.map((p) => ({
        paymentId: String(p._id), gatewayRef: p.razorpayPaymentId,
        purpose: p.purpose, amount: rupees(p.amount), at: p.createdAt,
      })),
      'medium',
      'Marked paid without a verified webhook',
      'Confirmed by the browser but never corroborated by the gateway. Usually a delayed webhook; occasionally worth checking.'
    ),
    creditedWithoutPayment: wrap(
      creditedWithoutPayment, 'high',
      'Partner credited with no payment behind it',
      'A ledger entry exists for a reference that was never paid for.'
    ),
  };
}
