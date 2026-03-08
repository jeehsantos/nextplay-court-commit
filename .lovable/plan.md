

## Problem Analysis

The `create-quick-challenge` function has a regression in how it handles `before_session` courts. Currently:

1. Court has `payment_timing: before_session` with `payment_hours_before: 22`
2. When the session is far enough in the future, `effectivePaymentTiming` stays `before_session`
3. The challenge is created with `status: "open"` and the court slot is marked `is_booked: true` **immediately** — before any payment
4. If the organizer never pays, the slot stays blocked

The `at_booking` flow correctly uses `status: "pending_payment"` and `is_booked: false`, deferring the slot reservation until payment. But `before_session` bypasses this entirely.

For Quick Challenges specifically, the organizer should always pay upfront (the court cost is committed at creation time), regardless of the court's `payment_timing` setting. This differs from group bookings where `before_session` makes sense because a group organizer collects from members over time.

## Plan

### 1. Fix `create-quick-challenge/index.ts` — Always require upfront payment

For Quick Challenges, force `effectivePaymentTiming` to always be `at_booking`:

- Remove the `before_session` conditional logic that lets challenges be created without payment
- Set `initialStatus = "pending_payment"` always (when price > 0)
- Set `is_booked: false` always — the webhook will flip to `true` on payment
- Keep the challenge row and player row creation (they're needed for the payment flow), but the `pending_payment` status hides the challenge from public discovery

### 2. Fix `stripe-webhook/index.ts` — Mark slot as booked on payment

In `handleQuickChallengePayment`, after confirming payment, update the `court_availability` row:

- Set `is_booked: true` and `payment_status: "completed"` on the court slot matching the challenge's court/date/time
- This mirrors what the deferred session payment handler already does

### 3. Fix `cancel-quick-challenge/index.ts` — Release slot on cancellation

Verify that when a `pending_payment` challenge is cancelled (or expires), the court slot is properly released. Since `is_booked` will now be `false` until payment, no slot release is needed for unpaid challenges — but the `court_availability` row itself should be cleaned up.

### Technical Details

**`create-quick-challenge/index.ts`** changes:
- Remove the `before_session` override logic (lines 111-118)
- Always set `initialStatus = "pending_payment"` and `is_booked = false` for paid challenges
- The `effectivePaymentType` logic for forcing `single` stays (organizer pays all for at_booking)

**`stripe-webhook/index.ts`** changes in `handleQuickChallengePayment`:
- After marking player as paid, update `court_availability` to `is_booked: true, payment_status: "completed"` using challenge metadata (court_id, date, time)
- Add `court_id`, `scheduled_date`, `scheduled_time`, `end_time` to checkout metadata in `create-quick-challenge-payment`

**`create-quick-challenge-payment/index.ts`** changes:
- Add challenge's court/date/time details to Stripe checkout metadata so the webhook can identify the court_availability row

