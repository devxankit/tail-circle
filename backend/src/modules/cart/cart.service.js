import { Cart } from './cart.model.js';
import { Product } from '../shop/product.model.js';
import { resolveBundleDiscounts } from '../shop/bundle.service.js';

/**
 * Hydrate a cart into the display shape the UI renders:
 * [{ productId, legacyId, name, img, size, price, mrp, quantity, packSizeIndex, inStock }]
 * Prices always come fresh from the catalog, never from the stored cart.
 */
export async function getHydratedCart(userId) {
  const cart = await Cart.findOne({ userId });
  if (!cart || !cart.items.length) {
    return { items: [], subtotal: 0, bundleDiscount: 0, bundles: [], total: 0 };
  }

  const products = await Product.find({
    _id: { $in: cart.items.map((i) => i.productId) },
    active: true,
    deletedAt: null,
  });
  const byId = new Map(products.map((p) => [String(p.id), p]));

  const items = [];
  for (const item of cart.items) {
    const product = byId.get(String(item.productId));
    if (!product) continue; // product delisted since it was added
    const pack = product.packSizes[item.packSizeIndex] || product.packSizes[0];
    if (!pack) continue;
    items.push({
      productId: product.id,
      legacyId: product.legacyId,
      name: product.name,
      img: product.img || product.images[0] || '',
      size: pack.size,
      price: pack.price,
      mrp: pack.mrp,
      quantity: item.qty,
      packSizeIndex: item.packSizeIndex,
      bundleSlug: item.bundleSlug || null,
      inStock: pack.stock >= item.qty,
    });
  }

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  // Line prices stay at catalogue value so the cart still shows what each
  // item is worth; the box discount is a separate line, exactly as the breed
  // screen presents it ("Buy Separately" struck through above the bundle price).
  const { discount: bundleDiscount, bundles } = await resolveBundleDiscounts(
    cart.items.map((i) => ({
      productId: i.productId,
      packSizeIndex: i.packSizeIndex,
      qty: i.qty,
      bundleSlug: i.bundleSlug || null,
    }))
  );

  return {
    items,
    subtotal,
    bundleDiscount,
    bundles,
    total: Math.max(0, subtotal - bundleDiscount),
  };
}

/** Replace the whole cart (client sends its current list). */
export async function replaceCart(userId, items) {
  await Cart.findOneAndUpdate(
    { userId },
    { $set: { items } },
    { upsert: true, setDefaultsOnInsert: true }
  );
  return getHydratedCart(userId);
}

/** Add/increment one line (productId + packSizeIndex identify a line). */
export async function addItem(userId, { productId, packSizeIndex = 0, qty = 1, bundleSlug = null }) {
  const cart = (await Cart.findOne({ userId })) || new Cart({ userId, items: [] });
  // bundleSlug is part of a line's identity: buying the same product loose
  // must not silently join it to a bundle (and inflate that bundle's discount),
  // nor the other way round.
  const line = cart.items.find(
    (i) =>
      String(i.productId) === String(productId) &&
      i.packSizeIndex === packSizeIndex &&
      (i.bundleSlug || null) === (bundleSlug || null)
  );
  if (line) line.qty = Math.min(99, line.qty + qty);
  else cart.items.push({ productId, packSizeIndex, qty, bundleSlug: bundleSlug || null });
  await cart.save();
  return getHydratedCart(userId);
}
