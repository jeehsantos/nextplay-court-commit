import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    // Retrieve authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error("User not authenticated");
    }
    const userId = userData.user.id;

    // Use service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if user is a session player
    const { data: sessionPlayer, error: playerError } = await supabaseAdmin
      .from("session_players")
      .select("*")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .single();

    if (playerError || !sessionPlayer) {
      throw new Error("You are not a participant in this session");
    }

    // Check if user has a completed payment for this session
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .eq("status", "completed")
      .single();

    let creditsAdded = 0;

    if (payment) {
      // Convert paid amount to credits
      const amountToCredit = Number(payment.amount) - Number(payment.paid_with_credits || 0);
      
      if (amountToCredit > 0) {
        // Add credits using the database function
        const { data: newBalance, error: creditError } = await supabaseAdmin.rpc(
          "add_user_credits",
          {
            p_user_id: userId,
            p_amount: amountToCredit,
            p_reason: "cancellation_refund",
            p_session_id: sessionId,
            p_payment_id: payment.id,
          }
        );

        if (creditError) {
          console.error("Error adding credits:", creditError);
          throw new Error("Failed to convert payment to credits");
        }

        creditsAdded = amountToCredit;

        // Update payment status to indicate it was refunded as credits
        await supabaseAdmin
          .from("payments")
          .update({ status: "refunded" })
          .eq("id", payment.id);
      }
    }

    // Remove player from session
    const { error: deleteError } = await supabaseAdmin
      .from("session_players")
      .delete()
      .eq("session_id", sessionId)
      .eq("user_id", userId);

    if (deleteError) {
      console.error("Error removing player:", deleteError);
      throw new Error("Failed to leave the session");
    }

    console.log(`Player ${userId} left session ${sessionId}. Credits added: ${creditsAdded}`);

    return new Response(
      JSON.stringify({
        success: true,
        creditsAdded,
        message: creditsAdded > 0 
          ? `You have left the session. $${creditsAdded.toFixed(2)} has been added to your credits.`
          : "You have left the session.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in cancel-player-participation:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
