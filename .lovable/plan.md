

## Problem

The `groups` table has a `sport_type` column using a **Postgres enum** (`sport_type`) with a fixed set of values (`futsal`, `tennis`, `volleyball`, `basketball`, `turf_hockey`, `badminton`, `hockey`, `other`). When an admin adds a new sport category (e.g., "football") to the `sport_categories` table, the booking flow crashes because it tries to insert that name into the enum column and Postgres rejects it.

The previous fix used a hardcoded array of valid enum values as a fallback -- exactly the static approach you want eliminated. The real fix is to **replace `groups.sport_type` (enum) with `groups.sport_category_id` (UUID FK to `sport_categories`)**, making the system fully dynamic.

## Solution: Migrate `groups.sport_type` to `groups.sport_category_id`

### 1. Database migration

- Add `sport_category_id UUID REFERENCES sport_categories(id)` column to `groups` table (nullable initially)
- Backfill existing rows: match `groups.sport_type` name against `sport_categories.name`, set the FK
- For any unmatched rows, create corresponding sport_categories or map to a fallback
- Make `sport_category_id` NOT NULL after backfill
- Drop the `sport_type` column from `groups`
- Also change `profiles.preferred_sports` from `sport_type[]` to `text[]` (it already stores category names as strings, so this is just a type correction -- the column default is already `'{}'::text[]` but the declared type is `sport_type[]`)

### 2. Frontend changes

| File | Change |
|------|--------|
| `src/components/booking/BookingWizard.tsx` | Remove `sportType` prop. The component already selects a `sportCategoryId` from the DB. Use that for group creation instead of `sport_type`. Insert `sport_category_id` instead of `sport_type` when creating a new group. |
| `src/components/booking/GroupSelectionModal.tsx` | Remove `sportType` prop. Add sport category selection (like BookingWizard already has). Insert `sport_category_id` instead of `sport_type`. |
| `src/pages/CourtDetail.tsx` | Remove the hardcoded enum array check. Stop passing `sportType` to BookingWizard/GroupSelectionModal. Pass `allowedSports` (from court) so the wizards can filter categories. |
| `src/components/cards/GroupCard.tsx` | Change `sport` prop from the hardcoded `SportType` union to `string`. Look up display info from sport category data instead of static maps. |
| `src/pages/Groups.tsx` | Update to pass sport category info instead of `sport_type` to GroupCard. |
| `src/pages/GroupDetail.tsx` | Replace `group.sport_type` references with sport category lookup. |
| `src/pages/Discover.tsx` | Replace `group.sport_type` references with sport category data. |
| `src/pages/GameDetail.tsx` | Replace `group.sport_type` fallback with `sport_category_id` join. |
| `src/pages/ArchivedSessions.tsx` | Replace `sport_type` references with sport category join. |
| `src/hooks/useMyGames.ts` | Replace `sport` field (enum) with sport category data from the `sport_category_id` FK. |
| `src/lib/sport-category-utils.ts` | Remove the `SportType` enum dependency. Functions already work with string keys. |
| `src/components/ui/sport-icon.tsx` | Already handles arbitrary strings with fallbacks -- no change needed. |
| `supabase/functions/export-user-data/index.ts` | Update `groups` select to use `sport_category_id` instead of `sport_type`. |
| `supabase/functions/create-booking/index.ts` | Already receives `sportCategoryId` -- no change needed. |

### 3. Profile `preferred_sports` column

The `profiles.preferred_sports` column is declared as `sport_type[]` but actually stores sport category names as strings. The migration will alter it to `text[]` to match reality and remove the enum dependency.

## Technical details

### Migration SQL (conceptual)

```sql
-- Add new column
ALTER TABLE groups ADD COLUMN sport_category_id UUID REFERENCES sport_categories(id);

-- Backfill from sport_type name matching sport_categories.name
UPDATE groups g SET sport_category_id = sc.id
FROM sport_categories sc WHERE sc.name = g.sport_type::text;

-- For any remaining nulls, map to 'other' category
UPDATE groups SET sport_category_id = (SELECT id FROM sport_categories WHERE name = 'other' LIMIT 1)
WHERE sport_category_id IS NULL;

-- Make NOT NULL
ALTER TABLE groups ALTER COLUMN sport_category_id SET NOT NULL;

-- Drop old column
ALTER TABLE groups DROP COLUMN sport_type;

-- Fix profiles column type
ALTER TABLE profiles ALTER COLUMN preferred_sports TYPE text[] USING preferred_sports::text[];
```

### Key booking flow after fix

```text
Court has allowed_sports: ["football", "tennis"]
  → BookingWizard fetches sport_categories, filters by court's allowed_sports
  → User picks "Football" (sport_category_id = abc123)
  → New group created with sport_category_id = abc123 (no enum involved)
  → Works for ANY sport category added by admin
```

