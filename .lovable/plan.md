

## Problem

The payment success page is stuck in an infinite "Processing Payment" loop for the deferred `at_booking` flow. After Stripe redirects to `/payment-success?checkout_session_id=...&type=at_booking`, the page polls `verify-payment` every 2 seconds. The function returns `paid_but_waiting_for_webhook` or `pending`, but the page only accepts `completed` or `transferred` to show success. After 30 polls (60s) it shows an error.

**Root cause**: The `stripe-webhook` and `verify-payment` edge functions likely need redeployment after recent code changes (idempotency key fix, sport_category_id migration). The deployed versions may be stale, causing the webhook to either fail silently or not match the current database schema.

## Solution

### 1. Redeploy edge functions
Redeploy `verify-payment`, `stripe-webhook`, and `create-payment` to ensure all deployed versions are in sync with the current codebase.

### 2. Add resilient handling in PaymentSuccess.tsx
Even when functions are correctly deployed, webhook processing can be delayed. The page should handle this gracefully:

- When `type=at_booking` is in the URL, increase the max poll count from 30 to 60 (giving 2 minutes for the webhook to process)
- After max polls, if the status is `paid_but_waiting_for_webhook`, show a "Payment received" message instead of an error — inform the user their payment was successful and the booking is being finalized, with a link to check "My Games" later
- Log the verify-payment response data on each poll to aid debugging

### 3. Add webhook failure fallback in verify-payment
If `paid_but_waiting_for_webhook` persists for too long, the verify-payment function should attempt to process the deferred booking itself as a fallback (similar to what the webhook does). This prevents the user from being stuck if the webhook fails.

| File | Change |
|------|--------|
| `src/pages/PaymentSuccess.tsx` | Read `type` param; increase poll limit for deferred flows; show "payment received, finalizing" state instead of error when Stripe confirms paid but webhook hasn't processed |
| Edge function deployments | Redeploy `verify-payment`, `stripe-webhook`, `create-payment` |

### Technical details

**PaymentSuccess.tsx changes:**
```typescript
const bookingType = searchParams.get("type");
const isDeferred = bookingType === "at_booking";
const maxPolls = isDeferred ? 60 : 30; // 2 min for deferred, 1 min for standard

// In poll handler, also check for webhook-waiting status after timeout
if (pollCount.current >= maxPolls) {
  if (lastStatus === "paid_but_waiting_for_webhook") {
    // Stripe confirmed paid — show partial success
    setStatus("success"); 
  } else {
    setStatus("error");
  }
}
```

