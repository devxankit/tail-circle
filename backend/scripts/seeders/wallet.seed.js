import { User } from '../../src/modules/user/user.model.js';
import { Wallet, WalletTransaction } from '../../src/modules/wallet/wallet.models.js';
import { Notification } from '../../src/modules/notification/notification.model.js';

/**
 * Wallet + notifications mock, reproduced verbatim for the demo user so the
 * wired UI is pixel-identical to the retired localStorage version.
 *
 *   balance ₹124.50  → 12450 paise
 *   txns (newest→oldest): Purchase -45.99, Added +100.00, Dr. Sarah -60.00
 *
 * balanceAfter runs backwards from the final balance to keep the ledger chain
 * self-consistent: start 13049 → −6000 → +10000 → −4599 = 12450.
 */
const DEMO_PHONE = '+919000000001';

// oldest → newest so createdAt + balanceAfter line up naturally.
function txnFixtures(now) {
  const today1042 = new Date(now);
  today1042.setHours(10, 42, 0, 0);
  const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
  const oct15 = new Date('2025-10-15T12:00:00');

  return [
    { seedKey: 'demo:txn:drsarah', title: 'Dr. Sarah Jenkins', icon: '🩺', type: 'debit', purpose: 'merchant_pay', amount: 6000, balanceAfter: 7049, createdAt: oct15 },
    { seedKey: 'demo:txn:added', title: 'Added Money', icon: '💳', type: 'credit', purpose: 'topup', amount: 10000, balanceAfter: 17049, createdAt: yesterday },
    { seedKey: 'demo:txn:tailshop', title: 'Purchase at TailShop', icon: '🛍️', type: 'debit', purpose: 'merchant_pay', amount: 4599, balanceAfter: 12450, createdAt: today1042 },
  ];
}

function notificationFixtures(now) {
  const h = (n) => new Date(now.getTime() - n * 3600 * 1000);
  return [
    { seedKey: 'demo:notif:appt', title: 'Upcoming Appointment', body: 'Max has a vet checkup with Dr. Sarah tomorrow at 10 AM.', type: 'vet', link: '/app/profile/bookings', read: false, createdAt: h(2) },
    { seedKey: 'demo:notif:order', title: 'Order Shipped!', body: 'Your TailShop order #4829 has been shipped.', type: 'shop', link: '/app/profile/orders', read: false, createdAt: h(5) },
    { seedKey: 'demo:notif:match', title: 'New Match!', body: 'Luna liked Max back. Say hi!', type: 'match', link: '/app/chat/room', read: true, createdAt: h(24) },
  ];
}

export async function seedWallet() {
  const user = await User.findOne({ phone: DEMO_PHONE });
  if (!user) return 'skipped — demo user not found (run demoUser seeder first)';

  const wallet = await Wallet.findOneAndUpdate(
    { userId: user._id },
    { $set: { balance: 12450, currency: 'INR', status: 'active' } },
    { upsert: true, new: true }
  );

  const now = new Date();
  for (const t of txnFixtures(now)) {
    await WalletTransaction.updateOne(
      { seedKey: t.seedKey },
      {
        $set: {
          walletId: wallet._id,
          userId: user._id,
          type: t.type,
          purpose: t.purpose,
          amount: t.amount,
          balanceAfter: t.balanceAfter,
          title: t.title,
          icon: t.icon,
          status: 'success',
          createdAt: t.createdAt,
          seedKey: t.seedKey,
        },
      },
      { upsert: true, timestamps: false }
    );
  }

  for (const n of notificationFixtures(now)) {
    await Notification.updateOne(
      { seedKey: n.seedKey },
      {
        $set: {
          userId: user._id,
          title: n.title,
          body: n.body,
          type: n.type,
          link: n.link,
          read: n.read,
          createdAt: n.createdAt,
          seedKey: n.seedKey,
        },
      },
      { upsert: true, timestamps: false }
    );
  }

  return `wallet ₹124.50 + 3 txns + 3 notifications ready for demo user ${user._id}`;
}
