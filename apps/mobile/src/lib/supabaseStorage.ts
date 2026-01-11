import { Preferences } from '@capacitor/preferences';

/**
 * Storage adapter for Supabase auth using Capacitor Preferences
 * This persists the auth session in native storage (SharedPreferences on Android)
 * which survives app restarts and WebView cache clears.
 */
export const supabaseCapacitorStorage = {
  async getItem(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key });
    return value ?? null;
  },

  async setItem(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value });
  },

  async removeItem(key: string): Promise<void> {
    await Preferences.remove({ key });
  },
};
