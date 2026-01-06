# Mobile MVP Roadmap - RentAloo

**Obiettivo**: App mobile MVP con mappa + booking request base (senza pagamenti) - **MVP B**

**Timeline**: 6 PR sequenziali per arrivare a deliverable presentabile al mentor

**Scope MVP**:
- ✅ Mappa + marker + sheet + filtri base
- ✅ Booking request end-to-end (senza pagamento)
- ❌ Pagamenti (post-MVP)
- ❌ Chat realtime (post-MVP)
- ❌ Push notifications (post-MVP)

---

## PR 1 — Monorepo pulito + app mobile che si avvia

**Obiettivo**: Repo unica, mobile avviabile, sharing pronto.

### Struttura Target

```
rentaloo-ai/
├── apps/
│   ├── web/              # Web app esistente (spostare o mantenere)
│   └── mobile/           # Nuova app React Native Expo
├── packages/
│   └── shared/           # Codice condiviso
│       ├── types/        # TypeScript types
│       ├── validators/   # Zod schemas
│       ├── utils/        # Utility functions
│       ├── supabase/     # Supabase client wrapper
│       └── i18n/         # File traduzioni JSON
├── package.json          # Root workspace
├── pnpm-workspace.yaml   # Workspace config
└── turbo.json           # Turborepo config (opzionale)
```

### Tasks

1. **Setup Monorepo**:
   - [ ] Installare `pnpm` se non presente
   - [ ] Creare `pnpm-workspace.yaml`
   - [ ] Spostare web app in `apps/web` (o mantenere root e creare solo `apps/mobile`)
   - [ ] Creare `apps/mobile` con Expo CLI: `npx create-expo-app@latest apps/mobile --template blank-typescript`

2. **Configurazione Workspace**:
   - [ ] Root `package.json` con scripts: `dev:web`, `dev:mobile`, `lint`, `typecheck`
   - [ ] Configurare `tsconfig.json` con paths `@shared/*`
   - [ ] Setup ESLint/Prettier coerenti tra web e mobile

3. **Packages/Shared**:
   - [ ] Creare `packages/shared/package.json`
   - [ ] Spostare da `src/types/` → `packages/shared/types/`
   - [ ] Spostare Zod schemas → `packages/shared/validators/`
   - [ ] Spostare utils → `packages/shared/utils/`
   - [ ] Spostare i18n JSON → `packages/shared/i18n/locales/`
   - [ ] Creare `packages/shared/supabase/` per client wrapper

4. **Mobile App Base**:
   - [ ] Configurare `apps/mobile/package.json` con dipendenze base
   - [ ] Setup `tsconfig.json` con path aliases
   - [ ] Creare `App.tsx` minimale che si avvia
   - [ ] Testare `pnpm dev:mobile` funziona

### Copilot Prompt

```
Crea monorepo con pnpm workspaces: apps/web (esistente), apps/mobile (Expo RN TS), packages/shared. 
Configura tsconfig paths @shared/*, eslint/prettier coerenti, e script root: dev:web, dev:mobile, lint, typecheck.
```

### Deliverable

- ✅ `pnpm dev:mobile` avvia Expo dev server
- ✅ App mostra "Hello World" su device/simulator
- ✅ Import da `@shared/types` funziona in mobile
- ✅ Import da `@shared/types` funziona in web

---

## PR 2 — Supabase client mobile + Auth + Guest mode (gating)

**Obiettivo**: App legge dati da Supabase anche da guest, e sa autenticarsi.

### Tasks

1. **Supabase Client React Native**:
   - [ ] Installare `@supabase/supabase-js` e `@react-native-async-storage/async-storage`
   - [ ] Creare `packages/shared/supabase/client.ts` con configurazione RN:
     ```typescript
     import { createClient } from '@supabase/supabase-js'
     import AsyncStorage from '@react-native-async-storage/async-storage'
     
     export const supabase = createClient(url, key, {
       auth: {
         storage: AsyncStorage,
         autoRefreshToken: true,
         persistSession: true,
       }
     })
     ```

2. **AuthProvider**:
   - [ ] Creare `apps/mobile/src/contexts/AuthContext.tsx`
   - [ ] Implementare `signIn`, `signUp`, `signOut`, `signInWithOAuth`
   - [ ] Gestire session persistence con AsyncStorage
   - [ ] Gestire token refresh automatico

3. **Hook useAuth**:
   - [ ] Creare `apps/mobile/src/hooks/useAuth.ts`
   - [ ] Wrapper attorno ad AuthContext
   - [ ] Gestire loading state

