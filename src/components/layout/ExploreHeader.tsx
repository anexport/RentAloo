import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu, Mountain, Map, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSelector from "@/components/LanguageSelector";
import UserMenu from "@/components/UserMenu";
import NotificationBell from "@/components/notifications/NotificationBell";
import MobileMenuSheet from "./MobileMenuSheet";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();

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

  return (
    <header
      className={`sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 transition-all duration-200 ${
        scrolled ? "shadow-sm" : ""
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Mobile Menu Button - Left side */}
          <div className="flex md:hidden items-center">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("aria.open_menu")}
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0" hideCloseButton>
                <MobileMenuSheet
                  onLoginClick={() => {
                    setMobileMenuOpen(false);
                    onLoginClick?.();
                  }}
                  onSignupClick={() => {
                    setMobileMenuOpen(false);
                    onSignupClick?.();
                  }}
                />
              </SheetContent>
            </Sheet>
          </div>

          {/* Logo - Center on mobile, left on desktop */}
          <Link
            to="/"
            className="flex items-center space-x-2 md:flex-none absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0"
          >
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
                <Button onClick={() => onSignupClick?.()}>
                  {t("auth.get_started")}
                </Button>
              </>
            )}
          </div>

          {/* Mobile Right Side - Notification Bell for logged in users */}
          <div className="flex md:hidden items-center">
            {user && <NotificationBell />}
            {!user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onLoginClick?.()}
                className="text-sm"
              >
                {t("auth.sign_in")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default ExploreHeader;
