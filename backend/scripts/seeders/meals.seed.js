import { MealPlan, Meal } from '../../src/modules/meal/meal.models.js';

/**
 * Canonical holder of the meals mock data — `mealData.js` was deleted after
 * the UI moved to the API, so the raw records live here verbatim.
 */
const subscriptionPlans = [
  { id: 'starter', name: 'Starter Plan', mealsCount: '10 meals / month', pricePerMonth: 2490, pricePerMeal: 249, mealsPerWeek: 10, features: ['Flexible scheduling', 'Skip or pause anytime', 'Chef-cooked daily', 'Human grade ingredients'], badge: 'TRIAL FRIENDLY', saveText: 'SAVE 10%', bgColor: '#FFFFFF', borderColor: '#16796B', textColor: '#063b34', buttonBg: '#16796B', img: '/media/bowl_teal.png' },
  { id: 'popular', name: 'Popular Plan', mealsCount: '20 meals / month', pricePerMonth: 4580, pricePerMeal: 229, mealsPerWeek: 20, features: ['Everything in Starter', 'Priority delivery', 'Free health report (monthly)', 'Dietitian support'], badge: '★ MOST POPULAR', saveText: 'SAVE 15%', bgColor: '#FFF5F1', borderColor: '#FF8A65', textColor: '#FF6D41', buttonBg: '#FF8A65', img: '/media/bowl_orange.png' },
  { id: 'best_value', name: 'Best Value Plan', mealsCount: '30 meals / month', pricePerMonth: 6270, pricePerMeal: 209, mealsPerWeek: 30, features: ['Everything in Popular', 'Dedicated nutritionist', 'Free vet check-ups (2x / year)', 'Exclusive offers & rewards'], badge: 'BEST VALUE', saveText: 'SAVE 20%', bgColor: '#FFFFFF', borderColor: '#8B5CF6', textColor: '#7C3AED', buttonBg: '#8B5CF6', img: '/media/bowl_purple.png' },
];

