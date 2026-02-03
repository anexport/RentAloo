import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  userName?: string;
  className?: string;
}

export const TypingIndicator = ({
  userName,
  className,
}: TypingIndicatorProps) => {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge variant="secondary" className="text-xs font-normal">
        <Loader2 className="h-3 w-3 animate-spin mr-1" />
        {userName ? `${userName} is typing...` : "Typing..."}
      </Badge>
    </div>
  );
};
