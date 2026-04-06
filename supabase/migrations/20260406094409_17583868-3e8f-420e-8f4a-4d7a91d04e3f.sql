
-- 1. Create security definer function: check if user created a challenge
CREATE OR REPLACE FUNCTION public.is_challenge_creator(_challenge_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.quick_challenges
    WHERE id = _challenge_id AND created_by = _user_id
  )
$$;

-- 2. Create security definer function: check if two users share a challenge
CREATE OR REPLACE FUNCTION public.shares_challenge_with(_viewer_id uuid, _profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.quick_challenge_players qp1
    JOIN public.quick_challenge_players qp2 ON qp1.challenge_id = qp2.challenge_id
    WHERE qp1.user_id = _viewer_id AND qp2.user_id = _profile_user_id
  )
$$;

-- 3. Fix profiles policy: use security definer instead of raw join
DROP POLICY IF EXISTS "Users can view challenge participant profiles" ON public.profiles;
CREATE POLICY "Users can view challenge participant profiles"
ON public.profiles FOR SELECT TO public
USING (shares_challenge_with(auth.uid(), user_id));

-- 4. Fix quick_challenge_players: "Challenge creator can view players" - use security definer
DROP POLICY IF EXISTS "Challenge creator can view players" ON public.quick_challenge_players;
CREATE POLICY "Challenge creator can view players"
ON public.quick_challenge_players FOR SELECT TO authenticated
USING (is_challenge_creator(challenge_id, auth.uid()));

-- 5. Fix quick_challenges: "Players can view their challenges" - use security definer
DROP POLICY IF EXISTS "Players can view their challenges" ON public.quick_challenges;
CREATE POLICY "Players can view their challenges"
ON public.quick_challenges FOR SELECT TO authenticated
USING (is_challenge_participant(id, auth.uid()));
