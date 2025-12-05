import { Shield, Mail, Phone, MapPin, type LucideIcon } from "lucide-react";
import VerificationBadge from "./VerificationBadge";
import type { UserVerificationProfile, VerificationStatus } from "@/types/verification";
import { cn } from "@/lib/utils";

type VerificationItem = {
  key: keyof Pick<UserVerificationProfile, "identityVerified" | "emailVerified" | "phoneVerified" | "addressVerified">;
  label: string;
  icon: LucideIcon;
};

const VERIFICATION_ITEMS: VerificationItem[] = [
  { key: "identityVerified", label: "Identity", icon: Shield },
  { key: "emailVerified", label: "Email", icon: Mail },
  { key: "phoneVerified", label: "Phone", icon: Phone },
  { key: "addressVerified", label: "Address", icon: MapPin },
];

type VerificationStatusGridProps = {
  profile: UserVerificationProfile;
  /** Compact mode hides labels on badges */
  compact?: boolean;
  /** Interactive mode adds hover effects and click handlers */
  interactive?: boolean;
  /** Callback when a verification item is clicked */
  onItemClick?: (key: string) => void;
  className?: string;
};

const VerificationStatusGrid = ({
  profile,
  compact = false,
  interactive = false,
  onItemClick,
  className,
}: VerificationStatusGridProps) => {
  const getStatus = (verified: boolean): VerificationStatus => {
    return verified ? "verified" : "unverified";
  };

  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      {VERIFICATION_ITEMS.map(({ key, label, icon: Icon }) => {
        const isVerified = profile[key];
        const status = getStatus(isVerified);

        return (
          <button
            key={key}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onItemClick?.(key)}
            className={cn(
              "flex items-center justify-between p-3 sm:p-4 rounded-xl border transition-all duration-200",
              "bg-card",
              interactive && "cursor-pointer hover:border-primary/50 hover:bg-accent/50 hover:shadow-sm",
              !interactive && "cursor-default",
              isVerified && "border-green-200 bg-green-50/50 dark:border-green-900/50 dark:bg-green-950/20"
            )}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div
                className={cn(
                  "p-1.5 sm:p-2 rounded-lg transition-colors",
                  isVerified
                    ? "bg-green-100 dark:bg-green-900/30"
                    : "bg-muted"
                )}
              >
                <Icon
                  className={cn(
                    "h-3.5 w-3.5 sm:h-4 sm:w-4",
                    isVerified
                      ? "text-green-600 dark:text-green-400"
                      : "text-muted-foreground"
                  )}
                />
              </div>
              <span className="text-xs sm:text-sm font-medium text-foreground">
                {label}
              </span>
            </div>
            <VerificationBadge status={status} showLabel={!compact} size="sm" />
          </button>
        );
      })}
    </div>
  );
};

export default VerificationStatusGrid;
