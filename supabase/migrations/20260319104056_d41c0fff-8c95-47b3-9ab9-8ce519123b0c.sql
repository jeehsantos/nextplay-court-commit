
-- Drop the venue-level unique constraint
ALTER TABLE public.venue_weekly_rules DROP CONSTRAINT IF EXISTS unique_venue_day;

-- Add court_id column
ALTER TABLE public.venue_weekly_rules ADD COLUMN IF NOT EXISTS court_id uuid REFERENCES public.courts(id) ON DELETE CASCADE;

-- Backfill: for each active court in a venue, duplicate existing venue-level rules
INSERT INTO public.venue_weekly_rules (venue_id, court_id, day_of_week, start_time, end_time, is_closed)
SELECT vwr.venue_id, c.id, vwr.day_of_week, vwr.start_time, vwr.end_time, vwr.is_closed
FROM public.venue_weekly_rules vwr
JOIN public.courts c ON c.venue_id = vwr.venue_id AND c.is_active = true
WHERE vwr.court_id IS NULL;

-- Delete the old venue-level rules (no court_id)
DELETE FROM public.venue_weekly_rules WHERE court_id IS NULL;

-- Make court_id NOT NULL
ALTER TABLE public.venue_weekly_rules ALTER COLUMN court_id SET NOT NULL;

-- Add new unique constraint on court_id + day_of_week
ALTER TABLE public.venue_weekly_rules ADD CONSTRAINT unique_court_day UNIQUE (court_id, day_of_week);

-- Add court_id to venue_date_overrides
ALTER TABLE public.venue_date_overrides ADD COLUMN IF NOT EXISTS court_id uuid REFERENCES public.courts(id) ON DELETE CASCADE;

-- Backfill overrides
INSERT INTO public.venue_date_overrides (venue_id, court_id, start_date, end_date, is_closed, custom_start_time, custom_end_time, note)
SELECT vdo.venue_id, c.id, vdo.start_date, vdo.end_date, vdo.is_closed, vdo.custom_start_time, vdo.custom_end_time, vdo.note
FROM public.venue_date_overrides vdo
JOIN public.courts c ON c.venue_id = vdo.venue_id AND c.is_active = true
WHERE vdo.court_id IS NULL;

-- Delete old venue-level overrides
DELETE FROM public.venue_date_overrides WHERE court_id IS NULL;

-- Make court_id NOT NULL
ALTER TABLE public.venue_date_overrides ALTER COLUMN court_id SET NOT NULL;
