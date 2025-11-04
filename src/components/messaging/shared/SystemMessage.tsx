import { formatDistanceToNow } from "date-fns";
import { Info, CheckCircle, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

type SystemMessageTone = "info" | "success" | "danger";

interface SystemMessageProps {
  content: string;
  createdAt?: string | null;
  tone?: SystemMessageTone;
}

const toneStyles: Record<
  SystemMessageTone,
  { icon: typeof Info; container: string; timestamp: string }
> = {
  info: {
    icon: Info,
    container: "border-border/50 bg-card/70 text-foreground",
    timestamp: "text-muted-foreground",
  },
  success: {
    icon: CheckCircle,
    container:
      "border-emerald-200/80 bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100",
    timestamp: "text-emerald-700/80 dark:text-emerald-200/70",
  },
  danger: {
    icon: XCircle,
    container:
      "border-rose-200/80 bg-rose-50 text-rose-900 dark:bg-rose-500/10 dark:text-rose-100",
    timestamp: "text-rose-700/80 dark:text-rose-200/70",
  },
};

export const SystemMessage = ({
  content,
  createdAt,
  tone = "info",
}: SystemMessageProps) => {
  const { icon: Icon, container, timestamp } = toneStyles[tone];

  let formatted = "";
  if (createdAt) {
    try {
      formatted = formatDistanceToNow(new Date(createdAt), {
        addSuffix: true,
      });
    } catch (error) {
      console.error("Error formatting system message timestamp:", error);
      formatted = "";
    }
  }

  return (
    <div className="flex justify-center py-2">
      <div
        className={cn(
          "flex max-w-2xl items-start gap-3 rounded-2xl border px-4 py-3 shadow-sm",
          container
        )}
        role="note"
        aria-live="polite"
      >
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-1 text-sm leading-6">
          <p>{content}</p>
          {formatted && <p className={cn("text-xs", timestamp)}>{formatted}</p>}
        </div>
      </div>
    </div>
  );
};
