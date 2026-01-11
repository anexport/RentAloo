// Storage API operations
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

type AppSupabaseClient = SupabaseClient<Database>;

export type StorageBucket = 'equipment-photos' | 'verification-documents' | 'avatars';

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  client: AppSupabaseClient,
  bucket: StorageBucket,
  path: string,
  file: File | Blob,
  options?: { contentType?: string; upsert?: boolean }
): Promise<{ data: { path: string } | null; error: Error | null }> {
  const { data, error } = await client.storage
    .from(bucket)
    .upload(path, file, {
      contentType: options?.contentType,
      upsert: options?.upsert ?? false,
    });

  return { data, error };
}

/**
 * Get public URL for a file
 */
export function getPublicUrl(
  client: AppSupabaseClient,
  bucket: StorageBucket,
  path: string
): string {
  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Delete a file from storage
 */
export async function deleteFile(
  client: AppSupabaseClient,
  bucket: StorageBucket,
  path: string
): Promise<{ error: Error | null }> {
  const { error } = await client.storage.from(bucket).remove([path]);
  return { error };
}

/**
 * Delete multiple files from storage
 */
export async function deleteFiles(
  client: AppSupabaseClient,
  bucket: StorageBucket,
  paths: string[]
): Promise<{ error: Error | null }> {
  const { error } = await client.storage.from(bucket).remove(paths);
  return { error };
}

/**
 * List files in a storage folder
 */
export async function listFiles(
  client: AppSupabaseClient,
  bucket: StorageBucket,
  folder: string
): Promise<{ data: { name: string; id: string }[] | null; error: Error | null }> {
  const { data, error } = await client.storage.from(bucket).list(folder);
  return { data, error };
}

/**
 * Create a signed URL for temporary access
 */
export async function createSignedUrl(
  client: AppSupabaseClient,
  bucket: StorageBucket,
  path: string,
  expiresInSeconds: number = 3600
): Promise<{ signedUrl: string | null; error: Error | null }> {
  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  return { signedUrl: data?.signedUrl ?? null, error };
}

/**
 * Validate file before upload
 */
export function validateFile(
  file: File,
  options: {
    maxSizeMB?: number;
    allowedTypes?: string[];
  } = {}
): { valid: boolean; error?: string } {
  const { maxSizeMB = 5, allowedTypes = ['image/jpeg', 'image/png', 'image/webp'] } = options;

  if (file.size > maxSizeMB * 1024 * 1024) {
    return { valid: false, error: `File size must be less than ${maxSizeMB}MB` };
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type ${file.type} is not allowed` };
  }

  return { valid: true };
}
