// Messaging API operations
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';
import type { ConversationWithDetails, MessageWithSender, NewMessage } from '../types/messaging';

type AppSupabaseClient = SupabaseClient<Database>;

/**
 * Fetch user's conversations
 */
export async function getConversations(
  client: AppSupabaseClient,
  userId: string
): Promise<{ data: ConversationWithDetails[] | null; error: Error | null }> {
  const { data, error } = await client
    .from('conversations')
    .select(`
      *,
      booking_request:booking_requests(
        *,
        equipment:equipment(*)
      )
    `)
    .contains('participants', [userId])
    .order('updated_at', { ascending: false });

  return { data: data as ConversationWithDetails[] | null, error };
}

/**
 * Fetch messages for a conversation
 */
export async function getMessages(
  client: AppSupabaseClient,
  conversationId: string,
  options?: { limit?: number; before?: string }
): Promise<{ data: MessageWithSender[] | null; error: Error | null }> {
  let query = client
    .from('messages')
    .select(`
      *,
      sender:profiles(*)
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.before) {
    query = query.lt('created_at', options.before);
  }

  const { data, error } = await query;

  // Reverse to get chronological order
  const messages = data ? [...data].reverse() : null;
  return { data: messages as MessageWithSender[] | null, error };
}

/**
 * Send a message
 */
export async function sendMessage(
  client: AppSupabaseClient,
  message: NewMessage & { sender_id: string }
): Promise<{ data: MessageWithSender | null; error: Error | null }> {
  const { data, error } = await client
    .from('messages')
    .insert({
      conversation_id: message.conversation_id,
      sender_id: message.sender_id,
      content: message.content,
      message_type: message.message_type || 'text',
    })
    .select(`
      *,
      sender:profiles(*)
    `)
    .single();

  // Also update conversation's updated_at
  if (!error) {
    await client
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', message.conversation_id);
  }

  return { data: data as MessageWithSender | null, error };
}

/**
 * Mark conversation as read
 */
export async function markConversationAsRead(
  client: AppSupabaseClient,
  conversationId: string,
  userId: string
): Promise<{ error: Error | null }> {
  const { error } = await client.rpc('mark_conversation_read', {
    p_conversation: conversationId,
    p_user_id: userId,
  });

  return { error };
}

/**
 * Get or create conversation between users for a booking
 */
export async function getOrCreateConversation(
  client: AppSupabaseClient,
  bookingRequestId: string,
  participants: [string, string]
): Promise<{ data: ConversationWithDetails | null; error: Error | null }> {
  // First check if conversation exists
  const { data: existing, error: findError } = await client
    .from('conversations')
    .select(`
      *,
      booking_request:booking_requests(
        *,
        equipment:equipment(*)
      )
    `)
    .eq('booking_request_id', bookingRequestId)
    .single();

  if (existing) {
    return { data: existing as ConversationWithDetails, error: null };
  }

  if (findError && findError.code !== 'PGRST116') {
    return { data: null, error: findError };
  }

  // Create new conversation
  const { data: created, error: createError } = await client
    .from('conversations')
    .insert({
      booking_request_id: bookingRequestId,
      participants,
    })
    .select(`
      *,
      booking_request:booking_requests(
        *,
        equipment:equipment(*)
      )
    `)
    .single();

  if (createError) {
    return { data: null, error: createError };
  }

  // Add participants
  const participantInserts = participants.map((profileId) => ({
    conversation_id: created.id,
    profile_id: profileId,
  }));

  await client.from('conversation_participants').insert(participantInserts);

  return { data: created as ConversationWithDetails, error: null };
}
