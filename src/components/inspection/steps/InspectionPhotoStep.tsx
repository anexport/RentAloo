import PhotoCapture from "@/components/inspection/PhotoCapture";
import { cn } from "@/lib/utils";

interface InspectionPhotoStepProps {
  photos: File[];
  onPhotosChange: (photos: File[]) => void;
  minPhotos?: number;
  maxPhotos?: number;
  className?: string;
}

export default function InspectionPhotoStep({
  photos,
  onPhotosChange,
  minPhotos = 3,
  maxPhotos = 10,
  className,
}: InspectionPhotoStepProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Header - centered on mobile */}
      <div className="text-center space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">
          Photo Documentation
        </h2>
        <p className="text-sm text-muted-foreground">
          Take clear photos to document the equipment's current condition.
        </p>
      </div>

      <PhotoCapture
        photos={photos}
        onPhotosChange={onPhotosChange}
        minPhotos={minPhotos}
        maxPhotos={maxPhotos}
      />
    </div>
  );
}
