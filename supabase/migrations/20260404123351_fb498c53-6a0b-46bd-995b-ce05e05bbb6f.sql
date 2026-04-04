
-- Drop the overly permissive public SELECT policy
DROP POLICY "Anyone can view challenge players" ON public.quick_challenge_players;

-- Allow challenge participants (players in the same challenge) to view player records
CREATE POLICY "Challenge participants can view players"
ON public.quick_challenge_players
FOR SELECT
TO authenticated
USING (
  is_challenge_participant(challenge_id, auth.uid())
);

-- Allow challenge creator to view players
CREATE POLICY "Challenge creator can view players"
ON public.quick_challenge_players
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quick_challenges qc
    WHERE qc.id = quick_challenge_players.challenge_id
      AND qc.created_by = auth.uid()
  )
);
