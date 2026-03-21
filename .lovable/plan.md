

## Problem

Currently, when an organizer books a session, the system always adds them as a player (`session_players` insert). Some organizers only manage sessions without playing, but there's no way to opt out. Two scenarios need support:

1. **Group-level default**: Organizer sets a preference in Group Settings to not be auto-added as a player on new bookings
2. **Per-session opt-out**: On an existing session's Game Detail page, the organizer can remove themselves from the player list without cancelling the session

## Solution

### Part 1: Group-level "Organizer plays" setting

Add a new column `organizer_plays` (boolean, default `true`) to the `groups` table. Show a toggle in the Group Settings section on the GroupDetail page. Pass this flag through the booking flow so edge functions skip adding the organizer as a session player when `false`.

### Part 2: Per-session organizer opt-out

On the Game Detail page, when the organizer is in the player list, show a "Leave as player" button that removes them from `session_players` without cancelling the session. The organizer remains the group organizer with full control.

### Changes

| File | Change |
|------|--------|
| **Database migration** | `ALTER TABLE groups ADD COLUMN organizer_plays boolean NOT NULL DEFAULT true;` |
| **GroupDetail.tsx** | Add "I play in sessions" toggle in Group Settings, wired to update `groups.organizer_plays` |
| **create-booking/index.ts** | Accept `organizerPlays` param; skip `session_players` insert for the organizer in the `before_session` flow when `false` |
| **CourtDetail.tsx** | Fetch `organizer_plays` from the selected group and pass it to `create-booking` |
| **GroupSelectionModal.tsx** | Fetch `organizer_plays` from the selected group and include it in the confirm callback data |
| **create-payment/index.ts** | Read `organizerPlays` from metadata; skip session_player insert in deferred record creation when `false` |
| **verify-payment/index.ts** | Read `organizerPlays` from checkout metadata; skip session_player insert in fallback creation when `false` |
| **stripe-webhook/index.ts** | Read `organizerPlays` from checkout metadata; skip session_player insert in deferred handler when `false` |
| **GameDetail.tsx** | For organizers who are in the player list: show "Leave as player" button that deletes their `session_players` row (reusing existing leave logic but without navigating away), keeping the session active |
| **i18n files** | Add translation keys for the new toggle and button labels |

### Technical details

**Database**: Single column addition with safe default — no data migration needed.

**Booking flow data path**:
```text
GroupSelectionModal (reads organizer_plays from group)
  → CourtDetail.handleBookingConfirm (passes to create-booking)
    → create-booking (passes in booking_details metadata)
      → create-payment (stores in Stripe metadata)
        → stripe-webhook / verify-payment / create-payment deferred handler
          → conditionally skip session_players insert
```

**Per-session opt-out** (GameDetail): A simple button visible only to the organizer when they are in the players list. Clicking it deletes their `session_players` row and refreshes data. The session continues normally — only the organizer's participation changes.

