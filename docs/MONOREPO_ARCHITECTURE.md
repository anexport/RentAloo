# Architettura Monorepo: Web + Mobile Sincronizzate

## Obiettivo

Creare una struttura "una volta e basta" che permetta a Web App e Mobile App (Capacitor) di:
- Condividere **tutto il codice non-UI**: tipi, logica business, API client, validazione, hooks data-only
- Usare **lo stesso backend** Supabase + Stripe
- Avere **UI specifiche** dove necessario (routing, navigation, payment flow)
- Supportare **plugin nativi** per mobile (PaymentSheet, Maps, Push)

---

## 1. File Tree Monorepo

```
rentaloo/
├── package.json                    # Root workspace config
├── pnpm-workspace.yaml             # pnpm workspace definition
├── turbo.json                      # Turborepo build orchestration
├── tsconfig.base.json              # Shared TS config
├── .env.example                    # Template env vars
│
├── packages/
│   ├── shared/                     # 🔥 CODICE CONDIVISO
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts            # Re-export everything
│   │   │   │
│   │   │   ├── api/                # Supabase client wrapper
│   │   │   │   ├── client.ts       # createClient factory
│   │   │   │   ├── auth.ts         # Auth operations (signIn, signOut, getSession)
│   │   │   │   ├── equipment.ts    # Equipment queries
│   │   │   │   ├── booking.ts      # Booking queries + mutations
│   │   │   │   ├── messaging.ts    # Conversations + messages
│   │   │   │   ├── payments.ts     # Payment intent creation
│   │   │   │   └── storage.ts      # Upload helpers
│   │   │   │
│   │   │   ├── types/              # Tutti i tipi TypeScript
│   │   │   │   ├── database.types.ts
│   │   │   │   ├── booking.ts
│   │   │   │   ├── messaging.ts
│   │   │   │   ├── payment.ts
│   │   │   │   ├── equipment.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── logic/              # Business logic pura
│   │   │   │   ├── booking.ts      # calculateBookingTotal, checkConflicts
│   │   │   │   ├── deposit.ts      # Deposit calculations
│   │   │   │   ├── insurance.ts    # Insurance calculations
│   │   │   │   ├── format.ts       # Date/currency formatting
│   │   │   │   └── validation.ts   # Zod schemas
│   │   │   │
│   │   │   ├── hooks/              # React hooks NON-UI (data fetching)
│   │   │   │   ├── useAuth.ts      # Auth state (NO JSX)
│   │   │   │   ├── useBookings.ts  # Booking queries
│   │   │   │   ├── useEquipment.ts # Equipment queries
│   │   │   │   ├── useMessaging.ts # Messaging + realtime
│   │   │   │   ├── usePayment.ts   # Payment operations
│   │   │   │   └── useReviews.ts
│   │   │   │
│   │   │   └── config/             # Constants + config
│   │   │       ├── constants.ts
│   │   │       └── categories.ts
│   │   │
│   │   └── vitest.config.ts        # Test config for shared
│   │
│   ├── ui/                         # 🎨 UI COMPONENTS CONDIVISI (opzionale)
│   │   ├── package.json
│   │   └── src/
│   │       ├── button.tsx          # shadcn/ui primitives
│   │       ├── input.tsx
│   │       ├── card.tsx
│   │       └── ...
│   │
│   └── capacitor-plugins/          # 📱 Plugin wrappers (opzionale)
│       ├── package.json
│       └── src/
│           ├── stripe.ts           # PaymentSheet wrapper
│           ├── maps.ts             # Native maps wrapper
│           └── push.ts             # Push notifications wrapper
│
├── apps/
│   ├── web/                        # 🌐 WEB APP (Vite + React)
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── index.html
│   │   ├── .env                    # Web-specific env
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx             # React Router routes
│   │       ├── components/         # Web-specific components
│   │       │   ├── layout/         # Header, Sidebar (web navigation)
│   │       │   ├── payment/        # Stripe Elements checkout
│   │       │   └── ...
│   │       ├── pages/              # Web pages
│   │       └── styles/
│   │
│   └── mobile/                     # 📱 MOBILE APP (Capacitor)
│       ├── package.json
│       ├── vite.config.ts
│       ├── capacitor.config.ts
│       ├── tsconfig.json
│       ├── index.html
│       ├── .env                    # Mobile-specific env
│       ├── ios/                    # Xcode project
│       ├── android/                # Android Studio project
│       └── src/
│           ├── main.tsx
│           ├── App.tsx             # Tab-based navigation
│           ├── components/
│           │   ├── navigation/     # TabBar, MobileHeader
│           │   ├── payment/        # PaymentSheet native
│           │   └── maps/           # Native maps
│           ├── screens/            # Mobile screens
│           │   ├── ExploreScreen.tsx
│           │   ├── MessagesScreen.tsx
│           │   ├── RentalsScreen.tsx
│           │   └── ProfileScreen.tsx
│           └── plugins/            # Capacitor plugin integrations
│
└── supabase/                       # Backend (unchanged)
    ├── migrations/
    ├── functions/
    └── config.toml
```

