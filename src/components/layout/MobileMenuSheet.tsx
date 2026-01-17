import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Mountain,
  Shield,
  Settings,
  LifeBuoy,
  LogOut,
  ChevronRight,
  X,
  Home,
  Search,
  MessageSquare,
  Heart,
  Moon,
  Sun,
  Globe,
  Check,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  SheetClose,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import RoleSwitcher from "@/components/RoleSwitcher";
import { useAuth } from "@/hooks/useAuth";
import { useVerification } from "@/hooks/useVerification";
import { useRoleMode } from "@/contexts/RoleModeContext";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import { useTheme } from "@/contexts/useTheme";
import { useToast } from "@/hooks/useToast";
import { getUserInitials, getDashboardPath, getInspectionsPath } from "@/lib/user-utils";
import { supabase } from "@/lib/supabase";

// Trust score ring component (simplified from Sidebar)
const TrustScoreRing = ({
  score,
  size = 40,
}: {
  score: number;
  size?: number;
}) => {
  const circumference = 2 * Math.PI * 15;
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
        <circle
          cx="20"
          cy="20"
          r="15"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-muted/30"
        />
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
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <Shield className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
    </div>
  );
};

interface NavLinkProps {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
}

const NavLink = ({ to, icon: Icon, label, badge }: NavLinkProps) => (
  <SheetClose asChild>
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm",
        "text-foreground/80 hover:text-foreground",
        "hover:bg-muted/50 transition-colors"
      )}
    >
      <Icon className="h-[18px] w-[18px] text-muted-foreground" />
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className={cn(
            "flex h-5 min-w-5 items-center justify-center",
            "rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-white"
          )}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      {badge === undefined && (
        <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
      )}
    </Link>
  </SheetClose>
);

// Languages config
const languages = [
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹" },
];

interface MobileMenuSheetProps {
  onLoginClick?: () => void;
  onSignupClick?: () => void;
}

