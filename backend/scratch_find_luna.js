import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const pets = await db.collection('pets').find({}).toArray();
  console.log('=== ALL PETS IN DB (' + pets.length + ') ===');
  for (const p of pets) {
    console.log(`ID: ${p._id} | Name: "${p.name}" | Breed: "${p.breed}" | Avatar: "${p.avatarUrl}" | Photos:`, p.photos || p.mediaGallery || p.image);
    console.log('FULL RECORD:', JSON.stringify(p, null, 2));
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
