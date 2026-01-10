import { useMemo, useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Banknote, Loader2, Package, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageShell from "@/components/layout/PageShell";
import { DashboardSkeleton } from "@/components/ui/PageSkeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useToast } from "@/hooks/useToast";
import { formatCurrency } from "@/lib/payment";
import { formatDateLabel } from "@/lib/format";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

// Partial types for dashboard list views (only columns we select)
type UserListItem = Pick<ProfileRow, "id" | "email" | "role" | "created_at">;
type EquipmentListItem = {
  id: string;
  title: string;
  is_available: boolean | null;
  location: string;
  created_at: string | null;
  owner: { email: string; role: ProfileRow["role"] } | null;
};
type PaymentListItem = {
  id: string;
  booking_request_id: string | null;
  owner_id: string;
  renter_id: string;
  payment_status: string;
  escrow_status: string;
  payout_status: string;
  owner_payout_amount: number;
  total_amount: number;
  deposit_status: Database["public"]["Enums"]["deposit_status"] | null;
  deposit_amount: number | null;
  payout_processed_at: string | null;
  created_at: string | null;
  owner: { email: string } | null;
  renter: { email: string } | null;
};

type ClaimListItem = {
  id: string;
  status: Database["public"]["Enums"]["claim_status"];
  estimated_cost: number;
  filed_at: string;
  booking: {
    id: string;
    renter: { email: string | null } | null;
    equipment: { title: string } | null;
  } | null;
};

type InspectionListItem = {
  id: string;
  booking_id: string;
  inspection_type: Database["public"]["Enums"]["inspection_type"];
  verified_by_owner: boolean | null;
  verified_by_renter: boolean | null;
  timestamp: string | null;
  created_at: string | null;
  booking: {
    id: string;
    equipment: { title: string } | null;
    renter: { email: string | null } | null;
  } | null;
};

type VerificationListItem = {
  id: string;
  user_id: string;
  verification_type: string;
  status: string;
  document_url: string | null;
  created_at: string;
  verified_at: string | null;
  rejection_reason: string | null;
  user: { email: string; full_name: string | null } | null;
};

type SummaryStats = {
  totalUsers: number;
  totalListings: number;
  pendingPayouts: number;
  pendingVerifications: number;
};

type AdminData = {
  summary: SummaryStats;
  users: UserListItem[];
  listings: EquipmentListItem[];
  payouts: PaymentListItem[];
  claims: ClaimListItem[];
  inspections: InspectionListItem[];
  verifications: VerificationListItem[];
};

const USERS_PER_PAGE = 50;

// Zod schema for user creation validation
const createUserSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Invalid email format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  role: z.enum(["renter", "owner", "admin"], {
    message: "Role must be renter, owner, or admin",
  }),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

async function fetchUsers(
  offset = 0,
  limit = USERS_PER_PAGE
): Promise<UserListItem[]> {
  const { data } = await supabase
    .from("profiles")
    .select("id,email,role,created_at")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)
    .throwOnError();

  return data || [];
}

