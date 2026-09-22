# TailCircle — Permissions Matrix

*Section 6 of the pre-launch audit. Last verified against the code on 19 September 2026.*

This documents what each role can actually do, as enforced in the code — not as
intended. Every claim below was checked against the route guards in
`backend/src/modules/admin/admin.routes.js`, `vendor.routes.js` and
`middleware/auth.js`.

---

## Roles

| Role | Who | How enforced |
|---|---|---|
| **Customer** (`user`) | Pet owners using the app | `authenticate` — owns-the-record checks on every query (`{ _id, userId }`) |
| **Partner** (`vendor`) | Service providers and sellers | `authenticate` + `authorize('vendor')` + `withVendor` (requires an **approved** business line) |
| **Admin** (`admin`) | Tail Circle operations staff | `authenticate` + `authorize('admin')` |
| **Super Admin** (`adminRole: 'super'`) | Founders / finance leads | The `superOnly` guard on top of admin |

A partner account may run several business lines. Every partner request
resolves *which* line it is acting as, from the route or the `X-Vendor-Type`
header. A suspended line cannot trade, but the account can still sign in — so a
partner running grooming and daycare keeps the daycare open when grooming is
suspended.

---

## Bookings

| Action | Customer | Partner | Admin | Super | Logged |
|---|:--:|:--:|:--:|:--:|:--:|
| View own bookings | ✅ own only | ✅ own work only | ✅ all | ✅ | — |
| Create a booking | ✅ | ❌ | ❌ | ❌ | Timeline |
| Accept / decline a request | ❌ | ✅ own work | ❌ | ❌ | Timeline + audit |
| Reschedule | ✅ own, in policy | ❌ | ❌ | ❌ | Timeline |
| Cancel | ✅ own, in policy | ✅ own work | ✅ any | ✅ | Timeline + audit |
| Mark started / completed / no-show | ❌ | ✅ own work | ✅ any | ✅ | Timeline + audit |
| Override status outside the lifecycle | ❌ | ❌ | ✅ with `force` | ✅ | **Audit, flagged as forced** |
| Raise a dispute | ✅ own | ✅ own work | ✅ on behalf | ✅ | Timeline + audit |
| Resolve a dispute | ❌ | ❌ | ✅ | ✅ | Audit |

**Notes**

- A partner cancelling **always** refunds the customer in full and records a
  compliance violation. They cannot cancel without the refund.
- Status changes are validated against one shared transition table
  (`BOOKING_TRANSITIONS`). Illegal jumps are refused for everyone; Admin can
  override, but that path is separately audited as `booking.status_force`.
- Every cancellation records `cancelledBy` (customer / vendor / admin / system)
  and a written reason.

---

## Money

| Action | Customer | Partner | Admin | Super | Logged |
|---|:--:|:--:|:--:|:--:|:--:|
| Pay | ✅ | ❌ | ❌ | ❌ | Payment record |
| Trigger own refund by cancelling in policy | ✅ | ❌ | ❌ | ❌ | Refund record |
| Issue a refund directly | ❌ | ❌ | ✅ reason required | ✅ | **Audit + Refund record** |
| Issue a *partial* refund | ❌ | ❌ | ✅ | ✅ | Audit + Refund record |
| Retry a failed refund | ❌ | ❌ | ✅ | ✅ | Audit |
| Approve a return (refunds the customer) | ❌ | ❌ | ✅ | ✅ | Audit |
| Request a payout | ❌ | ✅ own | ❌ | ❌ | Payout record |
| Mark a payout paid | ❌ | ❌ | ✅ | ✅ | Audit |
| Adjust a wallet balance | ❌ | ❌ | ✅ | ✅ | Audit |
| Set commission (global / category) | ❌ | ❌ | ❌ | ✅ **super only** | Audit |
| Set commission for one partner | ❌ | ❌ | ❌ | ✅ **super only** | Audit |
| Set tax rate and commission bounds | ❌ | ❌ | ❌ | ✅ **super only** | Audit |
| View reconciliation report | ❌ | ❌ | ✅ | ✅ | — |

**Notes**

