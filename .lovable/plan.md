

## Problem

The `effectivePaymentTiming` computation in `CourtDetail.tsx` (line 1406) always reads from `court.payment_timing` — the **parent** multi-court loaded from the URL. When a user selects a sub-court (e.g., Court B with `before_session`), the wizard still shows "Payment Required at Booking" warnings because it uses the parent's `at_booking` setting.

The sub-court's `payment_timing` is never sent from the backend or used in the frontend.

## Solution

Propagate each sub-court's `payment_timing` and `payment_hours_before` through the availability API, then use the **selected sub-court's** values when computing effective payment timing.

### Changes

| File | Change |
|------|--------|
| `supabase/functions/get-availability/index.ts` | Add `payment_timing` and `payment_hours_before` to `courtToDropdownEntry` output |
| `src/pages/CourtDetail.tsx` | Add `payment_timing` and `payment_hours_before` to `AvailableCourt` interface; update `effectivePaymentTiming` to prefer the selected sub-court's values over the parent court's |

### Technical Details

**get-availability** `courtToDropdownEntry`:
```typescript
function courtToDropdownEntry(c: Court) {
  return {
    ...existing fields,
    payment_timing: c.payment_timing,
    payment_hours_before: c.payment_hours_before,
  };
}
```

**CourtDetail.tsx** `AvailableCourt` interface:
```typescript
interface AvailableCourt {
  ...existing fields,
  payment_timing?: string | null;
  payment_hours_before?: number | null;
}
```

**CourtDetail.tsx** `effectivePaymentTiming` (line ~1406):
```typescript
const effectivePaymentTiming = (() => {
  const selectedCourt = getSelectedCourt();
  const timing = selectedCourt?.payment_timing ?? court?.payment_timing ?? "at_booking";
  const hoursBefore = selectedCourt?.payment_hours_before ?? court?.payment_hours_before ?? 24;
  
  if (timing !== "before_session" || !selectedDate) return timing;
  
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const startTime = getStartTime();
  const sessionStart = new Date(`${dateStr}T${startTime}`);
  const deadline = new Date(sessionStart.getTime() - hoursBefore * 60 * 60 * 1000);
  return new Date() >= deadline ? "at_booking" : "before_session";
})() as "at_booking" | "before_session";
```

This ensures the wizard shows the correct payment warnings matching the actual sub-court configuration, and the backend `create-booking` (which already inherits parent timing for sub-courts) stays consistent.

