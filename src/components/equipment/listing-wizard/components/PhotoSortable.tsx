import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X, GripVertical, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WizardPhoto } from "../hooks/useListingWizard";

interface PhotoSortableProps {
  photo: WizardPhoto;
  index: number;
  onRemove: () => void;
}

export default function PhotoSortable({ photo, index, onRemove }: PhotoSortableProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isPrimary = index === 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group aspect-square rounded-lg overflow-hidden border-2 bg-muted",
        isDragging ? "z-50 shadow-2xl border-primary opacity-90" : "border-transparent",
        isPrimary && !isDragging && "ring-2 ring-primary ring-offset-2"
      )}
    >
      {/* Image */}
      <img
        src={photo.preview}
        alt={`Photo ${index + 1}`}
        className="w-full h-full object-cover"
        draggable={false}
      />

      {/* Drag Handle Overlay */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "absolute inset-0 flex items-center justify-center bg-black/0 transition-all cursor-grab active:cursor-grabbing",
          "group-hover:bg-black/30"
        )}
      >
        <div
          className={cn(
            "p-2 rounded-full bg-white/90 shadow-lg opacity-0 transition-opacity",
            "group-hover:opacity-100"
          )}
        >
          <GripVertical className="w-5 h-5 text-gray-700" />
        </div>
      </div>

      {/* Primary Badge */}
      {isPrimary && (
        <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-lg">
          <Star className="w-3 h-3 fill-current" />
          <span>Cover</span>
        </div>
      )}

      {/* Photo Number (non-primary) */}
      {!isPrimary && (
        <div className="absolute bottom-2 left-2 w-6 h-6 rounded-full bg-black/60 text-white text-xs font-medium flex items-center justify-center">
          {index + 1}
        </div>
      )}

      {/* Remove Button */}
      <Button
        type="button"
        variant="destructive"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className={cn(
          "absolute top-2 right-2 w-8 h-8 rounded-full shadow-lg transition-opacity",
          "opacity-0 group-hover:opacity-100",
          "md:opacity-0 max-md:opacity-100"
        )}
        aria-label="Remove photo"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
