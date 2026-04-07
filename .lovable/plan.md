

# Organizer Fee + Automatic Payout (Normal Bookings Only)

## Overview

Allow session organizers to optionally earn a fee per session. The organizer fee is collected as part of the single Stripe charge from the player, then automatically paid out to the organizer's Stripe Connect account once the session is confirmed.

## Technical Details

### 1. Database Migration

**Extend `sessions` table:**
- `organizer_fee_cents` (integer, default 0)
- `organizer_user_id` (uuid, nullable, references auth.users)
- `organizer_payout_status` (text, default 'NOT_APPLICABLE') — values: PENDING, PAID, NOT_APPLICABLE, PENDING_SETUP
- `organizer_payout_amount_cents` (integer, default 0)
- `organizer_stripe_transfer_id` (text, nullable)

**Extend `payments` table:**
- `organizer_fee_cents` (integer, nullable) — snapshot of organizer fee for this payment

**Index:**
- `CREATE INDEX idx_sessions_organizer_payout ON sessions(organizer_payout_status) WHERE organizer_payout_status = 'PENDING'`

### 2. Update `_shared/feeCalc.ts`

Add `organizerFeeCents` to `GrossUpInput` (optional, default 0). Update the gross-up formula:

```
T = ceil((courtAmount + organizerFee + platformFee + stripeFixed) / (1 - stripePercent))
```

The `application_fee_amount` becomes `serviceFeeTotalCents` (which now includes organizer fee + platform fee + stripe coverage). Court still receives `courtAmount` via destination charge.

### 3. Update `create-booking` Edge Function

Accept optional `organizerFee` input (number, dollars). Store `organizer_fee_cents`, `organizer_user_id` (from the group's organizer_id), and `organizer_payout_status` on session insert. Pass organizer fee info in the deferred response metadata so `create-payment` can use it.

### 4. Update `create-payment` Edge Function

- Read `organizer_fee_cents` from the session record
- Include organizer fee in gross-up calculation: `courtAmountCents` stays the same for the court, but the application_fee_amount now includes organizer fee
- Updated Stripe checkout: `application_fee_amount = platformFeeCents + organizerFeeCents + stripeFeeCoverageCents` (platform keeps platform fee + organizer fee; organizer is paid later from platform balance)
- Add `organizer_fee_cents` to metadata and to payment record
- For deferred flow: same adjustments

### 5. Update `stripe-webhook`

- Persist `organizer_fee_cents` on payment record from metadata
- No organizer payout here (just record keeping)

### 6. Create `process-organizer-payout` Edge Function

New edge function triggered after session confirmation (called from webhook/payout-session flow):

1. Query sessions where `organizer_payout_status = 'PENDING'` and session is confirmed
2. Filter: only normal bookings (exclude quick challenges by checking session exists in sessions table with group_id)
3. Look up organizer's `stripe_account_id` from their profile
4. If no Stripe account: set status to `PENDING_SETUP`, skip
5. Use `transferring_at`-style claim pattern for idempotency
6. `stripe.transfers.create({ amount: organizer_fee_cents, destination: organizer_stripe_account_id })`
7. Update session: `organizer_payout_status = 'PAID'`, store transfer ID

### 7. Integration Points

- After `payout-session` runs (court payout), also call `process-organizer-payout` for the same session
- Add the call in `triggerPayout` helper used by create-payment and stripe-webhook
- Also callable as standalone for retry/cron

### 8. Frontend Changes (Thin Client)

**BookingWizard (Step 3 - Payment):**
- Add optional numeric input: "Organizer fee per player (optional)" — only visible when payment type is selected
- Pass `organizerFee` in the `onConfirm` callback

**BookingWizardProps / CourtDetail.tsx:**
- Thread `organizerFee` through to `create-booking` call

**Profile / Settings:**
- If organizer has sessions with `PENDING_SETUP`, show alert: "Connect Stripe to receive organizer payouts" linking to Stripe Connect setup

### 9. Translation Updates

Add entries in `en/manager.json` and `pt/manager.json` for organizer fee labels.

### 10. Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/new.sql` | Add columns, index |
| `supabase/functions/_shared/feeCalc.ts` | Add organizerFeeCents to gross-up |
| `supabase/functions/create-booking/index.ts` | Accept & store organizer fee |
| `supabase/functions/create-payment/index.ts` | Include organizer fee in charge |
| `supabase/functions/stripe-webhook/index.ts` | Persist organizer_fee_cents |
| `supabase/functions/process-organizer-payout/index.ts` | New: automated payout |
| `supabase/functions/payout-session/index.ts` | Trigger organizer payout after court payout |
| `src/components/booking/BookingWizard.tsx` | Add organizer fee input |
| `src/pages/CourtDetail.tsx` | Thread organizerFee to create-booking |
| `src/i18n/locales/en/manager.json` | New strings |
| `src/i18n/locales/pt/manager.json` | New strings |

### Safety Guarantees

- Quick challenge flows completely untouched
- Single Stripe charge per player
- Court paid via destination charge (automatic)
- Organizer fee held by platform, then transferred via `stripe.transfers.create`
- No double Stripe fees (organizer fee included in single gross-up)
- Idempotent payout with claim pattern

