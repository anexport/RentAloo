import { Lightbulb, TrendingUp, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type TipVariant = "tip" | "boost" | "info";

interface SmartTipProps {
  children: React.ReactNode;
  variant?: TipVariant;
  className?: string;
}

const variantConfig: Record<
  TipVariant,
  { icon: typeof Lightbulb; bg: string; border: string; iconColor: string }
> = {
  tip: {
    icon: Lightbulb,
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  boost: {
    icon: TrendingUp,
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  info: {
    icon: Info,
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
};

export default function SmartTip({ children, variant = "tip", className }: SmartTipProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border",
        config.bg,
        config.border,
        className
      )}
    >
      <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", config.iconColor)} />
      <p className="text-sm text-foreground/80 leading-relaxed">{children}</p>
    </div>
  );
}
