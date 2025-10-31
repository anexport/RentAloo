import { Skeleton } from "@/components/ui/skeleton";

const CategoryBarSkeleton = () => {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-24 rounded-md" />
      ))}
    </div>
  );
};

export default CategoryBarSkeleton;

