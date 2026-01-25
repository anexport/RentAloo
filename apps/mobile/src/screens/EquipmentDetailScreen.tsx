/**
 * EquipmentDetailScreen - Mobile version of EquipmentDetailDialog
 * Copied directly from web app with mobile-specific adaptations
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Info,
  Star,
  MapPin,
  ArrowLeft,
  Heart,
  Share2,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { fetchListingById } from "@/services/listings";
import { EquipmentHeader } from "@/components/equipment/detail/EquipmentHeader";
import { EquipmentPhotoGallery } from "@/components/equipment/detail/EquipmentPhotoGallery";
import { OwnerInformationCard } from "@/components/equipment/detail/OwnerInformationCard";
import { ConditionVisualization } from "@/components/equipment/detail/ConditionVisualization";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import { FloatingBookingCTA } from "@/components/booking/FloatingBookingCTA";
import { MobileSidebarDrawer } from "@/components/booking/MobileSidebarDrawer";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { supabase } from "@/lib/supabase";
import type { PaymentBookingData } from "@/lib/stripe";
import type { BookingCalculation, BookingConflict, InsuranceType } from "@/types/booking";
import { calculateBookingTotal, calculateDamageDeposit, checkBookingConflicts } from "@/lib/booking";
import { formatDateForStorage, cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

export function EquipmentDetailScreen() {
  const { id: listingId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState("overview");
  const [calculation, setCalculation] = useState<BookingCalculation | null>(null);
  const [watchedStartDate, setWatchedStartDate] = useState<string>("");
  const [watchedEndDate, setWatchedEndDate] = useState<string>("");
  const [showPaymentMode, setShowPaymentMode] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [conflicts, setConflicts] = useState<BookingConflict[]>([]);
  const [loadingConflicts, setLoadingConflicts] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selectedInsurance, setSelectedInsurance] = useState<InsuranceType>("none");
  const [isSaved, setIsSaved] = useState(false);
  const requestIdRef = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
    enabled: !!listingId,
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
    enabled: !!listingId,
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
    enabled: !!data?.owner?.id,
  });

  // Calculate booking when both dates are selected
  const calculateBooking = useCallback(
    (startDate: string, endDate: string) => {
      if (!data) return;

      const damageDeposit = calculateDamageDeposit(data);

      const newCalculation = calculateBookingTotal(
        data.daily_rate,
        startDate,
        endDate,
        undefined,
        selectedInsurance,
        damageDeposit
      );
      setCalculation(newCalculation);
      handleCalculationChange(newCalculation, startDate, endDate);

      requestIdRef.current += 1;
      const currentRequestId = requestIdRef.current;

      const checkConflicts = async () => {
        setLoadingConflicts(true);
        try {
          const result = await checkBookingConflicts(data.id, startDate, endDate);
          if (currentRequestId === requestIdRef.current) {
            setConflicts(result);
          }
        } catch (error) {
          if (currentRequestId === requestIdRef.current) {
            console.error("Error checking booking conflicts:", error);
            setConflicts([{ type: "unavailable", message: "Error checking availability" }]);
          }
        } finally {
          if (currentRequestId === requestIdRef.current) {
            setLoadingConflicts(false);
          }
        }
      };

      void checkConflicts();
    },
    [data, handleCalculationChange, selectedInsurance]
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

      if (endDate && endDate < newStartDate) {
        setDateRange({ from: date, to: undefined });
        setWatchedStartDate(newStartDate);
        setWatchedEndDate("");
        setCalculation(null);
        setConflicts([]);
        return;
      }

      const newRange: DateRange = { from: date, to: dateRange?.to };
      setDateRange(newRange);
      setWatchedStartDate(newStartDate);

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

      const startDate = dateRange?.from ? formatDateForStorage(dateRange.from) : null;

      if (!startDate) {
        const newStartDate = formatDateForStorage(date);
        setDateRange({ from: date, to: undefined });
        setWatchedStartDate(newStartDate);
        setWatchedEndDate("");
        return;
      }

      const newEndDate = formatDateForStorage(date);
      if (newEndDate < startDate) return;
      if (!dateRange?.from) return;

      const newRange: DateRange = { from: dateRange.from, to: date };
      setDateRange(newRange);
      setWatchedEndDate(newEndDate);
      calculateBooking(startDate, newEndDate);
    },
    [dateRange, calculateBooking]
  );

  // Handle date selection from the availability calendar
  const handleCalendarDateSelect = useCallback(
    (date: Date) => {
      if (!dateRange?.from) {
        handleStartDateSelect(date);
        return;
      }
      if (!dateRange.to) {
        if (date < dateRange.from) {
          handleStartDateSelect(date);
        } else {
          handleEndDateSelect(date);
        }
        return;
      }
      handleStartDateSelect(date);
    },
    [dateRange, handleStartDateSelect, handleEndDateSelect]
  );

  // Prepare booking data for payment
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

  // Handle booking button click
  const handleBooking = useCallback(() => {
    if (loadingConflicts) return;

    if (!user) {
      toast({
        variant: "destructive",
        title: "Login Required",
        description: "Please log in to book this equipment.",
      });
      navigate('/login');
      return;
    }

    if (!data || !dateRange?.from || !dateRange?.to || conflicts.length > 0) {
      return;
    }

    if (data.owner?.id === user.id) {
      toast({
        variant: "destructive",
        title: "Cannot Book",
        description: "You cannot book your own equipment.",
      });
      return;
    }

    if (!calculation) {
      toast({
        variant: "destructive",
        title: "Price Not Calculated",
        description: "Please select dates first.",
      });
      return;
    }

    setShowPaymentMode(true);
  }, [user, data, dateRange, conflicts, calculation, toast, loadingConflicts, navigate]);

  // Handle payment success
  const handlePaymentSuccess = useCallback(() => {
    toast({
      title: "Payment Successful!",
      description: "Your booking has been confirmed.",
    });
    setShowPaymentMode(false);
    setMobileSidebarOpen(false);
    setDateRange(undefined);
    setCalculation(null);
    setWatchedStartDate("");
    setWatchedEndDate("");
    setSelectedInsurance("none");
  }, [toast]);

  // Handle payment cancellation
  const handlePaymentCancel = useCallback(() => {
    setShowPaymentMode(false);
  }, []);

  const handleShare = async () => {
    if (data && navigator.share) {
      try {
        await navigator.share({
          title: data.title,
          text: `Check out ${data.title}`,
          url: window.location.href,
        });
      } catch {
        // User cancelled
      }
    }
  };

  const avgRating = (() => {
    if (!data?.reviews || data.reviews.length === 0) return 0;
    const validRatings = data.reviews.filter(
      (r) => typeof r.rating === "number" && Number.isFinite(r.rating) && r.rating >= 0 && r.rating <= 5
    );
    if (validRatings.length === 0) return 0;
    return validRatings.reduce((acc, r) => acc + r.rating, 0) / validRatings.length;
  })();

  const photos = data?.photos || [];

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
          <div className="flex items-center h-14 px-4">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="flex-1 text-center font-medium truncate px-4">Loading...</span>
            <div className="w-10" />
          </div>
        </header>
        <div className="flex-1 p-4 space-y-4">
          <div className="aspect-[4/3] bg-muted rounded-lg animate-pulse" />
          <div className="h-7 bg-muted rounded animate-pulse w-3/4" />
          <div className="h-5 bg-muted rounded animate-pulse w-1/2" />
        </div>
      </div>
    );
  }

  // Error state
  if (!data) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
          <div className="flex items-center h-14 px-4">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="flex-1 text-center font-medium">Error</span>
            <div className="w-10" />
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-muted-foreground">Equipment not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center h-14 px-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 -ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="flex-1 text-center font-medium truncate px-4">{data.title}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsSaved(!isSaved)}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <Heart className={cn("h-5 w-5", isSaved && "fill-red-500 text-red-500")} />
            </button>
            <button
              onClick={handleShare}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Scrollable content */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pb-24">
        <div className="px-4 pt-4 space-y-6">
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

          {/* Photo Gallery */}
          <EquipmentPhotoGallery
            photos={photos}
            equipmentTitle={data.title}
          />

          <Separator />

          {/* Tabs: Overview / Reviews */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview" className="flex items-center justify-center gap-1.5 text-sm">
                <Info className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="reviews" className="flex items-center justify-center gap-1.5 text-sm">
                <Star className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Reviews</span>
                {data.reviews && data.reviews.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs flex-shrink-0">
                    {data.reviews.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-8 mt-6">
              {/* Key Details Grid */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Key Details</h2>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground mb-1">Condition</dt>
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
                      <dt className="text-muted-foreground mb-1">Category</dt>
                      <dd className="font-medium">{data.category.name}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-muted-foreground mb-1">Daily Rate</dt>
                    <dd className="font-semibold text-lg">€{data.daily_rate}</dd>
                  </div>
                  {rentalCountData !== undefined && rentalCountData > 0 && (
                    <div>
                      <dt className="text-muted-foreground mb-1">Total Rentals</dt>
                      <dd className="font-medium">{rentalCountData}</dd>
                    </div>
                  )}
                </dl>
              </div>

              <Separator />

              {/* Owner Information */}
              {data.owner && ownerProfile && (
                <OwnerInformationCard
                  owner={{
                    id: data.owner.id,
                    email: data.owner.email,
                    name: undefined,
                    avatar_url: undefined,
                    joinedDate: ownerProfile.created_at
                      ? new Date(ownerProfile.created_at).getFullYear().toString()
                      : undefined,
                    totalRentals: rentalCountData,
                    responseRate: undefined,
                    rating: avgRating,
                    isVerified: false,
                  }}
                />
              )}

              <Separator />

              {/* Location Section */}
              <section>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Location
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  {data.location}
                </p>
                <div className="aspect-video rounded-xl border border-border bg-muted flex items-center justify-center text-muted-foreground">
                  <MapPin className="h-8 w-8 mr-2 opacity-50" />
                  <span>Map - Exact location after booking</span>
                </div>
              </section>

              <Separator />

              {/* Availability Section */}
              <section>
                <h2 className="text-xl font-semibold mb-4">Check Availability</h2>
                <AvailabilityCalendar
                  equipmentId={data.id}
                  defaultDailyRate={data.daily_rate}
                  viewOnly={true}
                  onDateSelect={handleCalendarDateSelect}
                  selectedRange={dateRange}
                />
              </section>

              <Separator />

              {/* Description Section */}
              <div>
                <h2 className="text-xl font-semibold mb-3">Description</h2>
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                  {data.description}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="reviews" className="mt-6">
              {data.reviews && data.reviews.length > 0 ? (
                <div className="space-y-4">
                  {data.reviews.map((review) => (
                    <div key={review.id} className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={cn(
                                "h-4 w-4",
                                star <= review.rating
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-muted-foreground"
                              )}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-foreground">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Star className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Reviews Yet</h3>
                  <p className="text-muted-foreground max-w-md">
                    Be the first to review this equipment after your rental.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Floating CTA */}
      <FloatingBookingCTA
        dailyRate={data.daily_rate}
        onOpenBooking={() => setMobileSidebarOpen(true)}
        isVisible={true}
        scrollContainerRef={scrollContainerRef}
      />

      {/* Booking Drawer */}
      <MobileSidebarDrawer
        open={mobileSidebarOpen}
        onOpenChange={setMobileSidebarOpen}
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
        showPaymentMode={showPaymentMode}
        bookingData={bookingData}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentCancel={handlePaymentCancel}
      />
    </div>
  );
}

export default EquipmentDetailScreen;
