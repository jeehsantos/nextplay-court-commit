-- 1) referral_settings: restrict SELECT to authenticated users
DROP POLICY IF EXISTS "Anyone can view referral settings" ON public.referral_settings;
DROP POLICY IF EXISTS "Public can view referral settings" ON public.referral_settings;
DROP POLICY IF EXISTS "Everyone can view referral settings" ON public.referral_settings;
DROP POLICY IF EXISTS "Authenticated users can view referral settings" ON public.referral_settings;

CREATE POLICY "Authenticated users can view referral settings"
ON public.referral_settings
FOR SELECT
TO authenticated
USING (true);

-- 2) court_availability: restrict the "book available slot" UPDATE policy to authenticated users only
DROP POLICY IF EXISTS "Authenticated users can book available slots" ON public.court_availability;

CREATE POLICY "Authenticated users can book available slots"
ON public.court_availability
FOR UPDATE
TO authenticated
USING (is_booked = false)
WITH CHECK (true);

-- 3) user_roles: switch from denylist to allowlist for self-insert (only 'player' allowed)
DROP POLICY IF EXISTS "Users can insert own non-privileged roles" ON public.user_roles;

CREATE POLICY "Users can self-assign player role only"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role = 'player'::app_role
);