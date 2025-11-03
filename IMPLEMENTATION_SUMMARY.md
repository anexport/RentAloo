Move last_seen_at updates to database triggers
Analysis
Current update_last_seen() calls occur at:

Message sending (useMessaging.ts:397) - when user sends a message
Message receiving (useMessaging.ts:588) - when user receives a message while viewing conversation
Presence heartbeat (usePresence.ts:58) - every 30 seconds (throttled to 5 minutes)
Proposed Triggers
1. Trigger on messages INSERT
Event: When a user sends a message
Action: Update sender's profiles.last_seen_at = NOW()
Reason: Sending a message indicates active engagement
2. Trigger on conversation_participants.last_read_at UPDATE
Event: When a user marks a conversation as read (via mark_conversation_read())
Action: Update user's profiles.last_seen_at = NOW()
Reason: Marking as read indicates active engagement (viewing conversation)
Note: This happens when user opens/viewing a conversation, which is meaningful activity
3. Remove presence heartbeat updates
Rationale: Presence tracking is for "online now" status (in-memory Realtime channels), which is separate from last_seen_at. last_seen_at should reflect actual engagement/activity, not just being online.
Implementation Steps
Create migration (supabase/migrations/010_add_last_seen_triggers.sql):
Create trigger function that updates profiles.last_seen_at on message INSERT
Create trigger function that updates profiles.last_seen_at on conversation_participants.last_read_at UPDATE
Attach triggers to respective tables
Remove client-side update_last_seen() calls:
Remove from useMessaging.ts (lines 397 and 588)
Remove from usePresence.ts (line 58 and entire updateLastSeen function/throttling logic)
Keep update_last_seen() RPC function in database (for potential future use or manual updates)
Update usePresence.ts:
Remove updateLastSeen callback function
Remove lastSeenUpdateRef and throttling logic
Remove LAST_SEEN_UPDATE_INTERVAL constant
Keep presence tracking for "online now" status (separate concern)
Test:
Verify last_seen_at updates when sending messages
Verify last_seen_at updates when marking conversations as read
Verify no unnecessary database writes from presence heartbeat
Files to Modify
supabase/migrations/010_add_last_seen_triggers.sql (new file)
src/hooks/useMessaging.ts - Remove update_last_seen() RPC calls (lines 397, 588)
src/hooks/usePresence.ts - Remove all updateLastSeen logic (lines 18, 27-44, 58)