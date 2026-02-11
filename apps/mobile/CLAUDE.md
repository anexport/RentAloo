# CLAUDE.md - Vaymo Mobile App (Android / Capacitor)

Guide for AI assistants working on the Vaymo mobile app.

## Design References

Target mockups are in `apps/mobile/design-references/`:
- `payment-screen.jpeg` -- Payment flow: dark header with "VayMo" brand, equipment summary card, green insurance badge, payment method selector (Visa/MC/Apple Pay), orange "Conferma Pagamento" CTA
- `booking-screen.jpeg` -- Booking flow: white header, equipment card, calendar with orange selected dates, pickup/delivery toggle buttons, orange "Disponibile entro 15 minuti" badge, orange "Conferma Prenotazione" CTA
- `map-explore-screen.jpeg` -- Explore: full-screen map of Italy with equipment pin markers, floating search bar + location button, bottom equipment card with price in orange

**Key design language:**
- Primary color: **vibrant orange** (buttons, CTAs, selected states, badges, price text)
- Green for success/insurance badges
- Dark header on payment screens, white elsewhere
- Large rounded buttons, generous card padding
- Clean white cards with subtle borders
- Calendar dates as orange circles

---

## Architecture Overview

**Strategy: "Wrap Web App"** -- The mobile app mounts the entire Vaymo web app inside a Capacitor 7 WebView, adding native platform capabilities on top. The web app is already fully mobile-responsive with Tailwind CSS.

**Web App Location:** `../../src/` (project root `src/` folder). This is the canonical source for all hooks, types, components, pages, and business logic. The mobile app imports from it via Vite aliases — never duplicates it.

**Result:** ~100 lines of mobile-specific code wrapping ~200+ web components. Zero code duplication, 100% feature parity.

### How It Works

```
apps/mobile/src/main.tsx          → Entry point, inits Capacitor plugins + shared config
apps/mobile/src/App.tsx           → ErrorBoundary + Suspense, lazy-loads WebAppWithProviders
  ↓
src/main.tsx (WebAppWithProviders) → StrictMode > QueryClientProvider > ThemeProvider > AuthProvider
  ↓
src/App.tsx                        → BrowserRouter > RoleModeProvider > RentalProvider > Routes
```

The mobile app does NOT create its own Router, Auth, Theme, or QueryClient -- the web app's `WebAppWithProviders` export includes all of them.

### Tech Stack

- **Capacitor 7** (Android only, no iOS yet)
- **React 19**, **TypeScript 5.9**, **Vite 7**, **Tailwind CSS 4**
- **Shadcn UI** (New York variant) with CVA variants
- **Supabase** (Postgres, Auth, Realtime, Storage)
- **@rentaloo/shared** workspace package for config

---

## Directory Structure

```
apps/mobile/
├── android/                    # Android native project (Gradle)
├── dist/                       # Vite build output → Capacitor serves this
├── src/
│   ├── App.tsx                 # Shell: ErrorBoundary + Suspense + OAuth deep link handler
│   ├── main.tsx                # Entry: initConfig + initCapacitorPlugins
│   ├── index.css               # MOBILE THEME OVERRIDES (colors, safe areas, touch)
│   ├── lib/
│   │   └── nativeBridge.ts     # Platform detection, storage, OAuth, logger
│   ├── plugins/
│   │   └── init.ts             # SplashScreen, StatusBar, Keyboard init
│   └── vite-env.d.ts
├── capacitor.config.ts         # App ID, plugins config, platform settings
├── vite.config.ts              # Custom plugins + aliases (KEY FILE)
├── tsconfig.json               # Path aliases, includes web src
├── package.json                # Capacitor + web dependencies
└── .env                        # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_STRIPE_PUBLISHABLE_KEY
```

### Web App Location (Canonical Source)

The web app lives at `../../src/` relative to `apps/mobile/` — i.e., the project root's `src/` folder at `/Users/mykolborghese/RentAloo-ai/rentaloo-ai/src/`. This is the **canonical source of truth** for all hooks, types, components, and pages. The mobile app wraps this web app via Capacitor WebView — it does NOT duplicate or reimplement web functionality.

