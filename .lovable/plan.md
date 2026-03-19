

## Problem

The `venue_weekly_rules` table has a Postgres CHECK constraint: `(start_time < end_time) OR (is_closed = true)`. When the manager sets the same start and end time (e.g., both 6:00 PM), the constraint fails because `start_time = end_time` doesn't satisfy `start_time < end_time`.

Additionally, the user wants:
1. When schedule/overrides change, existing bookings must NOT be affected
2. If a manager tries to close or shorten hours that overlap existing bookings, show a warning popup but still save the schedule — bookings remain untouched

## Solution

### 1. Database migration
- Replace the CHECK constraint with a validation trigger (as per project guidelines, triggers are preferred over CHECK constraints)
- The trigger validates `start_time < end_time` only when `is_closed = false`
- This also handles the edge case where both times are equal more gracefully with a clear error

### 2. Frontend validation (WeeklyScheduleEditor.tsx)
- Add client-side validation before saving: if a day is open, `start_time` must be before `end_time`
- Show a toast error if validation fails, preventing the DB call
- When saving, check if any existing bookings fall outside the new schedule window for that day — if so, show a warning dialog informing the manager that existing bookings won't be affected

### 3. Frontend validation (DateOverridesEditor.tsx)
- When adding an override (closure or custom hours), check if bookings exist on the target dates for this court
- If bookings exist that conflict, show a warning popup: "There are existing bookings during this period. They will not be cancelled or modified."
- Still allow saving the override — it only affects future availability, not existing bookings

### 4. Edge function handling (get-availability)
- No changes needed — the availability function already checks bookings separately from schedule windows. Existing booked slots remain booked regardless of schedule changes.

### Files to change

| File | Change |
|------|--------|
| DB migration | Drop `valid_time_range` CHECK constraint, add validation trigger that rejects `start_time >= end_time` when `is_closed = false` |
| `src/components/manager/WeeklyScheduleEditor.tsx` | Add client-side time validation before save. Query `court_availability` for conflicting bookings and show warning dialog if any exist. |
| `src/components/manager/DateOverridesEditor.tsx` | Before adding override, check `court_availability` for bookings on the target date(s). Show warning popup if conflicts exist but allow save. |

### Technical details

**Migration SQL:**
```sql
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
```

**Booking conflict check (WeeklyScheduleEditor):**
```typescript
// Before saving, check for bookings outside new window
const { data: conflicts } = await supabase
  .from("court_availability")
  .select("id, available_date, start_time, end_time")
  .eq("court_id", courtId)
  .eq("is_booked", true)
  .gte("available_date", new Date().toISOString().split("T")[0]);
// Filter conflicts where booking falls outside new schedule
// Show warning dialog listing affected bookings
```

**Warning dialog content:**
- "Some existing bookings fall outside the updated schedule. These bookings will not be cancelled or modified. Only future availability will be affected."
- Two buttons: "Save Anyway" / "Cancel"

