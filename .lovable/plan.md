

## Problem

The `checkout.session.completed` webhook returns 500 across **all** payment types (quick challenges AND regular/deferred session bookings). The root cause is a **race condition between the webhook and the verify-payment/verify-quick-challenge-payment fallback functions**.

### How the race works

Both the Stripe webhook and the verify fallback run concurrently after payment. Both check for existing records, find none, then try to create the same records. The second writer hits a unique constraint violation and throws an uncaught error → 500.

**For deferred session bookings (`at_booking` payment timing):**
1. Webhook `handleDeferredSessionPayment` checks for existing payment by `stripe_payment_intent_id` → finds none
2. `verify-payment` fallback `createDeferredRecordsFallback` also checks → finds none
3. Both create separate sessions, court_availability rows, and payment records
4. The payment `INSERT` from whichever runs second fails on the unique partial index `idx_payments_stripe_pi_unique` → the webhook throws `WebhookProcessingError` → returns 500

**For quick challenges:**
1. Webhook `handleQuickChallengePayment` does SELECT on `quick_challenge_payments` → finds none
2. `verify-quick-challenge-payment` fallback also runs → inserts payment first
3. Webhook INSERT at line 907 fails on unique constraint `(challenge_id, user_id, stripe_payment_intent_id)` → throws → 500

**For regular (non-deferred) session bookings:**
- The `create-payment` function pre-creates a pending payment row
- The webhook upserts on `(session_id, user_id)` which updates the existing row
- `verify-payment` only reads, doesn't modify
- **No race condition** — if the user reports 500 for "normal" bookings, these are actually deferred (`at_booking`) bookings

### Why there are zero webhook logs
The enhanced error logging was added, but if the log delivery system has lag or the function execution context terminates before logs flush, they may not appear in search results. The function does boot correctly (confirmed by POST test returning 400).

## Solution

Make the webhook's INSERT operations conflict-tolerant across all handlers. When a unique constraint violation occurs, treat it as an idempotent duplicate and return success instead of throwing.

### Changes in `supabase/functions/stripe-webhook/index.ts`

**1. `handleDeferredSessionPayment` (line 744-763) — wrap payment INSERT:**

Replace the throwing error handler with conflict-tolerant logic:
```typescript
const { error: paymentError } = await supabaseAdmin.from("payments").insert({...});
if (paymentError) {
  // Unique constraint on stripe_payment_intent_id = fallback already created it
  if (paymentError.code === '23505') {
    console.log("Deferred payment already created by fallback, skipping:", paymentIntentId);
    return true;
  }
  throw new WebhookProcessingError("Failed to create deferred payment", {
    operation: "payments.insert", error: paymentError,
  });
}
```

Also wrap the `sessions.insert` (line 634) and `court_availability.insert` (line 681) to handle duplicates gracefully — if the payment insert is a duplicate, the session/CA were also already created by the fallback. The easiest approach: move the early-return for conflict AFTER the payment insert so that the already-created session/CA records from the fallback are simply left in place.

**2. `handleQuickChallengePayment` (line 906-916) — handle INSERT conflict:**

```typescript
} else {
  const { error: insertErr } = await supabaseAdmin
    .from("quick_challenge_payments")
    .insert(quickPaymentPayload);
  if (insertErr) {
    if (insertErr.code === '23505') {
      console.log("Quick challenge payment already created by fallback, skipping:", challengeId);
      return true;  // Fallback already processed everything
    }
    throw new WebhookProcessingError(...);
  }
}
```

**3. `handleSessionPayment` (non-deferred, line 428-443) — already uses upsert, no change needed.**

**4. `handlePayForPlayersPayment` (line 249-266) — already uses upsert with onConflict, no change needed.**

### Also fix `verify-payment/index.ts` stale `.not()` syntax

Line 254 in verify-payment still uses the old `.not("status", "in", '("cancelled","refunded")')` syntax which may behave unpredictably. Change to:
```typescript
.not("status", "eq", "cancelled")
.not("status", "eq", "refunded")
```

### Files to change

| File | Change |
|------|--------|
| `supabase/functions/stripe-webhook/index.ts` | Handle `23505` constraint violations gracefully in deferred + quick challenge handlers |
| `supabase/functions/verify-payment/index.ts` | Fix `.not("in")` filter syntax on line 254 |

