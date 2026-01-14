import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Star, 
  Heart, 
  Share2, 
  MessageSquare, 
  Calendar,
  AlertCircle,
  User,
  Shield
} from 'lucide-react';
import { MobileHeader } from '@/components/navigation/MobileHeader';
import { ImageGallery } from '@/components/equipment/ImageGallery';
import { fetchListingById, type Listing } from '@/services/listings';
import { cn } from '@/lib/utils';

export function EquipmentDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (id) {
      loadListing(id);
    }
  }, [id]);

  const loadListing = async (listingId: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchListingById(listingId);
      if (data) {
        setListing(data);
      } else {
        setError('Equipment not found');
      }
    } catch (err) {
      console.error('[EquipmentDetailScreen] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load equipment');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (listing && navigator.share) {
      try {
        await navigator.share({
          title: listing.title,
          text: `Check out ${listing.title} on Rentaloo`,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled or error
        console.log('Share cancelled');
      }
    }
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    // TODO: Implement save to favorites
  };

  const handleContactOwner = () => {
    // TODO: Navigate to conversation with owner
    if (listing) {
      navigate(`/conversation/new?ownerId=${listing.owner_id}&equipmentId=${listing.id}`);
    }
  };

  const handleBookNow = () => {
    // TODO: Navigate to booking flow
    if (listing) {
      navigate(`/booking/new?equipmentId=${listing.id}`);
    }
  };

  // Calculate average rating
  const avgRating = listing?.reviews && listing.reviews.length > 0
    ? listing.reviews.reduce((acc, r) => acc + r.rating, 0) / listing.reviews.length
    : 0;

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <MobileHeader title="Loading..." showBack />
        <div className="flex-1 p-4 space-y-4">
          {/* Gallery skeleton */}
          <div className="aspect-[4/3] bg-muted rounded-lg animate-pulse" />
          {/* Title skeleton */}
          <div className="h-7 bg-muted rounded animate-pulse w-3/4" />
          <div className="h-5 bg-muted rounded animate-pulse w-1/2" />
          {/* Details skeleton */}
          <div className="space-y-3 pt-4">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
            <div className="h-4 bg-muted rounded animate-pulse w-4/6" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !listing) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <MobileHeader title="Error" showBack />
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-destructive font-medium mb-2">Failed to load equipment</p>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => id && loadListing(id)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm min-h-[44px]"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <MobileHeader 
        title={listing.title} 
        showBack 
        rightAction={
          <div className="flex items-center gap-1">
            <button
              onClick={handleSave}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={isSaved ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart 
                className={cn(
                  'h-5 w-5 transition-colors',
                  isSaved ? 'fill-red-500 text-red-500' : 'text-foreground'
                )} 
              />
            </button>
            <button
              onClick={handleShare}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Share"
            >
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        }
      />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Image Gallery */}
        <ImageGallery 
          images={listing.photos.map(p => ({
            id: p.id,
            photo_url: p.photo_url,
            alt: p.alt || p.description,
          }))}
          title={listing.title}
        />

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Title and location */}
          <div>
            <h1 className="text-xl font-bold text-foreground">{listing.title}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{listing.location}</span>
              </div>
              {avgRating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span>{avgRating.toFixed(1)}</span>
                  <span className="text-muted-foreground">
                    ({listing.reviews.length} reviews)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Price card */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-primary">
                €{listing.daily_rate}
              </span>
              <span className="text-muted-foreground">/ day</span>
            </div>
            {listing.category && (
              <p className="text-sm text-muted-foreground mt-1">
                Category: {listing.category.name}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <h2 className="font-semibold text-foreground mb-2">About this item</h2>
            <p className="text-foreground/80 leading-relaxed">
              {listing.description}
            </p>
          </div>

          {/* Condition */}
          <div>
            <h3 className="font-medium text-foreground mb-1">Condition</h3>
            <span className={cn(
              'inline-block px-3 py-1 rounded-full text-sm capitalize',
              listing.condition === 'new' && 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
              listing.condition === 'excellent' && 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
              listing.condition === 'good' && 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
              listing.condition === 'fair' && 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100',
            )}>
              {listing.condition}
            </span>
          </div>

          {/* Owner info */}
          {listing.owner && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  {listing.owner.avatar_url ? (
                    <img 
                      src={listing.owner.avatar_url} 
                      alt="Owner" 
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    {listing.owner.full_name || 'Owner'}
                  </p>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    {listing.owner.identity_verified && (
                      <>
                        <Shield className="h-4 w-4 text-green-500" />
                        <span>Verified</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pickup location */}
          <div>
            <h2 className="font-semibold text-foreground mb-2">Pickup location</h2>
            <div className="aspect-video rounded-xl border border-border bg-muted flex items-center justify-center text-muted-foreground">
              <MapPin className="h-8 w-8 mr-2 opacity-50" />
              <span>Map coming soon</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Exact location shared after booking confirmation
            </p>
          </div>

          {/* Bottom spacer for fixed CTA */}
          <div className="h-24" />
        </div>
      </div>

      {/* Fixed bottom CTA */}
      <div 
        className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border p-4"
        style={{ paddingBottom: 'calc(1rem + var(--safe-area-inset-bottom))' }}
      >
        <div className="flex gap-3 max-w-lg mx-auto">
          <button
            onClick={handleContactOwner}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-border rounded-xl text-foreground font-medium min-h-[48px] active:scale-98 transition-transform"
          >
            <MessageSquare className="h-5 w-5" />
            Contact
          </button>
          <button
            onClick={handleBookNow}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-medium min-h-[48px] active:scale-98 transition-transform"
          >
            <Calendar className="h-5 w-5" />
            Book Now
          </button>
        </div>
      </div>
    </div>
  );
}

export default EquipmentDetailScreen;
