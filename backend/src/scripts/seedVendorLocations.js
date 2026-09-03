import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { Provider } from '../modules/provider/provider.model.js';
import { VendorProfile } from '../modules/vendor/vendor.models.js';

const CITY_LOCATIONS = [
  { city: 'Mumbai', locality: 'Bandra West', address: 'Shop 4, Lotus Park, Link Road, Bandra West', state: 'Maharashtra', pincode: '400050', lat: 19.0596, lng: 72.8295 },
  { city: 'Mumbai', locality: 'Juhu', address: 'Plot 12, Gulmohar Road, Juhu', state: 'Maharashtra', pincode: '400049', lat: 19.1075, lng: 72.8263 },
  { city: 'Mumbai', locality: 'Andheri West', address: 'Unit 8, Crystal Plaza, New Link Road, Andheri West', state: 'Maharashtra', pincode: '400053', lat: 19.1197, lng: 72.8464 },
  { city: 'Delhi NCR', locality: 'Saket', address: 'Shop 22, DLF South Court, Saket', state: 'Delhi', pincode: '110017', lat: 28.5244, lng: 77.2188 },
  { city: 'Delhi NCR', locality: 'Connaught Place', address: 'Block B, Inner Circle, Connaught Place', state: 'Delhi', pincode: '110001', lat: 28.6304, lng: 77.2177 },
  { city: 'Indore', locality: 'Vijay Nagar', address: 'Shop 102, Scheme 54, Vijay Nagar', state: 'Madhya Pradesh', pincode: '452010', lat: 22.7533, lng: 75.8937 },
  { city: 'Indore', locality: 'Palasia', address: 'Building 18, Old Palasia Main Road', state: 'Madhya Pradesh', pincode: '452001', lat: 22.7244, lng: 75.8839 },
  { city: 'Bangalore', locality: 'Indiranagar', address: '100 Feet Road, 12th Main, Indiranagar', state: 'Karnataka', pincode: '560038', lat: 12.9784, lng: 77.6408 },
  { city: 'Bangalore', locality: 'Koramangala', address: '80 Feet Road, 4th Block, Koramangala', state: 'Karnataka', pincode: '560034', lat: 12.9352, lng: 77.6245 },
  { city: 'Pune', locality: 'Koregaon Park', address: 'Lane 7, North Main Road, Koregaon Park', state: 'Maharashtra', pincode: '411001', lat: 18.5362, lng: 73.8940 },
];

export async function runVendorLocationSeeder() {
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

  console.log('🌱 Starting Vendor & Provider Shop Location Seeder...');

  // 1. Seed Providers (Grooming, Daycare, Clinic, Memorial, Events)
  const providers = await Provider.find({});
  let updatedProviders = 0;

  for (let i = 0; i < providers.length; i++) {
    const p = providers[i];
    const locPreset = CITY_LOCATIONS[i % CITY_LOCATIONS.length];
    const offsetLat = ((i * 11) % 60 - 30) / 1000;
    const offsetLng = ((i * 17) % 60 - 30) / 1000;

    const lat = Math.round((locPreset.lat + offsetLat) * 10000) / 10000;
    const lng = Math.round((locPreset.lng + offsetLng) * 10000) / 10000;
    const shopCity = locPreset.city;
    const shopAddress = locPreset.address;

    await Provider.findByIdAndUpdate(p._id, {
      $set: {
        city: shopCity,
        address: shopAddress,
        distanceText: locPreset.locality,
        state: locPreset.state,
        pincode: locPreset.pincode,
        geoCoords: { lat, lng },
        location: { type: 'Point', coordinates: [lng, lat] },
      },
    });
    updatedProviders++;
  }
  console.log(`✅ Updated ${updatedProviders} Provider shop documents with real coordinates.`);

  // 2. Seed VendorProfiles
  const vendorProfiles = await VendorProfile.find({});
  let updatedProfiles = 0;

  for (let i = 0; i < vendorProfiles.length; i++) {
    const vp = vendorProfiles[i];
    const locPreset = CITY_LOCATIONS[i % CITY_LOCATIONS.length];
    const offsetLat = ((i * 7) % 40 - 20) / 1000;
    const offsetLng = ((i * 13) % 40 - 20) / 1000;

    const lat = Math.round((locPreset.lat + offsetLat) * 10000) / 10000;
    const lng = Math.round((locPreset.lng + offsetLng) * 10000) / 10000;

    await VendorProfile.findByIdAndUpdate(vp._id, {
      $set: {
        city: vp.city || locPreset.city,
        address: vp.address || locPreset.address,
        state: locPreset.state,
        location: { lat, lng },
      },
    });
    updatedProfiles++;
  }
  console.log(`✅ Updated ${updatedProfiles} VendorProfile documents with real shop coordinates.`);

  if (localConnection) {
    await mongoose.disconnect();
  }
  console.log('🎉 Vendor Shop Location Seeding Complete!');
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('seedVendorLocations.js')) {
  runVendorLocationSeeder()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeder error:', err);
      process.exit(1);
    });
}
