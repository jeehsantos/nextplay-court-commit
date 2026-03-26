-- Cancel duplicate orphan sessions (no court_availability linked)
UPDATE public.sessions SET is_cancelled = true
WHERE id IN (
  '4da2290f-7a92-4f95-bff4-bdab59b3a925',
  '7338581e-3074-42da-a753-b0560617fef5',
  '44e2c711-5639-4cd6-9908-7fedcdf0cca0',
  '9c1b11f5-53b8-4753-8580-8be22e0a815f'
);

-- Cancel duplicate payment rows (keep one per stripe_payment_intent_id)
-- For pi_3TEr0ELpM66OQZ3P1fi9deqZ: keep 4d868761 (linked to ecdf23a4 which has CA)
UPDATE public.payments SET status = 'cancelled'
WHERE id IN (
  'c6242ba8-5995-4eef-bae9-1e9ed788c0ee',
  'daad093b-2fec-413c-8dea-22692db0e7f8',
  '7808d7d8-6449-4854-97e7-3964137ca95a'
);

-- For pi_3TEPuULpM66OQZ3P0l3us5aR: keep 17edb9fa (linked to 9c1b11f5 but that's cancelled, so keep the one for 8fe967c6)
-- Actually 832b3d11 -> 8fe967c6 (has CA), 17edb9fa -> 9c1b11f5 (no CA, cancelled)
UPDATE public.payments SET status = 'cancelled'
WHERE id = '17edb9fa-fe01-4490-8088-d55783a72445';

-- Delete session_players for cancelled orphan sessions
DELETE FROM public.session_players
WHERE session_id IN (
  '4da2290f-7a92-4f95-bff4-bdab59b3a925',
  '7338581e-3074-42da-a753-b0560617fef5',
  '44e2c711-5639-4cd6-9908-7fedcdf0cca0',
  '9c1b11f5-53b8-4753-8580-8be22e0a815f'
);

-- Now add the unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_stripe_pi_unique
ON public.payments (stripe_payment_intent_id)
WHERE stripe_payment_intent_id IS NOT NULL AND status NOT IN ('cancelled', 'refunded');

-- Add unique partial index on quick_challenge_payments too
CREATE UNIQUE INDEX IF NOT EXISTS idx_qc_payments_stripe_pi_unique
ON public.quick_challenge_payments (stripe_payment_intent_id)
WHERE stripe_payment_intent_id IS NOT NULL;