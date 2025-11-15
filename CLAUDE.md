# CLAUDE.md - AI Assistant Guide for RentAloo

This document provides comprehensive guidance for AI assistants working on the RentAloo peer-to-peer rental marketplace codebase.

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [Directory Structure](#directory-structure)
4. [Code Conventions & Patterns](#code-conventions--patterns)
5. [Development Workflow](#development-workflow)
6. [Key Features & Modules](#key-features--modules)
7. [Database Schema](#database-schema)
8. [Testing Guidelines](#testing-guidelines)
9. [Common Tasks](#common-tasks)
10. [Important Considerations](#important-considerations)

---

## Project Overview

**RentAloo** is a modern peer-to-peer rental marketplace platform that enables users to rent and lend equipment across various categories (skiing, photography, camping, construction, etc.).

### Core Features
- **Dual User Roles**: Separate renter and owner experiences with role-specific dashboards
- **Equipment Management**: Full CRUD for equipment listings with photos and availability
- **Smart Booking System**: Request-based booking with availability checking and pricing
- **Secure Payments**: Stripe integration with escrow system
- **Real-time Messaging**: Supabase Realtime for instant communication
- **Reviews & Ratings**: Comprehensive review system with aggregate ratings
- **Location-based Search**: Geographic search with map integration
- **Identity Verification**: Multi-step verification for trust and safety
- **Responsive Design**: Mobile-first approach with adaptive layouts

---

## Architecture & Tech Stack

### Frontend
- **React**: 19.1.1 (latest)
- **TypeScript**: 5.9.3 (strict mode enabled)
- **Vite**: 7.1.7 (build tool & dev server)
- **Node.js**: 22.x (required)

### UI & Styling
- **Tailwind CSS**: 4.1.16 (v4 with new `@theme` syntax)
- **Shadcn UI**: Component library (New York variant)
- **Radix UI**: Headless primitives for accessibility
- **Lucide React**: Icon library
- **CVA (Class Variance Authority)**: Variant management
- **OKLCH Color Space**: Modern perceptual colors for theming

### Backend & Database
- **Supabase**: 2.76.1
  - PostgreSQL database
  - Row Level Security (RLS)
  - Authentication (email/password + OAuth)
  - Realtime subscriptions
  - Storage for images/documents
- **Auto-generated Types**: TypeScript types from Supabase schema

### State Management
- **TanStack React Query**: 5.90.5 (server state, caching)
- **React Context API**: Global state (auth, theme)
- **Custom Hooks**: Domain-specific logic encapsulation

### Forms & Validation
- **React Hook Form**: 7.65.0 (form state)
- **Zod**: 4.1.12 (schema validation)
- **@hookform/resolvers**: Integration layer

### Other Key Libraries
- **React Router DOM**: 7.9.4 (routing)
- **Stripe**: Payment processing (@stripe/stripe-js, @stripe/react-stripe-js)
- **date-fns**: 4.1.0 (date manipulation)
- **react-day-picker**: 9.11.1 (date selection)
- **Axios**: 1.13.0 (HTTP client)
- **Google Maps**: Location services integration

### Testing
- **Vitest**: 4.0.4 (test runner)
- **React Testing Library**: 16.3.0
- **jsdom**: 27.0.1 (DOM simulation)
- **@testing-library/user-event**: User interaction testing

### Code Quality
- **ESLint**: 9.36.0 with TypeScript plugin
- **TypeScript ESLint**: 8.45.0
- **React Hooks ESLint**: Enforces hooks rules

---

## Directory Structure

```
rentaloo-ai/
├── .braingrid/              # Braingrid editor config
├── .cursor/                 # Cursor editor config (MCP)
├── .git/                    # Git repository
├── public/                  # Static assets
├── src/                     # Source code (see detailed structure below)
├── supabase/                # Database migrations & functions
│   ├── functions/           # Edge functions (payment, webhooks)
│   ├── guides/              # Documentation (RLS, Realtime, Functions)
│   ├── migrations/          # Database migration SQL files (22+ files)
│   ├── seed.sql             # Base seed data
│   ├── seed_categories.sql  # Equipment categories
│   └── seed_example_data.sql # Example listings and users
├── .gitignore
├── CLAUDE.md                # This file
├── README.md                # User-facing documentation
├── SIGNUP_MODAL_TRANSFORMATION_PLAN.md  # Detailed auth modal plan
├── components.json          # Shadcn config
├── eslint.config.js         # ESLint configuration
├── index.html               # HTML entry point
├── package.json             # Dependencies & scripts
├── postcss.config.js        # PostCSS (Tailwind)
├── tsconfig.json            # TypeScript config (composite)
├── tsconfig.app.json        # App-specific TS config
├── tsconfig.node.json       # Build tools TS config
├── vite.config.ts           # Vite configuration
└── vitest.config.ts         # Vitest test configuration
```

### src/ Directory Structure (171 TypeScript files)

```
src/
├── assets/                  # Images, icons, static resources
├── components/              # React components (FEATURE-BASED organization)
│   ├── auth/                # Authentication components
│   │   ├── LoginModal.tsx
│   │   ├── SignupModal.tsx
│   │   ├── OwnerSignupForm.tsx
│   │   └── RenterSignupForm.tsx
│   ├── booking/             # Booking system components
│   │   ├── sidebar/         # Booking sidebar sub-components
│   │   │   ├── BookingButton.tsx
│   │   │   ├── DateSelector.tsx
│   │   │   ├── LocationContact.tsx
│   │   │   ├── PricingBreakdown.tsx
│   │   │   └── PricingHeader.tsx
│   │   ├── AvailabilityIndicatorCalendar.tsx
│   │   ├── BookingRequestCard.tsx
│   │   ├── BookingSidebar.tsx
│   │   └── FloatingBookingCTA.tsx
│   ├── equipment/           # Equipment listing components
│   │   ├── detail/          # Equipment detail dialog components
│   │   ├── services/        # Data fetching service layer
│   │   │   └── listings.ts
│   │   ├── ListingCard.tsx
│   │   └── ListingCardSkeleton.tsx
│   ├── explore/             # Search & filtering
│   │   ├── CategoryBar.tsx
│   │   ├── FiltersSheet.tsx
│   │   ├── LocationCombobox.tsx
│   │   ├── MapView.tsx
│   │   └── SearchBar.tsx
│   ├── layout/              # Page layout components
│   │   ├── BreadcrumbNav.tsx
│   │   ├── DashboardLayout.tsx
│   │   ├── ExploreHeader.tsx
│   │   └── Sidebar.tsx
│   ├── messaging/           # Real-time messaging
│   │   ├── shared/
│   │   ├── ConversationList.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── MessageInput.tsx
│   │   └── TypingIndicator.tsx
│   ├── payment/             # Payment & escrow
│   │   ├── EscrowDashboard.tsx
│   │   ├── PaymentForm.tsx
│   │   ├── PaymentModal.tsx
│   │   └── TransactionHistory.tsx
│   ├── renter/              # Renter dashboard components
│   │   ├── NotificationsPanel.tsx
│   │   ├── QuickActions.tsx
│   │   └── StatsOverview.tsx
│   ├── reviews/             # Review system
│   │   ├── ReviewCard.tsx
│   │   ├── ReviewForm.tsx
│   │   ├── ReviewList.tsx
│   │   └── StarRating.tsx
│   ├── ui/                  # Shadcn UI primitives (40+ components)
│   │   ├── accordion.tsx
│   │   ├── button.tsx
│   │   ├── button-variants.ts
│   │   ├── dialog.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── toast.tsx
│   │   └── ... (30+ more)
│   ├── verification/        # Identity verification
│   │   ├── DocumentUpload.tsx
│   │   ├── PhoneVerification.tsx
│   │   └── VerificationBadge.tsx
│   ├── AvailabilityCalendar.tsx
│   ├── EquipmentListingForm.tsx
│   ├── ThemeToggle.tsx
│   └── UserMenu.tsx
├── config/                  # Configuration constants
│   └── breakpoints.ts
├── contexts/                # React Context providers
│   ├── AuthContext.tsx      # Authentication state
│   ├── ThemeContext.tsx     # Theme management
│   └── useTheme.ts
├── features/                # Feature modules (self-contained)
│   └── location/            # Location services
│       ├── providers/
│       │   └── google.ts
│       ├── forwardGeocoding.ts
│       ├── geocoding.ts
│       ├── useAddressAutocomplete.ts
│       └── useGeolocation.ts
├── hooks/                   # Custom React hooks
│   ├── booking/
│   │   ├── useDateRangePicker.ts
│   │   └── useEquipmentAvailability.ts
│   ├── useAuth.ts
│   ├── useBookingRequests.ts
│   ├── useMediaQuery.ts
│   ├── useMessaging.ts
│   ├── usePayment.ts
│   ├── usePresence.ts
│   ├── useReviews.ts
│   └── useVerification.ts
├── lib/                     # Utilities & API clients
│   ├── booking.ts           # Booking utilities
│   ├── categoryIcons.ts     # Category icon mapping
│   ├── database.types.ts    # Auto-generated Supabase types
│   ├── googleMapsLoader.ts  # Google Maps initialization
│   ├── payment.ts           # Payment utilities
│   ├── reviews.ts           # Review calculations
│   ├── stripe.ts            # Stripe client
│   ├── supabase.ts          # Supabase client initialization
│   ├── utils.ts             # General utilities (cn, formatters)
│   └── verification.ts      # Verification helpers
├── pages/                   # Route-level components
│   ├── auth/
│   │   ├── EmailVerification.tsx
│   │   ├── LoginPage.tsx
│   │   ├── OwnerRegistration.tsx
│   │   └── RenterRegistration.tsx
│   ├── equipment/
│   │   └── EquipmentDetailPage.tsx
│   ├── owner/
│   │   └── OwnerDashboard.tsx
│   ├── payment/
│   │   └── PaymentConfirmation.tsx
│   ├── renter/
│   │   ├── PaymentsPage.tsx
│   │   └── RenterDashboard.tsx
│   ├── verification/
│   │   └── VerifyIdentity.tsx
│   ├── ExplorePage.tsx      # Main landing/search page
│   ├── MessagingPage.tsx
│   └── ProfileSettings.tsx
├── types/                   # TypeScript type definitions
│   ├── booking.ts
│   ├── messaging.ts
│   ├── payment.ts
│   ├── review.ts
│   ├── search.ts
│   └── verification.ts
├── App.tsx                  # Main app component with routing
├── main.tsx                 # Application entry point
└── index.css                # Global styles (Tailwind v4 + theme)
```

**Key Principles:**
- **Feature-based organization**: Components grouped by domain (booking, equipment, messaging)
- **Co-location**: Related components in subdirectories (e.g., `booking/sidebar/`)
- **Service layer**: Data fetching separated from UI (e.g., `equipment/services/listings.ts`)
- **NO barrel exports**: Import directly from file paths
- **Clear separation**: UI primitives (`ui/`) vs feature components

---

## Code Conventions & Patterns

### Naming Conventions

#### Files
- **Components**: `PascalCase.tsx` (e.g., `ListingCard.tsx`, `OwnerSignupForm.tsx`)
- **Hooks**: `camelCase.ts` with "use" prefix (e.g., `useAuth.ts`, `useBookingRequests.ts`)
- **Utilities**: `camelCase.ts` (e.g., `supabase.ts`, `utils.ts`)
- **Types**: `camelCase.ts` (e.g., `booking.ts`, `messaging.ts`)
- **Services**: `camelCase.ts` (e.g., `listings.ts`)

#### Components & Functions
- **Components**: Default export, PascalCase: `export default ListingCard`
- **Hooks/Utils**: Named export, camelCase: `export const useAuth = () => {...}`
- **Props interfaces**: Component name + "Props": `type OwnerSignupFormProps = {...}`
- **Event handlers**: "handle" prefix: `handleSubmit`, `handlePrevImage`, `handleOpen`
- **Data fetching**: "fetch" prefix: `fetchListings`, `fetchBookingRequests`
- **Boolean checks**: "is/has/show" prefix: `isLoading`, `hasMultipleImages`, `showPassword`
- **Utilities**: Descriptive verbs: `formatDateForStorage`, `calculateReviewSummary`

#### Variables
- **State**: Descriptive nouns: `currentStep`, `selectedListingId`, `bookingRequests`
- **Boolean state**: Prefixed: `isLoading`, `showPassword`, `hasMultipleImages`
- **Constants**: `SCREAMING_SNAKE_CASE` for config: `THEME_BREAKPOINTS`

### Import Patterns

**Always use path aliases (never relative paths):**

```typescript
// ✅ CORRECT
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"

// ❌ WRONG
import { Button } from "../../components/ui/button"
import { useAuth } from "../hooks/useAuth"
```

**Type imports:**
```typescript
import type { User, Session } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
```

### TypeScript Patterns

#### Database Type Extraction
```typescript
// Extract types from auto-generated Supabase schema
export type BookingStatus =
  Database["public"]["Tables"]["booking_requests"]["Row"]["status"]

export type BookingRequest =
  Database["public"]["Tables"]["booking_requests"]["Row"]

// Extend with relations
export interface BookingRequestWithDetails extends BookingRequest {
  equipment: Database["public"]["Tables"]["equipment"]["Row"] & {
    category: Database["public"]["Tables"]["categories"]["Row"];
  };
  renter: Database["public"]["Tables"]["profiles"]["Row"];
  owner: Database["public"]["Tables"]["profiles"]["Row"];
}
```

#### Zod Schema Validation
```typescript
const ownerSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof ownerSchema>;
```

#### Function Type Annotations
```typescript
export const fetchListings = async (
  filters: ListingsFilters = {}
): Promise<Listing[]> => {
  // ...
}
```

### Component Patterns

#### Basic Component Structure
```typescript
import type { ComponentProps } from "react"

type ListingCardProps = {
  listing: Listing
  onSelect?: (id: string) => void
}

export default function ListingCard({ listing, onSelect }: ListingCardProps) {
  // Early returns for loading/error states
  if (!listing) return null

  // Event handlers with "handle" prefix
  const handleClick = () => {
    onSelect?.(listing.id)
  }

  return (
    <div onClick={handleClick}>
      {/* Component JSX */}
    </div>
  )
}
```

#### Form Component Pattern
```typescript
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const formSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

type FormData = z.infer<typeof formSchema>

export default function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
  })

  const onSubmit = async (data: FormData) => {
    // Handle submission
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          {...register("email")}
          className={errors.email ? "border-destructive" : ""}
          aria-invalid={!!errors.email}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>
    </form>
  )
}
```

### State Management Patterns

#### React Context for Global State
```typescript
export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
```

#### React Query for Server State
```typescript
const { data, isLoading, refetch, isFetching, isError } = useQuery({
  queryKey: ["listings", filters],
  queryFn: () => fetchListings(filters),
  staleTime: 1000 * 60 * 5, // 5 minutes
})
```

#### Custom Hooks for Domain Logic
```typescript
export const useBookingRequests = (userRole?: "renter" | "owner") => {
  const { user } = useAuth()
  const [bookingRequests, setBookingRequests] = useState<BookingRequestWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  const fetchBookingRequests = useCallback(async () => {
    // Fetch logic
  }, [user, userRole])

  return {
    bookingRequests,
    loading,
    fetchBookingRequests,
    createBookingRequest,
    updateBookingStatus,
  }
}
```

#### URL State with useSearchParams
```typescript
const [searchParams, setSearchParams] = useSearchParams()
const loginOpen = searchParams.get("login") === "true"

const handleLoginOpenChange = (open: boolean) => {
  const newParams = new URLSearchParams(searchParams)
  if (open) {
    newParams.set("login", "true")
  } else {
    newParams.delete("login")
  }
  setSearchParams(newParams, { replace: true })
}
```

### Supabase Query Patterns

#### Basic Query with Relations
```typescript
let query = supabase
  .from("equipment")
  .select(`
    *,
    category:categories(*),
    photos:equipment_photos(*),
    owner:profiles!equipment_owner_id_fkey(id, email)
  `)
  .eq("is_available", true)
  .order("created_at", { ascending: false })

// Apply filters conditionally
if (filters.categoryId && filters.categoryId !== "all") {
  query = query.eq("category_id", filters.categoryId)
}

if (typeof filters.priceMin === "number") {
  query = query.gte("daily_rate", filters.priceMin)
}

const { data, error } = await query
if (error) throw error
```

#### Prevent N+1 Queries
```typescript
// Collect unique IDs
const ownerIds = [...new Set(listings.map((item) => item.owner?.id).filter(Boolean))]

// Single batch query
const { data: reviews } = await supabase
  .from("reviews")
  .select("rating, reviewee_id")
  .in("reviewee_id", ownerIds)

// Build lookup map
const reviewsMap = new Map()
reviews?.forEach((review) => {
  const existing = reviewsMap.get(review.reviewee_id) || []
  existing.push({ rating: review.rating })
  reviewsMap.set(review.reviewee_id, existing)
})
```

#### Realtime Subscriptions
```typescript
useEffect(() => {
  const channel = supabase
    .channel('messages')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`
    }, handleNewMessage)
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [conversationId])
```

### Styling Patterns

#### Tailwind with cn() Helper
```typescript
import { cn } from "@/lib/utils"

<button
  className={cn(
    "px-4 py-2 rounded-md",
    variant === "primary" && "bg-primary text-primary-foreground",
    variant === "outline" && "border border-input",
    isLoading && "opacity-50 cursor-not-allowed",
    className
  )}
>
  {children}
</button>
```

#### CVA for Variant Management
```typescript
import { cva, type VariantProps } from "class-variance-authority"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground",
        outline: "border border-input hover:bg-accent",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export type ButtonVariantProps = VariantProps<typeof buttonVariants>
```

### Error Handling Pattern
```typescript
try {
  const { data, error } = await supabase
    .from("booking_requests")
    .insert({ ...bookingData })

  if (error) throw error
  return data
} catch (err) {
  console.error("Error creating booking request:", err)
  setError(err instanceof Error ? err.message : "Failed to create booking")
  throw err
}
```

---

## Development Workflow

### Environment Setup

#### Required Environment Variables
Create `.env` in project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key  # Optional
```

Access in code:
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
```

#### Install Dependencies
```bash
npm install
```

### Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server at http://localhost:5173 |
| `npm run build` | Build production bundle to `/dist` |
| `npm run preview` | Preview production build at http://localhost:4173 |
| `npm run test` | Run Vitest tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |

### Git Workflow

#### Branch Naming
- Feature branches: `feature/amazing-feature` or `feat/user-auth`
- Bug fixes: `fix/booking-calendar-bug`
- Refactoring: `refactor/auth-modal`
- Documentation: `docs/update-readme`
- **Claude branches**: Must start with `claude/` and include session ID

#### Commit Messages
Follow conventional commits pattern:
- `feat: Add payment escrow functionality`
- `fix: Resolve booking availability race condition`
- `refactor: Extract signup forms into modal components`
- `docs: Update CLAUDE.md with database patterns`
- `test: Add unit tests for review calculations`
- `chore: Update dependencies`

#### Development Flow
1. Create feature branch from `main`
2. Make changes following code conventions
3. Write/update tests
4. Ensure TypeScript types are correct
5. Test on multiple screen sizes (responsive)
6. Commit with descriptive messages
7. Push to remote branch
8. Create Pull Request

### Code Quality Checks

#### Type Checking
```bash
npx tsc --noEmit
```

#### Linting
```bash
npx eslint .
```

#### Fix Auto-fixable Issues
```bash
npx eslint . --fix
```

---

## Key Features & Modules

### Authentication (`/components/auth`, `/contexts/AuthContext.tsx`)
- **Email/Password**: Standard signup/signin flow
- **OAuth**: Google, GitHub, Facebook, Twitter support
- **Role-Based**: Dual roles (renter/owner) in user metadata
- **Multi-Step Registration**: Separate 3-step (renter) and 4-step (owner) flows
- **Modal-Based**: See `SIGNUP_MODAL_TRANSFORMATION_PLAN.md` for modal architecture
- **Email Verification**: Post-signup email confirmation
- **AuthContext**: Global authentication state via React Context

**Key Files:**
- `src/contexts/AuthContext.tsx` - Auth state provider
- `src/components/auth/LoginModal.tsx` - Login modal
- `src/components/auth/SignupModal.tsx` - Signup modal with role selection
- `src/components/auth/RenterSignupForm.tsx` - 3-step renter registration
- `src/components/auth/OwnerSignupForm.tsx` - 4-step owner registration

### Equipment Management (`/components/equipment`)
- **Listing Cards**: Grid display with photo carousel, pricing, ratings
- **Detail Dialog**: Modal with tabbed interface (Overview, Details)
- **Photo Gallery**: Embla carousel with navigation controls
- **CRUD Operations**: Create, read, update, delete listings
- **Availability Calendar**: Date-based availability management
- **Service Layer**: `equipment/services/listings.ts` for data fetching
- **N+1 Prevention**: Batch queries for related data (reviews, categories)

**Key Files:**
- `src/components/equipment/ListingCard.tsx` - Equipment card component
- `src/components/equipment/detail/EquipmentDetailDialog.tsx` - Detail modal
- `src/components/equipment/services/listings.ts` - Data fetching service
- `src/components/EquipmentListingForm.tsx` - Create/edit form
- `src/components/AvailabilityCalendar.tsx` - Availability management

### Booking System (`/components/booking`, `/hooks/booking`)
- **Request-Based Flow**: Renter requests → Owner approves/declines
- **Date Selection**: React Day Picker integration
- **Availability Checking**: Real-time validation against calendar
- **Pricing Calculator**: Dynamic pricing with breakdown display
- **Status Management**: Pending → Approved → Completed → Reviewed
- **Responsive UI**: Desktop sidebar + mobile drawer

**Key Files:**
- `src/components/booking/BookingSidebar.tsx` - Desktop booking interface
- `src/components/booking/MobileSidebarDrawer.tsx` - Mobile booking
- `src/hooks/booking/useEquipmentAvailability.ts` - Availability logic
- `src/hooks/useBookingRequests.ts` - Booking request management
- `src/lib/booking.ts` - Booking utilities

**Booking Workflow:**
1. Renter selects dates on equipment detail page
2. System checks availability in `availability_calendar` table
3. Pricing calculated based on daily rate × days
4. Booking request created with status 'pending'
5. Owner receives notification
6. Owner approves/declines request
7. If approved: Booking created, payment flow initiated
8. After completion: Review flow triggered

### Messaging (`/components/messaging`, `/hooks/useMessaging.ts`)
- **Real-time Chat**: Supabase Realtime subscriptions for instant delivery
- **Conversation List**: Organized by booking context
- **Typing Indicators**: Live typing status
- **Online Status**: User presence tracking
- **Unread Counts**: Badge indicators with RPC function
- **System Messages**: Automated booking status updates

**Key Files:**
- `src/components/messaging/MessagingInterface.tsx` - Main chat UI
- `src/components/messaging/ConversationList.tsx` - Conversation sidebar
- `src/components/messaging/MessageBubble.tsx` - Message display
- `src/hooks/useMessaging.ts` - Messaging logic and realtime
- `src/hooks/usePresence.ts` - Presence tracking

**Database Tables:**
- `messages` - Chat messages
- `conversations` - Conversation threads
- `conversation_participants` - Participants with `last_read_at`

### Payments (`/components/payment`, `/lib/stripe.ts`)
- **Stripe Integration**: Elements for card input
- **Escrow System**: Fund holding until completion
- **Transaction History**: Payment tracking
- **Payment Modal**: Checkout flow
- **Edge Functions**: `create-payment-intent`, `stripe-webhook`, `process-refund`

**Key Files:**
- `src/components/payment/PaymentModal.tsx` - Checkout modal
- `src/components/payment/EscrowDashboard.tsx` - Fund management
- `src/lib/stripe.ts` - Stripe client initialization
- `supabase/functions/create-payment-intent/` - Payment intent edge function
- `supabase/functions/stripe-webhook/` - Webhook handler

**Payment Flow:**
1. Booking approved
2. Renter initiates payment
3. Create payment intent via edge function
4. Stripe Elements for card input
5. Payment confirmed via webhook
6. Funds held in escrow
7. After completion: Funds released to owner

### Reviews & Ratings (`/components/reviews`, `/hooks/useReviews.ts`)
- **Star Ratings**: 1-5 star system
- **Review Forms**: Structured text + rating input
- **Review Display**: Cards with user info and timestamp
- **Aggregate Stats**: Average rating calculation
- **Dual Reviews**: Equipment reviews + user reviews

**Key Files:**
- `src/components/reviews/ReviewForm.tsx` - Review submission
- `src/components/reviews/ReviewCard.tsx` - Review display
- `src/components/reviews/StarRating.tsx` - Star rating component
- `src/lib/reviews.ts` - Rating calculation utilities

**Database:**
- `reviews` table with `rating`, `comment`, `reviewer_id`, `reviewee_id`

### Verification (`/components/verification`, `/hooks/useVerification.ts`)
- **Document Upload**: ID verification via Supabase Storage
- **Phone Verification**: SMS verification flow
- **Trust Score**: User credibility scoring
- **Verification Badges**: Visual trust indicators
- **Progress Tracking**: Multi-step verification display

**Key Files:**
- `src/components/verification/DocumentUpload.tsx`
- `src/components/verification/PhoneVerification.tsx`
- `src/components/verification/TrustScore.tsx`
- `src/components/verification/VerificationBadge.tsx`

### Location Services (`/features/location`)
- **Geocoding**: Address ↔ Coordinates conversion
- **Autocomplete**: Google Places integration
- **Geolocation**: Browser location API
- **Provider Pattern**: Abstracted map service (currently Google)

**Key Files:**
- `src/features/location/geocoding.ts`
- `src/features/location/useAddressAutocomplete.ts`
- `src/features/location/providers/google.ts`

---

## Database Schema

### Core Tables

#### profiles
Base user information for all users.
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL,  -- ENUM: 'renter' | 'owner'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### renter_profiles
Additional renter-specific data.
```sql
CREATE TABLE renter_profiles (
  id UUID PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  preferences JSONB,
  experience_level TEXT,
  verification_status verification_status DEFAULT 'unverified',
  -- ENUM: 'unverified' | 'pending' | 'verified'
);
```

#### owner_profiles
Additional owner-specific data.
```sql
CREATE TABLE owner_profiles (
  id UUID PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  business_info JSONB,
  earnings_total DECIMAL(10,2) DEFAULT 0,
  verification_level verification_status DEFAULT 'unverified',
);
```

#### categories
Equipment categories with hierarchical support.
```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  sport_type TEXT NOT NULL,
  attributes JSONB,
);
```

#### equipment
Equipment listings.
```sql
CREATE TABLE equipment (
  id UUID PRIMARY KEY,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  daily_rate DECIMAL(8,2) NOT NULL,
  condition equipment_condition NOT NULL,  -- ENUM: 'new' | 'excellent' | 'good' | 'fair'
  location TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_available BOOLEAN DEFAULT true,
);
```

#### equipment_photos
Equipment images.
```sql
CREATE TABLE equipment_photos (
  id UUID PRIMARY KEY,
  equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
);
```

#### availability_calendar
Equipment availability by date.
```sql
CREATE TABLE availability_calendar (
  id UUID PRIMARY KEY,
  equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_available BOOLEAN DEFAULT true,
  custom_rate DECIMAL(8,2),
  UNIQUE(equipment_id, date)
);
```

#### booking_requests
Booking requests from renters.
```sql
CREATE TABLE booking_requests (
  id UUID PRIMARY KEY,
  equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
  renter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status booking_status DEFAULT 'pending',  -- ENUM: 'pending' | 'approved' | 'declined' | 'cancelled'
  message TEXT,
);
```

### Custom Types (PostgreSQL Enums)
```sql
CREATE TYPE user_role AS ENUM ('renter', 'owner');
CREATE TYPE verification_status AS ENUM ('unverified', 'pending', 'verified');
CREATE TYPE equipment_condition AS ENUM ('new', 'excellent', 'good', 'fair');
CREATE TYPE booking_status AS ENUM ('pending', 'approved', 'declined', 'cancelled', 'completed');
```

### Extensions
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- UUID generation
CREATE EXTENSION IF NOT EXISTS "postgis";    -- Geographic data
```

### Row Level Security (RLS)

**All tables have RLS enabled.** Key policies:

- **profiles**: Users can read own profile, admins can read all
- **equipment**: Public read for available listings, owners can CRUD own listings
- **booking_requests**: Renters see own requests, owners see requests for their equipment
- **messages**: Participants can read/write in their conversations
- **reviews**: Public read, write only for completed bookings

**Important Files:**
- `supabase/migrations/002_rls_policies.sql` - Initial RLS policies
- `supabase/migrations/003_fix_rls_policies.sql` - RLS fixes
- `supabase/migrations/017_rls_performance_optimizations.sql` - Performance tuning
- `supabase/guides/RLSPolicies.md` - RLS documentation

### Migrations

22+ migration files in `supabase/migrations/`:
- `001_initial_schema.sql` - Base schema
- `002_rls_policies.sql` - Security policies
- `007_realtime_messaging.sql` - Messaging setup
- `013_booking_approval_automation.sql` - Booking automation
- `020_create_payments_table.sql` - Payment schema

**Migration Workflow:**
1. Create migration file: `supabase/migrations/XXX_description.sql`
2. Write SQL for schema changes
3. Test locally with Supabase CLI
4. Commit to git
5. Apply to production via Supabase dashboard or CLI

### Type Generation

Generate TypeScript types from Supabase schema:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts
```

**Always regenerate types after schema changes.**

---

## Testing Guidelines

### Test Framework Setup

**Vitest Configuration** (`vitest.config.ts`):
```typescript
{
  test: {
    globals: true,              // Global test APIs (describe, it, expect)
    environment: 'jsdom',       // Browser-like environment
    setupFiles: ['./src/test/setup.ts'],
  }
}
```

### Running Tests

```bash
npm run test              # Run once
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage report
```

### Testing Patterns

#### Component Testing
```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import ListingCard from '@/components/equipment/ListingCard'

describe('ListingCard', () => {
  it('renders listing information correctly', () => {
    const listing = {
      id: '1',
      title: 'Mountain Bike',
      daily_rate: 50,
    }

    render(<ListingCard listing={listing} />)

    expect(screen.getByText('Mountain Bike')).toBeInTheDocument()
    expect(screen.getByText('$50')).toBeInTheDocument()
  })

  it('calls onSelect when clicked', async () => {
    const onSelect = vi.fn()
    const listing = { id: '1', title: 'Bike' }

    render(<ListingCard listing={listing} onSelect={onSelect} />)

    await userEvent.click(screen.getByText('Bike'))

    expect(onSelect).toHaveBeenCalledWith('1')
  })
})
```

#### Hook Testing
```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useAuth } from '@/hooks/useAuth'

describe('useAuth', () => {
  it('returns user when authenticated', async () => {
    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.user).toBeDefined()
    })
  })
})
```

### Manual Testing Checklist

See `README.md` for comprehensive manual testing checklist covering:
- Authentication flow
- Equipment browsing
- Booking flow
- Owner dashboard
- Messaging
- Payments
- Reviews

---

## Common Tasks

### Adding a New Component

1. **Determine location** based on feature domain:
   - Feature-specific: `src/components/{feature}/ComponentName.tsx`
   - Shared UI primitive: `src/components/ui/component-name.tsx`

2. **Create component file**:
```typescript
import type { ComponentProps } from "react"

