

## Plan: Fix Google Sign-Up Role Assignment

### Problem
When signing up via "Continue with Google", the `handle_new_user` database trigger defaults the role to `player` because Google OAuth doesn't pass role metadata. Court managers signing up via Google get incorrectly assigned as players.

### Solution
**Pre-selection + post-OAuth role correction flow:**

1. On the **Sign Up tab**, require the user to select a role before clicking "Continue with Google". If no role is selected (or still default), the Google button works as-is but stores the selected role.
2. Before initiating Google OAuth from the signup tab, save the selected role to `localStorage` (e.g. `pendingOAuthRole`).
3. After OAuth redirect completes and the user session is established, check for `pendingOAuthRole` in localStorage. If it exists and differs from the assigned role, update `user_roles` to the correct role.
4. On the **Login tab**, "Continue with Google" works as before (existing users already have their role).

### Files to modify

**`src/pages/Auth.tsx`**
- Extract the role field from the signup form so it appears **above** the "Continue with Google" button (it already does visually — good).
- Update `handleGoogleSignIn` to:
  - If on signup tab: read `signUpForm.getValues("role")`, store in `localStorage` as `pendingOAuthRole`.
  - If on login tab: no change.
- Add a `useEffect` that runs when `user` becomes available: check `localStorage` for `pendingOAuthRole`. If present and the user's current role differs, call an update to correct it, then remove from localStorage.

**`src/lib/auth-context.tsx`**
- After the `onAuthStateChange` handler detects a new session (especially from OAuth), check for `pendingOAuthRole` in localStorage.
- If found and it's `court_manager`, update `user_roles` via supabase and refresh the local role state.
- Clean up localStorage after update.

### Technical detail: role update after OAuth

The `handle_new_user` trigger assigns `player` by default. To correct this for court_manager:

```typescript
// In Auth.tsx useEffect, after user + session detected:
const pendingRole = localStorage.getItem("pendingOAuthRole");
if (pendingRole && pendingRole !== userRole && user) {
  await supabase
    .from("user_roles")
    .update({ role: pendingRole })
    .eq("user_id", user.id);
  localStorage.removeItem("pendingOAuthRole");
  refreshRole(); // re-fetch to update UI
}
```

This is safe because:
- The RLS policy on `user_roles` doesn't allow users to UPDATE their own roles, so this update needs to go through a **security definer function** or edge function.
- We'll create a small edge function `set-initial-role` that accepts the role and user ID, validates it's the user's first sign-in (profile created within last 5 minutes), and performs the update. This prevents abuse (users can't change their role later).

**New edge function: `supabase/functions/set-initial-role/index.ts`**
- Accepts `{ role: "player" | "court_manager" }` from authenticated user.
- Validates the user account was created within the last 5 minutes (prevents role-switching abuse).
- Updates `user_roles` for the calling user using service-role client.
- Returns success/error.

### Flow summary

```text
Sign Up tab:
  1. User selects role (Player / Court Manager)
  2. User clicks "Continue with Google"
  3. Selected role saved to localStorage
  4. Google OAuth flow runs → handle_new_user assigns "player" default
  5. User redirected back → useEffect detects pendingOAuthRole
  6. If role is "court_manager", calls set-initial-role edge function
  7. Role corrected, user redirected to /manager

Login tab:
  No change — existing users already have roles assigned.
```

