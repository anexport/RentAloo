# Messaging UI – Database Requirements Guide

The revamped messaging experience relies on predictable conversation metadata, rich participant context, and booking details. This guide outlines the tables, columns, and derived structures the database must expose so that the UI components (conversation list, thread view, filters, unread state, and presence indicators) work as designed.

---

## 1. Core Tables & Minimum Columns

| Table | Key Columns | Purpose in UI |
| --- | --- | --- |
| `profiles` | `id`, `email`, `last_seen_at`, `role`, timestamps | Participant display (avatar initials, presence, tooltip for “Last seen …”). `last_seen_at` must be nullable but should be updated frequently (see §4). |
| `conversations` | `id` (UUID), `participants` (array of profile IDs) **or** join table reference, `booking_request_id` (FK), timestamps | Shell for a dialog. `booking_request_id` allows us to surface rental context (title, status). |
| `conversation_participants` | `id`, `conversation_id`, `profile_id`, `joined_at`, `last_read_message_id` or `last_read_at` | Enables unread counts & read receipts by tracking state per participant. |
| `messages` | `id`, `conversation_id`, `sender_id`, `content`, `message_type`, `created_at`, optional `metadata` JSON | Thread rendering plus system events. `message_type` should cover at least: `text`, `system`, `booking_approved`, `booking_cancelled`, `booking_declined`. |
| `booking_requests` | `id`, `equipment_id`, `status`, `start_date`, `end_date`, `total_amount`, timestamps | Conversation cards show status & formatted booking info. |
| `equipment` | `id`, `title`, `owner_id` | For labels inside the conversation list and search results. |

> ✅ Existing schema checks  
> The generated Supabase types (`src/lib/database.types.ts`) already expose most of these fields. Ensure the physical tables match the generated types (especially `profiles.last_seen_at`, `messages.message_type`, and `conversations.booking_request_id`).

---

## 2. Derived Conversation Summary View

The conversation list needs a single, denormalised payload per conversation:

- Primary participant (other than the current user)
- Last message preview & timestamp
- Booking status & equipment title
- Unread count (per viewer)

Create a materialized view or SQL view (adjust naming as needed):

```sql
create view messaging_conversation_summaries as
with latest_message as (
  select distinct on (conversation_id)
    conversation_id,
    id as message_id,
    sender_id,
    content,
    message_type,
    created_at
  from public.messages
  order by conversation_id, created_at desc
),
unread as (
  select
    cp.conversation_id,
    cp.profile_id,
    count(m.id) as unread_count
  from public.conversation_participants cp
    join public.messages m
      on m.conversation_id = cp.conversation_id
      and m.created_at > coalesce(cp.last_read_at, cp.joined_at, m.created_at - interval '100 years')
      and m.sender_id <> cp.profile_id
  group by cp.conversation_id, cp.profile_id
)
select
  c.id,
  c.booking_request_id,
  c.created_at,
  c.updated_at,
  lm.message_id as last_message_id,
  lm.sender_id as last_message_sender_id,
  lm.content as last_message_content,
  lm.message_type as last_message_type,
  lm.created_at as last_message_created_at,
  cp.profile_id as participant_id,
  p.email as participant_email,
  p.last_seen_at,
  br.status as booking_status,
  br.start_date,
  br.end_date,
  br.total_amount,
  e.title as equipment_title,
  coalesce(u.unread_count, 0) as unread_count
from public.conversations c
  join public.conversation_participants cp on cp.conversation_id = c.id
  join public.profiles p on p.id = cp.profile_id
  left join latest_message lm on lm.conversation_id = c.id
  left join public.booking_requests br on br.id = c.booking_request_id
  left join public.equipment e on e.id = br.equipment_id
  left join unread u on u.conversation_id = cp.conversation_id
    and u.profile_id = cp.profile_id;
```

From Supabase you can expose this view through a `messaging_conversation_summaries` type and consume it directly in the messaging hook. Materialize or index as needed (see §6).

---

## 3. Message Thread Query Shape

The thread view expects messages with:

- Sender profile (for future avatars / agent names)
- `message_type` to format system bubbles
- Ordered by `created_at` ascending

Recommended GraphQL / Supabase query pattern:

```sql
select
  m.*,
  sender:profiles!messages_sender_id_fkey ( id, email ),
  -- include booking metadata for system messages if needed
  c.booking_request_id
from public.messages m
  join public.conversations c on c.id = m.conversation_id
where m.conversation_id = :conversationId
order by m.created_at asc;
```

