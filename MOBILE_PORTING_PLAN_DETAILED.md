# Mobile Porting Plan - Detailed Roadmap

Piano dettagliato per portare tutte le pagine della **Web Mobile App** (`src/`) nella **Mobile App Capacitor** (`apps/mobile/src/`) con parità funzionale 1:1.

**Obiettivo:** Garantire che ogni feature, modale, stato, error handling della web mobile sia replicato identicamente in Capacitor.

**Strategia:** Porting incrementale per priorità (P0 → P1 → P2 → P3), con testing checkpoint dopo ogni milestone.

---

## MILESTONE 0: PREPARAZIONE INFRASTRUTTURA

**Obiettivo:** Setup fondamenta condivise e utilities mancanti.

**Durata:** 3-5 giorni (1 dev)

### Task 0.1: Shared Utilities & Hooks

**File da creare/portare in `apps/mobile/src/`:**

| File | Sorgente Web | Destinazione Mobile | Note |
|------|--------------|---------------------|------|
| `hooks/useDebounce.ts` | `src/hooks/useDebounce.ts` | `apps/mobile/src/hooks/useDebounce.ts` | Copy 1:1 |
| `hooks/useVerification.ts` | `src/hooks/useVerification.ts` | `apps/mobile/src/hooks/useVerification.ts` | Copy + test Capacitor Storage |
| `hooks/useRoleMode.ts` | `src/contexts/RoleModeContext.tsx` | `apps/mobile/src/hooks/useRoleMode.ts` | Extract hook from context |
| `hooks/useActiveRental.ts` | `src/hooks/useActiveRental.ts` | `apps/mobile/src/hooks/useActiveRental.ts` | Verify exists, update if partial |
| `lib/verification.ts` | `src/lib/verification.ts` | `apps/mobile/src/lib/verification.ts` | `getVerificationProgress` utils |
| `lib/payment.ts` | `src/lib/payment.ts` | `apps/mobile/src/lib/payment.ts` | `formatCurrency`, `getEscrowStatusText` |
| `config/pagination.ts` | `src/config/pagination.ts` | `apps/mobile/src/config/pagination.ts` | `DEFAULT_PRICE_MIN/MAX` constants |

**Acceptance Criteria:**
- [ ] Tutti gli hooks compilano senza errori TypeScript
- [ ] Utils testati con dati mock (unit test opzionale ma consigliato)
- [ ] Import path aliasing `@/` funziona in mobile

**Dipendenze:** Nessuna

**Effort:** S (3-5 giorni)

---

## MILESTONE 1: MVP BLOCKING (P0) - Funzionalità Core

**Obiettivo:** Sbloccare user journey completo: browse → book → inspect → manage rental.

**Durata:** 3-4 settimane (2 dev parallelizzabili)

---

### 1.1 BookingForm in Equipment Detail

**Priorità:** 🔴 P0 (BLOCKING - senza questo renter non può prenotare)

**Sorgente:** `src/components/equipment/detail/EquipmentDetailDialog.tsx` (sezione BookingForm embedded)

**Destinazione:** `apps/mobile/src/components/booking/BookingForm.tsx` + integrate in `EquipmentDetailScreen.tsx`

**Checklist Parità Funzionale:**

- [ ] **Date Picker**
  - [ ] Calendario con date disabili (already booked)
  - [ ] Start date + end date selection
  - [ ] Validation: start < end, no past dates
  - [ ] Show total days count
- [ ] **Pricing Calculation**
  - [ ] Fetch daily_rate from equipment
  - [ ] Calculate: `days * daily_rate`
  - [ ] Show breakdown (rental, insurance, deposit)
  - [ ] Update real-time on date change
- [ ] **Insurance Options**
  - [ ] Radio buttons: None, Basic, Premium
  - [ ] Show insurance cost per option
  - [ ] Add to total price
  - [ ] Store `insurance_type` + `insurance_cost` in booking
- [ ] **Damage Deposit**
  - [ ] Display deposit amount (from equipment)
  - [ ] Explain refund policy (tooltip/modal)
  - [ ] Deposit held via Stripe (not charged immediately)
- [ ] **Terms & Conditions**
  - [ ] Checkbox: "I agree to terms"
  - [ ] Link to terms page (modal or external)
  - [ ] Disable submit if not checked
- [ ] **Payment Method**
  - [ ] NativePaymentSheet integration (Stripe)
  - [ ] Handle payment_intent creation
  - [ ] Handle payment confirmation
- [ ] **Submit Booking**
  - [ ] Create booking_request row in Supabase
  - [ ] Create payment row with `pending` status
  - [ ] Create escrow entry for deposit
  - [ ] Navigate to `/payment/confirmation?payment_id=xxx`
- [ ] **Error Handling**
  - [ ] Loading state during submit
  - [ ] Error toast if payment fails
  - [ ] Error toast if booking creation fails
  - [ ] Retry mechanism
- [ ] **Auth Check**
  - [ ] Redirect to login if user not authenticated
  - [ ] Disable book button if user is owner of equipment

**Test Checklist:**
- [ ] Smoke test: user può selezionare date, aggiungere assicurazione, e completare booking
- [ ] Edge case: booking date già preso → mostra errore
- [ ] Edge case: payment failed → mostra errore + non crea booking
- [ ] Edge case: user tenta book propria attrezzatura → disabilitato

**Effort:** L (5-7 giorni)

**Dipendenze:** 
- NativePaymentSheet già implementato (`apps/mobile/src/components/payment/NativePaymentSheet.tsx`)
- `lib/payment.ts` (Milestone 0)

---

### 1.2 Owner Dashboard (Completo)

**Priorità:** 🔴 P0 (BLOCKING - owner non può gestire business)

**Sorgente:** `src/pages/owner/OwnerDashboard.tsx`

**Destinazione:** `apps/mobile/src/screens/OwnerDashboardScreen.tsx`

**Architettura:** Tab-based come RenterDashboard

**Tabs da implementare:**
1. Overview
2. Equipment
3. Bookings
4. Messages (riusa MessagingInterface)
5. Reviews
6. Payments

