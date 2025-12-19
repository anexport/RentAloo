import { useTranslation } from "react-i18next";
import { Check, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import NotificationGroup from "@/components/notifications/NotificationGroup";
import type {
  NotificationCategory,
  UseNotificationsReturn,
} from "@/types/notification";

// ============================================================================
// PROPS
// ============================================================================

type NotificationPanelProps = {
  notifications: UseNotificationsReturn;
};

// ============================================================================
// FILTER TABS
// ============================================================================

const filterTabs: { value: NotificationCategory; label: string }[] = [
  { value: "all", label: "All" },
  { value: "booking", label: "Bookings" },
  { value: "message", label: "Messages" },
  { value: "payment", label: "Payments" },
  { value: "review", label: "Reviews" },
];

// ============================================================================
// COMPONENT
// ============================================================================

const NotificationPanel = ({ notifications }: NotificationPanelProps) => {
  const { t } = useTranslation("common");

  const {
    groupedNotifications,
    unreadCount,
    loading,
    error,
    filter,
    setFilter,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    toggleGroupExpanded,
  } = notifications;

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  return (
    <div className="w-[380px] max-h-[500px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-base">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={handleMarkAllAsRead}
          >
            <Check className="h-3 w-3 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 px-3 py-2 border-b overflow-x-auto scrollbar-hide">
        {filterTabs.map((tab) => (
          <Button
            key={tab.value}
            variant={filter === tab.value ? "default" : "ghost"}
            size="sm"
            className={cn(
              "h-7 px-3 text-xs whitespace-nowrap",
              filter === tab.value && "shadow-sm"
            )}
            onClick={() => setFilter(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2">
          {/* Loading State */}
          {loading && (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3 p-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && groupedNotifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Bell className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">
                No notifications yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                We'll notify you when something important happens
              </p>
            </div>
          )}

          {/* Notifications List */}
          {!loading && !error && groupedNotifications.length > 0 && (
            <div className="space-y-0.5">
              {groupedNotifications.map((group) => (
                <NotificationGroup
                  key={group.group_key}
                  group={group}
                  onMarkAsRead={markAsRead}
                  onDelete={deleteNotification}
                  onToggleExpand={toggleGroupExpanded}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer - Archive functionality placeholder */}
      {/* TODO: Implement archived notifications view when feature is ready */}
    </div>
  );
};

export default NotificationPanel;
