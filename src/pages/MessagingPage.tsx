import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import MessagingInterface from "@/components/messaging/MessagingInterface";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageShell from "@/components/layout/PageShell";
import { PageTransitionLoader } from "@/components/ui/PageSkeleton";

const MessagingPage = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageTransitionLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <DashboardLayout>
      {/* Page header is hidden on mobile to maximize messaging space */}
      <PageShell
        title="Messages"
        description="Communicate with other users about your bookings"
        icon={MessageSquare}
        iconColor="text-blue-500"
        className="hidden md:block"
      />
      {/* Single MessagingInterface instance to prevent duplicate Supabase Realtime subscriptions */}
      <MessagingInterface />
    </DashboardLayout>
  );
};

export default MessagingPage;
