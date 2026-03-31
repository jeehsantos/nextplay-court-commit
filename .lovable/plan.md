

## Problem

The `stripe-webhook` function produces **zero logs** — not even boot messages. This means it's crashing before any request handler runs. The root cause is the previous "fix" that changed the Supabase client import from `https://esm.sh/@supabase/supabase-js@2.57.2` to `npm:@supabase/supabase-js@2`.

**The `stripe-webhook` is the ONLY edge function in the entire project using `npm:` for supabase-js.** All 33 other functions use `https://esm.sh/@supabase/supabase-js@2.57.2` and work correctly. The edge runtime environment likely doesn't resolve the `npm:` specifier for supabase-js properly, causing a boot crash before any code runs.

Additionally, the verify-payment fallback logs show it created **3 separate sessions** for the same payment intent (`pi_3TGuGrLpM66OQZ3P2Dmyrfze`), which is a secondary concurrency bug in the fallback that should also be addressed.

## Solution

### 1. Fix the import — revert to the working `esm.sh` specifier

In `supabase/functions/stripe-webhook/index.ts`, change line 2:

```typescript
// FROM:
import { createClient } from "npm:@supabase/supabase-js@2";

// TO:
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
```

This matches every other working edge function in the project.

### 2. Add top-level idempotency guard for deferred payments

Before calling `handleDeferredSessionPayment`, check if a payment already exists for this payment intent. This prevents the race condition even if both webhook and fallback run:

```typescript
// In handleCheckoutCompleted, before dispatching to handleSessionPayment:
if (metadata.deferred === "true") {
  const pi = session.payment_intent as string;
  if (pi) {
    const { data: existing } = await supabaseAdmin
      .from("payments")
      .select("id")
      .eq("stripe_payment_intent_id", pi)
      .maybeSingle();
    if (existing) {
      console.log("Deferred payment already exists, returning duplicate:", pi);
      return true;
    }
  }
}
```

### 3. Re-deploy the function

After the code change, deploy `stripe-webhook` to pick up the fixed import.

### Files to change

| File | Change |
|------|--------|
| `supabase/functions/stripe-webhook/index.ts` | 1. Revert import to `esm.sh`. 2. Add early idempotency guard in `handleCheckoutCompleted`. |

