/**
 * Native Bridge - Platform detection and native API wrappers
 * Provides unified interface for web and native platforms
 */

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Browser } from '@capacitor/browser';

/**
 * Platform detection
 */
export const isNativePlatform = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'

/**
 * Storage Bridge - Uses Capacitor Preferences on native, localStorage on web
 */
export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (isNativePlatform) {
      const { value } = await Preferences.get({ key });
      return value;
    }
    return localStorage.getItem(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (isNativePlatform) {
      await Preferences.set({ key, value });
    } else {
      localStorage.setItem(key, value);
    }
  },

  async removeItem(key: string): Promise<void> {
    if (isNativePlatform) {
      await Preferences.remove({ key });
    } else {
      localStorage.removeItem(key);
    }
  },

  async clear(): Promise<void> {
    if (isNativePlatform) {
      await Preferences.clear();
    } else {
      localStorage.clear();
    }
  },
};

/**
 * OAuth Bridge - Opens OAuth flow in system browser on native
 * Returns to app via deep link (configured in capacitor.config.ts)
 */
export const oauth = {
  async openAuthUrl(url: string): Promise<void> {
    if (isNativePlatform) {
      // Open in system browser, will return via deep link
      await Browser.open({ url, windowName: '_self' });
    } else {
      // On web, just navigate normally
      window.location.href = url;
    }
  },

  async close(): Promise<void> {
    if (isNativePlatform) {
      await Browser.close();
    }
  },
};

/**
 * Deep Link Handler - Parses OAuth callback URLs
 * Example: rentaloo://auth/callback?access_token=...
 */
export function parseDeepLink(url: string): Record<string, string> {
  try {
    const urlObj = new URL(url);
    const params: Record<string, string> = {};
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  } catch {
    return {};
  }
}

/**
 * Console logger that respects platform
 */
export const logger = {
  log: (...args: unknown[]) => {
    if (import.meta.env.DEV || !isNativePlatform) {
      console.log('[NativeBridge]', ...args);
    }
  },
  error: (...args: unknown[]) => {
    console.error('[NativeBridge]', ...args);
  },
};

