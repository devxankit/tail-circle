/**
 * Reconcile each event's `sold` counter with the tickets that actually exist.
 *
 * Ticket sales used to run through an incomplete branch that never touched
 * `sold`, so the counter drifted from reality — some events showed sales that
 * were never made, others showed none despite real bookings. `sold` now gates
 * capacity, so a wrong value either blocks a sellable event or lets one
 * oversell. This recounts from the bookings themselves.
 */
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { Event } from '../../src/modules/provider/event.model.js';
import { Booking } from '../../src/modules/booking/booking.model.js';

/** Statuses that still hold a seat. */
const HOLDS_A_SEAT = { $nin: ['cancelled', 'refunded', 'pending_payment', 'no_show'] };

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  const events = await Event.find().select('title capacity sold');
  console.log(`${events.length} events\n`);

  let fixed = 0;
  let ok = 0;

  for (const event of events) {
    const bookings = await Booking.find({
      type: 'event',
      eventId: event._id,
      status: HOLDS_A_SEAT,
    }).select('meta items');

    const real = bookings.reduce(
      (sum, b) => sum + (b.meta?.ticketQty || b.items?.find((i) => i.kind === 'ticket')?.qty || 1),
      0
    );

    if ((event.sold || 0) === real) {
      console.log(`  == ${event.title.slice(0, 30).padEnd(32)} sold ${real} — correct`);
      ok += 1;
      continue;
    }

    // Never leave an event oversold on paper: if real demand somehow exceeds
    // capacity, raise capacity to match rather than reject existing ticket
    // holders who already paid.
    const update = { sold: real };
    if (real > event.capacity) update.capacity = real;

    await Event.updateOne({ _id: event._id }, { $set: update });
    console.log(
      `  ++ ${event.title.slice(0, 30).padEnd(32)} sold ${event.sold} -> ${real}` +
      (update.capacity ? ` (capacity raised to ${real})` : '')
    );
    fixed += 1;
  }

  console.log(`\n${fixed} reconciled, ${ok} already correct`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
