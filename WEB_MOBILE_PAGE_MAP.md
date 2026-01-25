# Web Mobile Page Map (Sorgente di Verità)

Questa è la mappa completa di tutte le pagine, route, modali e flow della **versione mobile della web app** (`src/`).  
Ogni voce include componenti, guard, API/Hook, modali collegati e stati.

**Legenda Stati:**
- **Loading**: Stato durante fetch iniziale dati
- **Empty**: Nessun dato disponibile (es. lista vuota)
- **Error**: Errore durante fetch o operazione

---

## 1. PAGINE PUBBLICHE

### 1.1 Home Page

| Campo | Valore |
|-------|--------|
| **Area** | Public |
| **Route** | `/` |
| **Component** | `src/pages/HomePage.tsx` |
| **Guard** | Nessuno (pubblica) |
| **API/Hook usati** | `fetchListings`, `usePrefetchData`, `useQuery`, `useDebounce` |
| **Modali collegati** | - `LoginModal`: login via email/password<br>- `SignupModal`: registrazione renter/owner<br>- `EquipmentDetailDialog`: dettaglio equipment inline<br>- `FiltersSheet`: filtri avanzati (prezzo, categoria, condizione, date) |
| **Stati** | - Loading: Skeleton per listing grid<br>- Empty: EmptyState component (nessun risultato)<br>- Error: Toast error notification |
| **Note** | Include: HeroSection, HowItWorksSection, FeaturedListingsSection, RecommendationsSection, CategoryBar, SearchBarPopover, VirtualListingGrid, filtri e sort |

### 1.2 Explore Page

| Campo | Valore |
|-------|--------|
| **Area** | Public |
| **Route** | `/explore` |
| **Component** | `src/pages/ExplorePage.tsx` |
| **Guard** | Nessuno (pubblica) |
| **API/Hook usati** | `fetchListings`, `useQuery`, `useDebounce`, `useMediaQuery`, `useQueryState` (nuqs per filter params) |
| **Modali collegati** | - `LoginModal`: quando user non autenticato tenta bookmark/chat<br>- `SignupModal`: registrazione<br>- `EquipmentDetailDialog`: dettaglio inline<br>- `FiltersSheet`: filtri (mobile & desktop)<br>- `MobileListingsBottomSheet`: lista risultati mobile (sopra mappa)<br>- `MapView`: mappa interattiva con pin |
| **Stati** | - Loading: CategoryBarSkeleton, ListingCardSkeleton<br>- Empty: EmptyState (nessun equipment)<br>- Error: Toast |
| **Note** | Supporta: filtri nuqs (search, location, dateFrom, dateTo, category, priceMin/Max, condition), sort, toggle mappa/lista mobile, scroll collapsible header mobile |

### 1.3 Equipment Detail Page

| Campo | Valore |
|-------|--------|
| **Area** | Public |
| **Route** | `/equipment/:id` |
| **Component** | `src/pages/equipment/EquipmentDetailPage.tsx` |
| **Guard** | Nessuno |
| **API/Hook usati** | `fetchListingById`, `useQuery` |
| **Modali collegati** | Nessuno (booking modal è embeddato in EquipmentDetailDialog, non standalone page) |
| **Stati** | - Loading: "Loading..."<br>- Empty: "Equipment not found"<br>- Error: "Failed to load equipment details: {message}" |
| **Note** | Mostra: title, location, rating, photo gallery, descrizione. SEO integrato (generateEquipmentPageMeta, productSchema, breadcrumbSchema) |

---

## 2. PAGINE AUTENTICAZIONE

### 2.1 Email Verification

| Campo | Valore |
|-------|--------|
| **Area** | Auth |
| **Route** | `/verify` |
| **Component** | `src/pages/auth/EmailVerification.tsx` |
| **Guard** | Nessuno |
| **API/Hook usati** | `supabase.auth.verifyOtp`, `useSearchParams` (token hash) |
| **Modali collegati** | Nessuno |
| **Stati** | - Loading: spinner durante verifica<br>- Success: messaggio "Email verified!"<br>- Error: messaggio errore + retry |
| **Note** | Gestisce token dal link email, redirect a onboarding se nuovo utente |

### 2.2 Onboarding Page

