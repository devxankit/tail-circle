import { emitToUser } from '../sockets/index.js';
import { SOCKET_EVENTS } from '../sockets/events.js';
import { notify } from './notify.js';
import { logger } from '../utils/logger.js';

/**
 * "New work has arrived" alerts for partner panels.
 *
 * Distinct from `notify()` on purpose. A notification is something a partner
 * reads when they next look; an alert is something that has to interrupt them.
 * A grooming salon has two hours to accept a booking request before it
 * auto-declines and the customer is refunded — a silent row appearing in a list
 * was never going to achieve that.
 *
 * Three channels fire together, each covering where the previous one fails:
 *
 *   1. socket  — rings the open panel, repeatedly, until acknowledged
 *   2. push    — reaches them when the panel is closed (OS handles the sound)
 *   3. in-app  — the durable record, so it is still there tomorrow
 *
 * `notify()` already covers 2 and 3, so this adds the ring on top rather than
 * duplicating them.
 */

/** Alert kinds the partner panel knows how to render and ring for. */
export const VENDOR_ALERT_KINDS = {
  booking_request: {
    title: 'New booking request',
    urgent: true,
    // Keeps ringing — this one expires and costs them a violation if ignored.
    persistent: true,
  },
  booking_confirmed: { title: 'New booking', urgent: true, persistent: true },
  order_new: { title: 'New order', urgent: true, persistent: true },
  booking_cancelled: { title: 'Booking cancelled', urgent: false, persistent: false },
  compliance_warning: { title: 'Service warning', urgent: true, persistent: false },
};

/**
 * Ring a partner about new work.
 *
 * `dedupeKey` lets the panel replace an existing alert rather than stack a
 * second one for the same booking — a reconnecting socket re-delivering an
 * alert must not produce two rings.
 */
export async function alertVendor(
  vendorId,
  { kind, title, body, link, refId = null, refLabel = '', expiresAt = null, data = {}, push = true }
) {
  if (!vendorId) return null;
  const spec = VENDOR_ALERT_KINDS[kind] || { urgent: true, persistent: false };

  const payload = {
    kind,
    title: title || spec.title || 'New activity',
    body: body || '',
    link: link || '/vendor',
    refId: refId ? String(refId) : null,
    refLabel,
    urgent: spec.urgent,
    persistent: spec.persistent,
    expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    dedupeKey: `${kind}:${refId || Date.now()}`,
    at: new Date().toISOString(),
    data,
  };

  try {
    emitToUser(vendorId, SOCKET_EVENTS.VENDOR_WORK_NEW, payload);
  } catch (err) {
    logger.warn(`alertVendor: socket emit failed for ${vendorId}: ${err.message}`);
  }

  // Durable record + FCM push, so a closed panel still finds out.
  if (push) {
    await notify(vendorId, {
      title: payload.title,
      body: payload.body,
      type: kind.startsWith('order') ? 'shop' : 'booking',
      link: payload.link,
      data: { kind, refId: payload.refId || '', ring: String(spec.persistent) },
    }).catch(() => {});
  }

  return payload;
}

/**
 * Stop a ring because the work was dealt with somewhere else — another tab,
 * the partner's phone, or an admin acting for them. Without this a partner who
 * accepts on mobile keeps hearing the desktop ring.
 */
export function resolveVendorAlert(vendorId, kind, refId) {
  if (!vendorId) return;
  try {
    emitToUser(vendorId, SOCKET_EVENTS.VENDOR_WORK_RESOLVED, {
      dedupeKey: `${kind}:${refId}`,
      kind,
      refId: String(refId),
    });
  } catch {
    /* best-effort */
  }
}
