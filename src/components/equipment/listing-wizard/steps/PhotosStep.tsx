import { useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { Upload, ImageIcon } from "lucide-react";
import SmartTip from "../components/SmartTip";
import PhotoSortable from "../components/PhotoSortable";
import type { WizardPhoto } from "../hooks/useListingWizard";

const MAX_PHOTOS = 5;

interface PhotosStepProps {
  photos: WizardPhoto[];
  onPhotosChange: (photos: WizardPhoto[]) => void;
  onAddPhotos: (photos: WizardPhoto[]) => void;
  onRemovePhoto: (id: string) => void;
  onReorderPhotos: (fromIndex: number, toIndex: number) => void;
}

export default function PhotosStep({
  photos,
  onPhotosChange,
  onAddPhotos,
  onRemovePhoto,
}: PhotosStepProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = photos.findIndex((p) => p.id === active.id);
        const newIndex = photos.findIndex((p) => p.id === over.id);
        onPhotosChange(arrayMove(photos, oldIndex, newIndex));
      }
    },
    [photos, onPhotosChange]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      const remainingSlots = MAX_PHOTOS - photos.length;
      const filesToAdd = files.slice(0, remainingSlots);

      const newPhotos: WizardPhoto[] = [];

      filesToAdd.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            newPhotos.push({
              id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              file,
              preview: reader.result,
              isExisting: false,
            });

            // When all files are read, add them
            if (newPhotos.length === filesToAdd.length) {
              onAddPhotos(newPhotos);
            }
          }
        };
        reader.readAsDataURL(file);
      });

      // Reset input
      e.target.value = "";
    },
    [photos.length, onAddPhotos]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      e.stopPropagation();

      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (files.length === 0) return;

      const remainingSlots = MAX_PHOTOS - photos.length;
      const filesToAdd = files.slice(0, remainingSlots);

      const newPhotos: WizardPhoto[] = [];

      filesToAdd.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            newPhotos.push({
              id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              file,
              preview: reader.result,
              isExisting: false,
            });

            if (newPhotos.length === filesToAdd.length) {
              onAddPhotos(newPhotos);
            }
          }
        };
        reader.readAsDataURL(file);
      });
    },
    [photos.length, onAddPhotos]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const remainingSlots = MAX_PHOTOS - photos.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Add photos of your equipment</h2>
        <p className="text-muted-foreground">
          Great photos help renters see what they're booking. Drag to reorder - the first photo will
          be your main image.
        </p>
      </div>

      {/* Smart Tip */}
      <SmartTip variant="boost">
        Listings with 5 high-quality photos get <strong>3x more bookings</strong>. Show different
        angles, close-ups of details, and the equipment in use.
      </SmartTip>

      {/* Photo Grid with Drag and Drop */}
      <div className="space-y-4">
        {photos.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {photos.map((photo, index) => (
                  <PhotoSortable
                    key={photo.id}
                    photo={photo}
                    index={index}
                    onRemove={() => onRemovePhoto(photo.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Upload Area */}
        {remainingSlots > 0 && (
          <label
            htmlFor="photo-upload"
            className="flex flex-col items-center justify-center min-h-[200px] border-2 border-dashed border-muted-foreground/30 rounded-xl cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all duration-200"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              type="file"
              id="photo-upload"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-3 p-8">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Upload className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-base font-medium text-foreground">
                  {photos.length === 0 ? "Upload photos" : "Add more photos"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Drag and drop or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {remainingSlots} {remainingSlots === 1 ? "slot" : "slots"} remaining • JPG, PNG,
                  WebP up to 5MB
                </p>
              </div>
            </div>
          </label>
        )}

        {/* Photo Count Indicator */}
        {photos.length > 0 && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ImageIcon className="w-4 h-4" />
              <span>
                {photos.length} of {MAX_PHOTOS} photos
              </span>
            </div>
            {photos.length < 5 && (
              <span className="text-muted-foreground">Add {5 - photos.length} more for best results</span>
            )}
            {photos.length === 5 && (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                Perfect! You have the ideal number of photos
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tips for great photos */}
      {photos.length === 0 && (
        <div className="bg-muted/50 rounded-lg p-4">
          <h3 className="font-medium text-foreground mb-3">Tips for great photos:</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Use natural lighting or well-lit indoor spaces</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Show the equipment from multiple angles</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Include close-ups of important features or details</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Show any accessories that come with the rental</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