**Checklist Parità Funzionale - Tab Overview:**

- [ ] **WelcomeHero**
  - [ ] Display owner name + avatar
  - [ ] CTA: "Add New Equipment"
  - [ ] Navigate to equipment create form
- [ ] **Stats Cards**
  - [ ] Total Listings (count equipment where owner_id = user.id)
  - [ ] Active Bookings (count bookings status = 'approved' + date range active)
  - [ ] Total Earnings (sum payments where status = 'completed')
  - [ ] Average Rating (avg from reviews)
  - [ ] Loading skeleton per stats
- [ ] **OwnerNotificationsPanel**
  - [ ] Pending booking requests (status = 'pending')
  - [ ] Claims to review (status = 'pending_owner_review')
  - [ ] Inspections to complete (return inspections)
  - [ ] Badge count
- [ ] **Upcoming Bookings**
  - [ ] List next 5 bookings (status = 'approved', start_date >= today)
  - [ ] Show equipment image, renter name, dates
  - [ ] Tap → navigate to booking detail
- [ ] **Active Rentals**
  - [ ] List active rentals (status = 'approved', start_date <= today <= end_date)
  - [ ] ActiveRentalCard component (riusa da web)
  - [ ] Tap → navigate to `/rental/:bookingId`
- [ ] **OwnerClaimsList**
  - [ ] List pending claims (filed by owner, awaiting renter response)
  - [ ] Show claim amount, equipment, status
  - [ ] Tap → navigate to `/claims/manage/:claimId`

**Checklist Parità Funzionale - Tab Equipment:**

- [ ] **EquipmentManagement Component**
  - [ ] List all equipment (owner_id = user.id)
  - [ ] Card per equipment: image, title, daily_rate, is_available toggle
  - [ ] Actions: Edit, Delete, Toggle availability
  - [ ] FAB: "Add New Equipment"
  - [ ] Navigate to equipment form (create/edit)
- [ ] **Equipment Form** (create/edit)
  - [ ] Fields: title, description, category, daily_rate, location, photos, features, condition, deposit_amount
  - [ ] Multi-photo upload (Capacitor Camera + Gallery)
  - [ ] Supabase Storage upload
  - [ ] Validation: required fields, price > 0
  - [ ] Submit: create or update equipment row
  - [ ] Success: navigate back + toast "Equipment saved"
- [ ] **Delete Equipment**
  - [ ] Confirm dialog
  - [ ] Check no active bookings
  - [ ] Delete equipment row + photos from storage
  - [ ] Success: refresh list + toast

**Checklist Parità Funzionale - Tab Bookings:**

- [ ] **BookingRequestCard List**
  - [ ] Fetch bookings where equipment.owner_id = user.id
  - [ ] Tabs: Pending, Approved, Completed, Cancelled
  - [ ] Card: equipment image, renter profile, dates, total amount, status badge
- [ ] **Approve/Decline Actions**
  - [ ] Button: Approve → update status = 'approved', send notification
  - [ ] Button: Decline → update status = 'cancelled', refund payment
  - [ ] Loading state durante azione
  - [ ] Success: refresh list + toast
- [ ] **Booking Detail (owner view)**
  - [ ] Mostra equipment, renter, dates, payment, insurance, deposit
  - [ ] CTA: Chat with renter, View inspection (se completato), File claim (se issues)

**Checklist Parità Funzionale - Tab Messages:**

- [ ] Riusa `MessagingInterface` component
- [ ] Filter conversations: only where user is owner
- [ ] (Stesso comportamento di MessagesScreen)

**Checklist Parità Funzionale - Tab Reviews:**

- [ ] **ReviewList Component**
  - [ ] Fetch reviews where equipment.owner_id = user.id
  - [ ] Display: renter name, rating, comment, equipment, date
  - [ ] Owner can reply to reviews (optional MVP)
- [ ] **Empty state:** "No reviews yet"

**Checklist Parità Funzionale - Tab Payments:**

- [ ] **EscrowDashboard Component**
  - [ ] Show pending escrow balances (deposits held)
  - [ ] Show available balance (payments completed)
  - [ ] CTA: Payout to bank (Stripe Connect - out of scope MVP)
- [ ] **TransactionHistory Component**
  - [ ] List all payments where equipment.owner_id = user.id
  - [ ] Filter by status (pending, completed, failed, refunded)
  - [ ] Show: equipment, renter, amount, date, status
  - [ ] Tap → payment detail modal

**Test Checklist:**
- [ ] Smoke test: owner can navigate all tabs
- [ ] Owner can create new equipment con foto
- [ ] Owner can approve booking request
- [ ] Owner can view messages, reviews, payments
- [ ] Stats cards show correct data
- [ ] Active rentals link to rental detail page

**Effort:** XL (10-12 giorni, parallelizzabile in 2 dev: 1 overview/equipment, 1 bookings/messages/reviews/payments)

**Dipendenze:**
- `useRoleMode` hook (Milestone 0)
- `EquipmentManagement` component (da portare)
- `BookingRequestCard` component (già presente, verificare parity)
- `MessagingInterface` (già presente)
- `ReviewList` component (da portare)
- `EscrowDashboard`, `TransactionHistory` components (da portare)

---

### 1.3 Inspection Flow (Pickup + Return)

**Priorità:** 🔴 P0 (BLOCKING - deposit refund rotto senza)

**Sorgente:** 
- `src/pages/inspection/EquipmentInspectionPage.tsx`
- `src/components/inspection/InspectionWizard.tsx`

**Destinazione:**
- `apps/mobile/src/screens/InspectionScreen.tsx`
- `apps/mobile/src/components/inspection/InspectionWizard.tsx`

**Checklist Parità Funzionale:**

- [ ] **Route Guard**
  - [ ] Pickup inspection: solo renter può accedere
  - [ ] Return inspection: solo owner può accedere
  - [ ] Se user unauthorized → redirect dashboard + toast error
