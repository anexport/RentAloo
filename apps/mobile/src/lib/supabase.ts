import { createSupabaseClient } from '@rentaloo/shared/api';
import { supabaseCapacitorStorage } from './supabaseStorage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

/**
 * Supabase client for mobile app
 * Uses Capacitor Preferences for native session persistence
 * This survives app restarts and WebView cache clears
 */
export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
  storage: supabaseCapacitorStorage,
  detectSessionInUrl: false, // IMPORTANT: mobile handles deep links manually
  autoRefreshToken: true,
  persistSession: true,
});
