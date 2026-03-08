

# Fix Stripe Rate + Enhance Admin Cash Flow Visibility

## 1. Update `stripe_percent` to 4.2%

Single data update to `platform_settings` table: set `stripe_percent` from current value to `0.042`.

**Impact on player_fee increase**: The `player_fee` is the platform's direct profit target per transaction. Increasing it does NOT negatively impact the platform -- it increases revenue. Here's why:

- The gross-up formula is: `Total = ceil((courtAmount + playerFee + stripeFixed) / (1 - stripePercent))`
- A higher `player_fee` increases the numerator, which increases the total charge AND the `application_fee_amount`
- Stripe's fee is deducted from the application fee, but the gross-up already accounts for that
- **Net platform profit per transaction = player_fee** (the gross-up ensures Stripe fees are covered on top)

Example with $50 court, 4.2% Stripe, $0.30 fixed:

| player_fee | Total Charged | Service Fee | Stripe Takes | Platform Nets |
|-----------|--------------|------------|-------------|--------------|
| $0.11     | $52.62       | $2.62      | ~$2.51      | ~$0.11       |
| $0.50     | $53.03       | $3.03      | ~$2.53      | ~$0.50       |
| $1.00     | $53.55       | $3.55      | ~$2.55      | ~$1.00       |
| $1.50     | $54.08       | $4.08      | ~$2.58      | ~$1.50       |

The platform always nets approximately the `player_fee` amount. Higher fee = more revenue, slightly higher total for user.

## 2. Enhance Admin Finance Dashboard

Currently the admin finance page shows aggregated totals but lacks:
- **Current fee configuration display** (what rates are active right now)
- **Per-transaction health metric** (actual Stripe fee vs estimated coverage)
- **Net platform profit** that accounts for actual Stripe fees (not just the configured estimate)

### Changes to `AdminFinance.tsx`:
- Add a "Current Fee Configuration" card at the top showing active `player_fee`, `stripe_percent`, `stripe_fixed`, `manager_fee_percentage` from `platform_settings`
- Add a "Platform Health" indicator: compare `stripe_fee_actual_total` vs `stripe_fee_coverage` to show if the platform is over/under-covering Stripe fees
- Add a "True Net Platform Profit" metric: `service_fee_total - stripe_fee_actual_total` (what the platform actually keeps after Stripe takes its cut)
- Add warning banner if `stripe_fee_actual > stripe_fee_coverage` (means the platform is losing money on fees)

### Changes to `get-admin-financial-summary` edge function:
- Add `true_net_profit_cents` = `totalServiceFeeCents - totalStripeFeeActualCents` to the response
- Add `fee_health_status`: "healthy" | "warning" | "critical" based on coverage ratio

## 3. Implementation Steps

1. **Update `platform_settings`** — set `stripe_percent = 0.042` via data insert tool
2. **Update edge function** `get-admin-financial-summary` — add `true_net_profit` and `fee_health_status` fields
3. **Update `AdminFinance.tsx`** — add current config card, health indicator, and true profit metric
4. **Update `AdminPlatformFees.tsx`** — add a live simulation that shows true platform net after Stripe for various court prices (already has example breakdown, enhance it)

No changes needed to `create-payment` or `create-quick-challenge-payment` — they already read dynamically from `platform_settings`.

