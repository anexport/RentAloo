# Page Parity Template

Template standardizzato per portare una singola pagina dalla **Web Mobile App** (`src/`) alla **Mobile App Capacitor** (`apps/mobile/src/`) garantendo parità funzionale 1:1.

**Come usare questo template:**
1. Copia questo file per ogni pagina da portare: `[PageName]_PARITY_CHECKLIST.md`
2. Compila ogni sezione analizzando la pagina web sorgente
3. Usa la checklist durante l'implementazione
4. Firma ogni item completato
5. Esegui i test prima di considerare la pagina "completa"

---

## INFORMAZIONI GENERALI

| Campo | Valore |
|-------|--------|
| **Nome Pagina** | [Es. Equipment Detail Page] |
| **Priorità** | 🔴 P0 / 🟠 P1 / 🟡 P2 / 🟢 P3 |
| **Milestone** | [M0/M1/M2/M3/M4] |
| **Effort Stimato** | [XS/S/M/L/XL] (giorni) |
| **Dev Assignato** | [Nome] |
| **Data Inizio** | [gg/mm/aaaa] |
| **Data Completamento** | [gg/mm/aaaa] |
| **Status** | ❌ Not Started / ⏳ In Progress / ✅ Completed |

---

## SORGENTE WEB

| Campo | Valore |
|-------|--------|
| **Route Web** | [Es. `/equipment/:id`] |
| **File Path Web** | [Es. `src/pages/equipment/EquipmentDetailPage.tsx`] |
| **Componenti Web Collegati** | [Lista component path, es. `src/components/equipment/EquipmentCard.tsx`] |
| **Modali/Sheet Web** | [Lista modali usati dalla pagina, es. `EquipmentDetailDialog`, `BookingForm`] |
| **Layout Web** | [Es. `DashboardLayout`, `ExploreHeader`, `MobileBottomNav`] |

---

## DESTINAZIONE MOBILE

| Campo | Valore |
|-------|--------|
| **Route Mobile** | [Es. `/equipment/:id`] |
| **File Path Mobile** | [Es. `apps/mobile/src/screens/EquipmentDetailScreen.tsx`] |
| **Componenti Mobile da Creare** | [Lista component path da creare] |
| **Componenti Mobile da Riusare** | [Lista component path già esistenti] |
| **Layout Mobile** | [Es. `AppLayout`, `MobileHeader`, `MobileBottomNav`] |

---

## FEATURE LIST (from Web)

### Feature 1: [Nome Feature]

**Descrizione:** [Breve descrizione cosa fa questa feature]

**Componenti coinvolti:**
- [ ] `[ComponentName]` - [path]

**API/Hooks usati:**
- [ ] `[hookName]` - [es. `useQuery`, `useAuth`, `supabase.from('table')`]
- [ ] `[utilName]` - [es. `formatCurrency`, `calculatePrice`]

**Stati gestiti:**
- [ ] Loading: [descrizione loading state, es. skeleton, spinner]
- [ ] Empty: [descrizione empty state, es. "No data available"]
- [ ] Error: [descrizione error state, es. toast error message]
- [ ] Success: [descrizione success state]

**Props/Params:**
- [ ] `[propName]`: `[type]` - [descrizione]

**User Actions:**
- [ ] [Azione utente, es. "Click su button X → navigate to Y"]
- [ ] [Azione utente, es. "Input text → trigger search"]

**Validation Rules:**
- [ ] [Regola validazione, es. "Email must be valid format"]

**Dependencies:**
- [ ] [Dipendenza esterna, es. Capacitor Camera plugin]
- [ ] [Altro component/hook, es. `useAuth` hook]

---

### Feature 2: [Nome Feature]

[Ripeti struttura Feature 1 per ogni feature della pagina]

---

## MODAL/SHEET LIST (from Web)

### Modal 1: [Nome Modal]

**Trigger:** [Come si apre, es. "Click button X", "Query param ?modal=true"]

**Componente Web:** `[path]`

**Componente Mobile:** `[path]` (da creare / riusare)

**Contenuto:**
- [ ] [Elemento UI, es. "Form con email input + password input"]
- [ ] [Elemento UI, es. "Submit button"]

**Actions:**
- [ ] [Azione, es. "Submit form → call API → close modal"]
- [ ] [Azione, es. "Close button → dismiss modal"]

**Stati:**
- [ ] Loading
- [ ] Error
- [ ] Success

---

### Modal 2: [Nome Modal]

[Ripeti struttura Modal 1 per ogni modale]

---

## HOOK/API LIST (from Web)

