import { useEffect, useMemo, useState } from "react";
import { Banknote, Loader2, Package, ShieldCheck, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useToast } from "@/hooks/useToast";
import { formatCurrency } from "@/lib/payment";
import { formatDateLabel } from "@/lib/format";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type EquipmentRow = Database["public"]["Tables"]["equipment"]["Row"] & {
  owner?: Pick<ProfileRow, "email" | "role"> | null;
};
type PaymentRow = Database["public"]["Tables"]["payments"]["Row"] & {
  owner?: Pick<ProfileRow, "email"> | null;
  renter?: Pick<ProfileRow, "email"> | null;
};

type SummaryStats = {
  totalUsers: number;
  totalListings: number;
  pendingPayouts: number;
};

const AdminDashboard = () => {
  const { toast } = useToast();

  const [summary, setSummary] = useState<SummaryStats>({
    totalUsers: 0,
    totalListings: 0,
    pendingPayouts: 0,
  });
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [listings, setListings] = useState<EquipmentRow[]>([]);
  const [payouts, setPayouts] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [userCount, listingCount, pendingPayoutCount] = await Promise.all([
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
        ]);

        const [{ data: userRows }, { data: equipmentRows }, { data: payoutRows }] =
          await Promise.all([
            supabase
              .from("profiles")
              .select("id,email,role,created_at")
              .order("created_at", { ascending: false })
              .throwOnError(),
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
                "id,owner_id,renter_id,payout_status,owner_payout_amount,total_amount,payout_processed_at,created_at,owner:owner_id(email),renter:renter_id(email)"
              )
              .order("created_at", { ascending: false })
              .limit(50)
              .throwOnError(),
          ]);

        if (!isMounted) return;

        setSummary({
          totalUsers: userCount.count ?? 0,
          totalListings: listingCount.count ?? 0,
          pendingPayouts: pendingPayoutCount.count ?? 0,
        });
        setUsers(userRows || []);
        setListings(equipmentRows || []);
        setPayouts(payoutRows || []);
      } catch (error) {
        console.error("Failed to load admin data:", error);
        toast({
          variant: "destructive",
          title: "Failed to load admin data",
          description:
            error instanceof Error
              ? error.message
              : "Something went wrong while loading admin data.",
        });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchData();
    return () => {
      isMounted = false;
    };
  }, [toast]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const query = search.toLowerCase();
    return users.filter((profile) =>
      profile.email?.toLowerCase().includes(query)
    );
  }, [search, users]);

  const updateUserRole = async (id: string, role: ProfileRow["role"]) => {
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to update role",
        description: error.message,
      });
      return;
    }

    setUsers((prev) =>
      prev.map((profile) => (profile.id === id ? { ...profile, role } : profile))
    );
    toast({ title: "Role updated", description: "User role updated successfully." });
  };

  const toggleListingAvailability = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("equipment")
      .update({ is_available: !current })
      .eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to update listing",
        description: error.message,
      });
      return;
    }

    setListings((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, is_available: !current } : item
      )
    );
    toast({
      title: "Listing updated",
      description: `Listing marked as ${!current ? "active" : "inactive"}.`,
    });
  };

  const updatePayoutStatus = async (
    id: string,
    payout_status: PaymentRow["payout_status"]
  ) => {
    const payload: Partial<PaymentRow> = {
      payout_status,
      payout_processed_at: payout_status === "completed" ? new Date().toISOString() : null,
    };

    const { error } = await supabase
      .from("payments")
      .update(payload)
      .eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to update payout",
        description: error.message,
      });
      return;
    }

    setPayouts((prev) =>
      prev.map((payment) =>
        payment.id === id ? { ...payment, ...payload } : payment
      )
    );

    toast({ title: "Payout updated", description: "Payout status changed." });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Secure admin workspace</p>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          </div>
          <Badge variant="secondary" className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-4 w-4" />
            Admin Access
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{summary.totalUsers}</p>
              <p className="text-sm text-muted-foreground">Profiles in the system</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Listings</CardTitle>
              <Package className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{summary.totalListings}</p>
              <p className="text-sm text-muted-foreground">Equipment records</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending payouts</CardTitle>
              <Banknote className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{summary.pendingPayouts}</p>
              <p className="text-sm text-muted-foreground">Awaiting processing</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>User management</CardTitle>
              <p className="text-sm text-muted-foreground">
                Promote owners, add admins, and review account creation dates.
              </p>
            </div>
            <Input
              placeholder="Search by email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-60"
            />
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
                {filteredUsers.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">{profile.email}</TableCell>
                    <TableCell className="capitalize">{profile.role}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateLabel(profile.created_at || undefined)}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateUserRole(profile.id, "renter")}
                        disabled={profile.role === "renter"}
                      >
                        Set renter
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateUserRole(profile.id, "owner")}
                        disabled={profile.role === "owner"}
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Listing moderation</CardTitle>
            <p className="text-sm text-muted-foreground">
              Quickly disable problematic equipment or re-enable approved items.
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
                {listings.map((listing) => (
                  <TableRow key={listing.id}>
                    <TableCell className="font-medium">{listing.title}</TableCell>
                    <TableCell>{listing.owner?.email ?? "Unknown"}</TableCell>
                    <TableCell>
                      <Badge variant={listing.is_available ? "outline" : "secondary"}>
                        {listing.is_available ? "Active" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {listing.location || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant={listing.is_available ? "outline" : "default"}
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payouts</CardTitle>
            <p className="text-sm text-muted-foreground">
              Track owner payouts and mark them processed when funds are released.
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
                {payouts.map((payment) => (
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
                      {formatDateLabel(payment.created_at || undefined)}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updatePayoutStatus(payment.id, "processing")}
                        disabled={payment.payout_status === "processing"}
                      >
                        Processing
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => updatePayoutStatus(payment.id, "completed")}
                        disabled={payment.payout_status === "completed"}
                      >
                        Mark paid
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
