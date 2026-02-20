
## Problem

The current two-phase approach causes visible flicker and a double network fetch:

1. Phase 1: `fetchCourt()` sets `selectedCourtId = mainCourt` → triggers `fetchAvailability(mainCourt)`
2. Phase 2: Availability response arrives → `useEffect` detects mismatch → sets `selectedCourtId = betterCourt` → triggers **a second `fetchAvailability(betterCourt)`** call

The user sees the wrong court name/data flash briefly, and the network makes two round-trips to `get-availability`.

## Root Cause

The `useEffect` auto-switch runs *after* the availability data lands, which changes `selectedCourtId`, which causes the `fetchAvailability` effect (line 302–306) to fire again with the new court ID. This is unavoidable with the current architecture because the two concerns are separated into different effects.

## Solution: Resolve the correct court inside `fetchAvailability` itself

Instead of detecting the mismatch in a `useEffect` after the fact, we resolve the best matching court **inside the `fetchAvailability` callback**, before any state is committed to React. This means:

- Only **one** `get-availability` network call is made (for the correct court)
- React renders the correct court data on the very first render after the load
- Zero visible switch — the user never sees the main court rendered

### How it works

When `fetchAvailability` receives the response, it checks:
1. Does the currently requested `courtId` match any of the user's `preferredSports`?
2. If not, is there another court in `venue_courts` that does?
3. If yes, update **both** `availabilityData` AND `selectedCourtId` in the **same `setState` batch**, AND re-invoke `fetchAvailability` immediately with the correct court ID.

The `hasAutoSelectedRef` guard ensures this re-invocation only happens once per page mount.

### Files to modify

**`src/pages/CourtDetail.tsx`** only.

#### Change 1: Pass `preferredSports` into `fetchAvailability`

The `fetchAvailability` callback currently receives `(venueId, courtId, date)`. We extend it to also accept the current `preferredSports` array and the `hasAutoSelectedRef`, so it can make the correction decision internally without depending on stale closure values.

```typescript
const fetchAvailability = useCallback(async (
  venueId: string,
  courtId: string,
  date: Date,
  isInitialLoad = false  // new flag
) => {
  setAvailabilityLoading(true);
  setAvailabilityError(null);

  try {
    const { data, error } = await supabase.functions.invoke("get-availability", { ... });
    if (error) throw error;

    const response = data as AvailabilityResponse;

    // One-time correction: if this is the initial load and the current court
    // doesn't match preferred sports, switch silently with no second render
    if (isInitialLoad && !hasAutoSelectedRef.current) {
      hasAutoSelectedRef.current = true;
      const venueCourts = response.venue_courts || [];
      
      if (preferredSports.length > 0 && venueCourts.length > 1) {
        const currentCourtSports = venueCourts.find(c => c.id === courtId)?.allowed_sports || [];
        const currentMatchesPreferred =
          currentCourtSports.length === 0 ||
          currentCourtSports.some(s => preferredSports.includes(s));

        if (!currentMatchesPreferred) {
          const betterCourt = venueCourts.find(c => {
            const sports = c.allowed_sports || [];
            return sports.length === 0 || sports.some(s => preferredSports.includes(s));
          });

          if (betterCourt && betterCourt.id !== courtId) {
            // Silently switch: update selectedCourtId so the second fetch
            // uses the correct court. Don't set availabilityData yet — 
            // it will be set by the second fetch.
            setSelectedCourtId(betterCourt.id);
            setCurrentImageIndex(0);
            // fetchAvailability will fire again via the useEffect
            // because selectedCourtId changed. Don't set availabilityData here.
            return; 
          }
        }
      }
    }

    setAvailabilityData(response);
  } catch (error: any) { ... }
  finally { setAvailabilityLoading(false); }
}, [preferredSports]);
```

Wait — this still causes two fetches because `selectedCourtId` change triggers the `useEffect` which calls `fetchAvailability` again. Let me reconsider.

### Better approach: Perform the second fetch directly inside `fetchAvailability`

Rather than relying on `useEffect` to re-trigger, perform the corrective fetch **directly** inside `fetchAvailability` when a better court is found. This way:

- The spinner stays on (never shows wrong court data)
- Only one visible state transition: loading → correct court data
- The `useEffect` auto-selection code can be removed entirely

