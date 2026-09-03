import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { MatchProfile } from '../src/modules/social/social.models.js';

async function main() {
  await connectDatabase();
  const res = await MatchProfile.updateMany({}, { $set: { autoLikesBack: false } });
  console.log('✅ Disabled autoLikesBack on all MatchProfile records in MongoDB:', res);
  await disconnectDatabase();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error updating DB:', err);
  process.exit(1);
});
