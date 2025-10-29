import { Link } from "react-router-dom";
import { Search, Shield, MessageSquare, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useVerification } from "@/hooks/useVerification";
import { getVerificationProgress } from "@/lib/verification";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

const QuickActions = () => {
  const { user } = useAuth();
  const { profile } = useVerification();
  const verificationProgress = profile ? getVerificationProgress(profile) : 0;
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [upcomingBookings, setUpcomingBookings] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      if (!user) return;

      // Fetch unread messages count (simplified - you may need to adjust based on your messaging schema)
      const { count: messagesCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("read", false);

      setUnreadMessages(messagesCount || 0);

      // Fetch upcoming bookings (approved bookings with future start dates)
      const today = new Date().toISOString().split("T")[0];
      const { count: bookingsCount } = await supabase
        .from("booking_requests")
        .select("*", { count: "exact", head: true })
        .eq("renter_id", user.id)
        .eq("status", "approved")
        .gte("start_date", today);

      setUpcomingBookings(bookingsCount || 0);
    };

    fetchCounts();
  }, [user]);

  const actions = [
    {
      title: "Browse Equipment",
      description: "Discover outdoor gear available for rent",
      icon: Search,
      href: "/equipment",
      variant: "default" as const,
      badge: null,
    },
    {
      title: "My Bookings",
      description: "View and manage your rental bookings",
      icon: Calendar,
      href: "/renter/dashboard?tab=bookings",
      variant: "outline" as const,
      badge: upcomingBookings > 0 ? `${upcomingBookings} upcoming` : null,
    },
    {
      title: "Messages",
      description: "Chat with equipment owners",
      icon: MessageSquare,
      href: "/messages",
      variant: "outline" as const,
      badge: unreadMessages > 0 ? `${unreadMessages} unread` : null,
    },
  ];

  // Add verification action if not complete
  if (verificationProgress < 100) {
    actions.push({
      title: "Complete Verification",
      description: "Increase your trust score for better access",
      icon: Shield,
      href: "/verification",
      variant: "outline" as const,
      badge: `${verificationProgress}% complete`,
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Card key={action.title} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Icon className="h-6 w-6 text-primary" />
                {action.badge && (
                  <Badge variant="secondary" className="text-xs">
                    {action.badge}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-base">{action.title}</CardTitle>
              <CardDescription className="text-xs">
                {action.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to={action.href}>
                <Button variant={action.variant} className="w-full">
                  {action.variant === "default" ? "Browse Now" : "View"}
                </Button>
              </Link>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default QuickActions;

