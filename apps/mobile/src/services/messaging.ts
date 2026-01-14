/**
 * Messaging service - fetches conversations and messages from Supabase
 * Simplified version for mobile app
 */

import { supabase } from '@/lib/supabase';

// Types
export interface ConversationSummary {
  id: string;
  booking_request_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  last_message_id: string | null;
  last_message_sender_id: string | null;
  last_message_content: string | null;
  last_message_type: string | null;
  last_message_created_at: string | null;
  participant_id: string;
  participant_email: string | null;
  participant_name?: string | null;
  participant_avatar?: string | null;
  last_seen_at: string | null;
  booking_status: string | null;
  start_date: string | null;
  end_date: string | null;
  total_amount: number | null;
  equipment_title: string | null;
  unread_count: number;
}

export interface Conversation {
  id: string;
  otherParticipant: {
    id: string;
    email: string | null;
    name: string | null;
    avatar: string | null;
  };
  lastMessage: {
    content: string | null;
    createdAt: string | null;
    senderId: string | null;
    type: string | null;
  } | null;
  equipmentTitle: string | null;
  bookingStatus: string | null;
  unreadCount: number;
  updatedAt: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'system';
  created_at: string;
  sender?: {
    id: string;
    email: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

/**
 * Fetch all conversations for the current user
 */
export async function fetchConversations(userId: string): Promise<Conversation[]> {
  console.log('[messaging] Fetching conversations for user:', userId);

  const { data, error } = await supabase
    .from('messaging_conversation_summaries')
    .select('*')
    .order('last_message_created_at', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('[messaging] FETCH_ERROR:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    console.log('[messaging] No conversations found');
    return [];
  }

  // Group by conversation ID and filter for other participants
  const conversationMap = new Map<string, Conversation>();

  for (const row of data as ConversationSummary[]) {
    // Skip if this is the current user's own participant row
    if (row.participant_id === userId) {
      // But capture the unread count
      const existing = conversationMap.get(row.id);
      if (existing) {
        existing.unreadCount = row.unread_count ?? 0;
      }
      continue;
    }

    // This is the other participant
    if (!conversationMap.has(row.id)) {
      conversationMap.set(row.id, {
        id: row.id,
        otherParticipant: {
          id: row.participant_id,
          email: row.participant_email,
          name: row.participant_name ?? null,
          avatar: row.participant_avatar ?? null,
        },
        lastMessage: row.last_message_id ? {
          content: row.last_message_content,
          createdAt: row.last_message_created_at,
          senderId: row.last_message_sender_id,
          type: row.last_message_type,
        } : null,
        equipmentTitle: row.equipment_title,
        bookingStatus: row.booking_status,
        unreadCount: 0, // Will be set from user's own row
        updatedAt: row.updated_at,
      });
    }
  }

  // Second pass to get unread counts from user's own rows
  for (const row of data as ConversationSummary[]) {
    if (row.participant_id === userId) {
      const conv = conversationMap.get(row.id);
      if (conv) {
        conv.unreadCount = row.unread_count ?? 0;
      }
    }
  }

  const conversations = Array.from(conversationMap.values());
  console.log('[messaging] Fetched', conversations.length, 'conversations');
  return conversations;
}

/**
 * Fetch messages for a conversation
 */
export async function fetchMessages(conversationId: string): Promise<Message[]> {
  console.log('[messaging] Fetching messages for conversation:', conversationId);

  const { data, error } = await supabase
    .from('messages')
    .select(`
      id,
      conversation_id,
      sender_id,
      content,
      message_type,
      created_at,
      sender:profiles!messages_sender_id_fkey(id, email, full_name, avatar_url)
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[messaging] FETCH_MESSAGES_ERROR:', error);
    throw error;
  }

  console.log('[messaging] Fetched', data?.length ?? 0, 'messages');
  return (data ?? []) as unknown as Message[];
}

/**
 * Send a message
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  messageType: 'text' | 'image' | 'system' = 'text'
): Promise<Message> {
  console.log('[messaging] Sending message to conversation:', conversationId);

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      message_type: messageType,
    })
    .select(`
      id,
      conversation_id,
      sender_id,
      content,
      message_type,
      created_at
    `)
    .single();

  if (error) {
    console.error('[messaging] SEND_ERROR:', error);
    throw error;
  }

  console.log('[messaging] Message sent:', data.id);
  return data as Message;
}

/**
 * Mark conversation as read
 */
export async function markConversationAsRead(
  conversationId: string,
  userId: string
): Promise<void> {
  console.log('[messaging] Marking conversation as read:', conversationId);

  const { error } = await supabase
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('profile_id', userId);

  if (error) {
    console.error('[messaging] MARK_READ_ERROR:', error);
    // Don't throw, this is not critical
  }
}

/**
 * Subscribe to new messages in a conversation
 */
export function subscribeToMessages(
  conversationId: string,
  onMessage: (message: Message) => void
) {
  console.log('[messaging] Subscribing to conversation:', conversationId);

  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        console.log('[messaging] New message received:', payload.new);
        onMessage(payload.new as Message);
      }
    )
    .subscribe();

  return () => {
    console.log('[messaging] Unsubscribing from conversation:', conversationId);
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to conversation list updates
 */
export function subscribeToConversations(
  userId: string,
  onUpdate: () => void
) {
  console.log('[messaging] Subscribing to conversation updates');

  const channel = supabase
    .channel(`conversations:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
      },
      () => {
        console.log('[messaging] Conversations updated');
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    console.log('[messaging] Unsubscribing from conversations');
    supabase.removeChannel(channel);
  };
}
