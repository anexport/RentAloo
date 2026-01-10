import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { ConversationWithDetails } from "@/types/messaging";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MobileConversationRowProps {
  conversation: ConversationWithDetails;
  isSelected?: boolean;
  onSelect: (conversation: ConversationWithDetails) => void;
  otherParticipantName: string;
  otherParticipantInitials: string;
  otherParticipantAvatar?: string | null;
  isOnline: boolean;
  unread: boolean;
}

/**
 * Mobile-optimized conversation row with Google Maps-style design.
 * Clean row layout without heavy card borders, larger avatars, subtle separators.
 */
export const MobileConversationRow = ({
  conversation,
  isSelected = false,
  onSelect,
  otherParticipantName,
  otherParticipantInitials,
  otherParticipantAvatar,
  isOnline,
  unread,
}: MobileConversationRowProps) => {
  const lastMessage = conversation.last_message;
  const lastActivityTimestamp =
    lastMessage?.created_at ||
    conversation.updated_at ||
    conversation.created_at;

  let timeLabel = "";
  try {
    if (lastActivityTimestamp) {
      const date = new Date(lastActivityTimestamp);
      if (!isNaN(date.getTime())) {
        timeLabel = formatDistanceToNow(date, { addSuffix: false });
      }
    }
  } catch {
    timeLabel = "";
  }

  // Truncate message preview
  const messagePreview = lastMessage?.content || "No messages yet";
  const truncatedPreview =
    messagePreview.length > 60
      ? messagePreview.slice(0, 60) + "..."
      : messagePreview;

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation)}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
        "active:bg-muted/60",
        // Subtle selection/hover states
        isSelected ? "bg-primary/5" : "hover:bg-muted/40",
        // Bottom separator
        "border-b border-border/30 last:border-b-0"
      )}
    >
      {/* Avatar with online indicator */}
      <div className="relative shrink-0">
        <Avatar className="h-12 w-12">
          {otherParticipantAvatar && (
            <AvatarImage
              src={otherParticipantAvatar}
              alt={otherParticipantName}
            />
          )}
          <AvatarFallback className="bg-muted text-sm font-medium">
            {otherParticipantInitials}
          </AvatarFallback>
        </Avatar>
        {/* Online indicator dot */}
        {isOnline && (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "truncate text-[15px]",
              unread
                ? "font-semibold text-foreground"
                : "font-medium text-foreground"
            )}
          >
            {otherParticipantName}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {timeLabel}
          </span>
        </div>

        <div className="mt-0.5 flex items-center gap-2">
          <p
            className={cn(
              "flex-1 truncate text-sm",
              unread ? "font-medium text-foreground" : "text-muted-foreground"
            )}
          >
            {truncatedPreview}
          </p>
          {/* Unread dot indicator */}
          {unread && (
            <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
          )}
        </div>
      </div>
    </button>
  );
};

export default MobileConversationRow;
