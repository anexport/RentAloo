import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const ListingCardSkeleton = () => {
  return (
    <Card className="h-full overflow-hidden p-0 gap-0 border-border/60">
      <Skeleton className="aspect-[4/3] w-full flex-shrink-0" />
      <CardContent className="px-3 py-3 md:px-4 md:py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-4 w-2/3 mt-2" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </div>
          <Skeleton className="h-4 w-10 mt-1" />
        </div>
        <Skeleton className="h-4 w-24 mt-3" />
      </CardContent>
    </Card>
  );
};

export default ListingCardSkeleton;
