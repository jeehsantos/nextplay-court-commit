

# Demo Mode for Platform Prospection

## Overview

Create a self-contained demo layer that renders static/mock data for each user role (Player/Organizer, Court Manager) without touching real data, auth, or existing components. A "Try Demo" button on the Landing page opens a role picker dialog, then redirects to dedicated demo routes that render purpose-built demo pages with hardcoded data.

## Architecture

```text
Landing Page
  └─ [Try Demo] button
       └─ Dialog: "Player/Organizer" | "Court Manager"
            ├─ Player → /demo/player (tabs: Courts, Groups, Games, Profile)
            └─ Manager → /demo/manager (Dashboard with static stats)
```

Key principle: **zero changes to existing pages/hooks/components**. Demo pages are entirely new files that import only shared UI primitives (Card, Badge, Button, etc.) and render static data inline.

## Technical Details

### 1. Demo Data File

**`src/demo/demoData.ts`** — All mock records in one place:

- `demoCourts`: 4-6 courts with venue info, photos (placeholder URLs), sports, prices
- `demoGroups`: 2-3 groups with member counts, schedules
- `demoGames`: 3-4 upcoming sessions with dates, players, status
- `demoProfile`: A sample player profile (name, avatar, city, preferred sports, credits)
- `demoDashboardStats`: Bookings count, revenue, utilization for manager view
- `demoLiveCourts`: 3 courts with in-use/available/upcoming status
- `demoUpcomingBookings`: 3-4 bookings with booker info, payment status
- `demoWeeklyPerformance`: 7 days of revenue/bookings data

### 2. Demo Context

**`src/demo/DemoContext.tsx`** — React context providing:
- `isDemoMode: boolean`
- `demoRole: "player" | "manager" | null`
- `exitDemo(): void` → navigates back to `/`

Used by demo pages to show an "Exit Demo" banner at the top.

### 3. Demo Pages

**`src/demo/DemoPlayerView.tsx`**
- Renders a tabbed layout (Courts / Groups / Games / Profile) using existing UI components (Card, Badge, Tabs, Avatar, etc.)
- Each tab maps over the static arrays from `demoData.ts`
- Court cards show name, venue, sport badges, price — no click-through
- Games tab shows upcoming/past mock sessions
- Profile tab shows the mock profile with credits, preferences
- Top banner: "Demo Mode — Player View" + [Exit Demo] button

**`src/demo/DemoManagerView.tsx`**
- Reuses the existing `StatsCards`, `LiveCourtStatus`, `WeeklyPerformance`, `UpcomingBookings` dashboard components directly — they already accept data via props
- Passes static mock data from `demoData.ts` as props with `loading={false}`
- Wraps in a simplified layout (not ManagerLayout, to avoid auth checks)
- Top banner: "Demo Mode — Court Manager View" + [Exit Demo] button

**`src/demo/DemoRolePickerDialog.tsx`**
- Modal dialog with two role cards (same style as RoleSelection)
- On selection, navigates to `/demo/player` or `/demo/manager`

### 4. Landing Page Update

**`src/pages/Landing.tsx`**
- Add a "Try Demo" outline button next to existing CTAs in the hero section
- On click, opens `DemoRolePickerDialog`

### 5. Routes

**`src/App.tsx`**
- Add two new routes (lazy loaded):
  - `/demo/player` → `DemoPlayerView`
  - `/demo/manager` → `DemoManagerView`
- No auth protection on these routes

### 6. Translation Updates

Add demo-specific keys to `en/landing.json` and `pt/landing.json`:
- `demo.tryDemo`, `demo.chooseRole`, `demo.playerRole`, `demo.managerRole`
- `demo.exitDemo`, `demo.demoBanner`, `demo.playerView`, `demo.managerView`

### 7. Files Changed

| File | Change |
|------|--------|
| `src/demo/demoData.ts` | New: all static mock data |
| `src/demo/DemoContext.tsx` | New: demo mode context |
| `src/demo/DemoPlayerView.tsx` | New: player demo page |
| `src/demo/DemoManagerView.tsx` | New: manager demo page |
| `src/demo/DemoRolePickerDialog.tsx` | New: role selection dialog |
| `src/pages/Landing.tsx` | Add "Try Demo" button |
| `src/App.tsx` | Add `/demo/*` routes |
| `src/i18n/locales/en/landing.json` | Demo translation keys |
| `src/i18n/locales/pt/landing.json` | Demo translation keys |

### Safety

- No database queries, no auth checks, no Supabase imports in demo pages
- Existing pages/hooks/components remain completely untouched
- Manager dashboard sub-components are reused safely since they accept data via props
- Demo routes are public (no ProtectedRoute wrapper)

