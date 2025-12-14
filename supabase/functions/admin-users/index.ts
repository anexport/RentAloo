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

// Zod schemas for request validation
// Action-specific payload schemas
const ListUsersSchema = z.object({
  action: z.literal("listUsers"),
  page: z.coerce.number().int().positive().optional().default(1),
  perPage: z.coerce.number().int().positive().max(1000).optional().default(50),
});

const GetUserSchema = z.object({
  action: z.literal("getUser"),
  userId: z.string().uuid(),
});

const CreateUserSchema = z.object({
  action: z.literal("createUser"),
  email: z.string().email(),
  password: z.string().min(8).optional(),
  role: z.enum(["renter", "owner", "admin"]).optional(),
  emailConfirm: z.coerce.boolean().optional().default(false),
});

const UpdateUserSchema = z.object({
  action: z.literal("updateUser"),
  userId: z.string().uuid(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(["renter", "owner", "admin"]).optional(),
});

const DeleteUserSchema = z.object({
  action: z.literal("deleteUser"),
  userId: z.string().uuid(),
});

const SuspendUserSchema = z.object({
  action: z.literal("suspendUser"),
  userId: z.string().uuid(),
  banDuration: z.string().min(1),
});

const UnsuspendUserSchema = z.object({
  action: z.literal("unsuspendUser"),
  userId: z.string().uuid(),
});

// Union schema for all actions
const RequestSchema = z.discriminatedUnion("action", [
  ListUsersSchema,
  GetUserSchema,
  CreateUserSchema,
  UpdateUserSchema,
  DeleteUserSchema,
  SuspendUserSchema,
  UnsuspendUserSchema,
]);

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
    if (!token) return jsonResponse({ error: "Unauthorized" }, 401);

    const supabaseAdmin = createClient(
      requireEnv("SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY")
    );

    const {
      data: { user: caller },
      error: callerErr,
    } = await supabaseAdmin.auth.getUser(token);

    if (callerErr || !caller)
      return jsonResponse({ error: "Unauthorized" }, 401);

    const { data: callerProfile, error: callerProfileErr } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .maybeSingle();

    if (callerProfileErr) {
      console.error("Error loading caller profile:", callerProfileErr);
      return jsonResponse({ error: "Internal server error" }, 500);
    }

    if (callerProfile?.role !== "admin") {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch (error) {
      return jsonResponse(
        {
          error: "Invalid JSON",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        400
      );
    }

    // Validate with Zod
    const validationResult = RequestSchema.safeParse(body);
    if (!validationResult.success) {
      return jsonResponse(
        {
          error: "Validation failed",
          details: validationResult.error.issues,
        },
        400
      );
    }

    const validatedRequest = validationResult.data;

    // Type-safe branching based on validated action
    if (validatedRequest.action === "listUsers") {
      const { page, perPage } = validatedRequest;

      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });

      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse({ users: data.users });
    }

    if (validatedRequest.action === "getUser") {
      const { userId } = validatedRequest;

      const { data, error } = await supabaseAdmin.auth.admin.getUserById(
        userId
      );
      if (error) return jsonResponse({ error: error.message }, 400);

      return jsonResponse({ user: data.user });
    }

    if (validatedRequest.action === "createUser") {
      // Use already validated data from RequestSchema
      const { email, password, role, emailConfirm } = validatedRequest;

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: emailConfirm,
        user_metadata: role ? { role } : undefined,
      });

      if (error) return jsonResponse({ error: error.message }, 400);

      // If creating an admin user, update profiles.role after auth user creation.
      if (role === "admin" && data.user?.id) {
        const { error: profileErr } = await supabaseAdmin
          .from("profiles")
          .update({ role: "admin" })
          .eq("id", data.user.id);

        if (profileErr) {
          console.error("Failed to promote new user to admin:", profileErr);
        }
      }

      return jsonResponse({ user: data.user });
    }

    if (validatedRequest.action === "updateUser") {
      const { userId, email, password, role } = validatedRequest;

      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        {
          ...(email ? { email } : null),
          ...(password ? { password } : null),
          ...(role ? { user_metadata: { role } } : null),
        }
      );

      if (error) return jsonResponse({ error: error.message }, 400);

      // Keep public.profiles in sync for email/role when supplied.
      if (email || role) {
        const updates: Record<string, unknown> = {};
        if (email) updates.email = email;
        if (role) updates.role = role;

        const { error: profileErr } = await supabaseAdmin
          .from("profiles")
          .update(updates)
          .eq("id", userId);

        if (profileErr) {
          console.error(
            "Error updating profiles after auth update:",
            profileErr
          );
        }
      }

      return jsonResponse({ user: data.user });
    }

    if (validatedRequest.action === "deleteUser") {
      const { userId } = validatedRequest;

      if (userId === caller.id) {
        return jsonResponse({ error: "Cannot delete yourself" }, 400);
      }

      const { data: targetProfile, error: targetProfileErr } =
        await supabaseAdmin
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .maybeSingle();

      if (targetProfileErr) {
        console.error("Error loading target profile:", targetProfileErr);
        return jsonResponse({ error: "Failed to load user" }, 500);
      }

      if (targetProfile?.role === "admin") {
        const { count, error: adminCountErr } = await supabaseAdmin
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "admin");

        if (adminCountErr) {
          console.error("Error counting admins:", adminCountErr);
          return jsonResponse({ error: "Failed to validate admin count" }, 500);
        }

        if ((count ?? 0) <= 1) {
          return jsonResponse({ error: "Cannot delete the last admin" }, 400);
        }
      }

      // Delete public profile (cascades to app data via FK constraints).
      const { error: profileDeleteErr } = await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (profileDeleteErr) {
        console.error("Error deleting profile:", profileDeleteErr);
        return jsonResponse({ error: "Failed to delete user profile" }, 500);
      }

      const { error: authDeleteErr } =
        await supabaseAdmin.auth.admin.deleteUser(userId);

      if (authDeleteErr) {
        console.error("Error deleting auth user:", authDeleteErr);
        // Profile is already deleted; return 200 with warning so admin can retry.
        return jsonResponse(
          { success: true, warning: "Auth user deletion failed" },
          200
        );
      }

      return jsonResponse({ success: true });
    }

    if (validatedRequest.action === "suspendUser") {
      const { userId, banDuration } = validatedRequest;

      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        {
          ban_duration: banDuration,
        }
      );

      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse({ user: data.user });
    }

    if (validatedRequest.action === "unsuspendUser") {
      const { userId } = validatedRequest;

      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        {
          ban_duration: "none",
        }
      );

      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse({ user: data.user });
    }

    // This should never be reached due to discriminated union, but TypeScript needs it
    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("admin-users error:", error);
    return jsonResponse(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});
