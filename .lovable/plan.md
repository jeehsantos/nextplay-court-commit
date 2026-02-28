

## Plan: Defer Session Creation to Webhook for At-Booking Courts

### Problem
Currently, `create-booking` immediately inserts into `sessions`, `session_players`, and `court_availability` even for `at_booking` courts. If the user cancels at Stripe, these orphaned records must be cleaned up by frontend redirects or cron jobs — fragile and wasteful.

### Approach
For `at_booking` courts, **do not create any session records** until the Stripe webhook confirms payment. The booking hold (already in `booking_holds` table) protects the slot during checkout. The webhook then creates the session, session_players, and court_availability records atomically.

### Changes

**1. `create-booking` edge function** — Split behavior by payment timing:
- For `at_booking` courts: validate inputs, calculate pricing, but **skip all DB inserts** (no session, no session_players, no court_availability). Return pricing info + a `deferred: true` flag. The existing booking hold already protects the slot.
- For non-at_booking courts: keep current behavior unchanged.

**2. `create-payment` edge function** — For at_booking deferred flow:
- Accept booking details (groupId, courtId, date, time, duration, etc.) directly instead of requiring a sessionId.
- Store all booking details in Stripe checkout metadata so the webhook can create the records later.
- Skip the `payments` table upsert (no session exists yet).
- The hold_id should also be passed and stored in metadata.

**3. `stripe-webhook` (`handleSessionPayment`)** — For deferred bookings:
- Detect deferred flow via a metadata flag (e.g., `deferred: "true"`).
- Create the session, session_players, court_availability, and payment records atomically.
- Convert the booking hold to `CONVERTED` status.
- Run referral credit + session confirmation logic as before.

**4. Frontend `CourtDetail.tsx`** — For at_booking flow:
- After `create-booking` returns with `deferred: true`, call `create-payment` with the booking details (not a sessionId).
- Remove the `cancelled_session` cleanup logic for at_booking (no session exists to cancel).
- The hold automatically expires if the user abandons checkout.

**5. `PaymentSuccess.tsx`** — For at_booking:
- Change redirect from `/home` to `/games/${sessionId}` (the sessionId will come from webhook-created metadata, passed back via verify-payment).

**6. `cancel-expired-bookings` cron** — No changes needed for normal sessions since no records are created. The booking hold expires naturally.

**7. No database migration needed** — The `session_state` enum does not need `pending_payment` since sessions are never created in that state.

### Files to modify
1. `supabase/functions/create-booking/index.ts` — Skip inserts for at_booking, return pricing only
2. `supabase/functions/create-payment/index.ts` — Accept booking details for deferred flow, store in Stripe metadata
3. `supabase/functions/stripe-webhook/index.ts` — Create session records on payment confirmation for deferred bookings
4. `src/pages/CourtDetail.tsx` — Pass booking details to create-payment for at_booking flow
5. `src/pages/PaymentSuccess.tsx` — Redirect to game page for at_booking

### Safety
- The booking hold (10 min) prevents double-booking during checkout
- If hold expires before payment completes, the webhook should re-validate slot availability before creating records
- No orphaned records possible — records only exist after confirmed payment
- Non-at_booking flow is completely untouched

