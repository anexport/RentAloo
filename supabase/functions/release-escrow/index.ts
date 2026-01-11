/// <reference path="../deno.d.ts" />

import { createClient } from "@supabase/supabase-js";
import { z } from "npm:zod@4.1.12";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const getBearerToken = (authHeader: string | null): string | null => {
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const token = getBearerToken(authHeader);
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const {
      data: { user },
      error: userErr,
    } = await supabaseAdmin.auth.getUser(token);

    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Zod schema for request validation
    const ReleaseEscrowSchema = z.object({
      paymentId: z.string().uuid(),
    });

    let requestBody: unknown;
    try {
      requestBody = await req.json();
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Invalid JSON",
          details: error instanceof Error ? error.message : "Unknown error",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const parseResult = ReleaseEscrowSchema.safeParse(requestBody);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details: parseResult.error.errors,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { paymentId } = parseResult.data;

    const { data: callerProfile, error: callerProfileError } =
      await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (callerProfileError) {
      console.error("Error loading caller profile:", callerProfileError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isAdmin = callerProfile?.role === "admin";

    const { data: payment, error: paymentErr } = await supabaseAdmin
      .from("payments")
      .select(
        `
        id,
        booking_request_id,
        owner_id,
        renter_id,
        escrow_status,
        escrow_amount,
        booking_request:booking_requests(
          id,
          end_date,
          status
        )
      `
      )
      .eq("id", paymentId)
      .single();

    if (paymentErr || !payment) {
      return new Response(JSON.stringify({ error: "Payment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isOwner = payment.owner_id === user.id;
    if (!isAdmin && !isOwner) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payment.escrow_status !== "held") {
      return new Response(
        JSON.stringify({ error: "Escrow funds are not available for release" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const booking = payment.booking_request as {
      id: string;
      end_date: string;
      status: string | null;
    } | null;

    if (!booking?.end_date) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const endDateMs = Date.parse(booking.end_date);
    if (Number.isNaN(endDateMs)) {
      return new Response(
        JSON.stringify({ error: "Invalid booking end date" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Mirror the UI: require a 24 hour buffer after rental end
    const releaseAvailableAtMs = endDateMs + 24 * 60 * 60 * 1000;
    if (!isAdmin && Date.now() < releaseAvailableAtMs) {
      return new Response(
        JSON.stringify({ error: "Escrow release is not available yet" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const nowIso = new Date().toISOString();

    const { data: updatedPayment, error: updateErr } = await supabaseAdmin
      .from("payments")
      .update({
        escrow_status: "released",
        escrow_released_at: nowIso,
      })
      .eq("id", paymentId)
      .eq("escrow_status", "held")
      .select("id")
      .maybeSingle();

    if (updateErr) {
      console.error("Error updating payment after escrow release:", updateErr);
      return new Response(
        JSON.stringify({ error: "Failed to release escrow" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!updatedPayment) {
      return new Response(
        JSON.stringify({
          error: "Escrow release failed - status may have changed",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Best-effort: mark booking completed if still approved/active.
    if (payment.booking_request_id) {
      const { error: bookingUpdateErr } = await supabaseAdmin
        .from("booking_requests")
        .update({ status: "completed", updated_at: nowIso })
        .eq("id", payment.booking_request_id)
        .in("status", ["approved", "active"]);

      if (bookingUpdateErr) {
        console.error(
          "Error updating booking status after escrow release:",
          bookingUpdateErr
        );
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error releasing escrow:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
