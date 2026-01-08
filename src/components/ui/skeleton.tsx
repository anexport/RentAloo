import { cn } from "@/lib/utils";

interface SkeletonProps extends React.ComponentProps<"div"> {
  /** Enable shimmer effect for enhanced loading state */
  shimmer?: boolean;
}

function Skeleton({ className, shimmer = false, ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "bg-accent animate-pulse rounded-md relative overflow-hidden",
        className
      )}
      {...props}
    >
      {shimmer && (
        <div
          className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent dark:via-white/5"
          style={{ backgroundSize: "200% 100%" }}
        />
      )}
    </div>
  );
}

export { Skeleton };
