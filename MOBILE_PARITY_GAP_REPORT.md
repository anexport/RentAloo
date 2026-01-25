# Mobile App Parity Gap Report

Report dettagliato dei gap funzionali tra la **Web App Mobile** (sorgente di verità) e la **Mobile App Capacitor** (`apps/mobile`).

**Stato legenda:**
- ✅ **OK**: Pagina/funzionalità presente e completa
- ⚠️ **PARTIAL**: Pagina presente ma funzionalità incomplete
- ❌ **MISSING**: Pagina/funzionalità completamente assente

**Data analisi:** 14 Gennaio 2026  
**Baseline:** Web App Mobile (`src/`)  
**Target:** Mobile App (`apps/mobile/src/`)

---

## RIEPILOGO ESECUTIVO

| Categoria | Web Pages | Mobile Screens | Gap Count | Priorità |
|-----------|-----------|----------------|-----------|----------|
| **Pagine Pubbliche** | 3 | 2 | 1 MISSING | 🔴 ALTA |
| **Auth** | 3 | 3 | 0 OK | ✅ |
| **Dashboard Renter** | 2 | 1 (parziale) | 1 MISSING, 1 PARTIAL | 🔴 ALTA |
| **Dashboard Owner** | 2 | 0 | 2 MISSING | 🔴 ALTA |
| **Messaging** | 1 | 1 | 0 OK (partial) | 🟡 MEDIA |
| **Rental Lifecycle** | 1 | 0 | 1 MISSING | 🔴 ALTA |
| **Inspection** | 2 | 0 | 2 MISSING | 🔴 ALTA |
| **Claims** | 3 | 0 | 3 MISSING | 🟠 MEDIA-ALTA |
| **Payment** | 1 | 1 | 0 PARTIAL | 🔴 ALTA |
| **Verification** | 1 | 0 | 1 MISSING | 🟠 MEDIA-ALTA |
| **Settings** | 2 | 0 | 2 MISSING | 🟡 MEDIA |
| **Support** | 1 | 0 | 1 MISSING | 🟢 BASSA |
| **Admin** | 1 | 0 | 1 MISSING | 🟢 BASSA |
| **Modali/Sheets** | 6 | 1 | 5 MISSING | 🔴 ALTA |

**TOTALE GAP: 20/23 pagine core mancanti o incomplete (87% gap)**

---

## 1. PAGINE PUBBLICHE

### 1.1 Home Page

| Campo | Web | Mobile | Stato | Gap |
|-------|-----|--------|-------|-----|
| **Route** | `/` | `/` redirect a `/explore` | ⚠️ PARTIAL | Home page con hero, featured listings, how it works assente |
| **Component** | `HomePage.tsx` | N/A | ❌ | |
| **Funzionalità mancanti** | | | | - HeroSection<br>- FeaturedListingsSection<br>- HowItWorksSection<br>- SocialProofSection<br>- RecommendationsSection<br>- OwnerCTASection |
| **Modali mancanti** | | | | - LoginModal (presente in web via query param)<br>- SignupModal (presente in web via query param) |
| **Hook/lib** | `usePrefetchData`, `useQuery` | N/A | ❌ | |
| **Priorità** | | | 🟡 MEDIA | Home può essere sostituita da Explore, ma perdono SEO landing e marketing content |

### 1.2 Explore Page

| Campo | Web | Mobile | Stato | Gap |
|-------|-----|--------|-------|-----|
| **Route** | `/explore` | `/explore` | ⚠️ PARTIAL | |
| **Component** | `ExplorePage.tsx` | `ExploreScreen.tsx` | ⚠️ | |
| **Funzionalità mancanti** | | | | - CategoryBar (assente)<br>- Filtri avanzati (FiltersSheet assente)<br>- Sort options (assente)<br>- Map view toggle (assente)<br>- SearchBarPopover (solo input base)<br>- Infinite scroll/Virtual scroll<br>- Bookmark/favorite inline<br>- nuqs filter params (no URL state persistence) |
| **Modali mancanti** | | | | - FiltersSheet<br>- MapView<br>- MobileListingsBottomSheet |
| **Hook/lib** | `useQueryState`, `useDebounce`, `useMediaQuery` | solo `useState` base | ⚠️ | |
| **Priorità** | | | 🔴 ALTA | Explore è pagina core, mancano funzionalità chiave |

