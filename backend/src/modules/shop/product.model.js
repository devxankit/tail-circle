import mongoose from 'mongoose';

/**
 * Shop product. Field names mirror the frontend's `shopData.js` verbatim so
 * seeded products render pixel-identical. `legacyId` is the mock's numeric id
 * — breed recommendations and old cart entries reference it.
 *
 * Display prices (`price`, `mrp`, packSizes) are RUPEES exactly as the UI
 * shows them; orders/payments convert to integer paise at checkout.
 */
const packSizeSchema = new mongoose.Schema(
  {
    size: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    mrp: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0 },
    sku: { type: String, default: '' },
    stock: { type: Number, default: 100, min: 0 },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    legacyId: { type: Number, unique: true, sparse: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null = platform
    brand: { type: String, trim: true, default: '' },
    name: { type: String, trim: true, required: true },
    slug: { type: String, trim: true, unique: true },
    description: { type: String, trim: true, default: '' },
    category: { type: String, trim: true, required: true, index: true }, // Food | Treats | …
    subCategory: { type: String, trim: true, default: '' },
    petType: { type: String, trim: true, required: true, index: true }, // Dog | Cat | Bird | Small Pet
    price: { type: Number, required: true, min: 0 }, // rupees (first pack size)
    mrp: { type: Number, required: true, min: 0 },
    img: { type: String, default: '' },
    images: { type: [String], default: [] },
    overviewImage: { type: String, default: '' },
    variants: { type: [{ name: String, img: String }], default: [] },
    packSizes: { type: [packSizeSchema], default: [] },
    badge: { type: String, default: null },
    badgeColor: { type: String, default: null },
    tag: { type: String, default: null },
    dietType: { type: String, default: null },
    lifeStage: { type: String, default: null },
    productType: { type: String, default: null },
    specialDiet: { type: String, default: null },
    proteinSource: { type: String, default: null },
    weight: { type: String, default: null },
    discountRange: { type: Number, default: 0 },
    isNewArrival: { type: Boolean, default: false },
    isBestseller: { type: Boolean, default: false },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
    ratingBreakdown: { type: [Number], default: [0, 0, 0, 0, 0] }, // % 5★→1★
    active: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', brand: 'text', description: 'text' });
productSchema.index({ petType: 1, category: 1, active: 1 });

export const Product = mongoose.model('Product', productSchema);
export default Product;
