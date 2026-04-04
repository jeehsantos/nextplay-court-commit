
-- Replace overly permissive public SELECT policy on court_availability
-- Only expose unbooked slots publicly; booked slot details require authentication
DROP POLICY "Available slots viewable by everyone" ON public.court_availability;

-- Public: only unbooked/available slots (no sensitive user/payment data exposed)
CREATE POLICY "Available slots viewable by everyone"
ON public.court_availability FOR SELECT
TO public
USING (is_booked = false);

-- Authenticated: booking owners can see their own booked slots
CREATE POLICY "Users can view own booked slots"
ON public.court_availability FOR SELECT
TO authenticated
USING (booked_by_user_id = auth.uid());
