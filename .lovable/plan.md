

## Problem

The Quick Game Lobby cannot distinguish between "organizer pays full" and "split between players" modes because `quick_challenges` has no `payment_type` column. The previous fix checked `price_per_player > 0`, but that's wrong — `price_per_player` is $75 (the full court amount) in organizer-pays-full mode, so the button still shows "Pay and Confirm" to other players who don't owe anything.

## Solution

### 1. Database migration: Add `payment_type` column to `quick_challenges`

```sql
ALTER TABLE public.quick_challenges 
ADD COLUMN payment_type text NOT NULL DEFAULT 'split';
```

Update existing challenges based on their data pattern (the current one has `payment_type = 'single'`).

### 2. Update `create-quick-challenge` edge function

Store the `effectivePaymentType` value (already computed on line 111) into the new `payment_type` column when inserting the challenge.

### 3. Update `QuickGameLobby.tsx` button logic

Replace the `(challenge.price_per_player ?? 0) > 0` check with:

```
challenge.payment_type === "split" 
```

- If `payment_type === "single"` (organizer pays full): all non-organizer players see "Confirm Presence" only — no payment required.
- If `payment_type === "split"`: all unpaid players see "Pay and Confirm".

### 4. Update `useQuickChallenges` hook

Add `payment_type` to the `QuickChallenge` interface since it's a new column being selected via `*`.

### Files to modify
1. New migration — add `payment_type` column
2. `supabase/functions/create-quick-challenge/index.ts` — persist `effectivePaymentType`
3. `src/pages/QuickGameLobby.tsx` — use `payment_type` for button logic
4. `src/hooks/useQuickChallenges.ts` — update `QuickChallenge` interface

