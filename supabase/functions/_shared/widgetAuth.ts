// Shared helpers for widget edge functions: API key validation + CORS.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export const widgetCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-widget-key, x-widget-origin",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export interface ValidatedKey {
  id: string;
  venue_id: string;
  theme: Record<string, unknown>;
  allowed_origins: string[];
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
}

/**
 * Validates the widget API key from `x-widget-key` header and checks origin.
 * Returns the key record on success, or a Response on failure.
 */
export async function validateWidgetKey(
  req: Request
): Promise<{ key: ValidatedKey; origin: string | null } | Response> {
  const apiKey = req.headers.get("x-widget-key");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Missing x-widget-key header" }),
      {
        status: 401,
        headers: { ...widgetCorsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const keyHash = await sha256Hex(apiKey);
  const supabase = getServiceClient();

  const { data: key, error } = await supabase
    .from("venue_api_keys")
    .select("id, venue_id, theme, allowed_origins, is_active")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (error || !key || !key.is_active) {
    return new Response(JSON.stringify({ error: "Invalid API key" }), {
      status: 401,
      headers: { ...widgetCorsHeaders, "Content-Type": "application/json" },
    });
  }

  // Origin validation (when allowed_origins is non-empty)
  const origin =
    req.headers.get("origin") || req.headers.get("x-widget-origin");
  if (key.allowed_origins && key.allowed_origins.length > 0) {
    const allowed = key.allowed_origins.some((o: string) => {
      if (!origin) return false;
      try {
        const allowedHost = new URL(o.includes("://") ? o : `https://${o}`)
          .hostname;
        const reqHost = new URL(origin).hostname;
        return allowedHost === reqHost || reqHost.endsWith(`.${allowedHost}`);
      } catch {
        return false;
      }
    });
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Origin not allowed for this API key" }),
        {
          status: 403,
          headers: { ...widgetCorsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  }

  // Touch last_used_at (best effort, no await blocking)
  supabase
    .from("venue_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", key.id)
    .then(() => {});

  return {
    key: {
      id: key.id,
      venue_id: key.venue_id,
      theme: (key.theme as Record<string, unknown>) ?? {},
      allowed_origins: key.allowed_origins ?? [],
    },
    origin,
  };
}

export function generateApiKey(): { key: string; prefix: string } {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const random = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const key = `pk_live_${random}`;
  return { key, prefix: key.slice(0, 12) };
}
