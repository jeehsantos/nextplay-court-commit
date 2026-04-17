// Manager-facing CRUD for venue API keys.
// Auth: requires logged-in venue owner (or admin) for the venue.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  generateApiKey,
  sha256Hex,
} from "../_shared/widgetAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } =
      await supabaseClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    // Helper: confirm the user owns the venue
    const ownsVenue = async (venueId: string): Promise<boolean> => {
      const { data } = await supabaseAdmin
        .from("venues")
        .select("id")
        .eq("id", venueId)
        .eq("owner_id", userId)
        .maybeSingle();
      return !!data;
    };

    if (action === "list") {
      const venueId = body.venue_id as string;
      if (!venueId || !(await ownsVenue(venueId))) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await supabaseAdmin
        .from("venue_api_keys")
        .select(
          "id, name, key_prefix, allowed_origins, theme, is_active, last_used_at, created_at"
        )
        .eq("venue_id", venueId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ keys: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create") {
      const venueId = body.venue_id as string;
      const name = (body.name as string) || "Widget Key";
      const allowedOrigins = (body.allowed_origins as string[]) || [];
      const theme = (body.theme as Record<string, unknown>) || {};

      if (!venueId || !(await ownsVenue(venueId))) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { key, prefix } = generateApiKey();
      const keyHash = await sha256Hex(key);

      const { data, error } = await supabaseAdmin
        .from("venue_api_keys")
        .insert({
          venue_id: venueId,
          name,
          key_hash: keyHash,
          key_prefix: prefix,
          allowed_origins: allowedOrigins,
          theme,
          created_by: userId,
        })
        .select(
          "id, name, key_prefix, allowed_origins, theme, is_active, created_at"
        )
        .single();
      if (error) throw error;

      // Return the plaintext key ONCE
      return new Response(
        JSON.stringify({ ...data, api_key: key }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "update") {
      const keyId = body.id as string;
      const updates: Record<string, unknown> = {};
      if (typeof body.name === "string") updates.name = body.name;
      if (Array.isArray(body.allowed_origins))
        updates.allowed_origins = body.allowed_origins;
      if (body.theme && typeof body.theme === "object")
        updates.theme = body.theme;
      if (typeof body.is_active === "boolean")
        updates.is_active = body.is_active;

      const { data: existing } = await supabaseAdmin
        .from("venue_api_keys")
        .select("venue_id")
        .eq("id", keyId)
        .maybeSingle();
      if (!existing || !(await ownsVenue(existing.venue_id))) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabaseAdmin
        .from("venue_api_keys")
        .update(updates)
        .eq("id", keyId)
        .select(
          "id, name, key_prefix, allowed_origins, theme, is_active, last_used_at, created_at"
        )
        .single();
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const keyId = body.id as string;
      const { data: existing } = await supabaseAdmin
        .from("venue_api_keys")
        .select("venue_id")
        .eq("id", keyId)
        .maybeSingle();
      if (!existing || !(await ownsVenue(existing.venue_id))) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabaseAdmin
        .from("venue_api_keys")
        .delete()
        .eq("id", keyId);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("manage-venue-api-keys error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
