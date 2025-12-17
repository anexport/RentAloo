/// <reference path="../deno.d.ts" />

import { createClient } from "npm:@supabase/supabase-js@2.87.1";
import { z } from "npm:zod@4.1.12";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const getBearerToken = (authHeader: string | null): string | null => {
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
};

const requireEnv = (key: string): string => {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
};

// Zod schema for request validation
const OnboardingSchema = z.object({
  role: z.enum(["renter", "owner"]),
  location: z.string().min(1, "Location is required"),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"]),
  interests: z.array(z.string()).min(1, "At least one interest is required"),
});

type OnboardingRequest = z.infer<typeof OnboardingSchema>;

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
    // Get auth token
    const authHeader = req.headers.get("Authorization");
    const token = getBearerToken(authHeader);
    if (!token) return jsonResponse({ error: "Unauthorized" }, 401);

    // Create admin client for user_metadata updates
    const supabaseAdmin = createClient(
      requireEnv("SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY")
    );

    // Verify the user
    const {
      data: { user },
      error: userErr,
    } = await supabaseAdmin.auth.getUser(token);

    if (userErr || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch (_error) {
      return jsonResponse({ error: "Invalid JSON" }, 400);
    }

    // Validate with Zod
    const validationResult = OnboardingSchema.safeParse(body);
    if (!validationResult.success) {
      return jsonResponse(
        {
          error: "Validation failed",
          details: validationResult.error.issues,
        },
        400
      );
    }

    const data: OnboardingRequest = validationResult.data;

    // Step 1: Call RPC to update database atomically
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
      "complete_onboarding",
      {
        p_user_id: user.id,
        p_role: data.role,
        p_location: data.location,
        p_experience_level: data.experienceLevel,
        p_interests: data.interests,
      }
    );

    if (rpcError) {
      console.error("RPC error:", rpcError);
      return jsonResponse(
        { error: "Failed to update database", details: rpcError.message },
        500
      );
    }

    // Check RPC result
    if (!rpcResult?.success) {
      console.error("RPC returned failure:", rpcResult);
      return jsonResponse(
        { error: rpcResult?.error || "Database update failed" },
        500
      );
    }

    // Step 2: Update user_metadata with Admin Auth API
    // Only do this AFTER DB update succeeds to maintain consistency
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: { role: data.role },
      }
    );

    if (authError) {
      // DB was updated but auth failed - log this but don't fail
      // The user can still use the app, onboarding check looks at DB
      console.error(
        "Auth metadata update failed (DB update succeeded):",
        authError
      );
      // Return partial success - user can continue
      return jsonResponse({
        success: true,
        warning: "Profile saved but auth metadata update failed",
      });
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error("complete-onboarding error:", error);
    return jsonResponse(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});
