/**
 * Attribute existing shop orders to their sellers.
 *
 * `checkout()` never stamped a vendor on an order or its lines, so every order
 * was `vendorId: null`: the shop vendor portal — which queries orders by vendor
 * — showed an empty list forever, and the commission ledger skipped every sale.
 * Orders now capture the seller per line; this fills that in for orders already
 * placed, resolving each line back through its product.
 *
 * Also drops the old `(refType, refId)` unique index on the vendor ledger,
 * which allowed only one seller to be credited per order. Mongoose creates the
 * replacement `(vendorId, refType, refId)` index but never removes the old one.
 */
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { Order } from '../../src/modules/order/order.model.js';
import { Product } from '../../src/modules/shop/product.model.js';
import { VendorLedgerEntry } from '../../src/modules/vendor/vendor.models.js';

async function dropStaleLedgerIndex() {
  const collection = VendorLedgerEntry.collection;
  const indexes = await collection.indexes();
  const stale = indexes.find(
    (i) => i.name === 'refType_1_refId_1' || (i.unique && !i.key.vendorId && i.key.refType && i.key.refId)
  );
  if (!stale) {
    console.log('ledger index: already migrated');
    return;
  }
  await collection.dropIndex(stale.name);
  console.log(`ledger index: dropped "${stale.name}" — one order can now credit several sellers`);
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  await dropStaleLedgerIndex();
  await VendorLedgerEntry.syncIndexes();

  const orders = await Order.find({ 'items.0': { $exists: true } });
  console.log(`\n${orders.length} orders to inspect`);

  // Resolve every product referenced across all orders in one pass.
  const productIds = [...new Set(orders.flatMap((o) => (o.items || []).map((i) => String(i.productId))))];
  const products = await Product.find({ _id: { $in: productIds } }).select('vendorId name');
  const ownerOf = new Map(products.map((p) => [String(p._id), p.vendorId ? String(p.vendorId) : null]));

  let updated = 0;
  let skipped = 0;

  for (const order of orders) {
    const alreadyStamped = (order.items || []).every((i) => i.vendorId !== undefined);
    let changed = false;

    for (const item of order.items || []) {
      const owner = ownerOf.get(String(item.productId)) ?? null;
      if (String(item.vendorId || '') !== String(owner || '')) {
        item.vendorId = owner;
        changed = true;
      }
    }

    const owners = new Set((order.items || []).map((i) => String(i.vendorId || '')));
    const single = owners.size === 1 ? [...owners][0] || null : null;
    if (String(order.vendorId || '') !== String(single || '')) {
      order.vendorId = single;
      changed = true;
    }

    if (!changed) {
      if (alreadyStamped) skipped += 1;
      continue;
    }
    order.markModified('items');
    await order.save();
    const named = (order.items || [])
      .filter((i) => i.vendorId)
      .map((i) => i.name)
      .join(', ');
    console.log(`  ++ ${order.orderNo}: ${named ? `seller lines — ${named}` : 'all platform-owned'}`);
    updated += 1;
  }

  console.log(`\n${updated} orders attributed, ${skipped} already correct`);
  console.log('Note: past orders are not retro-credited to the ledger — only fulfilment posts entries.');
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