const availableMeals = [
  { id: 'd1', name: 'Chicken & Brown Rice', description: 'Shredded chicken breast with brown rice, carrots, and essential vitamins.', protein: 'High Protein', tag: 'Bestseller', features: ['High Protein', 'Energy Booster'], img: '/media/meal_chicken.png', category: 'Dog', price: 189, rating: 4.9, reviews: 128, filterTags: ['All Recipes', 'High Protein'] },
  { id: 'd2', name: 'Savory Beef & Sweet Potato', description: 'Ground beef with sweet potato and green beans. Great for energy.', protein: 'High Protein', tag: 'Grain-Free', features: ['High Protein', 'Muscle Support'], img: '/media/meal_beef.png', category: 'Dog', price: 219, rating: 4.8, reviews: 96, filterTags: ['All Recipes', 'High Protein'] },
  { id: 'd3', name: 'Turkey & Pumpkin Veggie', description: 'Lean turkey mince with pumpkin and peas. Easy to digest.', protein: 'Lean Protein', tag: 'Sensitive Stomach', features: ['Lean Protein', 'Gut Friendly'], img: '/media/meal_turkey.png', category: 'Dog', price: 199, rating: 4.9, reviews: 112, filterTags: ['All Recipes', 'Sensitive Stomach'] },
  { id: 'd4', name: 'Lamb & Rice', description: 'Tender grass-fed lamb cooked with white rice and fresh peas.', protein: 'Hypoallergenic', tag: 'Easy Digest', features: ['Hypoallergenic', 'Easy Digest'], img: '/media/meal_beef.png', category: 'Dog', price: 209, rating: 4.8, reviews: 74, filterTags: ['All Recipes', 'Sensitive Stomach'] },
  { id: 'd5', name: 'Salmon & Veggies', description: 'Fresh salmon fillets with diced sweet potatoes and green beans.', protein: 'Omega-3 Rich', tag: 'Skin & Coat', features: ['Omega 3 Rich', 'Skin & Coat'], img: '/media/meal_salmon.png', category: 'Dog', price: 229, rating: 4.9, reviews: 98, filterTags: ['All Recipes', 'High Protein'] },
  { id: 'd6', name: 'Duck & Potato', description: 'Lean duck meat combined with fresh potatoes for weight balance.', protein: 'Novel Protein', tag: 'Weight Support', features: ['Novel Protein', 'Weight Support'], img: '/media/meal_turkey.png', category: 'Dog', price: 239, rating: 4.7, reviews: 63, filterTags: ['All Recipes', 'Weight Management'] },
  { id: 'd7', name: 'Chicken Liver Mix', description: 'Nutrient-rich chicken liver mixed with brown rice and leafy greens.', protein: 'Iron Rich', tag: 'Immunity Boost', features: ['Iron Rich', 'Immunity Boost'], img: '/media/meal_chicken.png', category: 'Dog', price: 179, rating: 4.8, reviews: 54, filterTags: ['All Recipes', 'High Protein'] },
  { id: 'c1', name: 'Salmon & Quinoa Medley', description: 'Flaked fresh salmon with quinoa and spinach. Excellent for skin & coat.', protein: 'Omega-3 Rich', tag: 'Skin & Coat', features: ['Omega 3 Rich', 'Skin & Coat'], img: '/media/meal_salmon.png', category: 'Cat', price: 229, rating: 4.9, reviews: 88, filterTags: ['All Recipes', 'High Protein'] },
  { id: 'c2', name: 'Tuna & Sweet Potato', description: 'Shredded tuna loin with sweet potato mash, highly palatable for picky cats.', protein: 'Palatable Protein', tag: 'Bestseller', features: ['Palatable Protein', 'Human Grade'], img: '/media/meal_salmon.png', category: 'Cat', price: 209, rating: 4.8, reviews: 92, filterTags: ['All Recipes', 'High Protein'] },
  { id: 'c3', name: 'Chicken & Salmon Pate', description: 'Fine blended chicken breast and salmon fillets, packed with hydration and taste.', protein: 'High Hydration', tag: 'Grain-Free', features: ['High Hydration', 'Grain-Free'], img: '/media/meal_chicken.png', category: 'Cat', price: 219, rating: 4.8, reviews: 76, filterTags: ['All Recipes', 'Sensitive Stomach'] },
];

/** Upserts meal plans + recipes from `mealData.js` verbatim (idempotent). */
export async function seedMeals() {
  for (const [i, p] of subscriptionPlans.entries()) {
    await MealPlan.updateOne(
      { legacyId: p.id },
      {
        $set: {
          legacyId: p.id,
          name: p.name,
          mealsCount: p.mealsCount,
          pricePerMonth: p.pricePerMonth,
          pricePerMeal: p.pricePerMeal,
          mealsPerWeek: p.mealsPerWeek,
          features: p.features || [],
          badge: p.badge ?? null,
          saveText: p.saveText ?? null,
          bgColor: p.bgColor ?? null,
          borderColor: p.borderColor ?? null,
          textColor: p.textColor ?? null,
          buttonBg: p.buttonBg ?? null,
          img: p.img || '',
          sort: i,
          active: true,
        },
      },
      { upsert: true }
    );
  }

  for (const m of availableMeals) {
    await Meal.updateOne(
      { legacyId: m.id },
      {
        $set: {
          legacyId: m.id,
          name: m.name,
          description: m.description || '',
          protein: m.protein || '',
          tag: m.tag ?? null,
          features: m.features || [],
          img: m.img || '',
          category: m.category || 'Dog',
          price: m.price,
          rating: m.rating ?? 0,
          reviews: m.reviews ?? 0,
          filterTags: m.filterTags || [],
          active: true,
        },
      },
      { upsert: true }
    );
  }

  return `${subscriptionPlans.length} plans, ${availableMeals.length} recipes upserted`;
}
