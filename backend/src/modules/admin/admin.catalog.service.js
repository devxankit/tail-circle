import mongoose from 'mongoose';
import { ApiError } from '../../utils/ApiError.js';
import { Product } from '../shop/product.model.js';
import { ProductCategory } from '../shop/productCategory.model.js';
import { Breed } from '../breed/breed.model.js';
import { MealPlan } from '../meal/meal.models.js';
import { Doctor } from '../provider/doctor.model.js';
import { EventMeta } from '../provider/event.model.js';
import { ServiceOffering } from '../provider/serviceOffering.model.js';
import { MemorialService } from '../vendor/memorial.models.js';
import { invalidate } from '../../services/cache.service.js';
import { writeAudit } from './admin.service.js';

const idOk = (id) => mongoose.isValidObjectId(id);
async function bust(namespace) {
  try { await invalidate(`${namespace}:resp:*`); } catch { /* best-effort */ }
}

/* ── Products ─────────────────────────────────────────────────────── */
const serProduct = (p) => {
  const stock = p.packSizes?.[0]?.stock ?? 0;
  return {
    id: String(p._id),
    name: p.name,
    brand: p.brand,
    sku: p.packSizes?.[0]?.sku || `SKU-${String(p._id).slice(-6).toUpperCase()}`,
    vendor: p.vendorId ? 'Marketplace Vendor' : 'Platform',
    city: '—',
    category: p.category,
    petType: p.petType,
    price: p.price,
    mrp: p.mrp || null,
    discount: p.packSizes?.[0]?.discount ?? 0,
    stock,
    sold: 0,
    trend: 'none',
    rating: p.rating || 0,
    reviews: p.ratingCount || 0,
    status: stock === 0 ? 'Out of Stock' : p.active !== false ? 'Active' : 'Inactive',
    img: p.img,
    active: p.active !== false,
    vendorId: p.vendorId ? String(p.vendorId) : null,
  };
};

