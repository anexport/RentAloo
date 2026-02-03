import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Search } from 'lucide-react';
import { MobileHeader } from '@/components/navigation/MobileHeader';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface SavedEquipment {
  id: string;
  equipment: {
    id: string;
    title: string;
    daily_rate: number;
    location: string;
    equipment_photos: { photo_url: string; is_primary: boolean }[];
  };
}

export function FavoritesScreen() {
  const [savedItems, setSavedItems] = useState<SavedEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchSavedItems();
    }
  }, [user]);

  const fetchSavedItems = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_equipment')
        .select(`
          id,
          equipment:equipment_id (
            id,
            title,
            daily_rate,
            location,
            equipment_photos (photo_url, is_primary)
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('[FavoritesScreen] Error:', error);
        return;
      }

      setSavedItems((data as unknown as SavedEquipment[]) ?? []);
    } catch (err) {
      console.error('[FavoritesScreen] Exception:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = (equipmentId: string) => {
    navigate(`/equipment/${equipmentId}`);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <MobileHeader title="Favorites" />

      <div className="flex-1 p-4">
        {/* Loading state */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-card rounded-xl overflow-hidden border border-border"
              >
                <div className="aspect-video bg-muted animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-5 bg-muted rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && savedItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Heart className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="font-medium mb-2">No favorites yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Save equipment you like to find them here
            </p>
            <button
              onClick={() => navigate('/explore')}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
            >
              <Search className="h-4 w-4" />
              Explore Equipment
            </button>
          </div>
        )}

        {/* Saved items list */}
        {!loading && savedItems.length > 0 && (
          <div className="space-y-4">
            {savedItems.map((item) => {
              const equipment = item.equipment;
              const photos = equipment.equipment_photos ?? [];
              const primaryPhoto = photos.find(p => p.is_primary)?.photo_url || photos[0]?.photo_url;

              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(equipment.id)}
                  className="w-full text-left bg-card rounded-xl overflow-hidden border border-border hover:border-primary transition-colors"
                >
                  <div className="aspect-video bg-muted relative">
                    {primaryPhoto ? (
                      <img
                        src={primaryPhoto}
                        alt={equipment.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        No image
                      </div>
                    )}
                    <div className="absolute top-2 right-2 p-2 bg-background/80 rounded-full">
                      <Heart className="h-5 w-5 text-red-500 fill-red-500" />
                    </div>
                  </div>
                  <div className="p-4 space-y-1">
                    <h3 className="font-semibold text-foreground line-clamp-1">
                      {equipment.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {equipment.location || 'Location not specified'}
                    </p>
                    <div className="flex justify-between items-center pt-2">
                      <span className="font-bold text-primary">
                        €{equipment.daily_rate}/day
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default FavoritesScreen;
