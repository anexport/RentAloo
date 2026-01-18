import { useAuth } from "@/hooks/useAuth";
import { useVerification } from "@/hooks/useVerification";
import { useUpcomingBookings } from "@/components/renter/hooks/useUpcomingBookings";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow, parseISO, type Locale } from "date-fns";
import { enUS, es, fr, de, it } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

// Map i18n language codes to date-fns locales
const getDateFnsLocale = (language: string) => {
  const localeMap: Record<string, Locale> = {
    en: enUS,
    es: es,
    fr: fr,
    de: de,
    it: it,
  };
  return localeMap[language] || enUS;
};

const WelcomeHero = () => {
  const { user } = useAuth();
  const { profile } = useVerification();
  const { data, isLoading } = useUpcomingBookings(user?.id);
  const { t } = useTranslation("dashboard");

  const upcomingCount = data?.count || 0;
  const nextRentalDate = data?.nextDate;

  // Get current language and corresponding date-fns locale
  const currentLanguage = i18n.language.split("-")[0]; // Handle "en-US" -> "en"
  const dateLocale = getDateFnsLocale(currentLanguage);

  // Get personalized greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t("renter.welcome.greeting_morning");
    if (hour < 17) return t("renter.welcome.greeting_afternoon");
    return t("renter.welcome.greeting_evening");
  };

  // Extract first name from email (fallback to translated "there" if not available)
  const getFirstName = () => {
    if (!user?.email) return t("renter.welcome.fallback_name");
    const emailName = user.email.split("@")[0];
    if (!emailName) return t("renter.welcome.fallback_name");
    const namePart = emailName.split(".")[0];
    return namePart.charAt(0).toUpperCase() + namePart.slice(1);
  };

  const firstName = getFirstName();
  const greeting = getGreeting();
  const isVerified = profile?.identityVerified;

  return (
    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary/10 via-primary/5 to-background shadow-lg">
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
      <CardContent className="relative p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Left: Greeting and Info */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/20 border-2 border-primary/30 shadow-md transition-transform hover:scale-105">
                <span className="text-headline-lg md:text-display-sm font-bold text-primary">
                  {firstName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-display-sm md:text-display-md lg:text-display-lg font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                  {greeting}, {firstName}!
                </h1>
                {isVerified && (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300 dark:border-green-700 shadow-sm"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {t("renter.welcome.verified_badge")}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Activity Summary */}
            {!isLoading && (
              <div className="space-y-2 pl-0 md:pl-24">
                {upcomingCount > 0 && nextRentalDate ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-sm md:text-base">
                      {(() => {
                        let formattedTime = "";
                        try {
                          const parsedDate = parseISO(nextRentalDate);
                          if (isNaN(parsedDate.getTime())) {
                            throw new Error("Invalid date");
                          }
                          formattedTime = formatDistanceToNow(parsedDate, {
                            addSuffix: true,
                            locale: dateLocale,
                          });
                        } catch {
                          // Fallback to empty string if date parsing/formatting fails
                          formattedTime = "";
                        }
                        return t("renter.welcome.upcoming_rentals", {
                          count: upcomingCount,
                          time: formattedTime,
                        });
                      })()}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-sm md:text-base">
                      {t("renter.welcome.empty_state")}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Visual Element (optional decorative) */}
          <div className="hidden md:block opacity-10">
            <div className="w-32 h-32 rounded-full bg-primary/20 blur-3xl animate-pulse" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WelcomeHero;
