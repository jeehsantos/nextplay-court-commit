

# End-to-End Test Plan: Booking + Split Payments + Session Confirmation

## Strategy

Use the **"before_session" court** (Batalha society, $50/hr) which creates DB records immediately without requiring Stripe checkout. Then simulate split payments by seeding users and inserting completed payment records directly via the service role, and finally call `recalculate_and_maybe_confirm_session` to verify the session gets confirmed.

This avoids Stripe redirects entirely while testing the real confirmation logic.

## Steps

### 1. Create a test edge function `seed-test-session`
A temporary edge function that:
- Creates 6 test users via `supabase.auth.admin.createUser()` (with auto-confirm)
- Creates a group owned by user #1
- Adds all 6 users as group members
- Calls `create-booking` internally to book a `before_session` court (Batalha society, court `6b1acfdb`, venue `af6ac3c7`)
- Adds all 6 users as `session_players`
- For each user, inserts a `payments` row with `status: 'completed'`, `court_amount` = court_price / min_players, `service_fee` = 0 (credit-simulated), `paid_at` = now
- Calls `recalculate_and_maybe_confirm_session` RPC
- Returns the full result: session_id, confirmation status, player count, funding totals

### 2. Test flow
- Call the edge function via `curl_edge_functions`
- Verify the response shows `session_confirmed: true`
- Query the DB to confirm all records are correct

### 3. Cleanup
- Delete the test edge function after verification

## Technical Details

- **Court**: Batalha society (`6b1acfdb`), $50/hr, `before_session` timing, capacity 10, venue has Stripe connected (`acct_1T6S8mL3YxoLOnSY`)
- **Session config**: 1 hour, `split` payment type, `min_players: 6`, sport: futsal (`bedd1e9d`)
- **Per-player share**: $50 / 6 = $8.34 (ceil to cents = 834 cents)
- **Platform settings**: player_fee=$0.11, stripe_percent=4.2%, stripe_fixed=$0.30
- **Confirmation condition** (from RPC): `confirmed_players >= min_players AND total_funded_court_amount >= court_price`

The edge function uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS for all inserts, simulating what the webhook would do in production.

