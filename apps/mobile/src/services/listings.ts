/**
 * Listings service - fetches equipment data from Supabase
 * Ported from web app: src/components/equipment/services/listings.ts
 */

import { supabase } from '@/lib/supabase';

// Types for listing data
export interface EquipmentPhoto {
  id: string;
  photo_url: string;
  is_primary: boolean;
  order_index: number;
  alt?: string;
  description?: string;
}

export interface Category {
  id: string;
  name: string;
  slug?: string;
  icon?: string;
  sport_type?: string;
}

export interface Owner {
  id: string;
  email: string;
  identity_verified: boolean;
  full_name?: string;
  avatar_url?: string;
}

export interface Review {
  rating: number;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  daily_rate: number;
  condition: 'new' | 'excellent' | 'good' | 'fair';
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  is_available: boolean;
  owner_id: string;
  category_id: string;
  created_at: string | null;
  updated_at: string | null;
  category: Category | null;
  photos: EquipmentPhoto[];
  owner: Owner | null;
  reviews: Review[];
}

/**
 * Fetch a single listing by ID with all related data
 */
export async function fetchListingById(id: string): Promise<Listing | null> {
  console.log('[listings] Fetching listing:', id);

  const { data, error } = await supabase
    .from('equipment')
    .select(`
      *,
      category:categories(*),
      photos:equipment_photos(*),
      owner:profiles!equipment_owner_id_fkey(id, email, identity_verified, full_name, avatar_url)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('[listings] FETCH_ERROR:', error);
    throw error;
  }

  if (!data) {
    console.log('[listings] Listing not found');
    return null;
  }

  // Transform data to Listing type
  const listing: Listing = {
    id: data.id,
    title: data.title,
    description: data.description,
    daily_rate: data.daily_rate,
    condition: data.condition,
    location: data.location,
    latitude: data.latitude,
    longitude: data.longitude,
    is_available: data.is_available ?? true,
    owner_id: data.owner_id,
    category_id: data.category_id,
    created_at: data.created_at,
    updated_at: data.updated_at,
    category: data.category as unknown as Category | null,
    photos: (data.photos as EquipmentPhoto[]) ?? [],
    owner: data.owner as Owner | null,
    reviews: [],
  };

  // Fetch reviews for the owner
  if (listing.owner?.id) {
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('rating')
      .eq('reviewee_id', listing.owner.id);

    if (reviewsError) {
      console.error('[listings] Failed to load reviews:', reviewsError);
    } else {
      listing.reviews = reviews ?? [];
    }
  }

  console.log('[listings] Fetched listing:', listing.title);
  return listing;
}
