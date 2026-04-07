export interface GrossUpInput {
  courtAmountCents: number;
  platformFeeCents: number;
  stripePercent: number;
  stripeFixedCents: number;
  organizerFeeCents?: number;
}

export interface GrossUpResult {
  /** recipientCents + organizerFeeCents + platformFeeCents before Stripe gross-up */
  subtotalBeforeStripeCents: number;
  /** Total after gross-up: ceil((subtotal + stripeFixed) / (1 - stripePercent)) */
  grossTotalCents: number;
  /** serviceFeeTotalCents = grossTotalCents - courtAmountCents */
  serviceFeeTotalCents: number;
  /** stripeFeeCoverageCents = serviceFeeTotalCents - platformFeeCents - organizerFeeCents */
  stripeFeeCoverageCents: number;
  /** Alias for grossTotalCents (what customer is charged) */
  totalChargeCents: number;

  // Legacy aliases kept for backward compat
  estimatedStripeFeeCents: number;
  serviceFeeCents: number;
}

/**
 * Gross-up formula (all integer cents, always rounds UP):
 *
 * T = ceil( (recipientCents + organizerFeeCents + platformFeeCents + stripeFixedCents) / (1 − stripePercent) )
 *
 * serviceFeeTotalCents = T − recipientCents
 * stripeFeeCoverageCents = serviceFeeTotalCents − platformFeeCents − organizerFeeCents
 */
export function calculateGrossUp(input: GrossUpInput): GrossUpResult {
  const {
    courtAmountCents,
    platformFeeCents,
    stripePercent,
    stripeFixedCents,
    organizerFeeCents = 0,
  } = input;

  const subtotalBeforeStripeCents = courtAmountCents + platformFeeCents + organizerFeeCents;
  const grossTotalCents = Math.ceil(
    (subtotalBeforeStripeCents + stripeFixedCents) / (1 - stripePercent)
  );

  const serviceFeeTotalCents = grossTotalCents - courtAmountCents;
  const stripeFeeCoverageCents = serviceFeeTotalCents - platformFeeCents - organizerFeeCents;
  const totalChargeCents = grossTotalCents; // same value, explicit alias

  return {
    subtotalBeforeStripeCents,
    grossTotalCents,
    serviceFeeTotalCents,
    stripeFeeCoverageCents,
    totalChargeCents,

    // Legacy aliases
    estimatedStripeFeeCents: stripeFeeCoverageCents,
    serviceFeeCents: serviceFeeTotalCents,
  };
}
