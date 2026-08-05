import { connectDatabase } from '../src/config/database.js';
import { User } from '../src/modules/user/user.model.js';
import { AdoptionListing } from '../src/modules/adoption/adoption.models.js';

async function seedUserAdoptions() {
  await connectDatabase();

  let user = await User.findOne({ phone: '9755620716' });
  if (!user) {
    user = await User.create({
      name: 'Aakash Gogale',
      phone: '9755620716',
      role: 'user',
      city: 'Indore',
    });
  }

  const userPets = [
    {
      legacyId: 'ADOPT-USER-SEEDED-01',
      postedBy: user._id,
      name: 'Charlie',
      type: 'Dog',
      breed: 'Golden Retriever',
      age: '5 Months',
      gender: 'Male',
      price: 0,
      distance: '1.2 km away',
      weight: 'Medium (14 kg)',
      location: 'Indore, Vijay Nagar',
      vaccinated: true,
      dewormed: true,
      neutered: false,
      images: [
        'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=500&q=80',
        'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=500&q=80',
      ],
      about: 'Charlie is a playful 5-month-old Golden Retriever puppy. Loves playing fetch and is very gentle with kids!',
      traits: ['Playful', 'Friendly', 'Good with Kids', 'House Trained'],
      contactPhone: '9755620716',
      contactEmail: 'aakash@tailcircle.com',
      status: 'Available',
      shelter: {
        name: user.name,
        verified: true,
        image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      },
    },
    {
      legacyId: 'ADOPT-USER-SEEDED-02',
      postedBy: user._id,
      name: 'Bella',
      type: 'Dog',
      breed: 'Labrador Retriever',
      age: '1 Year',
      gender: 'Female',
      price: 0,
      distance: '2.5 km away',
      weight: 'Large (22 kg)',
      location: 'Indore, Palasia',
      vaccinated: true,
      dewormed: true,
      neutered: true,
      images: [
        'https://images.unsplash.com/photo-1534361960057-19889db9621e?auto=format&fit=crop&w=500&q=80',
        'https://images.unsplash.com/photo-1591768793355-74d71896088a?auto=format&fit=crop&w=500&q=80',
      ],
      about: 'Bella is a sweet and calm Labrador Retriever. She is fully vaccinated, spayed, and looking for a loving family.',
      traits: ['Calm', 'Affectionate', 'Intelligent'],
      contactPhone: '9755620716',
      contactEmail: 'aakash@tailcircle.com',
      status: 'Available',
      shelter: {
        name: user.name,
        verified: true,
        image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      },
    },
    {
      legacyId: 'ADOPT-USER-SEEDED-03',
      postedBy: user._id,
      name: 'Milo',
      type: 'Dog',
      breed: 'Beagle',
      age: '8 Months',
      gender: 'Male',
      price: 0,
      distance: '3.0 km away',
      weight: 'Medium (10 kg)',
      location: 'Indore, Saket',
      vaccinated: true,
      dewormed: true,
      neutered: false,
      images: [
        'https://images.unsplash.com/photo-1505628346881-b72b27e84530?auto=format&fit=crop&w=500&q=80',
      ],
      about: 'Milo is a curious and energetic Beagle who loves outdoor walks.',
      traits: ['Curious', 'Energetic', 'Friendly'],
      contactPhone: '9755620716',
      contactEmail: 'aakash@tailcircle.com',
      status: 'Adopted',
      shelter: {
        name: user.name,
        verified: true,
        image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      },
    },
  ];

  for (const item of userPets) {
    await AdoptionListing.findOneAndUpdate(
      { legacyId: item.legacyId },
      { $set: item },
      { upsert: true, returnDocument: 'after' }
    );
  }

  console.log(`✅ Seeded ${userPets.length} user adoption listings for phone ${user.phone}`);
  process.exit(0);
}

seedUserAdoptions().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
