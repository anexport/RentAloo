import { useState, useEffect, useRef } from "react";

interface UseCountUpOptions {
  /** Target value to count up to */
  end: number;
  /** Starting value (default: 0) */
  start?: number;
  /** Animation duration in milliseconds (default: 1000) */
  duration?: number;
  /** Number of decimal places (default: 0) */
  decimals?: number;
  /** Whether to start counting immediately (default: true) */
  startOnMount?: boolean;
}

/**
 * Custom hook for animated counting effect
 * Uses requestAnimationFrame for smooth 60fps animation
 * Respects prefers-reduced-motion preference
 */
export function useCountUp({
  end,
  start = 0,
  duration = 1000,
  decimals = 0,
  startOnMount = true,
}: UseCountUpOptions) {
  // Validate numeric inputs to prevent NaN/Infinity issues
  // Decimals must be a finite integer in toFixed-safe range (0-100)
  const safeDecimals = Number.isFinite(decimals) 
    ? Math.max(0, Math.min(100, Math.round(decimals))) 
    : 0;
  // Ensure start and end are finite numbers
  const safeEnd = Number.isFinite(end) ? end : 0;
  const safeStart = Number.isFinite(start) ? start : safeEnd; // Fallback to end if start is invalid

  const [value, setValue] = useState(startOnMount ? safeStart : safeEnd);
  const [isComplete, setIsComplete] = useState(!startOnMount);
  const [restartCount, setRestartCount] = useState(0);
  const frameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Reactive reduced motion preference
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  // Listen for reduced motion preference changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    // If reduced motion is preferred, skip to end immediately
    if (prefersReducedMotion) {
      setValue(safeEnd);
      setIsComplete(true);
      return;
    }

    // If not starting on mount and this isn't a restart, skip animation
    if (!startOnMount && restartCount === 0) {
      setValue(safeEnd);
      setIsComplete(true);
      return;
    }

    // Short-circuit: if start equals end, no animation needed
    if (safeStart === safeEnd) {
      setValue(safeDecimals > 0 
        ? Number(safeEnd.toFixed(safeDecimals)) 
        : Math.round(safeEnd)
      );
      setIsComplete(true);
      return;
    }

    // Validate duration to prevent Infinity/NaN
    const safeDuration = Number.isFinite(duration) && duration > 0 
      ? duration 
      : 1; // Fallback to 1ms for instant completion

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / safeDuration, 1);

      // Ease out cubic for smooth deceleration
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const currentValue = safeStart + (safeEnd - safeStart) * easeOutCubic;

      setValue(
        safeDecimals > 0
          ? Number(currentValue.toFixed(safeDecimals))
          : Math.round(currentValue)
      );

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setIsComplete(true);
      }
    };

    // Reset and start animation
    startTimeRef.current = null;
    setIsComplete(false);
    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [safeEnd, safeStart, duration, safeDecimals, startOnMount, prefersReducedMotion, restartCount]);

  // Restart function for manual control
  const restart = () => {
    startTimeRef.current = null;
    setValue(safeStart);
    setIsComplete(false);
    setRestartCount((c) => c + 1); // Trigger effect to re-run animation
  };

  return { value, isComplete, restart };
}

export default useCountUp;