4. **Guest Mode Guards**:
   - [ ] Creare `apps/mobile/src/components/auth/RequireAuth.tsx` guard component
   - [ ] Mappa e dettagli attrezzatura: visibili anche anon
   - [ ] Booking request: richiede autenticazione
   - [ ] Mostrare modal login quando guest tenta booking

5. **Login/Signup Screens**:
   - [ ] Creare `LoginScreen.tsx` e `SignupScreen.tsx` base
   - [ ] Form email/password
   - [ ] OAuth buttons (Google, opzionale)

### Copilot Prompt

```
Implementa supabase client per React Native con AsyncStorage session persistence, AuthProvider, login/signup/logout, refresh token. 
Aggiungi guard: booking richiede auth, ma equipment list/map visibile anche anon.
```

### Deliverable

- ✅ App può autenticarsi e mantenere sessione
- ✅ Guest può vedere mappa/dettagli
- ✅ Guest che tenta booking vede modal login
- ✅ Dopo login, può procedere con booking

---

## PR 3 — RPC get_nearby_equipment + Map Home (core stile monopattini)

**Obiettivo**: Apri app → mappa immediata con marker per singola attrezzatura.

### Tasks

1. **Migration SQL**:
   - [ ] Creare migration `supabase/migrations/036_add_get_nearby_equipment_rpc.sql`:
     ```sql
     CREATE OR REPLACE FUNCTION get_nearby_equipment(
       p_lat DECIMAL,
       p_lng DECIMAL,
       p_radius_km DECIMAL DEFAULT 10,
       p_sport_type TEXT DEFAULT NULL,
       p_date_from DATE DEFAULT NULL,
       p_date_to DATE DEFAULT NULL,
       p_price_min DECIMAL DEFAULT NULL,
       p_price_max DECIMAL DEFAULT NULL,
       p_limit INTEGER DEFAULT 50
     )
     RETURNS TABLE (
       id UUID,
       title TEXT,
       daily_rate DECIMAL,
       latitude DECIMAL,
       longitude DECIMAL,
       location TEXT,
       distance_km DECIMAL,
       category_name TEXT,
       sport_type TEXT,
       is_available_now BOOLEAN
     )
     LANGUAGE plpgsql
     SECURITY DEFINER
     STABLE
     AS $$
     BEGIN
       RETURN QUERY
       SELECT 
         e.id,
         e.title,
         e.daily_rate,
         e.latitude,
         e.longitude,
         e.location,
         ST_Distance(
           ST_Point(p_lng, p_lat)::geography,
           ST_Point(e.longitude, e.latitude)::geography
         ) / 1000 AS distance_km,
         c.name AS category_name,
         c.sport_type,
         CASE 
           WHEN p_date_from IS NOT NULL THEN
             NOT EXISTS (
               SELECT 1 FROM availability_calendar ac
               WHERE ac.equipment_id = e.id
                 AND ac.date BETWEEN p_date_from AND COALESCE(p_date_to, p_date_from)
                 AND ac.is_available = false
             )
           ELSE true
         END AS is_available_now
       FROM equipment e
       JOIN categories c ON c.id = e.category_id
       WHERE e.is_available = true
         AND e.latitude IS NOT NULL
         AND e.longitude IS NOT NULL
         AND ST_DWithin(
           ST_Point(p_lng, p_lat)::geography,
           ST_Point(e.longitude, e.latitude)::geography,
           p_radius_km * 1000
         )
         AND (p_sport_type IS NULL OR c.sport_type = p_sport_type)
         AND (p_price_min IS NULL OR e.daily_rate >= p_price_min)
         AND (p_price_max IS NULL OR e.daily_rate <= p_price_max)
       ORDER BY distance_km
       LIMIT p_limit;
     END;
     $$;
     
     GRANT EXECUTE ON FUNCTION get_nearby_equipment TO authenticated;
     GRANT EXECUTE ON FUNCTION get_nearby_equipment TO anon;
     ```
   - [ ] Eseguire migration su Supabase

2. **React Native Maps**:
   - [ ] Installare `react-native-maps` e `expo-location`
   - [ ] Configurare permessi location in `app.json`:
     ```json
     {
       "expo": {
         "plugins": [
           [
             "expo-location",
             {
               "locationAlwaysAndWhenInUsePermission": "Permettere l'accesso alla posizione per trovare attrezzature vicine."
             }
           ]
         ]
       }
     }
     ```