**Hooks & Types:** The web app's hooks (`../../src/hooks/`) and types (`../../src/types/`) are the latest versions (migrated to React Query with bug fixes). The mobile app has NO shadow copies — all imports resolve to the web versions via `contextualAliasPlugin`.

**Components:** All UI components come from the web app (`../../src/components/`). To customize for mobile, use CSS overrides in `index.css` or component shadowing (see Restyling Strategy).

---

## Vite Configuration (KEY FILE)

`apps/mobile/vite.config.ts` has two custom plugins that are critical to understand:

### 1. `contextualAliasPlugin` -- Import Resolution

Resolves `@/` imports based on which source tree the importing file lives in:

- **Web file** (`../../src/**`) imports `@/components/ui/button` → resolves to `../../src/components/ui/button`
- **Mobile file** (`./src/**`) imports `@/hooks/useAuth` → resolves to `./src/hooks/useAuth`

**Current limitation:** Web files always resolve `@/` to web src. To override a web component for mobile builds, you'd need to modify this plugin to check mobile src first (component shadowing).

### 2. `mobileOAuthPlugin` -- Build-Time Code Transform

Transforms the web `AuthContext` at build time:
- Replaces `const bridgeUrl = \`${webUrl}/auth/bridge\`` with `const bridgeUrl = 'rentaloo://auth/callback'`
- This makes OAuth redirect directly to the app's deep link scheme instead of the web bridge

**Prerequisite:** `rentaloo://auth/callback` must be in Supabase Dashboard > Auth > Redirect URLs.

### 3. `mobileThemePlugin` -- CSS Variable Override

**CRITICAL:** The web app's `src/main.tsx` imports `src/index.css` which defines its own `:root` CSS variables (black primary, gray accents). Because `WebAppWithProviders` is lazy-loaded, the web CSS loads AFTER the mobile CSS -- overwriting mobile theme variables.

This plugin strips `:root { ... }` and `.dark { ... }` blocks from the web's `index.css` at build time, so the mobile `index.css` is the sole source of truth for theme variables. Everything else in the web CSS (Tailwind `@theme`, typography, utilities) is preserved.

**Without this plugin, any CSS variable changes in mobile `index.css` will have no effect.**

### Static Aliases

```ts
'@web'             → ../../src               (web app source)
'@web-components'  → ../../src/components
'@web-pages'       → ../../src/pages
'@rentaloo/shared' → ../../packages/shared/src
```

### TypeScript Path Aliases (tsconfig.json)

```json
"@/*"              → ["./src/*", "../../src/*"]   // Mobile first, web fallback
"@web/*"           → ["../../src/*"]
"@web-components/*"→ ["../../src/components/*"]
"@web-pages/*"     → ["../../src/pages/*"]
"@rentaloo/shared" → ["../../packages/shared/src"]
```

---

## Styling Architecture

### How Styles Flow

1. **Mobile `index.css`** is loaded by mobile `main.tsx`
2. It includes `@source "../../src/**/*.{ts,tsx}"` so Tailwind scans web app classes too
3. Mobile CSS defines its own `:root` variables (can differ from web)
4. The web app's components use Tailwind utilities that reference these CSS variables

### What You CAN Restyle (in mobile `index.css`)

**CSS custom properties** -- these control the entire color system:
```css
:root {
  --radius: 0.625rem;
  --primary: oklch(0.205 0 0);
  --background: oklch(1 0 0);
  --border: oklch(0.922 0 0);
  /* ... all 16 color tokens + dark mode variants */
}
```

Changing these in mobile `index.css` changes EVERY component -- buttons, cards, inputs, badges, etc. No code changes needed.

**Also controllable via CSS:**
- Safe area insets (already configured)
- Touch feedback (`.touch-feedback:active`)
- Scrollbar hiding (already configured)
- Input font-size (16px to prevent iOS zoom)
- Backdrop blur effects

### What You CANNOT Restyle (via CSS alone)

Tailwind utility classes hardcoded in component JSX:
- `rounded-md`, `gap-2`, `text-sm`, `shadow-md`, `h-11`, `px-4`
- `hover:scale-[1.02]`, `hover:shadow-lg` (hover effects)
- Component structure/layout

