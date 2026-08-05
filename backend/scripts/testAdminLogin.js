import mongoose from 'mongoose';
import { adminPasswordLogin } from '../src/modules/admin/admin.auth.service.js';

const MONGODB_URI = 'mongodb+srv://tailcircledev_db_user:appzeto@cluster0.sk129tt.mongodb.net/tailcircle';

async function testLogin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!');

    const res = await adminPasswordLogin('admin@tailcircle.com', 'admin123');
    console.log('Login successful! Result:', {
      user: res.user,
      accessTokenPresent: Boolean(res.tokens?.accessToken),
    });
  } catch (err) {
    console.error('Login failed with error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testLogin();