3. **MapScreen**:
   - [ ] Creare `apps/mobile/src/screens/MapScreen.tsx`
   - [ ] Richiedere permesso location all'avvio
   - [ ] Fallback: se permesso negato, permettere inserimento città manuale
   - [ ] Mostrare mappa con `react-native-maps`
   - [ ] Centrare mappa su posizione utente (o città inserita)

4. **Query Nearby Equipment**:
   - [ ] Installare `@tanstack/react-query`
   - [ ] Creare hook `useNearbyEquipment(lat, lng, radius)`:
     ```typescript
     const { data, isLoading } = useQuery({
       queryKey: ['nearby-equipment', lat, lng, radius],
       queryFn: () => supabase.rpc('get_nearby_equipment', {
         p_lat: lat,
         p_lng: lng,
         p_radius_km: radius,
         p_limit: 50
       })
     })
     ```
   - [ ] Debounce query su pan/zoom (300-500ms)
   - [ ] Cache risultati con React Query

5. **Markers sulla Mappa**:
   - [ ] Renderizzare marker per ogni attrezzatura
   - [ ] Icona marker basata su `sport_type` (usare mappa da `packages/shared/lib/categoryIcons.ts`)
   - [ ] Tap su marker → seleziona attrezzatura (per bottom sheet PR 4)

### Copilot Prompt

```
Aggiungi migration Supabase per RPC get_nearby_equipment (PostGIS + ST_DWithin) con GRANT anon/authenticated. 
In mobile crea MapScreen con react-native-maps, prende location utente, chiama RPC e mostra markers. 
Usa TanStack Query + debounce pan/zoom.
```

### Deliverable

- ✅ Mappa mostra marker attrezzature vicine
- ✅ Query aggiornata su pan/zoom (debounced)
- ✅ Funziona anche senza permesso location (fallback città)
- ✅ Performance: query cached, debounced

---

## PR 4 — UX velocità: Bottom Sheet + Cards sincronizzate (marker ↔ lista)

**Obiettivo**: Tap su marker → banner/bottom sheet con info "fast" + CTA.

### Tasks

1. **Bottom Sheet**:
   - [ ] Installare `@gorhom/bottom-sheet` e `react-native-reanimated`
   - [ ] Creare `apps/mobile/src/components/EquipmentBottomSheet.tsx`
   - [ ] Configurare snap points: `['25%', '50%', '90%']`

2. **Contenuti Bottom Sheet**:
   - [ ] Foto attrezzatura (carousel se multiple)
   - [ ] Titolo attrezzatura
   - [ ] Prezzo/giorno (`daily_rate`)
   - [ ] Distanza (`distance_km` dalla RPC)
   - [ ] Label disponibilità (vedi logica sotto)
   - [ ] CTA "Prenota" (apre DateSelectionScreen PR 5)

3. **Logica "Disponibile in X minuti"**:
   - [ ] Creare funzione `calculateAvailabilityLabel(equipment, userLat, userLng)`:
     ```typescript
     function calculateAvailabilityLabel(
       equipment: Equipment,
       userLat: number,
       userLng: number
     ): string {
       // 1. Calcola distanza
       const distanceKm = calculateDistance(
         userLat, userLng,
         equipment.latitude, equipment.longitude
       )
       
       // 2. Controlla disponibilità oggi
       const isAvailableToday = checkAvailabilityToday(equipment.id)
       
       if (isAvailableToday) {
         // 3. Stima tempo viaggio (15 km/h + 5 min buffer)
         const etaMinutes = Math.ceil((distanceKm / 15) * 60) + 5
         return `Disponibile in ~${etaMinutes} min`
       } else {
         // 4. Trova prima data disponibile
         const nextAvailableDate = getNextAvailableDate(equipment.id)
         return `Disponibile dal ${formatDate(nextAvailableDate)}`
       }
     }
     ```
   - [ ] Query `availability_calendar` per controllare disponibilità oggi
   - [ ] Se non disponibile oggi, trovare prima data disponibile

4. **Lista Cards Sincronizzata**:
   - [ ] Creare `apps/mobile/src/components/EquipmentCardList.tsx`
   - [ ] Lista orizzontale scrollabile sotto mappa
   - [ ] Card mostra: foto, titolo, prezzo, distanza
   - [ ] Tap card → centra mappa su marker corrispondente + apre bottom sheet
   - [ ] Tap marker → scrolla lista a card corrispondente

5. **Sincronizzazione Marker ↔ Card**:
   - [ ] Stato condiviso: `selectedEquipmentId`
   - [ ] Tap marker → set `selectedEquipmentId` → scrolla lista
   - [ ] Tap card → set `selectedEquipmentId` → centra mappa

