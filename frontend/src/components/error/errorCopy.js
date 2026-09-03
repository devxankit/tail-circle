/**
 * One place that decides what a failure is called and how it is explained.
 *
 * Every error surface (the boundary, the 404 page, the inline state) reads its
 * wording from here, so a 500 is described the same way whether it blew up a
 * whole screen or just one list. Copy is written for a pet owner, not an
 * engineer: what happened, and what they can do next.
 */

const CHUNK_MESSAGE =
  /loading chunk|loading css chunk|dynamically imported module|importing a module script failed|failed to fetch dynamically/i;

/**
 * A stale tab asking for a bundle that no longer exists after a redeploy.
 * Recoverable by reloading, and worth saying so — "try again" alone never
 * fixes it, because the old chunk URL is gone for good.
 */
export function isChunkLoadError(error) {
  if (!error) return false;
  if (error.name === 'ChunkLoadError') return true;
  return CHUNK_MESSAGE.test(String(error.message ?? ''));
}

/** Short, quotable id so support can tie a report back to a console log. */
export function makeReference() {
  return `TC-${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Map anything throwable to a variant + wording.
 * `status` comes from ApiClientError; a thrown render error has none.
 */
export function classifyError(error) {
  if (isChunkLoadError(error)) {
    return {
      kind: 'update',
      variant: 'crash',
      title: 'A fresh version is ready',
      message: 'TailCircle updated while this tab was open. Reload to pick up the new version.',
      primary: 'Reload',
    };
  }

  const status = typeof error?.status === 'number' ? error.status : null;

  if (status === 0) {
    return {
      kind: 'offline',
      variant: 'offline',
      title: "Can't reach TailCircle",
      message: 'Your device looks offline. Check your connection and try again.',
      primary: 'Try again',
    };
  }

  if (status !== null && status >= 500) {
    return {
      kind: 'server',
      variant: 'offline',
      title: 'Our end is having a moment',
      message: "This one is on us, not you. We're on it — give it a few seconds and try again.",
      primary: 'Try again',
    };
  }

  if (status === 404) {
    return {
      kind: 'missing',
      variant: 'notFound',
      title: 'That went missing',
      message: "We couldn't find what you were looking for. It may have been removed.",
      primary: 'Go back',
    };
  }

  if (status === 401 || status === 403) {
    return {
      kind: 'auth',
      variant: 'notFound',
      title: 'You need to sign in',
      message: 'Your session ended. Sign in again to pick up where you left off.',
      primary: 'Sign in',
    };
  }

  if (status === 429) {
    return {
      kind: 'rate',
      variant: 'offline',
      title: 'Slow down a moment',
      message: 'That was a lot of requests at once. Wait a few seconds before trying again.',
      primary: 'Try again',
    };
  }

  return {
    kind: 'crash',
    variant: 'crash',
    title: 'Something came undone',
    message: "This screen ran into a snag. Nothing you did caused it — let's try that again.",
    primary: 'Try again',
  };
}
