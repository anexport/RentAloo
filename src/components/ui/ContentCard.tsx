import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

/**
 * ContentCard variants for different use cases across the dashboard
 */
const contentCardVariants = cva(
  // Base styles - consistent across all variants
  [
    "rounded-2xl border transition-all duration-300 ease-out",
    "bg-card text-card-foreground",
  ],
  {
    variants: {
      variant: {
        /** Default card with subtle shadow */
        default: [
          "border-border/50 shadow-sm",
          "hover:border-border hover:shadow-md",
        ],
        /** Flat card without shadow or hover effects */
        flat: "border-border/40",
        /** Ghost card with minimal styling */
        ghost: "border-transparent bg-transparent",
        /** Elevated card with stronger shadow */
        elevated: [
          "border-border/30 shadow-md",
          "hover:shadow-lg",
        ],
        /** Interactive card for clickable items */
        interactive: [
          "border-border/50 shadow-sm cursor-pointer",
          "hover:border-primary/30 hover:shadow-md",
          "active:translate-y-0 active:shadow-sm",
        ],
        /** Dashed border for empty states */
        dashed: "border-dashed border-border/60 bg-muted/20",
        /** Highlighted card with accent border */
        highlighted: [
          "border-primary/20 bg-primary/[0.02] shadow-sm",
          "hover:border-primary/30 hover:shadow-md",
        ],
      },
      padding: {
        none: "p-0",
        sm: "p-4",
        default: "p-5",
        lg: "p-6",
        xl: "p-8",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "default",
    },
  }
);

type ContentCardOwnProps<T extends React.ElementType = "div"> = {
  /** Render as a different element (e.g., 'section', 'article') */
  as?: T;
} & VariantProps<typeof contentCardVariants>;

type ContentCardProps<T extends React.ElementType = "div"> = ContentCardOwnProps<T> &
  Omit<React.ComponentPropsWithoutRef<T>, keyof ContentCardOwnProps<T>>;

/**
 * ContentCard - Unified card component for consistent styling across dashboard pages
 *
 * Replaces inconsistent card styles with a standardized design system:
 * - Consistent border-radius (rounded-2xl)
 * - Unified shadow and hover behavior (no hover movement)
 * - Predictable padding options
 */
const ContentCard = React.forwardRef(
  <T extends React.ElementType = "div">(
    { className, variant, padding, as, ...props }: ContentCardProps<T>,
    ref: React.ForwardedRef<Element>
  ) => {
    const Component = as || "div";
    return (
      <Component
        ref={ref}
        className={cn(contentCardVariants({ variant, padding }), className)}
        {...props}
      />
    );
  }
) as <T extends React.ElementType = "div">(
  props: ContentCardProps<T> & { ref?: React.ForwardedRef<Element> }
) => React.ReactElement | null;

(ContentCard as React.FC).displayName = "ContentCard";

/**
 * ContentCardHeader - Header section with title and optional action
 */
interface ContentCardHeaderProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  /** Render as a different element (default: 'header') */
  as?: "header" | "div";
  /** Custom spacing class (default: 'mb-4') */
  spacingClass?: string;
}

const ContentCardHeader = React.forwardRef<HTMLElement, ContentCardHeaderProps>(
  ({ className, title, description, action, children, as: Component = "header", spacingClass = "mb-4", ...props }, ref) => {
    return (
      <Component
        ref={ref as React.Ref<HTMLElement>}
        className={cn("flex items-start justify-between gap-4", spacingClass, className)}
        {...props}
      >
        {children || (
          <>
            <div className="flex-1 min-w-0">
              {title && (
                <h3 className="font-semibold text-foreground leading-none">
                  {title}
                </h3>
              )}
              {description && (
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
            {action && <div className="flex-shrink-0">{action}</div>}
          </>
        )}
      </Component>
    );
  }
);

ContentCardHeader.displayName = "ContentCardHeader";

/**
 * ContentCardContent - Main content area
 */
const ContentCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return <div ref={ref} className={cn(className)} {...props} />;
});

ContentCardContent.displayName = "ContentCardContent";

/**
 * ContentCardFooter - Footer section with actions
 */
const ContentCardFooter = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => {
  return (
    <footer
      ref={ref}
      className={cn(
        "flex items-center gap-3 pt-4 mt-4 border-t border-border/50",
        className
      )}
      {...props}
    />
  );
});

ContentCardFooter.displayName = "ContentCardFooter";

export {
  ContentCard,
  ContentCardHeader,
  ContentCardContent,
  ContentCardFooter,
  contentCardVariants,
};
