import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Search,
  Heart,
  MessageSquare,
  User,
  Package,
  Calendar,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { createMaxWidthQuery } from "@/config/breakpoints";
import { useAuth } from "@/hooks/useAuth";
import { useRoleMode } from "@/contexts/RoleModeContext";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  hasBadge?: boolean;
  matchPaths?: string[]; // Additional paths that should show this item as active
  isCenter?: boolean; // Flag for the center raised button
}

// Renter-specific navigation items (Explore in center)
const RENTER_NAV_ITEMS: NavItem[] = [
  {
    to: "/renter/dashboard",
    icon: Home,
    label: "Home",
    matchPaths: ["/renter"],
  },
  { to: "/renter/saved", icon: Heart, label: "Saved" },
  { to: "/explore", icon: Search, label: "Explore", isCenter: true },
  { to: "/messages", icon: MessageSquare, label: "Messages", hasBadge: true },
  { to: "/settings", icon: User, label: "Account" },
];

// Owner-specific navigation items (Add Listing in center)
const OWNER_NAV_ITEMS: NavItem[] = [
  {
    to: "/owner/dashboard",
    icon: Home,
    label: "Home",
    matchPaths: ["/owner"],
  },
  {
    to: "/owner/equipment",
    icon: Package,
    label: "Listings",
    matchPaths: ["/owner/equipment"],
  },
  {
    to: "/owner/equipment?action=create",
    icon: Plus,
    label: "Add",
    isCenter: true,
  },
  {
    to: "/owner/bookings",
    icon: Calendar,
    label: "Bookings",
    hasBadge: true,
    matchPaths: ["/owner/bookings"],
  },
  { to: "/messages", icon: MessageSquare, label: "Messages", hasBadge: true },
];

const MobileBottomNav = () => {
  const isMobile = useMediaQuery(createMaxWidthQuery("md"));
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { activeMode } = useRoleMode();

  // Fetch unread/pending counts with real-time updates
  const { messages: unreadMessages, pendingBookings } = useUnreadCounts({
    includeOwnerCounts: activeMode === "owner",
  });

  // Only show on mobile
  if (!isMobile) return null;

  // Don't show on specific pages that have their own navigation
  const hideOnPaths = ["/login", "/signup", "/auth", "/onboarding"];
  if (hideOnPaths.some((path) => location.pathname.startsWith(path))) {
    return null;
  }

  // Select nav items based on active role mode
  // For guests, we default to renter-style layout but will intercept clicks
  const navItems = activeMode === "owner" ? OWNER_NAV_ITEMS : RENTER_NAV_ITEMS;

  const handleItemClick = (e: React.MouseEvent, item: NavItem) => {
    // If user is logged in, let the link work as normal
    if (user) return;

    // For guests, allow public routes
    // Home typically goes to /renter/dashboard in RENTER_NAV_ITEMS
    // We'll handle the "Home" redirect in the effect or render logic below,
    // but here we just need to gate the protected ones.

    // Public paths for guests:
    // - Explore (/explore)
    // - Home (we'll remap /renter/dashboard to / visually, but if they click it we want to go home)

    const isPublic = item.to === "/explore";
    const isHome = item.label === "Home";

    if (isPublic) return;

    if (isHome) {
      e.preventDefault();
      void navigate("/");
      return;
    }

    // specific check for "Account" -> redirect to login with no special message needed
    // others -> redirect to login
    e.preventDefault();
    void navigate("/login");
  };

  // Helper to get badge count for an item
  const getBadgeCount = (item: NavItem): number => {
    if (!item.hasBadge || !user) return 0;
    if (item.to === "/messages") return unreadMessages;
    if (item.to === "/owner/bookings") return pendingBookings;
    return 0;
  };

  // Helper to check if a nav item should be active
  const isItemActive = (item: NavItem, currentPath: string): boolean => {
    // Exact match takes priority
    if (currentPath === item.to) return true;

    // If another nav item has an exact match for the current path, don't activate via prefix
    const hasExactMatchElsewhere = navItems.some(
      (other) => other !== item && currentPath === other.to
    );
    if (hasExactMatchElsewhere) return false;

    // Check additional match paths (for nested routes)
    if (item.matchPaths) {
      return item.matchPaths.some((path) => {
        // For dashboard paths, only match exact or with query params
        if (path.endsWith("/dashboard")) {
          return currentPath === path || currentPath.startsWith(path + "?");
        }
        // For other paths, match prefix
        return currentPath.startsWith(path);
      });
    }

    return false;
  };

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 safe-area-pb"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Background fills - left and right sections with top border */}
      <div className="absolute inset-0 bg-background/95 backdrop-blur-md" />

      {/* Top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-border" />

      {/* Center notch cutout effect - layered for smooth blending */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-[26px] w-[72px] h-[72px]">
        {/* Outer glow/shadow for depth */}
        <div className="absolute inset-0 rounded-full bg-background shadow-[0_-4px_12px_-2px_rgba(0,0,0,0.08)]" />
        {/* Inner fill matching nav background */}
        <div className="absolute inset-[1px] rounded-full bg-background/95 backdrop-blur-md" />
        {/* Subtle inner border for definition */}
        <div className="absolute inset-0 rounded-full border border-border/30" />
      </div>

      <div className="relative flex items-end justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const badgeCount = getBadgeCount(item);
          const isActive = isItemActive(item, location.pathname);

          // Center raised button
          if (item.isCenter) {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className="flex flex-col items-center z-10 pb-1"
                style={{ marginTop: "-26px" }}
                aria-label={item.label}
                onClick={(e) => handleItemClick(e, item)}
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-14 h-14 rounded-full transition-all duration-200",
                    "active:scale-95",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                      : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                  )}
                >
                  <Icon className="h-6 w-6" strokeWidth={2.5} />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-semibold mt-1",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </NavLink>
            );
          }

          // Regular nav items
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 text-xs transition-colors pb-1",
                "min-h-[44px] active:scale-95",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={item.label}
              onClick={(e) => handleItemClick(e, item)}
            >
              <div
                className={cn(
                  "relative flex items-center justify-center w-6 h-6",
                  isActive &&
                    "after:absolute after:-bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-primary"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-transform",
                    isActive && "scale-110"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {/* Badge */}
                {badgeCount > 0 && (
                  <span
                    className={cn(
                      "absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center",
                      "rounded-full bg-destructive px-1 text-[10px] font-semibold text-white",
                      "shadow-sm"
                    )}
                  >
                    {badgeCount > 9 ? "9+" : badgeCount}
                  </span>
                )}
              </div>
              <span className="font-medium">
                {!user && item.label === "Account" ? "Log in" : item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
