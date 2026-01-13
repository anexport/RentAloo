import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MobileExpandableDescriptionProps {
  description: string;
  maxLines?: number;
}

export const MobileExpandableDescription = ({
  description,
  maxLines = 3,
}: MobileExpandableDescriptionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Simple heuristic: if description is short, don't show expand button
  const isLongDescription = description.length > 150;

  return (
    <div className="space-y-3">
      <h2 className="text-title-lg font-semibold">Description</h2>
      <div className="relative">
        <p
          className={cn(
            "text-foreground leading-relaxed whitespace-pre-wrap transition-all duration-300",
            !isExpanded && isLongDescription && `line-clamp-${maxLines}`
          )}
        >
          {description}
        </p>
        {!isExpanded && isLongDescription && (
          <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        )}
      </div>

      {isLongDescription && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm font-medium -ml-2"
        >
          {isExpanded ? (
            <>
              Show less
              <ChevronUp className="ml-1 h-4 w-4" />
            </>
          ) : (
            <>
              Show more
              <ChevronDown className="ml-1 h-4 w-4" />
            </>
          )}
        </Button>
      )}
    </div>
  );
};
