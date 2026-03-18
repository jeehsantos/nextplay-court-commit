
-- Step 1: Add sport_category_id column to groups (nullable initially)
ALTER TABLE public.groups ADD COLUMN sport_category_id uuid REFERENCES public.sport_categories(id);

-- Step 2: Backfill from sport_type name matching sport_categories.name
UPDATE public.groups g
SET sport_category_id = sc.id
FROM public.sport_categories sc
WHERE sc.name = g.sport_type::text;

-- Step 3: For any remaining nulls, map to 'other' category
UPDATE public.groups
SET sport_category_id = (SELECT id FROM public.sport_categories WHERE name = 'other' LIMIT 1)
WHERE sport_category_id IS NULL;

-- Step 4: Make NOT NULL
ALTER TABLE public.groups ALTER COLUMN sport_category_id SET NOT NULL;

-- Step 5: Drop the sport_type column
ALTER TABLE public.groups DROP COLUMN sport_type;

-- Step 6: Fix profiles.preferred_sports from sport_type[] to text[]
ALTER TABLE public.profiles ALTER COLUMN preferred_sports TYPE text[] USING preferred_sports::text[];