### 1.3 Equipment Detail

| Campo | Web | Mobile | Stato | Gap |
|-------|-----|--------|-------|-----|
| **Route** | `/equipment/:id` | `/equipment/:id` | ⚠️ PARTIAL | |
| **Component** | `EquipmentDetailPage.tsx` | `EquipmentDetailScreen.tsx` | ⚠️ | |
| **Funzionalità mancanti** | | | | - SEO (SEOHead, StructuredData)<br>- Reviews section (lista reviews)<br>- Owner profile card<br>- **BookingForm inline** (CRITICO)<br>- Availability calendar<br>- Share button<br>- Similar equipment suggestions |
| **Modali mancanti** | | | | - EquipmentDetailDialog (in web è modale, in mobile è pagina - OK)<br>- BookingForm (MANCANTE) |
| **Hook/lib** | `fetchListingById`, `useQuery` | solo `supabase.from().select()` | ⚠️ | Mancano utils per reviews/rating |
| **Priorità** | | | 🔴 ALTA | Senza BookingForm non si può prenotare |

---

## 2. AUTH

### 2.1 Login

| Campo | Web | Mobile | Stato | Gap |
|-------|-----|--------|-------|-----|
| **Route** | `/?login=true` (modal) | `/login` | ✅ OK | |
| **Component** | `LoginModal.tsx` | `LoginScreen.tsx` | ✅ | |
| **Funzionalità** | Email/password, OAuth, forgot password | Email/password | ⚠️ | OAuth mancante, forgot password mancante |
| **Priorità** | | | 🟡 MEDIA | OAuth nice-to-have, forgot password importante |

### 2.2 Signup

| Campo | Web | Mobile | Stato | Gap |
|-------|-----|--------|-------|-----|
| **Route** | `/?signup=true&role=renter/owner` | `/signup` | ✅ OK | |
| **Component** | `SignupModal.tsx` | `SignupScreen.tsx` | ✅ | |
| **Funzionalità** | Email/password, OAuth, role selector | Email/password, role selector | ⚠️ | OAuth mancante |
| **Priorità** | | | 🟡 MEDIA | OAuth nice-to-have |

### 2.3 Email Verification

| Campo | Web | Mobile | Stato | Gap |
|-------|-----|--------|-------|-----|
| **Route** | `/verify` | `/verify` | ✅ OK | |
| **Component** | `EmailVerification.tsx` | `VerifyScreen.tsx` | ✅ | |
| **Funzionalità** | Token verification, redirect onboarding | Token verification | ✅ | |
| **Priorità** | | | ✅ OK | |

### 2.4 Onboarding

| Campo | Web | Mobile | Stato | Gap |
|-------|-----|--------|-------|-----|
| **Route** | `/onboarding` | N/A | ❌ MISSING | |
| **Component** | `OnboardingPage.tsx` | N/A | ❌ | |
| **Funzionalità mancanti** | | | | - Multi-step form per completare profilo<br>- OnboardingGuard (blocca accesso se profilo incompleto) |
| **Priorità** | | | 🟠 MEDIA-ALTA | Importante per UX, ma può essere sostituito con edit profile |

### 2.5 Auth Bridge

| Campo | Web | Mobile | Stato | Gap |
|-------|-----|--------|-------|-----|
| **Route** | `/auth/bridge` | `/auth/*` redirect | ✅ OK | |
| **Component** | `AuthBridge.tsx` | gestito in `VerifyScreen` | ✅ | |
| **Priorità** | | | ✅ OK | Deep links gestiti diversamente in mobile |

---

## 3. DASHBOARD RENTER

### 3.1 Renter Dashboard

