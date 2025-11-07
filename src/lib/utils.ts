import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a Date object to YYYY-MM-DD string using local timezone.
 * This prevents timezone conversion issues when converting dates to strings.
 * Use this instead of toISOString().split("T")[0] to preserve the calendar day
 * the user selected, regardless of their timezone offset.
 */
export const formatDateForStorage = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};