import * as React from "react"

import { cn } from "@/lib/utils"

const InputGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "bg-background text-foreground flex w-full flex-wrap items-center gap-2 rounded-xl border border-border px-3 py-2 shadow-sm",
      className
    )}
    {...props}
  />
))
InputGroup.displayName = "InputGroup"

const InputGroupTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "placeholder:text-muted-foreground flex-1 resize-none bg-transparent text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
))
InputGroupTextarea.displayName = "InputGroupTextarea"

const InputGroupAdornment = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center gap-1 text-sm text-muted-foreground", className)}
    {...props}
  />
))
InputGroupAdornment.displayName = "InputGroupAdornment"

export { InputGroup, InputGroupTextarea, InputGroupAdornment }