async function fetchAdminData(): Promise<AdminData> {
  const [
    userCount,
    listingCount,
    pendingPayoutCount,
    pendingVerificationCount,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .throwOnError(),
    supabase
      .from("equipment")
      .select("*", { count: "exact", head: true })
      .throwOnError(),
    supabase
      .from("payments")
      .select("*", { count: "exact", head: true })
      .eq("payout_status", "pending")
      .throwOnError(),
    supabase
      .from("user_verifications")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .throwOnError(),
  ]);

  const [
    userRows,
    { data: equipmentRows },
    { data: payoutRows },
    { data: claimRows },
    { data: inspectionRows },
    { data: verificationRows },
  ] = await Promise.all([
    fetchUsers(0, USERS_PER_PAGE),
    supabase
      .from("equipment")
      .select(
        "id,title,is_available,location,created_at,owner:owner_id(email,role)"
      )
      .order("created_at", { ascending: false })
      .limit(50)
      .throwOnError(),
    supabase
      .from("payments")
      .select(
        "id,booking_request_id,owner_id,renter_id,payment_status,escrow_status,payout_status,owner_payout_amount,total_amount,deposit_status,deposit_amount,payout_processed_at,created_at,owner:owner_id(email),renter:renter_id(email)"
      )
      .order("created_at", { ascending: false })
      .limit(50)
      .throwOnError(),
    supabase
      .from("damage_claims")
      .select(
        "id,status,estimated_cost,filed_at,booking:booking_requests(id,renter:renter_id(email),equipment:equipment(title))"
      )
      .order("filed_at", { ascending: false })
      .limit(50)
      .throwOnError(),
    supabase
      .from("equipment_inspections")
      .select(
        "id,booking_id,inspection_type,verified_by_owner,verified_by_renter,timestamp,created_at,booking:booking_requests(id,renter:renter_id(email),equipment:equipment(title))"
      )
      .order("created_at", { ascending: false })
      .limit(50)
      .throwOnError(),
    supabase
      .from("user_verifications")
      .select(
        "id,user_id,verification_type,status,document_url,created_at,verified_at,user:user_id(email,full_name)"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(50)
      .throwOnError(),
  ]);

  return {
    summary: {
      totalUsers: userCount.count ?? 0,
      totalListings: listingCount.count ?? 0,
      pendingPayouts: pendingPayoutCount.count ?? 0,
      pendingVerifications: pendingVerificationCount.count ?? 0,
    },
    users: userRows || [],
    listings: equipmentRows || [],
    payouts: (payoutRows as unknown as PaymentListItem[] | null) || [],
    claims: (claimRows as ClaimListItem[] | null) || [],
    inspections: (inspectionRows as InspectionListItem[] | null) || [],
    verifications:
      (verificationRows as unknown as VerificationListItem[] | null) || [],
  };
}

