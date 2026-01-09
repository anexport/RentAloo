import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Mountain, Shield, Settings, LifeBuoy, LogOut, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SheetClose, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import RoleSwitcher from "@/components/RoleSwitcher";
import { useAuth } from "@/hooks/useAuth";
import { useVerification } from "@/hooks/useVerification";
import { useToast } from "@/hooks/useToast";

// Trust score ring component (simplified from Sidebar)
const TrustScoreRing = ({ score, size = 40 }: { score: number; size?: number }) => {
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

interface QuickLinkProps {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
}

const QuickLink = ({ to, icon: Icon, label, onClick }: QuickLinkProps) => (
  <SheetClose asChild>
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm",
        "text-foreground/80 hover:text-foreground",
        "hover:bg-muted/50 transition-colors"
      )}
    >
      <Icon className="h-[18px] w-[18px] text-muted-foreground" />
      <span className="flex-1">{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
    </Link>
  </SheetClose>
);

const MobileMenuSheet = () => {
  const { t } = useTranslation("navigation");
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { profile } = useVerification();
  const { toast } = useToast();

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

  const getTrustStatusText = (score: number) => {
    if (score >= 80) return t("trustScore.status.excellent", "Excellent standing");
    if (score >= 60) return t("trustScore.status.good", "Good standing");
    if (score >= 40) return t("trustScore.status.building", "Building trust");
    return t("trustScore.status.getVerified", "Get verified");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <SheetHeader className="px-4 py-4 border-b border-border/60">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className={cn(
              "flex items-center justify-center w-9 h-9 rounded-xl",
              "bg-linear-to-br from-primary to-primary/80",
              "shadow-lg shadow-primary/20"
            )}>
              <Mountain className="h-[18px] w-[18px] text-primary-foreground" />
            </div>
            <SheetTitle className="text-lg font-semibold">Vaymo</SheetTitle>
          </Link>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
              <X className="h-4 w-4" />
              <span className="sr-only">Close menu</span>
            </Button>
          </SheetClose>
        </div>
      </SheetHeader>

      {/* Role Switcher */}
      <div className="px-2 py-3">
        <RoleSwitcher variant="sidebar" />
      </div>

      {/* Trust Score Card */}
      {profile && (
        <div className="px-4 py-2">
          <SheetClose asChild>
            <Link
              to="/verification"
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-3",
                "bg-muted/40 hover:bg-muted/60",
                "border border-border/30 hover:border-border/50",
                "transition-all duration-200"
              )}
            >
              <TrustScoreRing score={trustScore} size={40} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("trustScore.label", "Trust Score")}
                  </span>
                  <span className={cn(
                    "text-sm font-semibold tabular-nums",
                    trustScore >= 80 && "text-trust-excellent",
                    trustScore >= 60 && trustScore < 80 && "text-trust-good",
                    trustScore >= 40 && trustScore < 60 && "text-trust-fair",
                    trustScore < 40 && "text-trust-low"
                  )}>
                    {trustScore}%
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  {getTrustStatusText(trustScore)}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
            </Link>
          </SheetClose>
        </div>
      )}

      {/* Quick Links */}
      <nav className="flex-1 px-2 py-2 space-y-1">
        <QuickLink
          to="/settings"
          icon={Settings}
          label={t("sidebar.settings", "Settings")}
        />
        <QuickLink
          to="/support"
          icon={LifeBuoy}
          label={t("sidebar.support", "Support")}
        />
      </nav>

      {/* Logout */}
      <div className="mt-auto px-4 py-4 border-t border-border/60">
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
      </div>
    </div>
  );
};

export default MobileMenuSheet;