---

## 2. Cosa va in `packages/shared`

### API Client (`packages/shared/src/api/`)

```typescript
// client.ts - Factory che accetta storage adapter
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

export type StorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

export const createSupabaseClient = (
  url: string,
  anonKey: string,
  storage?: StorageAdapter
): SupabaseClient<Database> => {
  return createClient<Database>(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // Mobile gestisce manualmente
      storage: storage, // Web: localStorage, Mobile: SecureStorage
    },
  });
};
```

### Types (`packages/shared/src/types/`)

**TUTTO** da `src/types/*` attuale:
- `database.types.ts` (generato da Supabase)
- `booking.ts`
- `messaging.ts`
- `payment.ts`
- `equipment.ts` (nuovo, da estrarre)
- `verification.ts`
- `review.ts`
- `search.ts`

### Logic (`packages/shared/src/logic/`)

Da `src/lib/*` attuale, **senza dipendenze UI o env vars**:
- `booking.ts` → `calculateBookingTotal`, `getInsuranceOptions`
- `deposit.ts` → `calculateDeposit`
- `format.ts` → `formatCurrency`, `formatDate`
- `validation.ts` → tutti gli schema Zod (estratti da vari file)
- `utils.ts` → utility pure (no DOM)

**NON** va in shared:
- `supabase.ts` (usa `import.meta.env`)
- `stripe.ts` (usa `loadStripe` browser-only)
- `googleMapsLoader.ts` (browser-only)

### Hooks data-only (`packages/shared/src/hooks/`)

Hooks che fanno **solo data fetching**, senza JSX:
- `useAuth.ts` (state + operations, no UI)
- `useBookings.ts` / `useBookingRequests.ts`
- `useEquipment.ts` / `useEquipmentAutocomplete.ts`
- `useMessaging.ts` (core logic, no toast)
- `usePayment.ts` (createPaymentIntent, no Stripe Elements)
- `useReviews.ts`
- `useFavorites.ts`
- `useDebounce.ts`

**Pattern**: hooks ricevono `supabaseClient` come parametro o da context condiviso.

---

## 3. Cosa resta specifico

### Web (`apps/web/`)

| Categoria | File/Componenti |
|-----------|-----------------|
| **Routing** | React Router v7 con BrowserRouter |
| **Layout** | Header, Sidebar, Footer |
| **Navigation** | Link-based, breadcrumbs |
| **Payment** | Stripe Elements (Payment Element) |
| **Maps** | Google Maps JavaScript API |
| **Auth UI** | Supabase Auth UI, OAuth redirect |
| **Upload** | `<input type="file">` standard |
| **Notifications** | Browser notifications (optional) |

### Mobile (`apps/mobile/`)

| Categoria | File/Componenti |
|-----------|-----------------|
| **Routing** | React Router o custom stack (IonRouter) |
| **Layout** | Tab navigation (bottom tabs) |
| **Navigation** | Stack-based con gesture |
| **Payment** | **PaymentSheet nativo** (Stripe plugin) |
| **Maps** | **Native maps** (@capacitor/google-maps) |
| **Auth UI** | Custom forms + deep link OAuth |
| **Upload** | Camera + Photo Gallery plugin |
| **Notifications** | **Push notifications** (@capacitor/push-notifications) |
| **Storage** | **SecureStorage** per token |

---

## 4. Strategia Env Vars e Config

### Struttura

```
rentaloo/
├── .env.example                    # Template con TUTTE le variabili
├── apps/web/.env                   # Web-specific (VITE_*)
├── apps/mobile/.env                # Mobile-specific (VITE_*)
└── packages/shared/                # NO env vars dirette!
```

### Regola d'oro

> **`packages/shared` NON legge mai env vars direttamente.**
> Riceve i valori come parametri dalle apps.

