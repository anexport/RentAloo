// Booking API operations
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';
import type { BookingRequestWithDetails } from '../types/booking';

type AppSupabaseClient = SupabaseClient<Database>;

/**
 * Fetch booking requests for a user (as renter or owner)
 */
export async function getUserBookings(
  client: AppSupabaseClient,
  userId: string,
  role: 'renter' | 'owner' = 'renter'
): Promise<{ data: BookingRequestWithDetails[] | null; error: Error | null }> {
  let query = client
    .from('booking_requests')
    .select(`
      *,
      equipment:equipment(
        *,
        category:categories(*),
        photos:equipment_photos(*)
      ),
      renter:profiles!booking_requests_renter_id_fkey(*),
      owner:profiles!fk_booking_requests_owner(*)
    `);

  if (role === 'renter') {
    query = query.eq('renter_id', userId);
  } else {
    query = query.eq('equipment.owner_id', userId);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  return { data: data as BookingRequestWithDetails[] | null, error };
}

/**
 * Fetch a single booking by ID
 */
export async function getBookingById(
  client: AppSupabaseClient,
  bookingId: string
): Promise<{ data: BookingRequestWithDetails | null; error: Error | null }> {
  const { data, error } = await client
    .from('booking_requests')
    .select(`
      *,
      equipment:equipment(
        *,
        category:categories(*),
        photos:equipment_photos(*)
      ),
      renter:profiles!booking_requests_renter_id_fkey(*),
      owner:profiles!fk_booking_requests_owner(*)
    `)
    .eq('id', bookingId)
    .single();

  return { data: data as BookingRequestWithDetails | null, error };
}

/**
 * Check booking availability using RPC
 */
export async function checkBookingAvailability(
  client: AppSupabaseClient,
  equipmentId: string,
  startDate: string,
  endDate: string,
  excludeBookingId?: string
): Promise<{ available: boolean; error: Error | null }> {
  const { data, error } = await client.rpc('check_booking_conflicts', {
    p_equipment_id: equipmentId,
    p_start_date: startDate,
    p_end_date: endDate,
    p_exclude_booking_id: excludeBookingId,
  });

  return { available: data === true, error };
}

/**
 * Update booking status
 */
export async function updateBookingStatus(
  client: AppSupabaseClient,
  bookingId: string,
  status: Database['public']['Enums']['booking_status']
): Promise<{ error: Error | null }> {
  const { error } = await client
    .from('booking_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', bookingId);

  return { error };
}

/**
 * Get active rentals (approved or active status)
 */
export async function getActiveRentals(
  client: AppSupabaseClient,
  userId: string
): Promise<{ data: BookingRequestWithDetails[] | null; error: Error | null }> {
  const { data, error } = await client
    .from('booking_requests')
    .select(`
      *,
      equipment:equipment(
        *,
        category:categories(*),
        photos:equipment_photos(*)
      ),
      renter:profiles!booking_requests_renter_id_fkey(*),
      owner:profiles!fk_booking_requests_owner(*)
    `)
    .eq('renter_id', userId)
    .in('status', ['approved', 'active'])
    .order('start_date', { ascending: true });

  return { data: data as BookingRequestWithDetails[] | null, error };
}
