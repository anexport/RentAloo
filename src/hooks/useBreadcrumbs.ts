import { useLocation } from "react-router-dom";
import { Home, Search, Calendar, MessageSquare, Settings, Shield, DollarSign, Package } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export const useBreadcrumbs = (): BreadcrumbItem[] => {
  const location = useLocation();
  const path = location.pathname;
  const searchParams = new URLSearchParams(location.search);
  
  // Base breadcrumb
  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Home", href: "/renter/dashboard", icon: Home },
  ];

  // Route mapping
  const routeMap: Record<string, BreadcrumbItem[]> = {
    "/renter/dashboard": [],
    "/owner/dashboard": [{ label: "Owner Dashboard", href: "/owner/dashboard", icon: Package }],
    "/equipment": [{ label: "Browse Equipment", href: "/equipment", icon: Search }],
    "/messages": [{ label: "Messages", href: "/messages", icon: MessageSquare }],
    "/settings": [{ label: "Settings", href: "/settings", icon: Settings }],
    "/verification": [{ label: "Verification", href: "/verification", icon: Shield }],
    "/payment/confirmation": [
      { label: "Payments", href: "/renter/dashboard" },
      { label: "Confirmation", href: "/payment/confirmation", icon: DollarSign },
    ],
  };

  // Get breadcrumbs for current path
  const pathBreadcrumbs = routeMap[path] || [];
  
  // Handle query parameters for tab navigation
  const tab = searchParams.get("tab");
  if (path === "/renter/dashboard" && tab === "bookings") {
    breadcrumbs.push({ label: "My Bookings", href: "/renter/dashboard?tab=bookings", icon: Calendar });
  } else if (path === "/renter/dashboard" && tab === "payments") {
    breadcrumbs.push({ label: "Payments", href: "/renter/dashboard?tab=payments", icon: DollarSign });
  } else {
    // Add path-specific breadcrumbs
    breadcrumbs.push(...pathBreadcrumbs);
  }

  // Remove home if we're on home
  if (path === "/renter/dashboard" && !tab) {
    return [];
  }

  return breadcrumbs;
};