- [ ] **Fetch Booking Details**
  - [ ] Query booking by `bookingId` param
  - [ ] Verificare status = 'approved'
  - [ ] Fetch equipment details
  - [ ] Loading state: skeleton
  - [ ] Error state: alert + back button
- [ ] **InspectionWizard - Step 1: Instructions**
  - [ ] Explain inspection purpose
  - [ ] Show equipment photo
  - [ ] Button: "Start Inspection"
- [ ] **InspectionWizard - Step 2: Photo Upload**
  - [ ] Capacitor Camera plugin: take photo
  - [ ] Capacitor Gallery: select from library
  - [ ] Multi-photo support (min 3, max 10 recommended)
  - [ ] Show preview thumbnails
  - [ ] Upload to Supabase Storage (bucket: `inspection-photos`)
  - [ ] Progress bar durante upload
  - [ ] Validation: almeno 1 foto required
- [ ] **InspectionWizard - Step 3: Condition Assessment**
  - [ ] Radio buttons: Excellent, Good, Fair, Poor
  - [ ] Description per option (tooltip/helper text)
  - [ ] Required selection
- [ ] **InspectionWizard - Step 4: Notes**
  - [ ] Textarea: optional notes (max 500 chars)
  - [ ] Placeholder: "Any damage or issues?"
- [ ] **InspectionWizard - Step 5: Review & Submit**
  - [ ] Show summary: photos, condition, notes
  - [ ] Button: "Submit Inspection"
  - [ ] Loading state: disable button + spinner
- [ ] **Submit Inspection**
  - [ ] Insert row in `equipment_inspections` table:
    - `booking_id`
    - `inspection_type` ('pickup' | 'return')
    - `photos` (array of URLs)
    - `condition`
    - `notes`
    - `inspected_at` (timestamp)
    - `inspected_by` (user.id)
  - [ ] Success: navigate to success screen + toast "Inspection completed"
  - [ ] Error: toast error + retry
- [ ] **Auto-refund Trigger (Return Inspection)**
  - [ ] Se return inspection completed + no claim filed → trigger deposit refund
  - [ ] Update `escrow_transactions` status = 'released'
  - [ ] Send notification to renter: "Deposit refunded"
- [ ] **Navigate Back**
  - [ ] After submit: navigate to `/rental/:bookingId` or dashboard
  - [ ] Back button: confirm dialog se wizard in progress

**Test Checklist:**
- [ ] Renter completa pickup inspection con foto
- [ ] Owner completa return inspection con foto
- [ ] Inspection data salvata correttamente in DB
- [ ] Auto-refund triggered su return inspection (verify in Stripe)
- [ ] Error handling: camera permission denied, upload failed

**Effort:** L (5-7 giorni)

**Dipendenze:**
- Capacitor Camera plugin (già installato?)
- Capacitor Storage (già installato?)
- Supabase Storage bucket `inspection-photos` (verificare setup)

---

### 1.4 Active Rental Page

**Priorità:** 🔴 P0 (BLOCKING - user non gestisce rental attivo)

**Sorgente:** `src/pages/rental/ActiveRentalPage.tsx`

**Destinazione:** `apps/mobile/src/screens/ActiveRentalScreen.tsx`

**Checklist Parità Funzionale:**

- [ ] **Fetch Rental Data**
  - [ ] `useActiveRental(bookingId)` hook
  - [ ] Fetch booking + equipment + renter/owner profiles + inspections
  - [ ] Loading: skeleton
  - [ ] Error: AlertTriangle card + back to dashboard
- [ ] **Header**
  - [ ] Equipment title
  - [ ] Back button: navigate to dashboard
  - [ ] Status badge (Active, Overdue, Ending Soon)
- [ ] **Equipment Card**
  - [ ] Primary photo
  - [ ] Title, daily_rate, location
  - [ ] Owner/Renter profile (depends on user role)
  - [ ] Avatar, name, rating
  - [ ] Button: "Chat" → navigate to `/conversation/:id`
- [ ] **RentalCountdown Component**
  - [ ] Time until pickup (se pre-pickup)
  - [ ] Time until return (se attivo)
  - [ ] "Overdue" alert se end_date < now
  - [ ] "Ending soon" alert se < 24h to end
  - [ ] Visual progress bar
- [ ] **RentalQuickActions Component**
  - [ ] CTA Cards:
    - [ ] "Start Pickup Inspection" (se renter + pre-pickup)
    - [ ] "Start Return Inspection" (se owner + post-return)
    - [ ] "File Damage Claim" (se owner + return completed + issues)
    - [ ] "Chat with [Owner/Renter]"
    - [ ] "Contact Support"
  - [ ] Disable/hide CTA se già completato (es. inspection done)
- [ ] **Inspection Status Section**
  - [ ] Pickup Inspection: ✅ Completed / ⏳ Pending / ❌ Not Started
  - [ ] Return Inspection: ✅ Completed / ⏳ Pending / ❌ Not Started
  - [ ] Tap on completed → navigate to `/inspection/:bookingId/view/:type`
- [ ] **Rental Details Section**
  - [ ] Dates: start_date, end_date, total days
  - [ ] Pricing: rental cost, insurance, deposit, total paid
  - [ ] Payment status: paid, pending refund, refunded
  - [ ] Escrow status: held, released
- [ ] **Timeline Section (optional MVP)**
  - [ ] Booking created
  - [ ] Payment completed
  - [ ] Pickup inspection completed
  - [ ] Return inspection completed
  - [ ] Claim filed (if any)
  - [ ] Deposit refunded

**Test Checklist:**
- [ ] Renter vede rental attivo con countdown
- [ ] Renter può start pickup inspection
- [ ] Owner può start return inspection
- [ ] Owner può file claim (se issues)
- [ ] Chat button funziona
- [ ] Inspection status aggiornato dopo completion

**Effort:** M (4-5 giorni)

**Dipendenze:**
- `useActiveRental` hook (Milestone 0)
- `RentalCountdown` component (da portare)
- `RentalQuickActions` component (da portare)
- `ActiveRentalCard` component (già presente, verificare parity)

---

## MILESTONE 2: FEATURE PARITY CORE (P1) - UX Comparabile

