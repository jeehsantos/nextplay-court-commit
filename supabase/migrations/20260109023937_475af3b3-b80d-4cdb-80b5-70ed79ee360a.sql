-- Allow any authenticated user to view groups that currently have an open rescue session
-- (Fixes: external players seeing "Game not found" when opening a rescue session,
-- and "Unknown Group" in rescue listings)

DROP POLICY IF EXISTS "Public groups are viewable" ON public.groups;

CREATE POLICY "Public groups are viewable"
ON public.groups
FOR SELECT
USING (
  (is_public = true)
  OR (auth.uid() = organizer_id)
  OR (
    EXISTS (
      SELECT 1
      FROM public.group_members gm
      WHERE gm.group_id = groups.id
        AND gm.user_id = auth.uid()
    )
  )
  OR (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      WHERE s.group_id = groups.id
        AND s.is_cancelled = false
        AND s.is_rescue_open = true
        AND s.state = 'rescue'::public.session_state
    )
  )
);