### Web `.env`

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_GOOGLE_MAPS_API_KEY=AIza...
VITE_APP_URL=https://rentaloo.app
```

### Mobile `.env`

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
# Google Maps key in capacitor.config.ts o native config
# VITE_APP_URL non serve (usa deep links)
```

### Config pattern in shared

```typescript
// packages/shared/src/config/index.ts
export interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  stripePublishableKey: string;
  appUrl?: string;
}

let config: AppConfig | null = null;

export const initConfig = (c: AppConfig) => {
  config = c;
};

export const getConfig = (): AppConfig => {
  if (!config) throw new Error('Config not initialized');
  return config;
};
```

---

## 5. Strategia Auth Storage (Sicurezza Token)

### Web: localStorage (default Supabase)

```typescript
// apps/web/src/lib/supabase.ts
import { createSupabaseClient } from '@rentaloo/shared';

export const supabase = createSupabaseClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
  // storage: undefined → usa localStorage di default
);
```

### Mobile: SecureStorage (Keychain/Keystore)

```typescript
// apps/mobile/src/lib/supabase.ts
import { createSupabaseClient, StorageAdapter } from '@rentaloo/shared';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';

const secureStorage: StorageAdapter = {
  getItem: async (key) => {
    try {
      const { value } = await SecureStoragePlugin.get({ key });
      return value;
    } catch {
      return null;
    }
  },
  setItem: async (key, value) => {
    await SecureStoragePlugin.set({ key, value });
  },
  removeItem: async (key) => {
    await SecureStoragePlugin.remove({ key });
  },
};

export const supabase = createSupabaseClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  secureStorage
);
```

### Tabella comparativa

| Aspetto | Web | Mobile |
|---------|-----|--------|
| Storage | localStorage | Keychain (iOS) / Keystore (Android) |
| Encryption | No (browser gestisce) | Sì (hardware-backed) |
| Plugin | Nessuno | `capacitor-secure-storage-plugin` |
| Persistenza | Fino a clear | Fino a uninstall o logout |

---

## 6. Strategia Deep Link

### Schema URL

```
rentaloo://                         # App scheme
https://rentaloo.app/               # Universal/App Links
```

### Casi d'uso

| Flusso | URL | Azione |
|--------|-----|--------|
| Payment return | `rentaloo://payment/confirmation?payment_intent=pi_xxx` | Chiudi WebView, mostra conferma |
| OAuth callback | `rentaloo://auth/callback#access_token=xxx` | Parsa token, completa login |
| Password reset | `rentaloo://auth/reset?token=xxx` | Apri form reset |
| Booking link | `rentaloo://booking/123` | Apri dettaglio booking |
| Equipment share | `https://rentaloo.app/equipment/456` | Universal link → app o web |

### Configurazione Capacitor

```typescript
// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.rentaloo.mobile',
  appName: 'Rentaloo',
  webDir: 'dist',
  server: {
    // Per development
    // url: 'http://192.168.1.x:5173',
    // cleartext: true
  },
  plugins: {
    // Deep links
    App: {
      // iOS: configurato in Associated Domains
      // Android: configurato in AndroidManifest.xml
    }
  }
};

export default config;
```

### iOS: Associated Domains

```
// ios/App/App.entitlements
applinks:rentaloo.app
```

### Android: Intent Filter

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="rentaloo.app" />
</intent-filter>
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="rentaloo" />
</intent-filter>
```

### Handler in App

```typescript
// apps/mobile/src/plugins/deepLinks.ts
import { App } from '@capacitor/app';
import { useNavigate } from 'react-router-dom';

