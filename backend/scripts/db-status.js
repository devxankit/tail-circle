/**
 * Quick look at what's in the database: collection counts + seed status.
 *   node scripts/db-status.js
 */
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';

await mongoose.connect(env.mongoUri);
const db = mongoose.connection.db;

console.log(`Database: ${mongoose.connection.name}\n`);
const names = (await db.listCollections().toArray()).map((c) => c.name).sort();
for (const n of names) {
  const count = await db.collection(n).countDocuments();
  console.log(`  ${n.padEnd(22)} ${count}`);
}

const byType = await db
  .collection('breeds')
  .aggregate([{ $group: { _id: '$petType', n: { $sum: 1 } } }, { $sort: { _id: 1 } }])
  .toArray();
if (byType.length) {
  console.log(`\n  breeds by type: ${byType.map((b) => `${b._id}=${b.n}`).join(', ')}`);
}

await mongoose.disconnect();
