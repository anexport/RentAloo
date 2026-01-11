# Vaymo - Peer-to-Peer Rental Marketplace

## Description

Vaymo is a modern peer-to-peer rental marketplace platform built with React, TypeScript, and Supabase. The platform enables users to rent and lend equipment across various categories including skiing, photography, camping, construction, and more. 

### Key Features

- **Dual User Roles**: Support for both equipment owners and renters with role-specific dashboards
- **Equipment Management**: List, browse, and manage rental equipment with detailed descriptions, photos, and availability calendars
- **Smart Booking System**: Request-based booking flow with availability checking and pricing calculations
- **Secure Payments**: Integrated payment processing with escrow system for secure transactions
- **Real-time Messaging**: Built-in messaging system for communication between renters and owners
- **Reviews & Ratings**: Comprehensive review system with star ratings and detailed feedback
- **Location-based Search**: Search and filter equipment by location, category, price, and availability
- **Identity Verification**: Multi-step verification process for user trust and safety
- **Responsive Design**: Mobile-first design with adaptive layouts for all screen sizes

### Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: TailwindCSS, Shadcn UI Components
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Payment Processing**: Stripe
- **State Management**: React Query, Context API
- **Maps**: Integration with mapping services for location display
- **Testing**: Vitest, React Testing Library

## Prerequisites

Before running this project, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **Supabase CLI** (optional, for local development)

## How to Run

### 1. Clone the Repository

```bash
git clone <repository-url>
cd vaymo
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

### 4. Database Setup

If you're setting up a new Supabase project:

```bash
# Navigate to supabase directory
cd supabase

# Run migrations in order
# 1. Run initial schema
# 2. Run RLS policies
# 3. Run seed data
```

You can also use the Supabase Dashboard to run the migration files located in `supabase/migrations/`.

### 5. Start the Development Server

```bash
npm run dev
```

The application will start on `http://localhost:5173` (or another port if 5173 is in use).

### 6. Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

## How to Test

### Running Unit Tests

```bash
npm run test
```

### Running Tests in Watch Mode

```bash
npm run test:watch
```

### Running Tests with Coverage

```bash
npm run test:coverage
```

### Manual Testing Checklist

#### Authentication Flow
- [ ] Sign up with email and password
- [ ] Log in with existing credentials
- [ ] Log out successfully
- [ ] Password reset flow

#### Equipment Browsing
- [ ] View equipment listings on explore page
- [ ] Filter by category
- [ ] Filter by location
- [ ] Filter by price range
- [ ] View equipment details in dialog

#### Booking Flow
- [ ] Select dates for rental
- [ ] View pricing calculations
- [ ] Submit booking request
- [ ] View booking status
- [ ] Cancel booking request

#### Owner Dashboard
- [ ] Create new equipment listing
- [ ] Edit existing listings
- [ ] Manage availability calendar
- [ ] View booking requests
- [ ] Approve/decline booking requests

#### Messaging
- [ ] Start conversation from equipment listing
- [ ] Send and receive messages
- [ ] View conversation history

#### Payments
- [ ] Process payment for approved booking
- [ ] View transaction history
- [ ] Track escrow status

#### Reviews
- [ ] Submit review after rental completion
- [ ] View reviews on equipment listings
- [ ] Calculate average ratings

## Project Structure

```
vaymo/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── booking/      # Booking-related components
│   │   ├── equipment/    # Equipment listing components
│   │   ├── explore/      # Search and filter components
│   │   ├── layout/       # Layout components (header, sidebar)
│   │   ├── messaging/    # Chat interface components
│   │   ├── payment/      # Payment and escrow components
│   │   ├── reviews/      # Review system components
│   │   └── ui/           # Shadcn UI primitives
│   ├── pages/            # Page-level components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility functions and API clients
│   ├── types/            # TypeScript type definitions
│   └── contexts/         # React context providers
├── supabase/
│   └── migrations/       # Database migration files
└── public/               # Static assets
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build production bundle |
| `npm run preview` | Preview production build locally |
| `npm run test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Run ESLint for code quality |
| `npm run type-check` | Run TypeScript type checking |

## Development Workflow

1. **Feature Development**: Create feature branches from `main`
2. **Code Style**: Follow the coding guidelines in the user rules (early returns, Tailwind for styling, descriptive naming)
3. **Testing**: Write tests for new features and components
4. **Type Safety**: Ensure all TypeScript types are properly defined
5. **Accessibility**: Implement ARIA labels and keyboard navigation
6. **Responsive Design**: Test on multiple screen sizes

## Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Kill the process using port 5173
lsof -ti:5173 | xargs kill -9
```

**Dependency Issues**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Supabase Connection Issues**
- Verify your `.env` file has correct Supabase credentials
- Check that your Supabase project is active
- Ensure RLS policies are properly configured

**Build Errors**
```bash
# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary and confidential.

## Support

For issues and questions, please contact the development team or open an issue in the repository.
