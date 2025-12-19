import { useState } from "react";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import Sidebar from "./Sidebar";
import UserMenu from "@/components/UserMenu";
import BreadcrumbNav from "./BreadcrumbNav";
import RoleSwitcher from "@/components/RoleSwitcher";
import NotificationBell from "@/components/notifications/NotificationBell";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar collapsed={sidebarCollapsed} onToggle={handleToggleSidebar} />
      </div>

      {/* Mobile Header - Reduced height for more content space */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex h-full items-center justify-between gap-2 px-4">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <Sidebar collapsed={false} onToggle={() => setMobileMenuOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2 flex-1 justify-end">
            <RoleSwitcher variant="header" />
            <NotificationBell />
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        className={cn(
          "transition-all duration-300",
          "pt-14 md:pt-0",
          sidebarCollapsed ? "md:pl-16" : "md:pl-64"
        )}
      >
        {/* Top Bar - Desktop Only */}
        <div className="hidden md:block sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <div className="flex h-16 items-center justify-end gap-2 px-6">
            <NotificationBell />
            <UserMenu />
          </div>
        </div>

        {/* Content Area - pb-20 accounts for mobile bottom nav + safe area */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8">
          {/* Breadcrumb Navigation */}
          <div className="mb-4">
            <BreadcrumbNav />
          </div>
          
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;

