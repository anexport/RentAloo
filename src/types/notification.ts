// ============================================================================
// NOTIFICATION TYPE ENUMS
// ============================================================================

/**
 * Notification types matching the database enum
 */
export type NotificationType =
  | "booking_confirmed"
  | "booking_cancelled"
  | "booking_completed"
  | "booking_reminder"
  | "new_message"
  | "payment_received"
  | "payment_processed"
  | "payout_sent"
  | "refund_issued"
  | "review_received"
  | "verification_approved"
  | "verification_rejected"
  | "verification_reminder"
  | "equipment_favorited"
  | "equipment_views_milestone"
  | "system_announcement"
  | "promotion";

/**
 * Notification priority levels (determines toast behavior)
 */
export type NotificationPriority = "low" | "medium" | "high" | "critical";

/**
 * Notification categories for filtering
 */
export type NotificationCategory =
  | "all"
  | "booking"
  | "message"
  | "payment"
  | "review"
  | "verification"
  | "equipment"
  | "system";

/**
 * Related entity types for navigation
 */
export type RelatedEntityType =
  | "booking"
  | "equipment"
  | "conversation"
  | "review"
  | "payment";

// ============================================================================
// NOTIFICATION INTERFACES
// ============================================================================

/**
 * Base notification from database
 */
export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  related_entity_type: RelatedEntityType | null;
  related_entity_id: string | null;
  actor_id: string | null;
  is_read: boolean;
  read_at: string | null;
  is_archived: boolean;
  archived_at: string | null;
  group_key: string | null;
  created_at: string;
}

/**
 * Notification with actor details (from RPC function)
 */
export interface NotificationWithActor extends Notification {
  actor_email: string | null;
  actor_avatar_url: string | null;
}

/**
 * Grouped notifications for display
 */
export interface NotificationGroup {
  group_key: string;
  notifications: NotificationWithActor[];
  latest: NotificationWithActor;
  count: number;
  isExpanded: boolean;
}

// ============================================================================
// NOTIFICATION PREFERENCES
// ============================================================================

/**
 * User notification preferences
 */
export interface NotificationPreferences {
  id: string;
  user_id: string;
  // Per-category toggles
  booking_notifications: boolean;
  message_notifications: boolean;
  payment_notifications: boolean;
  review_notifications: boolean;
  verification_notifications: boolean;
  equipment_notifications: boolean;
  system_notifications: boolean;
  promotion_notifications: boolean;
  // Toast preferences
  toast_critical: boolean;
  toast_high: boolean;
  toast_medium: boolean;
  toast_low: boolean;
  // Quiet hours
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Partial preferences for updating
 */
export type NotificationPreferencesUpdate = Partial<
  Omit<NotificationPreferences, "id" | "user_id" | "created_at" | "updated_at">
>;

// ============================================================================
// HOOK RETURN TYPES
// ============================================================================

/**
 * Return type for useNotifications hook
 */
export interface UseNotificationsReturn {
  notifications: NotificationWithActor[];
  groupedNotifications: NotificationGroup[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  filter: NotificationCategory;
  setFilter: (filter: NotificationCategory) => void;
  markAsRead: (notificationId: string) => Promise<boolean>;
  markAllAsRead: () => Promise<number>;
  deleteNotification: (notificationId: string) => Promise<boolean>;
  archiveNotification: (notificationId: string) => Promise<boolean>;
  refreshNotifications: () => Promise<void>;
  toggleGroupExpanded: (groupKey: string) => void;
}

/**
 * Return type for useNotificationPreferences hook
 */
export interface UseNotificationPreferencesReturn {
  preferences: NotificationPreferences | null;
  loading: boolean;
  error: string | null;
  updatePreferences: (
    updates: NotificationPreferencesUpdate
  ) => Promise<boolean>;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Map notification type to category
 */
export const getNotificationCategory = (
  type: NotificationType
): NotificationCategory => {
  switch (type) {
    case "booking_confirmed":
    case "booking_cancelled":
    case "booking_completed":
    case "booking_reminder":
      return "booking";
    case "new_message":
      return "message";
    case "payment_received":
    case "payment_processed":
    case "payout_sent":
    case "refund_issued":
      return "payment";
    case "review_received":
      return "review";
    case "verification_approved":
    case "verification_rejected":
    case "verification_reminder":
      return "verification";
    case "equipment_favorited":
    case "equipment_views_milestone":
      return "equipment";
    case "system_announcement":
    case "promotion":
      return "system";
    default:
      return "system";
  }
};

/**
 * Get navigation path for a notification
 */
export const getNotificationPath = (
  notification: Notification
): string | null => {
  if (!notification.related_entity_type || !notification.related_entity_id) {
    return null;
  }

  switch (notification.related_entity_type) {
    case "booking":
      return `/rental/${notification.related_entity_id}`;
    case "equipment":
      return `/equipment/${notification.related_entity_id}`;
    case "conversation":
      return `/messages?conversation=${notification.related_entity_id}`;
    case "review":
      return `/reviews/${notification.related_entity_id}`;
    case "payment":
      return `/payments/${notification.related_entity_id}`;
    default:
      return null;
  }
};

/**
 * Check if a notification should show a toast based on preferences
 */
export const shouldShowToast = (
  notification: Notification,
  preferences: NotificationPreferences | null
): boolean => {
  if (!preferences) {
    // Default: show toast for critical and high priority
    return notification.priority === "critical" || notification.priority === "high";
  }

  // Check quiet hours
  if (preferences.quiet_hours_enabled) {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    
    if (preferences.quiet_hours_start && preferences.quiet_hours_end) {
      const start = preferences.quiet_hours_start;
      const end = preferences.quiet_hours_end;
      
      // Handle overnight quiet hours (e.g., 22:00 - 07:00)
      if (start > end) {
        if (currentTime >= start || currentTime <= end) {
          return false;
        }
      } else {
        if (currentTime >= start && currentTime <= end) {
          return false;
        }
      }
    }
  }

  // Check priority preferences
  switch (notification.priority) {
    case "critical":
      return preferences.toast_critical;
    case "high":
      return preferences.toast_high;
    case "medium":
      return preferences.toast_medium;
    case "low":
      return preferences.toast_low;
    default:
      return false;
  }
};

/**
 * Get icon name for notification type
 */
export const getNotificationIcon = (type: NotificationType): string => {
  switch (type) {
    case "booking_confirmed":
      return "CalendarCheck";
    case "booking_cancelled":
      return "CalendarX";
    case "booking_completed":
      return "CheckCircle";
    case "booking_reminder":
      return "Clock";
    case "new_message":
      return "MessageSquare";
    case "payment_received":
    case "payment_processed":
      return "CreditCard";
    case "payout_sent":
      return "Banknote";
    case "refund_issued":
      return "RotateCcw";
    case "review_received":
      return "Star";
    case "verification_approved":
      return "ShieldCheck";
    case "verification_rejected":
      return "ShieldX";
    case "verification_reminder":
      return "Shield";
    case "equipment_favorited":
      return "Heart";
    case "equipment_views_milestone":
      return "Eye";
    case "system_announcement":
      return "Megaphone";
    case "promotion":
      return "Gift";
    default:
      return "Bell";
  }
};