| Campo | Valore |
|-------|--------|
| **Area** | Auth |
| **Route** | `/onboarding` |
| **Component** | `src/pages/auth/OnboardingPage.tsx` |
| **Guard** | Richiede utente autenticato |
| **API/Hook usati** | `useAuth`, `supabase` (inserimento profilo renter/owner), `useToast` |
| **Modali collegati** | Nessuno |
| **Stati** | - Loading: durante submit<br>- Error: toast errore<br>- Success: redirect a dashboard |
| **Note** | Form multi-step per completare profilo dopo registrazione (nome, bio, preferenze). OnboardingGuard blocca accesso pagine protette se onboarding non completato |

### 2.3 Auth Bridge

| Campo | Valore |
|-------|--------|
| **Area** | Auth |
| **Route** | `/auth/bridge` |
| **Component** | `src/pages/auth/AuthBridge.tsx` |
| **Guard** | Nessuno |
| **API/Hook usati** | `useAuth`, `useSearchParams` (redirect param) |
| **Modali collegati** | Nessuno |
| **Stati** | - Loading: spinner<br>- Redirect automatico dopo login |
| **Note** | Pagina di transizione per deep link auth (gestione redirect post-login) |

---

## 3. DASHBOARD RENTER

### 3.1 Renter Dashboard

| Campo | Valore |
|-------|--------|
| **Area** | Renter |
| **Route** | `/renter`, `/renter/dashboard` |
| **Component** | `src/pages/renter/RenterDashboard.tsx` |
| **Guard** | `user` required |
| **API/Hook usati** | `useAuth`, `useBookingRequests('renter')`, `useActiveRentals('renter')`, `useVerification`, `supabase` (fetch inspection status), `useMediaQuery` |
| **Modali collegati** | - `MobileInspectionCTA`: prompt mobile per inspection urgente (MobileInspectionSheet) |
| **Stati** | - Loading: Skeleton per bookings e stats<br>- Empty: EmptyState per ogni tab<br>- Error: Toast error |
| **Note** | Tab: overview, bookings, messages, saved. Include: WelcomeHero, StatsOverview, NotificationsPanel, UpcomingCalendar, BookingRequestCard, ActiveRentalCard, PendingClaimsList, SavedEquipmentTab. Mobile CTA per inspection urgente basato su booking date |

### 3.2 Payments Page (Renter)

| Campo | Valore |
|-------|--------|
| **Area** | Renter |
| **Route** | `/renter/payments` |
| **Component** | `src/pages/renter/PaymentsPage.tsx` |
| **Guard** | `user` required |
| **API/Hook usati** | `useAuth`, `supabase` (query payments by user_id) |
| **Modali collegati** | Nessuno |
| **Stati** | - Loading: skeleton<br>- Empty: "No payments yet"<br>- Error: error message |
| **Note** | Lista transazioni, filtro per status, dettagli payment (amount, date, equipment, status) |

---

## 4. DASHBOARD OWNER

### 4.1 Owner Dashboard

| Campo | Valore |
|-------|--------|
| **Area** | Owner |
| **Route** | `/owner`, `/owner/dashboard` |
| **Component** | `src/pages/owner/OwnerDashboard.tsx` |
| **Guard** | `user` required + `isAlsoOwner` check |
| **API/Hook usati** | `useAuth`, `useRoleMode`, `useBookingRequests('owner')`, `useActiveRentals('owner')`, `useVerification`, `supabase` (stats query) |
| **Modali collegati** | Nessuno (equipment management usa componenti inline) |
| **Stati** | - Loading: Skeleton<br>- Empty: EmptyState per tab<br>- Error: Alert component |
| **Note** | Tab: overview, equipment, bookings, messages, reviews, payments. Include: WelcomeHero, stats (totalListings, activeBookings, totalEarnings, averageRating), EquipmentManagement, BookingRequestCard, MessagingInterface, ReviewList, EscrowDashboard, TransactionHistory, OwnerNotificationsPanel, OwnerClaimsList, ActiveRentalCard |

### 4.2 Owner Upgrade

