
-- 1. Fix: Remove public SELECT on group_invitations (invite codes should not be browsable)
DROP POLICY IF EXISTS "Anyone can view active invitations by code" ON public.group_invitations;

-- 2. Fix: Remove has_valid_invitation group SELECT policy (leaks private groups to any authenticated user)
DROP POLICY IF EXISTS "Users with valid invitation can view group" ON public.groups;

-- 3. Fix: Restrict payments INSERT to only allow 'pending' status
CREATE OR REPLACE FUNCTION public.validate_payment_insert_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status != 'pending' THEN
    RAISE EXCEPTION 'Payments can only be created with pending status';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER enforce_payment_pending_on_insert
  BEFORE INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_payment_insert_status();

-- 4. Fix: Restrict court-photos uploads to venue owners and staff only
DROP POLICY IF EXISTS "Authenticated users can upload court photos" ON storage.objects;

CREATE POLICY "Venue owners can upload court photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'court-photos'
  AND (
    EXISTS (SELECT 1 FROM public.venues v WHERE v.owner_id = auth.uid())
    OR public.is_staff_of_owner(auth.uid())
  )
);
