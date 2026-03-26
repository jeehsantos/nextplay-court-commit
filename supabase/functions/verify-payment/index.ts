import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WEBHOOK_WAITING_STATUS = "paid_but_waiting_for_webhook";
const PENDING_STATUS = "pending";
const NEXT_ACTION = "poll_payments_table";

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

function buildPendingOrWaitingResponse({
  status,
  payment,
}: {
  status: typeof PENDING_STATUS | typeof WEBHOOK_WAITING_STATUS;
  payment: { amount: unknown; paid_with_credits: unknown; paid_at: unknown } | null | undefined;
}) {
  return buildResponse({
    success: true,
    status,
    isConfirmed: false,
    webhookAuthority: true,
    payment: payment
      ? { amount: payment.amount, paidWithCredits: payment.paid_with_credits, paidAt: payment.paid_at }
      : null,
    nextAction: NEXT_ACTION,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

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

  try {
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      throw new HttpError(401, "Invalid or expired JWT");
    }

    const { sessionId, userId, checkoutSessionId, pollCount } = await req.json();

    if (!userId) {
      throw new Error("userId is required");
    }

    if (user.id !== userId) {
      throw new HttpError(403, "Forbidden: user mismatch");
    }

    // ─── Deferred at_booking flow: sessionId may not be known yet ───
    if (!sessionId && checkoutSessionId) {
      return await handleDeferredVerification(checkoutSessionId, user.id, supabaseAdmin, pollCount || 0);
    }

    if (!sessionId) {
      throw new Error("sessionId is required");
    }

    // ─── Standard session-based verification ───
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("payments")
      .select("id, status, amount, paid_with_credits, paid_at, stripe_payment_intent_id")
      .eq("session_id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (paymentError) {
      throw new Error("Failed to fetch payment status");
    }

    const isAlreadyCompleted = payment?.status === "completed" || payment?.status === "transferred";

    if (isAlreadyCompleted) {
      const { data: player } = await supabaseAdmin
        .from("session_players")
        .select("is_confirmed")
        .eq("session_id", sessionId)
        .eq("user_id", user.id)
        .maybeSingle();

      return buildResponse({
        success: true,
        status: payment.status,
        isConfirmed: player?.is_confirmed === true,
        payment: {
          amount: payment.amount,
          paidWithCredits: payment.paid_with_credits,
          paidAt: payment.paid_at,
        },
        nextAction: "none",
      });
    }

    if (checkoutSessionId) {
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
        apiVersion: "2026-02-25.clover",
      });

      const checkoutSession = await stripe.checkout.sessions.retrieve(checkoutSessionId);

      if (checkoutSession.payment_status === "paid") {
        return buildPendingOrWaitingResponse({ status: WEBHOOK_WAITING_STATUS, payment });
      }

      return buildPendingOrWaitingResponse({ status: PENDING_STATUS, payment });
    }

    return buildPendingOrWaitingResponse({ status: PENDING_STATUS, payment });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const status = error instanceof HttpError ? error.status : 500;
    console.error("Error in verify-payment:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
});

// ─── Deferred verification with fallback record creation ────
async function handleDeferredVerification(
  checkoutSessionId: string,
  userId: string,
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any,
  pollCount: number
) {
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2026-02-25.clover",
  });

  const checkoutSession = await stripe.checkout.sessions.retrieve(checkoutSessionId);
  const paymentIntentId = checkoutSession.payment_intent as string;

  if (!paymentIntentId) {
    return buildPendingOrWaitingResponse({ status: PENDING_STATUS, payment: null });
  }

  // Look up payment by stripe_payment_intent_id (webhook creates this row)
  const { data: payment } = await supabaseAdmin
    .from("payments")
    .select("id, status, amount, paid_with_credits, paid_at, session_id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .eq("user_id", userId)
    .maybeSingle();

  if (payment && (payment.status === "completed" || payment.status === "transferred")) {
    return buildResponse({
      success: true,
      status: payment.status,
      isConfirmed: true,
      sessionId: payment.session_id,
      payment: {
        amount: payment.amount,
        paidWithCredits: payment.paid_with_credits,
        paidAt: payment.paid_at,
      },
      nextAction: "none",
    });
  }

  // Stripe shows paid but webhook hasn't processed yet
  if (checkoutSession.payment_status === "paid") {
    // After 5 polls (~7.5 seconds), attempt fallback record creation
    if (pollCount >= 5) {
      console.log(`[verify-payment] Fallback triggered at pollCount=${pollCount} for checkout ${checkoutSessionId}`);
      try {
        const sessionId = await createDeferredRecordsFallback(
          checkoutSession,
          paymentIntentId,
          userId,
          supabaseAdmin
        );
        return buildResponse({
          success: true,
          status: "completed",
          isConfirmed: true,
          sessionId,
          payment: null,
          nextAction: "none",
        });
      } catch (fallbackErr) {
        console.error("[verify-payment] Fallback creation failed:", fallbackErr);
        // Fall through to return waiting status
      }
    }
    return buildPendingOrWaitingResponse({ status: WEBHOOK_WAITING_STATUS, payment: null });
  }

  return buildPendingOrWaitingResponse({ status: PENDING_STATUS, payment: null });
}