const MobileMenuSheet = ({
  onLoginClick,
  onSignupClick,
}: MobileMenuSheetProps) => {
  const { t, i18n } = useTranslation("navigation");
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile } = useVerification();
  const { activeMode } = useRoleMode();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  // Unread counts for badges
  const { messages: unreadMessages } = useUnreadCounts({
    includeOwnerCounts: activeMode === "owner",
  });

  const trustScore = profile?.trustScore?.overall ?? 0;

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (error) {
        console.error("Sign out error:", error);
        toast({
          variant: "destructive",
          title: t("errors.signout_failed_title", "Sign out failed"),
          description:
            error instanceof Error
              ? error.message
              : t("errors.signout_failed_message", "Please try again"),
        });
        return;
      }
      void navigate("/");
    } catch (error) {
      console.error("Unexpected sign out error:", error);
      toast({
        variant: "destructive",
        title: t("errors.signout_failed_title", "Sign out failed"),
        description: t("errors.signout_failed_message", "Please try again"),
      });
    }
  };

  const handleLanguageChange = async (languageCode: string) => {
    await i18n.changeLanguage(languageCode);
    localStorage.setItem("userLanguagePreference", languageCode);

    if (user) {
      try {
        await supabase.auth.updateUser({
          data: { language_preference: languageCode },
        });
      } catch (err) {
        console.error("Error updating language preference:", err);
      }
    }
  };

  const currentLanguage =
    languages.find((lang) => lang.code === i18n.language) || languages[0];

  const getTrustStatusText = (score: number) => {
    if (score >= 80)
      return t("trustScore.status.excellent", "Excellent standing");
    if (score >= 60) return t("trustScore.status.good", "Good standing");
    if (score >= 40) return t("trustScore.status.building", "Building trust");
    return t("trustScore.status.getVerified", "Get verified");
  };

  // Get user display info
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const displayName =
    user?.user_metadata?.fullName || user?.user_metadata?.full_name || user?.email;
  const initials = getUserInitials(user?.email);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <SheetHeader className="px-4 py-4 border-b border-border/60">
        <div className="flex items-center justify-between">
          <SheetClose asChild>
            <Link to="/" className="flex items-center gap-3">
              <div
                className={cn(
                  "flex items-center justify-center w-9 h-9 rounded-xl",
                  "bg-gradient-to-br from-primary to-primary/80",
                  "shadow-lg shadow-primary/20"
                )}
              >
                <Mountain className="h-[18px] w-[18px] text-primary-foreground" />
              </div>
              <SheetTitle className="text-lg font-semibold">Vaymo</SheetTitle>
            </Link>
          </SheetClose>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
              <X className="h-4 w-4" />
              <span className="sr-only">Close menu</span>
            </Button>
          </SheetClose>
        </div>
      </SheetHeader>

      {user ? (
        <>
          {/* Account Header - Tappable to go to Settings */}
          <SheetClose asChild>
            <Link
              to="/settings"
              className={cn(
                "flex items-center gap-3 px-4 py-4",
                "hover:bg-muted/50 transition-colors"
              )}
            >
              <Avatar className="w-12 h-12 shadow-md ring-2 ring-white/20 dark:ring-white/10">
                <AvatarImage src={avatarUrl} alt={displayName || ""} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 text-white font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {displayName}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <TrustScoreRing score={trustScore} size={20} />
                  <span
                    className={cn(
                      "text-xs font-medium tabular-nums",
                      trustScore >= 80 && "text-trust-excellent",
                      trustScore >= 60 &&
                        trustScore < 80 &&
                        "text-trust-good",
                      trustScore >= 40 &&
                        trustScore < 60 &&
                        "text-trust-fair",
                      trustScore < 40 && "text-trust-low"
                    )}
                  >
                    {trustScore}% {getTrustStatusText(trustScore)}
                  </span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
            </Link>
          </SheetClose>

          {/* Role Switcher */}
          <div className="px-2 pb-2">
            <RoleSwitcher variant="sidebar" />
          </div>

          <Separator />

          {/* Primary Navigation */}
          <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto">
            <NavLink
              to={getDashboardPath(activeMode)}
              icon={Home}
              label={t("sidebar.dashboard", "Dashboard")}
            />
            <NavLink
              to={getInspectionsPath(activeMode)}
              icon={ClipboardCheck}
              label={t("sidebar.inspections", "Inspections")}
            />
            <NavLink
              to="/explore"
              icon={Search}
              label={t("sidebar.browse_equipment", "Browse Equipment")}
            />
            <NavLink
              to="/messages"
              icon={MessageSquare}
              label={t("sidebar.messages", "Messages")}
              badge={unreadMessages}
            />
            <NavLink
              to="/renter/saved"
              icon={Heart}
              label={t("sidebar.watchlist", "Saved")}
            />

            <Separator className="my-2" />

            {/* Secondary Navigation */}
            <NavLink
              to="/settings"
              icon={Settings}
              label={t("sidebar.settings", "Settings")}
            />
            <NavLink
              to="/support"
              icon={LifeBuoy}
              label={t("sidebar.support", "Support")}
            />

            <Separator className="my-2" />

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm",
                "text-foreground/80 hover:text-foreground",
                "hover:bg-muted/50 transition-colors"
              )}
            >
              {theme === "light" ? (
                <Moon className="h-[18px] w-[18px] text-muted-foreground" />
              ) : (
                <Sun className="h-[18px] w-[18px] text-muted-foreground" />
              )}
              <span className="flex-1 text-left">
                {theme === "light"
                  ? t("theme.dark_mode", "Dark Mode")
                  : t("theme.light_mode", "Light Mode")}
              </span>
              <div
                className={cn(
                  "w-10 h-6 rounded-full p-0.5 transition-colors",
                  theme === "dark" ? "bg-primary" : "bg-muted"
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
                    theme === "dark" && "translate-x-4"
                  )}
                />
              </div>
            </button>

            {/* Language Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm",
                    "text-foreground/80 hover:text-foreground",
                    "hover:bg-muted/50 transition-colors"
                  )}
                >
                  <Globe className="h-[18px] w-[18px] text-muted-foreground" />
                  <span className="flex-1 text-left">
                    {currentLanguage.flag} {currentLanguage.nativeName}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {languages.map((language) => (
                  <DropdownMenuItem
                    key={language.code}
                    onClick={() => {
                      void handleLanguageChange(language.code);
                    }}
                    className="flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-lg">{language.flag}</span>
                      <span>{language.nativeName}</span>
                    </span>
                    {currentLanguage.code === language.code && (
                      <Check className="h-4 w-4" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          {/* Sign Out */}
          <div className="mt-auto px-4 py-4 border-t border-border/60">
            <SheetClose asChild>
              <Button
                variant="ghost"
                onClick={() => void handleSignOut()}
                className={cn(
                  "w-full justify-start gap-3 h-11",
                  "text-destructive hover:text-destructive",
                  "hover:bg-destructive/10"
                )}
              >
                <LogOut className="h-[18px] w-[18px]" />
                <span>{t("menu.sign_out", "Sign Out")}</span>
              </Button>
            </SheetClose>
          </div>
        </>
      ) : (
        <>
          {/* Logged Out State */}
          <nav className="flex-1 px-2 py-4 space-y-1">
            <NavLink
              to="/explore"
              icon={Search}
              label={t("sidebar.browse_equipment", "Browse Equipment")}
            />

            <Separator className="my-4" />

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm",
                "text-foreground/80 hover:text-foreground",
                "hover:bg-muted/50 transition-colors"
              )}
            >
              {theme === "light" ? (
                <Moon className="h-[18px] w-[18px] text-muted-foreground" />
              ) : (
                <Sun className="h-[18px] w-[18px] text-muted-foreground" />
              )}
              <span className="flex-1 text-left">
                {theme === "light"
                  ? t("theme.dark_mode", "Dark Mode")
                  : t("theme.light_mode", "Light Mode")}
              </span>
              <div
                className={cn(
                  "w-10 h-6 rounded-full p-0.5 transition-colors",
                  theme === "dark" ? "bg-primary" : "bg-muted"
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
                    theme === "dark" && "translate-x-4"
                  )}
                />
              </div>
            </button>

            {/* Language Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm",
                    "text-foreground/80 hover:text-foreground",
                    "hover:bg-muted/50 transition-colors"
                  )}
                >
                  <Globe className="h-[18px] w-[18px] text-muted-foreground" />
                  <span className="flex-1 text-left">
                    {currentLanguage.flag} {currentLanguage.nativeName}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {languages.map((language) => (
                  <DropdownMenuItem
                    key={language.code}
                    onClick={() => {
                      void handleLanguageChange(language.code);
                    }}
                    className="flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-lg">{language.flag}</span>
                      <span>{language.nativeName}</span>
                    </span>
                    {currentLanguage.code === language.code && (
                      <Check className="h-4 w-4" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          {/* Auth Buttons */}
          <div className="mt-auto px-4 py-4 border-t border-border/60 space-y-2">
            <SheetClose asChild>
              <Button
                variant="outline"
                onClick={() => onLoginClick?.()}
                className="w-full h-11"
              >
                {t("auth.sign_in", "Sign In")}
              </Button>
            </SheetClose>
            <SheetClose asChild>
              <Button onClick={() => onSignupClick?.()} className="w-full h-11">
                {t("auth.get_started", "Get Started")}
              </Button>
            </SheetClose>
          </div>
        </>
      )}
    </div>
  );
};

export default MobileMenuSheet;
