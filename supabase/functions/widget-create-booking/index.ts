// Widget booking creation: guest checkout via Stripe Checkout.
// Auto-creates a Supabase auth user (or reuses one) for the guest email.
import Stripe from "https://esm.sh/stripe@17.7.0?target=denonext";
import {
  widgetCorsHeaders,
  validateWidgetKey,
  getServiceClient,
} from "../_shared/widgetAuth.ts";
import { calculateGrossUp } from "../_shared/feeCalc.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: widgetCorsHeaders });
  }

  try {
    const validation = await validateWidgetKey(req);
    if (validation instanceof Response) return validation;
    const { key } = validation;

    const body = await req.json();
    const {
      court_id,
      date, // YYYY-MM-DD
      start_time, // HH:MM
      end_time, // HH:MM
      guest_email,
      guest_name,
      guest_phone,
      success_url,
      cancel_url,
    } = body;

    if (
      !court_id ||
      !date ||
      !start_time ||
      !end_time ||
      !guest_email ||
      !guest_name
    ) {
      return new Response(
        JSON.stringify({ error: "Missing required booking fields" }),
        {
          status: 400,
          headers: { ...widgetCorsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = getServiceClient();

    // Verify court belongs to venue
    const { data: court } = await supabase
      .from("courts")
      .select("id, venue_id, name, hourly_rate")
      .eq("id", court_id)
      .eq("venue_id", key.venue_id)
      .maybeSingle();
    if (!court) {
      return new Response(JSON.stringify({ error: "Court not found" }), {
        status: 404,
        headers: { ...widgetCorsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: venue } = await supabase
      .from("venues")
      .select("id, name")
      .eq("id", key.venue_id)
      .single();

    // Verify slot is available + lock by selecting the candidate rows
    const { data: slots } = await supabase
      .from("court_availability")
      .select("id, start_time, end_time, is_booked")
      .eq("court_id", court_id)
      .eq("available_date", date)
      .gte("start_time", start_time)
      .lte("end_time", end_time)
      .eq("is_booked", false);

    if (!slots || slots.length === 0) {
      return new Response(
        JSON.stringify({ error: "Selected slots are no longer available" }),
        {
          status: 409,
          headers: { ...widgetCorsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Auto-create or reuse user via Auth Admin
    let userId: string;
    const { data: existingList } = await supabase.auth.admin.listUsers();
    const existingUser = existingList?.users?.find(
      (u) => u.email?.toLowerCase() === String(guest_email).toLowerCase()
    );

    if (existingUser) {
      userId = existingUser.id;
    } else {
      const { data: created, error: createErr } =
        await supabase.auth.admin.createUser({
          email: guest_email,
          email_confirm: true,
          user_metadata: {
            full_name: guest_name,
            phone: guest_phone || null,
            role: "player",
            via_widget: true,
          },
        });
      if (createErr || !created.user) {
        throw new Error(`Failed to create user: ${createErr?.message}`);
      }
      userId = created.user.id;
    }

    // Calculate duration and pricing
    const toMinutes = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };
    const durationMinutes = toMinutes(end_time) - toMinutes(start_time);
    const hours = durationMinutes / 60;
    const courtAmountCents = Math.round(court.hourly_rate * hours * 100);

    // Platform settings
    const { data: platformSettings } = await supabase
      .from("platform_settings")
      .select("player_fee, stripe_percent, stripe_fixed")
      .eq("is_active", true)
      .limit(1)
      .single();

    const platformFeeCents = Math.round(
      Number(platformSettings?.player_fee ?? 0) * 100
    );
    const stripePercent = Number(platformSettings?.stripe_percent ?? 0.029);
    const stripeFixedCents = Math.round(
      Number(platformSettings?.stripe_fixed ?? 0.3) * 100
    );

    const { data: paymentSettings } = await supabase
      .from("venue_payment_settings")
      .select("stripe_account_id")
      .eq("venue_id", key.venue_id)
      .maybeSingle();
    const venueStripeAccountId = paymentSettings?.stripe_account_id || null;

    const grossUp = calculateGrossUp({
      courtAmountCents,
      platformFeeCents,
      stripePercent,
      stripeFixedCents,
    });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2026-02-25.clover",
    });

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: "nzd",
          product_data: {
            name: `${venue?.name ?? "Court"} – ${court.name}`,
            description: `${date} ${start_time}–${end_time}`,
          },
          unit_amount: courtAmountCents,
        },
        quantity: 1,
      },
    ];
    if (grossUp.serviceFeeTotalCents > 0) {
      lineItems.push({
        price_data: {
          currency: "nzd",
          product_data: { name: "Service Fee" },
          unit_amount: grossUp.serviceFeeTotalCents,
        },
        quantity: 1,
      });
    }

    const baseSuccess =
      success_url ||
      `${Deno.env.get("SUPABASE_URL")}/widget-success.html`;
    const baseCancel = cancel_url || baseSuccess;

    const params: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      customer_email: guest_email,
      success_url: `${baseSuccess}${
        baseSuccess.includes("?") ? "&" : "?"
      }checkout_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: baseCancel,
      metadata: {
        type: "widget_booking",
        venue_id: key.venue_id,
        court_id,
        user_id: userId,
        api_key_id: key.id,
        booking_date: date,
        start_time,
        end_time,
        slot_ids: JSON.stringify(slots.map((s) => s.id)),
        court_amount_cents: courtAmountCents.toString(),
        platform_fee_cents: platformFeeCents.toString(),
        gross_total_cents: grossUp.grossTotalCents.toString(),
        service_fee_total_cents: grossUp.serviceFeeTotalCents.toString(),
        venue_stripe_account_id: venueStripeAccountId || "",
      },
    };

    if (venueStripeAccountId) {
      params.payment_intent_data = {
        application_fee_amount: grossUp.serviceFeeTotalCents,
        transfer_data: { destination: venueStripeAccountId },
      };
    }

    const checkout = await stripe.checkout.sessions.create(params);

    // Track booking_started analytics
    await supabase.from("widget_analytics").insert({
      venue_id: key.venue_id,
      api_key_id: key.id,
      event_type: "booking_started",
      event_data: {
        court_id,
        date,
        start_time,
        end_time,
        gross_total_cents: grossUp.grossTotalCents,
      },
    });

    return new Response(
      JSON.stringify({
        url: checkout.url,
        checkout_session_id: checkout.id,
      }),
      {
        status: 200,
        headers: { ...widgetCorsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("widget-create-booking error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...widgetCorsHeaders, "Content-Type": "application/json" },
    });
  }
});