// ─── Fallback: create deferred records when webhook never fires ────
async function createDeferredRecordsFallback(
  checkoutSession: Stripe.Checkout.Session,
  paymentIntentId: string,
  userId: string,
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any
): Promise<string> {
  const metadata = checkoutSession.metadata || {};

  // Only process deferred checkouts
  if (metadata.deferred !== "true") {
    throw new Error("Not a deferred checkout session");
  }

  // Idempotency guard: unique index on stripe_payment_intent_id prevents duplicates at DB level

  // Idempotency: re-check if payment was created between polls
  const { data: existingPayment } = await supabaseAdmin
    .from("payments")
    .select("id, status, session_id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .not("status", "in", '("cancelled","refunded")')
    .maybeSingle();

  if (existingPayment) {
    // Payment already exists - return its session regardless of status
    console.log("[fallback] Payment already exists, returning existing session:", existingPayment.session_id);
    return existingPayment.session_id;
  }

  const groupId = metadata.group_id;
  const courtId = metadata.court_id;
  const sessionDate = metadata.session_date;
  const startTime = metadata.start_time;
  const endTime = metadata.end_time;
  const durationMinutes = parseInt(metadata.duration_minutes || "60");
  const paymentType = metadata.payment_type || "single";
  const splitPlayers = metadata.split_players ? parseInt(metadata.split_players) : null;
  const sportCategoryId = metadata.sport_category_id;
  const courtCapacity = parseInt(metadata.court_capacity || "10");
  const courtPriceDollars = parseFloat(metadata.court_price_dollars || "0");
  const holdId = metadata.hold_id || null;
  const equipmentJson = metadata.equipment_json || "[]";

  // deno-lint-ignore no-explicit-any
  let equipment: any[] = [];
  try { equipment = JSON.parse(equipmentJson); } catch { equipment = []; }

  if (!groupId || !courtId || !sessionDate || !startTime || !endTime) {
    throw new Error("Missing booking details in checkout metadata");
  }

  // ─── Overlap check: don't create if court_availability already booked ───
  const { data: existingBooking } = await supabaseAdmin
    .from("court_availability")
    .select("id, booked_by_session_id")
    .eq("court_id", courtId)
    .eq("available_date", sessionDate)
    .eq("is_booked", true)
    .gte("end_time", startTime)
    .lte("start_time", endTime)
    .maybeSingle();

  if (existingBooking) {
    console.log("[fallback] Court already booked, returning existing session:", existingBooking.booked_by_session_id);
    if (existingBooking.booked_by_session_id) {
      return existingBooking.booked_by_session_id;
    }
    throw new Error("Court slot already booked by another booking");
  }

  // Convert hold if provided
  if (holdId) {
    try {
      const { data: holdResult } = await supabaseAdmin.rpc("convert_hold_to_booking", {
        p_hold_id: holdId,
      });
      if (holdResult && !holdResult.success) {
        console.error("[fallback] Hold conversion failed:", holdResult.error);
      }
    } catch (holdErr) {
      console.error("[fallback] Hold conversion error (non-fatal):", holdErr);
    }
  }

  // Create session
  const { data: session, error: sessionError } = await supabaseAdmin
    .from("sessions")
    .insert({
      group_id: groupId,
      court_id: courtId,
      session_date: sessionDate,
      start_time: startTime,
      duration_minutes: durationMinutes,
      court_price: courtPriceDollars,
      min_players: paymentType === "split" && splitPlayers ? splitPlayers : 6,
      max_players: courtCapacity,
      payment_deadline: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      state: "protected",
      payment_type: paymentType,
      sport_category_id: sportCategoryId,
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    throw sessionError ?? new Error("Failed to create session");
  }

  const sessionId = session.id;
  console.log("[fallback] Session created:", sessionId);

  // Create session_player — only if organizer plays
  const organizerPlays = metadata.organizer_plays !== "false";
  if (organizerPlays) {
    await supabaseAdmin.from("session_players").insert({
      session_id: sessionId,
      user_id: userId,
      is_confirmed: true,
      confirmed_at: new Date().toISOString(),
    });
  }

  // Create court_availability
  const { data: bookingRecord } = await supabaseAdmin
    .from("court_availability")
    .insert({
      court_id: courtId,
      available_date: sessionDate,
      start_time: startTime,
      end_time: endTime,
      is_booked: true,
      booked_by_user_id: userId,
      booked_by_group_id: groupId,
      booked_by_session_id: sessionId,
      payment_status: "completed",
    })
    .select("id")
    .single();

  // Handle equipment
  if (equipment.length > 0 && bookingRecord) {
    // deno-lint-ignore no-explicit-any
    await supabaseAdmin.from("booking_equipment").insert(
      // deno-lint-ignore no-explicit-any
      equipment.map((item: any) => ({
        booking_id: bookingRecord.id,
        equipment_id: item.equipmentId,
        quantity: item.quantity,
        price_at_booking: item.pricePerUnit,
      }))
    );
  }

  // Create payment record — wrapped in try/catch for unique constraint
  const serviceFeeCents = parseFloat(metadata.service_fee_total_cents || "0");
  const platformProfitCents = parseFloat(metadata.platform_fee_cents || "0");
  const courtAmountCents = parseFloat(metadata.recipient_cents || "0");
  const totalChargeCents = parseFloat(metadata.gross_total_cents || "0");
  const creditsApplied = parseFloat(metadata.credits_applied || "0");

  let stripeFeeActual: number | null = null;
  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2026-02-25.clover",
    });
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge.balance_transaction"],
    });
    const latestCharge = pi.latest_charge as Stripe.Charge | null;
    const balanceTx = latestCharge?.balance_transaction as Stripe.BalanceTransaction | null;
    if (balanceTx?.fee != null) {
      stripeFeeActual = balanceTx.fee / 100;
    }
  } catch (feeErr) {
    console.error("[fallback] Stripe fee retrieval error (non-fatal):", feeErr);
  }

  const totalChargeDollars = totalChargeCents > 0
    ? totalChargeCents / 100
    : (checkoutSession.amount_total || 0) / 100;

  try {
    await supabaseAdmin.from("payments").insert({
      session_id: sessionId,
      user_id: userId,
      amount: totalChargeDollars,
      paid_with_credits: creditsApplied,
      platform_fee: platformProfitCents / 100,
      court_amount: courtAmountCents > 0 ? courtAmountCents / 100 : null,
      service_fee: serviceFeeCents > 0 ? serviceFeeCents / 100 : null,
      payment_type_snapshot: paymentType,
      stripe_fee_actual: stripeFeeActual,
      status: "completed",
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id: paymentIntentId,
    });
  } catch (paymentInsertErr) {
    // Unique constraint violation — another poll or webhook already created it
    console.log("[fallback] Payment insert conflict (idempotent), returning session:", sessionId);
  }

  // Process referral credit
  try {
    await supabaseAdmin.rpc("process_referral_credit", { p_referred_user_id: userId });
  } catch (refErr) {
    console.error("[fallback] Referral credit error (non-fatal):", refErr);
  }

  // Recalculate session
  try {
    const { data: rpcResult } = await supabaseAdmin.rpc("recalculate_and_maybe_confirm_session", {
      p_session_id: sessionId,
    });
    // deno-lint-ignore no-explicit-any
    if ((rpcResult as any)?.session_confirmed) {
      console.log("[fallback] Session confirmed — triggering payout:", sessionId);
      try {
        await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/payout-session`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ sessionId }),
          }
        );
      } catch (payoutErr) {
        console.error("[fallback] Payout call error (non-fatal):", payoutErr);
      }
    }
  } catch (rpcErr) {
    console.error("[fallback] Session recalculation error (non-fatal):", rpcErr);
  }

  console.log("[fallback] Deferred payment fully processed:", { sessionId, paymentIntentId });
  return sessionId;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}