**To override these:** Use component shadowing (see Restyling Strategy below).

### Web App's Responsive Patterns

The web app is already mobile-first. Inside the Capacitor WebView (phone viewport), it renders:

- **`MobileBottomNav`** -- Bottom tab bar with role-aware items, unread badges (shows only when `useMediaQuery(maxWidth: 768px)`)
- **`DashboardLayout`** -- Mobile header with hamburger menu (`md:hidden`), desktop sidebar (`hidden md:block`)
- **Component swapping** -- `EquipmentDetailDialog` renders `FloatingBookingCTA` + `MobileSidebarDrawer` on mobile, `BookingSidebar` on desktop
- **Filters** -- `Sheet` (bottom drawer) on mobile, `Dialog` on desktop
- **Breakpoint:** `md: 768px` is the primary mobile/desktop split

---

## Restyling Strategy (Component Shadowing)

To do a full mobile restyle without touching the web app:

### Level 1: CSS Variables (colors, radius)
Edit `apps/mobile/src/index.css` `:root` block. Instant, zero risk.

### Level 2: data-slot CSS Targeting (per-component overrides without shadowing)
Target shadcn components via their `data-slot` attributes in mobile `index.css`:
```css
[data-slot="button"] { min-height: 48px; border-radius: 12px; }
[data-slot="card"] { border-radius: 16px; box-shadow: none; }
[data-slot="input"] { height: 48px; border-radius: 12px; }
```
More specific than CSS variables, less work than component shadowing. Can override Tailwind utilities via specificity.

### Level 3: Component Shadowing (structure, spacing, effects)
Modify the `contextualAliasPlugin` in `vite.config.ts` to check mobile src FIRST, even for web file imports:

```
Any file imports @/components/ui/button
  → Check apps/mobile/src/components/ui/button.tsx first
  → If exists, use it (mobile override)
  → If not, fall back to ../../src/components/ui/button.tsx (web original)
```

**Implementation:** In `contextualAliasPlugin`, before the current resolution logic, add:
```ts
// Check if a mobile override exists for this import
const mobileOverride = resolve(mobileSrcPath, relativePath);
// Try extensions...
if (existsSync(mobileOverride + '.tsx')) return mobileOverride + '.tsx';
// ... then fall through to existing context-based resolution
```

Then create mobile versions of only the UI primitives you want to change. Copy the web file, modify the Tailwind classes, keep the same props interface.

### Shadowable UI Primitives (48 files in `src/components/ui/`)

High-impact targets for restyling:
| File | What It Controls |
|------|-----------------|
| `button-variants.ts` | All button sizes, colors, hover/active effects |
| `button.tsx` | Button component wrapper |
| `card.tsx` | Card, CardHeader, CardContent, CardFooter |
| `input.tsx` | Text input styling |
| `FloatingInput.tsx` | Floating label inputs (auth forms) |
| `badge.tsx` | Badge variants |
| `sheet.tsx` | Bottom sheets / side drawers |
| `dialog.tsx` | Modal dialogs |
| `tabs.tsx` | Tab navigation |
| `separator.tsx` | Dividers |
| `skeleton.tsx` | Loading skeletons |
| `toast.tsx` / `toaster.tsx` | Toast notifications |

All use CVA (Class Variance Authority) for variants, `cn()` for class merging, and Radix UI primitives underneath.

### Level 4: Vite Transform Plugin (surgical string replacement)
Like `mobileOAuthPlugin`, create plugins that replace specific class strings at build time. Powerful but fragile -- breaks if web code changes the matched string.

### Restyling Priority Order
1. CSS variables first (colors, radius) -- instant, zero risk
2. data-slot targeting second (sizes, borders) -- medium effort, low risk
3. Component shadowing third (layout, structure) -- copy + modify, medium risk
4. Vite transforms last resort (specific string swaps) -- fragile, high risk

---

## Web App's Mobile Behavior (Important Context)

The web app is **not a desktop-only app wrapped for mobile**. It's already a fully responsive mobile-first app. Understanding what the web app already does on mobile viewports is essential before making changes.

### isNative Checks in Web App

