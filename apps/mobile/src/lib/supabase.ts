import { createSupabaseClient, type StorageAdapter } from '@rentaloo/shared/api';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { Capacitor } from '@capacitor/core';

/**
 * Secure storage adapter for mobile (Keychain/Keystore)
 * Falls back to localStorage on web (for development)
 */
const createSecureStorageAdapter = (): StorageAdapter => {
  if (!Capacitor.isNativePlatform()) {
    // Fallback for web development
    return {
      getItem: (key: string) => localStorage.getItem(key),
      setItem: (key: string, value: string) => localStorage.setItem(key, value),
      removeItem: (key: string) => localStorage.removeItem(key),
    };
  }

  return {
    getItem: async (key: string) => {
      try {
        const { value } = await SecureStoragePlugin.get({ key });
        return value;
      } catch {
        // Key doesn't exist
        return null;
      }
    },
    setItem: async (key: string, value: string) => {
      await SecureStoragePlugin.set({ key, value });
    },
    removeItem: async (key: string) => {
      try {
        await SecureStoragePlugin.remove({ key });
      } catch {
        // Key doesn't exist, ignore
      }
    },
  };
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

/**
 * Supabase client for mobile app
 * Uses SecureStorage for token persistence on native platforms
 */
export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
  storage: createSecureStorageAdapter(),
  detectSessionInUrl: false, // Mobile handles deep links manually
  autoRefreshToken: true,
  persistSession: true,
});
