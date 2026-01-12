# Service Worker Implementation Plan (vite-plugin-pwa)

Goal: add offline/caching with cache-first (static), stale-while-revalidate (equipment listings), network-first with fallback (other API GETs), and offline fallback page using `vite-plugin-pwa` + Workbox runtime caching.

## 1) Dependencies & baseline
- Add `vite-plugin-pwa` and `workbox-window` to dev deps: `npm install -D vite-plugin-pwa workbox-window`.
- Confirm no existing service worker registration; if present, retire/align to avoid double registration.
- Ensure env vars are set (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`) so API URL rules can read `import.meta.env`.

## 2) Offline fallback asset
- Create `public/offline.html` with inline minimal styles and an “You’re offline” message plus retry/link home. Do not pull external CSS/JS.
- Optionally add a small inline SVG/icon; keep it self-contained so it renders without network.

## 3) Vite PWA configuration (`vite.config.ts`)
- Import `VitePWA` from `vite-plugin-pwa`; add to plugins with:
  - `registerType: 'autoUpdate'`
  - `devOptions: { enabled: true }` for local testing.
  - `manifest`: name, short_name, theme_color, background_color, display `standalone`, and reuse existing icons in `public` (favicon/apple-touch/maskable if available).
  - `includeAssets`: `['favicon.ico', 'apple-touch-icon.png', 'robots.txt']` (adjust to what's present).
  - `workbox.navigateFallback: '/offline.html'`.
  - `workbox.cleanupOutdatedCaches: true`, `skipWaiting: true`, `clientsClaim: true`.
- Runtime caching rules (ordered, GET only):
  1) **Static assets (cache-first)**: `url.origin === self.location.origin` and `request.destination in ['style','script','image','font']`; `cacheName: 'static-v1'`, `ExpirationPlugin` with `maxEntries` (e.g., 60) + `maxAgeSeconds` (e.g., 30 days).
  2) **CDN assets (cache-first)**: fonts/images from known CDNs (e.g., `fonts.googleapis.com`, `fonts.gstatic.com`); same cache policy as static.
  3) **Equipment listings (stale-while-revalidate)**: `url.origin === VITE_SUPABASE_URL` && `url.pathname.includes('/rest/v1/equipment')`; `cacheName: 'equipment-listings'`, `maxEntries` (e.g., 50) + `maxAgeSeconds` (e.g., 10 minutes).
  4) **Other Supabase REST GETs + safe Edge Function GETs (network-first)**: `url.origin === VITE_SUPABASE_URL` and `url.pathname.startsWith('/rest/v1/')` but not equipment; also `url.pathname.startsWith('/functions/v1/')` if GET; `networkTimeoutSeconds: 4`; `cacheName: 'api-cache'`, small `maxEntries` (e.g., 30) + `maxAgeSeconds` (e.g., 5 minutes).
  5) **Bypass**: auth endpoints (`/auth/v1`), POST/PUT/PATCH/DELETE anywhere, websockets/realtime, and payment/intents/stripe flows—do not cache.
- Ensure `globPatterns` includes `**/*.{js,css,html,ico,png,svg,webp,woff2}` so build artifacts precache.

## 4) Registration (`src/main.tsx` or `src/registerServiceWorker.ts`)
- Add guarded registration: only in production and when `import.meta.env.VITE_ENABLE_SW !== 'false'`.
- Use `workbox-window` to listen for `waiting` and show a toast/banner (“New version available — refresh”). On user accept, call `skipWaiting` and reload once `controlling`.
- Log registration errors to console for debugging.

## 5) Cache naming & cleanup
- Set `workbox` `cacheId`/`cacheNamePrefix` (e.g., `rentaloo`) to avoid collisions.
- Rely on `cleanupOutdatedCaches` plus versioned cache names above; bump suffixes (`-v1`) when changing strategies.

## 6) Testing checklist
- `npm run build && npm run preview`; in DevTools Application tab confirm SW installed and caches created.
- Simulate offline:
  - Hard reload: app shell and static assets served from cache.
  - Navigate listings page: immediate cached render, then background refresh when back online.
  - API GET (non-equipment) uses network-first with cached fallback when offline (if previously cached).
  - Any POST/PUT flows (payments/onboarding/admin) still require network and show existing in-app errors.
  - Offline navigation to unknown route shows `offline.html`.
- Run Lighthouse PWA audit and fix any missing manifest/icon/scope warnings.

## 7) Rollout / safety
- Keep `VITE_ENABLE_SW` toggle documented; set to `'false'` to skip registration during rollback.
- Document cached endpoints and expiration in README/docs; note that schema changes to equipment API may require cache version bump (e.g., change `equipment-listings` to `equipment-listings-v2`).
