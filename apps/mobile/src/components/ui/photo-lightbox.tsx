import { useState, useCallback, useRef, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface Photo {
  id: string;
  photo_url: string;
}

interface PhotoLightboxProps {
  photos: Photo[];
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
}

export const PhotoLightbox = ({
  photos,
  initialIndex = 0,
  open,
  onOpenChange,
  title = "Photo",
}: PhotoLightboxProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset state when opening or changing photos
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [open, initialIndex]);

  // Reset zoom when changing photos
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  }, [photos.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  }, [photos.length]);

  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.5, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => {
      const newScale = Math.max(prev - 0.5, 1);
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
      return newScale;
    });
  }, []);

  const handleDoubleClick = useCallback(() => {
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2);
    }
  }, [scale]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          handlePrev();
          break;
        case "ArrowRight":
          handleNext();
          break;
        case "Escape":
          onOpenChange(false);
          break;
        case "+":
        case "=":
          handleZoomIn();
          break;
        case "-":
          handleZoomOut();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handlePrev, handleNext, handleZoomIn, handleZoomOut, onOpenChange]);

  // Handle touch/mouse drag for panning when zoomed
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (scale <= 1) return;
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      positionRef.current = position;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [scale, position]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || scale <= 1) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPosition({
        x: positionRef.current.x + dx,
        y: positionRef.current.y + dy,
      });
    },
    [isDragging, scale]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle swipe for navigation (when not zoomed)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (scale > 1) return;
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    },
    [scale]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (scale > 1 || !touchStartRef.current) return;
      const touchEnd = {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY,
      };
      const dx = touchEnd.x - touchStartRef.current.x;
      const dy = touchEnd.y - touchStartRef.current.y;

      // Only trigger swipe if horizontal movement is significant
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) {
          handlePrev();
        } else {
          handleNext();
        }
      }
      touchStartRef.current = null;
    },
    [scale, handlePrev, handleNext]
  );

  if (!open) return null;

  const currentPhoto = photos[currentIndex];

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} - Photo ${currentIndex + 1} of ${photos.length}`}
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-black/50 backdrop-blur-sm">
        <div className="text-white text-sm font-medium">
          {currentIndex + 1} / {photos.length}
        </div>
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 1}
            className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-5 w-5 text-white" />
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 3}
            className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-5 w-5 text-white" />
          </button>
          {/* Close button */}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors ml-2"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>

      {/* Image container */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden flex items-center justify-center"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
        style={{ touchAction: scale > 1 ? "none" : "pan-x" }}
      >
        {currentPhoto && (
          <img
            src={currentPhoto.photo_url}
            alt={`${title} - Photo ${currentIndex + 1}`}
            className={cn(
              "max-w-full max-h-full object-contain transition-transform select-none",
              isDragging ? "cursor-grabbing" : scale > 1 ? "cursor-grab" : "cursor-zoom-in"
            )}
            style={{
              transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            }}
            draggable={false}
          />
        )}

        {/* Navigation arrows - only show when not zoomed */}
        {photos.length > 1 && scale === 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-6 w-6 text-white" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
              aria-label="Next photo"
            >
              <ChevronRight className="h-6 w-6 text-white" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip / dot indicators */}
      {photos.length > 1 && (
        <div className="flex-shrink-0 px-4 py-3 bg-black/50 backdrop-blur-sm">
          <div className="flex justify-center gap-2 overflow-x-auto">
            {photos.map((photo, idx) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={cn(
                  "flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all",
                  idx === currentIndex
                    ? "border-white opacity-100"
                    : "border-transparent opacity-50 hover:opacity-75"
                )}
                aria-label={`Go to photo ${idx + 1}`}
                aria-current={idx === currentIndex ? "true" : "false"}
              >
                <img
                  src={photo.photo_url}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Safe area padding for bottom notch */}
      <div className="h-[env(safe-area-inset-bottom)] bg-black/50" />
    </div>
  );
};
