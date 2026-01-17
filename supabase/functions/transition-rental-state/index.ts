import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type TransitionAction =
  | "complete_payment"
  | "complete_pickup_inspection"
  | "start_rental"
  | "initiate_return"
  | "complete_return_inspection"
  | "owner_confirm"
  | "owner_report_damage"
  | "resolve_dispute"
  | "cancel";

interface TransitionRequest {
  booking_id: string;
  action: TransitionAction;
  data?: Record<string, unknown>;
}

interface TransitionResponse {
  success: boolean;
  new_status?: string;
  error?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ success: false, error: "Missing authorization header" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return jsonResponse({ success: false, error: "Invalid token" }, 401);
    }

    const { booking_id, action, data } = await req.json() as TransitionRequest;

    if (!booking_id || !action) {
      return jsonResponse({ success: false, error: "Missing booking_id or action" }, 400);
    }

    // Fetch booking with related data
    const { data: booking, error: fetchError } = await supabaseClient
      .from("booking_requests")
      .select(`
        *,
        equipment:equipment_id (id, owner_id, title),
        renter:renter_id (id, email, full_name)
      `)
      .eq("id", booking_id)
      .single();

    if (fetchError || !booking) {
      return jsonResponse({ success: false, error: "Booking not found" }, 404);
    }

    const isOwner = user.id === booking.equipment.owner_id;
    const isRenter = user.id === booking.renter_id;

    if (!isOwner && !isRenter) {
      return jsonResponse({ success: false, error: "Not authorized for this booking" }, 403);
    }

    // Process action
    const result = await processAction(supabaseClient, booking, action, data, user.id, isOwner, isRenter);

    return jsonResponse(result, result.success ? 200 : 400);
  } catch (error) {
    console.error("Transition error:", error);
    return jsonResponse({ success: false, error: "Internal server error" }, 500);
  }
});

async function processAction(
  supabase: ReturnType<typeof createClient>,
  booking: Record<string, unknown>,
  action: TransitionAction,
  data: Record<string, unknown> | undefined,
  userId: string,
  isOwner: boolean,
  isRenter: boolean
): Promise<TransitionResponse> {
  switch (action) {
    case "complete_payment":
      return await handleCompletePayment(supabase, booking);

    case "complete_pickup_inspection":
      return await handleCompletePickupInspection(supabase, booking, isRenter);

    case "start_rental":
      return await handleStartRental(supabase, booking);

    case "initiate_return":
      return await handleInitiateReturn(supabase, booking, isRenter);

    case "complete_return_inspection":
      return await handleCompleteReturnInspection(supabase, booking, isRenter);

    case "owner_confirm":
      return await handleOwnerConfirm(supabase, booking, isOwner);

    case "owner_report_damage":
      return await handleOwnerReportDamage(supabase, booking, isOwner, data);

    case "resolve_dispute":
      return await handleResolveDispute(supabase, booking, data);

    case "cancel":
      return await handleCancel(supabase, booking, userId, isOwner, isRenter, data);

    default:
      return { success: false, error: `Unknown action: ${action}` };
  }
}