| Campo | Valore |
|-------|--------|
| **Area** | Owner |
| **Route** | `/owner/become-owner` |
| **Component** | `src/pages/owner/OwnerUpgrade.tsx` |
| **Guard** | `user` required |
| **API/Hook usati** | `useAuth`, `useRoleMode`, `supabase` (update profile role) |
| **Modali collegati** | Nessuno |
| **Stati** | - Loading: button loading state<br>- Success: redirect a owner dashboard<br>- Error: toast |
| **Note** | Form per upgrade da renter a owner (richiede info business, documenti) |

---

## 5. MESSAGING

### 5.1 Messaging Page

| Campo | Valore |
|-------|--------|
| **Area** | Protected |
| **Route** | `/messages` |
| **Component** | `src/pages/MessagingPage.tsx` |
| **Guard** | `user` required |
| **API/Hook usati** | `useAuth`, `MessagingInterface` component (interno usa `supabase` realtime + query conversations) |
| **Modali collegati** | Nessuno |
| **Stati** | - Loading: spinner<br>- Empty: "No conversations" (dentro MessagingInterface)<br>- Error: error message |
| **Note** | PageHeader nascosto su mobile. MessagingInterface include: conversation list, chat view, message input, realtime subscriptions |

---

## 6. BOOKING & RENTAL LIFECYCLE

### 6.1 Active Rental Page

| Campo | Valore |
|-------|--------|
| **Area** | Protected |
| **Route** | `/rental/:bookingId` |
| **Component** | `src/pages/rental/ActiveRentalPage.tsx` |
| **Guard** | `user` required + verificare owner o renter del booking |
| **API/Hook usati** | `useActiveRental(bookingId)`, `useAuth` |
| **Modali collegati** | Nessuno (azioni inline: navigate to inspection, claim, chat) |
| **Stati** | - Loading: Skeleton<br>- Empty/Error: Card con AlertTriangle + redirect dashboard<br>- Success: rental details |
| **Note** | Include: RentalCountdown, RentalQuickActions (CTA per inspection, claim, chat, support), dettagli equipment, counterpart profile, inspections status, timeline |

---

## 7. INSPECTION

### 7.1 Equipment Inspection Page

| Campo | Valore |
|-------|--------|
| **Area** | Protected |
| **Route** | `/inspection/:bookingId/:type` (type = pickup o return) |
| **Component** | `src/pages/inspection/EquipmentInspectionPage.tsx` |
| **Guard** | `user` required + verifica owner (return) o renter (pickup) |
| **API/Hook usati** | `useAuth`, `supabase` (fetch booking + equipment), `InspectionWizard` component |
| **Modali collegati** | Nessuno |
| **Stati** | - Loading: Loader2 spinner<br>- Error: Alert con messaggio + back button<br>- Success: InspectionWizard |
| **Note** | Pickup inspection solo per renter, return solo per owner. InspectionWizard gestisce upload photo, condition, note. Redirect dashboard se unauthorized |

### 7.2 Inspection View

| Campo | Valore |
|-------|--------|
| **Area** | Protected |
| **Route** | `/inspection/:bookingId/view/:inspectionType` |
| **Component** | `src/components/inspection/InspectionView.tsx` (render come page) |
| **Guard** | `user` required + owner o renter del booking |
| **API/Hook usati** | `supabase` (fetch inspection by booking + type) |
| **Modali collegati** | Nessuno |
| **Stati** | - Loading: skeleton<br>- Empty: "Inspection not found"<br>- Error: error message |
| **Note** | Mostra inspection completata: foto, note, condition, timestamp |

---

## 8. CLAIMS

### 8.1 File Claim Page

| Campo | Valore |
|-------|--------|
| **Area** | Protected (Owner only) |
| **Route** | `/claims/file/:bookingId` |
| **Component** | `src/pages/claims/FileClaimPage.tsx` |
| **Guard** | `user` required + verificare owner del equipment |
| **API/Hook usati** | `useAuth`, `supabase` (fetch booking, pickup inspection photos), `ClaimFilingForm` component |
| **Modali collegati** | Nessuno |
| **Stati** | - Loading: Loader2<br>- Error: Alert + ArrowLeft button<br>- Success: ClaimFilingForm |
| **Note** | Solo owner può file claim. ClaimFilingForm include: damage description, upload photos, claim amount, comparison con pickup photos |

### 8.2 Review Claim Page

