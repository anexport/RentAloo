/**
 * Platform detection utilities
 * Detects if app is running in native mobile (Capacitor) or web browser
 *
 * Uses dynamic import to avoid bundling Capacitor in web builds
 */

/**
 * Check if running in native mobile app (iOS/Android via Capacitor)
 * Detects by checking if Capacitor global exists
 */
export const isNative = typeof window !== 'undefined' &&
  'Capacitor' in window &&
  // @ts-expect-error - Capacitor is added by native runtime
  window.Capacitor?.isNativePlatform?.() === true;

/**
 * Check if running in web browser
 */
export const isWeb = !isNative;

/**
 * Get current platform
 */
export const platform: 'ios' | 'android' | 'web' =
  typeof window !== 'undefined' && 'Capacitor' in window
    // @ts-expect-error - Capacitor is added by native runtime
    ? (window.Capacitor?.getPlatform?.() || 'web')
    : 'web';

