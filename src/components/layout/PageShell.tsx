import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface PageShellProps {
  children: React.ReactNode;
  /** Page title */
  title?: string;
  /** Page description/subtitle */
  description?: string;
  /** Optional icon to display next to title */
  icon?: LucideIcon;
  /** Icon color class (e.g., "text-emerald-500") */
  iconColor?: string;
  /** Action element (button, etc.) to display in header */
  action?: React.ReactNode;
  /** Additional className for the container */
  className?: string;
  /** Whether to show the header section */
  showHeader?: boolean;
  /** Custom header content (replaces default title/description) */
  customHeader?: React.ReactNode;
}

/**
 * PageShell - Unified page container for consistent layout across all dashboard pages
 *
 * Provides:
 * - Consistent spacing and animation
 * - Standard header with title, description, icon, and action
 * - Smooth page entrance animation
 */
const PageShell = ({
  children,
  title,
  description,
  icon: Icon,
  iconColor = "text-primary",
  action,
  className,
  showHeader = true,
  customHeader,
}: PageShellProps) => {
  return (
    <div
      className={cn(
        "space-y-6 animate-page-enter",
        className
      )}
    >
      {/* Page Header */}
      {showHeader && (customHeader || title) && (
        <header className="page-header">
          {customHeader ? (
            customHeader
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  {Icon && (
                    <div className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-xl",
                      "bg-gradient-to-br from-muted/80 to-muted",
                      "ring-1 ring-border/50"
                    )}>
                      <Icon className={cn("h-5 w-5", iconColor)} aria-hidden="true" />
                    </div>
                  )}
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                      {title}
                    </h1>
                    {description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              {action && (
                <div className="flex-shrink-0">
                  {action}
                </div>
              )}
            </div>
          )}
        </header>
      )}

      {/* Page Content */}
      <div className="page-content">
        {children}
      </div>
    </div>
  );
};

export default PageShell;
