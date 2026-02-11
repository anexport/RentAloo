import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve, normalize } from 'path';
import { existsSync } from 'fs';

const webSrcPath = normalize(resolve(__dirname, '../../src'));
const mobileSrcPath = normalize(resolve(__dirname, './src'));

/**
 * Transforms the web AuthContext for mobile builds:
 * - Changes OAuth redirectTo from the web bridge to a direct deep link.
 * - Keeps PKCE flow (default) since the code_verifier stays in the WebView's localStorage.
 *
 * WHY bypass the bridge?
 * The web bridge at www.vaymo.it only handles hash tokens (#access_token).
 * Modern Supabase always uses authorization code flow (sends ?code=...) regardless of
 * client flowType. The bridge can't exchange the code because the PKCE code_verifier
 * lives on the mobile device's WebView, not on the www.vaymo.it server.
 *
 * By redirecting directly to rentaloo://auth/callback, the code comes straight to the app.
 * The app then calls exchangeCodeForSession(code) using the same Supabase client that
 * generated the code_verifier — so the PKCE exchange succeeds.
 *
 * PREREQUISITE: Add rentaloo://auth/callback to Supabase Dashboard → Auth → URL Configuration → Redirect URLs
 */
function mobileOAuthPlugin(): Plugin {
  return {
    name: 'mobile-oauth-redirect',
    enforce: 'pre',
    transform(code, id) {
      const normalizedId = normalize(id);
      // Only transform the web AuthContext, not the mobile one
      if (!normalizedId.includes('contexts/AuthContext')) return null;
      if (normalizedId.includes('apps/mobile/src/contexts/')) return null;
      if (!code.includes('OAUTH_START')) return null;

      let transformed = code;

      // Change the bridgeUrl to use direct deep link instead of web bridge
      //    The web AuthContext builds: const bridgeUrl = `${webUrl}/auth/bridge`;
      //    We replace it with a direct deep link so PKCE code comes to the app.
      transformed = transformed.replace(
        /const bridgeUrl = `\$\{webUrl\}\/auth\/bridge`;/,
        "const bridgeUrl = 'rentaloo://auth/callback';"
      );

      if (transformed !== code) {
        console.log('[mobileOAuthPlugin] Transformed AuthContext: bridgeUrl → rentaloo://auth/callback');
        return { code: transformed, map: null };
      }
      return null;
    },
  };
}

/**
 * Custom plugin to resolve @/ imports correctly based on the importing file's location.
 * Files from web src (../../src) should resolve @/ to web src.
 * Files from mobile src (./src) should resolve @/ to mobile src.
 */
function contextualAliasPlugin(): Plugin {
  return {
    name: 'contextual-alias',
    enforce: 'pre',
    resolveId(source, importer) {
      // Only handle @/ imports
      if (!source.startsWith('@/')) return null;
      if (!importer) return null;

      // Resolve importer to absolute path
      const absoluteImporter = normalize(resolve(importer));
      const relativePath = source.slice(2); // Remove @/

      // Determine which src folder to use based on importer location
      let basePath: string;
      if (absoluteImporter.startsWith(webSrcPath)) {
        basePath = webSrcPath;
      } else {
        basePath = mobileSrcPath;
      }

      const baseResolved = resolve(basePath, relativePath);

      // Try index files first (for directory imports)
      const indexExtensions = ['/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
      for (const ext of indexExtensions) {
        const fullPath = baseResolved + ext;
        if (existsSync(fullPath)) {
          return fullPath;
        }
      }

      // Try different extensions
      const extensions = ['', '.ts', '.tsx', '.js', '.jsx'];
      for (const ext of extensions) {
        const fullPath = baseResolved + ext;
        if (existsSync(fullPath)) {
          return fullPath;
        }
      }

      // Let vite handle the rest
      return null;
    }
  };
}

/**
 * Strips :root and .dark CSS variable blocks from the web app's index.css
 * so the mobile index.css is the sole source of theme variables.
 *
 * Without this, the web CSS loads after mobile CSS and overwrites
 * the mobile theme (e.g., orange primary → back to black).
 */
function mobileThemePlugin(): Plugin {
  return {
    name: 'mobile-theme-override',
    enforce: 'pre',
    transform(code, id) {
      const normalizedId = normalize(id);
      // Only strip from web's index.css, not mobile's
      if (!normalizedId.endsWith('src/index.css')) return null;
      if (normalizedId.includes('apps/mobile')) return null;

      // Remove :root { ... } and .dark { ... } blocks that define CSS variables
      const transformed = code
        .replace(/:root\s*\{[^}]*\}/g, '/* [mobile-theme-override] :root variables stripped */')
        .replace(/\.dark\s*\{[^}]*\}/g, '/* [mobile-theme-override] .dark variables stripped */');

      if (transformed !== code) {
        console.log('[mobileThemePlugin] Stripped web CSS variables — mobile theme takes precedence');
        return { code: transformed, map: null };
      }
      return null;
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [mobileOAuthPlugin(), mobileThemePlugin(), contextualAliasPlugin(), react(), tailwindcss()],
  resolve: {
    alias: {
      // Note: @/ is handled by contextualAliasPlugin for context-aware resolution
      '@web': resolve(__dirname, '../../src'),
      '@web-components': resolve(__dirname, '../../src/components'),
      '@web-pages': resolve(__dirname, '../../src/pages'),
      '@rentaloo/shared': resolve(__dirname, '../../packages/shared/src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 5174,
    host: true, // Needed for Capacitor live reload
  },
});
