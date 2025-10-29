import { useAuth } from "../hooks/useAuth";
import { Navigate } from "react-router-dom";
import MessagingInterface from "../components/messaging/MessagingInterface";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageHeader from "@/components/layout/PageHeader";

const MessagingPage = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Messages"
        description="Communicate with other users about your bookings"
      />

      <MessagingInterface />
    </DashboardLayout>
  );
};

export default MessagingPage;
