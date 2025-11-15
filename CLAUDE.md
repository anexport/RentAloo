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

**Current Statistics:**
- **21 profiles** (15 renters, 4 owners)
- **23 categories** across various sports
- **15 equipment listings** with 18 photos
- **2 booking requests** and 2 confirmed bookings
- **2 active conversations** with 5 messages
- **28 migrations** applied

### Core Tables

#### profiles
**Purpose:** Base user information for all users (both renters and owners).
**Row Count:** 21
**RLS Enabled:** ✅ Yes

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL,  -- ENUM: 'renter' | 'owner'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE
);
```

**Key Relationships:**
- One-to-one with `renter_profiles` or `owner_profiles` (based on role)
- One-to-many with `equipment` (as owner)
- One-to-many with `booking_requests` (as renter)
- One-to-many with `messages` (as sender)
- One-to-many with `reviews` (as reviewer/reviewee)

---

#### renter_profiles
**Purpose:** Additional renter-specific data and preferences.
**Row Count:** 17
**RLS Enabled:** ✅ Yes

```sql
CREATE TABLE renter_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  preferences JSONB,
  experience_level TEXT,
  verification_status verification_status DEFAULT 'unverified',
    -- ENUM: 'unverified' | 'pending' | 'verified'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Notes:**
- `preferences` stores user-specific rental preferences (JSON)
- `experience_level` tracks user's experience with equipment

---

#### owner_profiles
**Purpose:** Additional owner-specific data including business info and earnings.
**Row Count:** 4
**RLS Enabled:** ✅ Yes

```sql
CREATE TABLE owner_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_info JSONB,
  earnings_total NUMERIC(10,2) DEFAULT 0,
  verification_level verification_status DEFAULT 'unverified',
    -- ENUM: 'unverified' | 'pending' | 'verified'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Notes:**
- `business_info` stores business details, tax info, etc. (JSON)
- `earnings_total` tracks cumulative earnings from rentals

---

#### categories
**Purpose:** Equipment categories with hierarchical support for subcategories.
**Row Count:** 23
**RLS Enabled:** ✅ Yes

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  sport_type TEXT NOT NULL,
  attributes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Notes:**
- Supports hierarchical categories via `parent_id` self-reference
- `attributes` stores category-specific metadata (JSON)
- Examples: Skiing, Photography, Camping, Construction equipment

---

#### equipment
**Purpose:** Equipment listings available for rent.
**Row Count:** 15
**RLS Enabled:** ✅ Yes

```sql
CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  daily_rate NUMERIC(8,2) NOT NULL,
  condition equipment_condition NOT NULL,
    -- ENUM: 'new' | 'excellent' | 'good' | 'fair'
  location TEXT NOT NULL,
  latitude NUMERIC(10,8),
  longitude NUMERIC(11,8),
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Key Relationships:**
- Many-to-one with `profiles` (owner)
- Many-to-one with `categories`
- One-to-many with `equipment_photos`
- One-to-many with `booking_requests`
- One-to-many with `availability_calendar`

**Indexes & Constraints:**
- Foreign key to `owner_id` with CASCADE delete
- Foreign key to `category_id` with RESTRICT delete (prevent deleting categories in use)

---

#### equipment_photos
**Purpose:** Photos/images for equipment listings.
**Row Count:** 18
**RLS Enabled:** ✅ Yes

```sql
CREATE TABLE equipment_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  alt TEXT,  -- Accessibility text for img alt attribute
  description TEXT  -- Optional description of photo content
);
```

**Notes:**
- `is_primary` marks the main photo shown in listings
- `order_index` controls display order in photo galleries
- `alt` and `description` added for accessibility

---

#### availability_calendar
**Purpose:** Tracks equipment availability and custom pricing by date.
**Row Count:** 4
**RLS Enabled:** ✅ Yes

```sql
CREATE TABLE availability_calendar (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_available BOOLEAN DEFAULT true,
  custom_rate NUMERIC(8,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(equipment_id, date)
);
```

