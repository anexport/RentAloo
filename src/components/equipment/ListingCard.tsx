import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useEmblaCarousel from "embla-carousel-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Package,
  Loader2,
  Star,
} from "lucide-react";
import type { Listing } from "@/components/equipment/services/listings";
import { cn } from "@/lib/utils";
import { useFavorites } from "@/hooks/useFavorites";
import { toast } from "sonner";
import { fireHeartConfetti } from "@/lib/celebrations";

type Props = {
  listing: Listing;
  onOpen?: (listing: Listing) => void;
  className?: string;
};

const ListingCard = ({ listing, onOpen, className }: Props) => {
  const { t } = useTranslation("equipment");
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(
    () => new Set()
  );
  const [failedImages, setFailedImages] = useState<Set<number>>(
    () => new Set()
  );
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const { isFavorited, toggleFavorite } = useFavorites();

  const isWishlisted = isFavorited(listing.id);
  const avgRating = (() => {
    if (!listing.reviews || listing.reviews.length === 0) return 0;
    const validRatings = listing.reviews.filter(
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

  // Calculate rating breakdown for hovercard
  const ratingBreakdown = useMemo(() => {
    if (!listing.reviews || listing.reviews.length === 0) {
      return { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    }

    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    listing.reviews.forEach((review) => {
      const rating = Math.floor(review.rating);
      if (rating >= 1 && rating <= 5) {
        breakdown[rating as 1 | 2 | 3 | 4 | 5]++;
      }
    });
    return breakdown;
  }, [listing.reviews]);

  const reviewCount = listing.reviews?.length ?? 0;

  const photosLength = listing.photos?.length ?? 0;
  const hasMultipleImages = photosLength > 1;
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: hasMultipleImages,
      align: "start",
      skipSnaps: false,
      dragFree: false,
    },
    []
  );

  const pointerDownPosition = useRef<{ x: number; y: number } | null>(null);
  const didDrag = useRef(false);

  const categoryAndCondition = useMemo(() => {
    const conditionLabel = t(`condition.${listing.condition}`, {
      defaultValue: listing.condition,
    });
    const parts = [listing.category?.name, conditionLabel].filter(
      (part): part is string => Boolean(part && part.trim())
    );
    return parts.join(" · ");
  }, [listing.category?.name, listing.condition, t]);

  // Guard currentImageIndex to prevent out-of-bounds access
  useEffect(() => {
    if (listing.photos && listing.photos.length > 0) {
      setCurrentImageIndex((prev) => Math.min(prev, photosLength - 1));
    } else {
      setCurrentImageIndex(0);
    }
  }, [listing.photos, listing.id, photosLength]);

  // Reset image state when listing changes
  useEffect(() => {
    setLoadedImages(new Set());
    setFailedImages(new Set());
  }, [listing.id]);

  // Sync selected index from Embla
  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setCurrentImageIndex(emblaApi.selectedScrollSnap());
    };

    onSelect();
    emblaApi.on("reInit", onSelect);
    emblaApi.on("select", onSelect);

    return () => {
      emblaApi.off("reInit", onSelect);
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  // Reset carousel when the listing changes
  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.scrollTo(0, true);
  }, [emblaApi, listing.id]);

  const handleOpen = () => {
    if (onOpen) {
      onOpen(listing);
      return;
    }
    void navigate(`/equipment/${listing.id}`);
  };

  const handleOpenKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleOpen();
    }
  };

  const handlePrevImage = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      emblaApi?.scrollPrev();
    },
    [emblaApi]
  );

  const handleNextImage = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      emblaApi?.scrollNext();
    },
    [emblaApi]
  );

  const handleWishlist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsTogglingFavorite(true);
      const wasWishlisted = isWishlisted;
      await toggleFavorite(listing.id);

      // Fire confetti on adding to favorites (not removing)
      if (!wasWishlisted) {
        fireHeartConfetti();
      }

      toast.success(
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
      toast.error(
        t("listing_card.favorite_error", {
          defaultValue: "Failed to update favorites",
        })
      );
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  // Preload adjacent carousel images for smoother navigation
  useEffect(() => {
    if (!listing.photos || listing.photos.length <= 1) return;

    const photosLength = listing.photos.length;
    const nextIndex = (currentImageIndex + 1) % photosLength;
    const prevIndex =
      currentImageIndex === 0 ? photosLength - 1 : currentImageIndex - 1;

    // Preload next and previous images
    [nextIndex, prevIndex].forEach((idx) => {
      const url = listing.photos?.[idx]?.photo_url;
      if (url) {
        const img = new Image();
        img.src = url;
      }
    });
  }, [currentImageIndex, listing.photos]);

  // Social proof badges
  const isTopRated = avgRating >= 4.5;
  const isPopular = (listing.reviews?.length ?? 0) >= 5;
  const showBadge = isTopRated || isPopular;

  return (
    <Card
      className={cn(
        "group h-full overflow-hidden p-0 gap-0 border-border/60 shadow-sm hover:shadow-md transition-shadow duration-200 ease-out",
        className
      )}
    >
      <div
        className="aspect-[4/3] bg-muted relative overflow-hidden cursor-pointer flex-shrink-0 image-zoom-container"
        onClick={() => {
          if (didDrag.current) {
            didDrag.current = false;
            return;
          }
          handleOpen();
        }}
        role={hasMultipleImages ? undefined : "button"}
        tabIndex={hasMultipleImages ? undefined : 0}
        aria-label={
          hasMultipleImages
            ? undefined
            : t("listing_card.view_listing", { title: listing.title })
        }
        onKeyDown={hasMultipleImages ? undefined : handleOpenKeyDown}
      >
        {photosLength > 0 ? (
          <>
            {hasMultipleImages ? (
              <div
                ref={emblaRef}
                className="h-full w-full overflow-hidden touch-pan-y"
                role="group"
                aria-roledescription="carousel"
                aria-label={t("listing_card.photo_carousel", {
                  title: listing.title,
                  defaultValue: "Photos for {{title}}",
                })}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "ArrowLeft") {
                    e.preventDefault();
                    emblaApi?.scrollPrev();
                    return;
                  }
                  if (e.key === "ArrowRight") {
                    e.preventDefault();
                    emblaApi?.scrollNext();
                    return;
                  }
                  handleOpenKeyDown(e);
                }}
                onPointerDown={(e) => {
                  pointerDownPosition.current = {
                    x: e.clientX,
                    y: e.clientY,
                  };
                  didDrag.current = false;
                }}
                onPointerMove={(e) => {
                  const start = pointerDownPosition.current;
                  if (!start) return;
                  const dx = Math.abs(e.clientX - start.x);
                  const dy = Math.abs(e.clientY - start.y);
                  if (dx > 6 || dy > 6) didDrag.current = true;
                }}
                onPointerUp={() => {
                  pointerDownPosition.current = null;
                }}
                onPointerCancel={() => {
                  pointerDownPosition.current = null;
                }}
              >
                <div className="flex h-full">
                  {listing.photos.map((photo, idx) => {
                    const isLoaded = loadedImages.has(idx);
                    const isFailed = failedImages.has(idx);
                    return (
                      <div
                        key={photo.id ?? photo.photo_url ?? idx}
                        className="relative min-w-0 shrink-0 grow-0 basis-full h-full"
                      >
                        {!isLoaded && !isFailed && (
                          <div className="absolute inset-0 bg-muted animate-pulse" />
                        )}
                        {isFailed ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-muted">
                            <Package className="h-12 w-12 mb-2 opacity-50" />
                            <span className="text-sm">
                              {t("listing_card.image_unavailable")}
                            </span>
                          </div>
                        ) : (
                          <img
                            src={photo.photo_url || ""}
                            alt={listing.title}
                            className={cn(
                              "w-full h-full object-cover transition-opacity duration-300",
                              isLoaded ? "opacity-100" : "opacity-0"
                            )}
                            loading={idx === 0 ? "eager" : "lazy"}
                            decoding="async"
                            draggable={false}
                            onLoad={() => {
                              setLoadedImages((prev) => {
                                if (prev.has(idx)) return prev;
                                const next = new Set(prev);
                                next.add(idx);
                                return next;
                              });
                            }}
                            onError={() => {
                              setFailedImages((prev) => {
                                if (prev.has(idx)) return prev;
                                const next = new Set(prev);
                                next.add(idx);
                                return next;
                              });
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <img
                src={listing.photos[0]?.photo_url || ""}
                alt={listing.title}
                className="w-full h-full object-cover"
                loading="eager"
                decoding="async"
              />
            )}

            {hasMultipleImages && (
              <>
                {/* Stronger, Airbnb-like carousel affordances */}
                <div
                  className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-black/25 to-transparent opacity-0 md:group-hover:opacity-100 transition-opacity pointer-events-none"
                  aria-hidden="true"
                />
                <div
                  className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-black/25 to-transparent opacity-0 md:group-hover:opacity-100 transition-opacity pointer-events-none"
                  aria-hidden="true"
                />

                <Button
                  onClick={handlePrevImage}
                  size="icon-sm"
                  variant="secondary"
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/95 text-foreground shadow-md hover:bg-white hover:shadow-lg dark:bg-gray-950/90 dark:hover:bg-gray-950 hidden md:inline-flex md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:scale-100 active:scale-100"
                  aria-label={t("listing_card.previous_image")}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleNextImage}
                  size="icon-sm"
                  variant="secondary"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/95 text-foreground shadow-md hover:bg-white hover:shadow-lg dark:bg-gray-950/90 dark:hover:bg-gray-950 hidden md:inline-flex md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:scale-100 active:scale-100"
                  aria-label={t("listing_card.next_image")}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                <div className="absolute bottom-2 right-2 rounded-full bg-black/55 text-white text-xs px-2 py-1 backdrop-blur-sm">
                  <span className="tabular-nums" aria-hidden="true">
                    {currentImageIndex + 1}/{photosLength}
                  </span>
                  <span className="sr-only">
                    {t("listing_card.photo_counter", {
                      current: currentImageIndex + 1,
                      total: photosLength,
                      defaultValue: "Photo {{current}} of {{total}}",
                    })}
                  </span>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-muted">
            <Package className="h-12 w-12 mb-2 opacity-50" />
            <span className="text-sm">{t("listing_card.no_image")}</span>
          </div>
        )}

        {/* Social proof badges */}
        {showBadge && (
          <div className="absolute top-2 left-2 flex gap-2 z-10">
            {isTopRated && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-amber-500/95 dark:bg-amber-600/95 text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow-lg backdrop-blur-sm animate-social-proof-enter">
                    <span>{t("listing_card.top_rated")}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {t("listing_card.top_rated_tooltip", {
                    rating: avgRating.toFixed(1),
                  })}
                </TooltipContent>
              </Tooltip>
            )}
            {isPopular && !isTopRated && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-blue-500/95 dark:bg-blue-600/95 text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow-lg backdrop-blur-sm animate-social-proof-enter">
                    <span>{t("listing_card.popular")}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {t("listing_card.popular_tooltip", {
                    count: listing.reviews?.length ?? 0,
                  })}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}

        {/* Wishlist button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => void handleWishlist(e)}
              disabled={isTogglingFavorite}
              className="absolute top-2 right-2 h-11 w-11 rounded-full bg-white/95 dark:bg-gray-950/90 hover:bg-white dark:hover:bg-gray-950 border border-black/10 dark:border-white/10 shadow-lg backdrop-blur-sm opacity-90 group-hover:opacity-100 transition-all flex items-center justify-center z-10 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={
                isWishlisted
                  ? t("listing_card.wishlist_remove")
                  : t("listing_card.wishlist_add")
              }
            >
              {isTogglingFavorite ? (
                <Loader2 className="h-5 w-5 text-gray-700 dark:text-gray-200 animate-spin" />
              ) : (
                <Heart
                  className={cn(
                    "h-5 w-5 transition-colors",
                    isWishlisted
                      ? "fill-red-500 text-red-500 animate-heartbeat"
                      : "text-gray-700 dark:text-gray-200"
                  )}
                />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {isTogglingFavorite
              ? t("listing_card.loading", { defaultValue: "Loading..." })
              : isWishlisted
              ? t("listing_card.wishlist_remove")
              : t("listing_card.wishlist_save")}
          </TooltipContent>
        </Tooltip>
      </div>
      <CardContent className="px-3 py-3 md:px-4 md:py-4">
        <div
          className="cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          onClick={handleOpen}
          role="button"
          tabIndex={0}
          aria-label={t("listing_card.view_listing", {
            title: listing.title,
          })}
          onKeyDown={handleOpenKeyDown}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-[15px] leading-snug line-clamp-1">
                {listing.title}
              </h3>
              <p
                className="text-sm text-muted-foreground line-clamp-1"
                title={listing.location}
              >
                {listing.location}
              </p>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {categoryAndCondition}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 text-sm text-foreground">
              {avgRating > 0 ? (
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <div className="flex items-center gap-1.5 cursor-pointer">
                      <Star className="h-4 w-4 fill-foreground text-foreground" />
                      <span className="font-medium tabular-nums">
                        {avgRating.toFixed(1)}
                      </span>
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80" align="end">
                    <div className="space-y-3">
                      {/* Owner Header */}
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border-2 border-border">
                          <AvatarImage
                            src={listing.owner?.avatar_url}
                            alt={listing.owner?.email || "Owner"}
                          />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {(listing.owner?.email || "O")
                              .slice(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground truncate">
                            {t("listing_card.owner_rating_hovercard.owner")}
                          </p>
                          <div className="flex items-center gap-1.5 text-sm">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            <span className="font-medium">
                              {avgRating.toFixed(1)}
                            </span>
                            <span className="text-muted-foreground">
                              ({reviewCount}{" "}
                              {reviewCount === 1
                                ? t(
                                    "listing_card.owner_rating_hovercard.reviews",
                                    {
                                      count: reviewCount,
                                    }
                                  )
                                : t(
                                    "listing_card.owner_rating_hovercard.reviews_plural",
                                    {
                                      count: reviewCount,
                                    }
                                  )}
                              )
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Rating Breakdown */}
                      {reviewCount > 0 && (
                        <>
                          <div className="h-px bg-border" />
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">
                              {t(
                                "listing_card.owner_rating_hovercard.rating_breakdown"
                              )}
                            </p>
                            {[5, 4, 3, 2, 1].map((rating) => {
                              const count =
                                ratingBreakdown[rating as 5 | 4 | 3 | 2 | 1];
                              const percentage =
                                reviewCount > 0
                                  ? (count / reviewCount) * 100
                                  : 0;
                              return (
                                <div
                                  key={rating}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <div className="flex items-center gap-0.5 w-16">
                                    {Array.from({ length: rating }).map(
                                      (_, i) => (
                                        <Star
                                          key={i}
                                          className="h-3 w-3 fill-amber-400 text-amber-400"
                                        />
                                      )
                                    )}
                                  </div>
                                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-amber-400 rounded-full transition-all"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground w-16 text-right tabular-nums">
                                    {count} ({Math.round(percentage)}%)
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </HoverCardContent>
                </HoverCard>
              ) : (
                <span className="text-muted-foreground">
                  {t("listing_card.new", { defaultValue: "New" })}
                </span>
              )}
            </div>
          </div>

          <div className="mt-2 text-sm text-foreground">
            <span className="font-semibold tabular-nums">
              {new Intl.NumberFormat(undefined, {
                style: "currency",
                currency: "USD",
              }).format(listing.daily_rate)}
            </span>{" "}
            <span className="text-muted-foreground">
              {t("listing_card.per_day")}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ListingCard;
