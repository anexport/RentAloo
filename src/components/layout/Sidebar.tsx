import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Home,
  Search,
  Calendar,
  MessageSquare,
  User,
  Shield,
  Mountain,
  ChevronLeft,
  ChevronRight,
  Package,
  CreditCard,
  Heart,
  LifeBuoy,
  PiggyBank,
  ListChecks,
  Star,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useVerification } from "@/hooks/useVerification";
import { useAuth } from "@/hooks/useAuth";
import { useRoleMode } from "@/contexts/RoleModeContext";
import { useCallback, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import RoleSwitcher from "@/components/RoleSwitcher";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: number;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

// Trust score ring component
const TrustScoreRing = ({
  score,
  size = 40,
}: {
  score: number;
  size?: number;
}) => {
  const circumference = 2 * Math.PI * 15; // radius = 15
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getScoreColor = (s: number) => {
    if (s >= 80) return "var(--trust-excellent)";
    if (s >= 60) return "var(--trust-good)";
    if (s >= 40) return "var(--trust-fair)";
    return "var(--trust-low)";
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        className="transform -rotate-90"
      >
        {/* Background ring */}
        <circle
          cx="20"
          cy="20"
          r="15"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-muted/30"
        />
        {/* Progress ring */}
        <circle
          cx="20"
          cy="20"
          r="15"
          fill="none"
          stroke={getScoreColor(score)}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="animate-trust-ring transition-all duration-500"
          style={
            {
              "--trust-offset": strokeDashoffset,
            } as React.CSSProperties
          }
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Shield className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
    </div>
  );
};

const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const { t } = useTranslation("navigation");
  const location = useLocation();
  const { profile } = useVerification();
  const trustScore = profile?.trustScore?.overall ?? 0;
  const { user } = useAuth();
  const { activeMode } = useRoleMode();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const userId = user?.id;

  const { data: equipmentStatus } = useQuery({
    queryKey: ["sidebar", "equipment-status", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { count, error: countError } = await supabase
        .from("equipment")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", userId as string);
      if (countError) throw countError;

      const hasEquipment = (count || 0) > 0;
      return { hasEquipment };
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: activeOwnerBookingsData } = useQuery({
    queryKey: ["sidebar", "active-owner-bookings", userId],
    enabled: !!userId && !!equipmentStatus?.hasEquipment,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("booking_requests")
        .select("id, equipment:equipment_id!inner(owner_id)", {
          count: "exact",
          head: true,
        })
        .eq("equipment.owner_id", userId as string)
        .eq("status", "approved");
      if (error) throw error;
      return count || 0;
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: unreadMessagesData, refetch: refetchUnreadMessages } = useQuery(
    {
      queryKey: ["sidebar", "unread-messages", userId],
      enabled: !!userId,
      queryFn: async () => {
        const { data, error } = await supabase.rpc("get_unread_messages_count");
        if (error) {
          console.error("Failed to fetch unread messages count:", error);
          return 0;
        }
        const count = typeof data === "number" ? data : 0;
        return count;
      },
      staleTime: 1000 * 30,
    }
  );

  const { data: supportTickets } = useQuery({
    queryKey: ["sidebar", "support-tickets", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("damage_claims")
        .select("*", { count: "exact", head: true })
        .eq("filed_by", userId as string)
        .in("status", ["pending", "disputed", "escalated"]);
      if (error) throw error;
      return count || 0;
    },
    staleTime: 1000 * 60,
  });

  const { data: pendingPayoutsCount } = useQuery({
    queryKey: ["sidebar", "pending-payouts", userId],
    enabled: !!userId && !!equipmentStatus?.hasEquipment,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("payments")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", userId as string)
        .or("payout_status.eq.pending,payout_status.is.null");
      if (error) throw error;
      return count || 0;
    },
    staleTime: 1000 * 60,
  });

  useEffect(() => {
    if (!userId) {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const setupSubscriptions = async () => {
      const { data: participants, error: participantsError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("profile_id", userId);

      if (participantsError) {
        console.error("Failed to fetch conversations:", participantsError);
        return null;
      }

      if (!participants || participants.length === 0) {
        return null;
      }

      const conversationIds = participants.map((p) => p.conversation_id);
      const channel = supabase.channel(`sidebar-messages-${userId}`);

      conversationIds.forEach((conversationId) => {
        channel.on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            if (payload.new?.sender_id === userId) return;
            void refetchUnreadMessages();
          }
        );
      });

      channel.subscribe();
      return channel;
    };

    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    void setupSubscriptions().then((ch) => {
      channelRef.current = ch;
    });

    return () => {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, refetchUnreadMessages]);

  const isActive = useCallback(
    (href: string): boolean => {
      const currentParams = new URLSearchParams(location.search);
      const currentTab = currentParams.get("tab");

      const [hrefPath, hrefSearch = ""] = href.split("?");
      const hrefTab = hrefSearch
        ? new URLSearchParams(hrefSearch).get("tab")
        : null;

      const isDashboardPath =
        hrefPath === "/renter/dashboard" || hrefPath === "/owner/dashboard";

      if (isDashboardPath && !hrefSearch) {
        return (
          location.pathname === hrefPath &&
          (currentTab === null || currentTab === "overview")
        );
      }

      if (isDashboardPath && hrefTab) {
        return location.pathname === hrefPath && currentTab === hrefTab;
      }

      return (
        location.pathname === href ||
        location.pathname + location.search === href
      );
    },
    [location.pathname, location.search]
  );

  const activeOwnerBookings = activeOwnerBookingsData ?? 0;
  const unreadMessages = unreadMessagesData ?? 0;
  const openSupportTickets = supportTickets ?? 0;
  const pendingPayouts = pendingPayoutsCount ?? 0;

  // Navigation sections based on active mode
  const navSections: NavSection[] = useMemo(() => {
    const renterSections: NavSection[] = [
      {
        items: [
          {
            label: t("sidebar.dashboard"),
            icon: Home,
            href: "/renter/dashboard",
          },
          {
            label: t("sidebar.browse_equipment"),
            icon: Search,
            href: "/equipment",
          },
          { label: t("sidebar.watchlist"), icon: Heart, href: "/renter/saved" },
        ],
      },
      {
        title: t("sidebar.activity"),
        items: [
          {
            label: t("sidebar.my_bookings"),
            icon: Calendar,
            href: "/renter/bookings",
          },
          {
            label: t("sidebar.messages"),
            icon: MessageSquare,
            href: "/messages",
            ...(unreadMessages > 0 && { badge: unreadMessages }),
          },
          {
            label: t("sidebar.payments"),
            icon: CreditCard,
            href: "/renter/payments",
          },
        ],
      },
      {
        items: [
          {
            label: t("sidebar.support"),
            icon: LifeBuoy,
            href: "/support",
            ...(openSupportTickets > 0 && { badge: openSupportTickets }),
          },
          { label: t("sidebar.settings"), icon: User, href: "/settings" },
        ],
      },
    ];

    const ownerSections: NavSection[] = [
      {
        items: [
          {
            label: t("sidebar.dashboard"),
            icon: Home,
            href: "/owner/dashboard",
          },
          {
            label: t("sidebar.my_equipment_listings"),
            icon: Package,
            href: "/owner/equipment",
          },
        ],
      },
      {
        title: t("sidebar.activity"),
        items: [
          {
            label: t("sidebar.active_bookings"),
            icon: ListChecks,
            href: "/owner/bookings",
            ...(activeOwnerBookings > 0 && { badge: activeOwnerBookings }),
          },
          {
            label: t("sidebar.messages"),
            icon: MessageSquare,
            href: "/messages",
            ...(unreadMessages > 0 && { badge: unreadMessages }),
          },
          { label: t("sidebar.reviews"), icon: Star, href: "/owner/reviews" },
          {
            label: t("sidebar.payouts"),
            icon: PiggyBank,
            href: "/owner/payments",
            ...(pendingPayouts > 0 && { badge: pendingPayouts }),
          },
        ],
      },
      {
        items: [
          {
            label: t("sidebar.support"),
            icon: LifeBuoy,
            href: "/support",
            ...(openSupportTickets > 0 && { badge: openSupportTickets }),
          },
          { label: t("sidebar.settings"), icon: User, href: "/settings" },
        ],
      },
    ];

    return activeMode === "owner" ? ownerSections : renterSections;
  }, [
    activeMode,
    t,
    unreadMessages,
    openSupportTickets,
    activeOwnerBookings,
    pendingPayouts,
  ]);

  // Flatten items for animation indexing
  const allItems = navSections.flatMap((s) => s.items);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen transition-all duration-300 ease-out",
        "border-r border-sidebar-border/60",
        // Layered gradient background
        "bg-gradient-to-b from-sidebar via-sidebar to-sidebar/95",
        // Subtle inner shadow for depth
        "shadow-[inset_-1px_0_0_0_rgba(255,255,255,0.03)]",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Subtle gradient overlay for premium feel */}
      <div className="absolute inset-0 bg-gradient-to-br from-sidebar-primary/[0.02] via-transparent to-transparent pointer-events-none" />

      <div className="relative flex h-full flex-col">
        {/* Header */}
        <div
          className={cn(
            "flex h-16 items-center border-b border-sidebar-border/40",
            collapsed ? "justify-center px-2" : "justify-between px-4"
          )}
        >
          <Link
            to="/"
            className={cn(
              "group flex items-center gap-3 rounded-xl transition-all duration-200",
              "hover:scale-[1.02] active:scale-[0.98]",
              collapsed && "mx-auto"
            )}
          >
            {/* Logo with gradient and glow */}
            <div
              className={cn(
                "relative flex items-center justify-center w-9 h-9 rounded-xl",
                "bg-gradient-to-br from-sidebar-primary to-sidebar-primary/80",
                "shadow-lg shadow-sidebar-primary/20",
                "animate-logo-glow transition-all duration-300",
                "group-hover:shadow-sidebar-primary/40 group-hover:shadow-xl"
              )}
            >
              <Mountain className="h-[18px] w-[18px] text-sidebar-primary-foreground" />
              <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-sidebar-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            {!collapsed && (
              <span className="text-lg font-semibold text-sidebar-foreground tracking-tight">
                Vaymo
              </span>
            )}
          </Link>

          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className={cn(
                "h-8 w-8 rounded-lg",
                "text-sidebar-foreground/60 hover:text-sidebar-foreground",
                "hover:bg-sidebar-accent/50",
                "transition-all duration-200"
              )}
              aria-label={t("aria.collapse_sidebar")}
            >
              <ChevronLeft className="h-4 w-4 animate-chevron-bounce" />
            </Button>
          )}
        </div>

        {/* Role Switcher */}
        <div className={cn("px-3 py-3", collapsed && "px-2")}>
          <RoleSwitcher collapsed={collapsed} variant="sidebar" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-1 scrollbar-hide">
          <div className="space-y-6">
            {navSections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="space-y-1">
                {/* Section title */}
                {section.title && !collapsed && (
                  <div className="px-3 py-2">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/40">
                      {section.title}
                    </span>
                  </div>
                )}
                {section.title && collapsed && (
                  <div className="flex justify-center py-2">
                    <div className="h-px w-6 bg-sidebar-border/60 rounded-full" />
                  </div>
                )}

                {/* Section items */}
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  const itemIndex = allItems.findIndex(
                    (i) => i.href === item.href
                  );

                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
                        "animate-sidebar-item",
                        active
                          ? [
                              "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                              "shadow-sm",
                            ]
                          : [
                              "text-sidebar-foreground/70",
                              "hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                            ],
                        collapsed && "justify-center px-2"
                      )}
                      style={{
                        animationDelay: `${itemIndex * 30}ms`,
                      }}
                      title={collapsed ? item.label : undefined}
                    >
                      {/* Active indicator bar */}
                      {active && (
                        <div
                          className={cn(
                            "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full",
                            "bg-sidebar-primary",
                            "animate-active-indicator"
                          )}
                        />
                      )}

                      {/* Icon with hover animation */}
                      <div
                        className={cn(
                          "relative shrink-0",
                          collapsed && "relative"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-[18px] w-[18px] transition-transform duration-200",
                            "group-hover:scale-110",
                            active && "text-sidebar-primary"
                          )}
                        />

                        {/* Badge for collapsed state */}
                        {collapsed && item.badge && item.badge > 0 && (
                          <span
                            className={cn(
                              "absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center",
                              "rounded-full bg-destructive px-1 text-[9px] font-semibold text-white",
                              "shadow-lg shadow-destructive/30",
                              "animate-badge-pulse"
                            )}
                          >
                            {item.badge > 9 ? "9+" : item.badge}
                          </span>
                        )}
                      </div>

                      {/* Label and expanded badge */}
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.badge && item.badge > 0 && (
                            <span
                              className={cn(
                                "flex h-5 min-w-5 items-center justify-center",
                                "rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-white",
                                "shadow-md shadow-destructive/25",
                                "animate-badge-pulse"
                              )}
                            >
                              {item.badge > 99 ? "99+" : item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </nav>

        {/* Bottom section */}
        <div
          className={cn(
            "mt-auto border-t border-sidebar-border/40 p-3",
            "bg-gradient-to-t from-sidebar-accent/30 to-transparent"
          )}
        >
          {/* Collapsed expand button */}
          {collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className={cn(
                "w-full h-9 rounded-lg",
                "text-sidebar-foreground/60 hover:text-sidebar-foreground",
                "hover:bg-sidebar-accent/50",
                "transition-all duration-200"
              )}
              aria-label={t("aria.expand_sidebar")}
            >
              <ChevronRight className="h-4 w-4 animate-chevron-bounce" />
            </Button>
          )}

          {/* Trust score card */}
          {!collapsed && profile && (
            <Link
              to="/verification"
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5",
                "bg-sidebar-accent/40 hover:bg-sidebar-accent/60",
                "border border-sidebar-border/30 hover:border-sidebar-border/50",
                "transition-all duration-200",
                "hover:shadow-md hover:shadow-black/5"
              )}
            >
              {/* Trust score ring */}
              <TrustScoreRing score={trustScore} size={36} />

              {/* Trust info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-sidebar-foreground/60">
                    {t("trustScore.label", { defaultValue: "Trust Score" })}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      trustScore >= 80 && "text-[color:var(--trust-excellent)]",
                      trustScore >= 60 &&
                        trustScore < 80 &&
                        "text-[color:var(--trust-good)]",
                      trustScore >= 40 &&
                        trustScore < 60 &&
                        "text-[color:var(--trust-fair)]",
                      trustScore < 40 && "text-[color:var(--trust-low)]"
                    )}
                  >
                    {trustScore}%
                  </span>
                </div>
                <p className="text-[10px] text-sidebar-foreground/40 mt-0.5 truncate">
                  {trustScore >= 80
                    ? t("trustScore.status.excellent", {
                        defaultValue: "Excellent standing",
                      })
                    : trustScore >= 60
                    ? t("trustScore.status.good", {
                        defaultValue: "Good standing",
                      })
                    : trustScore >= 40
                    ? t("trustScore.status.building", {
                        defaultValue: "Building trust",
                      })
                    : t("trustScore.status.getVerified", {
                        defaultValue: "Get verified",
                      })}
                </p>
              </div>

              {/* Hover indicator */}
              <ChevronRight className="h-3.5 w-3.5 text-sidebar-foreground/30 group-hover:text-sidebar-foreground/60 group-hover:translate-x-0.5 transition-all" />
            </Link>
          )}

          {/* Collapsed trust indicator */}
          {collapsed && profile && (
            <Link
              to="/verification"
              className={cn(
                "flex justify-center mt-2 py-2",
                "hover:opacity-80 transition-opacity"
              )}
              title={`Trust Score: ${trustScore}%`}
            >
              <TrustScoreRing score={trustScore} size={32} />
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