export const useDeepLinks = () => {
  const navigate = useNavigate();

  useEffect(() => {
    App.addListener('appUrlOpen', ({ url }) => {
      const path = new URL(url).pathname;
      
      if (path.startsWith('/payment/confirmation')) {
        const params = new URL(url).searchParams;
        navigate(`/payment/confirmation?${params.toString()}`);
      } else if (path.startsWith('/auth/callback')) {
        // Handle OAuth token
        handleOAuthCallback(url);
      } else {
        navigate(path);
      }
    });

    return () => {
      App.removeAllListeners();
    };
  }, [navigate]);
};
```

---

## 7. Checklist Migrazione (Step-by-Step)

### Fase 0: Preparazione (non rompe nulla)

- [ ] **Step 1**: Installare pnpm e turborepo globalmente
- [ ] **Step 2**: Creare `pnpm-workspace.yaml` nella root
- [ ] **Step 3**: Creare `turbo.json` con pipeline build/test/lint
- [ ] **Step 4**: Creare `tsconfig.base.json` con settings condivisi

### Fase 1: Creare packages/shared (non rompe nulla)

- [ ] **Step 5**: Creare cartella `packages/shared` con package.json
- [ ] **Step 6**: Copiare `src/types/*` → `packages/shared/src/types/`
- [ ] **Step 7**: Copiare `src/lib/database.types.ts` → shared
- [ ] **Step 8**: Estrarre logic pura da `src/lib/booking.ts` → `packages/shared/src/logic/booking.ts`
- [ ] **Step 9**: Estrarre format utilities → `packages/shared/src/logic/format.ts`
- [ ] **Step 10**: Estrarre Zod schemas → `packages/shared/src/logic/validation.ts`
- [ ] **Step 11**: Creare API client factory → `packages/shared/src/api/client.ts`
- [ ] **Step 12**: Build e test packages/shared

### Fase 2: Spostare web app (atomico, può rollback)

- [ ] **Step 13**: Creare `apps/web` con struttura minima
- [ ] **Step 14**: Spostare `src/` → `apps/web/src/`
- [ ] **Step 15**: Spostare `vite.config.ts`, `tsconfig.json`, `index.html` → `apps/web/`
- [ ] **Step 16**: Aggiornare import in `apps/web` per usare `@rentaloo/shared`
- [ ] **Step 17**: Aggiornare `apps/web/package.json` con dipendenza shared
- [ ] **Step 18**: Verificare `pnpm dev` in `apps/web` funziona identico a prima
- [ ] **Step 19**: Run full test suite, verificare nessuna regressione

### Fase 3: Creare apps/mobile (additive, non tocca web)

- [ ] **Step 20**: Creare `apps/mobile` con Vite + Capacitor config
- [ ] **Step 21**: Installare Capacitor CLI e core plugins
- [ ] **Step 22**: Creare struttura screens/ con tab navigation
- [ ] **Step 23**: Integrare `@rentaloo/shared` per types e logic
- [ ] **Step 24**: Implementare auth con SecureStorage
- [ ] **Step 25**: Implementare PaymentSheet nativo (no Stripe Elements)
- [ ] **Step 26**: Configurare deep links
- [ ] **Step 27**: `npx cap add ios` e `npx cap add android`
- [ ] **Step 28**: Test su simulatori iOS e Android
- [ ] **Step 29**: Configurare push notifications
- [ ] **Step 30**: Build e test completo mobile

---

## Package.json Root (esempio)

```json
{
  "name": "rentaloo",
  "private": true,
  "workspaces": ["packages/*", "apps/*"],
  "scripts": {
    "dev": "turbo run dev",
    "dev:web": "turbo run dev --filter=@rentaloo/web",
    "dev:mobile": "turbo run dev --filter=@rentaloo/mobile",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  },
  "packageManager": "pnpm@9.0.0"
}
```

---

## Dipendenze per Package

### `packages/shared`

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.76.1",
    "zod": "^4.1.12",
    "date-fns": "^4.1.0"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "@tanstack/react-query": "^5.0.0"
  }
}
```

### `apps/mobile` (aggiuntive)

```json
{
  "dependencies": {
    "@rentaloo/shared": "workspace:*",
    "@capacitor/core": "^6.0.0",
    "@capacitor/app": "^6.0.0",
    "@capacitor/status-bar": "^6.0.0",
    "@capacitor/splash-screen": "^6.0.0",
    "@capacitor/keyboard": "^6.0.0",
    "@capacitor/push-notifications": "^6.0.0",
    "@capacitor/google-maps": "^6.0.0",
    "@capacitor-community/stripe": "^6.0.0",
    "capacitor-secure-storage-plugin": "^0.9.0"
  },
  "devDependencies": {
    "@capacitor/cli": "^6.0.0"
  }
}
```

---

## Rischi e Mitigazioni

| Rischio | Probabilità | Mitigazione |
|---------|-------------|-------------|
| Breaking import paths durante migrazione | Media | Step atomici, test dopo ogni step |
| Hooks shared con dipendenze UI nascoste | Alta | Review manuale, no JSX in shared |
| Env vars leakate in shared | Media | Lint rule: no `import.meta.env` in packages/ |
| Capacitor plugin incompatibility | Bassa | Pin versions, test su device reali |
| Deep link non funzionanti | Media | Test manuale OAuth + payment flows |

---

## Prossimi passi

Dopo questo documento, procedo con **PROMPT 3**: implementazione concreta dello scheletro Capacitor.
