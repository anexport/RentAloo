import { useState, useEffect } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ChecklistItem, ChecklistItemStatus } from "@/types/inspection";

interface InspectionChecklistStepProps {
  categorySlug?: string;
  items: ChecklistItem[];
  onItemsChange: (items: ChecklistItem[]) => void;
  className?: string;
}

const CHECKLIST_TEMPLATES: Record<string, string[]> = {
  hiking: [
    "Straps and buckles",
    "Zippers",
    "Frame integrity",
    "Fabric condition",
  ],
  climbing: ["Harness webbing", "Buckles", "Belay loops", "Stitching"],
  skiing: ["Boot shells", "Buckles", "Liners", "Sole condition"],
  snowboarding: ["Board surface", "Bindings", "Edges", "Base condition"],
  camping: ["Tent poles", "Fabric", "Zippers", "Stakes and guy lines"],
  cycling: ["Frame", "Wheels", "Brakes", "Gears and chain"],
  water_sports: ["Hull condition", "Paddles", "Safety equipment", "Straps"],
  default: [
    "Overall condition",
    "Functional components",
    "Visible wear",
    "Safety features",
  ],
};

const STATUS_CONFIG: Record<
  ChecklistItemStatus,
  {
    label: string;
    icon: typeof CheckCircle2;
    color: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  good: {
    label: "Good",
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    borderColor: "border-green-300 dark:border-green-700",
  },
  fair: {
    label: "Fair",
    icon: AlertTriangle,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    borderColor: "border-amber-300 dark:border-amber-700",
  },
  damaged: {
    label: "Damaged",
    icon: AlertCircle,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    borderColor: "border-red-300 dark:border-red-700",
  },
};

export default function InspectionChecklistStep({
  categorySlug,
  items,
  onItemsChange,
  className,
}: InspectionChecklistStepProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const template =
    CHECKLIST_TEMPLATES[categorySlug || ""] || CHECKLIST_TEMPLATES.default;

  // Initialize items if empty
  useEffect(() => {
    if (items.length === 0) {
      const initialItems: ChecklistItem[] = template.map((item) => ({
        item,
        status: "good" as ChecklistItemStatus,
        notes: "",
      }));
      onItemsChange(initialItems);
    }
  }, [items.length, template, onItemsChange]);

  const updateItem = (index: number, updates: Partial<ChecklistItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    onItemsChange(newItems);
  };

  const handleStatusChange = (index: number, status: ChecklistItemStatus) => {
    updateItem(index, { status });
    // Auto-expand notes for fair/damaged items
    if (status !== "good") {
      setExpandedIndex(index);
    }
  };

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header - centered on mobile */}
      <div className="text-center space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">
          Condition Checklist
        </h2>
        <p className="text-sm text-muted-foreground">
          Rate each item. Add notes for anything not in good condition.
        </p>
      </div>

      {/* Legend - centered */}
      <div className="flex flex-wrap justify-center gap-2">
        {(Object.keys(STATUS_CONFIG) as ChecklistItemStatus[]).map((status) => {
          const config = STATUS_CONFIG[status];
          const Icon = config.icon;
          return (
            <div
              key={status}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full text-xs",
                config.bgColor
              )}
            >
              <Icon className={cn("h-3 w-3", config.color)} />
              <span className={config.color}>{config.label}</span>
            </div>
          );
        })}
      </div>

      {/* Checklist items */}
      <div className="space-y-2">
        {items.map((item, index) => {
          const config = STATUS_CONFIG[item.status];
          const Icon = config.icon;
          const isExpanded = expandedIndex === index;
          const showNotes = item.status !== "good" || isExpanded;

          return (
            <Card
              key={index}
              className={cn(
                "transition-all duration-200",
                config.borderColor,
                "border"
              )}
            >
              <CardContent className="p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={cn(
                        "h-7 w-7 rounded-full flex items-center justify-center shrink-0",
                        config.bgColor
                      )}
                    >
                      <Icon className={cn("h-3.5 w-3.5", config.color)} />
                    </div>
                    <span className="text-sm font-medium truncate">{item.item}</span>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpand(index)}
                    className="shrink-0 h-7 w-7 p-0"
                    aria-label={isExpanded ? "Collapse" : "Expand"}
                  >
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        isExpanded && "rotate-180"
                      )}
                    />
                  </Button>
                </div>

                {/* Status buttons */}
                <div className="grid grid-cols-3 gap-1.5">
                  {(Object.keys(STATUS_CONFIG) as ChecklistItemStatus[]).map(
                    (status) => {
                      const statusConfig = STATUS_CONFIG[status];
                      const StatusIcon = statusConfig.icon;
                      const isSelected = item.status === status;

                      return (
                        <Button
                          key={status}
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange(index, status)}
                          className={cn(
                            "h-10 w-full justify-center text-xs transition-all active:scale-[0.98]",
                            isSelected && [
                              statusConfig.bgColor,
                              statusConfig.borderColor,
                              statusConfig.color,
                            ]
                          )}
                          aria-pressed={isSelected}
                        >
                          <StatusIcon
                            className={cn(
                              "h-3.5 w-3.5 mr-1",
                              isSelected
                                ? statusConfig.color
                                : "text-muted-foreground"
                            )}
                          />
                          {statusConfig.label}
                        </Button>
                      );
                    }
                  )}
                </div>

                {/* Notes section */}
                <div
                  className={cn(
                    "grid transition-all duration-300",
                    showNotes
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="overflow-hidden space-y-1.5">
                    <label
                      htmlFor={`notes-${index}`}
                      className="text-xs font-medium text-muted-foreground"
                    >
                      {item.status !== "good"
                        ? "Describe the issue"
                        : "Notes (optional)"}
                    </label>
                    <Textarea
                      id={`notes-${index}`}
                      value={item.notes || ""}
                      onChange={(e) =>
                        updateItem(index, { notes: e.target.value })
                      }
                      placeholder={
                        item.status !== "good"
                          ? "Describe the condition..."
                          : "Any observations..."
                      }
                      rows={2}
                      className="resize-none text-sm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
