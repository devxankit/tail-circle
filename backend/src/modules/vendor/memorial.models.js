import mongoose from 'mongoose';

/**
 * Memorial (end-of-life) provider entities. All hard-scoped by `vendorId`.
 * MemorialRequest is the pipeline the portal works: it may originate from a
 * customer booking or be a vendor-entered walk-in; it carries scheduling,
 * team assignment, proofs, and payment/amount for settlement.
 */
const memorialServiceSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, default: 'Burial' },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 }, // rupees
    duration: { type: String, default: '' },
    distance: { type: String, default: '' },
    staff: { type: Number, default: 1 },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  },
  { timestamps: true }
);
export const MemorialService = mongoose.model('MemorialService', memorialServiceSchema);

const memorialAddonSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 }, // rupees
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    image: { type: String, default: null },
  },
  { timestamps: true }
);
export const MemorialAddon = mongoose.model('MemorialAddon', memorialAddonSchema);

const teamMemberSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, default: 'Field Staff' },
    phone: { type: String, default: '' },
    status: { type: String, enum: ['Available', 'Assigned', 'On Route', 'Busy', 'Offline'], default: 'Available' },
    location: { type: String, default: 'Office' },
    image: { type: String, default: '' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);
export const TeamMember = mongoose.model('TeamMember', teamMemberSchema);

export const MEMORIAL_REQUEST_STATUSES = ['Pending', 'Accepted', 'Assigned', 'In Progress', 'Completed', 'Cancelled'];

const memorialRequestSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdByVendor: { type: Boolean, default: false }, // walk-in
    customerName: { type: String, default: '' },
    petName: { type: String, default: '' },
    serviceType: { type: String, default: '' },
    location: { type: String, default: '' },
    preferredDate: { type: String, default: '' }, // YYYY-MM-DD
    preferredTime: { type: String, default: '' },
    urgency: { type: String, enum: ['Normal', 'Priority', 'Urgent'], default: 'Normal' },
    paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Refunded'], default: 'Pending' },
    status: { type: String, enum: MEMORIAL_REQUEST_STATUSES, default: 'Pending', index: true },
    notes: { type: String, default: '' },
    addons: { type: [String], default: [] },
    assignedTeamId: { type: mongoose.Schema.Types.ObjectId, ref: 'TeamMember', default: null },
    assignedTeam: { type: String, default: null }, // display name
    amount: { type: Number, default: 0 }, // paise (for settlement)
    proofs: [{ _id: false, url: { type: String }, note: { type: String, default: '' } }],
  },
  { timestamps: true }
);
memorialRequestSchema.index({ vendorId: 1, createdAt: -1 });
export const MemorialRequest = mongoose.model('MemorialRequest', memorialRequestSchema);
