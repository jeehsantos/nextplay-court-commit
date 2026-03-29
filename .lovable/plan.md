

## Problems

### 1. Stale data on lobby load after Stripe redirect
When the user returns from Stripe checkout, the `verifyPayment` function runs and updates the DB, but the lobby UI is rendered using `quickChallenges` data from the React Query cache — which was fetched BEFORE payment. The `verifyPayment` call does NOT invalidate the `["quick-challenges"]` query, so the UI shows stale "pending" status and the payment deadline warning until a manual refresh.

### 2. "YOU PAID" shows wrong amount
Line 1211: `${(challenge.price_per_player * challenge.total_slots).toFixed(2)}` — this calculates price using the DB field `price_per_player` (the per-player split of court cost only, e.g., ~$8.34 for a $50 court / 6 players) multiplied by `total_slots` (6), giving ~$50.04. But the actual Stripe charge includes the gross-up (platform fee + Stripe fee coverage). The displayed amount should come from the actual payment record, not from a formula using `price_per_player`.

## Solution

### Fix 1: Invalidate query cache after payment verification
In the payment verification effect (line 670-710), after `verifyPayment` resolves successfully, invalidate the `["quick-challenges"]` query so the UI re-fetches fresh data with updated payment status.

**File**: `src/pages/QuickGameLobby.tsx`

Import `useQueryClient` from `@tanstack/react-query` and call `queryClient.invalidateQueries({ queryKey: ["quick-challenges"] })` after `verifyPayment` completes.

```typescript
const queryClient = useQueryClient();

// In the effect:
verifyPayment(checkoutSessionId, id).then((success) => {
  if (success) {
    queryClient.invalidateQueries({ queryKey: ["quick-challenges"] });
  }
}).finally(() => {
  setIsVerifyingPayment(false);
  setSearchParams({}, { replace: true });
});
```

### Fix 2: Show actual paid amount from payment records
Instead of computing `price_per_player * total_slots`, fetch the actual payment amount from `quick_challenge_payments` for the organizer. Since this data may not be in the current query, the simplest approach is:

- For the organizer "You paid" display, use a dedicated query or derive from `quick_challenge_payments`.
- Alternatively, since the `quick_challenge_payments.amount` field stores the gross total in cents, fetch it and display it.

**Approach**: Add a small query in `QuickGameLobby.tsx` that fetches `quick_challenge_payments` for the current user + challenge, and use `amount / 100` for the "You paid" display. Fall back to the computed value if no payment record exists yet.

```typescript
const { data: myPayment } = useQuery({
  queryKey: ["quick-challenge-payment", id, user?.id],
  queryFn: async () => {
    const { data } = await supabase
      .from("quick_challenge_payments")
      .select("amount")
      .eq("challenge_id", id!)
      .eq("user_id", user!.id)
      .maybeSingle();
    return data;
  },
  enabled: !!id && !!user?.id && isOrganizer,
});

// In the template (line 1211):
// Replace: ${(challenge.price_per_player * challenge.total_slots).toFixed(2)}
// With:    ${myPayment ? (myPayment.amount / 100).toFixed(2) : (challenge.price_per_player * challenge.total_slots).toFixed(2)}
```

### Files to change

| File | Change |
|------|--------|
| `src/pages/QuickGameLobby.tsx` | 1. Import `useQueryClient`, invalidate cache after verify. 2. Add payment query, use actual amount for "You paid" |

