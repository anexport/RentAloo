import { Badge } from "@/components/ui/badge";
import { formatDateForDisplay } from "@/lib/utils";

interface ConditionVisualizationProps {
  condition: string;
  /**
   * Last inspection date (optional)
   */
  lastInspectionDate?: string;
}

export const ConditionVisualization = ({
  condition,
  lastInspectionDate,
}: ConditionVisualizationProps) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">Condition:</span>
        <Badge 
          variant="outline" 
          className="capitalize"
          aria-label={`Equipment condition: ${condition || "not specified"}`}
        >
          {condition || "Not specified"}
        </Badge>
      </div>
      
      {lastInspectionDate && (
        <p className="text-xs text-muted-foreground italic">
          Last inspected: {formatDateForDisplay(lastInspectionDate)}
        </p>
      )}
      
      <p className="text-xs text-muted-foreground">
        Condition ratings are based on owner assessment and may vary. Inspect equipment before use.
      </p>
    </div>
  );
};

