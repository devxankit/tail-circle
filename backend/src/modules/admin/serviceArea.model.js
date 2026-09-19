import mongoose from 'mongoose';

/**
 * Where Tail Circle operates.
 *
 * The platform had no concept of a service area at all — the only geography
 * anywhere was a free-text `city` on a delivery address, typed by the customer.
 * So there was no way to answer "do we serve this pincode?", no way to stop a
 * customer booking into an area with no partners, and no way to plan a city
 * launch as anything other than a spreadsheet somewhere else.
 *
 * Deliberately pincode-based rather than radius-based: Indian addresses are
 * identified by pincode far more reliably than by geocoded coordinates, and a
 * pincode list is something an operations person can actually maintain.
 */

const serviceAreaSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // "Bandra West"
    city: { type: String, required: true, trim: true, index: true },
    state: { type: String, default: '', trim: true },

    /*
     * Pincodes this area covers. Stored as strings, not numbers: Indian
     * pincodes are fixed six-digit tokens and a leading zero must survive.
     */
    pincodes: [{ type: String, trim: true }],

    /**
     * Which verticals are live here.
     *
     * A city is rarely launched all at once — grooming might be running while
     * daycare is still signing partners. Empty means every vertical.
     */
    verticals: [{ type: String }],

    /*
     * `active: false` closes the area to new bookings without deleting it, so
     * a pause for a festival or a supply gap does not lose the pincode list.
     */
    active: { type: Boolean, default: true, index: true },
    launchedAt: { type: Date, default: null },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

/* One area per name per city. */
serviceAreaSchema.index({ city: 1, name: 1 }, { unique: true });
/* Serviceability lookups hit this on every check. */
serviceAreaSchema.index({ pincodes: 1, active: 1 });

export const ServiceArea = mongoose.model('ServiceArea', serviceAreaSchema);
export default ServiceArea;
