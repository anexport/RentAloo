import { Button } from "@/components/ui/button";
import { CreditCard, ShieldAlert, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { User } from "@supabase/supabase-js";

interface BookingButtonProps {
  user: User | null;
  isOwner: boolean;
  hasValidDates: boolean;
  hasConflicts: boolean;
  isLoading: boolean;
  hasCalculation: boolean;
  isVerified?: boolean;
  verificationLoading?: boolean;
  onBook: () => void;
}

const getButtonText = ({
  user,
  isOwner,
  hasValidDates,
  hasConflicts,
  isLoading,
  isVerified,
}: Omit<
  BookingButtonProps,
  "hasCalculation" | "onBook" | "verificationLoading"
>): string => {
  if (!user) return "Login to Book";
  if (isOwner) return "Your Equipment";
  if (!isVerified) return "Verify to Book";
  if (!hasValidDates) return "Select Dates to Book";
  if (hasConflicts) return "Dates Unavailable";
  if (isLoading) return "Processing...";
  return "Book & Pay Now";
};

const BookingButton = ({
  user,
  isOwner,
  hasValidDates,
  hasConflicts,
  isLoading,
  hasCalculation,
  isVerified = true,
  verificationLoading = false,
  onBook,
}: BookingButtonProps) => {
  const buttonText = getButtonText({
    user,
    isOwner,
    hasValidDates,
    hasConflicts,
    isLoading,
    isVerified,
  });

  // Show verification nudge when user is logged in but not verified
  const showVerificationNudge =
    user && !isOwner && !isVerified && !verificationLoading;

  return (
    <div className="space-y-3">
      {/* Verification Nudge */}
      {showVerificationNudge && (
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Verification required
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                Complete identity verification to book equipment
              </p>
              <Link
                to="/verification"
                className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 mt-2 transition-colors"
              >
                Complete Verification
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Booking Button */}
      <Button
        className="w-full transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
        size="lg"
        aria-label="Book & Pay for this equipment"
        aria-busy={isLoading}
        disabled={
          !hasValidDates ||
          hasConflicts ||
          isLoading ||
          !hasCalculation ||
          isOwner ||
          !isVerified
        }
        onClick={onBook}
      >
        {isLoading && (
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {!isLoading && buttonText === "Book & Pay Now" && (
          <CreditCard className="h-4 w-4" aria-hidden="true" />
        )}
        {!isLoading && buttonText === "Verify to Book" && (
          <ShieldAlert className="h-4 w-4" aria-hidden="true" />
        )}
        {buttonText}
      </Button>
    </div>
  );
};

export default BookingButton;