| Campo | Valore |
|-------|--------|
| **Area** | Protected (Renter only) |
| **Route** | `/claims/review/:claimId` |
| **Component** | `src/pages/claims/ReviewClaimPage.tsx` |
| **Guard** | `user` required + renter del booking associato |
| **API/Hook usati** | `useAuth`, `supabase` (fetch claim + booking), `ClaimReviewInterface` component |
| **Modali collegati** | Nessuno |
| **Stati** | - Loading: spinner<br>- Error: Alert<br>- Success: ClaimReviewInterface |
| **Note** | Renter può: accettare, disputa, o submit counter-evidence. ClaimReviewInterface mostra: damage report, photos comparison, amount, actions |

### 8.3 Manage Claim Page

| Campo | Valore |
|-------|--------|
| **Area** | Protected (Owner only) |
| **Route** | `/claims/manage/:claimId` |
| **Component** | `src/pages/claims/ManageClaimPage.tsx` |
| **Guard** | `user` required + owner del equipment |
| **API/Hook usati** | `useAuth`, `supabase` (fetch claim + updates), `ClaimManagementInterface` component |
| **Modali collegati** | Nessuno |
| **Stati** | - Loading: spinner<br>- Error: Alert<br>- Success: ClaimManagementInterface |
| **Note** | Owner gestisce claim lifecycle: review renter dispute, escalate, resolve. ClaimManagementInterface mostra timeline, status, actions |

---

## 9. PAYMENT

### 9.1 Payment Confirmation

| Campo | Valore |
|-------|--------|
| **Area** | Protected |
| **Route** | `/payment/confirmation` |
| **Component** | `src/pages/payment/PaymentConfirmation.tsx` |
| **Guard** | `user` required |
| **API/Hook usati** | `useAuth`, `useSearchParams` (payment_id o payment_intent), `supabase` (poll payment status) |
| **Modali collegati** | Nessuno |
| **Stati** | - Loading: spinner (polling payment)<br>- Error: Alert con retry<br>- Success: payment details + CTA (view booking, chat, home, pickup inspection) |
| **Note** | Polling fino a 10 secondi per verificare payment status. Mostra: amount, equipment, owner, escrow status, next steps |

---

## 10. VERIFICATION

### 10.1 Verify Identity Page

| Campo | Valore |
|-------|--------|
| **Area** | Protected |
| **Route** | `/verification` |
| **Component** | `src/pages/verification/VerifyIdentity.tsx` |
| **Guard** | `user` required |
| **API/Hook usati** | `useVerification`, `useToast` |
| **Modali collegati** | - `Dialog`: "Why Verify?" info dialog (inline) |
| **Stati** | - Loading: durante upload documenti<br>- Success: TrustScore aggiornato<br>- Error: toast error |
| **Note** | Step: overview, identity (upload ID), phone (SMS verification). Include: DocumentUpload, PhoneVerification, TrustScore display, progress tracker |

---

## 11. SETTINGS

### 11.1 Profile Settings

| Campo | Valore |
|-------|--------|
| **Area** | Protected |
| **Route** | `/settings` |
| **Component** | `src/pages/ProfileSettings.tsx` |
| **Guard** | `user` required |
| **API/Hook usati** | `useAuth`, `useForm` (react-hook-form), `supabase` (update profile, renter_profiles, owner_profiles) |
| **Modali collegati** | Nessuno |
| **Stati** | - Loading: durante fetch profilo<br>- Saving: button loading state<br>- Success: toast "Saved!" + CheckCircle icon<br>- Error: Alert |
| **Note** | Form campi: full_name, phone, bio, experience_level (renter), preferences (renter), business_name (owner), business_description (owner) |

### 11.2 Notifications Settings

| Campo | Valore |
|-------|--------|
| **Area** | Protected |
| **Route** | `/settings/notifications` |
| **Component** | `src/pages/settings/NotificationsSettings.tsx` |
| **Guard** | `user` required |
| **API/Hook usati** | `useAuth`, `supabase` (update notification preferences) |
| **Modali collegati** | Nessuno |
| **Stati** | - Loading: skeleton<br>- Saving: switch loading<br>- Error: toast |
| **Note** | Toggle per: email notifications, push notifications, SMS, booking updates, messages, marketing |

---

## 12. SUPPORT

### 12.1 Support Page

