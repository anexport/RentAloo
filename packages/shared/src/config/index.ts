// Config utilities
// App-agnostic configuration management

export interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  stripePublishableKey: string;
  appUrl?: string;
}

let config: AppConfig | null = null;

/**
 * Initialize shared config. Must be called once at app startup.
 * @param c - Application configuration
 */
export const initConfig = (c: AppConfig): void => {
  config = c;
};

/**
 * Get the current config. Throws if not initialized.
 */
export const getConfig = (): AppConfig => {
  if (!config) {
    throw new Error(
      'Config not initialized. Call initConfig() at app startup before using shared code.'
    );
  }
  return config;
};

/**
 * Check if config has been initialized
 */
export const isConfigInitialized = (): boolean => {
  return config !== null;
};
