import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Menu,
  Mountain,
  Map,
  Settings,
  LogOut,
  MessageSquare,
  Shield,
  LayoutDashboard,
  Globe,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRoleMode } from "@/contexts/RoleModeContext";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSelector from "@/components/LanguageSelector";
import UserMenu from "@/components/UserMenu";
import NotificationBell from "@/components/notifications/NotificationBell";
import { toast } from "@/hooks/useToast";
import { getUserInitials, getDashboardPath } from "@/lib/user-utils";
import { useAdminAccess } from "@/hooks/useAdminAccess";

type ExploreHeaderProps = {
  scrolled?: boolean;
  onLoginClick?: () => void;
  onSignupClick?: () => void;
};

const ExploreHeader = ({
  scrolled: controlledScrolled,
  onLoginClick,
  onSignupClick,
}: ExploreHeaderProps) => {
  const { t } = useTranslation("navigation");
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, signOut } = useAuth();
  const { activeMode } = useRoleMode();
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminAccess();

  useEffect(() => {
    if (controlledScrolled !== undefined) return;

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [controlledScrolled]);

  const scrolled =
    controlledScrolled !== undefined ? controlledScrolled : isScrolled;

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (error) {
        console.error("Sign out error:", error);
        toast({
          title: t("errors.signout_failed_title"),
          description: error.message || t("errors.signout_failed_message"),
          variant: "destructive",
        });
        return;
      }
      void navigate("/");
    } catch (err) {
      console.error("Unexpected sign out error:", err);
      const message =
        err instanceof Error ? err.message : t("errors.signout_failed_message");
      toast({
        title: t("errors.signout_failed_title"),
        description: message,
        variant: "destructive",
      });
    }
  };

  const roleLabel = isAdmin
    ? t("user_role.admin")
    : activeMode === "owner"
      ? t("user_role.equipment_owner")
      : t("user_role.renter");

  return (
    <header
      className={`sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-200 ${
        scrolled ? "shadow-sm" : ""
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Mountain className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-foreground">Vaymo</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/explore" className="flex items-center">
                    <Map className="mr-2 h-4 w-4" />
                    {t("menu.browse_equipment")}
                  </Link>
                </Button>
                <NotificationBell />
                <UserMenu />
              </>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/explore" className="flex items-center">
                    <Map className="mr-2 h-4 w-4" />
                    {t("menu.browse_equipment")}
                  </Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("menu.settings")}
                    >
                      <Settings className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <ThemeToggle variant="menu-item" />
                    <LanguageSelector variant="menu-item" />
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" onClick={() => onLoginClick?.()}>
                  {t("auth.sign_in")}
                </Button>
                <Button onClick={() => onSignupClick?.()}>{t("auth.get_started")}</Button>
              </>
            )}
          </div>

          {/* Mobile Navigation */}
          <div className="flex md:hidden items-center space-x-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t("aria.open_menu")}>
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>{t("common:navigation.menu")}</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col space-y-4 mt-6">
                  {user ? (
                    <>
                      {/* User Info - matching UserMenu styling */}
                      <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-10 h-10 shadow-md ring-2 ring-white/20 dark:ring-white/10">
                            <AvatarImage
                              src={user.user_metadata?.avatar_url as string | undefined}
                              alt={user.user_metadata?.fullName || user.email || ""}
                            />
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 text-white font-semibold text-sm">
                              {getUserInitials(user.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="text-sm">
                            <div className="font-semibold text-foreground truncate">
                              {user.user_metadata?.fullName || user.email}
                            </div>
                            <div className="text-xs text-gray-500 truncate mt-0.5">
                              {roleLabel}
                            </div>
                          </div>
                        </div>
                        <NotificationBell />
                      </div>

                      {/* Navigation Items */}
                      <Button variant="ghost" className="justify-start" asChild>
                        <Link to={getDashboardPath(activeMode)}>
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          {t("menu.dashboard")}
                        </Link>
                      </Button>
                      <Button variant="ghost" className="justify-start" asChild>
                        <Link to="/explore">
                          <Map className="mr-2 h-4 w-4" />
                          {t("menu.browse_equipment")}
                        </Link>
                      </Button>
                      <Button variant="ghost" className="justify-start" asChild>
                        <Link to="/messages">
                          <MessageSquare className="mr-2 h-4 w-4" />
                          {t("menu.messages")}
                        </Link>
                      </Button>
                      <Button variant="ghost" className="justify-start" asChild>
                        <Link to="/verification">
                          <Shield className="mr-2 h-4 w-4" />
                          {t("menu.verification")}
                        </Link>
                      </Button>
                      <Button variant="ghost" className="justify-start" asChild>
                        <Link to="/settings">
                          <Settings className="mr-2 h-4 w-4" />
                          {t("menu.settings")}
                        </Link>
                      </Button>

                      {/* Theme and Language */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="justify-start">
                            <Globe className="mr-2 h-4 w-4" />
                            {t("menu.preferences")}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56">
                          <ThemeToggle variant="menu-item" />
                          <LanguageSelector variant="menu-item" />
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Sign Out */}
                      <Button
                        variant="ghost"
                        className="justify-start text-red-600 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-400 dark:hover:bg-red-950"
                        onClick={() => {
                          void handleSignOut();
                        }}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        {t("menu.sign_out")}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" className="justify-start" asChild>
                        <Link to="/explore">
                          <Map className="mr-2 h-4 w-4" />
                          {t("menu.browse_equipment")}
                        </Link>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="justify-start">
                            <Globe className="mr-2 h-4 w-4" />
                            {t("menu.preferences")}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56">
                          <ThemeToggle variant="menu-item" />
                          <LanguageSelector variant="menu-item" />
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        variant="ghost"
                        className="justify-start"
                        onClick={() => onLoginClick?.()}
                      >
                        {t("auth.sign_in")}
                      </Button>
                      <Button
                        className="justify-start"
                        onClick={() => onSignupClick?.()}
                      >
                        {t("auth.get_started")}
                      </Button>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};

export default ExploreHeader;
