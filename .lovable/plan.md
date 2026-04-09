

# Organizer Stripe Connect Setup in Player Profile

## Overview

Add a Stripe Connect section to the player Profile page, visible only to users who are organizers of active groups. This section lets organizers connect their Stripe account to receive organizer fee payouts. Additionally, validate in the BookingWizard that if an organizer fee > 0, the organizer has a connected Stripe account — otherwise show a warning.

## Technical Details

### 1. Update `stripe-connect-onboard` Edge Function

The return URL currently hardcodes `/manager/settings`. Add support for a `returnPath` parameter so the organizer flow redirects back to `/profile` instead.

- Accept optional `returnPath` in request body (default: `/manager/settings`)
- Use it for `refresh_url` and `return_url` in `stripe.accountLinks.create`

### 2. Create `useOrganizerStripeStatus` Hook

New hook: `src/hooks/useOrganizerStripeStatus.ts`

- Uses `useUserGroups()` to check if user is an organizer (`isOrganizer`)
- If organizer, calls `stripe-connect-status` edge function with `venueId: null` (user-level check)
- Returns `{ isOrganizer, isConnected, detailsSubmitted, isLoading }`

### 3. Update Profile Page (`src/pages/Profile.tsx`)

Add a new collapsible section "Organizer Payouts" between Preferences and Data Management, conditionally rendered when `isOrganizer === true`:

- Shows Stripe Connect status (connected/not connected)
- "Connect Stripe" button if not connected → calls `stripe-connect-onboard` with `venueId: null, returnPath: '/profile'`
- If connected, shows green badge "Connected" and a note about automatic payouts

### 4. Update BookingWizard Validation

In `BookingWizard.tsx`, when `organizerFee > 0`:

- Check organizer's `stripe_account_id` from their profile (already loaded via `useUserProfile`)
- If no Stripe account, show a warning alert below the fee input: "You need to connect your Stripe account in your Profile to receive organizer payouts"
- Still allow booking (payout will be marked `PENDING_SETUP`) but make the warning prominent

### 5. Translation Updates

Add new keys to `en/profile.json` and `pt/profile.json`:

- `organizerPayouts` / `organizerPayoutsDesc`
- `stripeConnected` / `stripeNotConnected`
- `connectStripe` / `connectStripeDesc`
- `organizerPayoutNote`

### 6. Files Changed

| File | Change |
|------|--------|
| `src/hooks/useOrganizerStripeStatus.ts` | New hook |
| `src/pages/Profile.tsx` | Add Organizer Payouts section |
| `src/components/booking/BookingWizard.tsx` | Add Stripe warning when fee > 0 and no account |
| `supabase/functions/stripe-connect-onboard/index.ts` | Support `returnPath` param |
| `src/i18n/locales/en/profile.json` | New translation keys |
| `src/i18n/locales/pt/profile.json` | New translation keys |

