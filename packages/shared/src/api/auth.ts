// Auth API operations
import type { SupabaseClient, User, Session } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

type AppSupabaseClient = SupabaseClient<Database>;

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

/**
 * Get the current session
 */
export async function getSession(
  client: AppSupabaseClient
): Promise<{ session: Session | null; error: Error | null }> {
  const { data, error } = await client.auth.getSession();
  return { session: data.session, error };
}

/**
 * Get the current user
 */
export async function getUser(
  client: AppSupabaseClient
): Promise<{ user: User | null; error: Error | null }> {
  const { data, error } = await client.auth.getUser();
  return { user: data.user, error };
}

/**
 * Sign in with email and password
 */
export async function signInWithPassword(
  client: AppSupabaseClient,
  email: string,
  password: string
): Promise<{ session: Session | null; error: Error | null }> {
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  return { session: data.session, error };
}

/**
 * Sign up with email and password
 */
export async function signUp(
  client: AppSupabaseClient,
  email: string,
  password: string,
  metadata?: { full_name?: string }
): Promise<{ session: Session | null; user: User | null; error: Error | null }> {
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });
  return { session: data.session, user: data.user, error };
}

/**
 * Sign out
 */
export async function signOut(
  client: AppSupabaseClient
): Promise<{ error: Error | null }> {
  const { error } = await client.auth.signOut();
  return { error };
}

/**
 * Sign in with OAuth provider
 * Note: redirectTo should be set by the app based on platform
 */
export async function signInWithOAuth(
  client: AppSupabaseClient,
  provider: 'google' | 'apple' | 'facebook',
  redirectTo: string
): Promise<{ url: string | null; error: Error | null }> {
  const { data, error } = await client.auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  });
  return { url: data.url, error };
}

/**
 * Send password reset email
 */
export async function resetPassword(
  client: AppSupabaseClient,
  email: string,
  redirectTo: string
): Promise<{ error: Error | null }> {
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  return { error };
}

/**
 * Update user password (when logged in)
 */
export async function updatePassword(
  client: AppSupabaseClient,
  newPassword: string
): Promise<{ error: Error | null }> {
  const { error } = await client.auth.updateUser({
    password: newPassword,
  });
  return { error };
}

/**
 * Refresh session
 */
export async function refreshSession(
  client: AppSupabaseClient
): Promise<{ session: Session | null; error: Error | null }> {
  const { data, error } = await client.auth.refreshSession();
  return { session: data.session, error };
}

/**
 * Set auth token for realtime connections
 */
export function setRealtimeAuth(
  client: AppSupabaseClient,
  accessToken: string
): void {
  client.realtime.setAuth(accessToken);
}
