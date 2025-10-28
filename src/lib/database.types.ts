export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'renter' | 'owner'
export type VerificationStatus = 'unverified' | 'pending' | 'verified'
export type EquipmentCondition = 'new' | 'excellent' | 'good' | 'fair'
export type BookingStatus = 'pending' | 'approved' | 'declined' | 'cancelled'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          role: UserRole
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          role: UserRole
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: UserRole
          created_at?: string
          updated_at?: string
        }
      }
      renter_profiles: {
        Row: {
          id: string
          profile_id: string
          preferences: Json | null
          experience_level: string | null
          verification_status: VerificationStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          preferences?: Json | null
          experience_level?: string | null
          verification_status?: VerificationStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          preferences?: Json | null
          experience_level?: string | null
          verification_status?: VerificationStatus
          created_at?: string
          updated_at?: string
        }
      }
      owner_profiles: {
        Row: {
          id: string
          profile_id: string
          business_info: Json | null
          earnings_total: number
          verification_level: VerificationStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          business_info?: Json | null
          earnings_total?: number
          verification_level?: VerificationStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          business_info?: Json | null
          earnings_total?: number
          verification_level?: VerificationStatus
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          parent_id: string | null
          sport_type: string
          attributes: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          parent_id?: string | null
          sport_type: string
          attributes?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          parent_id?: string | null
          sport_type?: string
          attributes?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      equipment: {
        Row: {
          id: string
          owner_id: string
          category_id: string
          title: string
          description: string
          daily_rate: number
          condition: EquipmentCondition
          location: string
          latitude: number | null
          longitude: number | null
          is_available: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          category_id: string
          title: string
          description: string
          daily_rate: number
          condition: EquipmentCondition
          location: string
          latitude?: number | null
          longitude?: number | null
          is_available?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          category_id?: string
          title?: string
          description?: string
          daily_rate?: number
          condition?: EquipmentCondition
          location?: string
          latitude?: number | null
          longitude?: number | null
          is_available?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      equipment_photos: {
        Row: {
          id: string
          equipment_id: string
          photo_url: string
          is_primary: boolean
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          equipment_id: string
          photo_url: string
          is_primary?: boolean
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          equipment_id?: string
          photo_url?: string
          is_primary?: boolean
          order_index?: number
          created_at?: string
        }
      }
      availability_calendar: {
        Row: {
          id: string
          equipment_id: string
          date: string
          is_available: boolean
          custom_rate: number | null
          created_at: string
        }
        Insert: {
          id?: string
          equipment_id: string
          date: string
          is_available?: boolean
          custom_rate?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          equipment_id?: string
          date?: string
          is_available?: boolean
          custom_rate?: number | null
          created_at?: string
        }
      }
      booking_requests: {
        Row: {
          id: string
          equipment_id: string
          renter_id: string
          start_date: string
          end_date: string
          total_amount: number
          status: BookingStatus
          message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          equipment_id: string
          renter_id: string
          start_date: string
          end_date: string
          total_amount: number
          status?: BookingStatus
          message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          equipment_id?: string
          renter_id?: string
          start_date?: string
          end_date?: string
          total_amount?: number
          status?: BookingStatus
          message?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          booking_request_id: string
          payment_status: string
          pickup_method: string | null
          return_status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          booking_request_id: string
          payment_status?: string
          pickup_method?: string | null
          return_status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          booking_request_id?: string
          payment_status?: string
          pickup_method?: string | null
          return_status?: string
          created_at?: string
          updated_at?: string
        }
      }
      reviews: {
        Row: {
          id: string
          booking_id: string
          reviewer_id: string
          reviewee_id: string
          rating: number
          comment: string | null
          photos: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          reviewer_id: string
          reviewee_id: string
          rating: number
          comment?: string | null
          photos?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          reviewer_id?: string
          reviewee_id?: string
          rating?: number
          comment?: string | null
          photos?: Json | null
          created_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          booking_request_id: string | null
          participants: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          booking_request_id?: string | null
          participants: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          booking_request_id?: string | null
          participants?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          content: string
          message_type: string
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          content: string
          message_type?: string
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          content?: string
          message_type?: string
          created_at?: string
        }
      }
      user_verifications: {
        Row: {
          id: string
          user_id: string
          verification_type: string
          status: VerificationStatus
          document_url: string | null
          verified_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          verification_type: string
          status?: VerificationStatus
          document_url?: string | null
          verified_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          verification_type?: string
          status?: VerificationStatus
          document_url?: string | null
          verified_at?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: {
          user_id: string
        }
        Returns: UserRole
      }
      is_equipment_owner: {
        Args: {
          equipment_id: string
          user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      user_role: UserRole
      verification_status: VerificationStatus
      equipment_condition: EquipmentCondition
      booking_status: BookingStatus
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}