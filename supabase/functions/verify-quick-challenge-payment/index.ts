import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function buildResponse(payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401,
    });
  }

  const supabaseAuth = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      throw new HttpError(401, "Invalid or expired JWT");
    }

    const { checkoutSessionId, challengeId } = await req.json();

    if (!checkoutSessionId) {
      throw new Error("Checkout session ID is required");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2026-02-25.clover",
    });

    const checkoutSession = await stripe.checkout.sessions.retrieve(checkoutSessionId);
    const metadata = checkoutSession.metadata ?? {};

    if (metadata.user_id && metadata.user_id !== user.id) {
      throw new HttpError(403, "Forbidden: payment does not belong to caller");
    }

    const resolvedChallengeId = challengeId || metadata.challenge_id || null;
    if (!resolvedChallengeId) {
      throw new Error("Challenge ID could not be resolved");
    }

    // Check player membership
    const { data: challengePlayer, error: challengePlayerError } = await supabaseAdmin
      .from("quick_challenge_players")
      .select("id, payment_status")
      .eq("challenge_id", resolvedChallengeId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (challengePlayerError) {
      throw new Error("Failed to verify challenge membership");
    }

    if (!challengePlayer) {
      throw new HttpError(403, "Forbidden: challenge does not belong to caller");
    }

    // If Stripe says NOT paid, return pending
    if (checkoutSession.payment_status !== "paid") {
      return buildResponse({
        success: true,
        status: "pending",
        challengeId: resolvedChallengeId,
        webhookAuthority: true,
        nextAction: "poll_payments_table",
      });
    }

    // Stripe says PAID — check if webhook already processed it
    if (challengePlayer.payment_status === "paid") {
      return buildResponse({
        success: true,
        status: "completed",
        challengeId: resolvedChallengeId,
      });
    }

    // --- FALLBACK: Stripe paid but webhook hasn't processed yet ---
    console.log("Verify fallback: completing payment for challenge", resolvedChallengeId, "user", user.id);

    const paymentIntentId = typeof checkoutSession.payment_intent === "string"
      ? checkoutSession.payment_intent
      : checkoutSession.payment_intent?.id ?? null;

    // 1. Mark player as paid
    await supabaseAdmin
      .from("quick_challenge_players")
      .update({
        payment_status: "paid",
        paid_at: new Date().toISOString(),
        stripe_session_id: checkoutSessionId,
      })
      .eq("id", challengePlayer.id);

    // 2. Upsert quick_challenge_payments snapshot
    const recipientCents = parseInt(metadata.recipient_cents || "0");
    const serviceFeeTotalCents = parseInt(metadata.service_fee_total_cents || "0");
    const grossTotalCents = parseInt(metadata.gross_total_cents || "0");
    const platformFeeCents = parseInt(metadata.platform_fee_cents || "0");

    // Check if payment record already exists
    const { data: existingPayment } = await supabaseAdmin
      .from("quick_challenge_payments")
      .select("id")
      .eq("challenge_id", resolvedChallengeId)
      .eq("user_id", user.id)
      .maybeSingle();

    const paymentPayload = {
      challenge_id: resolvedChallengeId,
      user_id: user.id,
      amount: grossTotalCents,
      court_amount: recipientCents,
      service_fee_total: serviceFeeTotalCents,
      platform_profit_target: platformFeeCents,
      stripe_payment_intent_id: paymentIntentId,
      status: "completed",
      paid_at: new Date().toISOString(),
      payment_method_type: "card",
    };

    if (existingPayment) {
      await supabaseAdmin
        .from("quick_challenge_payments")
        .update(paymentPayload)
        .eq("id", existingPayment.id);
    } else {
      await supabaseAdmin
        .from("quick_challenge_payments")
        .insert(paymentPayload);
    }

    // 3. Update court availability
    const courtId = metadata.court_id;
    const scheduledDate = metadata.scheduled_date;
    const scheduledTime = metadata.scheduled_time;

    if (courtId && scheduledDate && scheduledTime) {
      await supabaseAdmin
        .from("court_availability")
        .update({
          is_booked: true,
          payment_status: "completed",
          booked_by_user_id: user.id,
        })
        .eq("court_id", courtId)
        .eq("available_date", scheduledDate)
        .eq("start_time", scheduledTime)
        .eq("is_booked", false);
    }

    // 4. Update challenge status
    const { data: challenge } = await supabaseAdmin
      .from("quick_challenges")
      .select("total_slots")
      .eq("id", resolvedChallengeId)
      .single();

    const { count: paidCount } = await supabaseAdmin
      .from("quick_challenge_players")
      .select("id", { count: "exact", head: true })
      .eq("challenge_id", resolvedChallengeId)
      .eq("payment_status", "paid");

    const totalSlots = challenge?.total_slots || 0;
    let newStatus = "open";
    if (paidCount && paidCount >= totalSlots) {
      newStatus = "ready";
    } else if (paidCount && paidCount > 0) {
      newStatus = paidCount >= totalSlots ? "full" : "open";
    }

    await supabaseAdmin
      .from("quick_challenges")
      .update({ status: newStatus })
      .eq("id", resolvedChallengeId);

    // 5. Process referral credit
    try {
      await supabaseAdmin.rpc("process_referral_credit", { p_referred_user_id: user.id });
    } catch (e) {
      console.log("Referral credit processing skipped:", e);
    }

    console.log("Verify fallback completed successfully for challenge", resolvedChallengeId);

    return buildResponse({
      success: true,
      status: "completed",
      challengeId: resolvedChallengeId,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const status = error instanceof HttpError ? error.status : 500;
    console.error("Error verifying quick challenge payment:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
});
