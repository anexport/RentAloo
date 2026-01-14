# Mobile Page Porting Plan

> Branch: `feat/mobile-page-porting`
> Last updated: 2026-01-11

## Overview

Obiettivo: portare TUTTE le pagine della web app (versione mobile) dentro `apps/mobile`, riusando hooks/lib/supabase/stripe esistenti senza duplicare logica.

### Regole
1. Ogni pagina protetta deve stare sotto `AppLayout` (1 sola bottom nav)
2. Riusare 1:1 hooks e services dalla web app (copiare se necessario, NON duplicare logica)
3. Mobile-first: touch targets >= 44px, safe area, scroll naturale, skeleton loading
4. Logging minimale (`console.error`) su fetch principali

---

## Tabella di Porting

| Route Mobile | Pagina Web Sorgente | Componenti/Hooks Riusati | TODO Specifici | Stato |
|--------------|---------------------|--------------------------|----------------|-------|
| `/explore` | `src/pages/ExplorePage.tsx` | `supabase`, query diretta | Fetch equipment con foto | ✅ DONE |
| `/equipment/:id` | `src/pages/equipment/EquipmentDetailPage.tsx` | `fetchListingById`, `ImageGallery` | Gallery foto, prezzo, CTA booking | ✅ DONE |
| `/messages` | `src/pages/MessagingPage.tsx` | `useMessaging`, `messaging.ts` service | Lista conversazioni, real-time | ✅ DONE |
| `/conversation/:id` | `src/components/messaging/*` | `messaging.ts` service, `supabase.channel` | Chat UI, send message, real-time | ✅ DONE |
| `/rentals` | `src/pages/renter/RenterDashboard.tsx` | `useBookingRequests`, `useActiveRentals`, `BookingRequestCard` | Lista prenotazioni con tabs | ✅ DONE |
| `/booking/:id` | `src/pages/rental/*` | `useActiveRental`, booking hooks | Dettaglio prenotazione, status | ⬜ TODO |
| `/profile` | `src/pages/ProfileSettings.tsx` | `useAuth`, `Avatar` | Menu items, logout | ✅ DONE |
| `/favorites` | `src/pages/renter/RenterDashboard.tsx?tab=saved` | `useSavedEquipment` | Lista salvati | ✅ DONE |
| `/payment/:bookingId` | `src/pages/payment/*` | `usePayment`, Stripe | Checkout Stripe | ⬜ TODO |

---

## Ordine di Porting (Priorità)

1. ✅ **ExploreScreen** - Home page, lista annunci
2. ✅ **FavoritesScreen** - Lista preferiti
3. ✅ **EquipmentDetailScreen** - Dettaglio annuncio
4. ✅ **MessagesScreen** - Lista conversazioni (REAL-TIME!)
5. ✅ **ConversationScreen** - Chat singola (REAL-TIME!)
6. ✅ **RentalsScreen** - Lista prenotazioni (con BookingRequestCard dalla web)
7. ⬜ **BookingDetailScreen** - Dettaglio prenotazione
8. ✅ **ProfileScreen** - Profilo utente (menu + logout)
9. ⬜ **PaymentScreen** - Checkout Stripe

---

## Rischi per Pagina

### EquipmentDetailScreen `/equipment/:id`
- **Data fetching**: Usare `fetchListingById` dalla web app
- **Gallery**: Lazy load immagini, swipe su mobile
- **Deep link**: Deve funzionare `rentaloo://equipment/{id}`
- **CTA booking**: Redirect a pagina booking/payment

### MessagesScreen `/messages`
- **Real-time**: Supabase channel per nuovi messaggi
- **Virtualization**: Lista lunga di conversazioni
- **Unread count**: Badge aggiornato in tempo reale

### ConversationScreen `/conversation/:id`
- **Real-time**: Subscribe a nuovi messaggi
- **Upload**: Foto/file attachment
- **Keyboard**: Input che si alza con tastiera

### RentalsScreen `/rentals`
- **Dual role**: Mostrare sia come renter che owner
- **Tabs/Filter**: Pending, Active, Completed
- **Pull to refresh**: Aggiornamento lista

### BookingDetailScreen `/booking/:id`
- **Status machine**: Pending → Confirmed → Active → Completed
- **Actions**: Accept/Reject/Cancel/Complete
- **Timeline**: Storico stato

### ProfileScreen `/profile`
- **Auth guard**: Sempre autenticato
- **Avatar upload**: Foto profilo
- **Logout**: Clear session + redirect

### PaymentScreen `/payment/:bookingId`
- **Stripe integration**: Capacitor Stripe plugin
- **Security**: Token handling
- **Deep link return**: Dopo pagamento OAuth

---

## QA Checklist per Pagina

Per ogni pagina portata, verificare:

- [ ] **Build OK**: `pnpm exec tsc --noEmit && pnpm exec vite build`
- [ ] **Sync Android**: `pnpm exec cap sync android`
- [ ] **No crash**: App si apre senza crash
- [ ] **Data loads**: Dati caricano correttamente (check logcat)
- [ ] **Touch targets**: Bottoni/link >= 44px
- [ ] **Safe area**: Padding bottom per navbar
- [ ] **Loading state**: Skeleton/spinner visibile
- [ ] **Error state**: Messaggio user-friendly + retry
- [ ] **Empty state**: UI appropriata se nessun dato

---

## File Creati/Modificati

### EquipmentDetailScreen (DONE ✅)
- `apps/mobile/src/screens/EquipmentDetailScreen.tsx` - Riscrittura completa
- `apps/mobile/src/services/listings.ts` - Service con `fetchListingById`
- `apps/mobile/src/components/equipment/ImageGallery.tsx` - Gallery mobile con swipe

---

## Note Tecniche

### Struttura Import
```typescript
// Supabase - usare istanza locale mobile
import { supabase } from '@/lib/supabase';

// Componenti UI - copiati/adattati
import { MobileHeader } from '@/components/navigation/MobileHeader';

// Tipi - definiti localmente o importati da shared
import type { Listing } from '@/types/equipment';
```

### Safe Area CSS
```css
.page-content {
  padding-bottom: calc(4rem + var(--safe-area-inset-bottom));
}
```

### Touch Targets
```tsx
<button className="min-h-[44px] min-w-[44px] ...">
```
