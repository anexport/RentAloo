import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Package, RefreshCw, AlertCircle, Search } from 'lucide-react';
import { MobileHeader } from '@/components/navigation/MobileHeader';
import { useBookingRequests } from '@/hooks/useBookingRequests';
import { useActiveRentals } from '@/hooks/useActiveRental';
import { useAuth } from '@/hooks/useAuth';
import BookingRequestCard from '@/components/booking/BookingRequestCard';
import ActiveRentalCard from '@/components/rental/ActiveRentalCard';
import { cn } from '@/lib/utils';

type TabType = 'active' | 'upcoming' | 'past';

export function RentalsScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('active');

  // Fetch bookings where user is renter
  const {
    bookingRequests: renterBookings,
    loading: renterLoading,
    error: renterError,
    fetchBookingRequests: fetchRenterBookings,
  } = useBookingRequests('renter');

  // Fetch active rentals (only where user is renter)
  const {
    rentals: activeRentals,
    isLoading: activeRentalsLoading,
    error: activeRentalsError,
    refetch: refetchActiveRentals,
  } = useActiveRentals('renter');

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      fetchRenterBookings(),
      refetchActiveRentals(),
    ]);
  }, [fetchRenterBookings, refetchActiveRentals]);

  const handleBookingStatusChange = useCallback(async () => {
    await handleRefresh();
  }, [handleRefresh]);

  // Filter bookings based on tab
  const filteredBookings = useMemo(() => {
    const now = new Date();
    
    switch (activeTab) {
      case 'active':
        // Show active rentals (approved and currently in date range)
        return renterBookings.filter(b => {
          const startDate = new Date(b.start_date);
          const endDate = new Date(b.end_date);
          return b.status === 'approved' && startDate <= now && endDate >= now;
        });
      case 'upcoming':
        // Show upcoming (approved but not started yet) and pending
        return renterBookings.filter(b => {
          const startDate = new Date(b.start_date);
          return (b.status === 'approved' && startDate > now) || b.status === 'pending';
        });
      case 'past':
        // Show completed and cancelled
        return renterBookings.filter(b => 
          b.status === 'completed' || b.status === 'cancelled' || 
          (b.status === 'approved' && new Date(b.end_date) < now)
        );
      default:
        return renterBookings;
    }
  }, [renterBookings, activeTab]);

  const isLoading = renterLoading || activeRentalsLoading;
  const error = renterError || activeRentalsError;

  // Render loading skeletons
  const renderSkeletons = () => (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-card rounded-xl overflow-hidden border border-border"
        >
          <div className="flex">
            <div className="w-24 h-24 bg-muted animate-pulse" />
            <div className="flex-1 p-3 space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
              <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
              <div className="h-3 bg-muted rounded animate-pulse w-1/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // Render empty state
  const renderEmptyState = () => {
    const messages = {
      active: {
        title: "No active rentals",
        description: "You don't have any equipment currently rented out.",
        action: "Browse Equipment",
      },
      upcoming: {
        title: "No upcoming rentals",
        description: "You don't have any pending or upcoming bookings.",
        action: "Find Equipment",
      },
      past: {
        title: "No past rentals",
        description: "Your rental history will appear here.",
        action: null,
      },
    };

    const msg = messages[activeTab];

    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Calendar className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">{msg.title}</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          {msg.description}
        </p>
        {msg.action && (
          <button
            onClick={() => navigate('/explore')}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium min-h-11"
          >
            {msg.action}
          </button>
        )}
      </div>
    );
  };

  // Render error state
  const renderErrorState = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-destructive/10 p-4 mb-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold mb-1">Failed to load rentals</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
        {error}
      </p>
      <button
        onClick={handleRefresh}
        className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium min-h-11 flex items-center gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        Try Again
      </button>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen">
      <MobileHeader 
        title="My Rentals" 
        rightAction={
          <button
            onClick={handleRefresh}
            className="p-2 min-h-11 min-w-11 flex items-center justify-center"
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-5 w-5", isLoading && "animate-spin")} />
          </button>
        }
      />

      <div className="flex-1 p-4 safe-area-bottom">
        {/* Tabs */}
        <div className="flex gap-2 mb-4 sticky top-14 bg-background py-2 -mt-2 z-20">
          {(['active', 'upcoming', 'past'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors min-h-11",
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Active Rentals Section - Show at top when on active tab */}
        {activeTab === 'active' && activeRentals.length > 0 && !isLoading && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-5 w-5 text-emerald-500" />
              <h2 className="text-lg font-semibold">Currently Renting</h2>
            </div>
            <div className="space-y-4">
              {activeRentals.map((rental) => (
                <ActiveRentalCard key={rental.id} booking={rental} />
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          renderSkeletons()
        ) : error ? (
          renderErrorState()
        ) : filteredBookings.length === 0 && activeRentals.length === 0 ? (
          renderEmptyState()
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <BookingRequestCard
                key={booking.id}
                bookingRequest={booking}
                onStatusChange={handleBookingStatusChange}
                showActions={true}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
