import { AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ContentCard } from "@/components/ui/ContentCard";

interface VerificationBannerProps {
  /** Current verification progress percentage (0-100) */
  progress: number;
  /** Translation namespace for the verify button */
  translationKey?: string;
}

/**
 * VerificationBanner - Displays a prominent alert to encourage identity verification
 * Used on both Renter and Owner dashboards when identity is not verified
 */
const VerificationBanner = ({
  progress,
  translationKey = "renter.verification.verify_button",
}: VerificationBannerProps) => {
  const { t } = useTranslation("dashboard");

  return (
    <ContentCard
      variant="highlighted"
      padding="default"
      className="flex items-center justify-between gap-4 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/30"
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Complete verification to unlock all features ({progress}% done)
        </p>
      </div>
      <Link to="/verification">
        <Button size="sm" variant="outline" className="shrink-0">
          {t(translationKey)}
        </Button>
      </Link>
    </ContentCard>
  );
};

export default VerificationBanner;
