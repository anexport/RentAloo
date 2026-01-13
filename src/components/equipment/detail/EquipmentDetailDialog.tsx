import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Info, Star, MapPin, X } from "lucide-react";
import { fetchListingById } from "@/components/equipment/services/listings";
import { EquipmentHeader } from "./EquipmentHeader";
import { EquipmentPhotoGallery } from "./EquipmentPhotoGallery";
import { PhotoLightbox } from "@/components/ui/photo-lightbox";
import { MobileHeroCarousel } from "./MobileHeroCarousel";
import { MobileDetailStickyHeader } from "./MobileDetailStickyHeader";
import { MobileExpandableDescription } from "./MobileExpandableDescription";
import { OwnerInformationCard } from "./OwnerInformationCard";
import { ConditionVisualization } from "./ConditionVisualization";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import EquipmentLocationMap from "@/components/equipment/EquipmentLocationMap";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import BookingSidebar from "@/components/booking/BookingSidebar";
import { MobileBookingBar } from "@/components/booking/MobileBookingBar";
import PaymentCheckoutForm from "@/components/payment/PaymentCheckoutForm";
import OrderSummaryCard from "@/components/payment/OrderSummaryCard";
import ReviewList from "@/components/reviews/ReviewList";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { createMaxWidthQuery } from "@/config/breakpoints";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useVerification } from "@/hooks/useVerification";
import { useFavorites } from "@/hooks/useFavorites";
import { supabase } from "@/lib/supabase";
import { toast as sonnerToast } from "sonner";
import { fireHeartConfetti } from "@/lib/celebrations";
import type { PaymentBookingData } from "@/lib/stripe";
import type { Listing } from "@/components/equipment/services/listings";
import type {
  BookingCalculation,
  BookingConflict,
  InsuranceType,
} from "@/types/booking";
import {
  calculateBookingTotal,
  calculateDamageDeposit,
  checkBookingConflicts,
} from "@/lib/booking";
import { formatDateForStorage } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

type EquipmentDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId?: string;
};