const AdminDashboard = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currentUserId = user?.id;
  const [search, setSearch] = useState("");
  const [loadedUsersCount, setLoadedUsersCount] = useState(USERS_PER_PAGE);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [createUserFormData, setCreateUserFormData] =
    useState<CreateUserFormData>({
      email: "",
      password: "",
      role: "renter",
    });
  const [createUserErrors, setCreateUserErrors] = useState<
    Partial<Record<keyof CreateUserFormData, string>>
  >({});

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: fetchAdminData,
    staleTime: 5 * 60 * 1000,
  });

  // Reset pagination when main data is refetched
  useEffect(() => {
    if (data) {
      setLoadedUsersCount(USERS_PER_PAGE);
    }
  }, [data]);

  const summary = data?.summary ?? {
    totalUsers: 0,
    totalListings: 0,
    pendingPayouts: 0,
    pendingVerifications: 0,
  };
  const initialUsers = data?.users ?? [];
  const listings = data?.listings ?? [];
  const payouts = data?.payouts ?? [];
  const verifications = data?.verifications ?? [];
  const claims = data?.claims ?? [];
  const inspections = data?.inspections ?? [];

  // Load additional users query
  const { data: additionalUsersData } = useQuery({
    queryKey: ["admin-dashboard", "users", loadedUsersCount],
    queryFn: () => fetchUsers(0, loadedUsersCount),
    enabled: loadedUsersCount > USERS_PER_PAGE,
    staleTime: 5 * 60 * 1000,
  });

  // Combine initial and additional users
  const users = useMemo(() => {
    if (loadedUsersCount > USERS_PER_PAGE && additionalUsersData) {
      return additionalUsersData;
    }
    return initialUsers;
  }, [initialUsers, additionalUsersData, loadedUsersCount]);

  const hasMoreUsers = summary.totalUsers > loadedUsersCount;

  const loadMoreUsers = useCallback(() => {
    setLoadedUsersCount((prev) => prev + USERS_PER_PAGE);
  }, []);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const query = search.toLowerCase();
    return users.filter((profile) =>
      profile.email?.toLowerCase().includes(query)
    );
  }, [search, users]);

  // NOTE: This count is based on loaded users only (up to loadedUsersCount).
  // In edge cases where not all users are loaded, this may undercount admins.
  // However, since adminCount is used to prevent demoting the last admin,
  // this errs on the side of caution (may prevent valid demotions, but never
  // allows demoting the actual last admin).
  const adminCount = useMemo(
    () => users.filter((profile) => profile.role === "admin").length,
    [users]
  );

  const canChangeRole = useCallback(
    (targetUserId: string, newRole: ProfileRow["role"]) => {
      const targetUser = users.find((profile) => profile.id === targetUserId);
      if (!targetUser) return false;

      const isCurrentUserTarget = targetUserId === currentUserId;
      const isTargetCurrentlyAdmin = targetUser.role === "admin";
      const isDemotion = isTargetCurrentlyAdmin && newRole !== "admin";

      // Prevent self-demotion
      if (isCurrentUserTarget && isDemotion) {
        return false;
      }

      // Prevent demoting the last admin
      if (isDemotion && adminCount <= 1) {
        return false;
      }

      return true;
    },
    [users, currentUserId, adminCount]
  );

  const canDeleteUser = useCallback(
    (targetUserId: string) => {
      const targetUser = users.find((profile) => profile.id === targetUserId);
      if (!targetUser) return false;

      if (targetUserId === currentUserId) return false;

      if (targetUser.role === "admin" && adminCount <= 1) return false;

      return true;
    },
    [users, currentUserId, adminCount]
  );

  const updateRoleMutation = useMutation({
    mutationFn: async ({
      id,
      role,
    }: {
      id: string;
      role: ProfileRow["role"];
    }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ role })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast({
        title: "Role updated",
        description: "User role updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to update role",
        description: error.message,
      });
    },
  });

  const updateUserRole = (id: string, role: ProfileRow["role"]) => {
    if (!canChangeRole(id, role)) {
      const targetUser = users.find((profile) => profile.id === id);
      const isSelf = id === currentUserId;

      toast({
        variant: "destructive",
        title: "Cannot change role",
        description: isSelf
          ? "You cannot demote yourself. Ask another admin to change your role."
          : targetUser?.role === "admin" && adminCount <= 1
          ? "Cannot demote the last admin. Promote another user to admin first."
          : "Role change not permitted.",
      });
      return;
    }

    updateRoleMutation.mutate({ id, role });
  };

  const deleteUserMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("Authentication required");

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error("VITE_SUPABASE_URL is not configured");
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/admin-users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "deleteUser", userId: targetUserId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: "Unknown error",
        }));
        throw new Error(
          errorData.error || `Failed to delete user: ${response.status}`
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast({
        title: "User deleted",
        description: "User removed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to delete user",
        description: error.message,
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async ({
      email,
      password,
      role,
    }: {
      email: string;
      password: string;
      role: ProfileRow["role"];
    }) => {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("Authentication required");

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error("VITE_SUPABASE_URL is not configured");
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/admin-users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "createUser",
          email,
          password,
          role,
          emailConfirm: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: "Unknown error",
        }));
        throw new Error(
          errorData.error || `Failed to create user: ${response.status}`
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast({
        title: "User created",
        description: "New user added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to create user",
        description: error.message,
      });
    },
  });

  const handleOpenCreateUserModal = () => {
    setCreateUserFormData({ email: "", password: "", role: "renter" });
    setCreateUserErrors({});
    setIsCreateUserModalOpen(true);
  };

  const handleCloseCreateUserModal = () => {
    setIsCreateUserModalOpen(false);
    setCreateUserFormData({ email: "", password: "", role: "renter" });
    setCreateUserErrors({});
  };

  const handleCreateUserSubmit = () => {
    // Clear previous errors
    setCreateUserErrors({});

    // Validate with Zod
    const result = createUserSchema.safeParse(createUserFormData);

    if (!result.success) {
      // Map Zod errors to form field errors
      const errors: Partial<Record<keyof CreateUserFormData, string>> = {};
      result.error.issues.forEach((err) => {
        const field = err.path[0] as keyof CreateUserFormData;
        if (field) {
          errors[field] = err.message;
        }
      });
      setCreateUserErrors(errors);

      // Show toast with validation errors
      const errorMessages = result.error.issues
        .map((e) => e.message)
        .join(", ");
      toast({
        variant: "destructive",
        title: "Validation failed",
        description: errorMessages,
      });
      return;
    }

    // Validation succeeded - proceed with mutation
    createUserMutation.mutate(
      {
        email: result.data.email,
        password: result.data.password,
        role: result.data.role,
      },
      {
        onSuccess: () => {
          handleCloseCreateUserModal();
        },
      }
    );
  };

  const deleteUser = (targetUserId: string) => {
    if (!canDeleteUser(targetUserId)) {
      toast({
        variant: "destructive",
        title: "Cannot delete user",
        description:
          targetUserId === currentUserId
            ? "You cannot delete your own account from the dashboard."
            : "Deletion not permitted.",
      });
      return;
    }

    const confirmed = window.confirm(
      "This will permanently delete the user and all related data. Continue?"
    );
    if (!confirmed) return;

    deleteUserMutation.mutate(targetUserId);
  };

  const toggleListingMutation = useMutation({
    mutationFn: async ({
      id,
      newAvailability,
    }: {
      id: string;
      newAvailability: boolean;
    }) => {
      const { error } = await supabase
        .from("equipment")
        .update({ is_available: newAvailability })
        .eq("id", id);
      if (error) throw error;
      return newAvailability;
    },
    onSuccess: (newAvailability) => {
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast({
        title: "Listing updated",
        description: `Listing marked as ${
          newAvailability ? "active" : "inactive"
        }.`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to update listing",
        description: error.message,
      });
    },
  });

  const toggleListingAvailability = (id: string, current: boolean) => {
    toggleListingMutation.mutate({ id, newAvailability: !current });
  };

  const deleteListingMutation = useMutation({
    mutationFn: async (listingId: string) => {
      const { error } = await supabase
        .from("equipment")
        .delete()
        .eq("id", listingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast({
        title: "Listing deleted",
        description: "Equipment removed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to delete listing",
        description: error.message,
      });
    },
  });

  const deleteListing = (listingId: string) => {
    const confirmed = window.confirm(
      "This will permanently delete the listing. Continue?"
    );
    if (!confirmed) return;
    deleteListingMutation.mutate(listingId);
  };

  const updatePayoutMutation = useMutation({
    mutationFn: async ({
      id,
      payout_status,
    }: {
      id: string;
      payout_status: string;
    }) => {
      // Let the database handle the timestamp via trigger or default
      const { error } = await supabase
        .from("payments")
        .update({ payout_status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast({ title: "Payout updated", description: "Payout status changed." });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to update payout",
        description: error.message,
      });
    },
  });

  const updatePayoutStatus = (id: string, payout_status: string) => {
    updatePayoutMutation.mutate({ id, payout_status });
  };

  const refundPaymentMutation = useMutation({
    mutationFn: async ({
      paymentId,
      reason,
    }: {
      paymentId: string;
      reason: string;
    }) => {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("Authentication required");

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error("VITE_SUPABASE_URL is not configured");
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/process-refund`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ paymentId, reason }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: "Unknown error",
        }));
        throw new Error(
          errorData.error || `Failed to refund payment: ${response.status}`
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast({
        title: "Refund processed",
        description: "Payment was refunded.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Refund failed",
        description: error.message,
      });
    },
  });

  const refundPayment = (paymentId: string) => {
    const reason = window.prompt("Refund reason?", "Admin refund") ?? "";
    if (!reason.trim()) return;
    refundPaymentMutation.mutate({ paymentId, reason });
  };

  const releaseDepositMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("Authentication required");

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error("VITE_SUPABASE_URL is not configured");
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/release-deposit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ bookingId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: "Unknown error",
        }));
        throw new Error(
          errorData.error || `Failed to release deposit: ${response.status}`
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast({
        title: "Deposit released",
        description: "Deposit refund processed.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Deposit release failed",
        description: error.message,
      });
    },
  });

  const releaseEscrowMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("Authentication required");

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error("VITE_SUPABASE_URL is not configured");
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/release-escrow`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ paymentId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: "Unknown error",
        }));
        throw new Error(
          errorData.error || `Failed to release escrow: ${response.status}`
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast({
        title: "Escrow released",
        description: "Escrow marked released.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Escrow release failed",
        description: error.message,
      });
    },
  });

  const updateClaimStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: ClaimListItem["status"];
    }) => {
      const { error } = await supabase
        .from("damage_claims")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast({ title: "Claim updated", description: "Claim status updated." });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to update claim",
        description: error.message,
      });
    },
  });

  const updateInspectionMutation = useMutation({
    mutationFn: async ({
      id,
      verified_by_owner,
      verified_by_renter,
    }: {
      id: string;
      verified_by_owner?: boolean;
      verified_by_renter?: boolean;
    }) => {
      const updates: Record<string, unknown> = {};
      if (typeof verified_by_owner === "boolean")
        updates.verified_by_owner = verified_by_owner;
      if (typeof verified_by_renter === "boolean")
        updates.verified_by_renter = verified_by_renter;

      if (Object.keys(updates).length === 0) {
        throw new Error("No inspection fields provided to update");
      }

      const { error } = await supabase
        .from("equipment_inspections")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast({
        title: "Inspection updated",
        description: "Inspection status updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to update inspection",
        description: error.message,
      });
    },
  });

  // Verification approval mutation
  const approveVerificationMutation = useMutation({
    mutationFn: async ({
      verificationId,
      userId,
      verificationType,
    }: {
      verificationId: string;
      userId: string;
      verificationType: string;
    }) => {
      // Update user_verifications status to verified
      const { error: verificationError } = await supabase
        .from("user_verifications")
        .update({
          status: "verified",
          verified_at: new Date().toISOString(),
        })
        .eq("id", verificationId);

      if (verificationError) throw verificationError;

      // Update the corresponding verified flag in profiles
      const verifiedField = `${verificationType}_verified`;
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          [verifiedField]: true,
          verified_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (profileError) throw profileError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast({
        title: "Verification approved",
        description: "User verification has been approved.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to approve verification",
        description: error.message,
      });
    },
  });

  const approveVerification = (
    verificationId: string,
    userId: string,
    verificationType: string
  ) => {
    const confirmed = window.confirm(
      "Approve this verification? The user will be marked as verified."
    );
    if (!confirmed) return;
    approveVerificationMutation.mutate({
      verificationId,
      userId,
      verificationType,
    });
  };

  // Verification rejection mutation
  const rejectVerificationMutation = useMutation({
    mutationFn: async ({
      verificationId,
      rejectionReason,
    }: {
      verificationId: string;
      rejectionReason: string;
    }) => {
      const { error } = await supabase
        .from("user_verifications")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason,
        })
        .eq("id", verificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast({
        title: "Verification rejected",
        description: "User has been notified of the rejection.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to reject verification",
        description: error.message,
      });
    },
  });

  const rejectVerification = (verificationId: string) => {
    const reason = window.prompt(
      "Enter rejection reason (will be shown to user):",
      "Document was unclear or invalid. Please upload a clearer image."
    );
    if (!reason?.trim()) return;
    rejectVerificationMutation.mutate({
      verificationId,
      rejectionReason: reason,
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <PageShell
          title="Admin Dashboard"
          description="Loading admin data..."
          icon={ShieldCheck}
          iconColor="text-amber-500"
        >
          <DashboardSkeleton />
        </PageShell>
      </DashboardLayout>
    );
  }

  if (isError) {
    return (
      <DashboardLayout>
        <PageShell
          title="Admin Dashboard"
          description="Secure admin workspace"
          icon={ShieldCheck}
          iconColor="text-amber-500"
        >
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
            <p className="text-destructive">Failed to load admin data</p>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : "Something went wrong"}
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        </PageShell>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageShell
        title="Admin Dashboard"
        description="Secure admin workspace"
        icon={ShieldCheck}
        iconColor="text-amber-500"
        action={
          <Badge
            variant="secondary"
            className="flex items-center gap-2 text-primary"
          >
            <ShieldCheck className="h-4 w-4" />
            Admin Access
          </Badge>
        }
      >
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Users
                </CardTitle>
                <Users className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{summary.totalUsers}</p>
                <p className="text-sm text-muted-foreground">
                  Profiles in the system
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Listings</CardTitle>
                <Package className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{summary.totalListings}</p>
                <p className="text-sm text-muted-foreground">
                  Equipment records
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Pending payouts
                </CardTitle>
                <Banknote className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{summary.pendingPayouts}</p>
                <p className="text-sm text-muted-foreground">
                  Awaiting processing
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Pending Verifications
                </CardTitle>
                <ShieldCheck className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {summary.pendingVerifications}
                </p>
                <p className="text-sm text-muted-foreground">Awaiting review</p>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl">
            <CardHeader className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>User management</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Promote owners, add admins, and review account creation dates.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search by email"
                  aria-label="Search users by email"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-60"
                />
                <Button size="sm" onClick={handleOpenCreateUserModal}>
                  Create user
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="h-24 text-center text-muted-foreground"
                      >
                        <div role="status" aria-live="polite">
                          <p className="font-medium">No users found</p>
                          {search.trim() && (
                            <p className="mt-1 text-sm">
                              Try clearing your search to see all users.
                            </p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell className="font-medium">
                          {profile.email}
                        </TableCell>
                        <TableCell className="capitalize">
                          {profile.role}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateLabel(profile.created_at ?? null)}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateUserRole(profile.id, "renter")}
                            disabled={
                              profile.role === "renter" ||
                              !canChangeRole(profile.id, "renter")
                            }
                          >
                            Set renter
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateUserRole(profile.id, "owner")}
                            disabled={
                              profile.role === "owner" ||
                              !canChangeRole(profile.id, "owner")
                            }
                          >
                            Set owner
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => updateUserRole(profile.id, "admin")}
                            disabled={profile.role === "admin"}
                          >
                            Grant admin
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteUser(profile.id)}
                            disabled={!canDeleteUser(profile.id)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {hasMoreUsers && (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={loadMoreUsers}
                    disabled={
                      additionalUsersData === undefined &&
                      loadedUsersCount > USERS_PER_PAGE
                    }
                  >
                    {additionalUsersData === undefined &&
                    loadedUsersCount > USERS_PER_PAGE ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      `Load more (${
                        summary.totalUsers - loadedUsersCount
                      } remaining)`
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Listing moderation</CardTitle>
              <p className="text-sm text-muted-foreground">
                Quickly disable problematic equipment or re-enable approved
                items.
              </p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listings.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-24 text-center text-muted-foreground"
                      >
                        <div role="status" aria-live="polite">
                          <p className="font-medium">No listings found</p>
                          <p className="mt-1 text-sm">
                            There are no equipment listings in the system.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    listings.map((listing) => (
                      <TableRow key={listing.id}>
                        <TableCell className="font-medium">
                          {listing.title}
                        </TableCell>
                        <TableCell>
                          {listing.owner?.email ?? "Unknown"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              listing.is_available ? "outline" : "secondary"
                            }
                          >
                            {listing.is_available ? "Active" : "Disabled"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {listing.location || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-2">
                            <Button
                              variant={
                                listing.is_available ? "outline" : "default"
                              }
                              size="sm"
                              onClick={() =>
                                toggleListingAvailability(
                                  listing.id,
                                  Boolean(listing.is_available)
                                )
                              }
                            >
                              {listing.is_available ? "Disable" : "Enable"}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteListing(listing.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Damage claims</CardTitle>
              <p className="text-sm text-muted-foreground">
                Review and update claim statuses across the platform.
              </p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Renter</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Filed</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-24 text-center text-muted-foreground"
                      >
                        <div role="status" aria-live="polite">
                          <p className="font-medium">No damage claims found</p>
                          <p className="mt-1 text-sm">
                            There are no damage claims in the system.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    claims.map((claim) => (
                      <TableRow key={claim.id}>
                        <TableCell className="font-medium">
                          {claim.booking?.equipment?.title ?? "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {claim.booking?.renter?.email ?? "-"}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={claim.status}
                            onValueChange={(value) =>
                              updateClaimStatusMutation.mutate({
                                id: claim.id,
                                status: value as ClaimListItem["status"],
                              })
                            }
                          >
                            <SelectTrigger className="h-9 w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(
                                [
                                  "pending",
                                  "accepted",
                                  "disputed",
                                  "resolved",
                                  "escalated",
                                ] as const
                              ).map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateLabel(claim.filed_at)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(claim.estimated_cost)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Inspections</CardTitle>
              <p className="text-sm text-muted-foreground">
                Review pickup/return inspections and mark confirmations.
              </p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Renter</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Renter</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inspections.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-24 text-center text-muted-foreground"
                      >
                        <div role="status" aria-live="polite">
                          <p className="font-medium">No inspections found</p>
                          <p className="mt-1 text-sm">
                            There are no equipment inspections in the system.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    inspections.map((inspection) => (
                      <TableRow key={inspection.id}>
                        <TableCell className="font-medium">
                          {inspection.booking?.equipment?.title ?? "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {inspection.booking?.renter?.email ?? "-"}
                        </TableCell>
                        <TableCell className="capitalize">
                          {inspection.inspection_type}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              inspection.verified_by_owner
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {inspection.verified_by_owner
                              ? "Confirmed"
                              : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              inspection.verified_by_renter
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {inspection.verified_by_renter
                              ? "Confirmed"
                              : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateLabel(
                            inspection.timestamp ?? inspection.created_at
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex flex-wrap justify-end gap-2">
                            <Button asChild variant="outline" size="sm">
                              <Link
                                to={`/inspection/${inspection.booking_id}/view/${inspection.inspection_type}`}
                              >
                                View
                              </Link>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateInspectionMutation.mutate({
                                  id: inspection.id,
                                  verified_by_owner: true,
                                })
                              }
                              disabled={Boolean(inspection.verified_by_owner)}
                            >
                              Owner confirm
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateInspectionMutation.mutate({
                                  id: inspection.id,
                                  verified_by_renter: true,
                                })
                              }
                              disabled={Boolean(inspection.verified_by_renter)}
                            >
                              Renter confirm
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Payouts</CardTitle>
              <p className="text-sm text-muted-foreground">
                Track owner payouts and mark them processed when funds are
                released.
              </p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Owner</TableHead>
                    <TableHead>Renter</TableHead>
                    <TableHead>Payout</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-24 text-center text-muted-foreground"
                      >
                        <div role="status" aria-live="polite">
                          <p className="font-medium">No payouts found</p>
                          <p className="mt-1 text-sm">
                            There are no payout records in the system.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    payouts.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{payment.owner?.email ?? "-"}</TableCell>
                        <TableCell>{payment.renter?.email ?? "-"}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">
                              {formatCurrency(payment.owner_payout_amount)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Total: {formatCurrency(payment.total_amount)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              payment.payout_status === "completed"
                                ? "secondary"
                                : payment.payout_status === "failed"
                                ? "destructive"
                                : "outline"
                            }
                          >
                            {payment.payout_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateLabel(payment.created_at ?? null)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex flex-wrap justify-end gap-2">
                            {payment.escrow_status === "held" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  releaseEscrowMutation.mutate(payment.id)
                                }
                              >
                                Release escrow
                              </Button>
                            )}
                            {payment.booking_request_id &&
                              payment.deposit_status === "held" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    releaseDepositMutation.mutate(
                                      payment.booking_request_id!
                                    )
                                  }
                                >
                                  Release deposit
                                </Button>
                              )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updatePayoutStatus(payment.id, "processing")
                              }
                              disabled={payment.payout_status === "processing"}
                            >
                              Processing
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() =>
                                updatePayoutStatus(payment.id, "completed")
                              }
                              disabled={payment.payout_status === "completed"}
                            >
                              Mark paid
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => refundPayment(payment.id)}
                              disabled={payment.payment_status === "refunded"}
                            >
                              Refund
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pending Verifications Section */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Pending Verifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {verifications.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-24 text-center text-muted-foreground"
                      >
                        <div role="status" aria-live="polite">
                          <p className="font-medium">
                            No pending verifications
                          </p>
                          <p className="mt-1 text-sm">
                            All verification documents have been reviewed.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    verifications.map((verification) => (
                      <TableRow key={verification.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {verification.user?.email ?? "Unknown"}
                            </p>
                            {verification.user?.full_name && (
                              <p className="text-xs text-muted-foreground">
                                {verification.user.full_name}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {verification.verification_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateLabel(verification.created_at ?? null)}
                        </TableCell>
                        <TableCell>
                          {verification.document_url ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                window.open(
                                  verification.document_url!,
                                  "_blank"
                                )
                              }
                            >
                              View Document
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              No document
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() =>
                                approveVerification(
                                  verification.id,
                                  verification.user_id,
                                  verification.verification_type
                                )
                              }
                            >
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                rejectVerification(verification.id)
                              }
                            >
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </PageShell>

      {/* Create User Modal */}
      <Dialog
        open={isCreateUserModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseCreateUserModal();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Create a new user account with email, password, and role.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-user-email">Email</Label>
              <Input
                id="create-user-email"
                type="email"
                placeholder="user@example.com"
                value={createUserFormData.email}
                onChange={(e) =>
                  setCreateUserFormData((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                aria-invalid={!!createUserErrors.email}
                aria-describedby={
                  createUserErrors.email ? "email-error" : undefined
                }
              />
              {createUserErrors.email && (
                <p
                  id="email-error"
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {createUserErrors.email}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-user-password">Password</Label>
              <Input
                id="create-user-password"
                type="password"
                placeholder="Enter temporary password"
                value={createUserFormData.password}
                onChange={(e) =>
                  setCreateUserFormData((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
                aria-invalid={!!createUserErrors.password}
                aria-describedby={
                  createUserErrors.password ? "password-error" : undefined
                }
              />
              {createUserErrors.password && (
                <p
                  id="password-error"
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {createUserErrors.password}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters with uppercase, lowercase, and
                number
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-user-role">Role</Label>
              <Select
                value={createUserFormData.role}
                onValueChange={(value: "renter" | "owner" | "admin") =>
                  setCreateUserFormData((prev) => ({
                    ...prev,
                    role: value,
                  }))
                }
              >
                <SelectTrigger
                  id="create-user-role"
                  aria-invalid={!!createUserErrors.role}
                  aria-describedby={
                    createUserErrors.role ? "role-error" : undefined
                  }
                >
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="renter">Renter</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              {createUserErrors.role && (
                <p
                  id="role-error"
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {createUserErrors.role}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseCreateUserModal}
              disabled={createUserMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateUserSubmit}
              disabled={createUserMutation.isPending}
            >
              {createUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminDashboard;
