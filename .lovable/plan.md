
## Security Remediation Execution Plan

I will now implement the 7 approved security fixes. Here is the exact technical breakdown of the changes I will apply across the database, edge functions, and frontend components:

### 1. Privilege Escalation via Registration (`signup_metadata_role_escalation`)
- **Database**: Modify the `handle_new_user` Postgres trigger to strictly sanitize the `role` field from signup metadata. It will only allow `'player'` or `'court_manager'`, falling back to `'player'` for any unrecognized or malicious inputs.

### 2. User Credit Balance Manipulation (`user_credits_balance_manipulation`)
- **Database**: Drop the `UPDATE` policy for the `authenticated` role on the `user_credits` table. Direct mutations will be blocked, ensuring the `add_user_credits` and `use_user_credits` `SECURITY DEFINER` functions remain the only way to alter balances.

### 3. Court Manager Self-Assignment (`user_roles_court_manager_self_assignment`)
- **Database**: Update the `INSERT` RLS policy on the `user_roles` table to explicitly exclude `'court_manager'` from self-assignment (alongside `admin` and `venue_staff`). Valid assignments will continue securely via the `handle_new_user` trigger.

### 4. Group Invitations Public Exposure (`group_invitations_public_exposure`)
- **Database**: Drop the overly permissive `SELECT` and `UPDATE` policies on the `group_invitations` table. Create a secure RPC function `get_group_invitation(code)` to fetch and validate invites server-side.
- **Frontend**: Refactor `src/pages/JoinGroup.tsx` and `src/pages/GroupDetail.tsx` to call the new RPC instead of making direct table queries.

### 5. Stripe Session Exposure (`quick_challenge_players_stripe_session_exposure`)
- **Database**: Implement PostgreSQL Column-Level Security (CLS) to revoke `SELECT` access on the `stripe_session_id` column of the `quick_challenge_players` table for `anon` and `authenticated` roles, keeping it readable only by service roles.

### 6. Venue Financial Account Data Exposure (`venues_stripe_account_id_public_exposure`)
- **Database**: Create a highly-restricted `venue_payment_settings` table to store `stripe_account_id`. Migrate existing data from the `venues` table and drop the exposed column.
- **Codebase**: Update `src/pages/manager/ManagerSettings.tsx` and the Stripe Connect Edge Functions (`stripe-connect-onboard`, `stripe-connect-status`) to interact with this new isolated table.

### 7. Contact Form Abuse Prevention (`contact_form_no_rate_limit`)
- **Database**: Drop the public `INSERT` policy on `contact_messages`.
- **Edge Function**: Update the `send-contact-email` function to enforce IP-based or token-based validation, acting as the exclusive, secure entry point for contact submissions.
