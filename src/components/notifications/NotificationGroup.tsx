import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import NotificationItem from "@/components/notifications/NotificationItem";
import type { NotificationGroup as NotificationGroupType } from "@/types/notification";

// ============================================================================
// PROPS
// ============================================================================

type NotificationGroupProps = {
  group: NotificationGroupType;
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  onToggleExpand?: (groupKey: string) => void;
};

// ============================================================================
// COMPONENT
// ============================================================================

const NotificationGroup = ({
  group,
  onMarkAsRead,
  onDelete,
  onToggleExpand,
}: NotificationGroupProps) => {
  // If only one notification or always expanded, just render the item(s)
  if (group.count === 1) {
    return (
      <NotificationItem
        notification={group.latest}
        onMarkAsRead={onMarkAsRead}
        onDelete={onDelete}
      />
    );
  }

  // Multiple notifications in group
  const unreadCount = group.notifications.filter((n) => !n.is_read).length;

  const handleToggle = () => {
    if (onToggleExpand) {
      onToggleExpand(group.group_key);
    }
  };

  return (
    <div className="rounded-lg overflow-hidden">
      {/* Group Header - Collapsed View */}
      {!group.isExpanded && (
        <div
          role="button"
          tabIndex={0}
          onClick={handleToggle}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleToggle();
            }
          }}
          className={cn(
            "flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer",
            "hover:bg-accent/50",
            unreadCount > 0 && "bg-accent/30"
          )}
          aria-label="Expand notifications"
          aria-expanded={false}
        >
          {/* Unread indicator */}
          {unreadCount > 0 && (
            <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className={cn("text-sm", unreadCount > 0 ? "font-semibold" : "font-medium")}>
              {group.count} {group.latest.type === "new_message" ? "messages" : "notifications"}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">
              {group.latest.title}
            </p>
          </div>

          {/* Expand icon */}
          <span className="h-7 w-7 flex-shrink-0 flex items-center justify-center" aria-hidden="true">
            <ChevronDown className="h-4 w-4" />
          </span>
        </div>
      )}

      {/* Expanded View */}
      {group.isExpanded && (
        <div className="space-y-0.5">
          {/* Collapse header */}
          <button
            onClick={handleToggle}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 text-xs font-medium",
              "text-muted-foreground hover:text-foreground transition-colors"
            )}
          >
            <ChevronUp className="h-3 w-3" />
            <span>
              Collapse {group.count} {group.latest.type === "new_message" ? "messages" : "notifications"}
            </span>
          </button>

          {/* Individual notifications */}
          {group.notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={onMarkAsRead}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationGroup;