| Hook/API | Path Web | Path Mobile | Status | Note |
|----------|----------|-------------|--------|------|
| `[hookName]` | `src/hooks/[file]` | `apps/mobile/src/hooks/[file]` | ❌ / ⏳ / ✅ | [Note se serve adattamento] |
| `[serviceName]` | `src/lib/[file]` | `apps/mobile/src/lib/[file]` | ❌ / ⏳ / ✅ | |
| `supabase.from('[table]')` | - | - | ✅ | [Note query] |

---

## STATES CHECKLIST (Loading/Empty/Error)

### Loading State

- [ ] **Trigger:** [Quando si attiva, es. "On page mount durante fetch dati"]
- [ ] **UI:**
  - [ ] [Elemento UI, es. "Skeleton for card list"]
  - [ ] [Elemento UI, es. "Spinner centered"]
- [ ] **Durata massima:** [Es. "5 secondi, poi timeout error"]

### Empty State

- [ ] **Trigger:** [Quando si attiva, es. "Query returns 0 results"]
- [ ] **UI:**
  - [ ] [Elemento UI, es. "Icon + message 'No equipment found'"]
  - [ ] [Elemento UI, es. "CTA button 'Browse All'"]
- [ ] **User Action:** [Es. "Click CTA → navigate to /explore"]

### Error State

- [ ] **Trigger:** [Quando si attiva, es. "API call fails"]
- [ ] **UI:**
  - [ ] [Elemento UI, es. "Alert banner con messaggio errore"]
  - [ ] [Elemento UI, es. "Retry button"]
- [ ] **Error Handling:**
  - [ ] Toast error notification
  - [ ] Console.error log (per debug)
  - [ ] Sentry error tracking (optional)
- [ ] **Retry Mechanism:** [Es. "Click retry → refetch API"]

### Success State

- [ ] **Trigger:** [Quando si attiva, es. "Data fetched successfully"]
- [ ] **UI:**
  - [ ] [Elemento UI, es. "List di cards popolata"]
- [ ] **Transition:** [Es. "Fade in animation"]

---

## ACCEPTANCE CRITERIA (Mobile)

**Definition of Done per questa pagina:**

### UI/UX Criteria

- [ ] Pagina renderizza correttamente su tutte le dimensioni mobile (iOS + Android)
- [ ] Tutti gli elementi UI sono accessibili (tap target >= 44px)
- [ ] Animazioni smooth (60fps)
- [ ] Safe area insets gestiti correttamente (top notch + bottom home indicator)
- [ ] Dark mode supportato (se applicabile)
- [ ] i18n: tutti i testi sono traducibili (useTranslation)

### Functional Criteria

- [ ] Tutte le feature della lista sopra sono implementate
- [ ] Tutti gli stati (loading/empty/error/success) funzionano correttamente
- [ ] User actions producono risultati attesi
- [ ] Validazione input funziona come in web
- [ ] Navigation funziona (back button, deep links)

### Data/API Criteria

- [ ] API calls usano gli stessi endpoint della web app
- [ ] Response data format è identico (TypeScript types condivisi)
- [ ] Error handling è consistente
- [ ] RLS policies Supabase rispettate (nessun accesso unauthorized)

### Performance Criteria

- [ ] Pagina carica in < 2 secondi (su 4G)
- [ ] Immagini ottimizzate (lazy load, compressed)
- [ ] Nessun memory leak (unmount cleanup)
- [ ] Smooth scroll (virtual scroll se lista > 100 items)

### Security Criteria

- [ ] Auth check presente (redirect to login se non autenticato)
- [ ] User input sanitizzato (XSS prevention)
- [ ] Sensitive data non loggata in console (production)

---

## DIFF CHECKLIST (File Toccati)

**File Creati/Modificati durante implementazione:**

### Nuovi File

- [ ] `apps/mobile/src/screens/[ScreenName].tsx` - Main screen component
- [ ] `apps/mobile/src/components/[ComponentName].tsx` - [Descrizione]
- [ ] `apps/mobile/src/hooks/[hookName].ts` - [Descrizione]
- [ ] `apps/mobile/src/lib/[utilName].ts` - [Descrizione]
- [ ] `apps/mobile/src/types/[typeName].ts` - [Descrizione]

### File Modificati

- [ ] `apps/mobile/src/App.tsx` - Added route for new screen
- [ ] `apps/mobile/src/components/layout/MobileBottomNav.tsx` - [Se serve update nav]
- [ ] `[Altri file]`

### File Condivisi (packages/shared)

- [ ] `packages/shared/src/types/[typeName].ts` - [Se type condiviso web+mobile]
- [ ] `packages/shared/src/utils/[utilName].ts` - [Se util condiviso]

---

## TESTING CHECKLIST

