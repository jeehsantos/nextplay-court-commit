

## Staff Access Management -- Corrected Plan

### Overview
Court managers can **create new staff accounts** directly from Settings by entering an email and password. The system creates a new user with the `venue_staff` role. Staff get restricted access to Availability, Equipment, Bookings, and their own Settings (without Payment Payouts or Staff Access sections).

### User Flow
1. Court manager opens Settings, expands "Staff Access" section.
2. Enters staff **email**, **password**, and **full name**, then clicks "Add Staff".
3. Backend edge function creates a new auth user + profile + `venue_staff` role + `venue_staff` table row.
4. Staff list displays below with name, email, and a Remove button.
5. Staff logs in with those credentials and sees a restricted manager layout.

### Database Changes (single migration)

1. **Add `venue_staff` to `app_role` enum.**

2. **Create `venue_staff` table**: `id`, `venue_id` (FK venues), `user_id`, `added_by`, `created_at`. Unique on `(venue_id, user_id)`.

3. **RLS on `venue_staff`**: Court managers can CRUD where they own the venue. Staff can SELECT own rows.

4. **`is_venue_staff` security definer function**: checks if a user is staff for a given venue. Used in RLS policies on other tables.

5. **Add RLS policies** on `courts`, `court_availability`, `venue_weekly_rules`, `venue_date_overrides`, `equipment_inventory`, `booking_holds`, `sessions`, `session_players`, `venues` to grant staff SELECT access (and UPDATE on availability/equipment) via `is_venue_staff`.

### Edge Function: `manage-venue-staff`

- **Add staff**: Accepts `{ action: "add", venue_id, email, password, full_name }`.
  - Validates caller owns the venue (service role lookup).
  - Creates auth user via `supabase.auth.admin.createUser()` with `email_confirm: true`.
  - Inserts profile row, `venue_staff` role in `user_roles`, and row in `venue_staff` table.
  - Returns created staff info.

- **Remove staff**: Accepts `{ action: "remove", staff_id }`.
  - Validates caller owns the venue.
  - Deletes `venue_staff` row. Removes `venue_staff` role from `user_roles` if no other venue links remain. Optionally deletes the auth user.

Config: `verify_jwt = false` (manual auth check inside).

### Frontend Changes

1. **New "Staff Access" collapsible in `ManagerSettings.tsx`** (visible only to `court_manager`):
   - Form: full name, email, password inputs + "Add Staff" button.
   - Staff list table fetched from `venue_staff` joined with `profiles`.
   - Remove button per staff member.

2. **`ManagerLayout.tsx` updates**:
   - Allow `venue_staff` role (currently rejects non-`court_manager`).
   - For `venue_staff`, show only: Availability, Equipment, Bookings, Settings in nav.
   - Hide: Dashboard, Venues.

3. **`ManagerSettings.tsx` conditional rendering for staff role**:
   - Hide "Payment Payouts" section.
   - Hide "Staff Access" section.

4. **`auth-context.tsx`**: Add `venue_staff` to the `AppRole` type.

5. **Route guards**: `ManagerLayout` already protects all `/manager/*` routes. Update the role check to accept `venue_staff` in addition to `court_manager`. No changes needed in `App.tsx` since routes don't use `ProtectedRoute` with `requiredRole`.

### Implementation Order
1. DB migration (enum value, table, RLS, helper function)
2. Edge function `manage-venue-staff`
3. Staff Access UI section in `ManagerSettings.tsx`
4. `ManagerLayout` + `auth-context` updates for `venue_staff` role
5. Conditional hide of Payment Payouts + Staff Access for staff

