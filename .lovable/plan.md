

## Plan: "Pay for Player" Feature for Organizers

### Problem
In split-payment sessions, players can confirm attendance but forget to pay before the payment deadline, risking automatic session cancellation.

### Solution
Allow the organizer to pay on behalf of one or more unpaid players via Stripe, directly from the `/games/{id}` page.

### Build Errors Fix (prerequisite)
Fix `NodeJS.Timeout` type errors in `useBookingHold.ts` (line 29) and `useDeviceType.ts` (line 14) by replacing `NodeJS.Timeout` with `ReturnType<typeof setTimeout>`.

### Frontend Changes (`src/pages/GameDetail.tsx`)

1. **New "Pay for Players" section** — visible only to the organizer, only for split-payment sessions, only when there are unpaid confirmed players, and only before the game.

2. **UI**: A card below the payment section containing:
   - A multi-select dropdown (using checkboxes) listing unpaid players by name
   - A summary showing: number of selected players × price per player = total
   - A "Pay for Selected Players" button that triggers Stripe checkout

3. **New handler `handlePayForPlayers`**: Calls a new edge function `create-payment-for-players` with `{ sessionId, playerUserIds: string[] }`.

### Backend: New Edge Function `supabase/functions/create-payment-for-players/index.ts`

This function:
1. Authenticates the caller and verifies they are the group organizer
2. Validates the session is split-payment and not cancelled/past
3. For each selected player: calculates per-player court share (same formula as existing split logic)
4. Sums up all player shares + platform fees into a single Stripe Checkout session
5. Creates pending `payments` records for each player (using the organizer's checkout but each player's `user_id`)
6. Stores metadata mapping `player_user_ids` so the webhook can confirm all players
7. Returns the Stripe checkout URL

### Backend: Update `supabase/functions/stripe-webhook/index.ts`

Add handling for the `pay_for_players` payment type:
- When `checkout.session.completed` fires with metadata containing `player_user_ids`:
  - Update each player's payment record to `completed`
  - Set each player's `is_confirmed = true` in `session_players`
  - Update `court_availability.payment_status` if fully funded
  - Run `recalculate_and_maybe_confirm_session`

### Backend: Update `supabase/config.toml`

Add the new edge function entry with `verify_jwt = false`.

### Summary of files to create/modify
- **Fix**: `src/hooks/useBookingHold.ts` — replace `NodeJS.Timeout`
- **Fix**: `src/hooks/useDeviceType.ts` — replace `NodeJS.Timeout`
- **Modify**: `src/pages/GameDetail.tsx` — add pay-for-players UI section
- **Create**: `supabase/functions/create-payment-for-players/index.ts` — new edge function
- **Modify**: `supabase/functions/stripe-webhook/index.ts` — handle multi-player payment completion
- **Modify**: `supabase/config.toml` — register new function

