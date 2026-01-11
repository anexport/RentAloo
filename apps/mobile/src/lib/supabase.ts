import { createSupabaseClient, type StorageAdapter } from '@rentaloo/shared/api';

/**
 * Storage adapter for mobile
 * TODO: Re-add SecureStorage (Keychain/Keystore) when capacitor-secure-storage-plugin is updated for Cap 7
 * Currently uses localStorage which works in Capacitor WebView
 */
const createStorageAdapter = (): StorageAdapter => {
  return {
    getItem: (key: string) => localStorage.getItem(key),
    setItem: (key: string, value: string) => localStorage.setItem(key, value),
    removeItem: (key: string) => localStorage.removeItem(key),
  };
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

/**
 * Supabase client for mobile app
 * Uses localStorage for token persistence (WebView storage)
 */
export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
  storage: createStorageAdapter(),
  detectSessionInUrl: false, // Mobile handles deep links manually
  autoRefreshToken: true,
  persistSession: true,
});
