import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { Pet } from '../src/modules/pet/pet.model.js';
import { MatchProfile } from '../src/modules/social/social.models.js';
import { syncPetToMatchProfile, generateMoodPrompts } from '../src/modules/social/matchEngine.service.js';
import { seedSocial } from './seeders/social.seed.js';

async function main() {
  console.log('🔄 Connecting to database...');
  await connectDatabase();

  console.log('🌱 Seeding default social mock profiles...');
  const seedRes = await seedSocial();
  console.log('✅ Seed result:', seedRes);

  console.log('🐾 Syncing all real user pets from Pet collection to MatchProfiles...');
  const pets = await Pet.find({ deletedAt: null }).lean();
  let syncedCount = 0;
  for (const pet of pets) {
    await syncPetToMatchProfile(pet);
    syncedCount++;
  }
  console.log(`✅ Synced ${syncedCount} real pets to MatchProfiles.`);

  console.log('✨ Ensuring mood-based prompt captions for ALL MatchProfile records...');
  const allProfiles = await MatchProfile.find({ active: true }).lean();
  let updatedPromptsCount = 0;

  for (const prof of allProfiles) {
    if (!prof.prompts || prof.prompts.length === 0) {
      const generated = generateMoodPrompts({
        name: prof.name,
        type: prof.type,
        breed: prof.breed,
        mood: prof.temperament?.[0] || 'Playful',
        temperament: prof.temperament || [],
        activityLevel: prof.activityLevel || 'medium',
      });

      await MatchProfile.updateOne(
        { _id: prof._id },
        { $set: { prompts: generated } }
      );
      updatedPromptsCount++;
    }
  }

  console.log(`🎉 Mood prompt seeding completed! Updated ${updatedPromptsCount} profiles with mood captions.`);
  await disconnectDatabase();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error seeding mood prompts:', err);
  process.exit(1);
});
