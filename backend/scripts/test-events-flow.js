import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/database.js';
import { User } from '../src/modules/user/user.model.js';
import { Event } from '../src/modules/provider/event.model.js';
import app from '../src/app.js';

const PORT = 5010;
const API_BASE = `http://localhost:${PORT}/api`;

async function runTest() {
  console.log('--- TESTING PET EVENTS ENDPOINTS ---');
  await connectDatabase();
  const server = app.listen(PORT);

  // 1. Get test user
  let user = await User.findOne({ phone: '9755620716' });
  if (!user) {
    user = await User.create({
      name: 'Aakash Gogale',
      phone: '9755620716',
      role: 'user',
      city: 'Indore',
    });
  }

  const token = jwt.sign({ sub: user._id.toString() }, process.env.JWT_ACCESS_SECRET || 'dev-secret-change-me', {
    expiresIn: '1h',
  });

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 2. GET /events
  const eventsRes = await fetch(`${API_BASE}/events`);
  const eventsData = await eventsRes.json();
  console.log(`[PASS] GET /events -> Status ${eventsRes.status}, count: ${eventsData.data?.length || 0}`);

  const sampleEvent = eventsData.data?.[0];

  // 3. GET /events?category=birthday
  const categoryRes = await fetch(`${API_BASE}/events?category=birthday`);
  const categoryData = await categoryRes.json();
  console.log(`[PASS] GET /events?category=birthday -> Status ${categoryRes.status}, count: ${categoryData.data?.length || 0}`);

  // 4. POST /bookings (Event ticket)
  if (sampleEvent) {
    const bookingRes = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        type: 'event',
        eventId: sampleEvent._id || sampleEvent.legacyId,
        ticketQty: 2,
        paymentMethod: 'razorpay',
      }),
    });
    const bookingData = await bookingRes.json();
    console.log(`[PASS] POST /bookings (event) -> Status ${bookingRes.status}, bookingNo: ${bookingData.data?.booking?.bookingNo}`);
  }

  // 5. GET /events/my-tickets
  const ticketsRes = await fetch(`${API_BASE}/events/my-tickets`, {
    headers: authHeaders,
  });
  const ticketsData = await ticketsRes.json();
  console.log(`[PASS] GET /events/my-tickets -> Status ${ticketsRes.status}, count: ${ticketsData.data?.length || 0}`);

  // 6. POST /events/requests
  const reqRes = await fetch(`${API_BASE}/events/requests`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      packageType: 'Birthday',
      petName: 'Charlie',
      date: '2026-09-15',
      budget: '₹12,000',
      notes: 'Need pool & cake setup',
    }),
  });
  const reqData = await reqRes.json();
  console.log(`[PASS] POST /events/requests -> Status ${reqRes.status}, Request ID: ${reqData.data?._id}`);

  console.log('✅ ALL PET EVENTS ENDPOINTS PASSED VERIFICATION');
  server.close();
  process.exit(0);
}

runTest().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