const EquipmentDetailDialog = ({
  open,
  onOpenChange,
  listingId,
}: EquipmentDetailDialogProps) => {
  const isMobile = useMediaQuery(createMaxWidthQuery("md"));
  const { user } = useAuth();
  const { toast } = useToast();
  const { profile: verificationProfile, loading: verificationLoading } =
    useVerification();
  const { t } = useTranslation("equipment");
  const [activeTab, setActiveTab] = useState("overview");
  const [calculation, setCalculation] = useState<BookingCalculation | null>(
    null
  );
  const [watchedStartDate, setWatchedStartDate] = useState<string>("");
  const [watchedEndDate, setWatchedEndDate] = useState<string>("");
  const [showPaymentMode, setShowPaymentMode] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [conflicts, setConflicts] = useState<BookingConflict[]>([]);
  const [loadingConflicts, setLoadingConflicts] = useState(false);
  const [bookingBarExpanded, setBookingBarExpanded] = useState(false);
  const [selectedInsurance, setSelectedInsurance] =
    useState<InsuranceType>("none");
  const requestIdRef = useRef(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [stickyHeaderVisible, setStickyHeaderVisible] = useState(false);
  const heroSectionRef = useRef<HTMLDivElement | null>(null);
  const { isFavorited, toggleFavorite } = useFavorites();

  const handleCalculationChange = useCallback(
    (calc: BookingCalculation | null, startDate: string, endDate: string) => {
      setCalculation(calc);
      setWatchedStartDate(startDate);
      setWatchedEndDate(endDate);
    },
    []
  );

  const { data, isLoading } = useQuery({
    queryKey: ["listing", listingId],
    queryFn: () => fetchListingById(listingId as string),
    enabled: !!listingId && open,
  });

  // Fetch rental count for this equipment
  const { data: rentalCountData } = useQuery({
    queryKey: ["rentalCount", listingId],
    queryFn: async () => {
      if (!listingId) return 0;
      const { count, error } = await supabase
        .from("booking_requests")
        .select("*", { count: "exact", head: true })
        .eq("equipment_id", listingId)
        .in("status", ["approved", "completed"]);

      if (error) {
        console.error("Error fetching rental count:", error);
        return 0;
      }
      return count || 0;
    },
    enabled: !!listingId && open,
  });

  // Fetch owner profile details
  const { data: ownerProfile } = useQuery({
    queryKey: ["ownerProfile", data?.owner?.id],
    queryFn: async () => {
      if (!data?.owner?.id) return null;
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, email, created_at")
        .eq("id", data.owner.id)
        .single();

      if (error) {
        console.error("Error fetching owner profile:", error);
        return null;
      }
      return profile;
    },
    enabled: !!data?.owner?.id && open,
  });

  // Calculate booking when both dates are selected
  const calculateBooking = useCallback(
    (startDate: string, endDate: string) => {
      if (!data) return;

      // Calculate damage deposit from equipment settings
      const damageDeposit = calculateDamageDeposit(data);

      const newCalculation = calculateBookingTotal(
        data.daily_rate,
        startDate,
        endDate,
        undefined, // customRates - not used yet
        selectedInsurance,
        damageDeposit
      );
      setCalculation(newCalculation);
      handleCalculationChange(newCalculation, startDate, endDate);

      // Check for conflicts
      requestIdRef.current += 1;
      const currentRequestId = requestIdRef.current;

      const checkConflicts = async () => {
        setLoadingConflicts(true);
        try {
          const result = await checkBookingConflicts(
            data.id,
            startDate,
            endDate
          );

          if (currentRequestId === requestIdRef.current) {
            setConflicts(result);
          }
        } catch (error) {
          if (currentRequestId === requestIdRef.current) {
            console.error("Error checking booking conflicts:", error);
            setConflicts([
              {
                type: "unavailable",
                message: t("toasts.availability_error"),
              },
            ]);
          }
        } finally {
          if (currentRequestId === requestIdRef.current) {
            setLoadingConflicts(false);
          }
        }
      };

      void checkConflicts();
    },
    [data, handleCalculationChange, selectedInsurance, t]
  );

  // Recalculate when insurance selection changes
  useEffect(() => {
    if (watchedStartDate && watchedEndDate) {
      calculateBooking(watchedStartDate, watchedEndDate);
    }
  }, [selectedInsurance, watchedStartDate, watchedEndDate, calculateBooking]);

  // Handle start date selection
  const handleStartDateSelect = useCallback(
    (date: Date | undefined) => {
      if (!date) {
        requestIdRef.current += 1;
        setDateRange(undefined);
        setCalculation(null);
        setWatchedStartDate("");
        setWatchedEndDate("");
        setConflicts([]);
        return;
      }

      const newStartDate = formatDateForStorage(date);
      const endDate = dateRange?.to ? formatDateForStorage(dateRange.to) : null;

      // If end date exists and is before start date, clear end date
      if (endDate && endDate < newStartDate) {
        setDateRange({ from: date, to: undefined });
        setWatchedStartDate(newStartDate);
        setWatchedEndDate("");
        setCalculation(null);
        setConflicts([]);
        return;
      }

      const newRange: DateRange = {
        from: date,
        to: dateRange?.to,
      };
      setDateRange(newRange);
      setWatchedStartDate(newStartDate);

      // If both dates are selected, calculate
      if (endDate && endDate >= newStartDate) {
        calculateBooking(newStartDate, endDate);
      }
    },
    [dateRange, calculateBooking]
  );

  // Handle end date selection
  const handleEndDateSelect = useCallback(
    (date: Date | undefined) => {
      if (!date) {
        requestIdRef.current += 1;
        if (dateRange?.from) {
          setDateRange({ from: dateRange.from, to: undefined });
        } else {
          setDateRange(undefined);
        }
        setCalculation(null);
        setWatchedEndDate("");
        setConflicts([]);
        return;
      }

      const startDate = dateRange?.from
        ? formatDateForStorage(dateRange.from)
        : null;

      if (!startDate) {
        // If no start date, set this as start date
        const newStartDate = formatDateForStorage(date);
        setDateRange({ from: date, to: undefined });
        setWatchedStartDate(newStartDate);
        setWatchedEndDate("");
        return;
      }

      const newEndDate = formatDateForStorage(date);

      // Validate end date is after start date
      if (newEndDate < startDate) {
        return;
      }

      if (!dateRange?.from) {
        return;
      }

      const newRange: DateRange = {
        from: dateRange.from,
        to: date,
      };
      setDateRange(newRange);
      setWatchedEndDate(newEndDate);

      // Calculate booking
      calculateBooking(startDate, newEndDate);
    },
    [dateRange, calculateBooking]
  );

  // Handle date selection from the availability calendar
  const handleCalendarDateSelect = useCallback(
    (date: Date) => {
      // If no start date selected, set as start
      if (!dateRange?.from) {
        handleStartDateSelect(date);
        return;
      }

      // If start date exists but no end date
      if (!dateRange.to) {
        // If clicked date is before start date, make it the new start
        if (date < dateRange.from) {
          handleStartDateSelect(date);
        } else {
          // Set as end date
          handleEndDateSelect(date);
        }
        return;
      }

      // Both dates are set - start fresh with clicked date as new start
      handleStartDateSelect(date);
    },
    [dateRange, handleStartDateSelect, handleEndDateSelect]
  );

  // Prepare booking data for payment (NO database record created yet!)
  const bookingData: PaymentBookingData | null =
    data && dateRange?.from && dateRange?.to && calculation
      ? {
          equipment_id: data.id,
          start_date: formatDateForStorage(dateRange.from),
          end_date: formatDateForStorage(dateRange.to),
          total_amount: calculation.total,
          insurance_type: selectedInsurance,
          insurance_cost: calculation.insurance,
          damage_deposit_amount: calculateDamageDeposit(data),
        }
      : null;

  // Handle transitioning to payment mode (NO booking created in DB)
  const handleProceedToPayment = useCallback(() => {
    // Validate before showing payment
    if (loadingConflicts) {
      return;
    }

    if (!user) {
      toast({
        variant: "destructive",
        title: t("toasts.login_required_title"),
        description: t("toasts.login_required_message"),
      });
      return;
    }

    if (!data || !dateRange?.from || !dateRange?.to || conflicts.length > 0) {
      return;
    }

    // Check if user is trying to book their own equipment
    if (data.owner?.id === user.id) {
      toast({
        variant: "destructive",
        title: t("toasts.cannot_book_own_title"),
        description: t("toasts.cannot_book_own_message"),
      });
      return;
    }

    if (!calculation) {
      toast({
        variant: "destructive",
        title: t("toasts.price_not_calculated_title"),
        description: t("toasts.price_not_calculated_message"),
      });
      return;
    }

    // Just switch to payment mode - NO booking is created here!
    // The booking will be created by the webhook after payment succeeds
    setShowPaymentMode(true);
  }, [
    user,
    data,
    dateRange,
    conflicts,
    calculation,
    toast,
    loadingConflicts,
    t,
  ]);

  // Handle booking button click - proceeds to payment mode
  const handleBooking = useCallback(() => {
    handleProceedToPayment();
    // Expand the booking bar so user can see the payment form
    setBookingBarExpanded(true);
  }, [handleProceedToPayment]);

  // Handle payment success - booking is created by webhook, just update UI
  const handlePaymentSuccess = useCallback(() => {
    toast({
      title: t("toasts.payment_success_title"),
      description: t("toasts.payment_success_message"),
    });
    setShowPaymentMode(false);
    setBookingBarExpanded(false);
    // Reset booking state
    setDateRange(undefined);
    setCalculation(null);
    setWatchedStartDate("");
    setWatchedEndDate("");
    setSelectedInsurance("none");
  }, [toast, t]);

  // Handle payment cancellation - just reset UI state (no DB cleanup needed!)
  const handlePaymentCancel = useCallback(() => {
    // Simply exit payment mode - no booking was created so nothing to clean up!
    setShowPaymentMode(false);
    // Keep the dates and calculation so user can modify and try again
  }, []);

  // Reset state when dialog closes
  // No database cleanup needed since bookings are only created after payment!
  useEffect(() => {
    if (!open) {
      // Clear local state
      setDateRange(undefined);
      setCalculation(null);
      setWatchedStartDate("");
      setWatchedEndDate("");
      setConflicts([]);
      setShowPaymentMode(false);
      setBookingBarExpanded(false);
      setActiveTab("overview");
      setSelectedInsurance("none");
      setLightboxOpen(false);
      setStickyHeaderVisible(false);
    }
  }, [open]);

  const avgRating = (() => {
    if (!data?.reviews || data.reviews.length === 0) return 0;
    const validRatings = data.reviews.filter(
      (r) =>
        typeof r.rating === "number" &&
        Number.isFinite(r.rating) &&
        r.rating >= 0 &&
        r.rating <= 5
    );
    if (validRatings.length === 0) return 0;
    const sum = validRatings.reduce((acc, r) => acc + r.rating, 0);
    return sum / validRatings.length;
  })();

  const photos = data?.photos || [];

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="py-12 text-center text-muted-foreground">
          {t("search.loading")}
        </div>
      );
    }

    if (!data) {
      return (
        <div className="py-12 text-center text-muted-foreground">
          {t("errors.load_failed")}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header with meta info */}
        <EquipmentHeader
          title={data.title}
          location={data.location}
          condition={data.condition}
          avgRating={avgRating}
          reviewCount={data.reviews?.length || 0}
          category={data.category}
        />

        <Separator />

        {/* Photo Gallery - Airbnb style */}
        <EquipmentPhotoGallery photos={photos} equipmentTitle={data.title} />

        <Separator />

        {/* Payment Mode: Full-width payment form with order summary sidebar */}
        {showPaymentMode && bookingData && calculation && !isMobile ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
            {/* Payment Form - Full Width */}
            <div>
              <PaymentCheckoutForm
                bookingData={bookingData}
                totalAmount={calculation.total}
                onSuccess={handlePaymentSuccess}
                onCancel={handlePaymentCancel}
              />
            </div>

            {/* Order Summary Sidebar */}
            <aside className="lg:sticky lg:top-6 h-fit">
              <OrderSummaryCard
                listing={data}
                calculation={calculation}
                startDate={watchedStartDate}
                endDate={watchedEndDate}
                insuranceType={selectedInsurance}
              />
            </aside>
          </div>
        ) : (
          /* Normal Mode: Equipment details with booking sidebar */
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
            {/* Main content tabs */}
            <div className="space-y-6">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger
                    value="overview"
                    className="flex items-center justify-center gap-1.5 sm:gap-2 text-sm"
                    aria-label={t("details_dialog.aria_overview")}
                  >
                    <Info className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                      {t("details_dialog.tab_overview")}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="reviews"
                    className="flex items-center justify-center gap-1.5 sm:gap-2 text-sm"
                    aria-label={t("details_dialog.aria_reviews")}
                  >
                    <Star className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                      {t("details_dialog.tab_reviews")}
                    </span>
                    {data.reviews && data.reviews.length > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-1 text-xs flex-shrink-0"
                      >
                        {data.reviews.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-8 mt-6">
                  {/* 1. Key Details Grid */}
                  <div>
                    <h2 className="text-title-lg font-semibold mb-4">
                      {t("details.key_details")}
                    </h2>
                    <dl className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <dt className="text-muted-foreground mb-1">
                          {t("details.condition")}
                        </dt>
                        <dd className="font-medium flex items-center gap-2">
                          <ConditionVisualization
                            condition={data.condition}
                            lastInspectionDate={data.created_at}
                            compact={true}
                          />
                        </dd>
                      </div>
                      {data.category && (
                        <div>
                          <dt className="text-muted-foreground mb-1">
                            {t("details.category")}
                          </dt>
                          <dd className="font-medium">{data.category.name}</dd>
                        </div>
                      )}
                      <div>
                        <dt className="text-muted-foreground mb-1">
                          {t("details.daily_rate")}
                        </dt>
                        <dd className="font-semibold text-lg">
                          ${data.daily_rate}
                        </dd>
                      </div>
                      {rentalCountData !== undefined && rentalCountData > 0 && (
                        <div>
                          <dt className="text-muted-foreground mb-1">
                            {t("details.total_rentals")}
                          </dt>
                          <dd className="font-medium">{rentalCountData}</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  <Separator />

                  {/* 2. Owner Information */}
                  {data.owner && ownerProfile && (
                    <OwnerInformationCard
                      owner={{
                        id: data.owner.id,
                        email: data.owner.email,
                        name: undefined,
                        avatar_url: undefined,
                        joinedDate: ownerProfile.created_at
                          ? new Date(ownerProfile.created_at)
                              .getFullYear()
                              .toString()
                          : undefined,
                        totalRentals: rentalCountData,
                        responseRate: undefined,
                        rating: avgRating,
                        isVerified: false,
                      }}
                    />
                  )}

                  <Separator />

                  {/* 3. Location Section */}
                  <section>
                    <h2 className="text-title-lg font-semibold mb-4 flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      {t("details.location")}
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4">
                      {data.location}
                    </p>
                    <EquipmentLocationMap
                      location={data.location}
                      latitude={data.latitude}
                      longitude={data.longitude}
                      equipmentTitle={data.title}
                    />
                  </section>

                  <Separator />

                  {/* 4. Availability Section */}
                  <section>
                    <h2 className="text-title-lg font-semibold mb-4 flex items-center gap-2">
                      {t("details.availability")}
                    </h2>
                    <AvailabilityCalendar
                      equipmentId={data.id}
                      defaultDailyRate={data.daily_rate}
                      viewOnly={true}
                      onDateSelect={handleCalendarDateSelect}
                      selectedRange={dateRange}
                    />
                  </section>

                  <Separator />

                  {/* 5. Description Section */}
                  <div>
                    <h2 className="text-title-lg font-semibold mb-3">
                      {t("details.description")}
                    </h2>
                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                      {data.description}
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="reviews" className="mt-6">
                  {data.reviews && data.reviews.length > 0 ? (
                    <ReviewList
                      revieweeId={data.owner?.id}
                      showSummary={true}
                      showEquipment={false}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Star className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        {t("details_dialog.no_reviews_title")}
                      </h3>
                      <p className="text-muted-foreground max-w-md">
                        {t("details_dialog.no_reviews_message")}
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Sticky booking sidebar - Desktop only */}
            {!isMobile && (
              <BookingSidebar
                listing={data}
                avgRating={avgRating}
                reviewCount={data.reviews?.length || 0}
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                onStartDateSelect={handleStartDateSelect}
                onEndDateSelect={handleEndDateSelect}
                conflicts={conflicts}
                loadingConflicts={loadingConflicts}
                calculation={calculation}
                watchedStartDate={watchedStartDate}
                watchedEndDate={watchedEndDate}
                selectedInsurance={selectedInsurance}
                onInsuranceChange={setSelectedInsurance}
                onBooking={handleBooking}
                isLoading={loadingConflicts}
                user={user}
                equipmentId={listingId}
                isVerified={verificationProfile?.identityVerified}
                verificationLoading={verificationLoading}
              />
            )}
          </div>
        )}
      </div>
    );
  };

  // Handle favorite toggle for mobile
  const handleToggleFavorite = async () => {
    if (!data) return;
    try {
      const wasWishlisted = isFavorited(data.id);
      await toggleFavorite(data.id);

      if (!wasWishlisted) {
        fireHeartConfetti();
      }

      sonnerToast.success(
        wasWishlisted
          ? t("listing_card.removed_from_favorites", {
              defaultValue: "Removed from favorites",
            })
          : t("listing_card.added_to_favorites", {
              defaultValue: "Added to favorites",
            })
      );
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      sonnerToast.error(
        t("listing_card.favorite_error", {
          defaultValue: "Failed to update favorites",
        })
      );
    }
  };

  // Intersection observer for sticky header
  useEffect(() => {
    if (!isMobile || !heroSectionRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setStickyHeaderVisible(!entry.isIntersecting);
      },
      {
        threshold: 0,
        rootMargin: "-1px 0px 0px 0px",
      }
    );

    observer.observe(heroSectionRef.current);

    return () => observer.disconnect();
  }, [isMobile]);

  // Mobile: Use full-screen view
  if (isMobile) {
    // Don't render anything if dialog is closed
    if (!open) {
      return null;
    }

    if (isLoading) {
      return (
        <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
          <span className="text-muted-foreground">{t("search.loading")}</span>
        </div>
      );
    }

    if (!data) {
      return (
        <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
          <span className="text-muted-foreground">
            {t("errors.load_failed")}
          </span>
        </div>
      );
    }

    return (
      <>
        {/* Full-screen mobile detail view */}
        <div className="fixed inset-0 z-50 bg-background overflow-y-auto scrollbar-hide">
          {/* Always-visible close button - top left */}
          <button
            onClick={() => onOpenChange(false)}
            className="fixed top-4 left-4 z-[60] h-10 w-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm flex items-center justify-center text-white shadow-lg transition-all"
            style={{
              top: "max(env(safe-area-inset-top, 0px) + 16px, 16px)",
            }}
            aria-label="Close details"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Hero carousel with intersection observer target */}
          <div ref={heroSectionRef}>
            <MobileHeroCarousel
              photos={photos}
              equipmentTitle={data.title}
              onPhotoCountClick={() => setLightboxOpen(true)}
            />
          </div>

          {/* Sticky header - appears on scroll */}
          <MobileDetailStickyHeader
            title={data.title}
            dailyRate={data.daily_rate}
            isVisible={stickyHeaderVisible}
            onClose={() => onOpenChange(false)}
            isFavorited={isFavorited(data.id)}
            onToggleFavorite={handleToggleFavorite}
          />

          {/* Content sections with better spacing */}
          <div className="space-y-6 px-6 pt-6 pb-32">
            {/* Title and meta info */}
            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-foreground">
                {data.title}
              </h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {avgRating > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-foreground text-foreground" />
                    <span className="font-medium tabular-nums text-foreground">
                      {avgRating.toFixed(1)}
                    </span>
                    <span>({data.reviews?.length || 0})</span>
                  </div>
                ) : (
                  <span>New listing</span>
                )}
                <span>·</span>
                <span>{data.location}</span>
              </div>
            </div>

            {/* Quick info pills */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6">
              <Badge variant="secondary" className="whitespace-nowrap">
                <ConditionVisualization
                  condition={data.condition}
                  lastInspectionDate={data.created_at}
                  compact={true}
                />
              </Badge>
              {data.category && (
                <Badge variant="outline" className="whitespace-nowrap">
                  {data.category.name}
                </Badge>
              )}
              <Badge variant="outline" className="whitespace-nowrap">
                ${data.daily_rate}/day
              </Badge>
            </div>

            {/* Description - collapsible */}
            <MobileExpandableDescription description={data.description} />

            {/* Owner Information */}
            {data.owner && ownerProfile && (
              <>
                <div className="h-px bg-border" />
                <OwnerInformationCard
                  owner={{
                    id: data.owner.id,
                    email: data.owner.email,
                    name: undefined,
                    avatar_url: undefined,
                    joinedDate: ownerProfile.created_at
                      ? new Date(ownerProfile.created_at)
                          .getFullYear()
                          .toString()
                      : undefined,
                    totalRentals: rentalCountData,
                    responseRate: undefined,
                    rating: avgRating,
                    isVerified: false,
                  }}
                />
              </>
            )}

            {/* Location */}
            <>
              <div className="h-px bg-border" />
              <section className="space-y-4">
                <h2 className="text-title-lg font-semibold flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  {t("details.location")}
                </h2>
                <p className="text-sm text-muted-foreground">{data.location}</p>
                <EquipmentLocationMap
                  location={data.location}
                  latitude={data.latitude}
                  longitude={data.longitude}
                  equipmentTitle={data.title}
                />
              </section>
            </>

            {/* Availability */}
            <>
              <div className="h-px bg-border" />
              <section className="space-y-4">
                <h2 className="text-title-lg font-semibold">
                  {t("details.availability")}
                </h2>
                <AvailabilityCalendar
                  equipmentId={data.id}
                  defaultDailyRate={data.daily_rate}
                  viewOnly={true}
                  onDateSelect={handleCalendarDateSelect}
                  selectedRange={dateRange}
                />
              </section>
            </>

            {/* Reviews */}
            {data.reviews && data.reviews.length > 0 && (
              <>
                <div className="h-px bg-border" />
                <section className="space-y-4">
                  <h2 className="text-title-lg font-semibold flex items-center gap-2">
                    <Star className="h-5 w-5 text-primary" />
                    Reviews
                  </h2>
                  <ReviewList
                    revieweeId={data.owner?.id}
                    showSummary={true}
                    showEquipment={false}
                  />
                </section>
              </>
            )}
          </div>
        </div>

        {/* Photo Lightbox */}
        <PhotoLightbox
          photos={photos}
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
          title={data.title}
        />

        {/* Persistent bottom booking bar */}
        <MobileBookingBar
          listing={data}
          dailyRate={data.daily_rate}
          avgRating={avgRating}
          reviewCount={data.reviews?.length || 0}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onStartDateSelect={handleStartDateSelect}
          onEndDateSelect={handleEndDateSelect}
          conflicts={conflicts}
          loadingConflicts={loadingConflicts}
          calculation={calculation}
          watchedStartDate={watchedStartDate}
          watchedEndDate={watchedEndDate}
          selectedInsurance={selectedInsurance}
          onInsuranceChange={setSelectedInsurance}
          isExpanded={bookingBarExpanded}
          onExpandChange={setBookingBarExpanded}
          onBooking={handleBooking}
          isLoading={loadingConflicts}
          user={user}
          equipmentId={listingId}
          showPaymentMode={showPaymentMode}
          bookingData={bookingData}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentCancel={handlePaymentCancel}
          isVerified={verificationProfile?.identityVerified}
          verificationLoading={verificationLoading}
        />
      </>
    );
  }

  // Desktop: Use Dialog component
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-7xl max-h-[90dvh] overflow-y-auto scrollbar-hide">
        <DialogTitle className="sr-only">
          {data?.title || t("details_dialog.equipment_details_fallback")}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {t("details_dialog.view_details_description")}
        </DialogDescription>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};

export default EquipmentDetailDialog;
