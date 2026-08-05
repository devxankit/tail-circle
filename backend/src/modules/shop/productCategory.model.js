import mongoose from 'mongoose';

/** Shop category chips (Food, Treats, Toys, …). Admin-managed in Phase 11. */
const productCategorySchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true, unique: true },
    petTypes: { type: [String], default: [] }, // empty = all
    image: { type: String, default: '' },
    sort: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const ProductCategory = mongoose.model('ProductCategory', productCategorySchema);
export default ProductCategory;