| Campo | Valore |
|-------|--------|
| **Area** | Protected |
| **Route** | `/support` |
| **Component** | `src/pages/SupportPage.tsx` |
| **Guard** | `user` required |
| **API/Hook usati** | `useAuth`, `supabase` (insert support ticket) |
| **Modali collegati** | Nessuno |
| **Stati** | - Loading: durante submit ticket<br>- Success: toast "Ticket submitted"<br>- Error: toast error |
| **Note** | Form: subject, category (dropdown), message, optional file upload. Include FAQ accordion |

---

## 13. ADMIN

### 13.1 Admin Dashboard

| Campo | Valore |
|-------|--------|
| **Area** | Admin |
| **Route** | `/admin` |
| **Component** | `src/pages/admin/AdminDashboard.tsx` |
| **Guard** | AdminRoute guard (verificare useAdminAccess hook) |
| **API/Hook usati** | `useAdminAccess`, `useAuth`, `supabase` (query users, bookings, equipment, claims) |
| **Modali collegati** | - `Dialog`: "Create User" modal (inline) |
| **Stati** | - Loading: PageLoader + per ogni section<br>- Error: Alert con retry<br>- Success: dashboard tables/stats |
| **Note** | Tab: users, equipment, bookings, claims, settings. Include: stats overview, user management (create, edit, ban), equipment approval, booking oversight, claims resolution |

---

## 14. MODALI GLOBALI / COMPONENTI CONDIVISI

### 14.1 LoginModal

| Campo | Valore |
|-------|--------|
| **Component** | `src/components/auth/LoginModal.tsx` |
| **Trigger** | Query param `?login=true` (ExplorePage, HomePage) |
| **Props** | `open: boolean`, `onOpenChange: (open: boolean) => void` |
| **Form** | Email + password, forgot password link, OAuth buttons (Google, Facebook) |
| **API** | `supabase.auth.signInWithPassword`, `supabase.auth.signInWithOAuth` |
| **Success** | Close modal, redirect dashboard or stay on page |
| **Error** | Toast error message |

### 14.2 SignupModal

| Campo | Valore |
|-------|--------|
| **Component** | `src/components/auth/SignupModal.tsx` |
| **Trigger** | Query param `?signup=true&role=renter|owner` (ExplorePage, HomePage) |
| **Props** | `open: boolean`, `onOpenChange: (open: boolean) => void`, `initialRole?: 'renter' | 'owner'` |
| **Form** | Email, password, confirm password, role selector, OAuth buttons |
| **API** | `supabase.auth.signUp` |
| **Success** | Close modal, redirect to `/verify` (email confirmation) |
| **Error** | Toast error |

### 14.3 EquipmentDetailDialog

| Campo | Valore |
|-------|--------|
| **Component** | `src/components/equipment/detail/EquipmentDetailDialog.tsx` |
| **Trigger** | Click su ListingCard (ExplorePage, HomePage) |
| **Props** | `equipmentId: string | null`, `open: boolean`, `onOpenChange: (open: boolean) => void` |
| **Content** | Gallery photos, title, location, rating, description, reviews, owner profile, availability calendar, **BookingForm inline** |
| **Modali interni** | BookingForm (date picker, insurance, terms acceptance, payment method) |
| **API** | `fetchListingById`, `useQuery` per reviews/calendar |
| **Actions** | Bookmark (favorite), Share, Book (submit booking request + payment) |

### 14.4 FiltersSheet

| Campo | Valore |
|-------|--------|
| **Component** | `src/components/explore/FiltersSheet.tsx` |
| **Trigger** | Click "Filters" button (ExplorePage, HomePage) |
| **Props** | `open: boolean`, `onOpenChange`, `filters: FilterValues`, `onApplyFilters: (filters: FilterValues) => void` |
| **Content** | Price range slider, category chips, condition checkboxes, date range picker, location autocomplete |
| **Actions** | Apply filters, Reset filters |

### 14.5 MobileListingsBottomSheet

| Campo | Valore |
|-------|--------|
| **Component** | `src/components/explore/MobileListingsBottomSheet.tsx` |
| **Trigger** | Mobile map view mode (ExplorePage) |
| **Props** | `listings: Listing[]`, `onEquipmentClick: (id: string) => void` |
| **Content** | Scrollable horizontal list di ListingCard (compact) sopra mappa |
| **Note** | Swipeable, snap scroll |

