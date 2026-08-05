# Phase 3 — Shop / E-commerce + Razorpay Checkout

**Goal:** product catalog, cart, checkout with real Razorpay payment, orders,
saved items and reviews — replacing `shopData.js` and the localStorage cart.

**Status: ✅ Done** (2026-07-18) · Depends on: Phase 1 (Phase 0 payment scaffolding)

Verification: `node scripts/phase3-check.js` (server running) — **21/21 pass**
(catalog filters/search/cache, price-trusted cart, COD + Razorpay checkout with
real gateway order, signed verify → fulfilment, tamper rejection, atomic stock
decrement + restore on cancel, IDOR block, review aggregates, wishlist).
Catalog seeded: `node scripts/seed.js shop` (6 categories, 88 products verbatim
from `shopData.js`, stock=100/pack, SKUs `TC-<legacyId>-<packIdx>`).

Notes: `shopData.js` stays on disk ONLY because the admin `BreedManagement.jsx`
still imports it (retires with Phase 11) — no user-app screen reads it anymore.
The `SavedItems.jsx` profile screen is actually saved *posts* (community) → it
migrates in Phase 7; the shop wishlist lives on the ProductDetail heart +
`/saved-items`. Breed monthly bundles now add their component products at real
catalog prices (a proper bundle/discount model lands with Phase 11 platform
settings). Checkout UI: card/UPI selections open the real Razorpay sheet; COD
places without payment.

UI audit (2026-07-18): two gaps found and fixed — ProductDetail's review cards
now render real `/reviews` data and "Write a review" posts a real review
(inline form). `Marketplace.jsx` was mislisted here: it's a pet buy/sell
marketplace with no backend model → **reassigned to Phase 6** (see plan log).
`shop/DayCare.jsx` is an orphan (never routed). Remaining by design: banners +
monthly packs in ShopList are hardcoded until Phase 11 banners CRUD; "Deliver
to" pincode in Shop header is static until a location feature exists.
✅ mock-free within phase scope.

## Frontend screens covered
`shop/Shop.jsx`, `ShopList.jsx`, `ProductDetail.jsx`, `Cart.jsx`, `ShopCheckout.jsx`,
`OrderSuccess.jsx`, `Marketplace.jsx`, `FilterDrawer.jsx`, `ExpertNutrition.jsx`,
`profile/screens/MyOrders.jsx`, `SavedItems.jsx`

## Models
- **ProductCategory**: `{ name, petTypes, image, parent, active, sort }`
- **Product**: `{ vendorId (nullable → platform), brand, name, slug, description, category, subCategory, petType, images, variants: [{ name, img }], packSizes: [{ size, price, mrp, sku, stock }], lifeStage, productType, specialDiet, proteinSource, dietType, weight, badges, isNewArrival, isBestseller, rating, ratingCount, active, deletedAt }` — text index on name/brand, indexes on category/petType
- **Cart**: `{ userId (unique), items: [{ productId, packSizeIndex/sku, qty, priceSnapshot }] }`
- **Order**: `{ orderNo, userId, vendorId, items[{ productId, name, image, sku, qty, unitPrice, total }], amounts: { subtotal, discount, delivery, tax, total } (paise), addressSnapshot, paymentId, status: pending_payment|placed|confirmed|packed|shipped|out_for_delivery|delivered|cancelled|return_requested|returned|refunded, timeline: [{ status, at, note }] }`
- **Review**: `{ userId, targetType: product|provider|booking, targetId, rating 1–5, text, images, status: visible|hidden }` (shared model reused by services)
- **SavedItem**: `{ userId, targetType, targetId }` (unique compound)

## Endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | /shop/products | public | filters: category, petType, brand, price range, diet, sort, search, pagination |
| GET | /shop/products/:id | public | full detail + reviews summary |
| GET | /shop/categories | public | |
| GET/PUT | /cart | auth | server cart; PUT replaces items (client merges guest cart on login) |
| POST | /orders/checkout | auth | validates stock+prices server-side → creates Order(pending) + Razorpay order |
| POST | /payments/verify · /payments/webhook | — | Phase 0 dispatcher marks order `placed`, decrements stock |
| GET | /orders · /orders/:id | auth | my orders, timeline |
| POST | /orders/:id/cancel | auth | only pre-ship states; auto-refund via Razorpay |
| POST | /orders/:id/return | auth | return request (vendor handles in Phase 9) |
| GET/POST/DELETE | /saved-items | auth | wishlist |
| GET/POST | /reviews?targetType=&targetId= | public read / auth write | verified-purchase flag |

## Tasks
- [x] Category + Product modules; migration seed from `shopData.js` (products, categories, pack sizes, review aggregates); `legacyId` preserves mock numeric ids for breed recommendations
- [x] Redis caching on product/category list & detail GETs (120–300s TTL) with invalidation on order placement / review writes
- [x] Cart module with price/stock revalidation at read time (`GET/PUT /cart`, `POST /cart/items`)
- [x] Order module: state machine, order number generator, stock decrement on payment (atomic `$inc` with `$gte` guard + compensation), cancel restores stock + auto Razorpay refund
- [x] Reviews (verified-purchase flag, product aggregate refresh) + SavedItems modules (shared `targetType` design)
- [x] Razorpay checkout wired end-to-end (checkout.js sheet → `/payments/verify` → success screen); COD path places without payment
- [x] **Frontend:** Shop/ShopList/ProductDetail fetch API (legacy-shape mappers keep UI identical); server cart with localStorage mirror (guest fallback); ShopCheckout uses real address book + Razorpay; MyOrders wired with live statuses + cancel
- [x] Seed: `scripts/seeders/shop.seed.js` (registered as `shop`) — 6 categories + 88 products migrated verbatim. **Mock retired from user app:** `ShopList`/`ProductDetail` no longer import `shopData.js`; `tailcircle_breeds` in `ShopList` switched to `/breeds`; localStorage `cart` is now a mirror of the server cart. File deleted with Phase 11 (admin still imports it)

## Security notes
- **Never trust client prices/totals** — recompute from DB at checkout
- Stock race: conditional update `stock: { $gte: qty }`; fail checkout cleanly
- Review spam: 1 review per user per target; verified-purchase check
- Refunds only via server-side Razorpay API, logged in Payment + Order timeline

## Exit criteria
Buy a product end-to-end with a Razorpay test payment; order appears in MyOrders
with live status; wishlist + reviews persist.
