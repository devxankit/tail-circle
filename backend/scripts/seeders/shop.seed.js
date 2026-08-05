import { Product } from '../../src/modules/shop/product.model.js';
import { ProductCategory } from '../../src/modules/shop/productCategory.model.js';
// Source of truth during migration: the frontend's static catalog.
import {
  products as mockProducts,
  categories as mockCategories,
} from '../../../frontend/src/modules/user/features/shop/shopData.js';

function slugify(name, legacyId) {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${legacyId}`;
}

/**
 * Upserts the full shop catalog from `shopData.js` (idempotent — products
 * keyed by legacyId, categories by name). Every display field is copied
 * verbatim so the UI renders identically; each pack size gets stock=100
 * and a deterministic SKU.
 */
export async function seedShop() {
  let categoryCount = 0;
  for (const [i, name] of mockCategories.filter((c) => c !== 'All').entries()) {
    await ProductCategory.updateOne(
      { name },
      { $set: { name, sort: i, active: true } },
      { upsert: true }
    );
    categoryCount++;
  }

  let productCount = 0;
  for (const p of mockProducts) {
    const reviews = p.reviewsData || {};
    await Product.updateOne(
      { legacyId: p.id },
      {
        $set: {
          legacyId: p.id,
          slug: slugify(p.name, p.id),
          brand: p.brand || '',
          name: p.name,
          description: p.description || '',
          category: p.category,
          subCategory: p.subCategory || '',
          petType: p.petType,
          price: p.price,
          mrp: p.mrp ?? p.price,
          img: p.img || '',
          images: p.images?.length ? p.images : [p.img].filter(Boolean),
          overviewImage: p.overviewImage || p.img || '',
          variants: p.variants || [],
          packSizes: (p.packSizes || [{ size: 'Standard', price: p.price, mrp: p.mrp ?? p.price, discount: 0 }]).map(
            (ps, idx) => ({
              size: ps.size,
              price: ps.price,
              mrp: ps.mrp ?? ps.price,
              discount: ps.discount ?? 0,
              sku: `TC-${p.id}-${idx}`,
              stock: 100,
            })
          ),
          badge: p.badge ?? null,
          badgeColor: p.badgeColor ?? null,
          tag: p.tag ?? null,
          dietType: p.dietType ?? null,
          lifeStage: p.lifeStage ?? null,
          productType: p.productType ?? null,
          specialDiet: p.specialDiet ?? null,
          proteinSource: p.proteinSource ?? null,
          weight: p.weight ?? null,
          discountRange: p.discountRange ?? 0,
          isNewArrival: Boolean(p.isNewArrival),
          isBestseller: Boolean(p.isBestseller),
          rating: reviews.average ?? p.rating ?? 0,
          ratingCount: reviews.total ?? 0,
          ratingBreakdown: reviews.breakdown || [0, 0, 0, 0, 0],
          active: true,
        },
      },
      { upsert: true }
    );
    productCount++;
  }

  return `${categoryCount} categories, ${productCount} products upserted`;
}