**Obiettivo:** Garantire UX search/discover/dashboard paragonabile a web mobile.

**Durata:** 2-3 settimane (2 dev)

---

### 2.1 FiltersSheet in Explore

**Priorità:** 🟠 P1 (HIGH - UX search degradata senza)

**Sorgente:** `src/components/explore/FiltersSheet.tsx`

**Destinazione:** `apps/mobile/src/components/explore/FiltersSheet.tsx`

**Checklist Parità Funzionale:**

- [ ] **Sheet UI**
  - [ ] Bottom sheet modal (Capacitor native o React Native Sheet)
  - [ ] Header: "Filters" + Close button
  - [ ] Scroll content
  - [ ] Footer: Apply button + Reset button
- [ ] **Price Range Slider**
  - [ ] Min/Max slider (react-native-slider o HTML5 input range)
  - [ ] Default: DEFAULT_PRICE_MIN, DEFAULT_PRICE_MAX
  - [ ] Display current values: €min - €max
  - [ ] Step: 10
- [ ] **Category Filter**
  - [ ] Fetch categories from Supabase
  - [ ] Chip list (multi-select)
  - [ ] Visual: selected chip = filled, unselected = outlined
  - [ ] Allow "All" (clear selection)
- [ ] **Condition Filter**
  - [ ] Checkboxes: New, Excellent, Good, Fair
  - [ ] Multi-select
- [ ] **Date Range Picker**
  - [ ] Start date + End date input
  - [ ] Calendar modal (Capacitor DatePicker o react-native-calendars)
  - [ ] Validation: start < end
  - [ ] Clear button
- [ ] **Location Filter (optional MVP)**
  - [ ] Autocomplete input (Google Places API)
  - [ ] Radius slider (km)
  - [ ] Current location button (Capacitor Geolocation)
- [ ] **Apply Filters**
  - [ ] Callback: `onApplyFilters(filters: FilterValues)`
  - [ ] Close sheet
  - [ ] Trigger refetch listings in ExploreScreen
- [ ] **Reset Filters**
  - [ ] Clear all selections
  - [ ] Reset to defaults
  - [ ] Trigger refetch

**Test Checklist:**
- [ ] User can apply price filter → listings aggiornati
- [ ] User can select categories → listings filtrati
- [ ] User can select condition → listings filtrati
- [ ] User can reset filters → listings tornano a default
- [ ] Filtri persistono in URL (query params) - se implementato nuqs

**Effort:** M (4-5 giorni)

**Dipendenze:**
- `fetchListings` service con supporto filtri (da aggiornare)
- Capacitor DatePicker plugin (optional)
- Capacitor Geolocation plugin (optional per location)

---

### 2.2 Renter Dashboard Completo

**Priorità:** 🟠 P1 (HIGH - hub principale incompleto)

**Sorgente:** `src/pages/renter/RenterDashboard.tsx`

**Destinazione:** Upgrade `apps/mobile/src/screens/RentalsScreen.tsx` → `RenterDashboardScreen.tsx`

**Architettura:** Aggiungere tab Overview + aggiornare tab Bookings/Saved

**Checklist Parità Funzionale - Tab Overview (NEW):**

- [ ] **WelcomeHero**
  - [ ] Display renter name + avatar
  - [ ] Greeting message
  - [ ] CTA: "Explore Equipment"
- [ ] **StatsOverview**
  - [ ] Total Bookings (count bookings where renter_id = user.id)
  - [ ] Active Rentals (count active bookings)
  - [ ] Total Spent (sum payments)
  - [ ] Loading skeleton
- [ ] **NotificationsPanel**
  - [ ] Pending booking requests (awaiting approval)
  - [ ] Inspections to complete (pickup urgent)
  - [ ] Claims filed against user
  - [ ] Badge count
- [ ] **UpcomingCalendar**
  - [ ] Mini calendar con date bookings evidenziate
  - [ ] Tap date → show bookings for that day
  - [ ] (Optional MVP: può essere sostituito con upcoming list)
- [ ] **PendingClaimsList**
  - [ ] List claims where renter_id = user.id + status = 'pending_renter_review'
  - [ ] Show claim amount, equipment, status
  - [ ] Tap → navigate to `/claims/review/:claimId`
- [ ] **MobileInspectionCTA**
  - [ ] Alert banner se ci sono inspections urgenti (booking start_date < 48h + no pickup inspection)
  - [ ] Button: "Complete Inspection Now" → navigate to `/inspection/:bookingId/pickup`

**Checklist Parità Funzionale - Tab Bookings (UPDATE EXISTING):**

- [ ] Mantieni filtri: Active, Upcoming, Past
- [ ] Aggiungi BookingRequestCard per ogni booking
- [ ] Include status badge, CTA (view detail, chat, inspect)

**Checklist Parità Funzionale - Tab Saved (NEW):**

- [ ] **SavedEquipmentTab Component**
  - [ ] Fetch equipment favorited by user (from `favorites` table)
  - [ ] Grid di ListingCard (compact)
  - [ ] Tap → navigate to `/equipment/:id`
  - [ ] Swipe to unfavorite (optional)
  - [ ] Empty state: "No saved equipment"

**Test Checklist:**
- [ ] Overview tab mostra stats corretti
- [ ] Notifications panel mostra pending actions
- [ ] Saved tab mostra equipment favorited
- [ ] MobileInspectionCTA appare se urgente
- [ ] Tap su booking → navigate to detail

**Effort:** L (6-8 giorni)

**Dipendenze:**
- `WelcomeHero`, `StatsOverview`, `NotificationsPanel`, `UpcomingCalendar` components (da portare)
- `SavedEquipmentTab` component (da portare)
- `PendingClaimsList` component (da portare)
- `MobileInspectionCTA` + `MobileInspectionSheet` components (da portare)

---

### 2.3 Payment Confirmation Completo

**Priorità:** 🟠 P1 (HIGH - confusione post-payment)

**Sorgente:** `src/pages/payment/PaymentConfirmation.tsx`

