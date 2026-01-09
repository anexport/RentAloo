import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { ContentCard } from "./ContentCard";

type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

interface EmptyStateProps {
  /** Icon to display */
  icon: LucideIcon;
  /** Main title text */
  title: string;
  /** Description text */
  description: string;
  /** Optional action element (button, link, etc.) */
  action?: React.ReactNode;
  /** Optional secondary action */
  secondaryAction?: React.ReactNode;
  /** Additional className */
  className?: string;
  /** Icon color class */
  iconColor?: string;
  /** Whether to use compact layout */
  compact?: boolean;
  /** Heading level for semantic flexibility (default: 'h3') */
  headingLevel?: HeadingLevel;
}

/**
 * EmptyState - Unified empty state component for consistent messaging
 *
 * Used when:
 * - A list has no items
 * - A search returns no results
 * - A feature hasn't been used yet
 *
 * Provides consistent styling and spacing across all empty states.
 */
const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  iconColor = "text-muted-foreground",
  compact = false,
  headingLevel = "h3",
}: EmptyStateProps) => {
  // Runtime guards for required props
  if (!Icon || typeof Icon !== "function") {
    console.warn("EmptyState: Invalid or missing 'icon' prop");
    return null;
  }
  if (!title || typeof title !== "string" || title.trim() === "") {
    console.warn("EmptyState: Invalid or missing 'title' prop");
    return null;
  }
  if (!description || typeof description !== "string" || description.trim() === "") {
    console.warn("EmptyState: Invalid or missing 'description' prop");
    return null;
  }

  const HeadingTag = headingLevel;

  return (
    <ContentCard
      variant="dashed"
      padding="none"
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8 px-6" : "py-12 px-8",
        className
      )}
    >
      {/* Icon container with subtle background */}
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl",
          "bg-muted/60 ring-1 ring-border/30",
          compact ? "w-12 h-12 mb-3" : "w-14 h-14 mb-4"
        )}
      >
        <Icon
          className={cn(
            iconColor,
            compact ? "h-6 w-6" : "h-7 w-7"
          )}
          aria-hidden="true"
        />
      </div>

      {/* Title */}
      <HeadingTag
        className={cn(
          "font-semibold text-foreground",
          compact ? "text-base mb-1" : "text-lg mb-1.5"
        )}
      >
        {title}
      </HeadingTag>

      {/* Description */}
      <p
        className={cn(
          "text-muted-foreground max-w-sm",
          compact ? "text-sm mb-4" : "text-sm mb-6"
        )}
      >
        {description}
      </p>

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {action}
          {secondaryAction}
        </div>
      )}
    </ContentCard>
  );
};

export { EmptyState };
