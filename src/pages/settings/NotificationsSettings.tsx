import { useTranslation } from "react-i18next";
import { Bell, Volume2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/useToast";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import PageShell from "@/components/layout/PageShell";
import { ContentCard, ContentCardHeader, ContentCardContent } from "@/components/ui/ContentCard";
import { CardSkeleton } from "@/components/ui/PageSkeleton";
import DashboardLayout from "@/components/layout/DashboardLayout";
import type { NotificationPreferences } from "@/types/notification";

// ============================================================================
// COMPONENT
// ============================================================================

const NotificationsSettings = () => {
  const { t } = useTranslation("common");
  const { preferences, loading, error, updatePreferences, refetch } =
    useNotificationPreferences();

  const handleToggle = async (
    key: keyof NotificationPreferences,
    value: boolean
  ) => {
    const success = await updatePreferences({ [key]: value });
    if (success) {
      toast({
        title: t("notifications.settings.updated"),
        description: t("notifications.settings.updated_description"),
      });
    } else {
      toast({
        title: t("notifications.settings.error"),
        description: t("notifications.settings.error_description"),
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
        title: t("notifications.settings.quiet_hours_updated"),
        description: t("notifications.settings.quiet_hours_updated_description"),
      });
    } else {
      toast({
        title: t("notifications.settings.error"),
        description: t("notifications.settings.quiet_hours_error_description"),
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <PageShell
          title={t("notifications.settings.title")}
          description={t("notifications.settings.description")}
          icon={Bell}
        >
          <div className="max-w-3xl mx-auto space-y-6">
            <CardSkeleton lines={6} />
            <CardSkeleton lines={4} />
            <CardSkeleton lines={3} />
          </div>
        </PageShell>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <PageShell
          title={t("notifications.settings.title")}
          description={t("notifications.settings.description")}
          icon={Bell}
        >
          <div className="max-w-3xl mx-auto">
            <ContentCard className="py-12 text-center">
              <p className="text-destructive">
                {t("notifications.settings.load_error", {
                  defaultValue: "Failed to load notification settings. Please try again."
                })}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => void refetch()}
              >
                {t("buttons.retry", { defaultValue: "Try again" })}
              </Button>
            </ContentCard>
          </div>
        </PageShell>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageShell
        title={t("notifications.settings.title")}
        description={t("notifications.settings.description")}
        icon={Bell}
      >
        <div className="max-w-3xl mx-auto space-y-6">
          {/* In-App Notifications */}
          <ContentCard>
            <ContentCardHeader
              title={
                <span className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  {t("notifications.settings.in_app.title")}
                </span>
              }
              description={t("notifications.settings.in_app.description")}
            />
            <ContentCardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="booking_notifications" className="font-medium">
                  {t("notifications.settings.categories.booking.label")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("notifications.settings.categories.booking.description")}
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
                  {t("notifications.settings.categories.message.label")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("notifications.settings.categories.message.description")}
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
                  {t("notifications.settings.categories.payment.label")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("notifications.settings.categories.payment.description")}
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
                  {t("notifications.settings.categories.review.label")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("notifications.settings.categories.review.description")}
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
                  {t("notifications.settings.categories.verification.label")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("notifications.settings.categories.verification.description")}
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
                  {t("notifications.settings.categories.equipment.label")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("notifications.settings.categories.equipment.description")}
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
                  {t("notifications.settings.categories.promotion.label")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("notifications.settings.categories.promotion.description")}
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
            </ContentCardContent>
          </ContentCard>

          {/* Toast Popups */}
          <ContentCard>
            <ContentCardHeader
              title={
                <span className="flex items-center gap-2">
                  <Volume2 className="h-5 w-5 text-primary" />
                  {t("notifications.settings.toast.title")}
                </span>
              }
              description={t("notifications.settings.toast.description")}
            />
            <ContentCardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="toast_critical" className="font-medium">
                  {t("notifications.settings.priority.critical.label")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("notifications.settings.priority.critical.description")}
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
                  {t("notifications.settings.priority.high.label")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("notifications.settings.priority.high.description")}
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
                  {t("notifications.settings.priority.medium.label")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("notifications.settings.priority.medium.description")}
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
                  {t("notifications.settings.priority.low.label")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("notifications.settings.priority.low.description")}
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
            </ContentCardContent>
          </ContentCard>

          {/* Quiet Hours */}
          <ContentCard>
            <ContentCardHeader
              title={
                <span className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  {t("notifications.settings.quiet_hours.title")}
                </span>
              }
              description={t("notifications.settings.quiet_hours.description")}
            />
            <ContentCardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="quiet_hours_enabled" className="font-medium">
                  {t("notifications.settings.quiet_hours.enable")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("notifications.settings.quiet_hours.enable_description")}
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
                      {t("notifications.settings.quiet_hours.start_time")}
                    </Label>
                    <Input
                      id="quiet_hours_start"
                      type="time"
                      defaultValue={preferences?.quiet_hours_start ?? "22:00"}
                      onBlur={(e) => {
                        void handleTimeChange("quiet_hours_start", e.target.value);
                      }}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="quiet_hours_end" className="text-sm">
                      {t("notifications.settings.quiet_hours.end_time")}
                    </Label>
                    <Input
                      id="quiet_hours_end"
                      type="time"
                      defaultValue={preferences?.quiet_hours_end ?? "07:00"}
                      onBlur={(e) => {
                        void handleTimeChange("quiet_hours_end", e.target.value);
                      }}
                      className="mt-1"
                    />
                  </div>
                </div>
              </>
            )}
            </ContentCardContent>
          </ContentCard>
        </div>
      </PageShell>
    </DashboardLayout>
  );
};

export default NotificationsSettings;
