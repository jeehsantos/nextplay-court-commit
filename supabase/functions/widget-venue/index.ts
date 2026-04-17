// Public widget endpoint: returns venue + courts + theme for the API key.
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
    const { key } = validation;

    const supabase = getServiceClient();

    const { data: venue, error: venueErr } = await supabase
      .from("venues")
      .select(
        "id, name, address, city, suburb, country, phone, email, photo_url, banner_url, description, slot_interval_minutes, max_booking_minutes"
      )
      .eq("id", key.venue_id)
      .eq("is_active", true)
      .maybeSingle();

    if (venueErr || !venue) {
      return new Response(JSON.stringify({ error: "Venue not found" }), {
        status: 404,
        headers: { ...widgetCorsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: courts } = await supabase
      .from("courts")
      .select(
        "id, name, hourly_rate, photo_url, photo_urls, is_indoor, ground_type, allowed_sports, capacity, rules, payment_timing, payment_hours_before, parent_court_id, is_multi_court"
      )
      .eq("venue_id", key.venue_id)
      .eq("is_active", true)
      .order("name");

    return new Response(
      JSON.stringify({
        venue,
        courts: courts ?? [],
        theme: key.theme,
      }),
      {
        status: 200,
        headers: { ...widgetCorsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("widget-venue error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...widgetCorsHeaders, "Content-Type": "application/json" },
    });
  }
});
