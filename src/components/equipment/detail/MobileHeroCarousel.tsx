import { useState, useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Photo {
  id?: string;
  photo_url: string;
}

interface MobileHeroCarouselProps {
  photos: Photo[];
  equipmentTitle: string;
  onPhotoCountClick?: () => void;
}

export const MobileHeroCarousel = ({
  photos,
  equipmentTitle,
  onPhotoCountClick,
}: MobileHeroCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(
    () => new Set()
  );
  const [failedImages, setFailedImages] = useState<Set<number>>(
    () => new Set()
  );

  const hasMultiplePhotos = photos.length > 1;
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: hasMultiplePhotos,
      align: "start",
      skipSnaps: false,
      dragFree: false,
    },
    []
  );

  // Sync selected index from Embla
  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setCurrentIndex(emblaApi.selectedScrollSnap());
    };

    onSelect();
    emblaApi.on("reInit", onSelect);
    emblaApi.on("select", onSelect);

    return () => {
      emblaApi.off("reInit", onSelect);
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  // Preload adjacent images for smoother navigation
  useEffect(() => {
    if (photos.length <= 1) return;

    const photosLength = photos.length;
    const nextIndex = (currentIndex + 1) % photosLength;
    const prevIndex = currentIndex === 0 ? photosLength - 1 : currentIndex - 1;

    [nextIndex, prevIndex].forEach((idx) => {
      const url = photos[idx]?.photo_url;
      if (url) {
        const img = new Image();
        img.src = url;
      }
    });
  }, [currentIndex, photos]);

  const handleCarouselClick = useCallback(() => {
    if (onPhotoCountClick) {
      onPhotoCountClick();
    }
  }, [onPhotoCountClick]);

  if (photos.length === 0) {
    return (
      <div className="relative w-full h-[55dvh] bg-muted flex flex-col items-center justify-center text-muted-foreground">
        <Package className="h-16 w-16 mb-3 opacity-50" />
        <span className="text-sm">No images available</span>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-[55dvh] bg-muted overflow-hidden"
      onClick={handleCarouselClick}
      role={onPhotoCountClick ? "button" : undefined}
      aria-label={
        onPhotoCountClick
          ? `View all ${photos.length} photos of ${equipmentTitle}`
          : undefined
      }
    >
      <div
        ref={emblaRef}
        className="h-full w-full overflow-hidden touch-pan-y cursor-pointer"
        role="group"
        aria-roledescription="carousel"
        aria-label={`Photos for ${equipmentTitle}`}
      >
        <div className="flex h-full">
          {photos.map((photo, idx) => {
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
                    <Package className="h-16 w-16 mb-3 opacity-50" />
                    <span className="text-sm">Image unavailable</span>
                  </div>
                ) : (
                  <img
                    src={photo.photo_url || ""}
                    alt={`${equipmentTitle} - Photo ${idx + 1}`}
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

      {/* Dot indicators - cleaner than counter */}
      {hasMultiplePhotos && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {photos.map((_, idx) => (
            <div
              key={idx}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-all duration-300",
                idx === currentIndex
                  ? "bg-white w-6"
                  : "bg-white/60 hover:bg-white/80"
              )}
              aria-label={`Photo ${idx + 1} of ${photos.length}`}
              aria-current={idx === currentIndex}
            />
          ))}
        </div>
      )}

      {/* Photo count badge in top-right corner */}
      {hasMultiplePhotos && onPhotoCountClick && (
        <div className="absolute top-4 right-4 rounded-lg bg-black/60 text-white text-sm px-3 py-1.5 backdrop-blur-sm font-medium z-10">
          <span className="tabular-nums">
            {currentIndex + 1} / {photos.length}
          </span>
        </div>
      )}
    </div>
  );
};
