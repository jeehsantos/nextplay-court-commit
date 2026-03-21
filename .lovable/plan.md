

## Problem

After Stripe confirms payment in the deferred (`at_booking`) flow, the webhook never fires (no webhook logs exist), so no session/payment records are created. The `verify-payment` function keeps returning `paid_but_waiting_for_webhook`, and after 2 minutes the page shows "Payment Received" — but no game exists. The message is misleading and the booking is lost.

## Root Cause

The Stripe webhook is not reaching the edge function (likely a webhook endpoint configuration issue on the Stripe dashboard, or the deployed function is stale). The `verify-payment` function has no fallback — it only reads data, never creates records.

## Solution

Add a **fallback record-creation path** inside `verify-payment` for the deferred flow. When Stripe confirms `payment_status === "paid"` but no payment row exists after several polls, `verify-payment` will create the session, player, court_availability, and payment records itself — exactly like `handleDeferredSessionPayment` in the webhook does.

### Changes

| File | Change |
|------|--------|
| `supabase/functions/verify-payment/index.ts` | In `handleDeferredVerification`, after confirming Stripe shows `paid` and no DB record exists, extract metadata from the checkout session and create all deferred records (session, session_player, court_availability, payment). Return `completed` status so the frontend redirects to the game. |
| `src/pages/PaymentSuccess.tsx` | Pass a `pollCount` in the request body so `verify-payment` knows when to trigger the fallback (e.g., after poll #10 = 20 seconds). Update `payment_received` status handler to also try navigating to the game if a `sessionId` was resolved. |
| Redeploy | Redeploy `verify-payment` and `stripe-webhook` to ensure both are in sync. |

### Technical Details

**verify-payment fallback logic (handleDeferredVerification):**
```text
1. Retrieve Stripe checkout session
2. If payment_status === "paid" AND no payment row in DB:
   a. Check if pollCount >= 10 (client passes this)
   b. Read metadata from checkout session (group_id, court_id, etc.)
   c. Use advisory lock on court_id to prevent double-creation
   d. Re-check for existing payment (idempotency)
   e. Create session, session_player, court_availability, payment
   f. Process referral, recalculate session
   g. Return { status: "completed", sessionId }
3. If pollCount < 10, return paid_but_waiting_for_webhook (give webhook a chance first)
```

This ensures:
- The webhook still has priority (first 20 seconds)
- If the webhook fails/never arrives, verify-payment creates the records as fallback
- Idempotency is maintained via payment_intent_id checks
- The user sees "Payment Successful" and gets redirected to their game

