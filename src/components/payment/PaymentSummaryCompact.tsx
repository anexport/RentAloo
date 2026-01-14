import { useState } from "react";
import { format, isValid } from "date-fns";
import { ChevronDown, ChevronUp, Calendar, ImageIcon } from "lucide-react";
import { formatCurrency } from "@/lib/payment";
import type { Listing } from "@/components/equipment/services/listings";
import type { BookingCalculation, InsuranceType } from "@/types/booking";

type PaymentSummaryCompactProps = {
  listing: Listing;
  calculation: BookingCalculation;
  startDate: string;
  endDate: string;
  insuranceType?: InsuranceType;
};

const PaymentSummaryCompact = ({
  listing,
  calculation,
  startDate,
  endDate,
  insuranceType = "none",
}: PaymentSummaryCompactProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const primaryPhoto =
    listing.photos?.find((p) => p.is_primary) || listing.photos?.[0];
  const hasInsurance = calculation.insurance > 0;
  const hasDeposit = calculation.deposit > 0;

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (!isValid(date)) {
        return dateStr;
      }
      return format(date, "MMM d");
    } catch {
      return dateStr;
    }
  };

  // Get insurance label based on type
  const getInsuranceLabel = (): string => {
    switch (insuranceType) {
      case "basic":
        return "Basic Protection";
      case "premium":
        return "Premium Protection";
      case "none":
      default:
        return "Protection";
    }
  };

  return (
    <div className="border border-border/30 rounded-lg overflow-hidden bg-background">
      {/* Collapsed Summary Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors"
        aria-expanded={isExpanded}
        aria-label={
          isExpanded ? "Hide booking details" : "Show booking details"
        }
      >
        {/* Equipment Thumbnail */}
        <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-muted">
          {primaryPhoto?.photo_url ? (
            <img
              src={primaryPhoto.photo_url}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 text-left min-w-0">
          <h3 className="text-sm font-medium line-clamp-1">{listing.title}</h3>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <Calendar className="h-3 w-3" />
            <span>
              {formatDate(startDate)} - {formatDate(endDate)}
            </span>
            <span className="mx-1">•</span>
            <span>
              {calculation.days} day{calculation.days !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Total & Chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-sm font-bold tabular-nums">
              {formatCurrency(calculation.total)}
            </p>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-border/30 bg-muted/20 px-3 py-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
          {/* Pricing Breakdown */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {formatCurrency(listing.daily_rate)} × {calculation.days} day
                {calculation.days !== 1 ? "s" : ""}
              </span>
              <span>{formatCurrency(calculation.subtotal)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Service fee</span>
              <span>{formatCurrency(calculation.serviceFee)}</span>
            </div>

            {hasInsurance && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {getInsuranceLabel()}
                </span>
                <span>{formatCurrency(calculation.insurance)}</span>
              </div>
            )}

            {hasDeposit && (
              <div className="flex justify-between text-green-600 dark:text-green-400 text-xs">
                <span>Refundable deposit</span>
                <span>{formatCurrency(calculation.deposit)}</span>
              </div>
            )}

            <div className="pt-2 border-t border-border/30 flex justify-between font-semibold">
              <span>Total (USD)</span>
              <span>{formatCurrency(calculation.total)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentSummaryCompact;
