import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { MapPin } from "lucide-react";
import StarRating from "@/components/reviews/StarRating";
import { fetchListingById } from "@/features/equipment/services/listings";

type EquipmentDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId?: string;
};

const EquipmentDetailDialog = ({
  open,
  onOpenChange,
  listingId,
}: EquipmentDetailDialogProps) => {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["listing", listingId],
    queryFn: () => fetchListingById(listingId as string),
    enabled: !!listingId && open,
  });

  const avgRating = (() => {
    if (!data?.reviews || data.reviews.length === 0) return 0;
    const validRatings = data.reviews.filter(
      (r) =>
        typeof r.rating === "number" &&
        Number.isFinite(r.rating) &&
        r.rating >= 0 &&
        r.rating <= 5
    );
    if (validRatings.length === 0) return 0;
    const sum = validRatings.reduce((acc, r) => acc + r.rating, 0);
    return sum / validRatings.length;
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{data?.title ?? "Equipment details"}</DialogTitle>
          <DialogDescription>
            {data?.category?.name
              ? `Category: ${data.category.name}`
              : "Detailed information about this equipment."}
          </DialogDescription>
        </DialogHeader>

        {/* Loading / missing states */}
        {isLoading || isFetching ? (
          <div className="py-12 text-center text-muted-foreground">
            Loading...
          </div>
        ) : !data ? (
          <div className="py-12 text-center text-muted-foreground">
            Equipment not found.
          </div>
        ) : (
          <div>
            {/* Meta */}
            <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {data.location}
              </div>
              {avgRating > 0 && (
                <div className="flex items-center gap-2">
                  <StarRating rating={avgRating} size="sm" />
                  <span>{avgRating.toFixed(1)}</span>
                </div>
              )}
            </div>

            {/* Gallery */}
            {data.photos && data.photos.length > 0 && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <img
                  src={data.photos[0].photo_url}
                  alt={data.title}
                  className="w-full h-64 object-cover rounded-md"
                />
                {data.photos.slice(1, 3).map((p) => (
                  <img
                    key={p.id}
                    src={p.photo_url}
                    alt={data.title}
                    className="w-full h-64 object-cover rounded-md"
                  />
                ))}
              </div>
            )}

            <div className="mt-4">
              <Separator />
            </div>

            {/* Details */}
            <section className="mt-4 grid md:grid-cols-[1fr_320px] gap-6">
              <div>
                <h2 className="text-lg font-semibold">About this item</h2>
                <p className="mt-2 text-foreground leading-relaxed">
                  {data.description}
                </p>
                <div className="mt-6">
                  <h3 className="font-medium">Condition</h3>
                  <p className="text-sm text-muted-foreground capitalize">
                    {data.condition}
                  </p>
                </div>

                <div className="mt-8">
                  <h2 className="text-lg font-semibold">
                    Where you'll pick up
                  </h2>
                  <div className="mt-3 h-52 w-full rounded-md border border-border bg-muted flex items-center justify-center text-muted-foreground">
                    Map placeholder
                  </div>
                </div>
              </div>

              <aside className="h-fit rounded-md border border-border p-4 bg-card">
                <div className="text-2xl font-bold text-foreground">
                  ${data.daily_rate}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    / day
                  </span>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Category: {data.category?.name}
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  Contact the owner to arrange pickup after booking.
                </div>
              </aside>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EquipmentDetailDialog;