**Destinazione:** `apps/mobile/src/screens/PaymentConfirmationScreen.tsx` (upgrade placeholder)

**Checklist Parità Funzionale:**

- [ ] **Polling Payment Status**
  - [ ] Query payment by `payment_id` or `payment_intent_id` (da URL params)
  - [ ] Poll every 500ms fino a max 10 secondi
  - [ ] Update payment status da Stripe webhook (backend)
  - [ ] Success: mostra payment details
  - [ ] Timeout: mostra alert "Payment processing, check back later"
- [ ] **Payment Details Card**
  - [ ] Amount paid (rental + insurance + deposit)
  - [ ] Equipment image + title
  - [ ] Owner name + avatar
  - [ ] Booking dates
  - [ ] Payment status badge (completed, pending, failed)
- [ ] **Escrow Status**
  - [ ] Show deposit held in escrow
  - [ ] Explain refund policy (tooltip/modal)
  - [ ] Timeline: "Refund after return inspection"
- [ ] **Next Steps CTA**
  - [ ] Button: "View Booking" → navigate to booking detail or active rental
  - [ ] Button: "Chat with Owner" → navigate to `/conversation/:id`
  - [ ] Button: "Complete Pickup Inspection" (se booking imminente)
  - [ ] Button: "Back to Home" → navigate to `/explore`
- [ ] **Error State**
  - [ ] Se payment failed: alert banner + retry payment button
  - [ ] Se booking not found: navigate to dashboard

**Test Checklist:**
- [ ] Payment confirmed → mostra success screen
- [ ] Payment pending → mostra processing message
- [ ] Payment failed → mostra error + retry
- [ ] CTA buttons funzionano correttamente

**Effort:** M (3-4 giorni)

**Dipendenze:**
- `lib/payment.ts` utils (Milestone 0)
- Polling logic (setInterval + timeout)

---

### 2.4 Messaging Completo (Upgrade)

**Priorità:** 🟡 P1 (MEDIUM - messaging base presente, da verificare real-time)

**Sorgente:** `src/components/messaging/MessagingInterface.tsx`

**Destinazione:** Upgrade `apps/mobile/src/screens/MessagesScreen.tsx` + `ConversationScreen.tsx`

**Checklist Parità Funzionale:**

- [ ] **MessagesScreen (Conversation List)**
  - [ ] Fetch conversations where user is participant
  - [ ] Show: counterpart name, avatar, last message preview, timestamp, unread badge
  - [ ] Sort by last message timestamp (descending)
  - [ ] Tap → navigate to `/conversation/:id`
  - [ ] Pull to refresh
  - [ ] Empty state: "No conversations"
- [ ] **ConversationScreen (Chat View)**
  - [ ] Fetch messages for conversation_id
  - [ ] Display messages: sender name, avatar, message text, timestamp
  - [ ] Group by date (optional)
  - [ ] Scroll to bottom on load
  - [ ] Message input: textarea + send button
  - [ ] Send message: insert in Supabase
  - [ ] Real-time subscriptions: listen to new messages (Supabase Realtime)
  - [ ] Typing indicators (optional MVP)
  - [ ] Read receipts (optional MVP)
  - [ ] File attachments (optional MVP, Capacitor File Picker)
- [ ] **Real-time Setup**
  - [ ] Subscribe to `messages` table per conversation_id
  - [ ] On new message → append to list + scroll to bottom
  - [ ] Unsubscribe on unmount
- [ ] **Conversation Search (optional MVP)**
  - [ ] Search bar in MessagesScreen
  - [ ] Filter conversations by name or last message

**Test Checklist:**
- [ ] User vede lista conversazioni con preview
- [ ] User può aprire chat e vedere messaggi
- [ ] User può inviare messaggio
- [ ] Real-time: nuovo messaggio appare automaticamente
- [ ] Pull to refresh aggiorna lista

**Effort:** M (4-5 giorni)

**Dipendenze:**
- Supabase Realtime setup (verificare config)
- Capacitor File Picker (optional per attachments)

---

## MILESTONE 3: SAFETY & TRUST (P2) - Sicurezza Transazioni

**Obiettivo:** Implementare flow per gestione danni e verifica identità.

**Durata:** 2-3 settimane (1 dev)

---

### 3.1 Claims Flow Completo

**Priorità:** 🟡 P2 (MEDIUM - owner protection)

**Sorgente:**
- `src/pages/claims/FileClaimPage.tsx`
- `src/pages/claims/ReviewClaimPage.tsx`
- `src/pages/claims/ManageClaimPage.tsx`

**Destinazione:**
- `apps/mobile/src/screens/FileClaimScreen.tsx`
- `apps/mobile/src/screens/ReviewClaimScreen.tsx`
- `apps/mobile/src/screens/ManageClaimScreen.tsx`

**Checklist Parità Funzionale - File Claim (Owner):**

- [ ] **Route Guard:** Solo owner può accedere
- [ ] **Fetch Booking + Pickup Inspection**
  - [ ] Query booking by `bookingId`
  - [ ] Fetch pickup inspection photos (per comparison)
  - [ ] Verificare no claim già esistente
- [ ] **ClaimFilingForm Component**
  - [ ] Damage description textarea (required, max 1000 chars)
  - [ ] Upload damage photos (Capacitor Camera/Gallery, min 1, max 10)
  - [ ] Upload to Supabase Storage bucket `claim-photos`
  - [ ] Claim amount input (number, max = damage_deposit_amount)
  - [ ] Show pickup photos per comparison (carousel)
  - [ ] Submit button
- [ ] **Submit Claim**
  - [ ] Insert row in `damage_claims` table:
    - `booking_id`
    - `filed_by` (owner user.id)
    - `damage_description`
    - `claim_amount`
    - `evidence_photos` (array URLs)
    - `status` = 'pending_renter_review'
  - [ ] Send notification to renter: "Claim filed"
  - [ ] Success: navigate to `/claims/manage/:claimId`
- [ ] **Error Handling**
  - [ ] Loading state: disable submit + spinner
  - [ ] Validation errors: toast
  - [ ] Upload errors: retry + toast

