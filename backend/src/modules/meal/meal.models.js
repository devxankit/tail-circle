import mongoose from 'mongoose';

/**
 * Meals domain. The UI is a PREPAID model: buy a package → meal credits →
 * order recipes daily from the menu (credits or à la carte). Display fields
 * mirror `mealData.js` verbatim.
 */

const mealPlanSchema = new mongoose.Schema(
  {
    legacyId: { type: String, unique: true, sparse: true }, // starter | popular | best_value
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null }, // vendor-removed plans
    name: { type: String, required: true },
    mealsCount: { type: String, default: '' }, // "10 meals / month"
    pricePerMonth: { type: Number, required: true }, // rupees
    pricePerMeal: { type: Number, default: 0 },
    mealsPerWeek: { type: Number, required: true }, // credits granted (mock naming)
    features: { type: [String], default: [] },
    badge: { type: String, default: null },
    saveText: { type: String, default: null },
    bgColor: { type: String, default: null },
    borderColor: { type: String, default: null },
    textColor: { type: String, default: null },
    buttonBg: { type: String, default: null },
    img: { type: String, default: '' },
    active: { type: Boolean, default: true },
    sort: { type: Number, default: 0 },
    // Vendor-authored nutrition attributes (petType, mealType, qty, calories,
    // protein, duration) surfaced in the Meal Provider portal.
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);
export const MealPlan = mongoose.model('MealPlan', mealPlanSchema);

const mealSchema = new mongoose.Schema(
  {
    legacyId: { type: String, unique: true }, // d1..d7, c1..c3
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    protein: { type: String, default: '' },
    tag: { type: String, default: null },
    features: { type: [String], default: [] },
    img: { type: String, default: '' },
    category: { type: String, default: 'Dog', index: true }, // Dog | Cat
    price: { type: Number, required: true }, // rupees
    rating: { type: Number, default: 0 },
    reviews: { type: Number, default: 0 },
    filterTags: { type: [String], default: [] },
    allergens: { type: [String], default: [] },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);
export const Meal = mongoose.model('Meal', mealSchema);

/** One per user: credit balance, trial flag, allergies, pause state. */
const mealAccountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    balance: { type: Number, default: 0, min: 0 }, // meal credits
    freeTrialClaimed: { type: Boolean, default: false },
    allergies: { type: [String], default: [] },
    activePlanLegacyId: { type: String, default: null },
    status: { type: String, enum: ['none', 'active', 'paused'], default: 'none' },
    pause: {
      from: { type: String, default: null }, // YYYY-MM-DD
      till: { type: String, default: null },
      reason: { type: String, default: null },
    },
  },
  { timestamps: true }
);
export const MealAccount = mongoose.model('MealAccount', mealAccountSchema);

export const MEAL_ORDER_TYPES = ['package', 'prepaid', 'a_la_carte', 'trial'];

const mealOrderSchema = new mongoose.Schema(
  {
    orderNo: { type: String, unique: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    type: { type: String, enum: MEAL_ORDER_TYPES, required: true },
    items: [
      {
        _id: false,
        mealId: { type: String, default: null }, // meal legacyId
        name: { type: String, required: true },
        quantity: { type: Number, default: 1 },
        price: { type: Number, default: 0 }, // rupees (0 for prepaid lines)
      },
    ],
    total: { type: Number, default: 0 }, // paise
    mealsAdded: { type: Number, default: 0 }, // package purchases
    mealsUsed: { type: Number, default: 0 }, // prepaid orders
    status: {
      type: String,
      enum: ['pending_payment', 'Active', 'Paused', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'],
      default: 'Preparing',
    },
    deliveryTime: { type: String, default: '' },
    contact: { type: Object, default: null }, // trial form
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
  },
  { timestamps: true }
);
mealOrderSchema.pre('save', function assignOrderNo() {
  if (!this.orderNo) {
    const prefix = this.type === 'package' ? 'ord_pkg_' : this.type === 'prepaid' ? 'ord_prepaid_' : 'ord_';
    this.orderNo = prefix + Math.random().toString(36).slice(2, 8);
  }
});
export const MealOrder = mongoose.model('MealOrder', mealOrderSchema);
