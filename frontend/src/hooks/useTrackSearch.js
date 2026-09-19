import { useEffect, useRef } from 'react';
import { trackSearch } from '../services/analytics';

/**
 * Report a search once the customer has stopped typing.
 *
 * Debounced hard, because these screens filter as you type: without it
 * "grooming" would be recorded as eight separate searches — g, gr, gro … —
 * and the "what are customers looking for" report would be a list of
 * meaningless prefixes.
 *
 * The result count rides along, which is the half that makes the report
 * actionable: a popular search returning nothing is demand the catalogue is
 * not serving, and that is invisible from the query alone.
 *
 * Does nothing until the visitor has accepted analytics cookies.
 */
export function useTrackSearch(query, resultCount, { delay = 1200, minLength = 2 } = {}) {
  const lastSent = useRef('');

  useEffect(() => {
    const text = String(query || '').trim();
    if (text.length < minLength) return undefined;
    // A query already reported is not re-sent when only the result count
    // settles, which happens on every refetch.
    if (text.toLowerCase() === lastSent.current) return undefined;

    const t = setTimeout(() => {
      lastSent.current = text.toLowerCase();
      trackSearch(text, typeof resultCount === 'number' ? resultCount : undefined);
    }, delay);

    return () => clearTimeout(t);
  }, [query, resultCount, delay, minLength]);
}

export default useTrackSearch;
