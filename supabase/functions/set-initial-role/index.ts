import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { role } = await req.json();

    if (role !== "player" && role !== "court_manager") {
      return new Response(JSON.stringify({ error: "INVALID_ROLE" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Safety check: account must have been created within the last 5 minutes
    const createdAt = new Date(user.created_at);
    const now = new Date();
    const diffMinutes = (now.getTime() - createdAt.getTime()) / 60000;

    if (diffMinutes > 5) {
      return new Response(
        JSON.stringify({ error: "ACCOUNT_TOO_OLD", message: "Role can only be set within 5 minutes of account creation" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // UPSERT role — insert if missing, update if exists
    // First try update (most common case: trigger already created the row)
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from("user_roles")
      .update({ role })
      .eq("user_id", user.id)
      .select("id");

    if (updateError) {
      console.error("Failed to update role:", updateError);
      return new Response(
        JSON.stringify({ error: "UPDATE_FAILED", message: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If no row was updated, insert one (trigger didn't fire)
    if (!updateData || updateData.length === 0) {
      const { error: insertError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: user.id, role });

      if (insertError) {
        console.error("Failed to insert role:", insertError);
        return new Response(
          JSON.stringify({ error: "INSERT_FAILED", message: insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const roleError = null;

    if (roleError) {
      console.error("Failed to upsert role:", roleError);
      return new Response(
        JSON.stringify({ error: "UPDATE_FAILED", message: roleError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ensure profile exists — create if missing
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existingProfile) {
      const meta = user.user_metadata || {};
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .insert({
          user_id: user.id,
          full_name: meta.full_name || meta.name || null,
          avatar_url: meta.avatar_url || meta.picture || null,
        });

      if (profileError) {
        console.error("Failed to create profile:", profileError);
        // Non-fatal — role was set successfully
      }
    }

    return new Response(JSON.stringify({ success: true, role }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("set-initial-role error:", err);
    return new Response(JSON.stringify({ error: "INTERNAL_ERROR" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
