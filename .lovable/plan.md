
## Root Cause Analysis

The scenario: **Organizer creates a "single" (organizer-covered) lobby, pays via Stripe, then cancels the lobby (Quit Lobby).**

### Two separate bugs found:

---

**Bug 1 — Organizer cancellation: `useCancelChallenge` discards the edge function response (credits info never surfaces)**

In `useQuickChallenges.ts`, the `useCancelChallenge` mutation function returns `void`:

```typescript
mutationFn: async (challengeId: string) => {
  const { data, error } = await supabase.functions.invoke("cancel-quick-challenge", {...});
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  // data is returned but the function returns undefined (void)
},
onSuccess: (_, challengeId) => {        // <-- first arg is void, not data!
  toast({
    description: "The challenge has been cancelled. Paid players will receive platform credits."
    // STATIC message — never mentions how much the organizer got back
  });
}
```

The edge function `cancel-quick-challenge` correctly credits all `paidSnapshots` (which includes the organizer's own payment in "single" mode) and returns:
```json
{ "success": true, "convertedCount": 1, "message": "..." }
```

But `mutationFn` doesn't `return data`, so `onSuccess` receives `undefined` as the first argument. The toast is hardcoded and never personalised. The organizer receives credits silently with zero feedback.

---

**Bug 2 — Player quit dialog: "single" mode condition hides the credit warning even when a player HAS paid**

In `QuickGameLobby.tsx` (line 816-833), the Player Quit dialog conditionally shows a "Payment will be converted to credits" notice:

```tsx
{players.find(p => p.isMe)?.paymentStatus === "paid" && challenge?.payment_type === "split" &&
  <div>Payment will be converted to credits...</div>
}
{challenge?.payment_type === "single" &&
  <div>This session was covered by the organizer. You can leave without any charges.</div>
}
```

The second block shows for ALL "single" challenges — even if the current user is the organizer who actually did pay. The organizer sees "You can leave without any charges" even though they are about to lose (and get back as credits) a real payment.

---

## Fix Plan

### Fix 1 — `src/hooks/useQuickChallenges.ts`

In `useCancelChallenge.mutationFn`, return `data` from the edge function call:

```typescript
mutationFn: async (challengeId: string) => {
  // ...
  return data as { success: boolean; convertedCount: number; message: string };
},
onSuccess: (data) => {
  // ...
  toast({
    title: "Lobby cancelled",
    description: (data?.convertedCount ?? 0) > 0
      ? `Your court payment has been converted to platform credits. All players have been notified.`
      : "The challenge has been cancelled.",
  });
},
```

### Fix 2 — `src/pages/QuickGameLobby.tsx` (Organizer quit dialog)

In the **organizer** quit dialog (lines 778-781), update the static description to inform the organizer that their payment will be converted to credits when they cancel a paid "single" lobby:

```tsx
<AlertDialogDescription>
  This action cannot be undone. All players will be removed.
  {hasOrganizerPaid && (
    <div className="credit notice box">
      Your court payment will be converted to platform credits.
      Service fee is non-refundable.
    </div>
  )}
</AlertDialogDescription>
```

Where `hasOrganizerPaid` = `challenge?.payment_type === "single"` AND the challenge has a court price > 0.

### Fix 3 — `src/pages/QuickGameLobby.tsx` (Player quit dialog — "single" mode message)

Line 827: The "covered by organizer, you can leave without charges" message should only show for **non-organizer** players. It is already inside the player quit dialog but the message is correct for that context. Keep it as-is.

However, the `leave-quick-challenge` edge function has a fast-path that skips credit conversion when `payment_type === "single"` (line: `const isOrganizerPaid = challenge.payment_type === "single"`). This is correct for players in an organizer-paid session. No change needed here.

---

## Summary of changes

| File | Change |
|------|--------|
| `src/hooks/useQuickChallenges.ts` | Return `data` from `useCancelChallenge.mutationFn`; update `onSuccess` toast to show credit conversion message using `data.convertedCount` |
| `src/pages/QuickGameLobby.tsx` | In organizer's Cancel Lobby dialog, add conditional credit-conversion notice when `payment_type === "single"` and `price_per_player > 0` |

No database migrations, no edge function changes needed.
