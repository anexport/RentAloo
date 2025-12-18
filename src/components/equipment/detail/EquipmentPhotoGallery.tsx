import { useState, useCallback } from "react";
import { PhotoLightbox } from "@/components/ui/photo-lightbox";
import { cn } from "@/lib/utils";

interface Photo {
  id: string;
  photo_url: string;
}

interface EquipmentPhotoGalleryProps {
  photos: Photo[];
  equipmentTitle: string;
}

// Progressive loading image component
const ProgressiveImage = ({
  src,
  alt,
  className,
  onClick,
  ariaLabel,
}: {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
}) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative overflow-hidden border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        className
      )}
      aria-label={ariaLabel}
    >
      {/* Blur placeholder */}
      {!loaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        className={cn(
          "w-full h-full object-cover cursor-zoom-in hover:opacity-90 transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0"
        )}
        loading="lazy"
        onLoad={() => setLoaded(true)}
      />
    </button>
  );
};

export const EquipmentPhotoGallery = ({
  photos,
  equipmentTitle,
}: EquipmentPhotoGalleryProps) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  if (photos.length === 0) {
    return null;
  }

  const primaryPhoto = photos[0];
  const secondaryPhotos = photos.slice(1, 5); // Up to 4 secondary photos

  return (
    <>
      <div className="space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-[60%_40%] gap-2 h-[300px] sm:h-[400px] md:h-[500px]">
          {/* Primary large image */}
          <ProgressiveImage
            src={primaryPhoto.photo_url}
            alt={equipmentTitle}
            className="rounded-lg"
            onClick={() => openLightbox(0)}
            ariaLabel={`View ${equipmentTitle} photo in fullscreen`}
          />

          {/* Secondary images grid */}
          {secondaryPhotos.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {secondaryPhotos.map((photo, idx) => (
                <div key={photo.id} className="relative">
                  <ProgressiveImage
                    src={photo.photo_url}
                    alt={`${equipmentTitle} - ${idx + 2}`}
                    className="rounded-lg w-full h-full"
                    onClick={() => openLightbox(idx + 1)}
                    ariaLabel={`View photo ${idx + 2} in fullscreen`}
                  />
                  {photos.length > 5 && idx === 3 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-semibold pointer-events-none rounded-lg">
                      +{photos.length - 5} more
                    </div>
                  )}
                </div>
              ))}
              {/* Fill empty cells if needed */}
              {secondaryPhotos.length < 4 &&
                Array.from({ length: 4 - secondaryPhotos.length }).map(
                  (_, idx) => (
                    <div
                      key={`empty-${idx}`}
                      className="rounded-lg border border-border bg-muted"
                      aria-hidden="true"
                    />
                  )
                )}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox for fullscreen photo viewing */}
      <PhotoLightbox
        photos={photos}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        title={equipmentTitle}
      />
    </>
  );
};

