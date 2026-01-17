import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface InspectionActionBarProps {
  showBack?: boolean;
  backLabel?: string;
  primaryLabel: string;
  primaryIcon?: React.ReactNode;
  onBack?: () => void;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  isLoading?: boolean;
  loadingLabel?: string;
  primaryVariant?: "default" | "success";
  className?: string;
}

export default function InspectionActionBar({
  showBack = true,
  backLabel = "Back",
  primaryLabel,
  primaryIcon,
  onBack,
  onPrimary,
  primaryDisabled = false,
  isLoading = false,
  loadingLabel = "Loading...",
  primaryVariant = "default",
  className,
}: InspectionActionBarProps) {
  return (
    <div
      className={cn(
        // Position above MobileBottomNav (h-16 = 64px) on mobile, at bottom on desktop
        "fixed left-0 right-0 z-40 bottom-16 md:bottom-0",
        "p-3 bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/80 border-t",
        className
      )}
    >
      <div className="max-w-2xl mx-auto flex gap-2">
        {showBack && onBack && (
          <Button
            variant="outline"
            onClick={onBack}
            disabled={isLoading}
            className="h-10"
            aria-label={`Go back: ${backLabel}`}
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            {backLabel}
          </Button>
        )}
        <Button
          onClick={onPrimary}
          disabled={primaryDisabled || isLoading}
          className={cn(
            "flex-1 h-11 font-medium text-sm",
            primaryVariant === "success" &&
              "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          )}
          aria-label={primaryLabel}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              {loadingLabel}
            </>
          ) : (
            <>
              {primaryIcon && <span className="mr-1.5">{primaryIcon}</span>}
              {primaryLabel}
            </>
          )}
        </Button>
      </div>
      {/* Safe area padding for iOS home indicator */}
      <div className="h-[env(safe-area-inset-bottom)] md:hidden" />
    </div>
  );
}
