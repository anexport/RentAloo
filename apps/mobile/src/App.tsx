import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { AuthLayout, AppLayout } from './components/layout';
import { ExploreScreen } from './screens/ExploreScreen';
import { MessagesScreen } from './screens/MessagesScreen';
import { RentalsScreen } from './screens/RentalsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { LoginScreen } from './screens/auth/LoginScreen';
import SignupScreen from './screens/auth/SignupScreen';
import VerifyScreen from './screens/auth/VerifyScreen';
// Use web app page directly for full parity
import EquipmentDetailPage from '@web/pages/equipment/EquipmentDetailPage';
import { BookingDetailScreen } from './screens/BookingDetailScreen';
import { ConversationScreen } from './screens/ConversationScreen';
import { PaymentScreen } from './screens/PaymentScreen';
import { FavoritesScreen } from './screens/FavoritesScreen';
import { useDeepLinks } from './plugins/deepLinks';

export function App() {
  const { user, loading } = useAuth();
  
  // Handle deep links
  useDeepLinks();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Auth routes - NO bottom navigation */}
      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={user ? <Navigate to="/explore" replace /> : <LoginScreen />}
        />
        <Route
          path="/signup"
          element={user ? <Navigate to="/explore" replace /> : <SignupScreen />}
        />
        <Route path="/verify" element={<VerifyScreen />} />
        <Route path="/auth/*" element={<VerifyScreen />} />
      </Route>

      {/* Protected routes - WITH bottom navigation */}
      <Route
        element={user ? <AppLayout /> : <Navigate to="/login" replace />}
      >
        {/* Main tabs */}
        <Route path="/" element={<Navigate to="/explore" replace />} />
        <Route path="/explore" element={<ExploreScreen />} />
        <Route path="/favorites" element={<FavoritesScreen />} />
        <Route path="/messages" element={<MessagesScreen />} />
        <Route path="/rentals" element={<RentalsScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        
        {/* Detail screens (still show bottom nav) */}
        <Route path="/equipment/:id" element={<EquipmentDetailPage />} />
        <Route path="/booking/:id" element={<BookingDetailScreen />} />
        <Route path="/conversation/:id" element={<ConversationScreen />} />
        <Route path="/payment/:bookingId" element={<PaymentScreen />} />
        <Route path="/payment/confirmation" element={<PaymentConfirmationScreen />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/explore" replace />} />
    </Routes>
  );
}

// Lazy load payment confirmation
function PaymentConfirmationScreen() {
  // TODO: Implement payment confirmation screen
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Payment Confirmed!</h1>
        <p className="text-muted-foreground mt-2">Your booking has been confirmed.</p>
      </div>
    </div>
  );
}
