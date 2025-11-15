import { Skeleton } from "@/components/ui/skeleton";

const CategoryBarSkeleton = () => {
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 py-1 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-9 rounded-full"
            style={{
              width: `${80 + Math.random() * 60}px`, // Random width between 80-140px
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default CategoryBarSkeleton;
