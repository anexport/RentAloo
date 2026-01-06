// Equipment types - shared between web and mobile
import type { Database } from './database.types';

export type Equipment = Database['public']['Tables']['equipment']['Row'];
export type EquipmentInsert = Database['public']['Tables']['equipment']['Insert'];
export type EquipmentUpdate = Database['public']['Tables']['equipment']['Update'];

export type EquipmentPhoto = Database['public']['Tables']['equipment_photos']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];

export type EquipmentCondition = Database['public']['Enums']['equipment_condition'];

export interface EquipmentWithDetails extends Equipment {
  owner: Database['public']['Tables']['profiles']['Row'];
  category: Category;
  photos: EquipmentPhoto[];
  reviews?: Database['public']['Tables']['reviews']['Row'][];
  average_rating?: number;
  review_count?: number;
}

export interface EquipmentListItem {
  id: string;
  title: string;
  description: string | null;
  daily_rate: number;
  location: string | null;
  condition: EquipmentCondition;
  primary_photo_url?: string;
  owner_name?: string;
  average_rating?: number;
  review_count?: number;
}

export interface EquipmentFilters {
  category_id?: string;
  location?: string;
  price_min?: number;
  price_max?: number;
  condition?: EquipmentCondition | 'all';
  available_from?: string;
  available_to?: string;
  search?: string;
}

export interface EquipmentFormData {
  title: string;
  description: string;
  category_id: string;
  daily_rate: number;
  condition: EquipmentCondition;
  location: string;
  latitude?: number;
  longitude?: number;
  photos: File[];
}
