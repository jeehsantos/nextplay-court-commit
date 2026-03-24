CREATE POLICY "Players can view their challenges"
ON public.quick_challenges FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quick_challenge_players qcp
    WHERE qcp.challenge_id = quick_challenges.id
      AND qcp.user_id = auth.uid()
  )
);