### Copilot Prompt

```
Implementa bottom sheet con @gorhom/bottom-sheet su MapScreen. 
Mostra card con foto, prezzo, distanza, label disponibilità. 
Aggiungi lista orizzontale di cards sincronizzata con marker selezionato.
```

### Deliverable

- ✅ Tap marker → bottom sheet si apre con info attrezzatura
- ✅ Label disponibilità mostra "Disponibile in X min" o "Disponibile dal [data]"
- ✅ Lista cards sincronizzata con marker selezionato
- ✅ UX fluida senza lag

---

## PR 5 — Booking flow base (senza pagamenti)

**Obiettivo**: Map → Sheet → Selezione date → crea booking_request.

### Tasks

1. **DateSelectionScreen**:
   - [ ] Creare `apps/mobile/src/screens/DateSelectionScreen.tsx`
   - [ ] Installare `react-native-calendars` o componente custom
   - [ ] Mostrare calendario con date disponibili/non disponibili
   - [ ] Query `availability_calendar` per equipment_id selezionato
   - [ ] Evidenziare date non disponibili (grigio/bloccate)

2. **Selezione Date**:
   - [ ] Permettere selezione `start_date` e `end_date`
   - [ ] Validazione: end_date > start_date
   - [ ] Validazione: date selezionate devono essere disponibili
   - [ ] Mostrare numero giorni selezionati

3. **Calcolo Totale**:
   - [ ] Riutilizzare `calculatePaymentSummary` da `packages/shared/utils/payment.ts`
   - [ ] Calcolare: `subtotal = daily_rate × giorni`
   - [ ] Mostrare breakdown: subtotal, service fee (5%), totale
   - [ ] **NON includere** deposito/assicurazione in MVP (solo subtotal + fee)

4. **Creazione Booking Request**:
   - [ ] Creare funzione `createBookingRequest(equipmentId, startDate, endDate, totalAmount)`:
     ```typescript
     const { data, error } = await supabase
       .from('booking_requests')
       .insert({
         equipment_id: equipmentId,
         renter_id: user.id,
         start_date: startDate,
         end_date: endDate,
         total_amount: totalAmount,
         status: 'pending'
       })
       .select()
       .single()
     ```
   - [ ] Gestire errori (es. date non più disponibili)
   - [ ] Mostrare loading state durante creazione

5. **Guest Flow**:
   - [ ] Se utente non autenticato, mostrare modal login
   - [ ] Dopo login, riprendere flow da selezione date
   - [ ] Salvare stato temporaneo (equipmentId, date selezionate) in AsyncStorage

6. **Mini Dashboard Mobile**:
   - [ ] Creare `apps/mobile/src/screens/BookingsScreen.tsx`
   - [ ] Tab navigazione: "Le mie prenotazioni"
   - [ ] Query booking_requests per renter_id
   - [ ] Mostrare lista con: attrezzatura, date, status, totale
   - [ ] Tap su booking → dettaglio (solo view, no azioni complesse in MVP)

### Copilot Prompt

```
Crea DateSelectionScreen: carica availability_calendar per equipment_id, permette selezione start/end, 
calcola totale e crea booking_request in Supabase. 
Se utente non autenticato, mostra login modal e poi riprendi il flow.
```

### Deliverable

- ✅ Utente può selezionare date disponibili
- ✅ Calcolo totale corretto
- ✅ Creazione booking_request funziona
- ✅ Guest flow: login → riprende booking
- ✅ Dashboard mostra prenotazioni utente

---

## PR 6 — Polish "da mentor": performance + immagini + stabilità

**Obiettivo**: Niente scatti, niente crash, UI chiara.

### Tasks

1. **Clustering Marker**:
   - [ ] Installare `react-native-map-clustering` o `@googlemaps/markerclusterer` (se disponibile RN)
   - [ ] Implementare clustering quando zoom < livello soglia (es. zoom < 12)
   - [ ] Cluster mostra numero attrezzature raggruppate

2. **Immagini Ottimizzate**:
   - [ ] Usare URL Supabase Storage: `equipment-photos` bucket
   - [ ] Implementare caching con `react-native-fast-image` o `expo-image`
   - [ ] Thumbnail: usare query params Supabase Storage:
     ```
     https://[project].supabase.co/storage/v1/object/public/equipment-photos/image.jpg?width=200&height=200&resize=cover
     ```
   - [ ] Lazy load immagini: carica solo quando visibili

