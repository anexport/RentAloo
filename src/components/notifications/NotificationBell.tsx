import { useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import NotificationPanel from "@/components/notifications/NotificationPanel";
import { useNotifications } from "@/hooks/useNotifications";

// ============================================================================
// PROPS
// ============================================================================

type NotificationBellProps = {
  className?: string;
};

// ============================================================================
// COMPONENT
// ============================================================================

const NotificationBell = ({ className }: NotificationBellProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const notifications = useNotifications();
  const { unreadCount } = notifications;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative", className)}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <Bell className="h-5 w-5" />
          
          {/* Unread badge */}
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 flex items-center justify-center",
                "min-w-[18px] h-[18px] px-1 rounded-full",
                "bg-primary text-primary-foreground text-[10px] font-semibold",
                "border-2 border-background",
                "animate-in zoom-in-50 duration-200"
              )}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-auto p-0 shadow-lg border rounded-xl overflow-hidden"
      >
        <NotificationPanel notifications={notifications} />
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
