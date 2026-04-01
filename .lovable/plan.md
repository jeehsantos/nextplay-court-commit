

## Problem

The `stripe-webhook` function returns 500 for `checkout.session.completed` but produces **zero visible logs**. We've made multiple code changes (import specifiers, idempotency guards, constraint handling) but none fixed it because we've been guessing at the cause — we literally cannot see what error is thrown.

## Root Cause Analysis

Since the function boots correctly (returns 400 "Missing signature" on manual test) but produces no logs even when processing real events, the logging system is not capturing this function's output. This means we're debugging blind.

## Solution: Make the error visible in the Stripe response body

Instead of returning a generic `{"error": "Webhook event processing failed"}`, include the **actual error details** in the 500 response body. The user can then see exactly what failed directly in the Stripe dashboard's webhook response viewer.

Additionally, add step-tracking throughout `handleDeferredSessionPayment` so if it fails, we know exactly which step threw.

### Changes in `supabase/functions/stripe-webhook/index.ts`

**1. Return detailed error in the 500 response body (line 84-93):**
```typescript
return new Response(
  JSON.stringify({
    received: false,
    error: "Webhook event processing failed",
    errorName: error.name,
    errorMessage: error.message,
    errorDetails: details,
  }),
  { status: 500, headers: { "Content-Type": "application/json" } }
);
```

**2. Add step tracking in `handleDeferredSessionPayment`:**
Wrap each major operation in individual try-catch blocks that re-throw with the step name prepended, so the error message in the response tells us exactly which database operation failed:
```typescript
// Example for session insert:
let session;
try {
  const result = await supabaseAdmin.from("sessions").insert({...}).select("id").single();
  if (result.error) throw result.error;
  session = result.data;
} catch (e) {
  throw new WebhookProcessingError("STEP:session_insert: " + (e?.message || e), { step: "session_insert", error: e });
}
```

Apply this pattern to: session insert, session_player insert, court_availability insert, payment insert, and the Stripe PI retrieve.

**3. Sanitize empty metadata strings:**
At the top of `handleCheckoutCompleted`, normalize empty string metadata values to prevent downstream issues:
```typescript
// Normalize empty strings to undefined in metadata
for (const key of Object.keys(metadata)) {
  if (metadata[key] === "") metadata[key] = undefined as any;
}
```

### Files to change

| File | Change |
|------|--------|
| `supabase/functions/stripe-webhook/index.ts` | 1. Include error details in 500 response body. 2. Add step-tracking in deferred handler. 3. Normalize empty metadata strings. |

### What happens next

After deploying, the user triggers another test payment. The Stripe dashboard will show the **exact error name, message, and step** in the webhook response body. We can then fix the actual root cause with certainty instead of guessing.