| Campo | Web | Mobile | Stato | Gap |
|-------|-----|--------|-------|-----|
| **Route** | `/renter`, `/renter/dashboard` | `/rentals` | ⚠️ PARTIAL | |
| **Component** | `RenterDashboard.tsx` | `RentalsScreen.tsx` | ⚠️ | |
| **Funzionalità mancanti** | | | | - Tab system (overview, bookings, messages, saved)<br>- WelcomeHero<br>- StatsOverview (total bookings, active rentals, spent)<br>- NotificationsPanel<br>- UpcomingCalendar<br>- **SavedEquipmentTab** (favorites)<br>- PendingClaimsList<br>- MobileInspectionCTA<br>- Verification progress banner |
| **Modali mancanti** | | | | - MobileInspectionSheet |
| **Hook/lib** | `useVerification`, `useActiveRentals`, `useBookingRequests` | solo `useBookingRequests`, `useActiveRentals` (partial) | ⚠️ | |
| **Priorità** | | | 🔴 ALTA | Dashboard è hub principale renter |

### 3.2 Payments Page

| Campo | Web | Mobile | Stato | Gap |
|-------|-----|--------|-------|-----|
| **Route** | `/renter/payments` | N/A | ❌ MISSING | |
| **Component** | `PaymentsPage.tsx` | N/A | ❌ | |
| **Funzionalità mancanti** | | | | - Transaction history list<br>- Filter by status<br>- Payment details view |
| **Priorità** | | | 🟠 MEDIA-ALTA | Importante per trasparenza pagamenti |

---

## 4. DASHBOARD OWNER

### 4.1 Owner Dashboard

| Campo | Web | Mobile | Stato | Gap |
|-------|-----|--------|-------|-----|
| **Route** | `/owner`, `/owner/dashboard` | N/A | ❌ MISSING | |
| **Component** | `OwnerDashboard.tsx` | N/A | ❌ | |
| **Funzionalità mancanti** | | | | **TUTTO:**<br>- Tab system (overview, equipment, bookings, messages, reviews, payments)<br>- WelcomeHero<br>- Stats (totalListings, activeBookings, totalEarnings, avgRating)<br>- EquipmentManagement (list, create, edit, delete)<br>- BookingRequestCard (approve/decline)<br>- MessagingInterface<br>- ReviewList<br>- EscrowDashboard<br>- TransactionHistory<br>- OwnerNotificationsPanel<br>- OwnerClaimsList<br>- ActiveRentalCard |
| **Hook/lib** | `useRoleMode`, `useBookingRequests('owner')`, `useActiveRentals('owner')` | N/A | ❌ | |
| **Priorità** | | | 🔴 ALTA | CRITICO: owner non può gestire listing/bookings |

### 4.2 Owner Upgrade

| Campo | Web | Mobile | Stato | Gap |
|-------|-----|--------|-------|-----|
| **Route** | `/owner/become-owner` | N/A | ❌ MISSING | |
| **Component** | `OwnerUpgrade.tsx` | N/A | ❌ | |
| **Funzionalità mancanti** | | | | - Form upgrade renter -> owner<br>- Business info input |
| **Priorità** | | | 🟡 MEDIA | Può essere sostituito con API call in settings |

---

## 5. MESSAGING

### 5.1 Messaging Page

| Campo | Web | Mobile | Stato | Gap |
|-------|-----|--------|-------|-----|
| **Route** | `/messages` | `/messages` | ⚠️ PARTIAL | |
| **Component** | `MessagingPage.tsx` | `MessagesScreen.tsx` | ⚠️ | |
| **Funzionalità mancanti** | | | | - MessagingInterface completo (split view desktop/mobile)<br>- Real-time subscriptions (potrebbero essere assenti)<br>- Conversation search<br>- Message read status<br>- Typing indicators<br>- File attachments |
| **ConversationScreen** | `/messages` (inline) | `/conversation/:id` | ⚠️ | Separato OK, ma controllare feature parity |
| **Priorità** | | | 🟡 MEDIA | Messaging base presente, da verificare real-time |

---

## 6. RENTAL LIFECYCLE

### 6.1 Active Rental Page

| Campo | Web | Mobile | Stato | Gap |
|-------|-----|--------|-------|-----|
| **Route** | `/rental/:bookingId` | N/A | ❌ MISSING | |
| **Component** | `ActiveRentalPage.tsx` | N/A | ❌ | |
| **Funzionalità mancanti** | | | | **TUTTO:**<br>- RentalCountdown (time until pickup/return)<br>- RentalQuickActions (CTA: start inspection, file claim, chat, support)<br>- Equipment details card<br>- Counterpart profile (owner/renter)<br>- Inspection status (pickup/return done)<br>- Rental timeline<br>- Damage deposit status<br>- Next steps guidance |
| **Alternative** | | | | RentalsScreen mostra lista, ma non dettaglio rental |
| **Priorità** | | | 🔴 ALTA | CRITICO per gestire rental attivo |

