/**
 * Mobile Entry Point
 *
 * IMPORTANT: Web App (imported via App.tsx) already contains:
 * - BrowserRouter
 * - AuthProvider, ThemeProvider, RoleModeProvider, RentalProvider
 * - QueryClientProvider
 *
 * So we DON'T wrap with these providers here to avoid conflicts.
 * We only initialize Capacitor plugins and mount the app.
 */

import ReactDOM from 'react-dom/client';
import { initConfig } from '@rentaloo/shared';
import { App } from './App';
import { initCapacitorPlugins } from './plugins/init';
import './index.css';

// Initialize shared config
initConfig({
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  stripePublishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
});

// Initialize Capacitor plugins
initCapacitorPlugins();

// Disable StrictMode in mobile to avoid double-mount issues
ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
