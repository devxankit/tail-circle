import mongoose from 'mongoose';

/**
 * Events-organizer-owned entities that have no counterpart in the customer
 * app: custom-event packages, à-la-carte add-ons, inbound custom-event
 * requests, and a media gallery. All hard-scoped by `vendorId`.
 */
const eventPackageSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 }, // rupees
    duration: { type: String, default: '' },
    maxPets: { type: Number, default: 1 },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  },
  { timestamps: true }
);
export const EventPackage = mongoose.model('EventPackage', eventPackageSchema);

const eventAddonSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 }, // rupees
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  },
  { timestamps: true }
);
export const EventAddon = mongoose.model('EventAddon', eventAddonSchema);

export const REQUEST_STATUSES = ['New', 'Quotation Sent', 'Accepted', 'Declined', 'Closed'];

const customerRequestSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    customer: { type: String, default: '' },
    pet: { type: String, default: '' },
    type: { type: String, default: 'Custom' },
    date: { type: String, default: '' },
    budget: { type: String, default: '' },
    message: { type: String, default: '' },
    vendorNote: { type: String, default: '' },
    status: { type: String, enum: REQUEST_STATUSES, default: 'New', index: true },
  },
  { timestamps: true }
);
export const CustomerRequest = mongoose.model('CustomerRequest', customerRequestSchema);

const eventGalleryItemSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    url: { type: String, required: true },
    caption: { type: String, default: '' },
  },
  { timestamps: true }
);
export const EventGalleryItem = mongoose.model('EventGalleryItem', eventGalleryItemSchema);
