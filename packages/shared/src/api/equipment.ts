// Equipment API operations
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';
import type { EquipmentFilters, EquipmentWithDetails } from '../types/equipment';

type AppSupabaseClient = SupabaseClient<Database>;

/**
 * Fetch equipment list with optional filters
 */
export async function getEquipmentList(
  client: AppSupabaseClient,
  filters?: EquipmentFilters,
  options?: { limit?: number; offset?: number }
): Promise<{ data: EquipmentWithDetails[] | null; error: Error | null }> {
  let query = client
    .from('equipment')
    .select(`
      *,
      owner:profiles!equipment_owner_id_fkey(*),
      category:categories(*),
      photos:equipment_photos(*)
    `)
    .eq('is_available', true);

  if (filters?.category_id) {
    query = query.eq('category_id', filters.category_id);
  }

  if (filters?.location) {
    query = query.ilike('location', `%${filters.location}%`);
  }

  if (filters?.price_min !== undefined) {
    query = query.gte('daily_rate', filters.price_min);
  }

  if (filters?.price_max !== undefined) {
    query = query.lte('daily_rate', filters.price_max);
  }

  if (filters?.condition && filters.condition !== 'all') {
    query = query.eq('condition', filters.condition);
  }

  if (filters?.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
    );
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  return { data: data as EquipmentWithDetails[] | null, error };
}

/**
 * Fetch single equipment by ID
 */
export async function getEquipmentById(
  client: AppSupabaseClient,
  equipmentId: string
): Promise<{ data: EquipmentWithDetails | null; error: Error | null }> {
  const { data, error } = await client
    .from('equipment')
    .select(`
      *,
      owner:profiles!equipment_owner_id_fkey(*),
      category:categories(*),
      photos:equipment_photos(*),
      reviews(*)
    `)
    .eq('id', equipmentId)
    .single();

  return { data: data as EquipmentWithDetails | null, error };
}

/**
 * Fetch equipment owned by a user
 */
export async function getUserEquipment(
  client: AppSupabaseClient,
  userId: string
): Promise<{ data: EquipmentWithDetails[] | null; error: Error | null }> {
  const { data, error } = await client
    .from('equipment')
    .select(`
      *,
      owner:profiles!equipment_owner_id_fkey(*),
      category:categories(*),
      photos:equipment_photos(*)
    `)
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  return { data: data as EquipmentWithDetails[] | null, error };
}

/**
 * Fetch all categories
 */
export async function getCategories(
  client: AppSupabaseClient
): Promise<{ data: Database['public']['Tables']['categories']['Row'][] | null; error: Error | null }> {
  const { data, error } = await client
    .from('categories')
    .select('*')
    .order('name');

  return { data, error };
}