The web `src/lib/platform.ts` exports `isNative` which is `true` inside the Capacitor WebView. The web app uses it to:
- **Skip Vercel Analytics** (`src/App.tsx:344` -- `{!isNative && <Analytics />}`)
- **Skip Marker.io widget** (`src/App.tsx:129` -- `if (isNative) return`)
- **Adjust OAuth redirect** (`src/contexts/AuthContext.tsx` -- detects native for different redirect flow)

This means you can add `isNative` checks in web code to conditionally change behavior for mobile WITHOUT touching the mobile app. But since the goal is to not touch web code, prefer CSS/shadowing approaches.

### Components That Swap for Mobile (useMediaQuery)

These web components already render differently at `< 768px`:

| Component | Mobile Rendering | Desktop Rendering |
|-----------|-----------------|-------------------|
| `MobileBottomNav` | Shows bottom tab bar with 5 tabs + center raised button | Hidden (`if (!isMobile) return null`) |
| `DashboardLayout` | Mobile header (h-14) with hamburger → Sheet menu | Desktop sidebar + top bar |
| `EquipmentDetailDialog` | `FloatingBookingCTA` + `MobileSidebarDrawer` | `BookingSidebar` (sticky panel) |
| `FiltersSheet` | Bottom `Sheet` drawer | `Dialog` modal |
| `RentalPage` / `RenterRentalPage` / `OwnerRentalPage` | Standalone `ActiveRentalPage` | Wrapped in `DashboardLayout` |
| `ExplorePage` | Mobile-optimized grid, compact search | Full search bar + HeroSection |
| `RenterDashboard` | Mobile-adapted tabs | Full desktop dashboard |
| `ConversationList` | Full-screen list | Side panel in split view |
| `SearchBarPopover` | Mobile search sheet | Desktop popover |

### MobileBottomNav Tab Configuration

The bottom nav is role-aware (changes tabs based on renter/owner mode):

**Renter mode:** Home, Explore (center), Saved, Messages, Profile
**Owner mode:** Dashboard, Listings (center + Plus icon), Calendar, Messages, Profile

Each tab supports:
- Unread badges (messages, pending bookings)
- Center raised button effect (notch cutout)
- Active state with role-colored indicator
- Path matching for nested routes

### data-slot Attributes (CSS Targeting)

Shadcn components use `data-slot` attributes. These are targetable from CSS without component shadowing:

```css
/* Example: target all buttons from mobile CSS */
[data-slot="button"] { min-height: 48px; }
[data-slot="card"] { border-radius: 1rem; }
[data-slot="input"] { font-size: 16px; }
[data-slot="floating-input"] { height: 3.5rem; }
[data-slot="skeleton"] { /* ... */ }
[data-slot="label"] { /* ... */ }
[data-slot="card-header"] { /* ... */ }
[data-slot="card-content"] { /* ... */ }
[data-slot="card-footer"] { /* ... */ }
[data-slot="sheet-content"] { /* ... */ }
[data-slot="dialog-content"] { /* ... */ }
```

This is a **4th restyling level** -- more targeted than CSS variables, less work than component shadowing. You can override specific Tailwind utilities this way.

### Custom Web Components Beyond Shadcn

These are app-specific components you may want to shadow for restyling:
- `ContentCard` -- Dashboard card with 7 variants (default, flat, ghost, elevated, interactive, dashed, highlighted) and 5 padding levels
- `FloatingInput` -- Floating label input (h-14, used in all auth forms)
- `EmptyState` -- Empty state display
- `PageSkeleton` / `PageTransitionLoader` -- Loading states
- `spinner.tsx` -- Loading spinner

---

## Android Native Project

### Structure
```
android/
├── app/src/main/
│   ├── AndroidManifest.xml        # Deep links, permissions
│   ├── java/app/rentaloo/mobile/
│   │   └── MainActivity.java      # Capacitor activity
│   └── res/values/
│       ├── strings.xml
│       ├── styles.xml             # AppTheme
│       └── ic_launcher_background.xml
├── capacitor.build.gradle         # 6 plugin dependencies
├── capacitor.settings.gradle      # Plugin project paths
└── build.gradle                   # Standard Android config
```

