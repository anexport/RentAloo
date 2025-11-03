-- Update profiles.last_seen_at based on messaging activity

-- Ensure we don't leave behind older triggers when re-running migrations locally
DROP TRIGGER IF EXISTS trg_messages_last_seen ON public.messages;
DROP TRIGGER IF EXISTS trg_conversation_read_last_seen ON public.conversation_participants;

-- Function to update last_seen_at when a user sends a message
CREATE OR REPLACE FUNCTION public.touch_last_seen_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sender_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.profiles
  SET last_seen_at = NOW()
  WHERE id = NEW.sender_id 
    AND (last_seen_at IS NULL OR last_seen_at < NOW() - INTERVAL '1 minute');

  RETURN NEW;
END;
$$;

-- Function to update last_seen_at when a user marks a conversation as read
CREATE OR REPLACE FUNCTION public.touch_last_seen_on_conversation_read()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- profile_id check for safety (trigger WHEN clause guarantees last_read_at IS NOT NULL and value changed)
  IF NEW.profile_id IS NOT NULL THEN
    UPDATE public.profiles
    SET last_seen_at = NOW()
    WHERE id = NEW.profile_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger: user sends a message
CREATE TRIGGER trg_messages_last_seen
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.touch_last_seen_on_message();

-- Trigger: user marks conversation as read
CREATE TRIGGER trg_conversation_read_last_seen
AFTER UPDATE OF last_read_at ON public.conversation_participants
FOR EACH ROW
WHEN (NEW.last_read_at IS NOT NULL AND NEW.last_read_at IS DISTINCT FROM OLD.last_read_at)
EXECUTE FUNCTION public.touch_last_seen_on_conversation_read();
