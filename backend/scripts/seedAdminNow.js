import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = 'mongodb+srv://tailcircledev_db_user:appzeto@cluster0.sk129tt.mongodb.net/tailcircle';

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String,
  adminRole: String,
  permissions: [String],
  passwordHash: String,
  isPhoneVerified: Boolean,
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function seedAdminNow() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!');

    const email = 'admin@tailcircle.com';
    const password = 'admin123';
    const passwordHash = await bcrypt.hash(password, 10);

    const admin = await User.findOneAndUpdate(
      { email },
      {
        $set: {
          name: 'System Admin',
          role: 'admin',
          adminRole: 'super',
          permissions: ['*'],
          passwordHash,
          isPhoneVerified: true,
        },
      },
      { upsert: true, new: true }
    );

    console.log(`Admin account ${admin.email} successfully seeded/ensured!`);
  } catch (err) {
    console.error('Error seeding admin:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedAdminNow();
