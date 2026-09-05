/**
 * "Now go and meet" destinations for a pair of matched pets.
 *
 * Shared by the match celebration modal and the intro card that lands in the
 * chat, so the two surfaces offer the same next steps and route to the same
 * places.
 *
 * Both land on a listing, not on a particular vendor or event. Picking the
 * salon or the event is the owners' decision to make together — pre-selecting
 * one for them is both presumptuous and fragile: it made the copy promise a
 * specific booking, and it meant a stale or mis-resolved id could drop someone
 * onto a booking sheet for something that no longer exists.
 */

/** Grooming salons, searchable and sorted by distance. */
export const GROOMING_LIST_ROUTE = '/app/services/grooming';

/** Ticketed events with the category rails. */
export const EVENTS_LIST_ROUTE = '/app/events';

export function goToGrooming(navigate) {
  navigate(GROOMING_LIST_ROUTE);
}

export function goToEvents(navigate) {
  navigate(EVENTS_LIST_ROUTE);
}
