import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve, normalize } from 'path';
import { existsSync } from 'fs';

const webSrcPath = normalize(resolve(__dirname, '../../src'));
const mobileSrcPath = normalize(resolve(__dirname, './src'));

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

// https://vite.dev/config/
export default defineConfig({
  plugins: [contextualAliasPlugin(), react(), tailwindcss()],
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
