import * as React from "react"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const Spinner = React.forwardRef<
  SVGSVGElement,
  React.ComponentPropsWithoutRef<typeof Loader2>
>(({ className, ...props }, ref) => (
  <Loader2
    ref={ref}
    className={cn("animate-spin text-muted-foreground", className)}
    {...props}
  />
))
Spinner.displayName = "Spinner"

export { Spinner }
