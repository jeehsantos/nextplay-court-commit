INSERT INTO public.venue_payment_settings (venue_id, stripe_account_id)
SELECT v.id, p.stripe_account_id
FROM venues v
JOIN profiles p ON p.user_id = v.owner_id
WHERE p.stripe_account_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM venue_payment_settings vps WHERE vps.venue_id = v.id
);