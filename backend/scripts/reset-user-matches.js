import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { User } from '../src/modules/user/user.model.js';
import { MatchProfile, Swipe, Match } from '../src/modules/social/social.models.js';
import { seedSocial } from './seeders/social.seed.js';

const EXTRA_PROFILES = [
  {
    legacyId: 101,
    name: 'Rocky',
    type: 'Dog',
    gender: 'Male',
    age: 2,
    distance: 3,
    breed: 'Beagle',
    size: 'Medium',
    vaccinationStatus: 'Vaccinated',
    neutered: 'Yes',
    activityLevel: 'High',
    temperament: ['Playful', 'Curious', 'Friendly'],
    compatibility: ['Good With Dogs', 'Good With Kids'],
    purpose: 'Playdate',
    availability: 'Available Today',
    img: 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&w=600&q=80',
    photos: [
      'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=600&q=80',
    ],
    prompts: [
      { question: 'My simple pleasures', answer: 'Sniffing every tree in the park and finding hidden treats.' },
      { question: 'Green flags I look for', answer: 'Someone who shares their bacon snacks.' },
    ],
    tags: ['Vaccinated', 'High Energy', 'Sniffer'],
    online: true,
    autoLikesBack: true,
    active: true,
  },
  {
    legacyId: 102,
    name: 'Coco',
    type: 'Dog',
    gender: 'Female',
    age: 1,
    distance: 5,
    breed: 'Poodle',
    size: 'Small',
    vaccinationStatus: 'Vaccinated',
    neutered: 'Yes',
    activityLevel: 'Medium',
    temperament: ['Smart', 'Affectionate', 'Playful'],
    compatibility: ['Good With Cats', 'Good With Families'],
    purpose: 'Walking Partner',
    availability: 'Available This Week',
    img: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=600&q=80',
    photos: [
      'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=600&q=80',
    ],
    prompts: [
      { question: 'First round is on me if', answer: 'You bring extra squeaky balls to our park date.' },
    ],
    tags: ['Smart Cookie', 'Cuddle Bug'],
    online: true,
    autoLikesBack: true,
    active: true,
  },
  {
    legacyId: 103,
    name: 'Milo',
    type: 'Dog',
    gender: 'Male',
    age: 3.5,
    distance: 7,
    breed: 'Shih Tzu',
    size: 'Small',
    vaccinationStatus: 'Vaccinated',
    neutered: 'Yes',
    activityLevel: 'Low',
    temperament: ['Calm', 'Friendly', 'Affectionate'],
    compatibility: ['Good With Cats', 'Good With Kids'],
    purpose: 'Friendship',
    availability: 'Available Anytime',
    img: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=600&q=80',
    photos: [
      'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=600&q=80',
    ],
    prompts: [
      { question: 'I recently discovered that', answer: 'Napping on the sofa is an Olympic sport.' },
    ],
    tags: ['Lap Dog', 'Chill Vibes'],
    online: true,
    autoLikesBack: true,
    active: true,
  },
  {
    legacyId: 104,
    name: 'Teddy',
    type: 'Dog',
    gender: 'Male',
    age: 2,
    distance: 4,
    breed: 'Indie',
    size: 'Medium',
    vaccinationStatus: 'Vaccinated',
    neutered: 'Yes',
    activityLevel: 'High',
    temperament: ['Active', 'Smart', 'Protective'],
    compatibility: ['Good With Dogs', 'Good With Families'],
    purpose: 'Playdate',
    availability: 'Available Today',
    img: 'https://images.unsplash.com/photo-1561037404-61cd46aa615b?auto=format&fit=crop&w=600&q=80',
    photos: [
      'https://images.unsplash.com/photo-1561037404-61cd46aa615b?auto=format&fit=crop&w=600&q=80',
    ],
    prompts: [
      { question: 'A shower thought I recently had', answer: 'Why is the squirrel on the tree when I am on the ground?' },
    ],
    tags: ['Rescued & Loved', 'Super Fast'],
    online: true,
    autoLikesBack: true,
    active: true,
  },
];

async function resetUserMatches() {
  console.log('--- RESETTING MATCH DECK FOR USER 9755620716 ---');
  await mongoose.connect(process.env.MONGODB_URI);

  // Find user by phone number regex
  const users = await User.find({ phone: /9755620716/ });
  console.log(`Found ${users.length} matching user accounts.`);

  for (const user of users) {
    const deletedSwipes = await Swipe.deleteMany({ userId: user._id });
    console.log(`Cleared ${deletedSwipes.deletedCount} swipe records for user ${user.name || user.phone} (${user._id})`);
  }

  // Also seed/ensure canonical social profiles
  const seedMsg = await seedSocial();
  console.log(`Seeded base social profiles: ${seedMsg}`);

  // Upsert extra profiles for testing
  for (const p of EXTRA_PROFILES) {
    await MatchProfile.updateOne(
      { legacyId: p.legacyId },
      { $set: p },
      { upsert: true }
    );
  }
  console.log(`Upserted ${EXTRA_PROFILES.length} extra test match profiles (Rocky, Coco, Milo, Teddy).`);

  const activeCount = await MatchProfile.countDocuments({ active: true });
  console.log(`✅ Total active candidate profiles in match deck now: ${activeCount}`);

  await mongoose.disconnect();
  console.log('--- RESET COMPLETE! YOU CAN NOW SWIPE FRESH MATCHES ---');
  process.exit(0);
}

resetUserMatches().catch((err) => {
  console.error(err);
  process.exit(1);
});
