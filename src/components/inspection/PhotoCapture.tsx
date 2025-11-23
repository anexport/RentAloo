import type { KeyboardEvent } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";

interface PhotoCaptureProps {
  photos: File[];
  onPhotosChange: (photos: File[]) => void;
  minPhotos?: number;
  maxPhotos?: number;
}

export default function PhotoCapture({
  photos,
  onPhotosChange,
  minPhotos = 3,
  maxPhotos = 10,
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Equipment Photos</h3>
        <span className="text-sm text-muted-foreground">
          {photos.length} / {minPhotos} minimum
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {previews.map((preview, index) => (
          <Card
            key={index}
            className="relative aspect-square overflow-hidden"
          >
            <img
              src={preview}
              alt={`Photo ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={() => removePhoto(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </Card>
        ))}

        {photos.length < maxPhotos && (
          <Card
            role="button"
            tabIndex={0}
            aria-label="Add a new equipment photo"
            className="aspect-square flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={handleAddPhotoClick}
            onKeyDown={handleAddPhotoKeyDown}
          >
            <Camera className="h-8 w-8 mb-2 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Add Photo</span>
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

      {photos.length < minPhotos && (
        <p className="text-sm text-destructive">
          Please add at least {minPhotos - photos.length} more photo(s)
        </p>
      )}
    </div>
  );
}
