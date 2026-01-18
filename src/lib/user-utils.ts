/**
 * Shared user utility functions
 */

/**
 * Get user initials from email address
 * Handles emails like "john.doe@email.com" -> "JD"
 * Falls back to first two characters if no separators found
 */
export const getUserInitials = (email?: string | null): string => {
  if (!email) return "U";

  const namePart = email.split("@")[0];
  const parts = namePart.split(/[._-]/).filter((p) => p.length > 0);

  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  return namePart.substring(0, 2).toUpperCase() || "U";
};

/**
 * Get the dashboard path based on active role mode
 */
export const getDashboardPath = (activeMode: "owner" | "renter"): string => {
  return activeMode === "owner" ? "/owner/dashboard" : "/renter/dashboard";
};

export const getInspectionsPath = (activeMode: "owner" | "renter"): string => {
  return activeMode === "owner" ? "/owner/inspections" : "/renter/inspections";
};

export const getInspectionPath = ({
  role,
  bookingId,
  type,
  view = false,
}: {
  role: "owner" | "renter";
  bookingId: string;
  type: "pickup" | "return";
  view?: boolean;
}): string => {
  const basePath = getInspectionsPath(role);
  return view
    ? `${basePath}/${bookingId}/view/${type}`
    : `${basePath}/${bookingId}/${type}`;
};

export const getRentalPath = ({
  role,
  bookingId,
}: {
  role: "owner" | "renter";
  bookingId: string;
}): string => {
  return `/${role}/rental/${bookingId}`;
};
