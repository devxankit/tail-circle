import { Breed } from '../breed/breed.model.js';
import { Product } from './product.model.js';

/**
 * Breed "Monthly Essentials Bundle" pricing.
 *
 * The Shop by Breed screen advertises a bundle price well below the sum of its
 * parts (a Golden Retriever box shows ₹4,299 against ₹10,642 of contents), but
 * "Add Bundle" only ever added the individual products, so the customer was
 * charged the full list total — the discount existed in the design and in the
 * admin panel, and nowhere in the money.
 *
 * A line carries `bundleSlug` when it was added as part of that breed's box.
 * The discount is applied only when the whole box is present: remove one item
 * and the group quietly reverts to catalogue prices rather than handing out
 * the bundle rate for a partial box.
 */

/** A cart/order line's product id in the shape breeds store (`legacyId ?? _id`). */
const handleOf = (product) => product.legacyId ?? String(product._id);

/**
 * Work out what the breed bundles present in `lines` are worth.
 *
 * @param lines  [{ productId, packSizeIndex, qty, bundleSlug }]
 * @returns {{ discount: number, bundles: Array }} discount in whole rupees
 */
export async function resolveBundleDiscounts(lines) {
  const slugs = [...new Set(lines.map((l) => l.bundleSlug).filter(Boolean))];
  if (!slugs.length) return { discount: 0, bundles: [] };

  const breeds = await Breed.find({ slug: { $in: slugs } }).lean();
  const products = await Product.find({
    _id: { $in: lines.map((l) => l.productId) },
  }).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  let discount = 0;
  const bundles = [];

  for (const breed of breeds) {
    const bundle = breed.shopData?.monthlyBundle;
    const wanted = bundle?.productIds || [];
    if (!wanted.length || !(bundle.bundlePrice > 0)) continue;

    const group = lines.filter((l) => l.bundleSlug === breed.slug);

    // How many complete boxes are in the cart. A missing item makes this 0,
    // which is what keeps a partial box at catalogue prices.
    let sets = Infinity;
    let listPricePerSet = 0;
    let complete = true;

    for (const handle of wanted) {
      const match = group.find((l) => {
        const p = byId.get(String(l.productId));
        return p && String(handleOf(p)) === String(handle);
      });
      if (!match) {
        complete = false;
        break;
      }
      const p = byId.get(String(match.productId));
      const pack = p.packSizes?.[match.packSizeIndex] || p.packSizes?.[0];
      if (!pack) {
        complete = false;
        break;
      }
      listPricePerSet += pack.price;
      sets = Math.min(sets, match.qty);
    }

    if (!complete || !Number.isFinite(sets) || sets < 1) continue;

    const saving = listPricePerSet - bundle.bundlePrice;
    if (saving <= 0) continue; // never let a "bundle" cost more than its parts

    discount += saving * sets;
    bundles.push({
      slug: breed.slug,
      name: bundle.name || `${breed.name} Monthly Box`,
      sets,
      bundlePrice: bundle.bundlePrice,
      listPrice: listPricePerSet,
      saving: saving * sets,
    });
  }

  return { discount, bundles };
}

/**
 * The bundle a breed advertises, in the id shape the storefront matches on.
 * Used to validate an "add bundle" request against live data instead of
 * trusting whatever the client posted.
 */
export async function getBreedBundle(slug) {
  const breed = await Breed.findOne({ slug }).lean();
  const bundle = breed?.shopData?.monthlyBundle;
  if (!bundle?.productIds?.length) return null;

  const products = await Product.find({ active: true, deletedAt: null }).lean();
  const byHandle = new Map(products.map((p) => [String(handleOf(p)), p]));
  const resolved = bundle.productIds.map((h) => byHandle.get(String(h))).filter(Boolean);

  return {
    slug: breed.slug,
    name: bundle.name || `${breed.name} Monthly Box`,
    bundlePrice: bundle.bundlePrice,
    productIds: bundle.productIds,
    products: resolved,
    // Every advertised product must still be sellable, or the box cannot be
    // priced as a box.
    complete: resolved.length === bundle.productIds.length,
  };
}
