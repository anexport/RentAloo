# Mobile App Integration - Implementation Plan

## Overview

Questo documento descrive l'implementazione concreta dello scheletro Capacitor per l'app mobile Rentaloo, mantenendo la web app funzionante al 100%.

## Struttura Creata

```
rentaloo/
├── pnpm-workspace.yaml          ✅ Workspace config
├── turbo.json                   ✅ Build orchestration
├── tsconfig.base.json           ✅ Shared TS config
├── package.json                 ✅ Updated with workspaces
│
├── packages/
│   └── shared/                  ✅ SHARED PACKAGE
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts         ✅ Main export
│           ├── config/          ✅ App config utilities
│           ├── types/           ✅ All TypeScript types
│           │   ├── database.types.ts
│           │   ├── booking.ts
│           │   ├── messaging.ts
│           │   ├── payment.ts
│           │   ├── equipment.ts
│           │   ├── verification.ts
│           │   ├── review.ts
│           │   └── search.ts
│           ├── logic/           ✅ Pure business logic
│           │   ├── booking.ts
│           │   ├── format.ts
│           │   ├── validation.ts
│           │   ├── deposit.ts
│           │   └── insurance.ts
│           └── api/             ✅ Supabase client factory + API
│               ├── client.ts
│               ├── auth.ts
│               ├── equipment.ts
│               ├── booking.ts
│               ├── messaging.ts
│               ├── payments.ts
│               └── storage.ts
│
├── apps/
│   └── mobile/                  ✅ MOBILE APP
│       ├── package.json
│       ├── capacitor.config.ts
│       ├── vite.config.ts
│       ├── tsconfig.json
│       ├── index.html
│       ├── .env.example
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── index.css
│           ├── lib/
│           │   ├── supabase.ts   ✅ SecureStorage adapter
│           │   └── utils.ts
│           ├── contexts/
│           │   └── AuthContext.tsx
│           ├── components/
│           │   ├── navigation/
│           │   │   ├── TabLayout.tsx
│           │   │   └── MobileHeader.tsx
│           │   └── payment/
│           │       └── NativePaymentSheet.tsx  ✅ Native Stripe
│           ├── screens/
│           │   ├── ExploreScreen.tsx
│           │   ├── MessagesScreen.tsx
│           │   ├── RentalsScreen.tsx
│           │   ├── ProfileScreen.tsx
│           │   ├── EquipmentDetailScreen.tsx
│           │   ├── BookingDetailScreen.tsx
│           │   ├── ConversationScreen.tsx
│           │   ├── PaymentScreen.tsx
│           │   └── auth/
│           │       └── LoginScreen.tsx
│           └── plugins/
│               ├── init.ts        ✅ Capacitor plugin init
│               └── deepLinks.ts   ✅ Deep link handler
│
└── docs/
    └── MONOREPO_ARCHITECTURE.md  ✅ Architecture doc
```

---

## Commits Summary

### Commit 1: Workspace Setup
**Files created/modified:**
- `pnpm-workspace.yaml` - pnpm workspaces definition
- `turbo.json` - Turborepo build pipeline
- `tsconfig.base.json` - Shared TypeScript config
- `package.json` - Updated with workspaces and turbo scripts

### Commit 2: packages/shared Skeleton
**Files created:**
- `packages/shared/package.json`
- `packages/shared/tsconfig.json`
- `packages/shared/src/index.ts`
- `packages/shared/src/types/index.ts`
- `packages/shared/src/logic/index.ts`
- `packages/shared/src/api/index.ts`
- `packages/shared/src/config/index.ts`

### Commit 3: Move Types to Shared
**Files created:**
- `packages/shared/src/types/database.types.ts` (copied from src/lib)
- `packages/shared/src/types/booking.ts`
- `packages/shared/src/types/messaging.ts`
- `packages/shared/src/types/payment.ts`
- `packages/shared/src/types/equipment.ts`
- `packages/shared/src/types/verification.ts`
- `packages/shared/src/types/review.ts`
- `packages/shared/src/types/search.ts`

### Commit 4: Move Logic to Shared
**Files created:**
- `packages/shared/src/logic/booking.ts` - Pure booking calculations
- `packages/shared/src/logic/format.ts` - Date/currency formatting
- `packages/shared/src/logic/validation.ts` - Zod schemas
- `packages/shared/src/logic/deposit.ts` - Deposit logic
- `packages/shared/src/logic/insurance.ts` - Insurance re-exports

### Commit 5: API Client Factory
**Files created:**
- `packages/shared/src/api/client.ts` - createSupabaseClient with storage adapter
- `packages/shared/src/api/auth.ts` - Auth operations
- `packages/shared/src/api/equipment.ts` - Equipment queries
- `packages/shared/src/api/booking.ts` - Booking queries
- `packages/shared/src/api/messaging.ts` - Messaging operations
- `packages/shared/src/api/payments.ts` - Payment intent creation
- `packages/shared/src/api/storage.ts` - File upload helpers

### Commit 6: apps/web Structure
**Status:** NOT YET IMPLEMENTED
- This would move existing src/ to apps/web/src/
- Update imports to use @rentaloo/shared
- Keeping for a separate PR to minimize risk