---

## 7. INSPECTION

### 7.1 Equipment Inspection Page

| Campo | Web | Mobile | Stato | Gap |
|-------|-----|--------|-------|-----|
| **Route** | `/inspection/:bookingId/:type` | N/A | ❌ MISSING | |
| **Component** | `EquipmentInspectionPage.tsx` | N/A | ❌ | |
| **Funzionalità mancanti** | | | | **TUTTO:**<br>- InspectionWizard (multi-step)<br>- Upload photos (camera + gallery)<br>- Condition assessment (radio buttons)<br>- Notes textarea<br>- Submit inspection<br>- Guard: renter only pickup, owner only return |
| **Priorità** | | | 🔴 ALTA | CRITICO per deposit refund flow |

### 7.2 Inspection View

| Campo | Web | Mobile | Stato | Gap |
|-------|-----|--------|-------|-----|
| **Route** | `/inspection/:bookingId/view/:inspectionType` | N/A | ❌ MISSING | |
| **Component** | `InspectionView.tsx` | N/A | ❌ | |
| **Funzionalità mancanti** | | | | - View completed inspection<br>- Photo gallery<br>- Condition + notes display<br>- Timestamp |
| **Priorità** | | | 🟠 MEDIA-ALTA | Importante per trasparenza, ma non blocking |

---

## 8. CLAIMS

### 8.1 File Claim Page

| Campo | Web | Mobile | Stato | Gap |
|-------|-----|--------|-------|-----|
| **Route** | `/claims/file/:bookingId` | N/A | ❌ MISSING | |
| **Component** | `FileClaimPage.tsx` | N/A | ❌ | |
| **Funzionalità mancanti** | | | | **TUTTO (Owner only):**<br>- ClaimFilingForm<br>- Damage description textarea<br>- Upload damage photos<br>- Claim amount input<br>- Comparison con pickup photos<br>- Submit claim |
| **Priorità** | | | 🟠 MEDIA-ALTA | Importante per owner protection |

### 8.2 Review Claim Page

| Campo | Web | Mobile | Stato | Gap |
|-------|-----|--------|-------|-----|
| **Route** | `/claims/review/:claimId` | N/A | ❌ MISSING | |
| **Component** | `ReviewClaimPage.tsx` | N/A | ❌ | |
| **Funzionalità mancanti** | | | | **TUTTO (Renter only):**<br>- ClaimReviewInterface<br>- View damage report<br>- Photo comparison<br>- Accept/dispute buttons<br>- Counter-evidence upload |
| **Priorità** | | | 🟠 MEDIA-ALTA | Importante per fairness |

### 8.3 Manage Claim Page

| Campo | Web | Mobile | Stato | Gap |
|-------|-----|--------|-------|-----|
| **Route** | `/claims/manage/:claimId` | N/A | ❌ MISSING | |
| **Component** | `ManageClaimPage.tsx` | N/A | ❌ | |
| **Funzionalità mancanti** | | | | **TUTTO (Owner only):**<br>- ClaimManagementInterface<br>- Claim timeline<br>- Status updates<br>- Escalate/resolve actions |
| **Priorità** | | | 🟡 MEDIA | Nice-to-have, può essere in dashboard |

---

## 9. PAYMENT

### 9.1 Payment Confirmation

| Campo | Web | Mobile | Stato | Gap |
|-------|-----|--------|-------|-----|
| **Route** | `/payment/confirmation` | `/payment/confirmation` | ⚠️ PARTIAL | |
| **Component** | `PaymentConfirmation.tsx` | `PaymentConfirmationScreen` (inline in App.tsx) | ⚠️ | |
| **Funzionalità mancanti** | | | | - Polling payment status (max 10 sec)<br>- Equipment details card<br>- Owner profile<br>- Escrow status<br>- Next steps CTA (view booking, chat, pickup inspection) |
| **PaymentScreen** | N/A (embedded in BookingForm) | `/payment/:bookingId` | ⚠️ | Esiste ma funzionalità da verificare |
| **Priorità** | | | 🔴 ALTA | Payment flow incompleto |

