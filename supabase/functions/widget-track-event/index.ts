// Public widget event tracking (impression, click, booking_started, etc.)
import {
  widgetCorsHeaders,
  validateWidgetKey,
  getServiceClient,
} from "../_shared/widgetAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: widgetCorsHeaders });
  }

  try {
    const validation = await validateWidgetKey(req);
    if (validation instanceof Response) return validation;
    const { key, origin } = validation;

    const body = await req.json().catch(() => ({}));
    const eventType = String(body.event_type || "").slice(0, 64);
    const eventData = (body.event_data ?? {}) as Record<string, unknown>;

    if (!eventType) {
      return new Response(JSON.stringify({ error: "event_type required" }), {
        status: 400,
        headers: { ...widgetCorsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getServiceClient();
    await supabase.from("widget_analytics").insert({
      venue_id: key.venue_id,
      api_key_id: key.id,
      event_type: eventType,
      event_data: eventData,
      origin,
      user_agent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...widgetCorsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("widget-track-event error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...widgetCorsHeaders, "Content-Type": "application/json" },
    });
  }
});
