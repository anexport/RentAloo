/**
 * Centralized query key factory for React Query
 * 
 * This provides type-safe, consistent query keys across the application.
 * Use these keys in useQuery and for cache invalidation.
 * 
 * @example
 * // Fetching
 * useQuery({ queryKey: queryKeys.reviews.byReviewee(userId), ... })
 * 
 * // Invalidation
 * queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all })
 */
export const queryKeys = {
  // Profile queries
  profiles: {
    all: ["profiles"] as const,
    byId: (id: string) => ["profiles", id] as const,
    byIds: (ids: string[]) => ["profiles", "batch", ids.slice().sort()] as const,
  },

  // Review queries
  reviews: {
    all: ["reviews"] as const,
    byReviewee: (id: string) => ["reviews", "reviewee", id] as const,
    byReviewer: (id: string) => ["reviews", "reviewer", id] as const,
    byBooking: (id: string) => ["reviews", "booking", id] as const,
    byEquipment: (id: string) => ["reviews", "equipment", id] as const,
    filtered: (filters: { revieweeId?: string; reviewerId?: string; bookingId?: string; equipmentId?: string }) => 
      ["reviews", "filtered", filters] as const,
  },

  // Notification queries
  notifications: {
    all: ["notifications"] as const,
    byUser: (userId: string) => ["notifications", "user", userId] as const,
    byCategory: (userId: string, category: string) => 
      ["notifications", "user", userId, "category", category] as const,
    unreadCount: (userId: string) => ["notifications", "unreadCount", userId] as const,
  },

  // Notification preferences
  notificationPreferences: {
    all: ["notificationPreferences"] as const,
    byUser: (userId: string) => ["notificationPreferences", userId] as const,
  },

  // Payment queries
  payments: {
    all: ["payments"] as const,
    byId: (id: string) => ["payments", id] as const,
    byUser: (userId: string, userType: "renter" | "owner") => 
      ["payments", "user", userId, userType] as const,
    escrowBalance: (ownerId: string) => ["payments", "escrow", ownerId] as const,
  },

  // Equipment availability
  availability: {
    all: ["availability"] as const,
    byEquipment: (equipmentId: string) => ["availability", equipmentId] as const,
  },

  // Verification queries
  verification: {
    all: ["verification"] as const,
    byUser: (userId: string) => ["verification", userId] as const,
  },

  // Onboarding queries
  onboarding: {
    all: ["onboarding"] as const,
    check: (userId: string) => ["onboarding", "check", userId] as const,
  },

  // Favorites (already using React Query, included for completeness)
  favorites: {
    all: ["favorites"] as const,
    byUser: (userId: string) => ["favorites", userId] as const,
  },

  // Booking requests (already using React Query)
  bookingRequests: {
    all: ["bookingRequests"] as const,
    byUser: (userId: string, role: "renter" | "owner") => 
      ["bookingRequests", userId, role] as const,
  },

  // Active rentals (already using React Query)
  activeRentals: {
    all: ["activeRentals"] as const,
    byUser: (userId: string, role: "renter" | "owner") => 
      ["activeRentals", userId, role] as const,
  },

  // Owner claims (already using React Query)
  ownerClaims: {
    all: ["ownerClaims"] as const,
    byOwner: (ownerId: string) => ["ownerClaims", ownerId] as const,
  },
} as const;

// Type helpers for query keys
export type QueryKeys = typeof queryKeys;
