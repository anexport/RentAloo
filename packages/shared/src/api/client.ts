// Supabase client factory - platform-agnostic
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

/**
 * Storage adapter interface for session persistence.
 * Web uses localStorage, Mobile uses SecureStorage.
 */
export interface StorageAdapter {
  getItem: (key: string) => Promise<string | null> | string | null;
  setItem: (key: string, value: string) => Promise<void> | void;
  removeItem: (key: string) => Promise<void> | void;
}

export interface SupabaseClientOptions {
  /** Custom storage adapter for session persistence */
  storage?: StorageAdapter;
  /** Whether to detect OAuth callbacks in URL (web only) */
  detectSessionInUrl?: boolean;
  /** Whether to auto-refresh tokens */
  autoRefreshToken?: boolean;
  /** Whether to persist session */
  persistSession?: boolean;
  /** OAuth flow type: 'implicit' returns tokens in hash, 'pkce' returns code in query */
  flowType?: 'implicit' | 'pkce';
}

/**
 * Create a Supabase client with platform-specific configuration.
 * 
 * @example Web usage:
 * ```ts
 * const supabase = createSupabaseClient(url, key);
 * // Uses localStorage by default
 * ```
 * 
 * @example Mobile usage with SecureStorage:
 * ```ts
 * const supabase = createSupabaseClient(url, key, {
 *   storage: secureStorageAdapter,
 *   detectSessionInUrl: false,
 * });
 * ```
 */
export const createSupabaseClient = (
  supabaseUrl: string,
  supabaseAnonKey: string,
  options: SupabaseClientOptions = {}
): SupabaseClient<Database> => {
  const {
    storage,
    detectSessionInUrl = true,
    autoRefreshToken = true,
    persistSession = true,
    flowType,
  } = options;

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken,
      persistSession,
      detectSessionInUrl,
      ...(storage && { storage }),
      ...(flowType && { flowType }),
    },
  });
};

// Re-export SupabaseClient type for convenience
export type { SupabaseClient };
export type AppSupabaseClient = SupabaseClient<Database>;
