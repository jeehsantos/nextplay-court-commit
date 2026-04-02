

## Problem

The `stripe-webhook` function returns `{"received": false, "error": "Webhook event processing failed"}` but **without** the `errorName`/`errorMessage`/`errorDetails` fields that are present in the current code (lines 84-92). Combined with **zero logs** (not even the "Webhook event received" log on line 62), this proves the live function is running an **older version** — the recent deployments are not taking effect.

## Root Cause

The deployed function code does not match what's in the repo. This explains every symptom:
- Old code has the generic error response without diagnostic fields
- Old code may be crashing in a handler that was since refactored
- No logs appear because the old code path may not log before throwing

## Solution: Force parity with a version marker + top-level mega try-catch

### 1. Add a version constant at the top of the file

```typescript
const WEBHOOK_VERSION = "2026-04-02-v1";
```

Include this in **every** response (200 and 500) so you can verify in Stripe dashboard that the new code is actually running.

### 2. Wrap the entire `Deno.serve` callback in a top-level try-catch

Right now, if anything throws before the inner try-catch (e.g., `req.text()`, `constructEventAsync`, `createClient`), it bypasses the diagnostic error handler. Add an outer try-catch that returns the version and error:

```typescript
Deno.serve(async (req) => {
  try {
    // ... all existing code ...
  } catch (outerErr) {
    return new Response(JSON.stringify({
      received: false,
      error: "Unhandled top-level error",
      version: WEBHOOK_VERSION,
      message: outerErr?.message,
      stack: outerErr?.stack,
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
```

### 3. Add version to both the 200 and 500 responses

- 200: `{ received: true, duplicate: ..., version: WEBHOOK_VERSION }`
- 500: `{ received: false, error: ..., version: WEBHOOK_VERSION, errorName: ..., errorMessage: ... }`

### 4. Deploy and verify

After deploying, trigger a test payment. Check the Stripe webhook response for the `version` field:
- If `version` is present → the new code is running, and you can see the actual error
- If `version` is absent → the deployment pipeline is broken and needs investigation outside of code changes

### Files to change

| File | Change |
|------|--------|
| `supabase/functions/stripe-webhook/index.ts` | Add `WEBHOOK_VERSION` constant, outer try-catch around entire handler, include version in all responses |

This is a small, targeted change (< 20 lines modified) with zero risk to payment logic.