### 14.6 MobileInspectionSheet

| Campo | Valore |
|-------|--------|
| **Component** | `src/components/booking/inspection-flow/MobileInspectionSheet.tsx` |
| **Trigger** | MobileInspectionCTA (RenterDashboard) quando booking urgente |
| **Props** | `bookingId: string`, `type: 'pickup' | 'return'`, `open: boolean`, `onClose` |
| **Content** | Prompt per iniziare inspection + navigate to `/inspection/:bookingId/:type` |

---

## 15. LAYOUT & NAVIGATION

### 15.1 MobileBottomNav

| Campo | Valore |
|-------|--------|
| **Component** | `src/components/layout/MobileBottomNav.tsx` |
| **Display** | Mostra se user autenticato + media query mobile |
| **Tabs** | - Explore (`/explore`)<br>- Messages (`/messages`)<br>- Rentals (`/renter` o `/owner` based on roleMode)<br>- Profile (`/settings`) |
| **Note** | Icone con badge notifiche, active state highlight |

### 15.2 ExploreHeader

| Campo | Valore |
|-------|--------|
| **Component** | `src/components/layout/ExploreHeader.tsx` |
| **Display** | Top header per explore/home page |
| **Content** | Logo, search bar (desktop), login/signup buttons (se non autenticato), user menu (se autenticato), language selector, theme toggle |

### 15.3 DashboardLayout

| Campo | Valore |
|-------|--------|
| **Component** | `src/components/layout/DashboardLayout.tsx` |
| **Usage** | Wrapper per dashboard pages (RenterDashboard, OwnerDashboard, Messaging, Settings, etc.) |
| **Content** | Sidebar (desktop), mobile header + bottom nav, main content area |

---

## 16. ONBOARDING & GUARDS

### 16.1 OnboardingGuard

| Campo | Valore |
|-------|--------|
| **Component** | `src/components/auth/OnboardingGuard.tsx` |
| **Behavior** | Se user autenticato ma profilo incompleto (no full_name o no renter/owner profile), redirect a `/onboarding` |
| **Bypass** | Routes `/onboarding`, `/verify`, `/auth/*` bypassano il guard |

---

## RIEPILOGO TOTALE PAGINE WEB MOBILE

| Categoria | Count | Route |
|-----------|-------|-------|
| **Pubbliche** | 3 | `/`, `/explore`, `/equipment/:id` |
| **Auth** | 3 | `/verify`, `/onboarding`, `/auth/bridge` |
| **Renter Dashboard** | 2 | `/renter`, `/renter/payments` |
| **Owner Dashboard** | 2 | `/owner`, `/owner/become-owner` |
| **Messaging** | 1 | `/messages` |
| **Rental Lifecycle** | 1 | `/rental/:bookingId` |
| **Inspection** | 2 | `/inspection/:bookingId/:type`, `/inspection/:bookingId/view/:inspectionType` |
| **Claims** | 3 | `/claims/file/:bookingId`, `/claims/review/:claimId`, `/claims/manage/:claimId` |
| **Payment** | 1 | `/payment/confirmation` |
| **Verification** | 1 | `/verification` |
| **Settings** | 2 | `/settings`, `/settings/notifications` |
| **Support** | 1 | `/support` |
| **Admin** | 1 | `/admin` |
| **TOTALE PAGINE** | **23** | |

| Categoria Modali | Count | Component |
|-----------------|-------|-----------|
| **Auth Modali** | 2 | `LoginModal`, `SignupModal` |
| **Equipment Modali** | 2 | `EquipmentDetailDialog`, `FiltersSheet` |
| **Mobile Sheets** | 2 | `MobileListingsBottomSheet`, `MobileInspectionSheet` |
| **TOTALE MODALI** | **6** | |

---

**Note Finali:**
- Ogni pagina ha SEO integrato (SEOHead, StructuredData) dove applicabile
- Tutte le pagine protette richiedono `user` (useAuth)
- RLS policies Supabase controllano accesso lato backend
- Real-time subscriptions per messaging e notifications
- Responsive design mobile-first con breakpoint checks (useMediaQuery)
- i18n support (useTranslation hook)
- Toast notifications per feedback utente (useToast)
- Error boundaries per crash protection (non mostrato qui ma presente nel codebase)