Front-end components already map this shape (`MessageWithSender` type).

---

## 4. Presence & Typing Indicators

- **`profiles.last_seen_at`**: Update on every authenticated API call or via a lightweight RPC (`update_last_seen()`). The UI renders “Active now” when the presence service flags the user as online; otherwise it falls back to the time delta supplied by this column.
- **Typing status**: Handled through Supabase realtime channels; no extra DB fields required.

Suggested helper function:

```sql
create or replace function public.update_last_seen()
returns void
language sql
security definer
as $$
  update public.profiles
  set last_seen_at = now()
  where id = auth.uid();
$$;
```

Call this from middleware or within key mutations.

---

## 5. Unread Counts & Read Receipts

To fully power the “Unread” filter and badges, track per-user read state:

1. **Schema additions**  
   - `conversation_participants.last_read_at` (timestamp with time zone, nullable)  
     – or –  
   - `conversation_participants.last_read_message_id` (UUID)  
   - Optional `conversation_participants.unread_count` maintained via trigger (if you prefer caching).

2. **Mark-as-read RPC**  
   ```sql
   create or replace function public.mark_conversation_read(p_conversation uuid)
   returns void
   language sql
   security definer
   as $$
     update public.conversation_participants
     set last_read_at = now()
     where conversation_id = p_conversation
       and profile_id = auth.uid();
   $$;
   ```

   Call this when the user views a conversation.

3. **UI fallback**  
   Until the backend supports real unread tracking, the front-end interprets “last message sender ≠ current user” as a proxy. Once read tracking is in place, expose the true count in the conversation summary view.

---

## 6. Indexing & Performance

Recommended indexes to keep list + thread queries snappy:

- `messages_conversation_id_created_at_idx` on `(conversation_id, created_at)`
- `messages_sender_id_idx` if running sender-specific lookups
- `conversation_participants_profile_id_idx` for user-specific queries
- `conversation_participants_conversation_id_profile_id_key` (unique pairs)
- `booking_requests_equipment_id_idx`
- `profiles_last_seen_at_idx` (optional, for presence analytics)

When using the summary view heavily (> few thousand conversations), consider:

- Converting to a materialized view refreshed via trigger on `messages` inserts.
- Precomputing `last_message_id` and `last_message_at` on the `conversations` table via trigger to avoid windowing when summarising.

---

## 7. Supabase Policies (Row-Level Security)

If RLS is enabled:

- `conversations`: allow select when the viewer is a participant.
- `conversation_participants`: allow select/update/insert for participant rows the user owns.
- `messages`: allow insert when `sender_id = auth.uid()` and select when the viewer participates in the conversation.
- `profiles`: allow select on minimal fields (`id`, `email`, `last_seen_at`) required for display.

Example policy snippet for `messages` select:

```sql
create policy "Participants can read conversation messages"
on public.messages
for select
using (
  exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = messages.conversation_id
      and cp.profile_id = auth.uid()
  )
);
```

---

## 8. Data Flow Checklist

1. **Create conversation**  
   - Insert into `conversations`  
   - Insert rows into `conversation_participants` for each user  
   - Optionally set `booking_request_id`
2. **Send message**  
   - Insert into `messages` with appropriate `message_type`  
   - Update `conversations.updated_at` (trigger or application logic)
3. **Mark read**  
   - Call `mark_conversation_read()` when user opens the thread
4. **Presence heartbeat**  
   - Call `update_last_seen()` periodically
5. **Refresh summary view**  
   - For materialized views: schedule a cron or trigger refresh  
   - For plain views: ensure indexes exist on underlying tables

---

## 9. Open Items & Enhancements

- **Attachments**: The UI shows an attachment button. Plan for a `message_attachments` table (FK to `messages`) with storage references before enabling the feature.
- **Canned responses**: If quick replies become server-managed, store them in a `messaging_templates` table keyed by owner/tenant role.
- **System events**: Standardise `message_type` values from backend services (booking state changes, reminders) so the `SystemMessage` component renders consistently.

---

By keeping these structures and functions in place, the messaging UI can render conversation metadata, provide responsive filtering, and accurately reflect user activity across the platform. Adapt the view/function names to your naming conventions, but ensure the payloads provide the fields outlined above.
