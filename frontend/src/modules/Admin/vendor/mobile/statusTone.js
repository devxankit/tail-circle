/**
 * One status → tone map for every partner module (see StatusBadge).
 *
 * Tones are semantic, never Tailwind's red/green/amber palettes: `index.css`
 * remaps those (red → coral, green → teal), so `bg-red-500` would not read as
 * red. `success` / `warning` / `error` are the real colours.
 */
const STATUS_TONE = {
  // done / good
  completed: 'success', complete: 'success', delivered: 'success', paid: 'success', settled: 'success',
  verified: 'success', approved: 'success', active: 'success', published: 'success', resolved: 'success',
  attended: 'success', checked_in: 'success', admitted: 'success', success: 'success', in_stock: 'success',
  live: 'success', available: 'success', replied: 'success', online: 'success', adopted: 'success',
  verified_premium: 'success', credited: 'success', credit: 'success', healthy: 'success', good_standing: 'success',
  // booked / moving
  confirmed: 'info', accepted: 'info', assigned: 'info', scheduled: 'info', upcoming: 'info',
  out_for_delivery: 'info', shipped: 'info', processing: 'info', preparing: 'info', ready: 'info',
  packed: 'info', dispatched: 'info', in_transit: 'info', open: 'info', booked: 'info', fully_booked: 'info',
  interview: 'info', home_visit: 'info', meet_scheduled: 'info', reviewed: 'info', sent: 'info',
  // in hand
  in_progress: 'primary', ongoing: 'primary', started: 'primary', cooking: 'primary', en_route: 'primary',
  // waiting on someone
  pending: 'warning', pending_payment: 'warning', pending_overage: 'warning', new: 'warning', awaiting: 'warning',
  in_review: 'warning', under_review: 'warning', requested: 'warning', low_stock: 'warning', paused: 'warning',
  draft: 'warning', on_hold: 'warning', hold: 'warning', due: 'warning', submitted: 'warning', trial: 'warning',
  warning: 'warning', review: 'warning', unpaid: 'warning', initiated: 'warning', queued: 'warning',
  // stopped / failed
  cancelled: 'error', canceled: 'error', declined: 'error', rejected: 'error', failed: 'error', expired: 'error',
  no_show: 'error', out_of_stock: 'error', suspended: 'error', overdue: 'error', blocked: 'error', urgent: 'error',
  critical: 'error', emergency: 'error', debit: 'error', breached: 'error', missed: 'error',
  // everything else
  inactive: 'neutral', refunded: 'neutral', closed: 'neutral', archived: 'neutral', offline: 'neutral',
  forgiven: 'neutral', upheld: 'neutral', unlisted: 'neutral', hidden: 'neutral',
};

const keyOf = (status) => String(status || '').trim().toLowerCase().replace(/[\s-]+/g, '_');

/** The tone for a raw status string — for places that colour more than a badge. */
export function statusTone(status) {
  return STATUS_TONE[keyOf(status)] || 'neutral';
}

export default statusTone;
