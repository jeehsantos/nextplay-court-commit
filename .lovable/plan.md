

## Plan: Sorting by Closest Date + Reschedule Booking Button

### 1. Sort bookings by closest date (ascending)

**File: `src/pages/manager/ManagerBookings.tsx`**
- Change the `filteredBookings` sort to ascending order by `available_date` then `start_time` (closest date first)
- The DB query already fetches with `ascending: false`; we'll re-sort in the `filteredBookings` memo

### 2. Create a `RescheduleBookingDialog` component

**New file: `src/components/manager/RescheduleBookingDialog.tsx`**

A dialog that:
- Accepts a booking ID, court ID, venue ID, and current date/time
- Shows a calendar date picker for selecting a new date
- Calls the existing `get-availability` edge function to fetch available slots for the selected date and court
- Displays available time slots using a grid (reusing `TimeSlotPicker` pattern)
- On confirm, calls a new backend function to perform the reschedule

### 3. Create a `reschedule-booking` edge function

**New file: `supabase/functions/reschedule-booking/index.ts`**

Backend-first logic:
- Accepts `booking_id` (court_availability ID), `new_date`, `new_start_time`, `new_end_time`
- Validates the manager owns the venue
- Validates the new slot is available (no overlaps)
- Updates `court_availability` row: changes `available_date`, `start_time`, `end_time`
- If there's a linked session (`booked_by_session_id`), updates `sessions.session_date` and `sessions.start_time` / `duration_minutes`
- No payment changes needed — the booking stays paid
- Returns success/error

Config addition to `supabase/config.toml`:
```toml
[functions.reschedule-booking]
verify_jwt = false
```

### 4. Add "Reschedule" button to BookingCard

**File: `src/pages/manager/ManagerBookings.tsx`**
- Below the status badge in `BookingCard`, add a small "Reschedule" button (only for active, non-cancelled bookings)
- Opens the `RescheduleBookingDialog`
- On successful reschedule, calls `fetchData()` to refresh the list

### 5. Add "Reschedule" button to Dashboard UpcomingBookings

**File: `src/components/manager/dashboard/UpcomingBookings.tsx`**
- Add the same reschedule button under each booking's badge
- Need to pass `court_id` and `venue_id` info — extend `UpcomingBookingInfo` type with `courtId` and `venueId`
- Update `useManagerDashboard.ts` to include these fields in the mapped data
- On reschedule success, trigger a refresh of dashboard data

### Technical Details

**Reschedule edge function flow:**
1. Authenticate manager via auth header
2. Verify manager owns the court's venue
3. Check new slot has no overlapping booked records in `court_availability`
4. Check no active holds on the new slot
5. Update the `court_availability` row (date, start_time, end_time)
6. If session exists, update `sessions` table (session_date, start_time, duration_minutes)
7. Return success

**Dialog UX flow:**
1. User clicks "Reschedule" → dialog opens
2. User picks a new date from calendar
3. System fetches availability via `get-availability` edge function
4. User selects a time slot
5. User confirms → calls `reschedule-booking` edge function
6. Success toast → dialog closes → list refreshes

