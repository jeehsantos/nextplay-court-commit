

## Investigation Results

**Root cause found.** The session `637890f4-...` has **not been auto-cancelled** because the `cancel_expired_unpaid_sessions` RPC only targets sessions where `court_availability.payment_status = 'pending'`. However, this session's court slot has `payment_status = 'completed'` — because one of the two players (user `b8468d17`) already paid.

### Current data state:
- **Payment deadline**: `2026-03-12 09:00 UTC` — already passed
- **Court availability**: `payment_status = 'completed'`, `is_booked = true`
- **Player 1** (`b8468d17`): payment `completed`, confirmed
- **Player 2** (`845dab0f`): payment `pending`, confirmed
- **Session**: `is_cancelled = false`, `state = rescue`

The cron RPC filter (`ca.payment_status = 'pending' AND s.payment_deadline < now()`) skips this session entirely because the slot was marked `completed` after the first player paid.

### The bug
The `cancel_expired_unpaid_sessions` function assumes that if `payment_status = 'completed'` on the court slot, everything is fine. But in **split-payment sessions**, the slot can be marked `completed` after just one player pays, even though the session is not fully funded. When the deadline passes with remaining unpaid players, nothing happens.

### Fix plan

**1. Update `cancel_expired_unpaid_sessions` RPC** to also handle partially-funded split sessions past deadline:
- Add a second loop that finds sessions where `payment_deadline < now()`, `is_cancelled = false`, `payment_type = 'split'`, and where `recalculate_and_maybe_confirm_session` returns `session_confirmed = false` (i.e., not fully funded).
- For those sessions: refund paid players via credits (court_amount), create `held_credit_liabilities`, mark payments as `refunded`, release court slot, delete session players, cancel session, notify organizer.

**2. Alternatively (simpler & safer)**: Modify the RPC to remove the `ca.payment_status = 'pending'` filter and instead check all overdue sessions. Then for each, determine if the session is fully funded:
- If fully funded → skip (session is fine)
- If not fully funded → cancel, refund paid players as credits, release slot

This approach handles both scenarios (fully unpaid AND partially paid) in one pass.

### Implementation details

Update the `cancel_expired_unpaid_sessions` database function to:

```sql
-- For each overdue, non-cancelled session:
--   1. Check if session is fully funded via recalculate_and_maybe_confirm_session
--   2. If NOT fully funded:
--      a. For each 'completed' payment: convert court_amount to credits, 
--         create held_credit_liability, mark payment as 'refunded'
--      b. Release court_availability slot
--      c. Delete session_players
--      d. Cancel session
--      e. Notify organizer
```

### Files to modify
- **Database migration**: Update `cancel_expired_unpaid_sessions` function to handle partially-funded split sessions

### No frontend changes needed
The existing UI (PaymentDeadlineWarning, GameDetail) already handles cancelled sessions correctly.

