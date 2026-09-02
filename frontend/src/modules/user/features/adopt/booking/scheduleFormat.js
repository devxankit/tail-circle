/*
 * Rendering for the appointment slots a shelter sets on an adoption
 * application (`homeCheck.scheduledAt`, `meet.scheduledAt`).
 *
 * `scheduledAt` is optional on both steps -- a shelter can advance an
 * application without committing to a time -- so every caller has to cope
 * with it being absent. Saying so plainly beats inventing a date.
 */

const DATE_OPTS = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
const TIME_OPTS = { hour: 'numeric', minute: '2-digit', hour12: true };

function parse(scheduledAt) {
  if (!scheduledAt) return null;
  const d = new Date(scheduledAt);
  return Number.isNaN(d.getTime()) ? null : d;
}

function slot(scheduledAt, isLoading, pendingText) {
  if (isLoading) return { date: 'Loading...', time: 'Loading...', isScheduled: false };
  const d = parse(scheduledAt);
  if (!d) return { date: pendingText, time: pendingText, isScheduled: false };
  return {
    date: d.toLocaleDateString(undefined, DATE_OPTS),
    time: d.toLocaleTimeString(undefined, TIME_OPTS),
    isScheduled: true,
  };
}

/** Meet & greet slot, or a "not booked yet" placeholder. */
export function formatMeetSlot(scheduledAt, isLoading) {
  return slot(scheduledAt, isLoading, 'To be confirmed by the shelter');
}

/** Home check slot, or a "not booked yet" placeholder. */
export function formatHomeCheckSlot(scheduledAt, isLoading) {
  return slot(scheduledAt, isLoading, 'To be scheduled');
}
