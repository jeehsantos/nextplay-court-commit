

## Problem

Two distinct issues cause the symptoms you're seeing:

### Issue 1: Ghost booking record (orphan data)
The `court_availability` row for **Futsal A** at 18:00–19:00 on March 28 has `booked_by_user_id` set but `is_booked = false` and `booked_by_session_id = NULL`. There is no session or payment associated with it — it's an orphan from the earlier duplicate booking bug. Because the availability query uses `booked_by_user_id IS NOT NULL` as a booking indicator, this ghost record is treated as "booked."

This is why the booking doesn't appear in the manager's bookings page or the user's "My Games" — there's no actual session, just a dangling `court_availability` row.

### Issue 2: Cross-court slot contamination
When a user selects **Court B**, the `get-availability` function detects Court B is a sub-court of **Futsal A** (parent). It then loads BOTH courts into `courtsToProcess`. When building slot status, if ANY court in the group has a booking at a given time, the slot is marked as `CONFIRMED` (Booked) — even though Court B itself is completely free.

The slot status should only reflect the **currently selected court**, not sibling/parent courts. The other courts should only appear in the `available_courts` list to show alternatives.

## Solution

### 1. Clean up the orphan court_availability record
Run a migration to delete the ghost record that has no session and `is_booked = false`.

```sql
DELETE FROM court_availability
WHERE id = 'd4bb98ab-95ca-44ac-b944-b5603e485455';
```

Also add a broader cleanup for any similar orphans (no session, not booked, but user_id set):

```sql
UPDATE court_availability
SET booked_by_user_id = NULL, booked_by_group_id = NULL
WHERE is_booked = false
  AND booked_by_session_id IS NULL
  AND booked_by_user_id IS NOT NULL;
```

### 2. Fix cross-court slot status contamination in `get-availability`

In `supabase/functions/get-availability/index.ts`, change the slot-building logic so that the overall slot `status` is determined **only by the requested court** (when a specific `courtId` is provided), not by all sibling courts. The `available_courts` list already correctly shows which courts are free — the slot status badge should reflect whether the selected court specifically is available.

The fix targets lines 355-364: when a slot is unavailable on a court that is NOT the requested court, skip setting `slotStatus = "CONFIRMED"`. Only set it when the unavailable court matches the user's selected `courtId`.

### 3. Fix the booking query filter

The availability query at line 237 uses `or("is_booked.eq.true,booked_by_user_id.not.is.null")`. The `booked_by_user_id.not.is.null` condition catches records that aren't actually booked (like the orphan). Change this to only use `is_booked.eq.true` since that's the authoritative booking flag.

### Files to update

| # | File | Change |
|---|------|--------|
| 1 | New migration | Clean orphan `court_availability` records |
| 2 | `supabase/functions/get-availability/index.ts` | Fix slot status to only reflect requested court; fix booking query filter |

