

## Problem

The `stripe-webhook` function (and likely all 11 edge functions) crash at boot time — zero logs are recorded. This means the `import Stripe from "https://esm.sh/stripe@20.4.1"` statement itself is failing in the Deno edge runtime. The function never reaches any handler code.

This is a known Supabase/Deno issue: certain npm packages don't transpile correctly via esm.sh. Supabase's own docs now recommend using `npm:` specifiers instead of esm.sh URLs.

The previous fix (upgrading from `stripe@18.5.0` to `stripe@20.4.1`) introduced this boot crash because `stripe@20.4.1` doesn't work via esm.sh in edge-runtime.

## Root Cause

- `https://esm.sh/stripe@20.4.1` fails to load in Supabase edge-runtime (Deno)
- The function crashes before any code executes — hence zero logs
- ALL `checkout.session.completed` events return 500 because the function never boots
- Normal bookings and quick challenges are both affected
- The `verify-payment` and `verify-quick-challenge-payment` fallbacks are working because they were redeployed and happened to boot successfully (or they use a cached working version)

## Solution

Switch all 11 edge functions from esm.sh to the `npm:` specifier, which is the **recommended** approach per current Supabase documentation. Use a known-working Stripe version.

### Changes

| # | File | Change |
|---|------|--------|
| 1 | All 11 Stripe edge functions | Change import from `https://esm.sh/stripe@20.4.1` to `npm:stripe@17.7.0` |
| 2 | All 11 Stripe edge functions | Keep `apiVersion: "2026-02-25.clover"` (this is just a request header, works with any SDK version) |
| 3 | `stripe-webhook/index.ts` | Additionally: replace the `quick_challenge_payments` upsert with select-then-insert/update pattern (fix the secondary issue) |

### Files to update

1. `supabase/functions/stripe-webhook/index.ts`
2. `supabase/functions/create-payment/index.ts`
3. `supabase/functions/create-payment-for-players/index.ts`
4. `supabase/functions/create-quick-challenge-payment/index.ts`
5. `supabase/functions/verify-payment/index.ts`
6. `supabase/functions/verify-quick-challenge-payment/index.ts`
7. `supabase/functions/transfer-payment/index.ts`
8. `supabase/functions/payout-session/index.ts`
9. `supabase/functions/stripe-connect-onboard/index.ts`
10. `supabase/functions/stripe-connect-status/index.ts`
11. `supabase/functions/stripe-connect-dashboard/index.ts`

### Technical details

**Import change** (all 11 files):
```typescript
// Before (crashes at boot)
import Stripe from "https://esm.sh/stripe@20.4.1";

// After (npm: specifier, recommended by Supabase)
import Stripe from "npm:stripe@17.7.0";
```

The `apiVersion: "2026-02-25.clover"` stays the same — it's just a header sent to Stripe and is independent of the SDK version.

**Webhook upsert fix** (stripe-webhook only, lines 857-861):
```typescript
// Before: fragile upsert with 3-column onConflict
.upsert(quickPaymentPayload, { onConflict: "challenge_id,user_id,stripe_payment_intent_id" });

// After: explicit check-then-insert/update
const { data: existing } = await supabaseAdmin
  .from("quick_challenge_payments")
  .select("id")
  .eq("challenge_id", challengeId)
  .eq("user_id", userId)
  .maybeSingle();

if (existing) {
  await supabaseAdmin.from("quick_challenge_payments")
    .update(quickPaymentPayload).eq("id", existing.id);
} else {
  await supabaseAdmin.from("quick_challenge_payments")
    .insert(quickPaymentPayload);
}
```

### Why this fixes both normal bookings and quick challenges

The 500 error affects ALL `checkout.session.completed` events because the function can't even boot. Once the import is fixed:
- Normal booking webhooks will process through `handleSessionPayment` / `handleDeferredSessionPayment`
- Quick challenge webhooks will process through `handleQuickChallengePayment`
- `payment_intent.succeeded` events (which capture Stripe fees) will also work

