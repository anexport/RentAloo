import { useCountUp } from "@/hooks/useCountUp";
import { cn } from "@/lib/utils";

interface AnimatedNumberProps {
  /** Target value to animate to */
  value: number;
  /** Animation duration in milliseconds (default: 1000) */
  duration?: number;
  /** Prefix to display (e.g., "$") */
  prefix?: string;
  /** Suffix to display (e.g., "%") */
  suffix?: string;
  /** Number of decimal places (default: 0, clamped to 0-20) */
  decimals?: number;
  /** Additional className for styling */
  className?: string;
  /** Format as currency */
  formatCurrency?: boolean;
  /** Locale for number formatting (default: browser locale) */
  locale?: string;
}

/**
 * Animated number display component
 * Uses useCountUp hook for smooth counting animation
 * Automatically uses tabular-nums for consistent width
 */
export function AnimatedNumber({
  value,
  duration = 1000,
  prefix = "",
  suffix = "",
  decimals = 0,
  className,
  formatCurrency = false,
  locale,
}: AnimatedNumberProps) {
  // Validate and sanitize inputs to prevent NaN/Infinity/RangeError
  const safeValue = Number.isFinite(value) ? value : 0;
  const safeDuration = Math.max(
    1,
    Math.floor(Number.isFinite(duration) ? duration : 1000)
  );
  // Sanitize decimals: must be a finite integer in range 0-20
  const safeDecimals = Number.isFinite(decimals)
    ? Math.max(0, Math.min(20, Math.floor(decimals)))
    : 0;

  const { value: animatedValue } = useCountUp({
    end: safeValue,
    duration: safeDuration,
    decimals: formatCurrency ? 2 : safeDecimals,
  });

  // Format with locale, wrapped in try/catch to handle invalid locale strings
  let displayValue: string;
  try {
    displayValue = formatCurrency
      ? animatedValue.toLocaleString(locale, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : animatedValue.toLocaleString(locale, {
          minimumFractionDigits: safeDecimals,
          maximumFractionDigits: safeDecimals,
        });
  } catch {
    // Fallback to browser default locale if provided locale is invalid
    displayValue = formatCurrency
      ? animatedValue.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : animatedValue.toLocaleString(undefined, {
          minimumFractionDigits: safeDecimals,
          maximumFractionDigits: safeDecimals,
        });
  }

  return (
    <span className={cn("tabular-nums", className)}>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
}

export default AnimatedNumber;
