
-- Allow any authenticated user to view sessions from public groups
CREATE POLICY "Sessions from public groups are viewable"
ON public.sessions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = sessions.group_id
      AND g.is_public = true
      AND g.is_active = true
  )
);

-- Allow any authenticated user to join sessions from public groups (if not banned)
CREATE POLICY "Players can join public group sessions"
ON public.session_players
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.sessions s
    JOIN public.groups g ON g.id = s.group_id
    WHERE s.id = session_players.session_id
      AND g.is_public = true
      AND g.is_active = true
  )
  AND NOT is_user_banned_from_group(
    (SELECT s.group_id FROM public.sessions s WHERE s.id = session_players.session_id),
    auth.uid()
  )
);

-- Allow any authenticated user to view session players for public group sessions
CREATE POLICY "Session players viewable for public group sessions"
ON public.session_players
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sessions s
    JOIN public.groups g ON g.id = s.group_id
    WHERE s.id = session_players.session_id
      AND g.is_public = true
      AND g.is_active = true
  )
);