- No role can refund more than a payment's remaining balance. The guard is an
  atomic database reservation, so two admins clicking at once cannot both
  succeed.
- Every refund reverses the partner's earning proportionally. Nobody can refund
  a customer and leave the partner paid.
- Disputed bookings are **held back from payout automatically**. No role can
  release them except by resolving the dispute.
- Commission rates are **super-admin only**. An ops admin can see them and
  cannot change them.

---

## Partners

| Action | Customer | Partner | Admin | Super | Logged |
|---|:--:|:--:|:--:|:--:|:--:|
| Register a business line | — | ✅ | ❌ | ❌ | — |
| Edit own profile / bank / documents | ❌ | ✅ own | ❌ | ❌ | — |
| Approve a partner | ❌ | ❌ | ✅ | ✅ | Audit |
| Approve with incomplete KYC | ❌ | ❌ | ✅ `force` | ✅ | **Audit, flagged as forced** |
| Reject / suspend / reinstate | ❌ | ❌ | ✅ | ✅ | Audit |
| Verify KYC documents | ❌ | ❌ | ✅ | ✅ | Audit |
| Switch manual booking acceptance on/off | ❌ | ❌ | ✅ | ✅ | Audit |
| View own compliance standing | ❌ | ✅ own | ✅ all | ✅ | — |
| Record a violation by hand | ❌ | ❌ | ✅ | ✅ | Audit |
| Forgive / uphold a violation | ❌ | ❌ | ✅ | ✅ | Audit |
| Change the compliance policy | ❌ | ❌ | ✅ | ✅ | Audit |

**Note** — a **suspended** partner can still sign in and read their Service
Standing page. That is deliberate: suspending someone and then hiding the reason
from them would be indefensible.

---

## Platform & data

| Action | Customer | Partner | Admin | Super | Logged |
|---|:--:|:--:|:--:|:--:|:--:|
| Block / unblock a customer | ❌ | ❌ | ✅ | ✅ | Audit |
| Moderate posts and reviews | ❌ | ❌ | ✅ | ✅ | Audit |
| Manage catalogue (products, plans, breeds) | ❌ | ✅ own listings | ✅ all | ✅ | Audit |
| Broadcast a notification | ❌ | ❌ | ✅ | ✅ | Audit |
| View customer activity / behaviour | ❌ | ❌ | ✅ | ✅ | — |
| **Change platform settings** | ❌ | ❌ | ❌ | ✅ **super only** | Audit |
| **View the audit log** | ❌ | ❌ | ❌ | ✅ **super only** | — |
| **Create / edit / remove admin staff** | ❌ | ❌ | ❌ | ✅ **super only** | Audit |

---

## Who made the change?

Every mutating admin action writes an `AuditLog` row containing:

`actorId` · `actorName` · `action` · `targetType` · `targetId` · `before` ·
`after` · `ip` · `at`

It is **append-only** — there is no code path that updates or deletes an audit
row — and readable only by a super admin.

Separately, booking and order timelines carry `by`, `byId` and `byName` on every
entry, so the customer-visible history also shows who acted. Before this, a
timeline read as a list of things that happened to nobody in particular.

---

## Known gaps

Stated plainly rather than left for someone to discover.

1. **`adminRole` is coarse.** Only `super` is enforced. The other roles
   (`ops`, `finance`, `support`, `moderator`) are stored on the staff record and
   a `permissions` array exists, but **no route checks them** — any admin who is
   not super has identical rights to every other non-super admin. Finer-grained
   roles are a follow-up.
2. **No IP or device restriction** on admin sign-in.
3. **No two-person rule** on large refunds. A single admin can refund any
   amount, subject only to the payment balance.
4. **Customers cannot export or delete their own account data** beyond the
   analytics withdrawal on the Privacy screen.

---

## How to re-verify this document

```bash
# Every super-admin-only route
grep -n "superOnly" backend/src/modules/admin/admin.routes.js

# Role guards across the API
grep -rn "authorize(" backend/src/modules --include=*.routes.js

# Everything that writes an audit entry
grep -rn "writeAudit(" backend/src/modules --include=*.js
```
