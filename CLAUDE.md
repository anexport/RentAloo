# CLAUDE.md - AI Assistant Guide for Vaymo

Comprehensive guidance for AI assistants working on the Vaymo peer-to-peer rental marketplace.

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [Directory Structure](#directory-structure)
4. [Code Conventions](#code-conventions)
5. [Key Features](#key-features)
6. [Database Schema](#database-schema)
7. [Development Workflow](#development-workflow)
8. [Important Considerations](#important-considerations)

---

## Project Overview

**Vaymo** is a peer-to-peer rental marketplace enabling users to rent and lend equipment across various categories.

### Core Features
- **Dual User Roles**: Renter and owner experiences with role-specific dashboards and mode switching
- **Equipment Management**: Full CRUD for listings with photos, availability, and drag-and-drop reordering
- **Smart Booking System**: Request-based booking with availability checking and active rental tracking
- **Secure Payments**: Stripe integration with escrow system and deposit management
- **Real-time Messaging**: Supabase Realtime for instant communication
- **Reviews & Ratings**: Comprehensive review system
- **Location-based Search**: Geographic search with map integration
- **Identity Verification**: Multi-step verification for trust and safety
- **Responsive Design**: Mobile-first approach
- **Damage Claims & Disputes**: Full claims workflow with evidence and resolution
- **Equipment Inspections**: Pickup/return inspections with checklists and signatures
- **Notifications**: Real-time notification system with preferences and quiet hours
- **Multi-language Support**: i18n with 5 languages (EN, ES, FR, DE, IT)
- **Admin Dashboard**: Platform management and moderation tools

---

## Architecture & Tech Stack

**Frontend:**
- React 19.1.1, TypeScript 5.9.3 (strict mode), Vite 7.1.7, Node.js 22.x

**UI & Styling:**
- Tailwind CSS 4.1.16 (v4 with `@theme` syntax)
- Shadcn UI (New York variant), Radix UI, Lucide React
- CVA (Class Variance Authority), OKLCH color space

**Backend & Database:**
- Supabase 2.87.1 (PostgreSQL, RLS, Auth, Realtime, Storage)
- Auto-generated TypeScript types from schema

**State & Forms:**
- TanStack React Query 5.90.5, React Context API
- React Hook Form 7.65.0, Zod 4.1.12

**Key Libraries:**
- React Router DOM 7.9.4, Stripe, date-fns 4.1.0, Axios 1.13.0
- i18next + react-i18next (multi-language support)
- @dnd-kit (drag-and-drop for photo reordering)
- @vercel/analytics (analytics integration)

**Testing:**
- Vitest 4.0.4, React Testing Library 16.3.0

---

## Directory Structure

### Root Structure
```
vaymo/
├── src/                     # Source code
├── supabase/                # Database migrations & edge functions
├── public/                  # Static assets
├── CLAUDE.md                # This file
├── README.md                # User documentation
├── package.json             # Dependencies
├── vite.config.ts           # Vite config
└── tsconfig.json            # TypeScript config
```

### src/ Structure (Feature-Based Organization)
```
src/
├── components/              # Feature-based components (200+ files)
│   ├── admin/               # Admin dashboard components
│   ├── auth/                # LoginModal, SignupModal, signup forms
│   ├── booking/             # BookingSidebar, date selection, pricing
│   ├── claims/              # Damage claims filing and resolution
│   ├── equipment/           # ListingCard, detail dialogs, services/
│   ├── explore/             # Search, filters, map
│   ├── inspection/          # Equipment inspection workflows
│   ├── messaging/           # Real-time chat components
│   ├── notifications/       # NotificationBell, Panel, preferences
│   ├── owner/               # Owner-specific components
│   ├── payment/             # Stripe integration, escrow
│   ├── renter/              # Renter-specific components
│   ├── reviews/             # Review forms and display
│   ├── verification/        # Identity verification
│   └── ui/                  # Shadcn UI primitives (40+ components)
├── config/                  # App configuration (breakpoints, pagination)
├── contexts/                # React Context providers
├── features/                # Self-contained feature modules
├── hooks/                   # Custom React hooks (27+ hooks)
│   └── booking/             # Booking-specific hooks
├── i18n/                    # Internationalization
│   ├── config.ts            # i18next configuration
│   └── locales/             # Language files (en, es, fr, de, it)
├── lib/                     # Utilities & API clients
├── pages/                   # Route-level components (30+ pages)
│   ├── admin/               # Admin pages
│   ├── claims/              # Claim management pages
│   ├── inspection/          # Inspection pages
│   ├── owner/               # Owner dashboard pages
│   ├── renter/              # Renter dashboard pages
│   └── settings/            # Settings pages
├── types/                   # TypeScript definitions (7 files)
├── App.tsx                  # Main app with routing
└── main.tsx                 # Entry point
```

**Key Principles:**
- Feature-based organization (components grouped by domain)
- NO barrel exports - import directly from file paths
- Service layer for data fetching (e.g., `equipment/services/listings.ts`)
- Clear separation: UI primitives vs feature components
- Role-specific components in dedicated directories (owner/, renter/)

---

## Code Conventions

### Naming
- **Files**: Components `PascalCase.tsx`, Hooks `useHook.ts`, Utils `camelCase.ts`
- **Components**: Default export, PascalCase
- **Props**: `ComponentNameProps`
- **Handlers**: `handle` prefix (`handleSubmit`, `handleClick`)
- **Booleans**: `is/has/show` prefix (`isLoading`, `hasData`)
- **Constants**: `SCREAMING_SNAKE_CASE`

### Imports
**Always use path aliases:**
```typescript
// ✅ CORRECT
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import type { Database } from "@/lib/database.types"

// ❌ WRONG
import { Button } from "../../components/ui/button"
```

### TypeScript Patterns
```typescript
// Extract types from Supabase schema
export type BookingStatus = Database["public"]["Tables"]["booking_requests"]["Row"]["status"]

// Zod validation
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})
type FormData = z.infer<typeof schema>

// Function types
export const fetchListings = async (filters: ListingsFilters = {}): Promise<Listing[]> => { }
```

### Component Structure
```typescript
type ComponentProps = {
  data: DataType
  onSelect?: (id: string) => void
}

export default function Component({ data, onSelect }: ComponentProps) {
  if (!data) return null

  const handleClick = () => onSelect?.(data.id)

  return <div onClick={handleClick}>{/* JSX */}</div>
}
```

### State Management
- **Global state**: React Context (`AuthContext`, `ThemeContext`, `RoleModeContext`)
- **Server state**: React Query with 5min stale time
- **Forms**: React Hook Form + Zod
- **URL state**: `useSearchParams`

### Supabase Patterns
```typescript
// Query with relations
const { data, error } = await supabase
  .from("equipment")
  .select(`*, category:categories(*), photos:equipment_photos(*)`)
  .eq("is_available", true)

// Prevent N+1
const ownerIds = [...new Set(listings.map(l => l.owner?.id).filter(Boolean))]
const { data: reviews } = await supabase.from("reviews").select("*").in("reviewee_id", ownerIds)

// Realtime
useEffect(() => {
  const channel = supabase
    .channel('messages')
    .on('postgres_changes', { event: 'INSERT', table: 'messages' }, handleNew)
    .subscribe()
  return () => supabase.removeChannel(channel)
}, [])
```

### Styling
```typescript
// Tailwind with cn() helper
import { cn } from "@/lib/utils"
<button className={cn("base-classes", variant === "primary" && "variant-classes", className)}>

// CVA for variants
const buttonVariants = cva("base-classes", {
  variants: {
    variant: { default: "...", outline: "..." },
    size: { default: "...", sm: "..." }
  },
  defaultVariants: { variant: "default", size: "default" }
})
```

---

## Key Features

### Authentication (`/components/auth`)
- Email/Password + OAuth (Google, GitHub, Facebook, Twitter)
- Dual roles (renter/owner) in user metadata
- Multi-step registration: 3-step (renter), 4-step (owner)
- Modal-based flows (see `SIGNUP_MODAL_TRANSFORMATION_PLAN.md`)
- Onboarding completion tracking via RPC

**Key Files:** `AuthContext.tsx`, `LoginModal.tsx`, `SignupModal.tsx`, signup forms

### Role Mode Switching (`/contexts/RoleModeContext.tsx`)
- Dual-role users can switch between renter and owner views
- Mode persisted to localStorage and synced with URL path
- Tracks `isAlsoOwner` status for UI adaptation

### Equipment Management (`/components/equipment`)
- Listing cards with photo carousels, pricing, ratings
- Detail dialogs with tabbed interface
- CRUD operations with availability calendar
- Drag-and-drop photo reordering (@dnd-kit)
- Service layer: `equipment/services/listings.ts`
- N+1 prevention via batch queries

### Booking System (`/components/booking`)
- Request flow: Renter requests → Owner approves → Payment → Completion
- Real-time availability checking against `availability_calendar`
- Dynamic pricing calculator
- Active rental tracking with countdown timers
- Status: Pending → Approved → Completed → Reviewed

**Workflow:**
1. Renter selects dates
2. System checks availability
3. Pricing calculated (daily_rate × days)
4. Booking request created (status: pending)
5. Owner approves/declines
6. If approved: Booking created, payment initiated
7. Pickup inspection performed
8. Active rental period with countdown
9. Return inspection performed
10. After completion: Review flow (or claims if damage)

### Equipment Inspections (`/components/inspection`)
- Pickup and return inspection workflows
- Condition checklists with item-by-item verification
- Photo capture for equipment state documentation
- Digital signature pad for confirmation
- Multi-step inspection wizard
- Inspection history view

**Key Files:** `InspectionWizard.tsx`, `ConditionChecklist.tsx`, `PhotoCapture.tsx`, `SignaturePad.tsx`

### Damage Claims (`/components/claims`)
- File damage claims with evidence photos
- Upload repair quotes and documentation
- Owner response workflow (accept, dispute, negotiate)
- Claims resolution with deposit/insurance deduction
- Claims listing for owners

**Key Files:** `ClaimFilingForm.tsx`, `ClaimResponseForm.tsx`, `EvidencePhotoUpload.tsx`, `RepairQuoteUpload.tsx`

### Notifications (`/components/notifications`)
- Real-time notification system with 16+ notification types
- Priority levels: low, medium, high, critical
- Notification preferences per category
- Quiet hours support
- Toast notifications with user preference respect
- Unread counts with real-time updates

**Key Files:** `NotificationBell.tsx`, `NotificationPanel.tsx`, `NotificationItem.tsx`
**Settings:** `/pages/settings/NotificationsSettings.tsx`

### Messaging (`/components/messaging`)
- Real-time chat with Supabase Realtime subscriptions
- Typing indicators, online status (presence tracking)
- Unread counts via RPC function
- System messages for booking updates

**Tables:** `conversations`, `conversation_participants`, `messages`

### Payments (`/components/payment`, `/lib/stripe.ts`)
- Stripe Elements for card input
- Escrow system: funds held until completion
- Deposit management for damage protection
- Edge functions: `create-payment-intent`, `stripe-webhook`, `process-refund`

**Flow:** Booking approved → Payment intent → Stripe checkout → Webhook confirmation → Escrow hold → Completion → Release to owner

### Reviews & Ratings (`/components/reviews`)
- 1-5 star system with text comments
- Dual reviews: equipment + user reviews
- Aggregate stats calculations

### Verification (`/components/verification`)
- Document upload (ID verification via Supabase Storage)
- Phone verification, trust score
- Verification badges

### Location Services (`/features/location`)
- Geocoding (address ↔ coordinates)
- Google Places autocomplete
- Browser geolocation API
- Provider abstraction pattern

### Favorites/Saved Equipment (`/hooks/useFavorites.ts`, `/hooks/useSavedEquipment.ts`)
- Users can save/favorite equipment listings
- Dedicated saved equipment tab in renter dashboard
- Persistent favorites across sessions

### Admin Dashboard (`/components/admin`, `/pages/admin`)
- Admin role with security hardening
- Admin route protection with access verification
- Platform management capabilities
- Service layer for admin operations

**Key Files:** `AdminRoute` component in App.tsx, `/components/admin/services/`

### Internationalization (`/src/i18n`)
- 5 languages: English (en), Spanish (es), French (fr), German (de), Italian (it)
- Browser language detection with localStorage override
- 11 translation namespaces per language:
  - common, auth, navigation, equipment, booking
  - messaging, payment, reviews, verification, marketing, dashboard

**Key Files:** `i18n/config.ts`, `i18n/locales/{lang}/*.json`
**Component:** `LanguageSelector.tsx`

---

## Database Schema

**Statistics:** 21+ profiles, 23 categories, 15+ equipment listings, 51 migrations

### Core Tables Overview

| Table | Purpose | Key Fields | RLS |
|-------|---------|------------|-----|
| `profiles` | Base user info | email, role (enum), verification flags (booleans), timestamps | ✅ |
| `renter_profiles` | Renter-specific data | profile_id, preferences (JSONB), experience_level | ✅ |
| `owner_profiles` | Owner-specific data | profile_id, business_info (JSONB), earnings_total | ✅ |
| `categories` | Equipment categories | name, parent_id (self-ref), sport_type, attributes (JSONB) | ✅ |
| `equipment` | Listings | owner_id, category_id, title, daily_rate, condition (enum), location, lat/lng | ✅ |
| `equipment_photos` | Listing images | equipment_id, photo_url, is_primary, order_index | ✅ |
| `availability_calendar` | Date availability | equipment_id, date, is_available, custom_rate | ✅ |
| `booking_requests` | Rental requests | equipment_id, renter_id, dates, total_amount, status (enum) | ✅ |
| `bookings` | Confirmed bookings | booking_request_id (1:1), payment_status, pickup_method | ✅ |
| `reviews` | User reviews | booking_id, reviewer_id, reviewee_id, rating (1-5), comment | ✅ |
| `conversations` | Message threads | booking_request_id, participants (UUID[]) | ✅ |
| `conversation_participants` | Conversation members | conversation_id, profile_id, last_read_at | ✅ |
| `messages` | Chat messages | conversation_id, sender_id, content, message_type | ✅ |
| `payments` | Payment transactions | booking_request_id, stripe_payment_intent_id, amounts, escrow_status, payout_status | ✅ |
| `booking_history` | Audit trail | booking_request_id, status changes, changed_by, metadata | ✅ |
| `user_verifications` | Identity verification | user_id, verification_type, status, document_url | ✅ |
| `notifications` | User notifications | user_id, type (enum), priority, title, body, read_at, data (JSONB) | ✅ |
| `notification_preferences` | User notification settings | user_id, preferences per type, quiet_hours, toast_enabled | ✅ |
| `user_favorites` | Saved equipment | user_id, equipment_id, created_at | ✅ |
| `equipment_inspections` | Inspection records | booking_id, type (pickup/return), checklist, photos, signature | ✅ |
| `damage_claims` | Damage claims | booking_id, status, evidence_photos, repair_quotes, resolution | ✅ |
| `content_translations` | Multi-language content | content_key, language_code, translation | ✅ |

### Custom Enums
```sql
user_role: 'renter' | 'owner'
equipment_condition: 'new' | 'excellent' | 'good' | 'fair'
booking_status: 'pending' | 'approved' | 'declined' | 'cancelled' | 'completed'
notification_type: 'booking_request' | 'booking_approved' | 'booking_declined' | 'message_received' | ... (16+ types)
notification_priority: 'low' | 'medium' | 'high' | 'critical'
claim_status: 'pending' | 'under_review' | 'accepted' | 'disputed' | 'resolved'
inspection_type: 'pickup' | 'return'
```

**Note:** Verification is tracked using boolean flags in the `profiles` table (`identity_verified`, `phone_verified`, `email_verified`, `address_verified`).

### Key Relationships
1. `auth.users` → `profiles` → `renter_profiles` OR `owner_profiles`
2. `profiles` (owner) → `equipment` → `equipment_photos` + `availability_calendar`
3. `booking_requests` → `bookings` (1:1) → `reviews`
4. `bookings` → `equipment_inspections` (pickup + return)
5. `bookings` → `damage_claims` (if damage reported)
6. `conversations` ↔ `conversation_participants` (M:N) → `messages`
7. `booking_requests` → `payments` (Stripe escrow)
8. `profiles` → `notifications` + `notification_preferences`
9. `profiles` → `user_favorites` → `equipment`

### RLS Policies (70+ total across 16+ tables)
- **profiles**: Auth users view all, update own
- **equipment**: Anonymous view available, owners CRUD own
- **booking_requests**: Users view own requests OR requests for their equipment
- **payments**: Users view payments where they are renter OR owner
- **messages**: Users view/send only in their conversations
- **notifications**: Users view/manage only their own
- **damage_claims**: Users view claims where they are renter OR owner
- **admin**: Escalation prevention policies for admin role

### Database Functions & Triggers
- **RPC**: `get_unread_messages_count(user_uuid)` - Returns unread message count
- **RPC**: `check_onboarding_completion(user_uuid)` - Returns onboarding status
- **Triggers**:
  - Profile creation on signup
  - Booking approval automation
  - Cancellation handling
  - Payment status sync
  - Notification auto-creation on events (booking, message, claim, etc.)

### Extensions
- Core: `uuid-ossp`, `pgcrypto`, `postgis`
- Supabase: `supabase_vault`, `pg_graphql`
- Performance: `pg_stat_statements`, `hypopg`, `index_advisor`

### Storage Buckets
- `equipment-photos` (public) - Listing images
- `verification-documents` (private) - ID uploads
- `inspection-photos` (private) - Inspection documentation
- `claim-evidence` (private) - Damage claim evidence

### Type Generation
```bash
# Via MCP
mcp__supabase__generate_typescript_types()

# Via CLI
npx supabase gen types typescript --project-id ID > src/lib/database.types.ts
```

**⚠️ Always regenerate types after schema changes**

---

## Development Workflow

### Environment Variables
```env
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
VITE_STRIPE_PUBLISHABLE_KEY=your_key
VITE_GOOGLE_MAPS_API_KEY=your_key  # Optional
```

### Commands
| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server at localhost:5173 |
| `npm run build` | Production build to /dist |
| `npm run test` | Run tests once |
| `npm run test:watch` | Tests in watch mode |

### Git Workflow
**Branches:**
- Features: `feature/feature-name`
- Fixes: `fix/bug-description`
- Docs: `docs/update-name`
- Claude: `claude/session-id`

**Commits:** Follow conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`)

**Flow:** Branch → Changes → Tests → TypeScript check → Commit → Push → PR

### Code Quality
```bash
npx tsc --noEmit        # Type check
npx eslint .            # Lint
npx eslint . --fix      # Auto-fix
```

---

## Important Considerations

### Critical Rules
1. **Always use path aliases** (`@/`) not relative imports
2. **Type safety**: Define types for props, functions, state
3. **Extract types from Database** for Supabase tables
4. **Check Supabase errors**: Always handle `error` in responses
5. **RLS policies**: Never bypass, use for authorization
6. **Prevent N+1 queries**: Batch fetch related data
7. **Use React Query** for server state caching
8. **Validate input**: Client AND server (Zod schemas)
9. **Regenerate database types** after schema changes
10. **Test before committing**: Types, linting, tests
11. **Use translations**: All user-facing strings via i18next `t()` function
12. **Role mode awareness**: Check `RoleModeContext` for current user mode

### Common Pitfalls
- ❌ Barrel exports (`index.ts`) - Import directly
- ❌ Relative imports - Use `@/` alias
- ❌ Ignoring Supabase errors
- ❌ Skipping validation
- ❌ Creating new state management unnecessarily
- ❌ Hardcoding config - Use env vars
- ❌ Committing secrets
- ❌ Breaking RLS policies
- ❌ Hardcoding strings - Use i18n translations
- ❌ Ignoring role mode context in dual-role features

### Quick Reference
**Need to...**
- Auth logic → `src/contexts/AuthContext.tsx`, `src/components/auth/`
- Role switching → `src/contexts/RoleModeContext.tsx`
- Fetch listings → `src/components/equipment/services/listings.ts`
- UI component → `src/components/ui/`
- Custom hook → `src/hooks/`
- Utility → `src/lib/utils.ts`
- Types → `src/types/` or extract from `database.types.ts`
- New page → `src/pages/` + route in `App.tsx`
- Database changes → `supabase/migrations/`
- Payment logic → `src/lib/stripe.ts`, `src/components/payment/`
- Messaging → `src/components/messaging/`, `src/hooks/useMessaging.ts`
- Notifications → `src/components/notifications/`, `src/hooks/useNotifications.ts`
- Claims → `src/components/claims/`, `src/types/claim.ts`
- Inspections → `src/components/inspection/`, `src/types/inspection.ts`
- Translations → `src/i18n/locales/{lang}/{namespace}.json`
- Admin features → `src/components/admin/`, `src/pages/admin/`

### Type Files Reference
| File | Purpose |
|------|---------|
| `types/claim.ts` | Damage claim types, status enums, form data |
| `types/inspection.ts` | Inspection types, checklists, condition enums |
| `types/notification.ts` | 16+ notification types, preferences, utilities |
| `types/rental.ts` | Active/completed rental types, countdown utilities |
| `types/search.ts` | Search filter types |
| `database.types.ts` | Auto-generated Supabase types |

### Key Hooks Reference
| Hook | Purpose |
|------|---------|
| `useAuth` | Authentication state and methods |
| `useActiveRental` | Fetch active rental with inspection data |
| `useAdminAccess` | Check admin authorization |
| `useFavorites` | Manage saved/favorited equipment |
| `useNotifications` | Fetch and manage notifications |
| `useNotificationPreferences` | User notification preferences |
| `useOnboardingCheck` | Check onboarding completion |
| `useOwnerClaims` | Fetch owner's damage claims |
| `useSavedEquipment` | Manage saved equipment list |
| `useUnreadCounts` | Real-time unread message/notification counts |
| `useEquipmentAvailability` | Check equipment availability |
| `useDateRangePicker` | Date range selection for bookings |

### Testing
- **Vitest** with jsdom environment
- Component tests with React Testing Library
- Hook tests with `renderHook`
- See `README.md` for manual testing checklist

---

## Resources

**Internal:**
- `README.md` - Setup and usage
- `SIGNUP_MODAL_TRANSFORMATION_PLAN.md` - Auth modal architecture
- `supabase/guides/` - RLS, Realtime, Edge Functions

**External:**
- [React](https://react.dev), [TypeScript](https://typescriptlang.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs), [Shadcn UI](https://ui.shadcn.com)
- [Supabase](https://supabase.com/docs), [React Hook Form](https://react-hook-form.com)
- [Zod](https://zod.dev), [TanStack Query](https://tanstack.com/query/latest)
- [i18next](https://www.i18next.com/), [react-i18next](https://react.i18next.com/)

---

**Last Updated:** 2026-01-10
