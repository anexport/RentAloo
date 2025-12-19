import { useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  Search,
  Heart,
  MessageSquare,
  User,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { createMaxWidthQuery } from "@/config/breakpoints";
import { useAuth } from "@/hooks/useAuth";
import { useRoleMode } from "@/contexts/RoleModeContext";
import { getDashboardPath } from "@/lib/user-utils";

type NavItem = {
  to: string;
  icon: typeof Home;
  label: string;
};

const MobileBottomNav = () => {
  const isMobile = useMediaQuery(createMaxWidthQuery("md"));
  const { user } = useAuth();
  const { activeMode } = useRoleMode();
  const location = useLocation();

  const navItems = useMemo<NavItem[]>(() => {
    if (!user) return [];

    const items: NavItem[] = [
      { to: "/", icon: Home, label: "Home" },
      { to: "/explore", icon: Search, label: "Explore" },
    ];

    // Renter: keep quick access to saved items; Owner: jump to dashboard
    if (activeMode === "renter") {
      items.push({
        to: "/renter/dashboard?tab=saved",
        icon: Heart,
        label: "Saved",
      });
    } else {
      items.push({
        to: getDashboardPath(activeMode),
        icon: LayoutDashboard,
        label: "Dashboard",
      });
    }

    items.push({ to: "/messages", icon: MessageSquare, label: "Messages" });
    items.push({ to: "/settings", icon: User, label: "Account" });

    return items;
  }, [activeMode, user]);

  // Only show on mobile for authenticated users
  if (!isMobile || !user) return null;

  // Don't show on specific pages that have their own navigation
  const hideOnPaths = ["/login", "/signup", "/auth"];
  if (hideOnPaths.some((path) => location.pathname.startsWith(path))) {
    return null;
  }

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-md border-t border-border safe-area-pb"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-stretch justify-around h-16">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center justify-center gap-1 text-xs transition-colors",
                "min-h-[44px] active:scale-95",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )
            }
            aria-label={label}
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    "relative flex items-center justify-center w-6 h-6",
                    isActive && "after:absolute after:-bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-primary"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-transform",
                      isActive && "scale-110"
                    )}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </div>
                <span className="font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
