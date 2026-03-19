
ALTER TABLE public.venue_weekly_rules DROP CONSTRAINT IF EXISTS valid_time_range;

CREATE OR REPLACE FUNCTION public.validate_weekly_rule_time_range()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.is_closed = false AND NEW.start_time >= NEW.end_time THEN
    RAISE EXCEPTION 'Opening time must be before closing time';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_weekly_rule_time_range
  BEFORE INSERT OR UPDATE ON public.venue_weekly_rules
  FOR EACH ROW EXECUTE FUNCTION public.validate_weekly_rule_time_range();
