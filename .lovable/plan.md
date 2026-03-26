

## Problem

4 duplicate sessions exist for the same court, date, and time — all created within ~2 seconds by the `verify-payment` fallback. The same Stripe `payment_intent_id` is linked to all 4.

### Root Cause

When the `stripe-webhook` was crashing (boot failure), the `PaymentSuccess` page polled `verify-payment` repeatedly. After 5 polls, the fallback triggered `createDeferredRecordsFallback()`. But multiple polls fired concurrently and each created a new session because:

1. The idempotency check (`payments` table lookup by `stripe_payment_intent_id`) uses `.maybeSingle()` — which returns the first match, but by the time it runs, the previous poll's insert may not have committed yet.
2. There is **no unique constraint** on `payments.stripe_payment_intent_id`, so duplicate inserts succeed.
3. There is **no overlap check** in the fallback before inserting into `sessions` or `court_availability`.

## Solution

### 1. Add database-level idempotency guard

Create a migration to add a unique partial index on `payments.stripe_payment_intent_id` (where not null). This prevents duplicate payment rows for the same Stripe transaction at the database level.

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_stripe_pi_unique
ON public.payments (stripe_payment_intent_id)
WHERE stripe_payment_intent_id IS NOT NULL;
```

### 2. Fix the verify-payment fallback with advisory lock

In `supabase/functions/verify-payment/index.ts`, wrap `createDeferredRecordsFallback` with:
- A Postgres advisory lock (keyed on `payment_intent_id`) to serialize concurrent fallback attempts
- An overlap check before inserting `court_availability`
- A try/catch on the payment insert to handle the new unique constraint gracefully

### 3. Fix the webhook handler similarly

In `supabase/functions/stripe-webhook/index.ts`, add an early idempotency check for deferred sessions: if a `completed` payment already exists for the `stripe_payment_intent_id`, return success immediately.

### 4. Clean up the 3 duplicate sessions

Run a cleanup migration to cancel the 3 extra sessions (keep the one linked to `court_availability`) and delete orphan payments:

```sql
-- Cancel duplicates (keep the one with the court_availability link)
UPDATE sessions SET is_cancelled = true
WHERE id IN (
  '44e2c711-5639-4cd6-9908-7fedcdf0cca0',
  '7338581e-3074-42da-a753-b0560617fef5',
  '4da2290f-7a92-4f95-bff4-bdab59b3a925'
);

-- Also handle the Mar 26 duplicates
UPDATE sessions SET is_cancelled = true
WHERE id = '8fe967c6-d561-4051-a855-5551d73c05a5';
```

### 5. Frontend: prevent concurrent polls from triggering multiple fallbacks

In `PaymentSuccess.tsx`, add a `ref` flag (`fallbackTriggered`) that is set to `true` once a poll returns `success`. Skip further polls once success is received — the current `clearInterval` may not prevent an in-flight request from completing.

### Files to update

| File | Change |
|------|--------|
| New migration SQL | Unique index on `payments.stripe_payment_intent_id`, cleanup duplicates |
| `supabase/functions/verify-payment/index.ts` | Advisory lock + overlap check in fallback |
| `supabase/functions/stripe-webhook/index.ts` | Early idempotency return for deferred payments |
| `src/pages/PaymentSuccess.tsx` | Guard against concurrent fallback triggers |

