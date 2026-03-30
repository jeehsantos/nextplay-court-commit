

## Problem

The `stripe-webhook` edge function returns 500 for ALL `checkout.session.completed` events. The edge function logs are empty (not visible via tooling), so the exact error cannot be determined from logs alone. However, the function boots and runs correctly (confirmed by `payment_intent.succeeded` returning 200 and the POST test returning 400 "Missing signature").

The verify-payment fallback handles everything correctly, so payments and sessions work — the issue is isolated to the webhook.

### Root Cause Analysis

Since I cannot see the actual error logs, I need to add enhanced error logging to capture the specific failure. However, based on code analysis, the most likely causes are:

1. **The `esm.sh` Supabase client import** (`@supabase/supabase-js@2.57.2`) — other edge functions that work use `npm:` specifiers for Stripe but `esm.sh` for Supabase. The `esm.sh` CDN can have intermittent issues or version resolution failures that cause subtle runtime errors during complex operations.

2. **PostgREST `.not("status", "in", ...)` syntax** — the deferred idempotency check (line 559) uses `.not("status", "in", '("cancelled","refunded")')` which may behave differently across supabase-js versions, potentially returning unexpected results or throwing.

3. **Uncaught error from `.single()` calls** — in `handleQuickChallengePayment`, the `.single()` call on `quick_challenge_players` (line 839) doesn't check the `error` property. If the row doesn't exist, PostgREST returns a 406 error which could propagate unexpectedly.

## Solution

### 1. Stabilize the Supabase import

Change `https://esm.sh/@supabase/supabase-js@2.57.2` to `npm:@supabase/supabase-js@2` (consistent with how Stripe is imported via `npm:`). This eliminates esm.sh CDN issues.

### 2. Add detailed error logging in the catch block

Enhance the catch block (lines 71-93) to log the full error stack trace and stringify the error, making it possible to diagnose via Supabase function logs:

```typescript
console.error("stripe_webhook_event_failed", JSON.stringify({
  eventId: event.id,
  eventType: event.type,
  errorName: error.name,
  errorMessage: error.message,
  errorStack: error.stack,
  details,
}));
```

### 3. Guard `.single()` calls with error checks

In `handleQuickChallengePayment`, add error handling for the player lookup `.single()` call and the challenge lookup `.single()` call to prevent uncaught PostgREST errors from propagating.

### 4. Harden the `.not()` filter syntax

Replace `.not("status", "in", '("cancelled","refunded")')` with a more reliable pattern:
```typescript
.not("status", "eq", "cancelled")
.not("status", "eq", "refunded")
```

### Files to change

| File | Change |
|------|--------|
| `supabase/functions/stripe-webhook/index.ts` | 1. Switch import to `npm:@supabase/supabase-js@2`. 2. Enhanced error logging in catch block. 3. Guard `.single()` calls. 4. Fix `.not()` filter syntax. |

