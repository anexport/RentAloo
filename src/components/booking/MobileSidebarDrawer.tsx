import { useTranslation } from "react-i18next";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import PricingHeader from "./sidebar/PricingHeader";
import LocationContact from "./sidebar/LocationContact";
import DateSelector from "./sidebar/DateSelector";
import PricingBreakdown from "./sidebar/PricingBreakdown";
import InsuranceSelector from "./sidebar/InsuranceSelector";
import PaymentCheckoutForm from "@/components/payment/PaymentCheckoutForm";
import OrderSummaryCard from "@/components/payment/OrderSummaryCard";
import type { PaymentBookingData } from "@/lib/stripe";
import type { Listing } from "@/components/equipment/services/listings";
import type { BookingCalculation, BookingConflict, InsuranceType } from "@/types/booking";
import type { DateRange } from "react-day-picker";
import type { User } from "@supabase/supabase-js";

interface MobileSidebarDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: Listing;
  avgRating: number;
  reviewCount: number;
  dateRange?: DateRange;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onStartDateSelect?: (date: Date | undefined) => void;
  onEndDateSelect?: (date: Date | undefined) => void;
  conflicts: BookingConflict[];
  loadingConflicts: boolean;
  calculation: BookingCalculation | null;
  watchedStartDate: string;
  watchedEndDate: string;
  selectedInsurance: InsuranceType;
  onInsuranceChange: (type: InsuranceType) => void;
  onBooking: () => void;
  isLoading: boolean;
  user: User | null;
  equipmentId?: string;
  /** Whether to show payment mode */
  showPaymentMode?: boolean;
  /** Booking data for payment (NO booking exists in DB yet) */
  bookingData?: PaymentBookingData | null;
  /** Called when payment succeeds */
  onPaymentSuccess?: () => void;
  /** Called when user cancels payment */
  onPaymentCancel?: () => void;
}

/**
 * MobileSidebarDrawer wraps booking content in a Sheet component
 * for mobile devices, providing a drawer interface with sticky CTA.
 */
