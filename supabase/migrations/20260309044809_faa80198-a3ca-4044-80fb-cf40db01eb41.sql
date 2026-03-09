-- Create function to purge old terminal booking holds (EXPIRED, CONVERTED, FAILED)
-- Only records older than 7 days are deleted; HELD (active) records are never touched
CREATE OR REPLACE FUNCTION public.purge_old_booking_holds()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM public.booking_holds
  WHERE status IN ('EXPIRED', 'CONVERTED', 'FAILED')
    AND created_at < now() - interval '7 days';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;