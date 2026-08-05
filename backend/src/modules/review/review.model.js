import mongoose from 'mongoose';

export const REVIEW_TARGETS = ['product', 'provider', 'doctor', 'event'];

/**
 * Shared review model — products now, service providers in Phase 4.
 * One review per user per target; aggregates are cached on the target doc.
 */
const reviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetType: { type: String, enum: REVIEW_TARGETS, required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, trim: true, maxlength: 2000, default: '' },
    images: { type: [String], default: [] },
    verifiedPurchase: { type: Boolean, default: false },
    status: { type: String, enum: ['visible', 'hidden'], default: 'visible' },
    vendorReply: {
      text: { type: String, trim: true, maxlength: 1000, default: '' },
      repliedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

reviewSchema.index({ targetType: 1, targetId: 1, status: 1, createdAt: -1 });
reviewSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });

export const Review = mongoose.model('Review', reviewSchema);
export default Review;
