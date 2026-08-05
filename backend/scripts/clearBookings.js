import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb+srv://tailcircledev_db_user:appzeto@cluster0.sk129tt.mongodb.net/tailcircle';

async function clearData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!');

    const bookingRes = await mongoose.connection.collection('bookings').deleteMany({});
    console.log(`Deleted ${bookingRes.deletedCount} bookings.`);

    const consultRes = await mongoose.connection.collection('consultcalls').deleteMany({});
    console.log(`Deleted ${consultRes.deletedCount} consult calls.`);

    console.log('Database successfully cleared for testing from scratch!');
  } catch (err) {
    console.error('Error clearing database:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

clearData();
