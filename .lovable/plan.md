
# Stripe End-to-End Payment Integration Plan

## Problem Analysis

### Issue 1: "Make Payment" Button Error
The error "Session not found" occurs because:
1. The `create-payment` edge function uses `supabaseClient` (anon key) instead of `supabaseAdmin` (service role key) to fetch session data
2. The sessions table has RLS policies that may restrict access for users who aren't group members or organizers
3. The session query at line 57-68 fails due to RLS restrictions

### Issue 2: Missing Stripe Secret Key
No `STRIPE_SECRET_KEY` is configured in the project secrets. The edge functions will fail to initialize Stripe without this key.

### Issue 3: Missing Stripe Connect Integration for Payouts
The current `create-payment` function doesn't include:
- `application_fee_amount` for platform fee collection
- `transfer_data.destination` for routing payments to court managers

---

## Implementation Plan

### Phase 1: Add Stripe Secret Key
**Action Required**: User must add `STRIPE_SECRET_KEY` via the secrets tool

The Stripe secret key (starts with `sk_test_` for sandbox or `sk_live_` for production) is required for all Stripe API operations.

---

### Phase 2: Fix create-payment Edge Function

**File:** `supabase/functions/create-payment/index.ts`

#### Changes:
1. **Use Service Role Key for session fetch** (fixes RLS issue):
```typescript
// Line 57-68: Change supabaseClient to supabaseAdmin
const { data: session, error: sessionError } = await supabaseAdmin
  .from("sessions")
  .select(`
    *,
    courts (
      *,
      venues (owner_id, stripe_account_id)
    ),
    groups (name, organizer_id)
  `)
  .eq("id", sessionId)
  .single();
```

2. **Add Stripe Connect destination charges** for court manager payouts:
```typescript
// Get connected account ID from venue
const connectedAccountId = session.courts?.venues?.stripe_account_id;

// In checkout session creation (line 184-218)
const checkoutSession = await stripe.checkout.sessions.create({
  // ... existing config
  payment_intent_data: {
    application_fee_amount: PLATFORM_FEE_CENTS,
    transfer_data: connectedAccountId ? {
      destination: connectedAccountId,
    } : undefined,
    metadata: {
      session_id: sessionId,
      user_id: user.id,
      credits_applied: (creditsToApply / 100).toString(),
    },
  },
});
```

3. **Handle cases where venue has no Stripe account**:
   - Allow payment to proceed but platform receives full amount
   - Display warning on court booking pages if venue isn't connected

---

### Phase 3: Fix verify-payment Edge Function

**File:** `supabase/functions/verify-payment/index.ts`

#### Changes:
1. **Update Stripe API version** to match other functions:
```typescript
// Line 30-32
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2024-12-18.acacia", // Consistent with other functions
});
```

2. **Update session_players to confirmed after payment**:
```typescript
// After payment record update
await supabaseClient
  .from("session_players")
  .update({ 
    is_confirmed: true, 
    confirmed_at: new Date().toISOString() 
  })
  .eq("session_id", actualSessionId)
  .eq("user_id", actualUserId);
```

---

### Phase 4: Update PaymentSuccess Page

**File:** `src/pages/PaymentSuccess.tsx`

#### Changes:
1. **Pass checkout_session_id from URL params** for Stripe verification:
```typescript
// Update the success URL in create-payment to include checkout session id
// Then extract it in PaymentSuccess for verification
const checkoutSessionId = searchParams.get("checkout_session_id") 
  || searchParams.get("cs_id"); // Stripe returns cs_* for checkout sessions
```

---

### Phase 5: Enhance Stripe Connect Onboarding

**File:** `supabase/functions/stripe-connect-onboard/index.ts`

Already well-implemented, but add:
1. **Better error handling** for incomplete accounts
2. **Webhook URL preparation** for future payment event handling

---

### Phase 6: Update GameDetail Payment Flow

**File:** `src/pages/GameDetail.tsx`

#### Changes:
1. **Add loading state during payment initialization**
2. **Show connected account warning** if venue hasn't connected Stripe
3. **Handle payment success return** with toast notification

---

## Technical Summary

| Component | Issue | Fix |
|-----------|-------|-----|
| `create-payment` | Uses anon key for session fetch | Switch to service role key |
| `create-payment` | No Stripe Connect integration | Add `transfer_data.destination` |
| `create-payment` | No platform fee in Stripe | Add `application_fee_amount` |
| `verify-payment` | API version mismatch | Update to `2024-12-18.acacia` |
| `verify-payment` | Player not confirmed | Update `session_players.is_confirmed` |
| Secrets | No `STRIPE_SECRET_KEY` | User must add via secrets tool |

---

## Payment Flow After Implementation

```text
Player clicks "Make Payment"
         |
         v
    create-payment edge function
         |
         v
  [Check credits balance]
         |
    +----+----+
    |         |
    v         v
Full credits  Stripe Checkout
(complete)    Session created
              with destination
              charges
         |
         v
  Player completes payment on Stripe
         |
         v
  Redirect to /payment-success
         |
         v
  verify-payment edge function
         |
         v
  Update payment record + confirm player
         |
         v
  Platform keeps $1.50 fee
  Court manager receives remainder
```

---

## Files to Modify

1. `supabase/functions/create-payment/index.ts` - Fix RLS issue, add Stripe Connect
2. `supabase/functions/verify-payment/index.ts` - Fix API version, confirm player
3. `src/pages/PaymentSuccess.tsx` - Fix checkout session ID extraction
4. `src/pages/GameDetail.tsx` - Add venue connection warning

## Secret Required

- `STRIPE_SECRET_KEY` - Stripe test/live secret key (user must provide)