---

## 10. VERIFICATION

### 10.1 Verify Identity Page

| Campo | Web | Mobile | Stato | Gap |
|-------|-----|--------|-------|-----|
| **Route** | `/verification` | N/A | ❌ MISSING | |
| **Component** | `VerifyIdentity.tsx` | N/A | ❌ | |
| **Funzionalità mancanti** | | | | **TUTTO:**<br>- DocumentUpload (ID upload)<br>- PhoneVerification (SMS code)<br>- TrustScore display<br>- Progress tracker<br>- "Why Verify?" dialog |
| **Alternative** | | | | ProfileScreen ha link `/verification`, ma pagina non esiste |
| **Priorità** | | | 🟠 MEDIA-ALTA | Importante per trust, MVP può vivere senza |

---

## 11. SETTINGS

### 11.1 Profile Settings

| Campo | Web | Mobile | Stato | Gap |
|-------|-----|--------|-------|-----|
| **Route** | `/settings` | `/profile/edit` (link in ProfileScreen) | ⚠️ PARTIAL | |
| **Component** | `ProfileSettings.tsx` | N/A | ❌ | |
| **Funzionalità mancanti** | | | | - Form completo (full_name, phone, bio, experience_level, preferences, business_name, business_description)<br>- Role-based fields (renter vs owner)<br>- Save toast feedback |
| **Alternative** | | | | ProfileScreen mostra profilo, ma no edit inline |
| **Priorità** | | | 🟡 MEDIA | Edit profile importante per completeness |

### 11.2 Notifications Settings

| Campo | Web | Mobile | Stato | Gap |
|-------|-----|--------|-------|-----|
| **Route** | `/settings/notifications` | `/profile/notifications` (link) | ⚠️ PARTIAL | |
| **Component** | `NotificationsSettings.tsx` | N/A | ❌ | |
| **Funzionalità mancanti** | | | | - Toggle switches (email, push, SMS, booking updates, messages, marketing)<br>- Save preferences |
| **Priorità** | | | 🟡 MEDIA | Nice-to-have |

---

## 12. SUPPORT

### 12.1 Support Page

| Campo | Web | Mobile | Stato | Gap |
|-------|-----|--------|-------|-----|
| **Route** | `/support` | `/support` (link) | ⚠️ PARTIAL | |
| **Component** | `SupportPage.tsx` | N/A | ❌ | |
| **Funzionalità mancanti** | | | | - Support ticket form (subject, category, message, file upload)<br>- FAQ accordion |
| **Priorità** | | | 🟢 BASSA | MVP può usare email/chat |

---

## 13. ADMIN

### 13.1 Admin Dashboard

| Campo | Web | Mobile | Stato | Gap |
|-------|-----|--------|-------|-----|
| **Route** | `/admin` | N/A | ❌ MISSING | |
| **Component** | `AdminDashboard.tsx` | N/A | ❌ | |
| **Funzionalità mancanti** | | | | **TUTTO** (admin features non sono MVP mobile) |
| **Priorità** | | | 🟢 BASSA | Admin può usare web app |

---

## 14. MODALI/SHEETS

### 14.1 LoginModal

| Campo | Web | Mobile | Stato | Gap |
|-------|-----|--------|-------|-----|
| **Component** | `LoginModal.tsx` | N/A | ❌ | Mobile usa screen, non modale |
| **Note** | | | | Web usa modal triggered da query param, mobile ha screen dedicato - OK |

### 14.2 SignupModal

| Campo | Web | Mobile | Stato | Gap |
|-------|-----|--------|-------|-----|
| **Component** | `SignupModal.tsx` | N/A | ❌ | Mobile usa screen, non modale |
| **Note** | | | | Web usa modal triggered da query param, mobile ha screen dedicato - OK |

### 14.3 EquipmentDetailDialog

| Campo | Web | Mobile | Stato | Gap |
|-------|-----|--------|-------|-----|
| **Component** | `EquipmentDetailDialog.tsx` | N/A | ❌ | Mobile usa EquipmentDetailScreen |
| **Note** | | | | Web usa dialog/modal, mobile usa full screen - OK architetturalmente, ma mancano features (vedi Equipment Detail sopra) |

### 14.4 FiltersSheet

