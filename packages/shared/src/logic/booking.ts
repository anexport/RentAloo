// Booking logic - pure functions, no side effects
import type {
  BookingCalculation,
  AvailabilitySlot,
  BookingConflict,
  InsuranceType,
  InsuranceOption,
} from '../types/booking';

/**
 * Format a Date object to YYYY-MM-DD string using local timezone.
 * Prevents timezone conversion issues.
 */
export const formatDateForStorage = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Calculate the total cost for a booking
 */
export const calculateBookingTotal = (
  dailyRate: number,
  startDate: string,
  endDate: string,
  customRates?: AvailabilitySlot[],
  insuranceType?: InsuranceType,
  depositAmount?: number
): BookingCalculation => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );

  let subtotal = 0;

  // Calculate subtotal based on custom rates if available
  if (customRates && customRates.length > 0) {
    for (let i = 0; i < days; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const dateStr = formatDateForStorage(currentDate);

      const customSlot = customRates.find((slot) => slot.date === dateStr);
      const rate = customSlot?.custom_rate || dailyRate;
      subtotal += rate;
    }
  } else {
    subtotal = dailyRate * days;
  }

  // Calculate fees (5% service fee)
  const serviceFeeRate = 0.05;
  const serviceFee = subtotal * serviceFeeRate;

  // Calculate insurance cost
  const insurance = insuranceType
    ? calculateInsuranceCost(subtotal, insuranceType)
    : 0;

  // Deposit amount
  const deposit = depositAmount || 0;

  // Calculate total
  const total = subtotal + serviceFee + insurance + deposit;

  return {
    dailyRate: dailyRate,
    days,
    subtotal,
    serviceFee,
    tax: 0,
    insurance,
    deposit,
    total,
  };
};

/**
 * Calculate the number of days in a booking
 */
export const calculateBookingDays = (
  startDate: string,
  endDate: string
): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
};

/**
 * Check for booking conflicts (synchronous version, for local validation)
 * Note: For server-side conflict checking, use the RPC function
 */
export const checkBookingConflictsSync = (
  startDate: string,
  endDate: string,
  existingBookings: Array<{
    start_date: string;
    end_date: string;
    status: string;
  }>
): BookingConflict[] => {
  const conflicts: BookingConflict[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = calculateBookingDays(startDate, endDate);

  // Check minimum rental period (1 day)
  if (days < 1) {
    conflicts.push({
      type: 'minimum_days',
      message: 'Minimum rental period is 1 day',
    });
  }

  // Check maximum rental period (30 days)
  if (days > 30) {
    conflicts.push({
      type: 'maximum_days',
      message: 'Maximum rental period is 30 days',
    });
  }

  // Check for overlapping bookings
  const overlappingBookings = existingBookings.filter((booking) => {
    const bookingStart = new Date(booking.start_date);
    const bookingEnd = new Date(booking.end_date);

    return (
      (start <= bookingStart && end > bookingStart) ||
      (start < bookingEnd && end >= bookingEnd) ||
      (start >= bookingStart && end <= bookingEnd)
    );
  });

  if (overlappingBookings.length > 0) {
    conflicts.push({
      type: 'overlap',
      message: 'Selected dates overlap with existing bookings',
      conflicting_dates: overlappingBookings.map((b) => b.start_date),
    });
  }

  return conflicts;
};

/**
 * Validate booking date constraints
 */
export const validateBookingDates = (
  startDate: string,
  endDate: string
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (start < today) {
    errors.push('Start date cannot be in the past');
  }

  if (end <= start) {
    errors.push('End date must be after start date');
  }

  const days = calculateBookingDays(startDate, endDate);
  if (days > 30) {
    errors.push('Maximum rental period is 30 days');
  }

  return { valid: errors.length === 0, errors };
};

// ============================================================================
// Insurance
// ============================================================================

/**
 * Insurance options available for renters during booking
 */
export const INSURANCE_OPTIONS: InsuranceOption[] = [
  {
    type: 'none',
    label: 'No Insurance',
    coverage: 'No coverage',
    cost_percentage: 0,
    description: 'You assume full liability for any damage',
  },
  {
    type: 'basic',
    label: 'Basic Protection',
    coverage: 'Up to 50% of equipment value',
    cost_percentage: 5,
    description: 'Covers accidental damage up to 50% of equipment value',
  },
  {
    type: 'premium',
    label: 'Premium Protection',
    coverage: 'Up to 100% of equipment value',
    cost_percentage: 10,
    description: 'Full coverage for accidental damage',
  },
];

/**
 * Calculate insurance cost based on rental subtotal and selected insurance type
 */
export function calculateInsuranceCost(
  rentalSubtotal: number,
  insuranceType: InsuranceType
): number {
  const option = INSURANCE_OPTIONS.find((opt) => opt.type === insuranceType);
  if (!option) return 0;
  return Number(((rentalSubtotal * option.cost_percentage) / 100).toFixed(2));
}

/**
 * Get insurance option by type
 */
export function getInsuranceOption(
  type: InsuranceType
): InsuranceOption | undefined {
  return INSURANCE_OPTIONS.find((opt) => opt.type === type);
}

// ============================================================================
// Deposit
// ============================================================================

/**
 * Calculate damage deposit amount based on equipment configuration
 */
export function calculateDamageDeposit(equipment: {
  damage_deposit_amount?: number | null;
  damage_deposit_percentage?: number | null;
  daily_rate: number;
}): number {
  if (equipment.damage_deposit_amount) {
    return Number(equipment.damage_deposit_amount);
  }
  if (equipment.damage_deposit_percentage) {
    return Number(
      (
        (equipment.daily_rate * equipment.damage_deposit_percentage) /
        100
      ).toFixed(2)
    );
  }
  return 0;
}

// ============================================================================
// Formatting
// ============================================================================

export const formatBookingDate = (date: string): string => {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatBookingDuration = (
  startDate: string,
  endDate: string
): string => {
  const days = calculateBookingDays(startDate, endDate);

  if (days === 1) {
    return '1 day';
  } else if (days < 7) {
    return `${days} days`;
  } else {
    const weeks = Math.floor(days / 7);
    const remainingDays = days % 7;
    if (remainingDays === 0) {
      return `${weeks} week${weeks > 1 ? 's' : ''}`;
    } else {
      return `${weeks} week${weeks > 1 ? 's' : ''} ${remainingDays} day${
        remainingDays > 1 ? 's' : ''
      }`;
    }
  }
};

export const getBookingStatusColor = (status: string): string => {
  switch (status) {
    case 'approved':
      return 'bg-green-100 text-green-800';
    case 'active':
      return 'bg-purple-100 text-purple-800';
    case 'cancelled':
      return 'bg-gray-100 text-gray-800';
    case 'completed':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getBookingStatusText = (status: string): string => {
  switch (status) {
    case 'approved':
      return 'Confirmed';
    case 'active':
      return 'In Progress';
    case 'cancelled':
      return 'Cancelled';
    case 'completed':
      return 'Completed';
    default:
      return 'Unknown';
  }
};
