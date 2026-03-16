

## Plan: Fix Google OAuth Sign-Up Issues

### Problem Analysis

From the network requests, `user_roles` and `profiles` queries both return `[]` for the Google OAuth user. Two root causes:

1. **No redirect after sign-up**: The post-OAuth role correction effect (line 133) has `if (!user || !userRole || isLoading) return;` — since `userRole` is `null` (no role row exists), the effect never fires. Additionally, the edge function does an `UPDATE` on `user_roles`, but if no row exists (trigger didn't create one), nothing happens.

2. **No feedback for duplicate email**: When Google OAuth signs in an existing user from the signup tab, there's no messaging — it just silently bounces back.

### Changes

**`supabase/functions/set-initial-role/index.ts`**
- Change from `UPDATE` to `UPSERT` — insert the role row if it doesn't exist, or update if it does.
- Also create a `profiles` row if missing (using the user's metadata: full_name, avatar_url, email).

**`src/pages/Auth.tsx`**
- **Fix the post-OAuth useEffect** (line 133): Fire when `user` exists and `userRole` is `null` OR differs from `pendingOAuthRole`. Currently it exits early when `userRole` is null.
- **Detect existing user on signup tab**: After OAuth completes, check if the user's `created_at` is older than 1 minute. If so, show a "Welcome back! You already have an account" toast and redirect normally instead of attempting role correction.
- **Redirect fix**: The redirect effect (line 161) already handles `user && userRole` — once the edge function creates the role and `refreshRole()` runs, it will trigger the redirect.

### Technical Detail

```text
Post-OAuth flow (fixed):
1. User returns from Google OAuth → session established
2. useEffect detects: user exists, pendingOAuthRole in localStorage
3. If user.created_at > 1 min ago → existing user, show "welcome back" toast, clear localStorage, redirect
4. If new user → call set-initial-role edge function (which now UPSERTs role + creates profile)
5. refreshRole() → userRole updates → redirect effect fires → user lands on correct dashboard
```

### Files
- `supabase/functions/set-initial-role/index.ts` — UPSERT role + create profile if missing
- `src/pages/Auth.tsx` — fix post-OAuth effect conditions, add existing-user detection
- `src/i18n/locales/en/auth.json` — add "welcomeBack" and "alreadyHaveAccount" keys
- `src/i18n/locales/pt/auth.json` — Portuguese translations