**Notes:**
- Unique constraint ensures one entry per equipment per date
- `custom_rate` overrides the equipment's default `daily_rate` for special pricing
- Used for blocking dates and setting seasonal pricing

---

#### booking_requests
**Purpose:** Rental booking requests from renters (pending owner approval).
**Row Count:** 2
**RLS Enabled:** ✅ Yes

```sql
CREATE TABLE booking_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  renter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  status booking_status DEFAULT 'pending',
    -- ENUM: 'pending' | 'approved' | 'declined' | 'cancelled' | 'completed'
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT check_valid_date_range CHECK (end_date >= start_date)
);
```

**Key Relationships:**
- Many-to-one with `equipment`
- Many-to-one with `profiles` (renter)
- One-to-one with `bookings` (after approval)
- One-to-many with `booking_history` (status changes)
- One-to-one with `conversations` (optional)
- One-to-one with `payments`

**Status Flow:**
`pending` → `approved` → `completed` (or `declined`/`cancelled`)

---

#### bookings
**Purpose:** Confirmed bookings (created after booking request approval).
**Row Count:** 2
**RLS Enabled:** ✅ Yes

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_request_id UUID UNIQUE NOT NULL REFERENCES booking_requests(id),
  payment_status TEXT DEFAULT 'pending',
  pickup_method TEXT,
  return_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Notes:**
- One-to-one relationship with `booking_requests` (unique constraint)
- Created automatically when booking request is approved
- Tracks fulfillment details beyond the initial request

---

#### reviews
**Purpose:** User reviews for completed bookings.
**Row Count:** 0
**RLS Enabled:** ✅ Yes

```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  reviewer_id UUID NOT NULL REFERENCES profiles(id),
  reviewee_id UUID NOT NULL REFERENCES profiles(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  photos JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Notes:**
- Can only be created after booking completion
- `rating` must be between 1-5 stars
- Supports both renter→owner and owner→renter reviews

---

#### conversations
**Purpose:** Message conversation threads between users.
**Row Count:** 2
**RLS Enabled:** ✅ Yes

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_request_id UUID REFERENCES booking_requests(id),
  participants UUID[] NOT NULL,  -- Array of profile IDs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Notes:**
- `participants` is an array of user IDs in the conversation
- Optionally linked to a `booking_request_id` for booking-related chats
- Supports realtime messaging via Supabase Realtime

---

#### conversation_participants
**Purpose:** Junction table linking conversations to participants with read tracking.
**Row Count:** 4
**RLS Enabled:** ✅ Yes

```sql
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_read_at TIMESTAMP WITH TIME ZONE,
    -- Timestamp when participant last read messages (NULL = unread)
  UNIQUE(conversation_id, profile_id)
);
```

**Notes:**
- Many-to-many relationship between conversations and profiles
- `last_read_at` used to calculate unread message counts
- Unique constraint prevents duplicate participants

---

#### messages
**Purpose:** Individual messages within conversations.
**Row Count:** 5
**RLS Enabled:** ✅ Yes

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',  -- 'text' | 'system' | etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Notes:**
- Real-time subscriptions enabled for instant message delivery
- `message_type` supports system messages (booking updates, etc.)
- Cascade delete when conversation is deleted

---

#### payments
**Purpose:** Payment transactions with Stripe integration and escrow management.
**Row Count:** 2
**RLS Enabled:** ✅ Yes

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_request_id UUID REFERENCES booking_requests(id),
  renter_id UUID NOT NULL REFERENCES profiles(id),
  owner_id UUID NOT NULL REFERENCES profiles(id),
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_charge_id TEXT,
  subtotal NUMERIC(10,2) NOT NULL,
  service_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL,
  escrow_amount NUMERIC(10,2) NOT NULL,
  escrow_status TEXT NOT NULL DEFAULT 'held',
    -- CHECK: 'held' | 'released' | 'refunded' | 'disputed'
  escrow_released_at TIMESTAMP WITH TIME ZONE,
  owner_payout_amount NUMERIC(10,2) NOT NULL,
  payout_status TEXT NOT NULL DEFAULT 'pending',
    -- CHECK: 'pending' | 'processing' | 'completed' | 'failed'
  payout_processed_at TIMESTAMP WITH TIME ZONE,
  stripe_transfer_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
    -- CHECK: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded' | 'cancelled'
  payment_method_id TEXT,
  currency TEXT NOT NULL DEFAULT 'usd',
  refund_amount NUMERIC DEFAULT 0,
  refund_reason TEXT,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT valid_amounts CHECK (subtotal >= 0 AND service_fee >= 0 AND tax >= 0 AND total_amount >= 0),
  CONSTRAINT valid_escrow CHECK (escrow_amount >= 0 AND escrow_amount <= total_amount),
  CONSTRAINT valid_payout CHECK (owner_payout_amount >= 0 AND owner_payout_amount <= escrow_amount)
);
```

