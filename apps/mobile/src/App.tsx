import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { TabLayout } from './components/navigation/TabLayout';
import { ExploreScreen } from './screens/ExploreScreen';
import { MessagesScreen } from './screens/MessagesScreen';
import { RentalsScreen } from './screens/RentalsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { LoginScreen } from './screens/auth/LoginScreen';
import { EquipmentDetailScreen } from './screens/EquipmentDetailScreen';
import { BookingDetailScreen } from './screens/BookingDetailScreen';
import { ConversationScreen } from './screens/ConversationScreen';
import { PaymentScreen } from './screens/PaymentScreen';
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
      {/* Auth routes */}
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginScreen />}
      />

      {/* Protected routes with tab navigation */}
      <Route
        path="/"
        element={user ? <TabLayout /> : <Navigate to="/login" replace />}
      >
        <Route index element={<Navigate to="/explore" replace />} />
        <Route path="explore" element={<ExploreScreen />} />
        <Route path="messages" element={<MessagesScreen />} />
        <Route path="rentals" element={<RentalsScreen />} />
        <Route path="profile" element={<ProfileScreen />} />
      </Route>

      {/* Detail screens (outside tab navigation) */}
      <Route
        path="/equipment/:id"
        element={user ? <EquipmentDetailScreen /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/booking/:id"
        element={user ? <BookingDetailScreen /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/conversation/:id"
        element={user ? <ConversationScreen /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/payment/:bookingId"
        element={user ? <PaymentScreen /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/payment/confirmation"
        element={user ? <PaymentConfirmationScreen /> : <Navigate to="/login" replace />}
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
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