async function handleCompletePayment(supabase: ReturnType<typeof createClient>, booking: Record<string, unknown>): Promise<TransitionResponse> {
  if (booking.status !== "pending") {
    return { success: false, error: `Cannot complete payment from status: ${booking.status}` };
  }

  // Check payment exists and succeeded
  const { data: payment } = await supabase
    .from("payments")
    .select("payment_status")
    .eq("booking_request_id", booking.id)
    .single();

  if (!payment || payment.payment_status !== "succeeded") {
    return { success: false, error: "Payment not completed" };
  }

  // Transition to awaiting_pickup_inspection
  const { error } = await supabase
    .from("booking_requests")
    .update({ status: "awaiting_pickup_inspection" })
    .eq("id", booking.id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Create notification for owner
  const equipment = booking.equipment as { owner_id: string; title: string };
  await createNotification(supabase, equipment.owner_id, {
    type: "booking_confirmed",
    title: "New Booking Confirmed",
    message: `Payment received for ${equipment.title}. Awaiting pickup inspection.`,
    related_entity_type: "booking",
    related_entity_id: booking.id as string,
  });

  return { success: true, new_status: "awaiting_pickup_inspection" };
}

async function handleCompletePickupInspection(supabase: ReturnType<typeof createClient>, booking: Record<string, unknown>, isRenter: boolean): Promise<TransitionResponse> {
  if (booking.status !== "awaiting_pickup_inspection") {
    return { success: false, error: `Cannot complete pickup inspection from status: ${booking.status}` };
  }

  if (!isRenter) {
    return { success: false, error: "Only renter can complete pickup inspection" };
  }

  // Check pickup inspection exists and is verified by renter
  const { data: inspection } = await supabase
    .from("equipment_inspections")
    .select("verified_by_renter")
    .eq("booking_id", booking.id)
    .eq("inspection_type", "pickup")
    .single();

  if (!inspection || !inspection.verified_by_renter) {
    return { success: false, error: "Pickup inspection not completed" };
  }

  // Transition to awaiting_start_date
  const { error } = await supabase
    .from("booking_requests")
    .update({ status: "awaiting_start_date" })
    .eq("id", booking.id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Create notification for owner
  const equipment = booking.equipment as { owner_id: string; title: string };
  const renter = booking.renter as { full_name: string | null };
  await createNotification(supabase, equipment.owner_id, {
    type: "booking_confirmed",
    title: "Pickup Inspection Complete",
    message: `${renter.full_name || 'Renter'} completed the pickup inspection for ${equipment.title}.`,
    related_entity_type: "booking",
    related_entity_id: booking.id as string,
  });

  return { success: true, new_status: "awaiting_start_date" };
}

async function handleStartRental(supabase: ReturnType<typeof createClient>, booking: Record<string, unknown>): Promise<TransitionResponse> {
  if (booking.status !== "awaiting_start_date") {
    return { success: false, error: `Cannot start rental from status: ${booking.status}` };
  }

  const today = new Date().toISOString().split("T")[0];
  if ((booking.start_date as string) > today) {
    return { success: false, error: `Start date (${booking.start_date}) not reached yet` };
  }

  // Transition to active
  const { error } = await supabase
    .from("booking_requests")
    .update({
      status: "active",
      activated_at: new Date().toISOString()
    })
    .eq("id", booking.id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Log event
  await supabase.from("rental_events").insert({
    booking_id: booking.id,
    event_type: "rental_started",
    event_data: { manual_activation: true },
  });

  return { success: true, new_status: "active" };
}

async function handleInitiateReturn(supabase: ReturnType<typeof createClient>, booking: Record<string, unknown>, isRenter: boolean): Promise<TransitionResponse> {
  if (booking.status !== "active") {
    return { success: false, error: `Cannot initiate return from status: ${booking.status}` };
  }

  if (!isRenter) {
    return { success: false, error: "Only renter can initiate return" };
  }

  // Transition to awaiting_return_inspection
  const { error } = await supabase
    .from("booking_requests")
    .update({ status: "awaiting_return_inspection" })
    .eq("id", booking.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, new_status: "awaiting_return_inspection" };
}

async function handleCompleteReturnInspection(supabase: ReturnType<typeof createClient>, booking: Record<string, unknown>, isRenter: boolean): Promise<TransitionResponse> {
  if (booking.status !== "awaiting_return_inspection") {
    return { success: false, error: `Cannot complete return inspection from status: ${booking.status}` };
  }

  if (!isRenter) {
    return { success: false, error: "Only renter can complete return inspection" };
  }

  // Check return inspection exists and is verified by renter
  const { data: inspection } = await supabase
    .from("equipment_inspections")
    .select("verified_by_renter")
    .eq("booking_id", booking.id)
    .eq("inspection_type", "return")
    .single();

  if (!inspection || !inspection.verified_by_renter) {
    return { success: false, error: "Return inspection not completed" };
  }

  // Transition to pending_owner_review
  const { error } = await supabase
    .from("booking_requests")
    .update({ status: "pending_owner_review" })
    .eq("id", booking.id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Create notification for owner to review
  const equipment = booking.equipment as { owner_id: string; title: string };
  const renter = booking.renter as { full_name: string | null };
  await createNotification(supabase, equipment.owner_id, {
    type: "booking_confirmed",
    priority: "high",
    title: "Return Inspection Ready for Review",
    message: `${renter.full_name || 'Renter'} completed the return inspection for ${equipment.title}. Please review and confirm.`,
    related_entity_type: "booking",
    related_entity_id: booking.id as string,
  });

  return { success: true, new_status: "pending_owner_review" };
}

async function handleOwnerConfirm(supabase: ReturnType<typeof createClient>, booking: Record<string, unknown>, isOwner: boolean): Promise<TransitionResponse> {
  if (booking.status !== "pending_owner_review") {
    return { success: false, error: `Cannot confirm from status: ${booking.status}` };
  }

  if (!isOwner) {
    return { success: false, error: "Only owner can confirm return" };
  }

  // Mark inspection as verified by owner
  await supabase
    .from("equipment_inspections")
    .update({ verified_by_owner: true })
    .eq("booking_id", booking.id)
    .eq("inspection_type", "return");

  // Transition to completed
  const { error } = await supabase
    .from("booking_requests")
    .update({
      status: "completed",
      completed_at: new Date().toISOString()
    })
    .eq("id", booking.id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Log event
  await supabase.from("rental_events").insert({
    booking_id: booking.id,
    event_type: "rental_completed",
    event_data: { confirmed_by_owner: true },
  });

  // Release escrow (update payment)
  await supabase
    .from("payments")
    .update({
      escrow_status: "released",
      escrow_released_at: new Date().toISOString(),
      deposit_status: "released",
      deposit_released_at: new Date().toISOString()
    })
    .eq("booking_request_id", booking.id);

  // Notify renter
  const equipment = booking.equipment as { title: string };
  await createNotification(supabase, booking.renter_id as string, {
    type: "booking_completed",
    title: "Rental Completed",
    message: `Your rental for ${equipment.title} is complete. Your deposit has been released.`,
    related_entity_type: "booking",
    related_entity_id: booking.id as string,
  });

  return { success: true, new_status: "completed" };
}

async function handleOwnerReportDamage(
  supabase: ReturnType<typeof createClient>,
  booking: Record<string, unknown>,
  isOwner: boolean,
  data?: Record<string, unknown>
): Promise<TransitionResponse> {
  if (booking.status !== "pending_owner_review") {
    return { success: false, error: `Cannot report damage from status: ${booking.status}` };
  }

  if (!isOwner) {
    return { success: false, error: "Only owner can report damage" };
  }

  const description = data?.description as string;
  if (!description) {
    return { success: false, error: "Damage description required" };
  }

  // Create damage claim
  const equipment = booking.equipment as { owner_id: string; title: string };
  const { error: claimError } = await supabase.from("damage_claims").insert({
    booking_id: booking.id,
    filed_by: equipment.owner_id,
    damage_description: description,
    estimated_cost: data?.estimated_cost || 0,
    status: "pending",
  });

  if (claimError) {
    return { success: false, error: claimError.message };
  }

  // Transition to disputed
  const { error } = await supabase
    .from("booking_requests")
    .update({ status: "disputed" })
    .eq("id", booking.id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Notify renter
  await createNotification(supabase, booking.renter_id as string, {
    type: "booking_cancelled",
    priority: "critical",
    title: "Damage Claim Filed",
    message: `The owner has filed a damage claim for ${equipment.title}. Please review and respond.`,
    related_entity_type: "booking",
    related_entity_id: booking.id as string,
  });

  return { success: true, new_status: "disputed" };
}

async function handleResolveDispute(
  supabase: ReturnType<typeof createClient>,
  booking: Record<string, unknown>,
  data?: Record<string, unknown>
): Promise<TransitionResponse> {
  if (booking.status !== "disputed") {
    return { success: false, error: `Cannot resolve dispute from status: ${booking.status}` };
  }

  // Update damage claim to resolved
  await supabase
    .from("damage_claims")
    .update({
      status: "resolved",
      resolution: data?.resolution || {},
      updated_at: new Date().toISOString()
    })
    .eq("booking_id", booking.id);

  // Transition to completed
  const { error } = await supabase
    .from("booking_requests")
    .update({
      status: "completed",
      completed_at: new Date().toISOString()
    })
    .eq("id", booking.id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Handle escrow based on resolution
  const deductionAmount = data?.deduction_amount as number || 0;
  await supabase
    .from("payments")
    .update({
      escrow_status: "released",
      escrow_released_at: new Date().toISOString(),
      deposit_status: deductionAmount > 0 ? "claimed" : "released",
      deposit_released_at: new Date().toISOString()
    })
    .eq("booking_request_id", booking.id);

  return { success: true, new_status: "completed" };
}

async function handleCancel(
  supabase: ReturnType<typeof createClient>,
  booking: Record<string, unknown>,
  userId: string,
  isOwner: boolean,
  isRenter: boolean,
  data?: Record<string, unknown>
): Promise<TransitionResponse> {
  const cancellableStatuses = [
    "pending", "paid", "awaiting_pickup_inspection", "awaiting_start_date"
  ];

  if (!cancellableStatuses.includes(booking.status as string)) {
    return { success: false, error: `Cannot cancel from status: ${booking.status}` };
  }

  // Transition to cancelled
  const { error } = await supabase
    .from("booking_requests")
    .update({ status: "cancelled" })
    .eq("id", booking.id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Handle refund if payment exists
  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("booking_request_id", booking.id)
    .single();

  if (payment && payment.payment_status === "succeeded") {
    await supabase
      .from("payments")
      .update({
        escrow_status: "refunded",
        deposit_status: "refunded",
        refund_amount: payment.total_amount,
        refund_reason: data?.reason || "Booking cancelled"
      })
      .eq("booking_request_id", booking.id);
  }

  // Notify other party
  const equipment = booking.equipment as { owner_id: string; title: string };
  const notifyUserId = isRenter ? equipment.owner_id : (booking.renter_id as string);
  await createNotification(supabase, notifyUserId, {
    type: "booking_cancelled",
    title: "Booking Cancelled",
    message: `The booking for ${equipment.title} has been cancelled.`,
    related_entity_type: "booking",
    related_entity_id: booking.id as string,
  });

  return { success: true, new_status: "cancelled" };
}

async function createNotification(supabase: ReturnType<typeof createClient>, userId: string, notification: {
  type: string;
  priority?: string;
  title: string;
  message: string;
  related_entity_type: string;
  related_entity_id: string;
}) {
  await supabase.from("notifications").insert({
    user_id: userId,
    type: notification.type,
    priority: notification.priority || "medium",
    title: notification.title,
    message: notification.message,
    related_entity_type: notification.related_entity_type,
    related_entity_id: notification.related_entity_id,
  });
}

function jsonResponse(data: TransitionResponse, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