**Checklist Parità Funzionale - Review Claim (Renter):**

- [ ] **Route Guard:** Solo renter può accedere
- [ ] **Fetch Claim Data**
  - [ ] Query claim by `claimId`
  - [ ] Fetch booking + equipment
  - [ ] Fetch pickup + return inspections
- [ ] **ClaimReviewInterface Component**
  - [ ] Display damage description
  - [ ] Show evidence photos (gallery)
  - [ ] Show pickup vs return photos comparison
  - [ ] Claim amount badge
  - [ ] Actions:
    - [ ] Button: "Accept Claim" → update status = 'accepted', trigger payout to owner
    - [ ] Button: "Dispute Claim" → update status = 'disputed', open dispute form
    - [ ] Button: "Submit Counter-Evidence" → upload photos + notes
- [ ] **Dispute Form (inline modal)**
  - [ ] Reason textarea (required)
  - [ ] Upload counter-evidence photos (optional)
  - [ ] Submit: update claim status = 'disputed'
  - [ ] Send notification to owner + admin
- [ ] **Accept Claim**
  - [ ] Update claim status = 'accepted'
  - [ ] Deduct claim_amount from deposit escrow
  - [ ] Transfer to owner Stripe account
  - [ ] Refund remaining deposit to renter
  - [ ] Success: navigate to dashboard + toast "Claim accepted"

**Checklist Parità Funzionale - Manage Claim (Owner):**

- [ ] **Route Guard:** Solo owner può accedere
- [ ] **Fetch Claim Data** (same as review)
- [ ] **ClaimManagementInterface Component**
  - [ ] Show claim timeline (filed, reviewed, disputed, resolved)
  - [ ] Display status badge
  - [ ] Actions (depends on status):
    - [ ] If disputed: "Review Dispute" → show renter counter-evidence
    - [ ] If disputed: "Escalate to Admin" → update status = 'escalated'
    - [ ] If accepted: "View Payout" → show transaction details
    - [ ] "Close Claim" → update status = 'resolved'
- [ ] **Escalate Claim**
  - [ ] Update status = 'escalated'
  - [ ] Send notification to admin
  - [ ] Show alert: "Admin will review within 48h"

**Test Checklist:**
- [ ] Owner file claim con foto
- [ ] Renter riceve notifica + vede claim
- [ ] Renter accetta claim → deposit detratto
- [ ] Renter disputa claim → owner vede dispute
- [ ] Owner escalate dispute → admin notificato

**Effort:** L (6-8 giorni)

**Dipendenze:**
- `ClaimFilingForm`, `ClaimReviewInterface`, `ClaimManagementInterface` components (da portare)
- Capacitor Camera/Gallery (già usato in inspection)
- Supabase Storage bucket `claim-photos`

---

### 3.2 Verification Page

**Priorità:** 🟡 P2 (MEDIUM - trust/safety feature)

**Sorgente:** `src/pages/verification/VerifyIdentity.tsx`

**Destinazione:** `apps/mobile/src/screens/VerificationScreen.tsx`

**Checklist Parità Funzionale:**

- [ ] **Fetch Verification Profile**
  - [ ] `useVerification` hook
  - [ ] Query verification_profiles where user_id = user.id
  - [ ] Loading: skeleton
- [ ] **TrustScore Display**
  - [ ] Circular progress bar (0-100 score)
  - [ ] Color: red < 30, yellow 30-70, green > 70
  - [ ] Breakdown:
    - [ ] Email verified: +20
    - [ ] Phone verified: +10
    - [ ] Identity verified: +30
    - [ ] Address verified: +40 (optional MVP)
- [ ] **Verification Steps List**
  - [ ] Card per step: Identity, Phone, (Address)
  - [ ] Icon, label, description, points, duration
  - [ ] Status: ✅ Completed / ⏳ Pending / ❌ Not Started
  - [ ] Tap → navigate to step detail
- [ ] **Why Verify? Dialog (optional)**
  - [ ] Button: "Why Verify?"
  - [ ] Modal con benefits: higher trust, more bookings, lower deposit
- [ ] **Identity Verification Step**
  - [ ] DocumentUpload component
  - [ ] Upload government ID (passport, driver license)
  - [ ] Capacitor Camera: take photo front + back
  - [ ] Upload to Supabase Storage bucket `verification-docs`
  - [ ] Submit: update verification_profiles.identity_document_url + status = 'pending_review'
  - [ ] Success: toast "Document uploaded, review within 24h"
- [ ] **Phone Verification Step**
  - [ ] PhoneVerification component
  - [ ] Input phone number (with country code picker)
  - [ ] Send SMS code (Supabase Auth or Twilio)
  - [ ] Input 6-digit code
  - [ ] Verify code: update verification_profiles.phone_verified = true
  - [ ] Success: toast "Phone verified" + TrustScore updated
- [ ] **Address Verification (optional MVP)**
  - [ ] Upload proof of address (utility bill, bank statement)
  - [ ] Same flow as identity verification

**Test Checklist:**
- [ ] User vede TrustScore attuale
- [ ] User può upload ID document
- [ ] User può verify phone con SMS
- [ ] TrustScore aggiornato dopo verification
- [ ] Verified badge appare in profile

**Effort:** M (5-6 giorni)

**Dipendenze:**
- `useVerification` hook (Milestone 0)
- `DocumentUpload`, `PhoneVerification`, `TrustScore` components (da portare)
- Capacitor Camera (già usato)
- Supabase Storage bucket `verification-docs`
- SMS provider (Supabase Auth o Twilio setup)

---

### 3.3 Payments Page (Renter)

**Priorità:** 🟡 P2 (MEDIUM - trasparenza pagamenti)

**Sorgente:** `src/pages/renter/PaymentsPage.tsx`

**Destinazione:** `apps/mobile/src/screens/PaymentsScreen.tsx`

**Checklist Parità Funzionale:**

- [ ] **Fetch Payments**
  - [ ] Query payments where user_id = user.id (from booking.renter_id)
  - [ ] Include: booking, equipment, owner profile
  - [ ] Sort by created_at descending
