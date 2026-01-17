import type { KeyboardEvent } from "react";
import { Camera, X, ImagePlus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";
import { cn } from "@/lib/utils";

interface PhotoCaptureProps {
  photos: File[];
  onPhotosChange: (photos: File[]) => void;
  minPhotos?: number;
  maxPhotos?: number;
  className?: string;
}

export default function PhotoCapture({
  photos,
  onPhotosChange,
  minPhotos = 3,
  maxPhotos = 10,
  className,
}: PhotoCaptureProps) {
  const { previews, fileInputRef, handleFileSelect, removePhoto } =
    usePhotoUpload({
      photos,
      onPhotosChange,
      maxPhotos,
    });

  const handleAddPhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleAddPhotoKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const photosRemaining = Math.max(0, minPhotos - photos.length);
  const hasMinPhotos = photos.length >= minPhotos;
  const requiredPhotos = minPhotos;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">Equipment Photos</h3>
          <p className="text-xs text-muted-foreground">
            Capture from multiple angles
          </p>
        </div>
        <div
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
            hasMinPhotos
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          )}
          aria-label={`Photo progress ${photos.length} of ${requiredPhotos}`}
        >
          {hasMinPhotos ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <Camera className="h-3.5 w-3.5" />
          )}
          {photos.length}/{requiredPhotos}
        </div>
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-3 gap-2">
        {/* Existing photos */}
        {previews.map((preview, index) => (
          <Card
            key={index}
            className="relative aspect-square overflow-hidden"
          >
            <img
              src={preview}
              alt={`Photo ${index + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-7 w-7 rounded-full shadow-md"
              onClick={() => removePhoto(index)}
              aria-label={`Remove photo ${index + 1}`}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
            <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
              {index + 1}
            </div>
          </Card>
        ))}

        {/* Add photo button */}
        {photos.length < maxPhotos && (
          <Card
            role="button"
            tabIndex={0}
            aria-label="Add a new equipment photo"
            className={cn(
              "aspect-square flex flex-col items-center justify-center cursor-pointer transition-all duration-200 border-2 border-dashed",
              "hover:bg-primary/5 hover:border-primary/50 active:scale-[0.98]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              !hasMinPhotos && "border-primary/50 bg-primary/5",
              // Center when alone on row (photo count divisible by 3, including 0)
              photos.length % 3 === 0 && "col-start-2"
            )}
            onClick={handleAddPhotoClick}
            onKeyDown={handleAddPhotoKeyDown}
          >
            <div
              className={cn(
                "flex flex-col items-center gap-1.5",
                !hasMinPhotos && "text-primary"
              )}
            >
              <div
                className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center",
                  hasMinPhotos ? "bg-muted" : "bg-primary/10"
                )}
              >
                <ImagePlus
                  className={cn(
                    "h-5 w-5",
                    hasMinPhotos ? "text-muted-foreground" : "text-primary"
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  hasMinPhotos ? "text-muted-foreground" : "text-primary"
                )}
              >
                {hasMinPhotos ? "Add" : "Add Photo"}
              </span>
            </div>
          </Card>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/heic,image/webp"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        capture="environment"
      />

      {/* Status message */}
      {!hasMinPhotos && (
        <div className="flex items-center gap-1.5 p-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <Camera className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Add {photosRemaining} more photo{photosRemaining !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* Tips - collapsed */}
      <p className="text-[11px] text-muted-foreground">
        Tip: Include overall shots and close-ups of any wear or damage
      </p>
    </div>
  );
}
