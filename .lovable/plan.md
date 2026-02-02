
# Add Lobby Chat to Quick Game Lobby

## Overview

Implement a real-time chat system at the bottom of the Quick Game Lobby, allowing players who have joined the match to communicate with each other. Chat history will be automatically deleted when the session ends or the organizer cancels the lobby.

## What Will Be Added

### For Players
- **Lobby Chat**: A chat section at the bottom of the Quick Game Lobby page
- **System Messages**: Automatic notifications (e.g., "Alex created the match")
- **Player Messages**: Send and receive messages from other players in the lobby
- **Real-time Updates**: Messages appear instantly for all players

### Chat Rules
- Only players who have joined the lobby can see and send messages
- Chat history is deleted when:
  - The match session is completed
  - The organizer cancels/quits the lobby
  - The scheduled date passes (automatic cleanup)

---

## Technical Implementation

### Phase 1: Database Schema

Create a new table `quick_challenge_messages` to store lobby chat messages:

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| challenge_id | UUID | Foreign key to quick_challenges |
| sender_id | UUID | Foreign key to auth.users |
| content | TEXT | Message content |
| message_type | TEXT | 'system' or 'user' |
| created_at | TIMESTAMPTZ | When the message was sent |

**RLS Policies:**
- Players who have joined the challenge can read messages for that challenge
- Players can only insert messages for challenges they've joined
- Only the sender can delete their own messages
- No updates allowed (messages are immutable)

**Realtime:**
- Enable realtime for the table so messages appear instantly

### Phase 2: Backend - Auto-Cleanup Function

Create a database function and trigger to delete chat messages when a challenge status changes to 'completed' or 'cancelled':

```sql
-- Function to clean up chat when challenge ends
CREATE OR REPLACE FUNCTION cleanup_challenge_chat()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('completed', 'cancelled') AND OLD.status NOT IN ('completed', 'cancelled') THEN
    DELETE FROM quick_challenge_messages WHERE challenge_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on quick_challenges
CREATE TRIGGER trigger_cleanup_challenge_chat
AFTER UPDATE ON quick_challenges
FOR EACH ROW
EXECUTE FUNCTION cleanup_challenge_chat();
```

### Phase 3: Create Lobby Chat Hook

Create a new hook `src/hooks/useLobbyChatMessages.ts` to manage chat messages:

**Features:**
- Fetch messages for a specific challenge
- Real-time subscription to new messages
- Send message mutation
- System message creation (when player joins/leaves)

```typescript
// Hook interface
export function useLobbyChatMessages(challengeId: string) {
  // Returns:
  // - messages: array of chat messages
  // - isLoading: loading state
  // - sendMessage: function to send a message
  // - sendSystemMessage: function to send system notifications
}
```

### Phase 4: Create LobbyChatPanel Component

Create `src/components/quick-challenge/LobbyChatPanel.tsx`:

**Based on Reference Design:**
- Left side: Chat messages area with scroll
- Right side: Player count badge + Match status badge + Arena Rules link
- Bottom: Input field with placeholder "Send a message to the group..."

**Layout (from reference image):**
```text
+--------------------------------------------------+
| SYSTEM: Alex Silva created the group.            |
| ALEX SILVA: Let's win team!                      |
|                                                  |
| [Send a message to the group...]                 |
+----------------------------------+---------------+
                                   | 4/10 PLAYERS  |
                                   | MATCH CONFIRMED|
                                   | ARENA RULES 👥 |
                                   +---------------+
```

**Component Props:**
```typescript
interface LobbyChatPanelProps {
  challengeId: string;
  currentUserId: string;
  totalSlots: number;
  filledSlots: number;
  isMatchFull: boolean;
}
```

### Phase 5: Update QuickGameLobby.tsx

Modify the footer section to include the chat panel:

**Current Footer (lines 610-646):**
- Shows player count and status badges

**Updated Footer:**
- Replace with `LobbyChatPanel` component that includes:
  - Chat messages area on the left
  - Status badges on the right
  - Message input at the bottom

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| Database Migration | Create | Add `quick_challenge_messages` table with RLS |
| Database Migration | Create | Add cleanup trigger for chat messages |
| `src/hooks/useLobbyChatMessages.ts` | Create | Hook for fetching/sending chat messages |
| `src/components/quick-challenge/LobbyChatPanel.tsx` | Create | Chat panel component |
| `src/pages/QuickGameLobby.tsx` | Modify | Replace footer with chat panel |

---

## User Experience Flow

1. **Player joins lobby** -> System message appears: "[Player] joined the match"
2. **Player sends message** -> Message appears for all players in real-time
3. **Other players see** -> Messages update instantly via Supabase Realtime
4. **Match completes/cancelled** -> All chat history is automatically deleted

---

## Design Details (Matching Reference Image)

### Chat Message Styling
- **System messages**: Highlighted in blue/cyan color with "SYSTEM:" prefix
- **User messages**: Yellow/gold username, white/light message text
- **Font size**: Small (10-11px) for compact display

### Footer Layout
- **Height**: ~128px (h-32)
- **Left section**: Chat messages + input (flex-1)
- **Right section**: Status badges (1/3 width on mobile, 1/2 on desktop)

### Input Field
- Dark background with subtle border
- Placeholder: "Send a message to the group..."
- No send button (Enter key to send)

### Status Section
- Player count badge: "4/10 PLAYERS"
- Match status badge: "MATCH CONFIRMED" (green, only when full)
- "Arena Rules" link with Users icon
