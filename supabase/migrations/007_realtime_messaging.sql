-- Messaging realtime broadcast setup
-- Inspired by supabase/guides/RealTimeAssistant.md

-- Function to broadcast new messages to conversation-specific channels
CREATE OR REPLACE FUNCTION public.notify_message_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  channel text;
  participant_rec record;
BEGIN
  channel := 'room:' || NEW.conversation_id::text || ':messages';

  PERFORM realtime.broadcast_changes(
    channel,
    'message_created',
    'INSERT',
    TG_TABLE_NAME,
    TG_TABLE_SCHEMA,
    NEW,
    NULL
  );

  FOR participant_rec IN
    SELECT profile_id
    FROM public.conversation_participants
    WHERE conversation_id = NEW.conversation_id
  LOOP
    PERFORM realtime.send(
      jsonb_build_object(
        'conversation_id', NEW.conversation_id,
        'message_id', NEW.id
      ),
      'message_created',
      'user:' || participant_rec.profile_id::text || ':conversations',
      true
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Trigger to invoke message broadcast on insert
DROP TRIGGER IF EXISTS notify_message_created_trg ON public.messages;
CREATE TRIGGER notify_message_created_trg
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_message_created();

-- Function to broadcast participant additions to user-specific channels
CREATE OR REPLACE FUNCTION public.notify_conversation_participant_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  channel text;
BEGIN
  channel := 'user:' || NEW.profile_id::text || ':conversations';

  PERFORM realtime.broadcast_changes(
    channel,
    'participant_added',
    'INSERT',
    TG_TABLE_NAME,
    TG_TABLE_SCHEMA,
    NEW,
    NULL
  );

  RETURN NEW;
END;
$$;

-- Trigger to notify users when they are added to conversations
DROP TRIGGER IF EXISTS notify_conversation_participant_added_trg ON public.conversation_participants;
CREATE TRIGGER notify_conversation_participant_added_trg
AFTER INSERT ON public.conversation_participants
FOR EACH ROW
EXECUTE FUNCTION public.notify_conversation_participant_added();

-- Ensure RLS is enabled for realtime messages
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Policy allowing conversation participants to subscribe to room and user topics
DROP POLICY IF EXISTS "allow messaging topics" ON realtime.messages;
CREATE POLICY "allow messaging topics" ON realtime.messages
FOR SELECT
USING (
  (
    split_part(topic, ':', 1) = 'room'
    AND split_part(topic, ':', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND EXISTS (
      SELECT 1
      FROM public.conversation_participants cp
      WHERE cp.conversation_id = split_part(topic, ':', 2)::uuid
        AND cp.profile_id = auth.uid()
    )
  )
  OR (
    split_part(topic, ':', 1) = 'user'
    AND split_part(topic, ':', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND split_part(topic, ':', 2)::uuid = auth.uid()
  )
);

-- Index to support policy lookups on topic
CREATE INDEX IF NOT EXISTS idx_realtime_messages_topic ON realtime.messages(topic);