### Deep Link Configuration (AndroidManifest.xml)
```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="rentaloo" android:host="auth-callback" />
    <data android:scheme="rentaloo" android:host="auth" android:pathPrefix="/callback" />
</intent-filter>
```

Activity uses `android:launchMode="singleTask"` so deep links reuse the existing instance.

### Debugging on Android
```bash
# View app logs (filter to app)
adb logcat | grep -E "(MOBILE_|OAUTH_|EXCHANGE_|SESSION_|APP_URL)"

# Chrome DevTools remote debugging
# 1. Open chrome://inspect on desktop Chrome
# 2. App WebView appears under "Remote Target"
# 3. Full DevTools: Console, Network, Elements, etc.

# Install APK directly
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# Launch app
adb shell am start -n app.rentaloo.mobile/.MainActivity
```

---

## Capacitor Configuration

### App Config (`capacitor.config.ts`)
```
appId:   app.rentaloo.mobile
appName: Vaymo
webDir:  dist
```

### Installed Plugins (6)
| Plugin | Purpose | Status |
|--------|---------|--------|
| `@capacitor/app` | App state, deep links | Active |
| `@capacitor/browser` | System browser for OAuth | Active |
| `@capacitor/keyboard` | Keyboard management | Active |
| `@capacitor/preferences` | Native key-value storage | Active (via nativeBridge) |
| `@capacitor/splash-screen` | Launch screen | Active |
| `@capacitor/status-bar` | Status bar styling | Active |

### Deep Link Scheme
- `rentaloo://auth-callback` and `rentaloo://auth/callback` -- OAuth callbacks
- `rentaloo://payment/confirmation` -- Payment return (scaffolded)
- `rentaloo://equipment/{id}` -- Equipment deep links (scaffolded)

### OAuth Flow
1. User taps "Sign in with Google"
2. `mobileOAuthPlugin` has rewritten the redirect URL to `rentaloo://auth/callback`
3. Supabase starts PKCE flow, opens system browser
4. After Google auth, Supabase redirects to `rentaloo://auth/callback?code=...`
5. Capacitor's `appUrlOpen` listener catches it
6. App calls `supabase.auth.exchangeCodeForSession(code)` using the same client that generated the code_verifier
7. Session is set, browser is closed

---

## Platform Detection

Two platform detection mechanisms exist:

### Web App (`src/lib/platform.ts`)
```ts
export const isNative = window.Capacitor?.isNativePlatform?.() === true;
export const isWeb = !isNative;
export const platform: 'ios' | 'android' | 'web' = window.Capacitor?.getPlatform?.() || 'web';
```
Used by web App.tsx to conditionally skip Vercel Analytics on native.

### Mobile App (`src/lib/nativeBridge.ts`)
```ts
export const isNativePlatform = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform();
```
Also provides `storage`, `oauth`, `parseDeepLink`, `logger` utilities.

---

## Build & Development

### Commands
```bash
pnpm dev                           # Dev server at localhost:5174
pnpm build                         # Vite build → dist/
pnpm cap:sync                      # Copy dist/ to Android + sync plugins
pnpm cap:open:android              # Open in Android Studio
pnpm cap:run:android               # Build + deploy to device/emulator
```

### Full Build Pipeline
```bash
pnpm build && pnpm cap:sync && cd android && ./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

### Live Reload (Development)
Uncomment in `capacitor.config.ts`:
```ts
server: {
  url: 'http://192.168.1.x:5174',  // Your machine's local IP
  cleartext: true,
}
```
Then run `pnpm dev` and the app on device will connect to your dev server.

### Environment Variables
Same as web app, in `apps/mobile/.env`:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_STRIPE_PUBLISHABLE_KEY=...
```

---

## Known Issues & TODOs

### Debug Artifacts (Cleaned Up)
- ~~`App.tsx` padding wrapper~~ -- REMOVED
- ~~"MOBILE SHELL OK" debug banner~~ -- REMOVED
- ~~`console.log("MOBILE_APP_COMPONENT_LOADED")`~~ -- REMOVED
- `App.tsx` verbose error logging with `setFatal` -- kept (useful for dev, remove for prod)

