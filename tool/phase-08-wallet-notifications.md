# Phase 8 — Wallet & Notifications (FCM)

**Goal:** real wallet ledger with Razorpay top-ups and pay/send flows; unified
notification system (in-app + Firebase push) replacing localStorage wallet and
hardcoded notification lists.

**Status: ✅ Done (18/18 checks pass)** · Depends on: Phase 3 (payments)

> Built: Wallet (integer-paise balance + append-only WalletTransaction ledger with
> running `balanceAfter`), `applyEntry` primitive (partial-unique `idempotencyKey`
> reserved before an atomic guarded `$inc` — no double-credit / no overdraw),
> `wallet_topup` purpose handler (amount validated/clamped ₹1–₹1,00,000), atomic
> two-leg send-money (real user by phone, or demo contact by name), scan & pay.
> Notifications via a single `notify()` fan-out (Mongo doc → `notification:new`
> socket → FCM push), list/unread-count/read/read-all routes, backfilled into
> order-placed / booking-confirmed / new-match. Frontend wired (Wallet, Notifications,
> both header badges, Profile balance); localStorage `tailcircle_wallet_*` retired.
> Seeded demo wallet ₹124.50 + 3 txns + 3 notifications. `scripts/phase8-check.js`.

## Frontend screens covered
`wallet/Wallet.jsx` (balance, add money, send to contact, scan & pay),
`notifications/Notifications.jsx`, notification badges in `TopHeader`/`DashboardHeader`

## Models
- **Wallet**: `{ userId (unique), balance (paise), currency: INR, status: active|frozen }`
- **WalletTransaction**: `{ walletId, userId, type: credit|debit, purpose: topup|order_payment|booking_payment|refund|transfer_in|transfer_out|merchant_pay, amount, balanceAfter, refType/refId, counterparty { userId|merchantId, name }, note, icon, status: pending|success|failed, idempotencyKey (unique) }` — index walletId+createdAt
- **Notification**: `{ userId, title, body, type: vet|shop|match|booking|wallet|system, link (deep link path), data {}, read, pushedAt }` — index userId+read+createdAt

## Endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | /wallet | auth | balance + recent transactions |
| GET | /wallet/transactions | auth | paginated ledger |
| POST | /wallet/topup | auth | Razorpay order (purpose wallet_topup); credit on webhook |
| POST | /wallet/transfer | auth | send to another user (phone lookup); atomic two-leg transaction |
| POST | /wallet/pay | auth | scan & pay a merchant/vendor |
| GET | /notifications | auth | list + unread count |
| POST | /notifications/read-all · /:id/read | auth | |

**Notification service** (`src/services/notify.js`): single entry point
`notify(userId, { title, body, type, link, data })` → writes Notification doc,
emits Socket.IO `notification:new` to `user:<id>`, sends FCM to registered tokens.
All other modules (orders, bookings, matches, deliveries, adoption) call this.

## Tasks
- [ ] Wallet + ledger modules; every balance change goes through one service function with an idempotency key (webhook retries safe)
- [ ] Top-up via payment dispatcher; refunds from orders/bookings can credit wallet
- [ ] Transfer/pay with atomic session transaction, insufficient-funds guard
- [ ] Notification model + `notify()` service + FCM sending with token cleanup on invalid-token errors
- [ ] Backfill notify() calls into Phases 3–7 event points (order shipped, booking confirmed, match, delivery out)
- [ ] **Frontend:** Wallet screen fully API-backed (remove localStorage); Notifications screen + header badge from API; FCM web/app token registration + foreground handler
- [ ] Optional: wallet as a payment method at checkout (combined wallet+gateway)
- [ ] Seed: `scripts/seeders/wallet.seed.js` (registered as `wallet`) — migrates the demo wallet balance + transaction history and sample notifications currently hardcoded/in localStorage, so the Wallet & Notifications screens render identically. **Mock retired after verify:** localStorage `tailcircle_wallet_*` keys, hardcoded transaction/notification arrays in `Wallet.jsx` / `Notifications.jsx`

- [ ] UI audit: all covered screens + shared components mock-free (localStorage/mock-import grep)

## Security notes
- Ledger is append-only; balance always derived/validated against `balanceAfter` chain
- Transfers require verified phone target; rate-limit transfer/pay endpoints
- Idempotency keys on all credit operations (webhook double-fire safe)
- Never expose other users' wallet existence beyond name confirmation

## Exit criteria
Top-up with test payment reflects in balance; send + scan&pay move money atomically;
an order status change produces an in-app notification, a socket event, and an FCM push.
