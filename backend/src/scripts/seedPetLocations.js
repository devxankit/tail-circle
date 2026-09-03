import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { User } from '../modules/user/user.model.js';
import { Pet } from '../modules/pet/pet.model.js';
import { MatchProfile } from '../modules/social/social.models.js';

const CITY_COORDINATES = [
  { city: 'Delhi NCR', state: 'Delhi', lat: 28.6139, lng: 77.2090 },
  { city: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777 },
  { city: 'Indore', state: 'Madhya Pradesh', lat: 22.7196, lng: 75.8577 },
  { city: 'Bangalore', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
  { city: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567 },
  { city: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867 },
  { city: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873 },
  { city: 'Goa', state: 'Goa', lat: 15.2993, lng: 74.1240 },
  { city: 'Chandigarh', state: 'Punjab', lat: 30.7333, lng: 76.7794 },
  { city: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639 },
];

export async function runLocationSeeder() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI missing in .env');
    return;
  }

  let localConnection = false;
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(mongoUri);
    localConnection = true;
  }

  console.log('🌱 Starting Pet & User Location Database Seeder...');

  // 1. Seed Users
  const users = await User.find({ deletedAt: null });
  let updatedUsers = 0;

  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    const cityPreset = CITY_COORDINATES[i % CITY_COORDINATES.length];
    const latOffset = ((i * 7) % 50 - 25) / 1000;
    const lngOffset = ((i * 13) % 50 - 25) / 1000;

    const lat = Math.round((cityPreset.lat + latOffset) * 10000) / 10000;
    const lng = Math.round((cityPreset.lng + lngOffset) * 10000) / 10000;
    const cityName = u.city || cityPreset.city;

    await User.findByIdAndUpdate(u._id, {
      $set: {
        city: cityName,
        state: cityPreset.state,
        location: { lat, lng },
      },
    });
    updatedUsers++;
  }
  console.log(`✅ Updated ${updatedUsers} User documents with real coordinates.`);

  // 2. Seed Pets with Owner Location
  const pets = await Pet.find({ deletedAt: null });
  let updatedPets = 0;

  for (const p of pets) {
    const owner = await User.findById(p.ownerId).lean();
    const cityPreset = CITY_COORDINATES[updatedPets % CITY_COORDINATES.length];
    const lat = owner?.location?.lat || cityPreset.lat;
    const lng = owner?.location?.lng || cityPreset.lng;
    const cityName = owner?.city || cityPreset.city;
    const stateName = owner?.state || cityPreset.state;

    await Pet.findByIdAndUpdate(p._id, {
      $set: {
        city: cityName,
        state: stateName,
        location: { lat, lng },
      },
    });
    updatedPets++;
  }
  console.log(`✅ Updated ${updatedPets} Pet documents with owner location.`);

  // 3. Seed MatchProfiles
  const matchProfiles = await MatchProfile.find({});
  let updatedMatchProfiles = 0;

  for (let i = 0; i < matchProfiles.length; i++) {
    const mp = matchProfiles[i];
    let lat = mp.location?.lat;
    let lng = mp.location?.lng;
    let cityName = mp.city;
    let stateName = mp.state;

    if (mp.ownerId) {
      const owner = await User.findById(mp.ownerId).lean();
      if (owner?.location?.lat) {
        lat = owner.location.lat;
        lng = owner.location.lng;
        cityName = owner.city;
        stateName = owner.state;
      }
    } else if (mp.petId) {
      const pet = await Pet.findById(mp.petId).lean();
      if (pet?.location?.lat) {
        lat = pet.location.lat;
        lng = pet.location.lng;
        cityName = pet.city;
        stateName = pet.state;
      }
    }

    if (lat == null || lng == null) {
      const cityPreset = CITY_COORDINATES[i % CITY_COORDINATES.length];
      const offsetLat = ((i * 11) % 80 - 40) / 1000;
      const offsetLng = ((i * 17) % 80 - 40) / 1000;
      lat = Math.round((cityPreset.lat + offsetLat) * 10000) / 10000;
      lng = Math.round((cityPreset.lng + offsetLng) * 10000) / 10000;
      cityName = cityPreset.city;
      stateName = cityPreset.state;
    }

    await MatchProfile.findByIdAndUpdate(mp._id, {
      $set: {
        city: cityName,
        state: stateName,
        location: { lat, lng },
      },
    });
    updatedMatchProfiles++;
  }
  console.log(`✅ Updated ${updatedMatchProfiles} MatchProfile documents with real locations.`);

  if (localConnection) {
    await mongoose.disconnect();
  }
  console.log('🎉 Pet Location Seeding Complete!');
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('seedPetLocations.js')) {
  runLocationSeeder()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeder error:', err);
      process.exit(1);
    });
}
