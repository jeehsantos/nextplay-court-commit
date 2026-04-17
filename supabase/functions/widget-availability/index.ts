// Public widget availability endpoint.
// Returns available slots for a court on a given date range.
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

    const url = new URL(req.url);
    const courtId = url.searchParams.get("court_id");
    const date = url.searchParams.get("date"); // YYYY-MM-DD
    const endDate = url.searchParams.get("end_date") || date;

    if (!courtId || !date) {
      return new Response(
        JSON.stringify({ error: "court_id and date required" }),
        {
          status: 400,
          headers: { ...widgetCorsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = getServiceClient();

    // Verify court belongs to this venue
    const { data: court } = await supabase
      .from("courts")
      .select("id, venue_id")
      .eq("id", courtId)
      .eq("venue_id", key.venue_id)
      .maybeSingle();

    if (!court) {
      return new Response(JSON.stringify({ error: "Court not found" }), {
        status: 404,
        headers: { ...widgetCorsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: slots, error } = await supabase
      .from("court_availability")
      .select("id, available_date, start_time, end_time, is_booked")
      .eq("court_id", courtId)
      .gte("available_date", date)
      .lte("available_date", endDate)
      .eq("is_booked", false)
      .order("available_date")
      .order("start_time");

    if (error) throw error;

    return new Response(JSON.stringify({ slots: slots ?? [] }), {
      status: 200,
      headers: { ...widgetCorsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("widget-availability error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...widgetCorsHeaders, "Content-Type": "application/json" },
    });
  }
});
