-- Add sport_category_id column to sessions table with FK reference
ALTER TABLE public.sessions 
ADD COLUMN sport_category_id UUID REFERENCES public.sport_categories(id);

-- Create index for query performance
CREATE INDEX idx_sessions_sport_category_id 
ON public.sessions(sport_category_id);

-- Migrate existing sessions: Set default sport category (futsal)
UPDATE public.sessions 
SET sport_category_id = (
  SELECT id FROM public.sport_categories 
  WHERE name = 'futsal' LIMIT 1
)
WHERE sport_category_id IS NULL;