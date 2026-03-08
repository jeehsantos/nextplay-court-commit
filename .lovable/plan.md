

# Ban/Remove Members from Groups and Quick Games

## Overview
Add ability for organizers and co-organizers to remove or ban members from groups and quick game lobbies. Banned users cannot rejoin, view sessions, or participate.

## Database Changes

### New table: `group_bans`
```sql
CREATE TABLE public.group_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  banned_by uuid NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);
ALTER TABLE public.group_bans ENABLE ROW LEVEL SECURITY;
```

RLS: Organizers and co-organizers can insert/view/delete bans. Banned users can view their own ban (to show feedback).

### New table: `quick_challenge_bans`
```sql
CREATE TABLE public.quick_challenge_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.quick_challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  banned_by uuid NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);
ALTER TABLE public.quick_challenge_bans ENABLE ROW LEVEL SECURITY;
```

### Security definer functions
- `is_group_ban_manager(group_id, user_id)` -- returns true if user is organizer or co-organizer (is_admin in group_members)
- `is_user_banned_from_group(group_id, user_id)` -- for RLS on sessions/groups visibility

### RLS policy updates
- **groups SELECT**: Add check that user is not banned
- **sessions SELECT**: Add check that user is not banned from the group
- **group_members INSERT**: Prevent banned users from joining
- **quick_challenge_players INSERT**: Prevent banned users from joining

## Backend Edge Function: `ban-group-member`
Handles:
1. Verify caller is organizer or co-organizer
2. Insert ban record
3. Remove from `group_members`
4. Remove from any active `session_players` for this group's sessions
5. Return success

## Backend Edge Function: `kick-challenge-player`
Handles:
1. Verify caller is challenge organizer
2. Insert ban record in `quick_challenge_bans`
3. Delete player from `quick_challenge_players`
4. If player had paid, convert court_amount to credits (reuse leave logic)
5. Return success

## Frontend Changes

### `src/pages/GroupDetail.tsx`
- Add "Remove" and "Ban" buttons next to each regular member and co-organizer (visible to organizer + co-organizers)
- Confirmation dialog before ban/remove
- Call `ban-group-member` edge function
- Remove member from local state on success

### `src/pages/QuickGameLobby.tsx`
- Add kick/ban option for organizer on each player slot (small icon button)
- Confirmation dialog
- Call `kick-challenge-player` edge function

### `src/pages/JoinGroup.tsx`
- Check if user is banned before allowing join; show "You have been banned" message

## Files to Create/Edit
1. **Migration SQL** -- create `group_bans`, `quick_challenge_bans` tables, RLS policies, security definer functions, update existing RLS on `group_members` and `quick_challenge_players`
2. **`supabase/functions/ban-group-member/index.ts`** -- new edge function
3. **`supabase/functions/kick-challenge-player/index.ts`** -- new edge function
4. **`src/pages/GroupDetail.tsx`** -- add remove/ban UI + confirmation dialogs
5. **`src/pages/QuickGameLobby.tsx`** -- add kick UI for organizer
6. **`src/pages/JoinGroup.tsx`** -- ban check on join attempt

