

## Plan: Add Disable/Activate Toggle for Admin User Management

### What exists today
- The `activate` action in `manage-users` already confirms a user's email via `supabaseAdmin.auth.admin.updateUserById(userId, { email_confirm: true })`.
- The frontend shows an "Activate" button only for unconfirmed users, but has no way to **disable** (ban) an active user.

### Changes

**1. Edge function: `supabase/functions/manage-users/index.ts`**
- Add a new `deactivate` action that bans the user via `supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: 'none' })` — actually, use `banned_until` to set a far-future ban. Specifically:
  - `deactivate`: `supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: '876000h' })` (100 years)
  - Update `activate` to also unban: add `ban_duration: 'none'` alongside `email_confirm: true`
- Add the user's `banned_until` field to the `list` response so the frontend knows the status.
- Prevent admin from deactivating themselves.

**2. Frontend: `src/pages/admin/AdminUsers.tsx`**
- Update `UserData` interface to include `banned_until: string | null`.
- Replace the simple "Active/Unconfirmed" badge with three states:
  - **Disabled** (red) — `banned_until` is set and in the future
  - **Active** — email confirmed and not banned
  - **Unconfirmed** — email not confirmed
- Show an "Activate" button for unconfirmed OR disabled users, and a "Disable" button for active users.
- `handleActivate` calls `activate` action (confirms email + unbans).
- New `handleDeactivate` calls `deactivate` action (bans user).
- Update local state accordingly after each action.

### Security
- All actions go through the edge function which validates admin role server-side.
- Admin cannot disable themselves (server-side check).
- No new RLS policies or tables needed.
- No confidential data exposed beyond what's already returned (email, name, role, status).

