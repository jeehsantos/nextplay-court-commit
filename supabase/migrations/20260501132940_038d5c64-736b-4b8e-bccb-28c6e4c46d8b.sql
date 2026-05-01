
-- 1. Platform settings: restrict to authenticated users
DROP POLICY IF EXISTS "Platform settings viewable by authenticated" ON public.platform_settings;
CREATE POLICY "Platform settings viewable by authenticated"
ON public.platform_settings
FOR SELECT
TO authenticated
USING (true);

-- 2. Storage: drop the overly-permissive court-photos INSERT policy (the
-- "Venue owners can upload court photos" policy already grants upload access
-- to the appropriate users)
DROP POLICY IF EXISTS "Court managers can upload court photos" ON storage.objects;

-- 3. Court availability: tighten WITH CHECK so users can only book themselves
DROP POLICY IF EXISTS "Authenticated users can book available slots" ON public.court_availability;
CREATE POLICY "Authenticated users can book available slots"
ON public.court_availability
FOR UPDATE
TO authenticated
USING (is_booked = false)
WITH CHECK (booked_by_user_id = auth.uid());