### Unit Tests (Optional ma consigliato)

- [ ] Test hook `[hookName]` con mock data
- [ ] Test util function `[utilName]` con edge cases
- [ ] Test component render con props variations

### Smoke Tests (Manuale - REQUIRED)

- [ ] **Happy Path:**
  - [ ] [Step 1: es. "Navigate to page from home"]
  - [ ] [Step 2: es. "Data loaded successfully"]
  - [ ] [Step 3: es. "User action X → navigate to Y"]
- [ ] **Loading State:**
  - [ ] [Verificare skeleton appare durante fetch]
- [ ] **Empty State:**
  - [ ] [Mock API per return empty array → verificare empty message]
- [ ] **Error State:**
  - [ ] [Mock API error → verificare error alert + retry button]

### Edge Cases (Manuale - REQUIRED)

- [ ] **Case 1:** [Descrizione, es. "User not authenticated → redirect to login"]
- [ ] **Case 2:** [Descrizione, es. "Invalid param in URL → 404 error"]
- [ ] **Case 3:** [Descrizione, es. "Network offline → show offline message"]
- [ ] **Case 4:** [Descrizione, es. "User taps back during loading → cancel request"]

### Device/Platform Tests

- [ ] iOS (iPhone 12+)
- [ ] Android (API 29+)
- [ ] Tablet (optional)

### Regression Tests

- [ ] Verify existing screens not broken
- [ ] Verify navigation flow not broken
- [ ] Verify bottom nav still works

---

## DEPENDENCIES TRACKING

### External Dependencies (NPM packages)

| Package | Version | Purpose | Install Command |
|---------|---------|---------|-----------------|
| [es. `@capacitor/camera`] | [^5.0.0] | [Photo upload] | `npm install @capacitor/camera` |

### Internal Dependencies (Other screens/components)

| Dependency | Path | Status | Blocker? |
|------------|------|--------|----------|
| [es. `useAuth`] | `hooks/useAuth.ts` | ✅ Exists | No |
| [es. `BookingForm`] | `components/booking/BookingForm.tsx` | ❌ Missing | Yes |

### Backend Dependencies (Supabase)

| Resource | Type | Status | Setup Required |
|----------|------|--------|----------------|
| [es. `equipment` table] | Table | ✅ Exists | No |
| [es. `inspection-photos` bucket] | Storage Bucket | ❌ Missing | Yes - create bucket + RLS policy |
| [es. `process-payment` function] | Edge Function | ⏳ In Progress | Yes - deploy function |

---

## NOTES & ISSUES

### Implementation Notes

- [Note 1: es. "Use react-native-calendars per date picker invece di HTML5 input"]
- [Note 2: es. "Capacitor Camera plugin richiede permissions in Info.plist (iOS)"]

### Known Issues / Tech Debt

- [ ] [Issue 1: es. "Loading state flickers su Android - fix con debounce"]
- [ ] [Issue 2: es. "Dark mode colors not finalized - TODO"]

### Questions / Decisions

- [ ] **Q:** [Domanda, es. "Dovremmo usare native date picker o web calendar?"]
  - **A:** [Risposta]
- [ ] **Q:** [Domanda]
  - **A:** [Risposta]

---

## REVIEW & SIGN-OFF

### Dev Self-Review

- [ ] Codice segue coding standards (linting pass)
- [ ] TypeScript errors = 0
- [ ] Tutti i TODO comments risolti o ticketizzati
- [ ] Console.log statements rimossi (production)
- [ ] Commit messages descrittivi

### Peer Review

- [ ] **Reviewer:** [Nome]
- [ ] **Date:** [gg/mm/aaaa]
- [ ] **Feedback:** [Link PR o note]
- [ ] **Approved:** ✅ / ❌

### QA Review

- [ ] **QA Tester:** [Nome]
- [ ] **Date:** [gg/mm/aaaa]
- [ ] **Test Report:** [Link Jira/document]
- [ ] **Bugs Found:** [Count]
- [ ] **Approved:** ✅ / ❌

### Product Sign-Off

- [ ] **Product Owner:** [Nome]
- [ ] **Date:** [gg/mm/aaaa]
- [ ] **Feature Complete:** ✅ / ❌
- [ ] **Ready for Release:** ✅ / ❌

---

## TEMPLATE VERSION

**Version:** 1.0  
**Last Updated:** 14 Gennaio 2026  
**Maintained By:** [Team Mobile]

---

## ESEMPIO COMPILATO (Reference)

Vedi esempio concreto: `BookingForm_PARITY_CHECKLIST.md` (da creare come reference)

---

*Template per garantire parità funzionale 1:1 tra Web Mobile e Capacitor Mobile App*
