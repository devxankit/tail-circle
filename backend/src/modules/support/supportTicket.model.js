import mongoose from 'mongoose';

export const TICKET_CATEGORIES = [
  'order',
  'booking',
  'payment',
  'account',
  'pet',
  'other',
];

/**
 * Help & Support tickets. Users create and read their own; admin support
 * staff reply and change status from the admin panel (Phase 11).
 */
const supportTicketSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    ticketNo: { type: String, unique: true },
    subject: { type: String, trim: true, required: true },
    category: { type: String, enum: TICKET_CATEGORIES, default: 'other' },
    message: { type: String, trim: true, required: true },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    replies: [
      {
        by: { type: String, enum: ['user', 'support'], required: true },
        authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        message: { type: String, trim: true, required: true },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Mongoose 9 middleware is promise/sync only — no `next` callback.
supportTicketSchema.pre('save', function assignTicketNo() {
  if (!this.ticketNo) {
    this.ticketNo = `TC-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 90 + 10)}`;
  }
});

export const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);
export default SupportTicket;
