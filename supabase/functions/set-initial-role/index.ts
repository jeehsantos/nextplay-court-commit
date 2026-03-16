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
    // Extract user from JWT
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User-scoped client to get the authenticated user
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

    // Only allow player or court_manager
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

    // Use service role to update user_roles (RLS blocks user UPDATE on this table)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { error: updateError } = await supabaseAdmin
      .from("user_roles")
      .update({ role })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Failed to update role:", updateError);
      return new Response(
        JSON.stringify({ error: "UPDATE_FAILED", message: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
