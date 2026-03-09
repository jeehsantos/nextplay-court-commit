

## Fix: `manage-users` Edge Function Auth Failure

### Root Cause

Line 39: `await supabaseClient.auth.getUser()` fails because with `verify_jwt = false` in config.toml, the Lovable Cloud ES256 token isn't automatically validated by the anon-key client. The token must be passed explicitly to `getUser()`.

### Fix

Update the `manage-users` edge function to:

1. **Extract the Bearer token** from the Authorization header
2. **Pass it explicitly** to `supabaseAdmin.auth.getUser(token)` — use the service role client which can validate any token
3. **Remove the unnecessary anon-key client** entirely (it serves no purpose here)
4. **Limit returned fields** — the `activate` action currently returns the full `data.user` object from `auth.admin.updateUserById`, which leaks auth metadata. Return only `{ success: true }` instead.
5. **Update CORS headers** to include the extended Supabase client headers

### Code Changes

**File: `supabase/functions/manage-users/index.ts`**

- Remove `supabaseClient` (anon key client) creation (lines 33-37)
- Change line 39 from `await supabaseClient.auth.getUser()` to `await supabaseAdmin.auth.getUser(token)` where `token` is extracted from the auth header
- Line 141: Change `{ success: true, user: data.user }` to `{ success: true }` to avoid leaking auth internals
- Update CORS headers to include extended Supabase client headers

### Security Notes
- No new permissions introduced
- Profile data returned is limited to `full_name` only (already the case)
- Auth user data limited to: `id`, `email`, `email_confirmed_at`, `created_at`, `last_sign_in_at` — all needed for admin identification/activation
- Role update and activate actions remain admin-only via `has_role` check using the service role client

