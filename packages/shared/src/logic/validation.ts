// Validation schemas - Zod schemas for data validation
import { z } from 'zod';

/**
 * Payment booking data validation
 */
export const paymentBookingDataSchema = z.object({
  equipment_id: z.string().uuid('Invalid equipment ID'),
  start_date: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    'Invalid start date format'
  ),
  end_date: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    'Invalid end date format'
  ),
  total_amount: z.number().positive('Total amount must be positive'),
  insurance_type: z.enum(['none', 'basic', 'premium']),
  insurance_cost: z.number().nonnegative('Insurance cost cannot be negative'),
  damage_deposit_amount: z.number().nonnegative('Deposit cannot be negative'),
});

export type PaymentBookingData = z.infer<typeof paymentBookingDataSchema>;

/**
 * Booking form data validation
 */
export const bookingFormSchema = z.object({
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  message: z.string().optional(),
}).refine(
  (data) => new Date(data.end_date) > new Date(data.start_date),
  { message: 'End date must be after start date', path: ['end_date'] }
);

export type BookingFormData = z.infer<typeof bookingFormSchema>;

/**
 * Review form data validation
 */
export const reviewFormSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().min(10, 'Review must be at least 10 characters'),
  photos: z.array(z.string().url()).optional(),
});

export type ReviewFormData = z.infer<typeof reviewFormSchema>;

/**
 * Message form validation
 */
export const messageFormSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(5000),
});

export type MessageFormData = z.infer<typeof messageFormSchema>;

/**
 * Equipment form validation
 */
export const equipmentFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  description: z.string().min(20, 'Description must be at least 20 characters').max(2000),
  category_id: z.string().uuid('Please select a category'),
  daily_rate: z.number().positive('Daily rate must be positive'),
  condition: z.enum(['new', 'like_new', 'good', 'fair']),
  location: z.string().min(3, 'Location is required'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export type EquipmentFormData = z.infer<typeof equipmentFormSchema>;

/**
 * Profile update validation
 */
export const profileUpdateSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  phone: z.string().optional(),
  bio: z.string().max(500).optional(),
  location: z.string().optional(),
});

export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;