| Campo | Web | Mobile | Stato | Gap |
|-------|-----|--------|-------|-----|
| **Component** | `FiltersSheet.tsx` | N/A | ❌ MISSING | |
| **Funzionalità mancanti** | | | | - Price range slider<br>- Category chips<br>- Condition checkboxes<br>- Date range picker<br>- Location autocomplete<br>- Apply/Reset buttons |
| **Priorità** | | | 🔴 ALTA | Filtri sono core per UX explore |

### 14.5 MobileListingsBottomSheet

| Campo | Web | Mobile | Stato | Gap |
|-------|-----|--------|-------|-----|
| **Component** | `MobileListingsBottomSheet.tsx` | N/A | ❌ MISSING | |
| **Funzionalità mancanti** | | | | - Swipeable sheet sopra mappa<br>- Horizontal scroll listings |
| **Note** | | | | Richiede MapView implementato |
| **Priorità** | | | 🟡 MEDIA | Nice-to-have se c'è mappa |

### 14.6 MobileInspectionSheet

| Campo | Web | Mobile | Stato | Gap |
|-------|-----|--------|-------|-----|
| **Component** | `MobileInspectionSheet.tsx` | N/A (copiato ma non usato) | ⚠️ PARTIAL | |
| **Funzionalità mancanti** | | | | - Trigger da MobileInspectionCTA (non esiste in RentalsScreen)<br>- Navigate to inspection page (inspection page non esiste) |
| **Priorità** | | | 🟠 MEDIA-ALTA | Dipende da inspection implementation |

### 14.7 NativePaymentSheet

| Campo | Web | Mobile | Stato | Gap |
|-------|-----|--------|-------|-----|
| **Component** | N/A (web usa Stripe Elements embedded) | `NativePaymentSheet.tsx` | ✅ | |
| **Note** | | | | Mobile-only component per Stripe native payment - OK |

---

## 15. LAYOUT & NAVIGATION

### 15.1 MobileBottomNav

| Campo | Web | Mobile | Stato | Gap |
|-------|-----|--------|-------|-----|
| **Component** | `MobileBottomNav.tsx` | `MobileBottomNav.tsx` | ⚠️ PARTIAL | |
| **Funzionalità web** | Tabs: Explore, Messages, Rentals (switch renter/owner), Profile | | | |
| **Funzionalità mobile** | Tabs: Explore, Favorites, Messages, Rentals, Profile | | | |
| **Gap** | | | | - Favorites tab presente in mobile ma non in web (OK, feature aggiuntiva mobile)<br>- RoleMode switch (renter/owner) assente in mobile<br>- Badge notifiche assenti in mobile |
| **Priorità** | | | 🟡 MEDIA | RoleMode switch importante se owner dashboard implementato |

### 15.2 ExploreHeader

| Campo | Web | Mobile | Stato | Gap |
|-------|-----|--------|-------|-----|
| **Component** | `ExploreHeader.tsx` (web) | `MobileHeader.tsx` (mobile) | ⚠️ | |
| **Gap** | | | | - Language selector assente<br>- Theme toggle assente<br>- User menu dropdown assente (mobile usa ProfileScreen) |
| **Priorità** | | | 🟢 BASSA | Mobile ha UI diversa, OK |

### 15.3 DashboardLayout

| Campo | Web | Mobile | Stato | Gap |
|-------|-----|--------|-------|-----|
| **Component** | `DashboardLayout.tsx` (web) | `AppLayout.tsx` (mobile) | ⚠️ | |
| **Gap** | | | | - Sidebar (desktop) non applicabile mobile<br>- Layout structure diversa ma OK |
| **Priorità** | | | ✅ OK | Differenze architetturali accettabili |

---

## 16. HOOKS & UTILITIES (Gap Critici)

