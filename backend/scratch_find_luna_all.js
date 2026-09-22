import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const collections = await db.listCollections().toArray();
  for (const col of collections) {
    const records = await db.collection(col.name).find({
      $or: [
        { name: { $regex: 'luna', $options: 'i' } },
        { breed: { $regex: 'husky', $options: 'i' } }
      ]
    }).toArray();

    if (records.length > 0) {
      console.log(`=== FOUND IN COLLECTION: ${col.name} (${records.length}) ===`);
      console.log(JSON.stringify(records, null, 2));
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