export const MobileSidebarDrawer = ({
  open,
  onOpenChange,
  showPaymentMode,
  bookingData,
  onPaymentSuccess,
  onPaymentCancel,
  ...sidebarProps
}: MobileSidebarDrawerProps) => {
  const { t } = useTranslation("booking");
  const isPaymentMode = showPaymentMode && bookingData && sidebarProps.calculation;

  const isOwner = sidebarProps.listing.owner?.id === sidebarProps.user?.id;
  const hasValidDates = !!sidebarProps.dateRange?.from && !!sidebarProps.dateRange?.to;
  const hasConflicts = sidebarProps.conflicts.length > 0;

  // Determine button state and text
  const getButtonState = () => {
    if (!sidebarProps.user) {
      return { disabled: false, text: t("button.login_to_book", { defaultValue: "Log in to Book" }) };
    }
    if (isOwner) {
      return { disabled: true, text: t("button.cannot_book_own", { defaultValue: "Can't book your own listing" }) };
    }
    if (!hasValidDates) {
      return { disabled: true, text: t("button.select_dates", { defaultValue: "Select dates to continue" }) };
    }
    if (hasConflicts) {
      return { disabled: true, text: t("button.dates_unavailable", { defaultValue: "Selected dates unavailable" }) };
    }
    if (!sidebarProps.calculation) {
      return { disabled: true, text: t("button.calculating", { defaultValue: "Calculating..." }) };
    }
    return {
      disabled: sidebarProps.isLoading,
      text: sidebarProps.isLoading
        ? t("button.processing", { defaultValue: "Processing..." })
        : t("button.book_now", { defaultValue: "Book Now" })
    };
  };

  const buttonState = getButtonState();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[85dvh] max-h-[85dvh] rounded-t-2xl flex flex-col p-0"
      >
        {/* Swipe indicator */}
        <div className="flex-shrink-0 pt-3 pb-2">
          <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto" />
        </div>

        <SheetHeader className="flex-shrink-0 text-left px-6 pb-4">
          <SheetTitle>
            {isPaymentMode ? "Complete Payment" : "Book This Equipment"}
          </SheetTitle>
          <SheetDescription>
            {isPaymentMode
              ? "Enter your payment details to confirm your booking"
              : "Select your dates and confirm your booking"}
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable content area */}
        <div
          className="flex-1 min-h-0 overflow-y-auto px-6 pb-4 overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {isPaymentMode && bookingData && sidebarProps.calculation ? (
            <div className="space-y-6">
              {/* Order Summary - Compact for mobile */}
              <OrderSummaryCard
                listing={sidebarProps.listing}
                calculation={sidebarProps.calculation}
                startDate={sidebarProps.watchedStartDate}
                endDate={sidebarProps.watchedEndDate}
                insuranceType={sidebarProps.selectedInsurance}
              />

              {/* Payment Form */}
              <PaymentCheckoutForm
                bookingData={bookingData}
                totalAmount={sidebarProps.calculation.total}
                onSuccess={onPaymentSuccess}
                onCancel={onPaymentCancel}
              />
            </div>
          ) : (
            <Card className="px-4">
              <section aria-labelledby="pricing-section-mobile">
                <h3 id="pricing-section-mobile" className="sr-only">
                  {t("sidebar.aria_pricing")}
                </h3>
                <PricingHeader
                  dailyRate={sidebarProps.listing.daily_rate}
                  avgRating={sidebarProps.avgRating}
                  reviewCount={sidebarProps.reviewCount}
                />
              </section>

              <Separator />

              <section aria-labelledby="location-section-mobile">
                <h3 id="location-section-mobile" className="sr-only">
                  {t("sidebar.aria_location_contact")}
                </h3>
                <LocationContact location={sidebarProps.listing.location} />
              </section>

              <Separator />

              <section aria-labelledby="dates-section-mobile">
                <h3 id="dates-section-mobile" className="sr-only">
                  {t("sidebar.aria_dates")}
                </h3>
                <DateSelector
                  dateRange={sidebarProps.dateRange}
                  onDateRangeChange={sidebarProps.onDateRangeChange}
                  onStartDateSelect={sidebarProps.onStartDateSelect}
                  onEndDateSelect={sidebarProps.onEndDateSelect}
                  conflicts={sidebarProps.conflicts}
                  loadingConflicts={sidebarProps.loadingConflicts}
                  equipmentId={sidebarProps.equipmentId}
                />
              </section>

              <Separator />

              <section aria-labelledby="pricing-breakdown-section-mobile">
                <h3 id="pricing-breakdown-section-mobile" className="sr-only">
                  {t("sidebar.aria_pricing_breakdown")}
                </h3>
                <PricingBreakdown
                  calculation={sidebarProps.calculation}
                  startDate={sidebarProps.watchedStartDate}
                  endDate={sidebarProps.watchedEndDate}
                  insuranceType={sidebarProps.selectedInsurance}
                />
              </section>

              {hasValidDates && sidebarProps.calculation && (
                <>
                  <Separator />

                  <section aria-labelledby="insurance-section-mobile">
                    <h3 id="insurance-section-mobile" className="sr-only">
                      {t("sidebar.aria_insurance")}
                    </h3>
                    <InsuranceSelector
                      selectedInsurance={sidebarProps.selectedInsurance}
                      onInsuranceChange={sidebarProps.onInsuranceChange}
                      rentalSubtotal={sidebarProps.calculation.subtotal}
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
            <div className="flex items-center justify-between mb-3">
              {sidebarProps.calculation && (
                <>
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="text-lg font-bold">${sidebarProps.calculation.total.toFixed(2)}</span>
                </>
              )}
            </div>
            <Button
              onClick={sidebarProps.onBooking}
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
      </SheetContent>
    </Sheet>
  );
};
