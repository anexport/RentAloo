# Mobile App — Verification Checklist (Round 2)

Post-cleanup checklist. Round 1 completed 2026-02-11.

---

## COMPLETED (Round 1 — 2026-02-11)

- [x] **Build passes cleanly** — `pnpm build` (0 errors, 3333 modules, 2.75s) + `pnpm cap:sync` (6 plugins, 0.098s)
- [x] **contextualAliasPlugin fallthrough** — Works. No active mobile file uses `@/` for deleted paths. Build confirms.
- [x] **mobileOAuthPlugin fires** — `[mobileOAuthPlugin] Transformed AuthContext: bridgeUrl → rentaloo://auth/callback`
- [x] **mobileThemePlugin fires** — `[mobileThemePlugin] Stripped web CSS variables — mobile theme takes precedence`
- [x] **Dead files deleted (74 files):**
  - `src/contexts/` (AuthContext.tsx) — web's is used via WebAppWithProviders
  - `src/services/` (listings.ts, messaging.ts) — unused
  - `src/i18n/` (57 files: config, index, 55 locale JSONs) — web's i18n handles everything
  - `src/lib/` (13 files: booking, categoryIcons, claim, database.types, deposit, format, payment, reviews, stripe, supabase, supabaseStorage, user-utils, utils, verification) — only nativeBridge.ts is active
  - `src/plugins/deepLinks.ts` — was commented out in App.tsx
- [x] **Unused Capacitor plugins uninstalled (4):** haptics, push-notifications, @capacitor-community/stripe, capacitor-secure-storage-plugin
- [x] **Active mobile src now 6 files:** main.tsx, App.tsx, index.css, lib/nativeBridge.ts, plugins/init.ts, vite-env.d.ts

---

## COMPLETED (Round 2 — 2026-02-11)

- [x] **Tailwind CSS / Styling Audit:**
  - [x] CSS variable overrides match design mockups (orange primary `oklch(0.705 0.191 47.604)`)
  - [x] `@source "../../../src/**/*.{ts,tsx}"` correctly scans all web app classes
  - [x] `data-slot` overrides working for touch targets — buttons now have `min-height: 48px`, inputs `height: 48px`
  - [x] Dark mode `.dark` block complete and consistent (18 tokens mirrored)
  - [x] Added `--success` / `--success-foreground` CSS variables for green insurance/success badges (light + dark)
  - [x] Added `--color-success` / `--color-success-foreground` to `@theme inline` for Tailwind utility support
- [x] **Leftover Code References:**
  - [x] Removed commented-out `deepLinks` import from `App.tsx:14`
  - [x] Rewrote mobile `CLAUDE.md` — removed stale directory entries (contexts/, services/, i18n/, deepLinks.ts), updated plugin count from 10 → 6, removed deleted plugin rows, cleaned up Known Issues
  - [x] Root `CLAUDE.md` verified clean — no stale mobile references
- [x] **Package.json — Unused JS Dependencies:** All 24 dependencies verified needed (15 direct + 9 transitive via web app bundle). No removable deps.
- [x] **Android Gradle Files:** Both `capacitor.build.gradle` and `capacitor.settings.gradle` clean — only 6 active plugins, 0 references to removed plugins
- [x] **Capacitor Config:** Removed stale `PushNotifications` plugin config from `capacitor.config.ts`
- [x] **Build verified:** `pnpm build` passes (3333 modules, 3.05s), all Vite plugins fire correctly

---

## REMAINING (Requires On-Device Testing or Future Work)

### 2. Supabase Client — OAuth May Break on Real Devices (FUTURE TODO)
**Risk:** Low priority — only affects real devices under memory pressure.

`App.tsx` imports `supabase` from `@web/lib/supabase` (web client, uses `localStorage` + PKCE). If Android kills the WebView during OAuth, the `code_verifier` in localStorage is lost and `exchangeCodeForSession()` fails.

**Fix options:**
1. Create a Vite plugin (like `mobileOAuthPlugin`) to swap the web's `supabase.ts` import with a mobile version that uses Capacitor Preferences storage
2. Inject a mobile Supabase client into `WebAppWithProviders`
3. Override `@/lib/supabase` resolution in `contextualAliasPlugin` for ALL importers during mobile builds

**Won't reproduce in emulator** — test on real device with multiple apps open.

### 5. Git Status — Uncommitted Deletions
~222 files show as deleted in `git status` (the `_backup/` folder, deleted hooks, deleted types, deleted services, deleted i18n). These should be committed to clean up the working tree. All active source files verified clean — 0 imports reference deleted paths.

### 7. Deep Links Beyond OAuth
The inline OAuth handler in `App.tsx:69-178` handles only auth callbacks. These deep links don't work yet:
- `rentaloo://equipment/{id}` — opening equipment from external links
- `rentaloo://payment/confirmation` — payment return
- `rentaloo://booking/{id}` — booking deep links

**Future work:** Rebuild deep link handling inside the Router context.

### 8. data-slot Visual Testing (On-Device)
Test on a real device for layout issues from CSS overrides:
- [ ] Calendar/date picker inputs (inflated to 48px?)
- [ ] Command palette inputs (search dialogs)
- [ ] Cards with ghost/flat variants (unexpected border?)
- [ ] Pill-shaped buttons (rounded-full overridden to 12px?)
- [ ] Select trigger inputs

### 9. Safe Area Padding on Notched Devices
- [ ] Content doesn't render behind bottom nav or under status bar
- [ ] Test on: Pixel with gesture navigation, any phone with notch/punch-hole
- [ ] `pb-[env(safe-area-inset-bottom)]` classes generate correctly

### 10. Error Boundary / Loading State
- `App.tsx` ErrorBoundary always renders children even on error (errors logged but never shown to user)
- Suspense fallback is a plain `<div>Loading…</div>` — could use a branded splash screen
