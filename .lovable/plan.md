

## Problem Analysis

**Root cause**: Google OAuth in the authentication system does not distinguish between "sign in" and "sign up". When a user clicks "Continue with Google" on the **Login tab** with an unregistered email, the authentication system automatically creates a new account. The `handle_new_user` database trigger then fires, creating a profile and assigning the default `player` role. The user is fully registered and granted access without ever going through the sign-up flow.

**Security concerns**:
1. Unintended account creation bypasses the sign-up process entirely
2. Users get auto-registered with a default `player` role without consent
3. No terms/privacy acceptance when auto-registered via login tab
4. The `set-initial-role` edge function has a 5-minute window that could be exploited

## Solution

### 1. Detect and reverse accidental registration (Auth.tsx)

After Google OAuth returns on the **login tab** (when `pendingOAuthRole` is NOT set in localStorage), check the user's account age. If the account was created less than 60 seconds ago, this means the user didn't exist before and was auto-registered. In that case:

- Call a new edge function `rollback-oauth-user` to delete the freshly created account (using admin API)
- Sign the user out locally
- Show an error toast: "No account found for this email. Please sign up first."

### 2. Create `rollback-oauth-user` edge function

A lightweight, secure edge function that:
- Validates the caller's JWT
- Confirms the account was created less than 2 minutes ago (safety guard)
- Deletes the user via `admin.auth.admin.deleteUser()` (cascades to `user_roles` and `profiles`)
- Much simpler than `delete-user-account` since there's no data to preserve for a brand-new account

### 3. Harden the login-tab Google button flow (Auth.tsx)

In `handleGoogleSignIn`:
- When `activeTab === "login"`, store a flag `localStorage.setItem("oauthIntent", "login")` 
- When `activeTab === "signup"`, store `localStorage.setItem("oauthIntent", "signup")` (and `pendingOAuthRole` as before)

In the post-OAuth effect:
- Read `oauthIntent` from localStorage
- If `oauthIntent === "login"` AND account age < 60s → rollback + sign out + error message
- If `oauthIntent === "signup"` → proceed with existing role correction flow
- Clean up localStorage flags in all cases

### 4. Update `set-initial-role` edge function

Add a check: if the requesting user was NOT created via OAuth (no Google identity), reject the request. This prevents the edge function from being abused on manually created accounts.

## Files to Change

| File | Change |
|------|--------|
| `supabase/functions/rollback-oauth-user/index.ts` | **New** - Delete freshly created OAuth accounts (< 2 min old) |
| `src/pages/Auth.tsx` | Add `oauthIntent` localStorage flag; add post-OAuth guard that detects accidental registration, calls rollback, signs out, shows error |
| `src/i18n/locales/en/auth.json` | Add `noAccountFound` and `pleaseSignUp` translation keys |
| `src/i18n/locales/pt/auth.json` | Add Portuguese translations for same keys |

## Flow After Fix

```text
Login Tab + Google OAuth:
  User exists    → Sign in normally → redirect by role
  User NOT exist → Account auto-created → detected (age < 60s) 
                 → rollback-oauth-user called → account deleted 
                 → local sign out → toast "No account found, please sign up"

Signup Tab + Google OAuth:
  User exists    → detected (age > 60s) → "Welcome back" toast → redirect
  User NOT exist → Account created → set-initial-role corrects role → redirect
```

