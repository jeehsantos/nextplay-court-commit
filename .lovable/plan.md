

## Problem

The save handler in `AdminPlatformFees.tsx` only runs an `UPDATE` when `settings?.id` exists. When the table is empty, the update block is skipped and the success toast fires without any database write.

## Solution

Update `src/pages/admin/AdminPlatformFees.tsx` — add an `else` branch to the save handler that performs an `INSERT` when no existing row is found:

```typescript
if (settings?.id) {
  // existing UPDATE logic (unchanged)
} else {
  const { error } = await (supabase as any)
    .from("platform_settings")
    .insert({
      player_fee: fee,
      manager_fee_percentage: managerPct,
      stripe_percent: stripePct / 100,
      stripe_fixed: stripeFix,
      is_active: isActive,
    });
  if (error) throw error;
}
```

Single file change: `src/pages/admin/AdminPlatformFees.tsx`

