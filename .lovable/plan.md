
Implementation plan to fix Invite Friends flow end-to-end (no real payment needed for verification):

1) Repair signup trigger wiring (root fix)
- Create a migration that:
  - Keeps `public.handle_new_user()` as `SECURITY DEFINER`.
  - Normalizes referral code from metadata (`upper(trim(...))`).
  - Inserts profile.
  - Inserts role from metadata (`role`) with fallback to `player` (not always hardcoded player).
  - Inserts referral as `pending` when code resolves to a valid referrer and referrer != new user.
- Add missing trigger on `auth.users`:
  - `AFTER INSERT FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()`.
  - Use defensive `DROP TRIGGER IF EXISTS ... ON auth.users` then `CREATE TRIGGER ...` to guarantee it is attached.

2) Add idempotency guard for referrals
- Add a unique index on `referrals(referred_user_id)` to enforce one referral relationship per invited user.
- Update trigger insert logic to be conflict-safe (`ON CONFLICT DO NOTHING`).

3) Close referral-credit gaps in credits-only payment paths
- Update `supabase/functions/create-payment/index.ts`:
  - In the non-deferred “credits cover full amount” branch, call `process_referral_credit` after marking payment completed.
- Update `supabase/functions/create-quick-challenge-payment/index.ts`:
  - In credits-payment success branch, call `process_referral_credit` after payment snapshot write.
- Keep webhook as authoritative for card flows (unchanged).

4) Backfill missing referrals caused by the broken period
- Run a one-time data repair script:
  - Insert missing pending referrals for users that already have `raw_user_meta_data.referral_code` but no row in `referrals`.
  - Include targeted repair for the reported pair (`1idreamzjsm@gmail.com` invited `5idreamzjsm@gmail.com`) since that signup lacks metadata.
- Then run a one-time completion pass:
  - For repaired referrals where referred users already have completed payment records, invoke `process_referral_credit` so they move to `completed` and award credits.

5) Improve referral stats freshness in profile UI
- In `ReferralSection` query config, reduce staleness and enable periodic refresh (short interval) so Pending/Completed updates appear promptly without waiting several minutes.
- In credits balance query, shorten stale window / refresh behavior so awarded bonus appears quickly on profile.

6) Verify with mock-style backend checks (no new real Stripe payment)
- Validation script checks:
  - Referral row is created as `pending` immediately after signup metadata path.
  - `process_referral_credit` transitions `pending -> completed`.
  - `credit_transactions` gets referral bonus row for referrer.
  - Profile stats query returns correct Pending/Completed/Earned counts for referrer.
- Also verify reported account outcomes:
  - `1idreamzjsm@gmail.com` sees repaired referrals.
  - `5idreamzjsm@gmail.com` referral shows completed + bonus credited after repair.

Technical details to apply:
- SQL migration: trigger attachment + function hardening + unique index.
- Backend functions: only add referral RPC calls in credits-only branches.
- Data repair: executed as controlled backend data operation (not schema migration), idempotent predicates (`NOT EXISTS`) to avoid duplicates.
