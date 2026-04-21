import Stripe from "npm:stripe@17.7.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // AUTH: Allow either (a) cron with valid CRON_SECRET header, or
  // (b) authenticated admin user via Bearer token.
  const cronSecret = Deno.env.get("CRON_SECRET");
  const providedCronSecret = req.headers.get("x-cron-secret");
  const isCronCall = !!cronSecret && providedCronSecret === cronSecret;

  if (!isCronCall) {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return new Response(
        JSON.stringify({ error: "UNAUTHORIZED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "UNAUTHORIZED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!adminRole) {
      return new Response(
        JSON.stringify({ error: "FORBIDDEN" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { sessionId } = body as { sessionId?: string };

    // If a specific sessionId is provided, process just that one.
    // Otherwise, process all pending organizer payouts (batch/cron mode).
    let sessionsToProcess: any[] = [];

    if (sessionId) {
      const { data, error } = await supabaseAdmin
        .from("sessions")
        .select("id, organizer_fee_cents, organizer_user_id, organizer_payout_status, group_id")
        .eq("id", sessionId)
        .eq("organizer_payout_status", "PENDING")
        .eq("is_cancelled", false)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({ success: true, message: "No pending organizer payout for this session" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      sessionsToProcess = [data];
    } else {
      // Batch mode: find all pending payouts
      const { data, error } = await supabaseAdmin
        .from("sessions")
        .select("id, organizer_fee_cents, organizer_user_id, organizer_payout_status, group_id")
        .eq("organizer_payout_status", "PENDING")
        .eq("is_cancelled", false)
        .gt("organizer_fee_cents", 0)
        .limit(50);

      if (error) throw new Error("Failed to fetch pending organizer payouts");
      sessionsToProcess = data || [];
    }

    if (sessionsToProcess.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No pending organizer payouts" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2026-02-25.clover",
    });

    const results: any[] = [];

    for (const session of sessionsToProcess) {
      try {
        // Verify session is confirmed (fully funded)
        const { data: rpcResult } = await supabaseAdmin.rpc(
          "recalculate_and_maybe_confirm_session",
          { p_session_id: session.id }
        );
        if (!(rpcResult as any)?.session_confirmed) {
          console.log(`Session ${session.id} not yet confirmed, skipping organizer payout`);
          continue;
        }

        // Look up organizer's stripe_account_id
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("stripe_account_id")
          .eq("user_id", session.organizer_user_id)
          .single();

        if (!profile?.stripe_account_id) {
          // Mark as PENDING_SETUP so we can alert the organizer
          await supabaseAdmin
            .from("sessions")
            .update({ organizer_payout_status: "PENDING_SETUP" })
            .eq("id", session.id)
            .eq("organizer_payout_status", "PENDING");

          console.log(`Organizer ${session.organizer_user_id} has no Stripe account, marked PENDING_SETUP`);
          results.push({ sessionId: session.id, status: "PENDING_SETUP" });
          continue;
        }

        // Idempotency: claim the session for payout
        const { data: claimed, error: claimError } = await supabaseAdmin
          .from("sessions")
          .update({ organizer_payout_status: "PROCESSING" })
          .eq("id", session.id)
          .eq("organizer_payout_status", "PENDING")
          .select("id")
          .maybeSingle();

        if (claimError || !claimed) {
          console.log(`Session ${session.id} already claimed or status changed, skipping`);
          continue;
        }

        // Create Stripe transfer to organizer
        const transfer = await stripe.transfers.create(
          {
            amount: session.organizer_fee_cents,
            currency: "nzd",
            destination: profile.stripe_account_id,
            description: `Organizer fee for session ${session.id}`,
            metadata: {
              session_id: session.id,
              organizer_user_id: session.organizer_user_id,
              type: "organizer_fee",
            },
          },
          {
            idempotencyKey: `organizer-payout:${session.id}`,
          }
        );

        // Mark as PAID
        await supabaseAdmin
          .from("sessions")
          .update({
            organizer_payout_status: "PAID",
            organizer_payout_amount_cents: session.organizer_fee_cents,
            organizer_stripe_transfer_id: transfer.id,
          })
          .eq("id", session.id);

        console.log(`Organizer payout completed: session=${session.id}, transfer=${transfer.id}, amount=${session.organizer_fee_cents}c`);
        results.push({ sessionId: session.id, status: "PAID", transferId: transfer.id });
      } catch (err) {
        // Revert claim on error
        await supabaseAdmin
          .from("sessions")
          .update({ organizer_payout_status: "PENDING" })
          .eq("id", session.id)
          .eq("organizer_payout_status", "PROCESSING");

        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Organizer payout failed for session ${session.id}:`, msg);
        results.push({ sessionId: session.id, status: "FAILED", error: msg });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("process-organizer-payout error:", msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