type ComponentNameProps = {
  // Props
}

export default function ComponentName({ }: ComponentNameProps) {
  return (
    <div>
      {/* Component content */}
    </div>
  )
}
```

3. **Import with path alias**:
```typescript
import ComponentName from "@/components/feature/ComponentName"
```

### Adding a New Page

1. **Create page component** in `src/pages/`:
```typescript
export default function NewPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold">Page Title</h1>
    </div>
  )
}
```

2. **Add route** in `src/App.tsx`:
```typescript
<Route path="/new-page" element={<NewPage />} />
```

3. **Add navigation link** where appropriate:
```typescript
<Link to="/new-page">New Page</Link>
```

### Adding a Database Table

1. **Create migration file**:
```bash
# Create: supabase/migrations/023_add_new_table.sql
```

2. **Write SQL**:
```sql
CREATE TABLE new_table (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users can view own records"
  ON new_table FOR SELECT
  USING (auth.uid() = user_id);
```

3. **Apply migration** (via Supabase dashboard or CLI)

4. **Regenerate TypeScript types**:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts
```

5. **Create type helpers** in `src/types/`:
```typescript
import type { Database } from "@/lib/database.types"

export type NewRecord = Database["public"]["Tables"]["new_table"]["Row"]
export type NewRecordInsert = Database["public"]["Tables"]["new_table"]["Insert"]
```

### Adding a Custom Hook

1. **Create hook file** in `src/hooks/`:
```typescript
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

export const useCustomHook = (param: string) => {
  const [data, setData] = useState<DataType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from("table_name")
          .select("*")
          .eq("param", param)

        if (error) throw error
        setData(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [param])

  return { data, loading, error }
}
```

2. **Use in components**:
```typescript
const { data, loading, error } = useCustomHook("value")
```

### Adding Environment Variables

1. **Add to `.env`**:
```env
VITE_NEW_API_KEY=your_api_key
```

2. **Update `.env.example`** (if exists) or document in README

3. **Access in code**:
```typescript
const apiKey = import.meta.env.VITE_NEW_API_KEY
```

4. **Add TypeScript typing** (optional) in `src/vite-env.d.ts`:
```typescript
interface ImportMetaEnv {
  readonly VITE_NEW_API_KEY: string
}
```

---

## Important Considerations

### For AI Assistants Working on This Codebase

#### 1. **Always Follow Existing Patterns**
- Use path aliases (`@/`) not relative imports
- Follow naming conventions (PascalCase components, camelCase hooks)
- Feature-based organization for new components
- Service layer for data fetching logic

#### 2. **Type Safety is Critical**
- Always define TypeScript types for props, functions, state
- Extract types from `Database` type for Supabase tables
- Use Zod schemas for form validation
- Regenerate database types after schema changes

#### 3. **Accessibility Matters**
- Add ARIA labels to interactive elements
- Ensure keyboard navigation works
- Use semantic HTML
- Test with screen readers when possible

#### 4. **Performance Considerations**
- Prevent N+1 queries (batch fetch related data)
- Use React Query for server state caching
- Lazy load heavy components when appropriate
- Optimize images and assets

#### 5. **Security Best Practices**
- Never bypass RLS policies
- Validate all user input (client AND server)
- Sanitize data before database insertion
- Use prepared statements (Supabase client handles this)
- Don't expose sensitive keys in client code

#### 6. **Supabase Specific**
- Always check for `error` in Supabase responses
- Use Realtime for live data (messages, presence)
- Leverage RLS for authorization
- Use Edge Functions for server-side logic
- Auto-generate types after schema changes

#### 7. **Testing**
- Write tests for complex logic and utilities
- Test user interactions with Testing Library
- Maintain test coverage for critical paths
- Run tests before committing

#### 8. **Responsive Design**
- Mobile-first approach
- Test on multiple screen sizes
- Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`)
- Provide mobile alternatives (e.g., drawer instead of sidebar)

#### 9. **Git & Commits**
- Clear, descriptive commit messages
- Small, focused commits
- Branch naming conventions
- Never commit secrets or `.env` files

#### 10. **Documentation**
- Update this file when adding major features
- Comment complex logic
- Update README.md for user-facing changes
- Keep type definitions up to date

### Common Pitfalls to Avoid

1. **DON'T** use barrel exports (`index.ts` files) - import directly from component files
2. **DON'T** use relative imports - always use `@/` path alias
3. **DON'T** forget to check Supabase `error` responses
4. **DON'T** skip form validation (both client and server)
5. **DON'T** create new state management when Context/React Query exists
6. **DON'T** hardcode configuration - use environment variables
7. **DON'T** ignore TypeScript errors - fix them properly
8. **DON'T** commit without testing locally first
9. **DON'T** break RLS policies - they're there for security
10. **DON'T** forget to update database types after schema changes

### Quick Reference: File Locations

**Need to...**
- Add authentication logic? → `src/contexts/AuthContext.tsx`, `src/components/auth/`
- Fetch equipment listings? → `src/components/equipment/services/listings.ts`
- Add a UI component? → `src/components/ui/`
- Create a custom hook? → `src/hooks/`
- Add utility function? → `src/lib/utils.ts`
- Define types? → `src/types/` or extract from `src/lib/database.types.ts`
- Create a new page? → `src/pages/` + route in `src/App.tsx`
- Add Supabase client logic? → `src/lib/supabase.ts`
- Modify database schema? → `supabase/migrations/`
- Add payment logic? → `src/lib/stripe.ts`, `src/components/payment/`
- Work with messaging? → `src/components/messaging/`, `src/hooks/useMessaging.ts`
- Add location features? → `src/features/location/`

---

## Resources & Documentation

### Internal Documentation
- `README.md` - User-facing setup and usage guide
- `SIGNUP_MODAL_TRANSFORMATION_PLAN.md` - Detailed auth modal architecture
- `supabase/guides/RLSPolicies.md` - RLS policy documentation
- `supabase/guides/RealTimeAssistant.md` - Realtime messaging guide
- `supabase/guides/Functions.md` - Edge functions guide
- `supabase/guides/EdgeFunctions.md` - Edge functions deployment

### External Resources
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Shadcn UI Components](https://ui.shadcn.com)
- [Supabase Documentation](https://supabase.com/docs)
- [React Hook Form](https://react-hook-form.com)
- [Zod Documentation](https://zod.dev)
- [TanStack Query](https://tanstack.com/query/latest)
- [Vitest Documentation](https://vitest.dev)

---

## Changelog

**2025-11-15**: Initial CLAUDE.md creation
- Comprehensive codebase analysis
- Documented all patterns, conventions, and structure
- Added database schema overview
- Included testing guidelines
- Provided common tasks and quick reference

---

**For questions or clarifications, refer to the internal documentation in `supabase/guides/` or consult the development team.**
