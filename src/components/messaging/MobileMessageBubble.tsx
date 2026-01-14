import type { MessageWithSender } from "../../types/messaging";
import { useAuth } from "../../hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { SystemMessage } from "./shared/SystemMessage";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface MobileMessageBubbleProps {
  message: MessageWithSender;
  senderName?: string;
  senderAvatar?: string | null;
  showAvatar?: boolean;
  animationDelay?: number;
}

/**
 * Mobile-optimized message bubble with Google Maps-style design.
 * Features entrance animations, external timestamps, and avatar display.
 */
const MobileMessageBubble = ({
  message,
  senderName,
  senderAvatar,
  showAvatar = true,
  animationDelay = 0,
}: MobileMessageBubbleProps) => {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const isOwnMessage = user?.id === message.sender_id;
  const isSystemMessage =
    message.message_type === "system" ||
    message.message_type === "booking_approved" ||
    message.message_type === "booking_cancelled";

  // Trigger entrance animation after mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, animationDelay);
    return () => clearTimeout(timer);
  }, [animationDelay]);

  // System messages are centered and styled differently
  if (isSystemMessage) {
    const tone =
      message.message_type === "booking_approved"
        ? "success"
        : message.message_type === "booking_cancelled"
        ? "danger"
        : "info";

    return (
      <SystemMessage
        content={message.content}
        createdAt={message.created_at}
        tone={tone}
      />
    );
  }

  const initials = senderName?.charAt(0).toUpperCase() || "?";

  return (
    <div
      className={cn(
        "flex gap-2 mb-3",
        isOwnMessage ? "justify-end" : "justify-start",
        // Animation styles
        "transition-all duration-300 ease-out",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      )}
    >
      {/* Avatar for received messages */}
      {!isOwnMessage && showAvatar && (
        <Avatar className="h-8 w-8 shrink-0 mt-1">
          {senderAvatar && <AvatarImage src={senderAvatar} alt={senderName} />}
          <AvatarFallback className="text-xs bg-muted">
            {initials}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Spacer when avatar is hidden for received messages (consecutive messages) */}
      {!isOwnMessage && !showAvatar && <div className="w-8 shrink-0" />}

      <div
        className={cn(
          "flex flex-col",
          isOwnMessage ? "items-end" : "items-start"
        )}
      >
        {/* Message bubble */}
        <div
          className={cn(
            "max-w-[min(78%,280px)] rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed",
            isOwnMessage
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-muted/80 text-foreground rounded-bl-md"
          )}
        >
          <p className="break-words whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Timestamp below bubble */}
        <span
          className={cn(
            "text-[11px] text-muted-foreground/70 mt-1 px-1",
            isOwnMessage ? "text-right" : "text-left"
          )}
        >
          {formatDistanceToNow(new Date(message.created_at || ""), {
            addSuffix: true,
          })}
        </span>
      </div>
    </div>
  );
};

export default MobileMessageBubble;
