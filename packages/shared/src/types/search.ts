// Search types - shared between web and mobile
import type { Database } from './database.types';

export type EquipmentConditionEnum = Database['public']['Enums']['equipment_condition'];

export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface SearchFilters {
  search: string;
  location: string;
  condition: EquipmentConditionEnum | 'all';
  priceMin?: number;
  priceMax?: number;
  dateRange?: DateRange;
  equipmentType?: string;
  equipmentCategoryId?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  description: string | null;
  daily_rate: number;
  location: string | null;
  condition: EquipmentConditionEnum;
  primary_photo_url?: string;
  average_rating?: number;
  review_count?: number;
  distance_km?: number;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  sort_by?: 'price_asc' | 'price_desc' | 'rating' | 'distance' | 'newest';
}
