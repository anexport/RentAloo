import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  CalendarCheck,
  CalendarX,
  CheckCircle,
  Clock,
  MessageSquare,
  CreditCard,
  Banknote,
  RotateCcw,
  Star,
  ShieldCheck,
  ShieldX,
  Shield,
  Heart,
  Eye,
  Megaphone,
  Gift,
  Bell,
  Trash2,
  X,
} from "lucide-react";
import type { NotificationWithActor, NotificationType } from "@/types/notification";
import { getNotificationPath } from "@/types/notification";

// ============================================================================
// PROPS
// ============================================================================

type NotificationItemProps = {
  notification: NotificationWithActor;
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  showDeleteButton?: boolean;
};

// ============================================================================
// ICON MAP
// ============================================================================

const iconMap: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  booking_confirmed: CalendarCheck,
  booking_cancelled: CalendarX,
  booking_completed: CheckCircle,
  booking_reminder: Clock,
  new_message: MessageSquare,
  payment_received: CreditCard,
  payment_processed: CreditCard,
  payout_sent: Banknote,
  refund_issued: RotateCcw,
  review_received: Star,
  verification_approved: ShieldCheck,
  verification_rejected: ShieldX,
  verification_reminder: Shield,
  equipment_favorited: Heart,
  equipment_views_milestone: Eye,
  system_announcement: Megaphone,
  promotion: Gift,
};

// ============================================================================
// ICON COLOR MAP
// ============================================================================

const iconColorMap: Record<NotificationType, string> = {
  booking_confirmed: "text-green-500",
  booking_cancelled: "text-red-500",
  booking_completed: "text-blue-500",
  booking_reminder: "text-orange-500",
  new_message: "text-purple-500",
  payment_received: "text-green-500",
  payment_processed: "text-green-500",
  payout_sent: "text-green-600",
  refund_issued: "text-orange-500",
  review_received: "text-yellow-500",
  verification_approved: "text-green-500",
  verification_rejected: "text-red-500",
  verification_reminder: "text-blue-500",
  equipment_favorited: "text-pink-500",
  equipment_views_milestone: "text-blue-400",
  system_announcement: "text-indigo-500",
  promotion: "text-purple-500",
};

// ============================================================================
// COMPONENT
// ============================================================================

const NotificationItem = ({
  notification,
  onMarkAsRead,
  onDelete,
  showDeleteButton = true,
}: NotificationItemProps) => {
  const navigate = useNavigate();
  const Icon = iconMap[notification.type] || Bell;
  const iconColor = iconColorMap[notification.type] || "text-muted-foreground";

  const handleClick = () => {
    // Mark as read
    if (!notification.is_read && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }

    // Navigate to related entity
    const path = getNotificationPath(notification);
    if (path) {
      navigate(path);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(notification.id);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
  });

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleClick();
        }
      }}
      className={cn(
        "group relative flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer",
        "hover:bg-accent/50",
        !notification.is_read && "bg-accent/30"
      )}
    >
      {/* Unread indicator */}
      {!notification.is_read && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
      )}

      {/* Icon or Avatar */}
      <div className="flex-shrink-0 mt-0.5">
        {notification.actor_id ? (
          <Avatar className="h-9 w-9">
            <AvatarImage src={notification.actor_avatar_url || undefined} />
            <AvatarFallback className="text-xs">
              {notification.actor_email?.charAt(0).toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div
            className={cn(
              "flex items-center justify-center w-9 h-9 rounded-full",
              "bg-muted"
            )}
          >
            <Icon className={cn("h-4 w-4", iconColor)} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm leading-tight",
            !notification.is_read ? "font-semibold" : "font-medium"
          )}
        >
          {notification.title}
        </p>
        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
      </div>

      {/* Delete button (on hover) */}
      {showDeleteButton && onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity",
            "hover:bg-destructive/10 hover:text-destructive"
          )}
          onClick={handleDelete}
          aria-label="Delete notification"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default NotificationItem;