### Commit 7: apps/mobile Skeleton
**Files created:**
- `apps/mobile/package.json` - Dependencies including Capacitor
- `apps/mobile/capacitor.config.ts` - Capacitor configuration
- `apps/mobile/vite.config.ts` - Vite config with aliases
- `apps/mobile/tsconfig.json` - TS config with path aliases
- `apps/mobile/index.html` - Mobile-optimized HTML
- `apps/mobile/.env.example` - Environment template

### Commit 8: Mobile Tab Navigation
**Files created:**
- `apps/mobile/src/main.tsx` - App entry point
- `apps/mobile/src/App.tsx` - Routes with tab navigation
- `apps/mobile/src/index.css` - Mobile-optimized styles with safe areas
- `apps/mobile/src/lib/utils.ts` - cn utility
- `apps/mobile/src/components/navigation/TabLayout.tsx` - Bottom tab bar
- `apps/mobile/src/components/navigation/MobileHeader.tsx` - Stack header
- `apps/mobile/src/screens/ExploreScreen.tsx`
- `apps/mobile/src/screens/MessagesScreen.tsx`
- `apps/mobile/src/screens/RentalsScreen.tsx`
- `apps/mobile/src/screens/ProfileScreen.tsx`
- `apps/mobile/src/screens/auth/LoginScreen.tsx`
- `apps/mobile/src/screens/EquipmentDetailScreen.tsx`
- `apps/mobile/src/screens/BookingDetailScreen.tsx`
- `apps/mobile/src/screens/ConversationScreen.tsx`
- `apps/mobile/src/screens/PaymentScreen.tsx`

### Commit 9: Mobile Auth + SecureStorage
**Files created:**
- `apps/mobile/src/lib/supabase.ts` - Supabase client with SecureStorage adapter
- `apps/mobile/src/contexts/AuthContext.tsx` - Auth provider
- `apps/mobile/src/plugins/init.ts` - Capacitor plugin initialization
- `apps/mobile/src/plugins/deepLinks.ts` - Deep link handler for OAuth/payments

### Commit 10: Native PaymentSheet
**Files created:**
- `apps/mobile/src/components/payment/NativePaymentSheet.tsx`
  - Uses @capacitor-community/stripe PaymentSheet
  - NOT Stripe Elements (web-only)
  - Handles payment flow with deep link return

---

## Key Implementation Details

### 1. SecureStorage for Tokens

```typescript
// apps/mobile/src/lib/supabase.ts
const secureStorageAdapter: StorageAdapter = {
  getItem: async (key) => {
    const { value } = await SecureStoragePlugin.get({ key });
    return value;
  },
  setItem: async (key, value) => {
    await SecureStoragePlugin.set({ key, value });
  },
  removeItem: async (key) => {
    await SecureStoragePlugin.remove({ key });
  },
};

export const supabase = createSupabaseClient(url, key, {
  storage: secureStorageAdapter,
  detectSessionInUrl: false, // Mobile handles deep links manually
});
```

### 2. Native PaymentSheet (NOT Stripe Elements)

```typescript
// apps/mobile/src/components/payment/NativePaymentSheet.tsx
import { Stripe } from '@capacitor-community/stripe';

// 1. Initialize Stripe
await Stripe.initialize({ publishableKey });

// 2. Create PaymentSheet with client_secret from backend
await Stripe.createPaymentSheet({
  paymentIntentClientSecret: clientSecret,
  merchantDisplayName: 'Rentaloo',
  returnURL: 'rentaloo://payment/confirmation',
});

// 3. Present native PaymentSheet
const result = await Stripe.presentPaymentSheet();
```

### 3. Deep Link Configuration

**iOS (Associated Domains):**
```
applinks:rentaloo.app
```

**Android (AndroidManifest.xml):**
```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <data android:scheme="https" android:host="rentaloo.app" />
</intent-filter>
<intent-filter>
  <data android:scheme="rentaloo" />
</intent-filter>
```

---

## Next Steps

### Per completare l'integrazione:

1. **Installare dipendenze:**
   ```bash
   pnpm install
   ```

2. **Buildare shared package:**
   ```bash
   cd packages/shared && pnpm build
   ```

3. **Avviare mobile dev server:**
   ```bash
   cd apps/mobile && pnpm dev
   ```

4. **Aggiungere piattaforme native:**
   ```bash
   cd apps/mobile
   npx cap add ios
   npx cap add android
   ```

5. **Sincronizzare e aprire IDE:**
   ```bash
   npx cap sync
   npx cap open ios      # Apre Xcode
   npx cap open android  # Apre Android Studio
   ```

### Per migrare la web app (Commit 6):

1. Creare `apps/web/` directory
2. Spostare contenuto di `src/` → `apps/web/src/`
3. Spostare config files → `apps/web/`
4. Aggiornare import per usare `@rentaloo/shared`
5. Testare che tutto funzioni

---

## Web App Status: ✅ UNCHANGED

La web app esistente in `src/` **non è stata toccata**. Tutte le modifiche sono additive:
- Nuovi file in `packages/`
- Nuovi file in `apps/mobile/`
- Config files nella root (non breaking)

Puoi continuare a usare `npm run dev` dalla root per la web app esistente.
