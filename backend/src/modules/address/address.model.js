import mongoose from 'mongoose';

/**
 * Saved delivery/service addresses. Exactly one per user may be default;
 * switching is done with an ordered two-step update in the service layer.
 * Snapshots (orders/bookings) copy the fields — they never reference this
 * document, so later edits don't rewrite history.
 */
const addressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    label: { type: String, enum: ['home', 'work', 'other'], default: 'home' },
    fullName: { type: String, trim: true, required: true },
    phone: { type: String, trim: true, required: true },
    line1: { type: String, trim: true, required: true },
    line2: { type: String, trim: true, default: '' },
    landmark: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, required: true },
    state: { type: String, trim: true, required: true },
    pincode: { type: String, trim: true, required: true },
    isDefault: { type: Boolean, default: false },
    location: {
      type: { type: String, enum: ['Point'], default: undefined },
      coordinates: { type: [Number], default: undefined }, // [lng, lat]
    },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

addressSchema.index({ location: '2dsphere' }, { sparse: true });

export const Address = mongoose.model('Address', addressSchema);
export default Address;