### Architecture
- Bundle size: 915 KB (280 KB gzipped) with no code splitting
- `appId` is `app.rentaloo.mobile` but app is called "Vaymo"
- Deep link handling for non-OAuth routes (equipment, payment, booking) not yet implemented -- rebuild inside Router context when needed

---

## Full Web UI Component List (`src/components/ui/`)

48 files. When shadowing, keep the same export names and prop interfaces:

```
accordion.tsx      alert.tsx          AnimatedNumber.tsx  avatar.tsx
badge.tsx          breadcrumb.tsx     button-variants.ts  button.tsx
calendar.tsx       card.tsx           carousel.tsx        checkbox-group.tsx
checkbox.tsx       command.tsx        ContentCard.tsx     count-up.tsx
dialog.tsx         dropdown-menu.tsx  empty.tsx           EmptyState.tsx
FloatingInput.tsx  form.tsx           hover-card.tsx      input-group.tsx
input.tsx          label.tsx          PageSkeleton.tsx    password-strength.tsx
photo-lightbox.tsx popover.tsx        progress.tsx        radio-group.tsx
resizable.tsx      scroll-area.tsx    select.tsx          separator.tsx
sheet.tsx          skeleton.tsx       slider.tsx          spinner.tsx
step-progress.tsx  switch.tsx         table.tsx           tabs.tsx
textarea.tsx       toast.tsx          toaster.tsx         tooltip.tsx
```

---

## Critical Rules

1. **Never add a Router/Provider** in mobile code -- the web app's `WebAppWithProviders` already includes BrowserRouter, QueryClientProvider, AuthProvider, ThemeProvider, RoleModeProvider, RentalProvider
2. **Use `@web/` alias** to import directly from web app source (`@web/lib/supabase`, `@web/App`)
3. **The `@/` alias is context-dependent** -- resolves to mobile `src/` or web `src/` based on which file imports it (via `contextualAliasPlugin`)
4. **Mobile `index.css` is the primary styling override point** -- change CSS variables here to restyle the entire app
5. **`@source "../../src/**/*.{ts,tsx}"`** in mobile CSS ensures Tailwind generates classes used by web components
6. **Test with `pnpm build && pnpm cap:sync`** before deploying -- Vite dev server behavior can differ from built output in WebView
7. **OAuth changes require Supabase Dashboard update** -- redirect URLs must include `rentaloo://auth/callback`
8. **Don't modify files in `../../src/`** (the web app) -- all mobile customization should live in `apps/mobile/src/` or `apps/mobile/src/index.css`
9. **When shadowing a component, keep the same export interface** -- the web app's feature components import these by name. If Button exports `{ Button }`, the shadow must too
10. **Tailwind classes in shadowed components must be covered by `@source`** -- if you add new Tailwind classes in mobile shadow files, they're already scanned because mobile `src/` is the default source
11. **`useMediaQuery` in WebView always returns mobile** -- viewport is phone-sized, so `createMaxWidthQuery("md")` is always `true`, desktop branches never render
12. **Android deep links require `singleTask` launch mode** -- already configured in AndroidManifest. Changing this breaks OAuth callback handling
13. **`mobileThemePlugin` is required for CSS variable overrides** -- the web app's CSS loads after mobile CSS and would overwrite theme variables. The plugin strips the web's `:root`/`.dark` blocks at build time. Without it, changes to mobile `index.css` colors have no effect.
14. **Always rebuild + cap:sync after CSS changes** -- `pnpm build && pnpm cap:sync` then redeploy. Dev server alone may not reflect Capacitor build behavior.
15. **ALWAYS use Augment MCP (`mcp__auggie__codebase-retrieval`) for ALL codebase searches** -- This is MANDATORY, not optional. For ANY search task -- finding code, understanding implementations, locating files, exploring architecture, finding usages, finding string matches -- ALWAYS call `mcp__auggie__codebase-retrieval` with `directory_path: "/Users/mykolborghese/RentAloo-ai/rentaloo-ai"`. Never use Grep, Glob, or Bash search commands (find, rg, grep) as a first step. Only fall back to Grep if Augment's results are insufficient and you need a guaranteed exhaustive list of every occurrence.
