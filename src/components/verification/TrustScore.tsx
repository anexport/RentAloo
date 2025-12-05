import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Shield,
  Star,
  Calendar,
  Clock,
  CheckCircle,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import type { TrustScore as TrustScoreType } from "@/types/verification";
import {
  getTrustScoreColor,
  getTrustScoreLabel,
} from "@/lib/verification";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

type TrustScoreProps = {
  score: TrustScoreType;
  showBreakdown?: boolean;
  compact?: boolean;
  className?: string;
};

const SCORE_COMPONENTS = [
  {
    key: "verification" as const,
    label: "Verification",
    icon: Shield,
    max: 30,
    description: "Identity, email, phone verification",
  },
  {
    key: "reviews" as const,
    label: "Reviews",
    icon: Star,
    max: 25,
    description: "Average rating from past rentals",
  },
  {
    key: "completedBookings" as const,
    label: "Completed Bookings",
    icon: CheckCircle,
    max: 20,
    description: "Successfully completed rentals",
  },
  {
    key: "responseTime" as const,
    label: "Response Time",
    icon: Clock,
    max: 15,
    description: "Average response to messages",
  },
  {
    key: "accountAge" as const,
    label: "Account Age",
    icon: Calendar,
    max: 10,
    description: "Time since account creation",
  },
];

// Circular progress component
const CircularProgress = ({
  value,
  size = 160,
  strokeWidth = 12,
  className,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  const prefersReducedMotion = usePrefersReducedMotion();

  // Color based on score
  const getProgressColor = (score: number) => {
    if (score >= 80) return "stroke-green-500 dark:stroke-green-400";
    if (score >= 60) return "stroke-blue-500 dark:stroke-blue-400";
    if (score >= 40) return "stroke-amber-500 dark:stroke-amber-400";
    return "stroke-red-500 dark:stroke-red-400";
  };

  return (
    <svg
      width={size}
      height={size}
      className={cn("transform -rotate-90", className)}
    >
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        className="stroke-muted"
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className={cn(
          getProgressColor(value),
          !prefersReducedMotion && "transition-all duration-700 ease-out"
        )}
      />
    </svg>
  );
};

const TrustScore = ({
  score,
  showBreakdown = true,
  compact = false,
  className,
}: TrustScoreProps) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const isZeroScore = score.overall === 0;
  const isExcellent = score.overall >= 80;

  const getScoreBackground = () => {
    if (score.overall >= 80) return "bg-green-50 dark:bg-green-950/30";
    if (score.overall >= 60) return "bg-blue-50 dark:bg-blue-950/30";
    if (score.overall >= 40) return "bg-amber-50 dark:bg-amber-950/30";
    return "bg-red-50 dark:bg-red-950/30";
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <div className="relative">
          <CircularProgress value={score.overall} size={48} strokeWidth={5} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn("text-sm font-bold", getTrustScoreColor(score.overall))}>
              {score.overall}
            </span>
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Trust Score</p>
          <p className={cn("text-xs font-medium", getTrustScoreColor(score.overall))}>
            {getTrustScoreLabel(score.overall)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Trust Score</CardTitle>
              <CardDescription className="text-xs">
                Your reputation in the community
              </CardDescription>
            </div>
          </div>
          {isExcellent && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30">
              <Sparkles className="h-3 w-3 text-green-600 dark:text-green-400" />
              <span className="text-[10px] font-semibold text-green-700 dark:text-green-400">
                TOP RATED
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Circular Score Display */}
        <div
          className={cn(
            "relative flex flex-col items-center justify-center py-6 rounded-2xl transition-colors",
            getScoreBackground(),
            isZeroScore && !prefersReducedMotion && "animate-pulse"
          )}
        >
          <div className="relative">
            <CircularProgress value={score.overall} size={140} strokeWidth={10} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={cn(
                  "text-4xl font-bold tabular-nums",
                  getTrustScoreColor(score.overall)
                )}
              >
                {score.overall}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">
                out of 100
              </span>
            </div>
          </div>

          <div className="mt-4 text-center">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold",
                getTrustScoreColor(score.overall),
                getScoreBackground()
              )}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              {getTrustScoreLabel(score.overall)}
            </span>
          </div>
        </div>

        {/* Score Breakdown */}
        {showBreakdown && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">
                Score Breakdown
              </h4>
              <span className="text-xs text-muted-foreground tabular-nums">
                {SCORE_COMPONENTS.reduce((acc, c) => acc + score.components[c.key], 0)}/
                {SCORE_COMPONENTS.reduce((acc, c) => acc + c.max, 0)} points
              </span>
            </div>

            <div className="space-y-3">
              {SCORE_COMPONENTS.map((component) => {
                const Icon = component.icon;
                const value = score.components[component.key];
                const percentage = (value / component.max) * 100;

                const getBarColor = (pct: number) => {
                  if (pct >= 80) return "[&>div]:bg-green-500 dark:[&>div]:bg-green-400";
                  if (pct >= 60) return "[&>div]:bg-blue-500 dark:[&>div]:bg-blue-400";
                  if (pct >= 40) return "[&>div]:bg-amber-500 dark:[&>div]:bg-amber-400";
                  return "[&>div]:bg-red-500 dark:[&>div]:bg-red-400";
                };

                return (
                  <div key={component.key} className="group">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "p-1 rounded-md transition-colors",
                            "bg-muted group-hover:bg-primary/10"
                          )}
                        >
                          <Icon className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <span className="text-xs font-medium text-foreground">
                          {component.label}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-foreground tabular-nums">
                        {value}/{component.max}
                      </span>
                    </div>
                    <Progress
                      value={percentage}
                      className={cn("h-1.5", getBarColor(percentage))}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tips Section */}
        {score.overall < 100 && (
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-foreground">
                  Boost your score
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {score.components.verification < 30
                    ? "Complete identity verification to gain up to +30 points instantly!"
                    : score.components.reviews < 25
                    ? "Complete more rentals and get positive reviews to increase your score."
                    : "Keep up the great work! Maintain fast response times."}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrustScore;
