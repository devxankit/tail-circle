/**
 * Create a document whose human reference (`bookingNo`, `orderNo`, …) is
 * generated in a pre-save hook and backed by a unique index.
 *
 * Those generators draw a random value with no collision handling around them,
 * so a clash surfaced as a raw E11000 and lost the customer's booking or order
 * entirely. A retry is all that is needed: `Model.create` rebuilds the document
 * from the payload each time, so the hook draws a fresh reference on every
 * attempt.
 *
 * Only duplicates on `refField` are retried. Any other unique violation is a
 * real conflict the caller has to handle, and swallowing it here would turn a
 * genuine bug into a silent five-attempt loop.
 */
export async function createWithUniqueRef(Model, payload, refField, tries = 5) {
  let lastErr;
  for (let attempt = 0; attempt < tries; attempt += 1) {
    try {
      return await Model.create(payload);
    } catch (err) {
      const isRefClash = err?.code === 11000 && refField in (err.keyPattern || {});
      if (!isRefClash) throw err;
      lastErr = err;
    }
  }
  throw lastErr;
}

export default createWithUniqueRef;
