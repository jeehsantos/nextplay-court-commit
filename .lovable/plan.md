

## Security Review and Fix Plan

After reviewing console logs, security scan results, and the codebase, here are the issues found and the fixes required:

---

### Issue 1: Cron Functions Callable Without Authentication (Medium)

**Problem:** `cancel-expired-bookings` and `expire-holds` have no authentication checks. Anyone with the public anon key can trigger session cancellations and hold expiration at will.

**Fix:** Add a shared `CRON_SECRET` header check to both functions. Request the user to set the secret, then update both functions to validate `x-cron-secret` header before proceeding.

**Files:** `supabase/functions/cancel-expired-bookings/index.ts`, `supabase/functions/expire-holds/index.ts`

---

### Issue 2: XSS in Contact Email Template (Medium)

**Problem:** `send-contact-email` interpolates user-submitted `name`, `email`, `subject`, and `message` directly into an HTML email template without escaping. An attacker could inject malicious HTML/JS into the email body.

**Fix:** Add an HTML entity escaping function and apply it to all user-provided values before interpolation into the HTML template.

**File:** `supabase/functions/send-contact-email/index.ts`

---

### Issue 3: `addRole` Client Function Exposes Role Self-Assignment (Low)

**Problem:** `useUserRole.ts` exports an `addRole` function that calls `supabase.from("user_roles").insert(...)` directly. While RLS now blocks `court_manager`, the function is unnecessary and could be misused if RLS is ever relaxed.

**Fix:** Remove the `addRole` function entirely. Role assignment only happens via the `handle_new_user` trigger (signup) or admin service-role operations.

**File:** `src/hooks/useUserRole.ts`

---

### Issue 4: `contact_messages` Table Has No RLS Policies (Low)

**Problem:** RLS is enabled but no policies exist. While inserts go through the service-role edge function (correct), having zero policies means the scanner flags it and there's no explicit admin access.

**Fix:** Add an admin-only SELECT policy so admins can read contact messages, completing the security posture.

**Migration SQL:**
```sql
CREATE POLICY "Admins can view contact messages"
ON public.contact_messages FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
```

---

### Issue 5: `login_attempts` Table Has No RLS Policies (Low)

**Problem:** Same as contact_messages - RLS enabled, no policies. The `SECURITY DEFINER` functions bypass RLS correctly, but the scanner flags it.

**Fix:** Add an admin-only SELECT policy for completeness.

**Migration SQL:**
```sql
CREATE POLICY "Admins can view login attempts"
ON public.login_attempts FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
```

---

### Issue 6: React forwardRef Console Warnings (Low)

**Problem:** Three warnings: "Function components cannot be given refs" for `Index`, `Landing`, and `GuestNavbar`. These are caused by React Router's internal ref handling on page components.

**Fix:** Wrap `Index`, `Landing`, and `GuestNavbar` with `React.forwardRef` to suppress the warnings cleanly.

**Files:** `src/pages/Index.tsx`, `src/pages/Landing.tsx`, `src/components/layout/GuestNavbar.tsx`

---

### Issue 7: Stale Security Scanner Findings

The following findings are **already fixed** from previous security work but the scanner cache is stale:
- `trigger_admin_self_assign` - Already fixed (verified `handle_new_user` has whitelist)
- `group_invitations_unauthorized_group_access` - Already fixed (RPC `get_group_invitation`)
- `quick_challenge_players_payment_data_public` - Already fixed (CLS on `stripe_session_id`)
- `user_roles_self_assign` - Already fixed (RLS blocks `court_manager`)

These will be marked as resolved/acknowledged where possible.

---

### Summary

| Issue | Severity | Fix |
|-------|----------|-----|
| Cron functions no auth | Medium | Add CRON_SECRET check |
| XSS in email template | Medium | HTML-escape user input |
| `addRole` client exposure | Low | Remove function |
| `contact_messages` no policies | Low | Add admin SELECT policy |
| `login_attempts` no policies | Low | Add admin SELECT policy |
| forwardRef warnings | Low | Wrap with forwardRef |

