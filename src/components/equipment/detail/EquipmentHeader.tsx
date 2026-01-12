import { MapPin } from "lucide-react";
import StarRating from "@/components/reviews/StarRating";
import { Badge } from "@/components/ui/badge";
import { getCategoryIcon } from "@/lib/categoryIcons";
import type { Database } from "@/lib/database.types";

type Category = Database["public"]["Tables"]["categories"]["Row"];

interface EquipmentHeaderProps {
  title: string;
  location: string;
  condition: string;
  avgRating: number;
  reviewCount: number;
  category?: Category | null;
}

export const EquipmentHeader = ({
  title,
  location,
  condition,
  avgRating,
  reviewCount,
  category,
}: EquipmentHeaderProps) => {
  const CategoryIcon = category ? getCategoryIcon(category.name) : null;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-headline-md font-bold text-foreground">{title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-label-md text-muted-foreground">
            {category && CategoryIcon && (
              <div className="flex items-center gap-1.5">
                <CategoryIcon className="h-4 w-4 shrink-0" />
                <span>{category.name}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" /> {location}
            </div>
            {avgRating > 0 && (
              <div className="flex items-center gap-2">
                <StarRating rating={avgRating} size="sm" />
                <span className="font-medium">{avgRating.toFixed(1)}</span>
                {reviewCount > 0 && <span>({reviewCount})</span>}
              </div>
            )}
            <Badge variant="outline" className="capitalize">
              {condition}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
};