**Notes:**
- Integrates with Stripe for payment processing
- Implements escrow system: funds held until rental completion
- Tracks full payment lifecycle: charge → escrow → payout
- Multiple check constraints ensure data integrity

---

#### booking_history
**Purpose:** Audit trail of booking status changes.
**Row Count:** 2
**RLS Enabled:** ✅ Yes

```sql
CREATE TABLE booking_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_request_id UUID NOT NULL REFERENCES booking_requests(id),
  old_status booking_status,
  new_status booking_status NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reason TEXT,
  metadata JSONB
);
```

**Notes:**
- Automatically populated by database triggers on status changes
- Provides full audit trail for compliance and dispute resolution
- `metadata` stores additional context (JSONB)

---

#### user_verifications
**Purpose:** Identity verification submissions and status tracking.
**Row Count:** 0
**RLS Enabled:** ✅ Yes

```sql
CREATE TABLE user_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  verification_type TEXT NOT NULL,  -- 'id' | 'phone' | 'email' | etc.
  status verification_status DEFAULT 'pending',
    -- ENUM: 'unverified' | 'pending' | 'verified'
  document_url TEXT,  -- Supabase Storage URL for uploaded docs
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Notes:**
- Supports multiple verification types per user
- `document_url` points to Supabase Storage for secure document storage
- Integrates with trust score and verification badge system

---

### Custom Types (PostgreSQL Enums)

```sql
-- User role type
CREATE TYPE user_role AS ENUM ('renter', 'owner');

-- Verification status for users
CREATE TYPE verification_status AS ENUM ('unverified', 'pending', 'verified');

-- Equipment condition levels
CREATE TYPE equipment_condition AS ENUM ('new', 'excellent', 'good', 'fair');

-- Booking request lifecycle status
CREATE TYPE booking_status AS ENUM ('pending', 'approved', 'declined', 'cancelled', 'completed');
```

**Notes:**
- Enums provide type safety and better performance than text constraints
- Used across multiple tables for consistency

---

### Installed Extensions

RentAloo uses several PostgreSQL extensions for enhanced functionality:

```sql
-- Core Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation (v1.1)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- Cryptographic functions (v1.3)
CREATE EXTENSION IF NOT EXISTS "postgis";        -- Geographic/spatial data (v3.3.7)

-- Supabase Extensions
CREATE EXTENSION IF NOT EXISTS "supabase_vault"; -- Secure secret storage (v0.3.1)
CREATE EXTENSION IF NOT EXISTS "pg_graphql";     -- GraphQL support (v1.5.11)

