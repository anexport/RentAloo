import * as React from "react"
import {
  PanelGroup,
  Panel,
  PanelResizeHandle,
  type PanelGroupProps,
  type PanelProps,
  type PanelResizeHandleProps,
} from "react-resizable-panels"

import { cn } from "@/lib/utils"

const ResizablePanelGroup = React.forwardRef<
  HTMLDivElement,
  PanelGroupProps
>(({ className, ...props }, ref) => (
  <PanelGroup
    ref={ref}
    className={cn(
      "data-[panel-group-direction=horizontal]:flex data-[panel-group-direction=horizontal]:h-full data-[panel-group-direction=vertical]:flex data-[panel-group-direction=vertical]:w-full",
      className
    )}
    {...props}
  />
))
ResizablePanelGroup.displayName = "ResizablePanelGroup"

const ResizablePanel = React.forwardRef<HTMLDivElement, PanelProps>(
  ({ className, ...props }, ref) => (
    <Panel
      ref={ref}
      className={cn("flex-1", className)}
      {...props}
    />
  )
)
ResizablePanel.displayName = "ResizablePanel"

const ResizableHandle = React.forwardRef<
  HTMLDivElement,
  PanelResizeHandleProps & { withHandle?: boolean }
>(({ className, withHandle = true, ...props }, ref) => (
  <PanelResizeHandle
    ref={ref}
    className={cn(
      "bg-border relative flex w-px items-center justify-center transition-colors data-[panel-group-direction=vertical]:my-1 data-[panel-group-direction=vertical]:h-1 data-[panel-group-direction=horizontal]:mx-1 data-[panel-group-direction=horizontal]:w-1 data-[panel-group-direction=vertical]:w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      withHandle &&
        "after:bg-border after:absolute after:h-6 after:w-1 after:rounded-full after:content-[''] data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-6",
      className
    )}
    {...props}
  />
))
ResizableHandle.displayName = "ResizableHandle"

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
