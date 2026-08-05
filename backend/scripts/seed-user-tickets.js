import { connectDatabase } from '../src/config/database.js';
import { User } from '../src/modules/user/user.model.js';
import { Event } from '../src/modules/provider/event.model.js';
import { Booking } from '../src/modules/booking/booking.model.js';

async function seedUserTickets() {
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

  const events = await Event.find({ status: 'published' }).limit(2);

  if (events.length > 0) {
    await Booking.findOneAndUpdate(
      { bookingNo: 'TCG81025068' },
      {
        $set: {
          bookingNo: 'TCG81025068',
          userId: user._id,
          type: 'event',
          eventId: events[0]._id,
          ticketQty: 2,
          amount: (events[0].price || 699) * 2,
          currency: 'INR',
          status: 'confirmed',
          paymentStatus: 'paid',
          paymentMethod: 'razorpay',
          meta: { eventTitle: events[0].title },
        },
      },
      { upsert: true }
    );
  }

  if (events.length > 1) {
    await Booking.findOneAndUpdate(
      { bookingNo: 'TCG44879617' },
      {
        $set: {
          bookingNo: 'TCG44879617',
          userId: user._id,
          type: 'event',
          eventId: events[1]._id,
          ticketQty: 1,
          amount: events[1].price || 499,
          currency: 'INR',
          status: 'confirmed',
          paymentStatus: 'paid',
          paymentMethod: 'razorpay',
          meta: { eventTitle: events[1].title },
        },
      },
      { upsert: true }
    );
  }

  console.log(`✅ Seeded event passes for phone ${user.phone}`);
  process.exit(0);
}

seedUserTickets().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
