import { useState } from 'react';
import { Search, MapPin, SlidersHorizontal } from 'lucide-react';
import { MobileHeader } from '@/components/navigation/MobileHeader';

export function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="flex flex-col min-h-screen">
      <MobileHeader title="Explore" />

      {/* Search bar */}
      <div className="p-4 bg-background sticky top-14 z-30 border-b border-border">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search equipment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button className="p-3 bg-muted rounded-lg">
            <SlidersHorizontal className="h-5 w-5" />
          </button>
        </div>

        {/* Location */}
        <button className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>Near you</span>
        </button>
      </div>

      {/* Equipment list */}
      <div className="flex-1 p-4">
        <div className="space-y-4">
          {/* Placeholder cards */}
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-card rounded-xl overflow-hidden border border-border"
            >
              <div className="aspect-video bg-muted animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-5 bg-muted rounded animate-pulse w-3/4" />
                <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                <div className="flex justify-between items-center pt-2">
                  <div className="h-6 bg-muted rounded animate-pulse w-20" />
                  <div className="h-4 bg-muted rounded animate-pulse w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
