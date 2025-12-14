/// <reference path="../deno.d.ts" />

import Stripe from "npm:stripe@20.0.0";
import { createClient } from "npm:@supabase/supabase-js@2.87.1";
import { z } from "npm:zod@4.1.12";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});

// Zod schema for request validation
const ProcessRefundSchema = z.object({
  paymentId: z.string().uuid("Invalid payment ID format"),
  reason: z.string().max(500).optional(),
});

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
  // Handle CORS preflight requests
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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify user
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

    // Parse and validate request body with Zod
    let requestBody: unknown;
    try {
      requestBody = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parseResult = ProcessRefundSchema.safeParse(requestBody);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details: parseResult.error.errors.map((e) => e.message).join(", "),
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { paymentId, reason } = parseResult.data;

    // Load payment and ensure caller is involved (renter or owner)
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("payments")
      .select("id, renter_id, owner_id, stripe_payment_intent_id, total_amount")
      .eq("id", paymentId)
      .single();

    if (paymentError || !payment) {
      return new Response(JSON.stringify({ error: "Payment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
    const isParticipant = payment.renter_id === user.id || payment.owner_id === user.id;

    // Verify caller is renter/owner OR admin
    if (!isAdmin && !isParticipant) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify payment has a PaymentIntent
    if (!payment.stripe_payment_intent_id) {
      return new Response(
        JSON.stringify({ error: "Payment Intent not found" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create full refund
    try {
      await stripe.refunds.create({
        payment_intent: payment.stripe_payment_intent_id,
      });
    } catch (stripeError) {
      console.error("Stripe refund error:", stripeError);
      return new Response(
        JSON.stringify({
          error: "Refund failed",
          message:
            stripeError instanceof Error
              ? stripeError.message
              : "Unknown error",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update DB
    const { error: updateError } = await supabaseAdmin
      .from("payments")
      .update({
        payment_status: "refunded",
        escrow_status: "refunded",
        refund_amount: payment.total_amount,
        refund_reason: reason || "",
      })
      .eq("id", paymentId);

    if (updateError) {
      console.error("Error updating payment after refund:", updateError);
      return new Response(
        JSON.stringify({
          error: "Failed to update payment record",
          message: updateError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Refund error:", error);
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