export async function listProducts({ search, category, vendorId } = {}) {
  const filter = { deletedAt: null };
  if (search) filter.name = new RegExp(search, 'i');
  if (category && category !== 'All') filter.category = category;
  if (vendorId && idOk(vendorId)) filter.vendorId = vendorId;
  const rows = await Product.find(filter).sort({ createdAt: -1 }).limit(500);
  return rows.map(serProduct);
}
export async function createProduct(actor, body, ip) {
  const p = await Product.create({
    name: body.name,
    brand: body.brand || '',
    category: body.category || 'Food',
    petType: body.petType || 'Dog',
    price: body.price,
    mrp: body.mrp || body.price,
    img: body.img || '',
    slug: `${(body.name || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
    packSizes: [{ size: body.size || 'Standard', price: body.price, mrp: body.mrp || body.price, stock: body.stock ?? 100 }],
    active: true,
  });
  await bust('shop');
  await writeAudit(actor, { action: 'product.create', targetType: 'product', targetId: p._id, ip });
  return serProduct(p);
}
export async function updateProduct(actor, id, patch, ip) {
  if (!idOk(id)) throw ApiError.badRequest('Invalid product id');
  const p = await Product.findById(id);
  if (!p) throw ApiError.notFound('Product not found');
  for (const k of ['name', 'brand', 'category', 'petType', 'price', 'mrp', 'img', 'active']) if (patch[k] !== undefined) p[k] = patch[k];
  if (patch.stock !== undefined && p.packSizes?.[0]) p.packSizes[0].stock = patch.stock;
  await p.save();
  await bust('shop');
  await writeAudit(actor, { action: 'product.update', targetType: 'product', targetId: id, ip });
  return serProduct(p);
}
export async function deleteProduct(actor, id, ip) {
  if (!idOk(id)) throw ApiError.badRequest('Invalid product id');
  await Product.updateOne({ _id: id }, { $set: { deletedAt: new Date(), active: false } });
  await bust('shop');
  await writeAudit(actor, { action: 'product.delete', targetType: 'product', targetId: id, ip });
  return { id };
}

/* ── Product categories ───────────────────────────────────────────── */
const serCat = (c) => ({ id: String(c._id), name: c.name, petTypes: c.petTypes, image: c.image, sort: c.sort, active: c.active });
export async function listProductCategories() {
  return (await ProductCategory.find().sort({ sort: 1 })).map(serCat);
}
export async function createProductCategory(actor, body, ip) {
  const c = await ProductCategory.create({ name: body.name, petTypes: body.petTypes || [], image: body.image || '', sort: body.sort || 0, active: body.active !== false });
  await bust('shop');
  await writeAudit(actor, { action: 'category.create', targetType: 'category', targetId: c._id, ip });
  return serCat(c);
}
export async function updateProductCategory(actor, id, patch, ip) {
  if (!idOk(id)) throw ApiError.badRequest('Invalid category id');
  const c = await ProductCategory.findByIdAndUpdate(id, { $set: patch }, { new: true });
  if (!c) throw ApiError.notFound('Category not found');
  await bust('shop');
  await writeAudit(actor, { action: 'category.update', targetType: 'category', targetId: id, ip });
  return serCat(c);
}
export async function deleteProductCategory(actor, id, ip) {
  if (!idOk(id)) throw ApiError.badRequest('Invalid category id');
  await ProductCategory.findByIdAndDelete(id);
  await bust('shop');
  await writeAudit(actor, { action: 'category.delete', targetType: 'category', targetId: id, ip });
  return { id };
}

/* ── Breeds (retires tailcircle_breeds) ───────────────────────────── */
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
// The admin breed builder stores rich recommendation/bundle data — persist it
// in Breed.summary + Breed.shopData so the editor round-trips losslessly.
const serBreed = (b) => ({
  id: String(b._id),
  name: b.name,
  petType: b.petType,
  species: cap(b.petType),
  size: b.size,
  image: b.image,
  personality: b.personality || '',
  description: b.description || '',
  traits: b.traits || [],
  summary: b.summary || {},
  recommendations: b.shopData?.recommendations || {},
  guidance: b.shopData?.guidance || {},
  monthlyBundle: b.shopData?.monthlyBundle || {},
  popularity: b.popularity,
  active: b.active,
  status: b.active ? 'Approved' : 'Hidden',
});

function toBreedDoc(body) {
  const petType = (body.petType || body.species || 'dog').toLowerCase();
  return {
    name: body.name,
    petType,
    personality: body.personality || '',
    description: body.description || '',
    image: body.image || '',
    traits: Array.isArray(body.traits) ? body.traits : [],
    size: body.size || null,
    summary: body.summary || {},
    shopData: {
      recommendations: body.recommendations || {},
      guidance: body.guidance || {},
      monthlyBundle: body.monthlyBundle || {},
    },
  };
}

export async function listBreeds({ search, petType } = {}) {
  const filter = {};
  if (search) filter.name = new RegExp(search, 'i');
  if (petType) filter.petType = petType.toLowerCase();
  return (await Breed.find(filter).sort({ name: 1 }).limit(500)).map(serBreed);
}
export async function createBreed(actor, body, ip) {
  const doc = toBreedDoc(body);
  const b = await Breed.create({
    ...doc,
    slug: `${doc.petType}_${(body.name || 'breed').toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now().toString().slice(-5)}`,
    active: true,
  });
  await bust('breeds');
  await writeAudit(actor, { action: 'breed.create', targetType: 'breed', targetId: b._id, ip });
  return serBreed(b);
}
export async function updateBreed(actor, id, patch, ip) {
  if (!idOk(id)) throw ApiError.badRequest('Invalid breed id');
  const set = patch.name !== undefined || patch.species !== undefined || patch.recommendations !== undefined
    ? toBreedDoc(patch)
    : { ...patch };
  if (patch.active !== undefined) set.active = patch.active;
  const b = await Breed.findByIdAndUpdate(id, { $set: set }, { new: true });
  if (!b) throw ApiError.notFound('Breed not found');
  await bust('breeds');
  await writeAudit(actor, { action: 'breed.update', targetType: 'breed', targetId: id, ip });
  return serBreed(b);
}
export async function deleteBreed(actor, id, ip) {
  if (!idOk(id)) throw ApiError.badRequest('Invalid breed id');
  await Breed.findByIdAndDelete(id);
  await bust('breeds');
  await writeAudit(actor, { action: 'breed.delete', targetType: 'breed', targetId: id, ip });
  return { id };
}

/* ── Meal plans ───────────────────────────────────────────────────── */
const PLAN_FIELDS = ['name', 'mealsCount', 'pricePerMonth', 'pricePerMeal', 'mealsPerWeek', 'features', 'badge', 'saveText', 'bgColor', 'borderColor', 'textColor', 'buttonBg'];
const serPlan = (p) => ({
  id: String(p._id),
  name: p.name,
  mealsCount: p.mealsCount,
  pricePerMonth: p.pricePerMonth,
  pricePerMeal: p.pricePerMeal,
  mealsPerWeek: p.mealsPerWeek,
  features: p.features || [],
  badge: p.badge,
  saveText: p.saveText,
  bgColor: p.bgColor,
  borderColor: p.borderColor,
  textColor: p.textColor,
  buttonBg: p.buttonBg,
  active: p.active,
  status: p.active ? 'Active' : 'Inactive',
});
export async function listMealPlans() {
  return (await MealPlan.find({ deletedAt: null }).sort({ sort: 1 })).map(serPlan);
}
export async function createMealPlan(actor, body, ip) {
  const doc = { pricePerMonth: body.pricePerMonth || body.price || 0, mealsPerWeek: body.mealsPerWeek || 1, active: true };
  for (const k of PLAN_FIELDS) if (body[k] !== undefined) doc[k] = body[k];
  const p = await MealPlan.create(doc);
  await bust('meals');
  await writeAudit(actor, { action: 'mealplan.create', targetType: 'mealplan', targetId: p._id, ip });
  return serPlan(p);
}
export async function updateMealPlan(actor, id, patch, ip) {
  if (!idOk(id)) throw ApiError.badRequest('Invalid plan id');
  const set = {};
  for (const k of PLAN_FIELDS) if (patch[k] !== undefined) set[k] = patch[k];
  if (patch.active !== undefined) set.active = patch.active;
  const p = await MealPlan.findByIdAndUpdate(id, { $set: set }, { new: true });
  if (!p) throw ApiError.notFound('Plan not found');
  await bust('meals');
  await writeAudit(actor, { action: 'mealplan.update', targetType: 'mealplan', targetId: id, ip });
  return serPlan(p);
}
export async function deleteMealPlan(actor, id, ip) {
  if (!idOk(id)) throw ApiError.badRequest('Invalid plan id');
  await MealPlan.updateOne({ _id: id }, { $set: { deletedAt: new Date(), active: false } });
  await bust('meals');
  await writeAudit(actor, { action: 'mealplan.delete', targetType: 'mealplan', targetId: id, ip });
  return { id };
}

/* ── Doctor services ──────────────────────────────────────────────── */
const serDoc = (d) => ({ id: String(d._id), name: d.name, spec: d.spec, clinic: d.clinic, price: d.price, videoPrice: d.videoPrice, active: d.active });
export async function listDoctorServices() {
  return (await Doctor.find().sort({ name: 1 })).map(serDoc);
}
export async function updateDoctorService(actor, id, patch, ip) {
  if (!idOk(id)) throw ApiError.badRequest('Invalid doctor id');
  const d = await Doctor.findByIdAndUpdate(id, { $set: patch }, { new: true });
  if (!d) throw ApiError.notFound('Doctor not found');
  await bust('doctors');
  await writeAudit(actor, { action: 'doctor.update', targetType: 'doctor', targetId: id, ip });
  return serDoc(d);
}

/* ── Event categories ─────────────────────────────────────────────── */
export async function listEventCategories() {
  const rows = await EventMeta.find({ kind: 'category' }).sort({ sort: 1 });
  return rows.map((m) => ({ id: String(m._id), legacyId: m.legacyId, ...(m.data || {}), sort: m.sort }));
}

/* ── Memorial packages (cross-vendor, read + toggle) ──────────────── */
export async function listMemorialPackages() {
  const rows = await MemorialService.find().sort({ createdAt: -1 });
  return rows.map((s) => ({ id: String(s._id), name: s.name, category: s.category, price: s.price, status: s.status }));
}

/* ── Grooming / daycare offerings ─────────────────────────────────── */
export async function listGroomingDaycare() {
  const rows = await ServiceOffering.find({ providerType: { $in: ['grooming', 'daycare'] } }).sort({ providerType: 1 }).limit(400);
  return rows.map((o) => ({ id: String(o._id), name: o.name, type: o.providerType, kind: o.kind, price: o.price, active: o.active !== false }));
}

/* ── Add-ons & amenities ──────────────────────────────────────────── */
const serAddon = (o) => ({ id: String(o._id), name: o.name, category: o.category, price: o.price, type: o.providerType, active: o.active !== false });
export async function listAddons() {
  return (await ServiceOffering.find({ kind: 'addon' }).sort({ providerType: 1 }).limit(400)).map(serAddon);
}
export async function updateAddon(actor, id, patch, ip) {
  if (!idOk(id)) throw ApiError.badRequest('Invalid addon id');
  const o = await ServiceOffering.findByIdAndUpdate(id, { $set: patch }, { new: true });
  if (!o) throw ApiError.notFound('Add-on not found');
  await writeAudit(actor, { action: 'addon.update', targetType: 'addon', targetId: id, ip });
  return serAddon(o);
}
