import { api } from './api';
import { isLoggedIn } from './auth';

/**
 * Shop data + cart sync. Replaces `shopData.js` imports and the raw
 * localStorage cart. The server cart is authoritative when logged in;
 * localStorage `cart` is kept as a mirror in the exact legacy display shape
 * so existing components (badge counts, checkout state) work unchanged.
 */

/* ── product mapping (API → legacy shopData shape) ────── */

export function toLegacyProduct(p) {
  return {
    id: p.legacyId ?? p._id,
    _id: p._id,
    brand: p.brand,
    name: p.name,
    category: p.category,
    petType: p.petType,
    price: p.price,
    mrp: p.mrp,
    rating: p.rating,
    badge: p.badge,
    badgeColor: p.badgeColor,
    tag: p.tag,
    img: p.img,
    images: p.images?.length ? p.images : [p.img].filter(Boolean),
    variants: p.variants || [],
    packSizes: p.packSizes || [],
    overviewImage: p.overviewImage || p.img,
    description: p.description,
    reviewsData: {
      total: p.ratingCount || 0,
      average: p.rating || 0,
      breakdown: p.ratingBreakdown || [0, 0, 0, 0, 0],
      reviews: [],
    },
    dietType: p.dietType,
    lifeStage: p.lifeStage,
    productType: p.productType,
    specialDiet: p.specialDiet,
    proteinSource: p.proteinSource,
    weight: p.weight,
    discountRange: p.discountRange,
    subCategory: p.subCategory,
    isNewArrival: p.isNewArrival,
    isBestseller: p.isBestseller,
  };
}

export async function fetchProducts(params = {}) {
  const { data } = await api.get('/shop/products', { params: { limit: 100, ...params } });
  return data.items.map(toLegacyProduct);
}

export async function fetchProduct(idOrLegacyId) {
  const { data } = await api.get(`/shop/products/${idOrLegacyId}`);
  return toLegacyProduct(data);
}

export async function fetchCategories() {
  const { data } = await api.get('/shop/categories');
  return ['All', ...data.map((c) => c.name)];
}

/* ── breeds (legacy breedData shape, shop blobs included) ── */

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export function toLegacyBreed(b) {
  return {
    id: b.slug,
    species: cap(b.petType),
    name: b.name,
    size: cap(b.size),
    personality: b.personality,
    description: b.description,
    image: b.image,
    traits: b.traits || [],
    summary: b.summary || {},
    recommendations: b.shopData?.recommendations || {},
    monthlyBundle: b.shopData?.monthlyBundle || null,
    guidance: b.shopData?.guidance || {},
  };
}

/** Full breed catalog including shop recommendation data (per-breed detail). */
export async function fetchBreedsWithShopData() {
  const { data } = await api.get('/breeds');
  const details = await Promise.all(
    data.map((b) => api.get(`/breeds/${b.slug}`).then((r) => r.data).catch(() => b))
  );
  return details.map(toLegacyBreed);
}

/* ── cart (server-authoritative, localStorage mirror) ──── */

function mirrorCart(displayItems) {
  localStorage.setItem('cart', JSON.stringify(displayItems));
  window.dispatchEvent(new Event('cart-updated'));
  return displayItems;
}

function hydratedToDisplay(hydrated) {
  return hydrated.items.map((i) => ({
    id: i.legacyId ?? i.productId,
    productId: i.productId,
    packSizeIndex: i.packSizeIndex,
    name: i.name,
    img: i.img,
    size: i.size,
    price: i.price,
    quantity: i.quantity,
    inStock: i.inStock,
  }));
}

function displayToServer(displayItems) {
  return displayItems
    .filter((i) => i.productId)
    .map((i) => ({
      productId: i.productId,
      packSizeIndex: i.packSizeIndex ?? 0,
      qty: i.quantity,
    }));
}

/** Load the server cart (fallback to the local mirror when logged out). */
export async function loadCart() {
  if (!isLoggedIn()) {
    try {
      return JSON.parse(localStorage.getItem('cart')) || [];
    } catch {
      return [];
    }
  }
  const { data } = await api.get('/cart');
  return mirrorCart(hydratedToDisplay(data));
}

/** Persist the full cart after qty changes / removals. */
export async function saveCart(displayItems) {
  mirrorCart(displayItems);
  if (isLoggedIn()) {
    const { data } = await api.put('/cart', { items: displayToServer(displayItems) });
    return mirrorCart(hydratedToDisplay(data));
  }
  return displayItems;
}

/** Add one line (product must be a mapped legacy product with `_id`). */
export async function addToCart(product, { packSizeIndex = 0, qty = 1 } = {}) {
  if (isLoggedIn() && product._id) {
    const { data } = await api.post('/cart/items', {
      productId: product._id,
      packSizeIndex,
      qty,
    });
    return mirrorCart(hydratedToDisplay(data));
  }
  // Logged-out fallback: legacy local behaviour.
  const items = JSON.parse(localStorage.getItem('cart') || '[]');
  const pack = product.packSizes?.[packSizeIndex];
  const line = items.find((i) => i.id === product.id && i.size === (pack?.size || 'Standard'));
  if (line) line.quantity += qty;
  else {
    items.push({
      id: product.id,
      productId: product._id,
      packSizeIndex,
      name: product.name,
      img: product.img,
      size: pack?.size || 'Standard',
      price: pack?.price ?? product.price,
      quantity: qty,
    });
  }
  return mirrorCart(items);
}

/* ── checkout ─────────────────────────────────────────── */

/** Load Razorpay's checkout.js once. */
function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Could not load Razorpay — check your connection'));
    document.body.appendChild(script);
  });
}

/**
 * Full checkout: create the order server-side, open Razorpay (unless COD),
 * verify the payment. Resolves with the final order; rejects on failure or
 * when the user dismisses the payment sheet.
 */
export async function checkoutOrder({ items, addressId, paymentMethod }) {
  const { data } = await api.post('/orders/checkout', {
    items: displayToServer(items),
    addressId,
    paymentMethod,
  });

  if (paymentMethod === 'cod') {
    mirrorCart([]);
    return data.order;
  }

  await loadRazorpayScript();
  await new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      order_id: data.razorpay.razorpayOrderId,
      amount: data.razorpay.amount,
      currency: data.razorpay.currency,
      name: 'TailCircle',
      description: `Order ${data.order.orderNo}`,
      handler: async (res) => {
        try {
          await api.post('/payments/verify', {
            razorpayOrderId: res.razorpay_order_id,
            razorpayPaymentId: res.razorpay_payment_id,
            signature: res.razorpay_signature,
          });
          resolve();
        } catch (err) {
          reject(err);
        }
      },
      modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
      theme: { color: '#599D9A' },
    });
    rzp.on('payment.failed', (res) => reject(new Error(res.error?.description || 'Payment failed')));
    rzp.open();
  });

  mirrorCart([]);
  const { data: order } = await api.get(`/orders/${data.order._id}`);
  return order;
}

/* ── orders + wishlist ────────────────────────────────── */

export async function fetchMyOrders() {
  const { data } = await api.get('/orders');
  return data;
}

export async function cancelOrder(orderId) {
  const { data } = await api.post(`/orders/${orderId}/cancel`);
  return data;
}

export async function fetchSavedItems() {
  const { data } = await api.get('/saved-items');
  return data;
}

export async function toggleSavedItem(productId, currentlySaved) {
  if (currentlySaved) {
    await api.delete('/saved-items', { body: { targetType: 'product', targetId: productId } });
  } else {
    await api.post('/saved-items', { targetType: 'product', targetId: productId });
  }
}