-- Performance & Analysis
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- Query performance tracking (v1.11)
CREATE EXTENSION IF NOT EXISTS "hypopg";             -- Hypothetical indexes (v1.4.1)
CREATE EXTENSION IF NOT EXISTS "index_advisor";      -- Index recommendations (v0.2.0)
```

**Available but not installed:** 72+ additional extensions available including `pg_cron`, `http`, `pg_net`, `vector`, and more.

### Row Level Security (RLS)

**All tables have RLS enabled (13 tables with 58 policies).** RLS ensures users can only access data they're authorized to see.

#### Key Policy Patterns

**profiles:**
- ✅ Authenticated users can view all profiles
- ✅ Users can update only their own profile
- ✅ Users can insert their own profile on signup

**equipment:**
- ✅ Anonymous users can view available equipment
- ✅ Authenticated users can view available equipment OR their own listings
- ✅ Owners can CRUD their own equipment

**booking_requests:**
- ✅ Authenticated users can view: their own requests OR requests for their equipment
- ✅ Renters can create booking requests
- ✅ Renters and owners can update bookings they're involved in

**payments:**
- ✅ Authenticated users can view payments where they are renter OR owner
- ✅ System can create and update payments (public policies for webhook integration)

**messages & conversations:**
- ✅ Users can view/send messages only in conversations they participate in
- ✅ Users can update their own `last_read_at` timestamp
- ✅ Participants can create conversations

**reviews:**
- ✅ Anyone can view reviews (public)
- ✅ Users can create reviews only for their completed bookings
- ✅ Users can update their own reviews

#### Security Considerations

- RLS policies use `auth.uid()` to identify the current user
- Policies are **permissive** (use OR logic when multiple apply)
- Performance optimized with indexes on foreign keys
- System operations (triggers, webhooks) use `public` role policies

**Related Migrations:**
- `20251029011317_add_missing_rls_policies.sql`
- `20251105033811_rls_performance_optimizations.sql`
- `20251105073546_consolidate_multiple_permissive_policies.sql`
- `20251105073950_fix_equipment_select_policies.sql`

---

### Database Migrations

**28 migrations applied** tracking schema evolution from initial setup to current state.

#### Recent Migration History

| Migration | Description |
|-----------|-------------|
| `20251108032058` | Fix booking payment status sync |
| `20251107052902` | Enable RLS on payments table |
| `20251106114419` | Fix payments RLS policy |
| `20251106051425` | Fix get_unread_messages_count security |
| `20251106043340` | Add unread_messages_count RPC |
| `20251105201635` | Create payments table |
| `20251105073950` | Fix equipment select policies |
| `20251105073546` | Consolidate multiple permissive policies |
| `20251105045039` | Fix booking cancellation availability |
| `20251105044659` | RLS performance optimizations fix |
| `20251105033811` | RLS performance optimizations |
| `20251105033731` | Booking system performance optimizations |
| `20251105020735` | Booking system medium priority fixes |
| `20251105020658` | Booking system high priority fixes |
| `20251105020648` | Add completed enum value to booking_status |
| `20251105015412` | Booking approval automation (triggers) |
| `20251103114616` | Add conversation_participants last_read_at |
| `20251103071140` | Messaging guide implementations |
| `20251031094504` | Fix conversation_participants with security definer |
| `20251031092927` | Fix conversation_participants insert policy |
| `20251029075227` | Allow renters to cancel bookings |
| `20251029063013` | Create payments table (initial) |
| `20251029013009` | Fix profile creation trigger (simple) |
| `20251029012723` | Fix profile creation trigger |
| `20251029012345` | Update profile creation trigger |
| `20251029012040` | Add profile creation trigger |
| `20251029011740` | Add missing booking policy |
| `20251029011317` | Add missing RLS policies |

**Migration Workflow:**
1. Create migration file: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
2. Write SQL for schema changes (DDL, triggers, functions, RLS policies)
3. Test locally with Supabase CLI or apply directly via MCP
4. Commit to git
5. Migrations auto-apply on push (or manual via dashboard)

---

### Database Relationships & ER Diagram

```
┌─────────────────┐
│   auth.users    │ (Supabase Auth)
└────────┬────────┘
         │ id
         ↓
┌─────────────────┐         ┌──────────────────┐
│    profiles     │────────→│  renter_profiles │
│  (base users)   │         └──────────────────┘
└────────┬────────┘
         │                   ┌──────────────────┐
         └──────────────────→│  owner_profiles  │
                             └──────────────────┘
         │
         ├──→ equipment (owner)
         ├──→ booking_requests (renter)
         ├──→ messages (sender)
         ├──→ reviews (reviewer/reviewee)
         └──→ user_verifications

