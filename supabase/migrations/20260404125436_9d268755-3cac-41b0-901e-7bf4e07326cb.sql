
CREATE OR REPLACE FUNCTION public.record_failed_login(p_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_record login_attempts%ROWTYPE;
  v_new_count integer;
  v_locked_until timestamp with time zone;
BEGIN
  -- First check if there's an existing record with an expired lock
  SELECT * INTO v_record FROM login_attempts WHERE email = lower(trim(p_email));
  
  -- If there's an expired lock, delete the old record so we start fresh
  IF v_record IS NOT NULL AND v_record.locked_until IS NOT NULL AND v_record.locked_until <= now() THEN
    DELETE FROM login_attempts WHERE email = lower(trim(p_email));
    v_record := NULL; -- treat as new
  END IF;
  
  IF v_record IS NULL THEN
    -- First failed attempt (or reset after expired lock)
    INSERT INTO login_attempts (email, attempt_count, last_attempt_at)
    VALUES (lower(trim(p_email)), 1, now());
    
    RETURN jsonb_build_object(
      'locked', false,
      'remaining_attempts', 3
    );
  ELSE
    -- Existing record, increment attempts
    v_new_count := v_record.attempt_count + 1;
    
    IF v_new_count >= 4 THEN
      -- Lock the account for 30 minutes
      v_locked_until := now() + interval '30 minutes';
      
      UPDATE login_attempts
      SET attempt_count = v_new_count,
          last_attempt_at = now(),
          locked_until = v_locked_until
      WHERE email = lower(trim(p_email));
      
      RETURN jsonb_build_object(
        'locked', true,
        'locked_until', v_locked_until,
        'remaining_attempts', 0
      );
    ELSE
      UPDATE login_attempts
      SET attempt_count = v_new_count,
          last_attempt_at = now()
      WHERE email = lower(trim(p_email));
      
      RETURN jsonb_build_object(
        'locked', false,
        'remaining_attempts', GREATEST(4 - v_new_count, 0)
      );
    END IF;
  END IF;
END;
$function$;
