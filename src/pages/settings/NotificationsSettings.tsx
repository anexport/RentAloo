import { Bell, Volume2, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/useToast";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import PageHeader from "@/components/layout/PageHeader";
import type { NotificationPreferences } from "@/types/notification";

// ============================================================================
// COMPONENT
// ============================================================================

const NotificationsSettings = () => {
  const { preferences, loading, error, updatePreferences } =
    useNotificationPreferences();

  const handleToggle = async (
    key: keyof NotificationPreferences,
    value: boolean
  ) => {
    const success = await updatePreferences({ [key]: value });
    if (success) {
      toast({
        title: "Settings updated",
        description: "Your notification preferences have been saved.",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to update preferences. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleTimeChange = async (
    key: "quiet_hours_start" | "quiet_hours_end",
    value: string
  ) => {
    const success = await updatePreferences({ [key]: value });
    if (success) {
      toast({
        title: "Quiet hours updated",
        description: "Your quiet hours have been saved.",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to update quiet hours. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container max-w-3xl py-8">
        <PageHeader
          title="Notification Settings"
          description="Manage how you receive notifications"
        />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-3xl py-8">
        <PageHeader
          title="Notification Settings"
          description="Manage how you receive notifications"
        />
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-8">
      <PageHeader
        title="Notification Settings"
        description="Manage how you receive notifications"
      />

      <div className="space-y-6">
        {/* In-App Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              In-App Notifications
            </CardTitle>
            <CardDescription>
              Choose which types of notifications you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="booking_notifications" className="font-medium">
                  Booking updates
                </Label>
                <p className="text-sm text-muted-foreground">
                  Confirmations, cancellations, and reminders
                </p>
              </div>
              <Switch
                id="booking_notifications"
                checked={preferences?.booking_notifications ?? true}
                onCheckedChange={(checked: boolean) =>
                  handleToggle("booking_notifications", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="message_notifications" className="font-medium">
                  New messages
                </Label>
                <p className="text-sm text-muted-foreground">
                  When someone sends you a message
                </p>
              </div>
              <Switch
                id="message_notifications"
                checked={preferences?.message_notifications ?? true}
                onCheckedChange={(checked: boolean) =>
                  handleToggle("message_notifications", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="payment_notifications" className="font-medium">
                  Payment notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Payments received, payouts, and refunds
                </p>
              </div>
              <Switch
                id="payment_notifications"
                checked={preferences?.payment_notifications ?? true}
                onCheckedChange={(checked: boolean) =>
                  handleToggle("payment_notifications", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="review_notifications" className="font-medium">
                  Reviews
                </Label>
                <p className="text-sm text-muted-foreground">
                  When someone leaves you a review
                </p>
              </div>
              <Switch
                id="review_notifications"
                checked={preferences?.review_notifications ?? true}
                onCheckedChange={(checked: boolean) =>
                  handleToggle("review_notifications", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label
                  htmlFor="verification_notifications"
                  className="font-medium"
                >
                  Verification updates
                </Label>
                <p className="text-sm text-muted-foreground">
                  Status changes for your verification
                </p>
              </div>
              <Switch
                id="verification_notifications"
                checked={preferences?.verification_notifications ?? true}
                onCheckedChange={(checked: boolean) =>
                  handleToggle("verification_notifications", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="equipment_notifications" className="font-medium">
                  Equipment activity
                </Label>
                <p className="text-sm text-muted-foreground">
                  When someone favorites your equipment or views milestones
                </p>
              </div>
              <Switch
                id="equipment_notifications"
                checked={preferences?.equipment_notifications ?? true}
                onCheckedChange={(checked: boolean) =>
                  handleToggle("equipment_notifications", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="promotion_notifications" className="font-medium">
                  Promotions & announcements
                </Label>
                <p className="text-sm text-muted-foreground">
                  Special offers and system announcements
                </p>
              </div>
              <Switch
                id="promotion_notifications"
                checked={preferences?.promotion_notifications ?? true}
                onCheckedChange={(checked: boolean) =>
                  handleToggle("promotion_notifications", checked)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Toast Popups */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Toast Popups
            </CardTitle>
            <CardDescription>
              Show popup notifications for important events
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="toast_critical" className="font-medium">
                  Critical notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Payments, payouts, and refunds
                </p>
              </div>
              <Switch
                id="toast_critical"
                checked={preferences?.toast_critical ?? true}
                onCheckedChange={(checked: boolean) =>
                  handleToggle("toast_critical", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="toast_high" className="font-medium">
                  High priority
                </Label>
                <p className="text-sm text-muted-foreground">
                  Booking confirmations and reviews
                </p>
              </div>
              <Switch
                id="toast_high"
                checked={preferences?.toast_high ?? true}
                onCheckedChange={(checked: boolean) =>
                  handleToggle("toast_high", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="toast_medium" className="font-medium">
                  Medium priority
                </Label>
                <p className="text-sm text-muted-foreground">
                  New messages and reminders
                </p>
              </div>
              <Switch
                id="toast_medium"
                checked={preferences?.toast_medium ?? false}
                onCheckedChange={(checked: boolean) =>
                  handleToggle("toast_medium", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="toast_low" className="font-medium">
                  Low priority
                </Label>
                <p className="text-sm text-muted-foreground">
                  Favorites and view milestones
                </p>
              </div>
              <Switch
                id="toast_low"
                checked={preferences?.toast_low ?? false}
                onCheckedChange={(checked: boolean) =>
                  handleToggle("toast_low", checked)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Quiet Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Quiet Hours
            </CardTitle>
            <CardDescription>
              Suppress toast popups during specific hours
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="quiet_hours_enabled" className="font-medium">
                  Enable quiet hours
                </Label>
                <p className="text-sm text-muted-foreground">
                  No toast notifications during these times
                </p>
              </div>
              <Switch
                id="quiet_hours_enabled"
                checked={preferences?.quiet_hours_enabled ?? false}
                onCheckedChange={(checked: boolean) =>
                  handleToggle("quiet_hours_enabled", checked)
                }
              />
            </div>

            {preferences?.quiet_hours_enabled && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quiet_hours_start" className="text-sm">
                      Start time
                    </Label>
                    <Input
                      id="quiet_hours_start"
                      type="time"
                      value={preferences?.quiet_hours_start ?? "22:00"}
                      onChange={(e) => {
                        void handleTimeChange("quiet_hours_start", e.target.value);
                      }}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="quiet_hours_end" className="text-sm">
                      End time
                    </Label>
                    <Input
                      id="quiet_hours_end"
                      type="time"
                      value={preferences?.quiet_hours_end ?? "07:00"}
                      onChange={(e) => {
                        void handleTimeChange("quiet_hours_end", e.target.value);
                      }}
                      className="mt-1"
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotificationsSettings;
