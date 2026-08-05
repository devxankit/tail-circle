import { Cart } from './cart.model.js';
import { Product } from '../shop/product.model.js';

/**
 * Hydrate a cart into the display shape the UI renders:
 * [{ productId, legacyId, name, img, size, price, mrp, quantity, packSizeIndex, inStock }]
 * Prices always come fresh from the catalog, never from the stored cart.
 */
export async function getHydratedCart(userId) {
  const cart = await Cart.findOne({ userId });
  if (!cart || !cart.items.length) return { items: [], subtotal: 0 };

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
      inStock: pack.stock >= item.qty,
    });
  }

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  return { items, subtotal };
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
export async function addItem(userId, { productId, packSizeIndex = 0, qty = 1 }) {
  const cart = (await Cart.findOne({ userId })) || new Cart({ userId, items: [] });
  const line = cart.items.find(
    (i) => String(i.productId) === String(productId) && i.packSizeIndex === packSizeIndex
  );
  if (line) line.qty = Math.min(99, line.qty + qty);
  else cart.items.push({ productId, packSizeIndex, qty });
  await cart.save();
  return getHydratedCart(userId);
}