3. **Error States**:
   - [ ] Creare `ErrorBoundary` component
   - [ ] Gestire errori network (timeout, offline)
   - [ ] Mostrare messaggi errori user-friendly
   - [ ] Retry button per errori recuperabili

4. **Loading States**:
   - [ ] Skeleton loaders per lista cards
   - [ ] Skeleton loader per bottom sheet
   - [ ] Loading spinner durante query

5. **Logs e Env**:
   - [ ] Disattivare console.log in produzione
   - [ ] Usare `__DEV__` flag per debug logs
   - [ ] Configurare env vars con `EXPO_PUBLIC_*` per Supabase:
     ```env
     EXPO_PUBLIC_SUPABASE_URL=your_url
     EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key
     ```
   - [ ] **NON committare** file `.env` (aggiungere a `.gitignore`)

6. **EAS Build Setup**:
   - [ ] Installare `eas-cli`: `npm install -g eas-cli`
   - [ ] Configurare `eas.json`:
     ```json
     {
       "build": {
         "development": {
           "developmentClient": true,
           "distribution": "internal"
         },
         "preview": {
           "distribution": "internal",
           "android": {
             "buildType": "apk"
           }
         },
         "production": {}
       }
     }
     ```
   - [ ] Creare script build: `pnpm build:mobile:preview`
   - [ ] Documentare processo in `README.md`

### Copilot Prompt

```
Configura EAS build per iOS/Android, env vars Supabase in modo sicuro (EXPO_PUBLIC_* per anon key/url), 
e crea script di build + istruzioni README per installare l'app al mentor.
```

### Deliverable

- ✅ App performante: clustering, immagini cached, debounce
- ✅ Error handling robusto
- ✅ Loading states chiari
- ✅ Build EAS funzionante
- ✅ README con istruzioni installazione

---

## Deliverable Finale per Mentor

### Come Condividere App

**Opzione 1: EAS Build (Consigliata)**
```bash
# Build preview
eas build --platform android --profile preview
eas build --platform ios --profile preview

# Condividere link installazione
# Android: APK scaricabile
# iOS: TestFlight link
```

**Opzione 2: Development Build**
```bash
# QR code per Expo Go (solo per test rapidi)
expo start
# Condividere QR code
```

### Checklist Pre-Presentazione

- [ ] App si avvia senza crash
- [ ] Mappa mostra marker corretti
- [ ] Bottom sheet funziona
- [ ] Booking flow end-to-end funziona
- [ ] Login/signup funziona
- [ ] Dashboard mostra prenotazioni
- [ ] Performance accettabile (no lag evidente)
- [ ] Error handling testato
- [ ] Build EAS completata
- [ ] README aggiornato con istruzioni

### Cosa Mostrare al Mentor

1. **Demo Flow**:
   - Aprire app → mappa si carica
   - Tap marker → bottom sheet si apre
   - Tap "Prenota" → selezione date
   - Creare booking → conferma
   - Dashboard → vedere booking creato

2. **Punti Chiave da Evidenziare**:
   - ✅ Mappa performante con clustering
   - ✅ Query geospaziali efficienti (RPC)
   - ✅ Guest mode funzionante
   - ✅ Booking flow 3-tap come richiesto
   - ✅ Code sharing tra web e mobile

3. **Cosa NON Mostrare** (non implementato):
   - ❌ Pagamenti (post-MVP)
   - ❌ Chat (post-MVP)
   - ❌ Push notifications (post-MVP)

---

## Note Importanti

### Priorità MVP

**Focus**: Velocità di reperimento attrezzature (richiesta soci)
- Mappa immediata
- Info rapide (bottom sheet)
- Booking veloce (3 tap)

**Non Priorità MVP**:
- Pagamenti (complessità Stripe mobile)
- Chat (non critico per MVP)
- Push (richiede setup Firebase/APNs)

### Rischi Mitigati

1. **RLS**: ✅ Policy permettono `anon` su equipment disponibili
2. **Geosearch**: ✅ RPC function efficiente con indice GIST
3. **Performance**: ✅ Clustering, caching, debounce
4. **Guest Mode**: ✅ RLS già configurato correttamente

### Prossimi Passi Post-MVP

1. Pagamenti Stripe React Native
2. Chat realtime (già backend pronto)
3. Push notifications (Firebase/APNs)
4. Ispezioni mobile (camera integration)
5. Notifiche booking (email + push)

---

*Roadmap creata il: $(date)*
*Basata su analisi codice esistente e risposte domande mobile*

