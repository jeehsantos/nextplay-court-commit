
-- Add organizer fee columns to sessions table
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS organizer_fee_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS organizer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS organizer_payout_status text NOT NULL DEFAULT 'NOT_APPLICABLE',
  ADD COLUMN IF NOT EXISTS organizer_payout_amount_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS organizer_stripe_transfer_id text;

-- Add organizer_fee_cents to payments table
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS organizer_fee_cents integer;

-- Index for finding sessions needing organizer payout
CREATE INDEX IF NOT EXISTS idx_sessions_organizer_payout
  ON public.sessions(organizer_payout_status)
  WHERE organizer_payout_status = 'PENDING';
