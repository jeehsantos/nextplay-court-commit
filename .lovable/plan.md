

## Problem

All 11 edge functions use Stripe SDK `v18.5.0` with `apiVersion: "2024-12-18.acacia"`, but the Stripe account is now on API version `"2026-02-25.clover"`. Webhook events arrive in the `clover` format, causing the SDK to fail when parsing responses — resulting in HTTP 500 on `checkout.session.completed` events.

## Solution

Upgrade the Stripe SDK import and API version across all 11 edge functions. The latest Stripe npm version is `20.4.1`, which supports `"2026-02-25.clover"`.

Additionally, fix the frontend visibility issue so users returning from Stripe can see their challenge, and add a verify fallback for resilience.

### Changes

| # | File | Change |
|---|------|--------|
| 1 | All 11 edge functions (listed below) | Update import from `stripe@18.5.0` → `stripe@20.4.1` and `apiVersion` from `"2024-12-18.acacia"` → `"2026-02-25.clover"` |
| 2 | `supabase/functions/verify-quick-challenge-payment/index.ts` | Add fallback: if Stripe says paid but player is still pending, complete the payment (mark paid, insert snapshot, update court, update challenge status) |
| 3 | `src/hooks/useQuickChallenges.ts` | Expand default status filter to include `pending_payment` |
| 4 | Database migration | Add RLS policy: players who joined a challenge can view it regardless of status |

### Files to update (Stripe version)

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

Each file gets two changes:
```
// Import line
- import Stripe from "https://esm.sh/stripe@18.5.0";
+ import Stripe from "https://esm.sh/stripe@20.4.1";

// apiVersion
- apiVersion: "2024-12-18.acacia",
+ apiVersion: "2026-02-25.clover",
```

### Verify fallback (resilience)

The `verify-quick-challenge-payment` function will gain fallback logic: when Stripe confirms `payment_status: "paid"` but the player record is still `pending`, it will complete the payment flow (mark player paid, insert payment snapshot, update court availability, update challenge status). This ensures payments are confirmed even if the webhook was delayed.

### Frontend + RLS

```sql
CREATE POLICY "Players can view their challenges"
ON public.quick_challenges FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quick_challenge_players qcp
    WHERE qcp.challenge_id = quick_challenges.id
      AND qcp.user_id = auth.uid()
  )
);
```

The `useQuickChallenges` default filter expands from `['open', 'full']` to `['open', 'full', 'pending_payment']`.

