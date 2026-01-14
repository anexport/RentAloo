import { CheckCircle2, Package } from "lucide-react";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface Category {
  name: string;
}

interface EquipmentMetadataCardProps {
  condition: string;
  category: Category | null;
}

export const EquipmentMetadataCard = ({
  condition,
  category,
}: EquipmentMetadataCardProps) => {
  const getConditionTooltip = (condition: string) => {
    const normalized = condition.toLowerCase();
    switch (normalized) {
      case "new":
        return "Brand new, never used";
      case "excellent":
        return "Like new with minimal signs of use";
      case "good":
        return "Minor wear, fully functional";
      case "fair":
        return "Normal wear and tear, works perfectly";
      default:
        return "Condition of the equipment";
    }
  };

  return (
    <Card>
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Condition */}
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground font-medium">
                Condition
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="capitalize w-fit cursor-help"
                  >
                    {condition}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  {getConditionTooltip(condition)}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Vertical divider */}
          <div className="h-8 w-px bg-border" />

          {/* Category */}
          <div className="flex items-center gap-2">
            {category &&
              (() => {
                const CategoryIcon = getCategoryIcon(category.name);
                return (
                  <CategoryIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                );
              })()}
            {!category && (
              <Package className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground font-medium">
                Category
              </span>
              <Badge variant="secondary" className="w-fit">
                {category?.name || "N/A"}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