- [ ] **Filter Tabs**
  - [ ] All, Pending, Completed, Failed, Refunded
  - [ ] Count per tab
- [ ] **Payment Card List**
  - [ ] Card per payment: equipment image, title, amount, date, status badge
  - [ ] Tap → expand detail (accordion or navigate to detail screen)
- [ ] **Payment Detail**
  - [ ] Breakdown: rental cost, insurance, deposit, total
  - [ ] Payment method (card brand + last 4 digits)
  - [ ] Payment intent ID (for support)
  - [ ] Refund amount (if refunded)
  - [ ] Date paid, date refunded
- [ ] **Empty State**
  - [ ] "No payments yet"
  - [ ] CTA: "Explore Equipment"

**Test Checklist:**
- [ ] User vede lista payments corretta
- [ ] Filter tabs funzionano
- [ ] Tap payment → mostra dettaglio
- [ ] Refunded payments mostrano refund amount

**Effort:** S (2-3 giorni)

**Dipendenze:**
- `lib/payment.ts` utils (Milestone 0)

---

## MILESTONE 4: POLISH & SETTINGS (P3) - Completeness

**Obiettivo:** Profile editing, notifications settings, support, home page marketing.

**Durata:** 1-2 settimane (1 dev)

---

### 4.1 Profile Settings Edit

**Priorità:** 🟡 P3 (MEDIUM - completeness)

**Sorgente:** `src/pages/ProfileSettings.tsx`

**Destinazione:** `apps/mobile/src/screens/ProfileEditScreen.tsx`

**Checklist Parità Funzionale:**

- [ ] **Fetch Profile**
  - [ ] Query profiles + renter_profiles/owner_profiles
  - [ ] Populate form with existing data
- [ ] **Form Fields**
  - [ ] Avatar upload (Capacitor Camera/Gallery)
  - [ ] Full name (text input)
  - [ ] Phone (phone input with country code)
  - [ ] Bio (textarea, max 500 chars)
  - [ ] Experience level (dropdown, renter only)
  - [ ] Preferences (textarea JSON, renter only)
  - [ ] Business name (text input, owner only)
  - [ ] Business description (textarea, owner only)
- [ ] **Save Profile**
  - [ ] Validate required fields
  - [ ] Update profiles table
  - [ ] Update renter_profiles/owner_profiles (based on role)
  - [ ] Upload avatar to Supabase Storage (bucket `avatars`)
  - [ ] Success: toast "Profile updated" + navigate back
  - [ ] Error: toast error

**Test Checklist:**
- [ ] User può update full name, phone, bio
- [ ] Avatar upload funziona
- [ ] Role-based fields mostrati correttamente
- [ ] Save success → profile aggiornato

**Effort:** S (3-4 giorni)

**Dipendenze:**
- Capacitor Camera/Gallery (già usato)
- Supabase Storage bucket `avatars`

---

### 4.2 Notifications Settings

**Priorità:** 🟡 P3 (LOW - nice-to-have)

**Sorgente:** `src/pages/settings/NotificationsSettings.tsx`

**Destinazione:** `apps/mobile/src/screens/NotificationsSettingsScreen.tsx`

**Checklist Parità Funzionale:**

- [ ] **Fetch Notification Preferences**
  - [ ] Query notification_preferences where user_id = user.id
  - [ ] Default: all enabled
- [ ] **Toggle Switches**
  - [ ] Email notifications (enabled/disabled)
  - [ ] Push notifications (enabled/disabled)
  - [ ] SMS notifications (enabled/disabled)
  - [ ] Booking updates (enabled/disabled)
  - [ ] Messages (enabled/disabled)
  - [ ] Marketing emails (enabled/disabled)
- [ ] **Save Preferences**
  - [ ] Update notification_preferences table on toggle change
  - [ ] Debounce save (500ms)
  - [ ] Toast feedback "Preferences saved"

**Test Checklist:**
- [ ] User può toggle notification preferences
- [ ] Preferences salvate correttamente
- [ ] Toast feedback dopo save

**Effort:** XS (1-2 giorni)

**Dipendenze:** Nessuna

---

### 4.3 Support Page

**Priorità:** 🟢 P3 (LOW - MVP può usare email)

**Sorgente:** `src/pages/SupportPage.tsx`

**Destinazione:** `apps/mobile/src/screens/SupportScreen.tsx`

**Checklist Parità Funzionale:**

- [ ] **Support Ticket Form**
  - [ ] Subject input (text)
  - [ ] Category dropdown (Technical, Billing, General, etc.)
  - [ ] Message textarea (max 2000 chars)
  - [ ] File attachment (optional, Capacitor File Picker)
  - [ ] Upload to Supabase Storage bucket `support-attachments`
  - [ ] Submit button
- [ ] **Submit Ticket**
  - [ ] Insert row in `support_tickets` table
  - [ ] Send email to support team (Supabase Edge Function)
  - [ ] Success: toast "Ticket submitted, we'll respond within 24h"
  - [ ] Navigate back
- [ ] **FAQ Accordion (optional)**
  - [ ] List common questions
  - [ ] Expandable answers

**Test Checklist:**
- [ ] User può submit support ticket
- [ ] File attachment funziona
- [ ] Ticket salvato in DB
- [ ] Email inviata a support team

**Effort:** S (2-3 giorni)

**Dipendenze:**
- Capacitor File Picker (già usato?)
- Supabase Storage bucket `support-attachments`
- Supabase Edge Function per email (setup required)

---

### 4.4 Home Page Marketing (Optional)

**Priorità:** 🟢 P3 (LOW - SEO/marketing non critico mobile)

**Sorgente:** `src/pages/HomePage.tsx`

**Destinazione:** `apps/mobile/src/screens/HomeScreen.tsx`

**Checklist Parità Funzionale:**

- [ ] **HeroSection**
  - [ ] Tagline + CTA "Explore Equipment"
  - [ ] Background image/gradient
