CREATE POLICY "Court managers can view venue sessions"
ON public.sessions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.courts c
    JOIN public.venues v ON v.id = c.venue_id
    WHERE c.id = sessions.court_id
      AND v.owner_id = auth.uid()
  )
);

CREATE POLICY "Staff can view venue sessions"
ON public.sessions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.courts c
    WHERE c.id = sessions.court_id
      AND c.venue_id IN (
        SELECT public.get_staff_venue_ids(auth.uid())
      )
  )
);