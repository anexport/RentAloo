import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type CollapsibleSectionProps = {
  title: string;
  icon?: React.ElementType;
  count?: number;
  defaultExpanded?: boolean;
  emptyMessage?: string;
  seeAllHref?: string;
  seeAllLabel?: string;
  children: ReactNode;
  className?: string;
  loading?: boolean;
  loadingSlot?: ReactNode;
};

export default function CollapsibleSection({
  title,
  icon: Icon,
  count,
  defaultExpanded = false,
  emptyMessage = "No items",
  seeAllHref,
  seeAllLabel = "See all",
  children,
  className,
  loading = false,
  loadingSlot,
}: CollapsibleSectionProps) {
  const [value, setValue] = useState(defaultExpanded ? "content" : "");
  const isExpanded = value === "content";
  const hasItems = count === undefined || count > 0;

  return (
    <Accordion
      type="single"
      collapsible
      value={value}
      onValueChange={setValue}
      className={cn("w-full", className)}
    >
      <AccordionItem value="content" className="border-none">
        <AccordionTrigger className="hover:no-underline py-3 px-0 gap-3 [&>svg]:hidden">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2.5">
              {Icon && (
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <span className="font-semibold text-base text-foreground">
                {title}
              </span>
              {count !== undefined && count > 0 && (
                <Badge
                  variant="secondary"
                  className="h-5 min-w-5 px-1.5 text-xs font-medium"
                >
                  {count}
                </Badge>
              )}
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                isExpanded && "rotate-180"
              )}
            />
          </div>
        </AccordionTrigger>
        <AccordionContent className="pt-2 pb-4">
          {loading ? (
            loadingSlot || (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-16 rounded-lg bg-muted animate-pulse"
                  />
                ))}
              </div>
            )
          ) : hasItems ? (
            <div className="space-y-2">
              {children}
              {seeAllHref && (
                <div className="pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground hover:text-foreground"
                    asChild
                  >
                    <a href={seeAllHref}>{seeAllLabel}</a>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">{emptyMessage}</p>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