- [ ] **FeaturedListingsSection**
  - [ ] Carousel di equipment in evidenza
  - [ ] Tap → navigate to equipment detail
- [ ] **HowItWorksSection**
  - [ ] 3-step flow: Search, Book, Enjoy
  - [ ] Icons + descriptions
- [ ] **SocialProofSection**
  - [ ] Stats: users, listings, cities
  - [ ] Testimonials carousel (optional)
- [ ] **OwnerCTASection**
  - [ ] "Rent out your equipment"
  - [ ] CTA: "Become an Owner"
  - [ ] Navigate to owner upgrade

**Test Checklist:**
- [ ] Home page visually appealing
- [ ] CTA buttons funzionano
- [ ] Featured listings carousel smooth

**Effort:** M (4-5 giorni)

**Dipendenze:**
- Design assets (images, icons)

---

## TESTING & QA STRATEGY

### Test Types per Milestone

| Milestone | Test Type | Coverage Target |
|-----------|-----------|-----------------|
| M0 | Unit tests per hooks/utils | 80% |
| M1 | Smoke tests + integration tests | 70% |
| M2 | E2E tests per user flows | 60% |
| M3 | Manual QA + edge cases | - |
| M4 | Manual QA | - |

### Smoke Tests Essenziali (Run dopo ogni milestone)

1. **User Journey - Renter:**
   - [ ] Registrazione → email verification → onboarding
   - [ ] Browse explore → apply filters → view equipment
   - [ ] Book equipment → complete payment → confirm
   - [ ] Complete pickup inspection
   - [ ] View active rental
   - [ ] Chat with owner
   - [ ] Complete return inspection (owner side)
   - [ ] Deposit refunded

2. **User Journey - Owner:**
   - [ ] Upgrade to owner
   - [ ] Create equipment listing con foto
   - [ ] Riceve booking request → approve
   - [ ] Complete return inspection
   - [ ] File claim (se damage)
   - [ ] View payment/escrow

3. **Edge Cases:**
   - [ ] Payment failed → retry
   - [ ] Booking date conflict → error message
   - [ ] Inspection upload failed → retry
   - [ ] Claim dispute → escalate
   - [ ] Real-time messaging interruzione → riconnessione

---

## DIPENDENZE ESTERNE & SETUP REQUIRED

### Capacitor Plugins (Verificare Installazione)

| Plugin | Usage | Install Command |
|--------|-------|-----------------|
| `@capacitor/camera` | Photo upload (inspection, claim, profile) | `npm install @capacitor/camera` |
| `@capacitor/geolocation` | Location filter | `npm install @capacitor/geolocation` |
| `@capacitor/filesystem` | File management | `npm install @capacitor/filesystem` |
| `@capacitor/preferences` | Local storage | `npm install @capacitor/preferences` |

### Supabase Storage Buckets (Verificare Setup)

| Bucket Name | Usage | Public/Private | RLS Policy |
|-------------|-------|----------------|------------|
| `inspection-photos` | Inspection photos | Private | User must be renter/owner of booking |
| `claim-photos` | Claim evidence | Private | User must be owner/renter of booking |
| `verification-docs` | ID documents | Private | User must be owner of document |
| `avatars` | Profile avatars | Public | User must own profile |
| `equipment-photos` | Equipment listings | Public | Owner can upload |
| `support-attachments` | Support ticket files | Private | User must own ticket |

### Stripe Setup (Verificare)

- [ ] Stripe API keys configured in `.env`
- [ ] Stripe Connect setup per owner payouts
- [ ] Webhooks configured: `payment_intent.succeeded`, `charge.refunded`
- [ ] Escrow logic implemented in Supabase Edge Functions

### Supabase Edge Functions (Verificare)

| Function | Purpose | Trigger |
|----------|---------|---------|
| `process-payment` | Create payment_intent, booking, escrow | Booking submit |
| `refund-deposit` | Auto-refund dopo return inspection | Return inspection completed |
| `send-notification` | Email/push notifications | Various events |
| `escalate-claim` | Notify admin di claim escalation | Claim escalated |

---

## EFFORT SUMMARY & TIMELINE

| Milestone | Effort | Duration (2 dev) | Priorities |
|-----------|--------|------------------|------------|
| **M0: Infrastruttura** | S | 3-5 giorni | - |
| **M1: MVP Blocking (P0)** | XL | 3-4 settimane | BookingForm, Owner Dashboard, Inspection, Active Rental |
| **M2: Feature Parity (P1)** | L | 2-3 settimane | Filters, Renter Dashboard, Payment, Messaging |
| **M3: Safety & Trust (P2)** | L | 2-3 settimane | Claims, Verification, Payments History |
| **M4: Polish (P3)** | M | 1-2 settimane | Settings, Support, Home |
| **Testing & QA** | - | 1 settimana | Smoke + E2E + Manual QA |

**TOTAL:** 9-14 settimane (2 dev full-time)

**MVP Minimal (M0+M1):** 4-5 settimane  
**MVP + Core Features (M0+M1+M2):** 6-8 settimane  
**Full Parity (M0+M1+M2+M3):** 8-12 settimane  
**Complete (All):** 10-15 settimane

---

## RACCOMANDAZIONI FINALI

1. **Priorità assoluta:** M0 + M1 (MVP Blocking) - senza questi l'app è inutilizzabile
2. **Quick wins:** FiltersSheet (M2.1) può essere fatto in parallelo a M1 per immediate UX boost
3. **Parallelizzazione:** 
   - Dev 1: Owner Dashboard + Equipment Management (M1.2)
   - Dev 2: BookingForm + Inspection (M1.1, M1.3)
4. **Testing checkpoint:** Smoke tests dopo ogni milestone, non alla fine
5. **Feature flags:** Considera feature flags per rilasciare progressivamente (es. Claims flow dietro flag)
6. **Documentazione:** Aggiornare README con setup instructions dopo ogni milestone
7. **Design system:** Usare Shadcn UI components anche in mobile per consistency visuale

---

*Piano generato il 14 Gennaio 2026 - Baseline: Web Mobile App v1.0*
