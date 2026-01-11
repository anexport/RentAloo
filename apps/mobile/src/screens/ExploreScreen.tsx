import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, SlidersHorizontal, AlertCircle } from 'lucide-react';
import { MobileHeader } from '@/components/navigation/MobileHeader';
import { supabase } from '@/lib/supabase';

// Tipo per i dati dal database con join sulle foto
interface EquipmentWithPhotos {
  id: string;
  title: string;
  description: string;
  daily_rate: number;
  location: string;
  owner_id: string;
  category_id: string;
  created_at: string | null;
  is_available: boolean;
  equipment_photos: { photo_url: string; is_primary: boolean }[];
}

// Tipo normalizzato per il componente
interface Equipment {
  id: string;
  title: string;
  description: string;
  price_per_day: number;
  location: string;
  images: string[];
  owner_id: string;
  category_id: string;
  created_at: string;
}

export function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    setLoading(true);
    setError(null);

    console.log('[ExploreScreen] Fetching equipment...');
    console.log('[ExploreScreen] Supabase URL:', import.meta.env.VITE_SUPABASE_URL);

    try {
      const { data, error: fetchError } = await supabase
        .from('equipment')
        .select(`
          id,
          title,
          description,
          daily_rate,
          location,
          owner_id,
          category_id,
          created_at,
          is_available,
          equipment_photos (photo_url, is_primary)
        `)
        .eq('is_available', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (fetchError) {
        console.error('[ExploreScreen] FETCH_ERROR:', fetchError);
        setError(fetchError.message);
        return;
      }

      console.log('[ExploreScreen] Fetched', data?.length ?? 0, 'items');
      console.log('[ExploreScreen] First item:', data?.[0]);
      
      // Mappa i dati del database al tipo Equipment
      const mapped: Equipment[] = (data ?? []).map((item) => {
        const typedItem = item as unknown as EquipmentWithPhotos;
        // Ordina le foto mettendo quella primaria prima
        const photos = typedItem.equipment_photos ?? [];
        const sortedPhotos = [...photos].sort((a, b) => 
          (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0)
        );
        
        return {
          id: typedItem.id,
          title: typedItem.title,
          description: typedItem.description ?? '',
          price_per_day: typedItem.daily_rate,
          location: typedItem.location ?? '',
          images: sortedPhotos.map(p => p.photo_url),
          owner_id: typedItem.owner_id,
          category_id: typedItem.category_id,
          created_at: typedItem.created_at ?? '',
        };
      });
      
      setEquipment(mapped);
    } catch (err) {
      console.error('[ExploreScreen] EXCEPTION:', err);
      setError(err instanceof Error ? err.message : 'Failed to load equipment');
    } finally {
      setLoading(false);
    }
  };

  const handleEquipmentClick = (id: string) => {
    navigate(`/equipment/${id}`);
  };

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
        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-destructive font-medium mb-2">Failed to load equipment</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <button
              onClick={fetchEquipment}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && !error && (
          <div className="space-y-4">
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
        )}

        {/* Empty state */}
        {!loading && !error && equipment.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="font-medium mb-2">No equipment found</p>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search or check back later
            </p>
          </div>
        )}

        {/* Equipment list */}
        {!loading && !error && equipment.length > 0 && (
          <div className="space-y-4">
            {equipment.map((item) => (
              <button
                key={item.id}
                onClick={() => handleEquipmentClick(item.id)}
                className="w-full text-left bg-card rounded-xl overflow-hidden border border-border hover:border-primary transition-colors"
              >
                {/* Image */}
                <div className="aspect-video bg-muted relative">
                  {item.images?.[0] ? (
                    <img
                      src={item.images[0]}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      No image
                    </div>
                  )}
                </div>
                {/* Details */}
                <div className="p-4 space-y-1">
                  <h3 className="font-semibold text-foreground line-clamp-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {item.location || 'Location not specified'}
                  </p>
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-bold text-primary">
                      €{item.price_per_day}/day
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