| Hook/Util | Web | Mobile | Stato | Gap | Priorità |
|-----------|-----|--------|-------|-----|----------|
| `useBookingRequests` | ✅ | ✅ | ✅ | Presente | - |
| `useActiveRentals` | ✅ | ✅ | ⚠️ | Presente ma da verificare parity | 🟡 |
| `useVerification` | ✅ | ❌ | ❌ | MANCANTE | 🟠 |
| `useRoleMode` | ✅ | ❌ | ❌ | MANCANTE (critico per owner) | 🔴 |
| `useMediaQuery` | ✅ | ❌ | ❌ | Non necessario (sempre mobile) | ✅ |
| `useDebounce` | ✅ | ❌ | ❌ | Utile per search | 🟡 |
| `useQueryState` (nuqs) | ✅ | ❌ | ❌ | Filter state persistence | 🟠 |
| `usePrefetchData` | ✅ | ❌ | ❌ | Performance optimization | 🟢 |
| `fetchListings` service | ✅ | ⚠️ | ⚠️ | Parziale (no filtri avanzati) | 🟠 |
| `payment` utils | ✅ | ⚠️ | ⚠️ | Da verificare | 🔴 |
| `verification` utils | ✅ | ❌ | ❌ | MANCANTE | 🟠 |

---

## PRIORITÀ PORTING (Top 10 Gap Critici)

| # | Pagina/Feature | Impatto Business | Priorità | Effort |
|---|----------------|------------------|----------|--------|
| 1 | **Owner Dashboard completo** | 🔴 BLOCKING: owner non può gestire business | 🔴 P0 | XL |
| 2 | **BookingForm in Equipment Detail** | 🔴 BLOCKING: renter non può prenotare | 🔴 P0 | L |
| 3 | **Inspection Flow completo** (pickup/return) | 🔴 BLOCKING: deposit refund broken | 🔴 P0 | L |
| 4 | **Active Rental Page** | 🔴 BLOCKING: user non gestisce rental attivo | 🔴 P0 | M |
| 5 | **FiltersSheet in Explore** | 🟠 HIGH: UX search degradata | 🟠 P1 | M |
| 6 | **Payment Confirmation completo** | 🟠 HIGH: confusione post-payment | 🟠 P1 | M |
| 7 | **Renter Dashboard completo** | 🟠 HIGH: hub principale incompleto | 🟠 P1 | L |
| 8 | **Claims Flow** (file, review, manage) | 🟡 MEDIUM: owner protection assente | 🟡 P2 | L |
| 9 | **Verification Page** | 🟡 MEDIUM: trust/safety feature | 🟡 P2 | M |
| 10 | **Settings completo** (profile, notifications) | 🟡 MEDIUM: user control limitato | 🟡 P2 | S |

---

## RACCOMANDAZIONI STRATEGICHE

### 1. MVP Assoluto (P0 - BLOCKING)
Senza questi, l'app non è funzionale:
- Owner Dashboard (con EquipmentManagement + booking approval)
- BookingForm inline in EquipmentDetailScreen
- Inspection Flow (pickup + return)
- Active Rental Page con quick actions

**Stima:** 3-4 settimane (2 dev)

### 2. Feature Parity Core (P1 - HIGH)
Per UX comparabile a web mobile:
- FiltersSheet con tutti i filtri
- Renter Dashboard completo con tabs
- Payment Confirmation con polling + next steps
- Messaging completo con real-time

**Stima:** 2-3 settimane (2 dev)

### 3. Safety & Trust (P2 - MEDIUM)
Per sicurezza transazioni:
- Claims Flow completo
- Verification Page con document upload
- Payments Page (transaction history)

**Stima:** 2-3 settimane (1 dev)

### 4. Polish & Settings (P3 - LOW)
- Profile Settings edit
- Notifications Settings
- Support Page
- Home Page con marketing content

**Stima:** 1-2 settimane (1 dev)

---

## NOTE FINALI

1. **Architettura diversa OK**: Modal vs Screen è accettabile (es. LoginModal web → LoginScreen mobile)
2. **Feature additions mobile**: Favorites tab in mobile è un plus, non un gap
3. **Deep links**: Gestiti diversamente ma OK (useDeepLinks hook in mobile)
4. **Capacitor plugins**: NativePaymentSheet, Camera, Storage devono essere integrati nei componenti portati
5. **i18n**: Web usa react-i18next, mobile ha cartella i18n ma da verificare setup
6. **Testing**: Nessun test trovato in mobile app (gap QA)

**TOTALE EFFORT STIMA PER PARITY COMPLETA: 8-12 settimane (2 dev full-time)**

---

*Report generato il 14 Gennaio 2026 - Baseline: Web Mobile App v1.0*
