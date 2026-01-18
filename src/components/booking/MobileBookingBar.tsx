import { useTranslation } from "react-i18next";
import { X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import PricingHeader from "./sidebar/PricingHeader";
import LocationContact from "./sidebar/LocationContact";
import DateSelector from "./sidebar/DateSelector";
import PricingBreakdown from "./sidebar/PricingBreakdown";
import InsuranceSelector from "./sidebar/InsuranceSelector";
import PaymentCheckoutForm from "@/components/payment/PaymentCheckoutForm";
import PaymentSummaryCompact from "@/components/payment/PaymentSummaryCompact";
import type { PaymentBookingData } from "@/lib/stripe";
import type { Listing } from "@/components/equipment/services/listings";
import type {
  BookingCalculation,
  BookingConflict,
  InsuranceType,
} from "@/types/booking";
import type { DateRange } from "react-day-picker";
import type { User } from "@supabase/supabase-js";

const SPRING_TRANSITION = "transform 350ms cubic-bezier(0.32, 0.72, 0, 1)";

interface MobileBookingBarProps {
  listing: Listing;
  dailyRate: number;
  avgRating: number;
  reviewCount: number;
  calculation: BookingCalculation | null;
  dateRange?: DateRange;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onStartDateSelect?: (date: Date | undefined) => void;
  onEndDateSelect?: (date: Date | undefined) => void;
  conflicts: BookingConflict[];
  loadingConflicts: boolean;
  watchedStartDate: string;
  watchedEndDate: string;
  selectedInsurance: InsuranceType;
  onInsuranceChange: (type: InsuranceType) => void;
  isExpanded: boolean;
  onExpandChange: (expanded: boolean) => void;
  onBooking: () => void;
  isLoading: boolean;
  user: User | null;
  equipmentId?: string;
  showPaymentMode?: boolean;
  bookingData?: PaymentBookingData | null;
  onPaymentSuccess?: () => void;
  onPaymentCancel?: () => void;
}

export const MobileBookingBar = ({
  listing,
  dailyRate,
  avgRating,
  reviewCount,
  calculation,
  dateRange,
  onDateRangeChange,
  onStartDateSelect,
  onEndDateSelect,
  conflicts,
  loadingConflicts,
  watchedStartDate,
  watchedEndDate,
  selectedInsurance,
  onInsuranceChange,
  isExpanded,
  onExpandChange,
  onBooking,
  isLoading,
  user,
  equipmentId,
  showPaymentMode,
  bookingData,
  onPaymentSuccess,
  onPaymentCancel,
}: MobileBookingBarProps) => {
  const { t } = useTranslation("booking");

  const isPaymentMode = showPaymentMode && bookingData && calculation;
  const isOwner = listing.owner?.id === user?.id;
  const hasValidDates = !!dateRange?.from && !!dateRange?.to;
  const hasConflicts = conflicts.length > 0;
  const showVerificationNudge = false; // TODO: Re-enable verification

  // Determine button state and text
  const getButtonState = () => {
    if (!user) {
      return {
        disabled: false,
        text: t("button.login_to_book", { defaultValue: "Log in to Book" }),
      };
    }
    if (isOwner) {
      return {
        disabled: true,
        text: t("button.cannot_book_own", {
          defaultValue: "Can't book your own listing",
        }),
      };
    }
    if (!hasValidDates) {
      return {
        disabled: true,
        text: t("button.select_dates", {
          defaultValue: "Select dates to continue",
        }),
      };
    }
    if (hasConflicts) {
      return {
        disabled: true,
        text: t("button.dates_unavailable", {
          defaultValue: "Selected dates unavailable",
        }),
      };
    }
    if (!calculation) {
      return {
        disabled: true,
        text: t("button.calculating", { defaultValue: "Calculating..." }),
      };
    }
    return {
      disabled: isLoading,
      text: isLoading
        ? t("button.processing", { defaultValue: "Processing..." })
        : t("button.book_now", { defaultValue: "Reserve" }),
    };
  };

  const buttonState = getButtonState();

  const handleBarClick = () => {
    if (!isExpanded) {
      onExpandChange(true);
    }
  };

  const handleClose = () => {
    onExpandChange(false);
  };

  return (
    <>
      {/* Overlay backdrop when expanded */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/40 z-40 animate-in fade-in duration-200"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}

      {/* Booking bar */}
      <div
        className={cn(
          "fixed bottom-16 inset-x-0 z-[51]",
          "bg-background/98 backdrop-blur-xl",
          "border-t border-border/50",
          "flex flex-col",
          "shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05),0_-10px_15px_-3px_rgba(0,0,0,0.08)]"
        )}
        style={{
          height: isExpanded ? "85dvh" : "72px",
          transition: SPRING_TRANSITION,
          willChange: "height",
          borderTopLeftRadius: isExpanded ? "24px" : "0px",
          borderTopRightRadius: isExpanded ? "24px" : "0px",
        }}
      >
        {/* Collapsed state - price + CTA */}
        {!isExpanded && (
          <div
            className="flex items-center justify-between px-4 py-3 h-full"
            onClick={handleBarClick}
            role="button"
            aria-expanded={false}
            aria-label="Expand booking details"
          >
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">
                {hasValidDates && calculation
                  ? t("footer.total", { defaultValue: "Total" })
                  : "From"}
              </span>
              <span className="text-lg font-bold tabular-nums">
                {hasValidDates && calculation
                  ? `$${calculation.total.toFixed(2)}`
                  : `$${dailyRate}`}
              </span>
              {!hasValidDates && (
                <span className="text-xs text-muted-foreground">per day</span>
              )}
            </div>
            <Button
              size="lg"
              className="h-12 px-6 text-base font-semibold rounded-xl"
              onClick={(e) => {
                e.stopPropagation();
                if (!hasValidDates) {
                  onExpandChange(true);
                } else {
                  onBooking();
                }
              }}
              disabled={buttonState.disabled}
            >
              {hasValidDates ? buttonState.text : "Check availability"}
            </Button>
          </div>
        )}

        {/* Expanded state - full booking form */}
        {isExpanded && (
          <>
            {/* Swipe indicator */}
            <div className="flex-shrink-0 pt-3 pb-2">
              <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto" />
            </div>

            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-6 pb-4">
              <div>
                <h2 className="text-xl font-semibold">
                  {isPaymentMode
                    ? t("drawer.title_payment", {
                        defaultValue: "Complete Payment",
                      })
                    : t("drawer.title_booking", {
                        defaultValue: "Book This Equipment",
                      })}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {isPaymentMode
                    ? t("drawer.description_payment", {
                        defaultValue:
                          "Enter your payment details to confirm your booking",
                      })
                    : t("drawer.description_booking", {
                        defaultValue:
                          "Select your dates and confirm your booking",
                      })}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="h-9 w-9 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 -mr-2"
                aria-label="Close booking details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div
              className="flex-1 min-h-0 overflow-y-auto px-4 pb-24 overscroll-contain"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {isPaymentMode && bookingData && calculation ? (
                <div className="space-y-4">
                  <PaymentSummaryCompact
                    listing={listing}
                    calculation={calculation}
                    startDate={watchedStartDate}
                    endDate={watchedEndDate}
                    insuranceType={selectedInsurance}
                  />

                  {/* Insurance Selector - Mobile Payment View */}
                  <section aria-labelledby="insurance-section-payment">
                    <h3 id="insurance-section-payment" className="sr-only">
                      {t("sidebar.aria_insurance")}
                    </h3>
                    <InsuranceSelector
                      selectedInsurance={selectedInsurance}
                      onInsuranceChange={onInsuranceChange}
                      rentalSubtotal={calculation.subtotal}
                    />
                  </section>

                  {/* Deposit Information - Mobile Payment View */}
                  {calculation.deposit > 0 && (
                    <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">
                            {t("deposit.title", {
                              defaultValue: "Refundable Deposit",
                            })}
                            : ${calculation.deposit.toFixed(2)}
                          </h4>
                          <p className="text-xs text-green-700 dark:text-green-300">
                            {t("deposit.description", {
                              defaultValue:
                                "This deposit will be refunded after you return the equipment in good condition.",
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <PaymentCheckoutForm
                    bookingData={bookingData}
                    totalAmount={calculation.total}
                    onSuccess={onPaymentSuccess}
                    onCancel={onPaymentCancel}
                    isMobile={true}
                  />
                </div>
              ) : (
                <Card className="px-4">
                  <section aria-labelledby="pricing-section-mobile">
                    <h3 id="pricing-section-mobile" className="sr-only">
                      {t("sidebar.aria_pricing")}
                    </h3>
                    <PricingHeader
                      dailyRate={dailyRate}
                      avgRating={avgRating}
                      reviewCount={reviewCount}
                    />
                  </section>

                  <Separator />

                  <section aria-labelledby="location-section-mobile">
                    <h3 id="location-section-mobile" className="sr-only">
                      {t("sidebar.aria_location_contact")}
                    </h3>
                    <LocationContact location={listing.location} />
                  </section>

                  <Separator />

                  <section aria-labelledby="dates-section-mobile">
                    <h3 id="dates-section-mobile" className="sr-only">
                      {t("sidebar.aria_dates")}
                    </h3>
                    <DateSelector
                      dateRange={dateRange}
                      onDateRangeChange={onDateRangeChange}
                      onStartDateSelect={onStartDateSelect}
                      onEndDateSelect={onEndDateSelect}
                      conflicts={conflicts}
                      loadingConflicts={loadingConflicts}
                      equipmentId={equipmentId}
                    />
                  </section>

                  <Separator />

                  <section aria-labelledby="pricing-breakdown-section-mobile">
                    <h3
                      id="pricing-breakdown-section-mobile"
                      className="sr-only"
                    >
                      {t("sidebar.aria_pricing_breakdown")}
                    </h3>
                    <PricingBreakdown
                      calculation={calculation}
                      startDate={watchedStartDate}
                      endDate={watchedEndDate}
                      insuranceType={selectedInsurance}
                    />
                  </section>

                  {hasValidDates && calculation && (
                    <>
                      <Separator />
                      <section aria-labelledby="insurance-section-mobile">
                        <h3 id="insurance-section-mobile" className="sr-only">
                          {t("sidebar.aria_insurance")}
                        </h3>
                        <InsuranceSelector
                          selectedInsurance={selectedInsurance}
                          onInsuranceChange={onInsuranceChange}
                          rentalSubtotal={calculation.subtotal}
                        />
                      </section>
                    </>
                  )}
                </Card>
              )}
            </div>

            {/* Sticky footer with CTA - only show for non-payment mode */}
            {!isPaymentMode && (
              <div className="flex-shrink-0 px-6 py-4 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                {showVerificationNudge && (
                  <div className="mb-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      Verification required
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                      Complete identity verification to book equipment
                    </p>
                    <a
                      href="/verification"
                      className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 mt-2 transition-colors"
                    >
                      Complete Verification →
                    </a>
                  </div>
                )}

                {calculation && (
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">
                      {t("footer.total", { defaultValue: "Total" })}
                    </span>
                    <span className="text-lg font-bold tabular-nums">
                      ${calculation.total.toFixed(2)}
                    </span>
                  </div>
                )}
                <Button
                  onClick={onBooking}
                  disabled={buttonState.disabled}
                  size="lg"
                  className="w-full h-14 text-base font-semibold rounded-2xl shadow-lg"
                >
                  {buttonState.text}
                </Button>

                {/* Safe area padding for iPhone */}
                <div className="h-[env(safe-area-inset-bottom)]" />
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};