┌──────────────┐
│  categories  │──┐
└──────────────┘  │ parent_id (self-reference)
         │        │
         └────────┘
         │
         ↓
┌──────────────┐       ┌────────────────────┐
│  equipment   │──────→│ equipment_photos   │
└──────┬───────┘       └────────────────────┘
       │
       ├──────────────→ availability_calendar
       │
       ↓
┌───────────────────┐     ┌──────────────┐
│ booking_requests  │────→│  bookings    │ (1:1)
└─────┬─────────────┘     └──────┬───────┘
      │                          │
      ├──→ booking_history       └──→ reviews
      ├──→ conversations
      └──→ payments

┌──────────────────┐       ┌──────────────────────────────┐
│  conversations   │──────→│ conversation_participants    │
└────────┬─────────┘       └──────────────────────────────┘
         │
         ↓
┌──────────────────┐
│    messages      │
└──────────────────┘

┌──────────────────┐
│    payments      │ (Stripe integration)
└──────────────────┘
```

**Key Relationships:**

1. **User Hierarchy:** `auth.users` → `profiles` → role-specific profiles (`renter_profiles` OR `owner_profiles`)
2. **Equipment Listings:** `profiles` (owner) → `equipment` → `equipment_photos` + `availability_calendar`
3. **Booking Flow:** `booking_requests` → `bookings` (1:1 after approval) → `reviews`
4. **Messaging:** `conversations` ↔ `conversation_participants` (M:N) → `messages`
5. **Payments:** `booking_requests` → `payments` (Stripe escrow)
6. **Audit Trail:** `booking_requests` → `booking_history` (all status changes)

---

### Database Functions & RPCs

The database includes several stored procedures for complex operations:

#### `get_unread_messages_count(user_uuid UUID)`
**Purpose:** Calculate unread message count for a user across all conversations.
**Returns:** Integer count of unread messages.
**Security:** SECURITY DEFINER (runs with elevated privileges).

**Usage Example:**
```typescript
const { data, error } = await supabase
  .rpc('get_unread_messages_count', { user_uuid: userId })
```

#### Database Triggers

**Automatic Profile Creation:**
- Trigger on `auth.users` insert creates corresponding `profiles` entry
- Automatically sets up user profile on signup

**Booking Approval Automation:**
- Trigger on `booking_requests` status change to 'approved'
- Automatically creates `bookings` entry
- Updates `availability_calendar` to block dates
- Creates audit entry in `booking_history`

**Booking Cancellation:**
- Trigger on status change to 'cancelled'
- Releases blocked dates in `availability_calendar`
- Logs cancellation in `booking_history`

**Payment Status Sync:**
- Trigger keeps `bookings.payment_status` in sync with `payments.payment_status`
- Ensures data consistency across tables

---

### Storage Buckets

RentAloo uses Supabase Storage for file uploads:

| Bucket | Purpose | RLS | Public |
|--------|---------|-----|--------|
| `equipment-photos` | Equipment listing images | ✅ | ✅ Yes |
| `verification-documents` | ID verification uploads | ✅ | ❌ Private |

**Storage Policies:**
- Users can upload to buckets for their own resources
- Equipment photos are publicly accessible
- Verification documents require authentication

---

### Type Generation

Generate TypeScript types from Supabase schema using the MCP tool:

```typescript
// Use Supabase MCP
mcp__supabase__generate_typescript_types()
```

Or via CLI:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts
```

**⚠️ Always regenerate types after schema changes.**

The generated types are used throughout the codebase:
```typescript
import type { Database } from "@/lib/database.types"

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type Equipment = Database["public"]["Tables"]["equipment"]["Row"]
export type BookingRequest = Database["public"]["Tables"]["booking_requests"]["Row"]
```

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
