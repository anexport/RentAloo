/// <reference path="../deno.d.ts" />

import Stripe from "npm:stripe@20.0.0";
import { createClient } from "npm:@supabase/supabase-js@2.87.1";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Keep currency math normalized to cents to avoid floating point drift
const roundToTwo = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

// Type for booking data passed from frontend
interface BookingData {
  equipment_id: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  insurance_type: string;
  insurance_cost: number;
  damage_deposit_amount: number;
}

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
    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body - now accepts booking data directly
    const body = await req.json();
    const bookingData = body as BookingData;

    // Validate required fields
    if (!bookingData.equipment_id) {
      return new Response(
        JSON.stringify({ error: "Missing equipment_id" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!bookingData.start_date || !bookingData.end_date) {
      return new Response(
        JSON.stringify({ error: "Missing rental dates" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!bookingData.total_amount || bookingData.total_amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid total amount" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get equipment details and verify it exists
    const { data: equipment, error: equipError } = await supabase
      .from("equipment")
      .select(
        "id, owner_id, daily_rate, is_available, title, damage_deposit_amount, damage_deposit_percentage"
      )
      .eq("id", bookingData.equipment_id)
      .single();

    if (equipError || !equipment) {
      return new Response(JSON.stringify({ error: "Equipment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is not booking their own equipment
    if (equipment.owner_id === user.id) {
      return new Response(
        JSON.stringify({ error: "Cannot book your own equipment" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check equipment is available
    if (!equipment.is_available) {
      return new Response(
        JSON.stringify({ error: "Equipment is not available" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate rental dates
    const startDateMs = Date.parse(bookingData.start_date);
    const endDateMs = Date.parse(bookingData.end_date);
    if (!Number.isFinite(startDateMs) || !Number.isFinite(endDateMs) || endDateMs < startDateMs) {
      return new Response(
        JSON.stringify({ error: "Invalid rental dates" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check availability for the dates - NO booking ID to exclude since no booking exists yet
    const { data: isAvailable, error: conflictError } = await supabase.rpc(
      "check_booking_conflicts",
      {
        p_equipment_id: bookingData.equipment_id,
        p_start_date: bookingData.start_date,
        p_end_date: bookingData.end_date,
        p_exclude_booking_id: null, // No booking to exclude
      }
    );

    if (conflictError) {
      console.error("Error checking availability:", conflictError);
      return new Response(
        JSON.stringify({
          error: "Unable to verify availability. Please try again.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (isAvailable === false) {
      return new Response(
        JSON.stringify({
          error:
            "These dates are no longer available. Please select different dates.",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // SERVER-SIDE PRICE CALCULATION (don't trust client amounts)
    // Calculate the number of rental days (matches client-side calculation in lib/booking.ts)
    const msPerDay = 24 * 60 * 60 * 1000;
    const rentalDays = Math.ceil((endDateMs - startDateMs) / msPerDay);
    if (rentalDays < 1) {
      return new Response(
        JSON.stringify({ error: "Minimum rental period is 1 day" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    if (rentalDays > 30) {
      return new Response(
        JSON.stringify({ error: "Maximum rental period is 30 days" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Calculate expected rental amount from server-side data
    const dailyRate = Number(equipment.daily_rate ?? 0);
    const expectedRentalAmount = roundToTwo(dailyRate * rentalDays);
    const expectedServiceFee = roundToTwo(expectedRentalAmount * 0.05); // 5% service fee

    // Calculate expected deposit amount from server-side equipment config
    // Supports both fixed amount and percentage of daily rate (legacy/optional field).
    const fixedDeposit = Number(equipment.damage_deposit_amount ?? 0);
    const depositPercentage = Number(equipment.damage_deposit_percentage ?? 0);
    const expectedDepositAmount =
      Number.isFinite(fixedDeposit) && fixedDeposit > 0
        ? roundToTwo(fixedDeposit)
        : Number.isFinite(depositPercentage) && depositPercentage > 0
          ? roundToTwo(dailyRate * (depositPercentage / 100))
          : 0;

    // Calculate insurance amount from insurance type (don't trust client cost)
    const insuranceType =
      bookingData.insurance_type === "none" ||
      bookingData.insurance_type === "basic" ||
      bookingData.insurance_type === "premium"
        ? bookingData.insurance_type
        : "none";
    const insuranceRate =
      insuranceType === "basic" ? 0.05 : insuranceType === "premium" ? 0.1 : 0;
    const insuranceAmount = roundToTwo(expectedRentalAmount * insuranceRate);

    // Use server-calculated deposit, not client-provided
    const depositAmount = expectedDepositAmount;

    // Calculate expected total
    const expectedTotal = roundToTwo(
      expectedRentalAmount + expectedServiceFee + insuranceAmount + depositAmount
    );

    // Verify client-provided total matches server calculation (with small tolerance for rounding)
    const clientTotal = roundToTwo(Number(bookingData.total_amount));
    const pricingDifference = Math.abs(expectedTotal - clientTotal);
    const tolerance = 0.02; // Allow 2 cents tolerance for rounding differences

    if (pricingDifference > tolerance) {
      console.error("Pricing mismatch detected", {
        clientTotal,
        expectedTotal,
        expectedRentalAmount,
        expectedServiceFee,
        insuranceAmount,
        depositAmount,
        rentalDays,
        dailyRate: equipment.daily_rate,
      });
      return new Response(
        JSON.stringify({
          error: "Pricing mismatch. Please refresh and try again.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Use server-calculated values
    const bookingTotal = expectedTotal;
    const rentalSubtotal = expectedRentalAmount;
    const serviceFee = expectedServiceFee;

    // Create PaymentIntent with ALL booking data in metadata
    // This data will be used by the webhook to create the booking after payment
    const pi = await stripe.paymentIntents.create({
      amount: Math.round(bookingTotal * 100), // Convert to cents
      currency: "usd",
      metadata: {
        // All data needed to create booking after payment
        equipment_id: bookingData.equipment_id,
        renter_id: user.id,
        owner_id: equipment.owner_id,
        start_date: bookingData.start_date,
        end_date: bookingData.end_date,
        total_amount: bookingTotal.toString(),
        rental_amount: rentalSubtotal.toString(),
        service_fee: serviceFee.toString(),
        insurance_type: insuranceType,
        insurance_cost: insuranceAmount.toString(),
        damage_deposit_amount: depositAmount.toString(),
        equipment_title: equipment.title || "",
      },
    });

    // DO NOT create any database records here
    // The booking and payment will be created by the webhook after payment success
    // This prevents orphaned bookings if user abandons payment

    return new Response(
      JSON.stringify({
        clientSecret: pi.client_secret,
        paymentIntentId: pi.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error creating payment intent:", error);
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