```typescript
const fetchAvailability = useCallback(async (
  venueId: string,
  courtId: string,
  date: Date,
  isInitialLoad = false
) => {
  setAvailabilityLoading(true);
  setAvailabilityError(null);

  try {
    const { data, error } = await supabase.functions.invoke("get-availability", {
      body: { venueId, courtId, date: format(date, "yyyy-MM-dd") }
    });
    if (error) throw error;

    const response = data as AvailabilityResponse;
    const venueCourts = response.venue_courts || [];

    // One-time preferred-sport correction on initial load
    if (isInitialLoad && !hasAutoSelectedRef.current && preferredSports.length > 0 && venueCourts.length > 1) {
      hasAutoSelectedRef.current = true;
      const currentCourtSports = venueCourts.find(c => c.id === courtId)?.allowed_sports || [];
      const currentMatchesPreferred =
        currentCourtSports.length === 0 ||
        currentCourtSports.some(s => preferredSports.includes(s));

      if (!currentMatchesPreferred) {
        const betterCourt = venueCourts.find(c => {
          const sports = c.allowed_sports || [];
          return sports.length === 0 || sports.some(s => preferredSports.includes(s));
        });

        if (betterCourt && betterCourt.id !== courtId) {
          // Switch court ID silently, then fetch again for that specific court
          setSelectedCourtId(betterCourt.id);
          setCurrentImageIndex(0);
          // Fetch again immediately for the correct court — spinner stays visible
          const { data: data2, error: error2 } = await supabase.functions.invoke("get-availability", {
            body: { venueId, courtId: betterCourt.id, date: format(date, "yyyy-MM-dd") }
          });
          if (error2) throw error2;
          setAvailabilityData(data2 as AvailabilityResponse);
          return;
        }
      }
    }

    setAvailabilityData(response);
  } catch (error: any) {
    console.error("Error fetching availability:", error);
    setAvailabilityError(error.message || "Failed to load availability");
    setAvailabilityData(null);
  } finally {
    setAvailabilityLoading(false);
  }
}, [preferredSports]);
```

#### Change 2: Pass `isInitialLoad = true` from the `fetchCourt` effect

The effect that calls `fetchAvailability` when the court and date are first ready needs to signal this is the initial load:

```typescript
// Fetch availability when date or selected court changes
useEffect(() => {
  if (court?.venues && selectedDate && selectedCourtId) {
    const isFirstLoad = !hasAutoSelectedRef.current;
    fetchAvailability(court.venues.id, selectedCourtId, selectedDate, isFirstLoad);
  }
}, [court, selectedDate, selectedCourtId, fetchAvailability]);
```

Wait — `hasAutoSelectedRef` isn't set yet at this point, so `isFirstLoad` would always be `true` until the first fetch completes. This is fine since `hasAutoSelectedRef.current` is set inside `fetchAvailability` itself.

But there's a subtle issue: if `selectedCourtId` changes (from the `setSelectedCourtId(betterCourt.id)` inside `fetchAvailability`), the `useEffect` will fire again with the new court ID. Since `hasAutoSelectedRef.current` is now `true`, the correction block is skipped — the second fetch proceeds normally. This means **two** `get-availability` calls will be made: one inside `fetchAvailability` (the corrective inner call) AND one from the `useEffect` re-triggering.

### Cleanest approach: Gate the useEffect re-trigger

We need to prevent the `useEffect` from re-triggering when `selectedCourtId` was changed internally by the correction logic. We can do this with a second ref `isAutoSwitchingRef`:

```typescript
const isAutoSwitchingRef = useRef(false);
```

Inside `fetchAvailability`, before calling `setSelectedCourtId(betterCourt.id)`:
```typescript
isAutoSwitchingRef.current = true;
setSelectedCourtId(betterCourt.id);
// ... second fetch ...
isAutoSwitchingRef.current = false;
```

In the `useEffect`:
```typescript
useEffect(() => {
  if (court?.venues && selectedDate && selectedCourtId) {
    if (isAutoSwitchingRef.current) return; // skip — already handled internally
    fetchAvailability(court.venues.id, selectedCourtId, selectedDate, !hasAutoSelectedRef.current);
  }
}, [court, selectedDate, selectedCourtId, fetchAvailability]);
```

This ensures:
- Initial load: `fetchAvailability(mainCourtId, isInitialLoad=true)` is called
- If correction needed: internal second fetch fires, `isAutoSwitchingRef` blocks the `useEffect` re-trigger
- If no correction needed: normal flow continues
- Subsequent date changes: `hasAutoSelectedRef.current = true`, correction block skipped

#### Change 3: Remove the old `useEffect` auto-selection block (lines 1194–1232)

The old `useEffect` that performs the court switch after availability data arrives is no longer needed and must be removed to avoid conflicts.

### Summary of changes to `src/pages/CourtDetail.tsx`

| What | Where | Description |
|---|---|---|
| Add `isAutoSwitchingRef` | ~line 212 | New ref to block useEffect re-trigger during internal correction |
| Refactor `fetchAvailability` | ~line 237 | Add `isInitialLoad` param + preferred-sport correction with inner fetch |
| Update availability `useEffect` | ~line 302 | Pass `isInitialLoad` flag, gate on `isAutoSwitchingRef` |
| Remove old auto-select `useEffect` | ~line 1194 | No longer needed — logic moved into `fetchAvailability` |

### Performance characteristics

- **Best case** (court already matches preferred sport): 1 network call, no change
- **Correction case** (court doesn't match): 2 sequential network calls, but the spinner stays visible the entire time — the user sees only: loading → correct court data
- **Subsequent date changes**: 1 network call, no correction (ref is already set)
- **Manual court switch**: 1 network call per switch, no correction (ref already set)
