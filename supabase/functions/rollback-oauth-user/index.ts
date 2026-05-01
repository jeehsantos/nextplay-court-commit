import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logger } from "../_shared/logger.ts";

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

    // Verify caller identity
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

    // Safety: only allow rollback for accounts created less than 2 minutes ago
    const createdAt = new Date(user.created_at);
    const now = new Date();
    const diffSeconds = (now.getTime() - createdAt.getTime()) / 1000;

    if (diffSeconds > 120) {
      return new Response(
        JSON.stringify({ error: "ACCOUNT_TOO_OLD", message: "Can only rollback accounts created within 2 minutes" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete the user (cascades to user_roles, profiles via handle_new_user trigger data)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Clean up profile first (not cascade-linked to auth.users)
    await supabaseAdmin.from("profiles").delete().eq("user_id", user.id);

    // Delete the auth user (cascades user_roles via FK)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("Failed to delete user:", deleteError);
      return new Response(
        JSON.stringify({ error: "DELETE_FAILED", message: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logger.log(`Rolled back accidental OAuth registration for user ${user.id} (${user.email})`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("rollback-oauth-user error:", err);
    return new Response(JSON.stringify({ error: "INTERNAL_ERROR" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
