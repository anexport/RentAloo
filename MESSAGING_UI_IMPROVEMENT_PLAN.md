Messaging Experience Revamp Plan
Context
Current interface locks the panel to h-[600px], resulting in cramped views and breakage on smaller screens.
Conversation list stacks multiple badges (status, last seen, booking info) without prioritizing key messaging signals like unread state or latest activity.
Chat header duplicates sidebar metadata and keeps all booking details visible, overwhelming users when they only want message context.
System events render as full-width alert cards, drawing attention away from the actual conversation thread.
Composer is visually light compared to surrounding elements and lacks affordances for quick actions (attachments, canned replies, etc.).
Objectives
Deliver a responsive layout that adapts from mobile to desktop while maximizing room for message content.
Prioritize key conversation signals (who, last activity, unread state) and demote secondary metadata (booking status, presence) into contextual surfaces.
Harmonize thread visuals so that system events inform without dominating, and regular text bubbles remain readable.
Modernize the composer to feel inviting and action-oriented, reducing friction for common actions.
Introduce supporting enhancements (search, filters, action shortcuts) that reduce context switching.
Workstreams & Tasks
1. Layout & Responsiveness
shadcn Components:

@shadcn/resizable - ResizablePanelGroup, ResizablePanel, ResizableHandle for desktop resizable split
@shadcn/sheet - Sheet, SheetContent, SheetTrigger for mobile drawer (side)
@shadcn/scroll-area - ScrollArea for all scrollable containers
Documentation:

Resizable: https://ui.shadcn.com/docs/components/resizable
Sheet: https://ui.shadcn.com/docs/components/sheet
ScrollArea: https://ui.shadcn.com/docs/components/scroll-area
Tasks:

Replace fixed h-[600px] container with viewport-aware sizing (min-h-[calc(100vh-...)]) and ensure the component can stretch within dashboard layouts.
Convert static w-1/3 split to responsive utilities:
Mobile (<md): Use Sheet component with side="left" to display conversation list as a drawer triggered by a button.
Tablet (md–lg): Use ResizablePanelGroup with direction="horizontal" and set sidebar to basis-2/5 with flexible message pane.
Desktop (>=xl): Use ResizablePanelGroup with optional resizable splitter allowing wider message column (flex-[3]).
Wrap all scrollable containers (conversation list, message thread) with ScrollArea component instead of overflow-y-auto.
Introduce CSS Grid layout primitives to support toggling sidebar visibility and easier future additions (search/filter header).
Verify ScrollArea containers use height: 100% without inline style overrides.
Files to modify:

src/components/messaging/MessagingInterface.tsx - Main layout component
src/components/messaging/ConversationList.tsx - Wrapped in ScrollArea
2. Conversation List Modernization
shadcn Components:

@shadcn/card - Card, CardContent for conversation items
@shadcn/avatar - Avatar, AvatarFallback for participant display
@shadcn/badge - Badge for booking status chips (subtle variant)
@shadcn/separator - Separator for visual grouping
@shadcn/empty - Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription for empty states
@shadcn/skeleton - Skeleton for loading states
@shadcn/command - Command, CommandInput, CommandList, CommandEmpty, CommandItem for search
@shadcn/popover - Popover, PopoverContent, PopoverTrigger for search dropdown
@shadcn/tooltip - Tooltip for hover details (presence, last seen)
@shadcn/select - Select, SelectContent, SelectItem, SelectTrigger, SelectValue for filter dropdown
Documentation:

Card: https://ui.shadcn.com/docs/components/card
Avatar: https://ui.shadcn.com/docs/components/avatar
Badge: https://ui.shadcn.com/docs/components/badge
Separator: https://ui.shadcn.com/docs/components/separator
Empty: https://ui.shadcn.com/docs/components/empty
Skeleton: https://ui.shadcn.com/docs/components/skeleton
Command: https://ui.shadcn.com/docs/components/command
Popover: https://ui.shadcn.com/docs/components/popover
Tooltip: https://ui.shadcn.com/docs/components/tooltip
Select: https://ui.shadcn.com/docs/components/select
Tasks:

Redesign each conversation row using Card component with hover states emphasizing: participant name, last message preview, relative timestamp.
Move booking status into a subtle Badge variant displayed only if the conversation is tied to a booking; use Tooltip for detailed info on hover.
Replace stacked badges with typography cues:
Bold + accent bar (using border-l-4 border-primary) for unread conversations.
Dimmed text (text-muted-foreground) for read threads.
Optional unread pill Badge with numeric count.
Add a top toolbar with Command component wrapped in Popover for search functionality, Select for filter dropdown (All / Unread / Bookings), and "New Conversation" or "Back" button for mobile.
Ensure presence indicator is either a small dot aligned with the Avatar or moved into Tooltip on hover to reduce clutter.
Use Empty component for empty states with appropriate icon and message.
Use Skeleton components for loading states instead of custom animations.
Use Separator for day/time grouping within conversation list.
Files to modify:

src/components/messaging/ConversationList.tsx - Complete redesign
src/components/messaging/MessagingInterface.tsx - Add search/filter toolbar
3. Chat Header Simplification
shadcn Components:

@shadcn/avatar - Avatar, AvatarFallback, AvatarImage for participant display
@shadcn/badge - Badge for role chip and status
@shadcn/tooltip - Tooltip for presence and action buttons
@shadcn/dropdown-menu - DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger for contextual actions
@shadcn/button - Button, ButtonIcon for action buttons
@shadcn/breadcrumb - Breadcrumb, BreadcrumbItem, BreadcrumbLink (optional) for multiple participants
Documentation:

Avatar: https://ui.shadcn.com/docs/components/avatar
Badge: https://ui.shadcn.com/docs/components/badge
Tooltip: https://ui.shadcn.com/docs/components/tooltip
DropdownMenu: https://ui.shadcn.com/docs/components/dropdown-menu
Button: https://ui.shadcn.com/docs/components/button
Breadcrumb: https://ui.shadcn.com/docs/components/breadcrumb
Tasks:

Consolidate metadata into two concise rows:
Row 1: Avatar, participant name, optional role Badge, presence dot.
Row 2: "Regarding booking X" link + status Badge if applicable; fallback to last seen text.
Add contextual actions on the right using DropdownMenu with icon Button triggers and Tooltip labels (e.g., View Booking, Open Contract, Mark as unread).
Collapse long titles with Tooltip and use Breadcrumb when multiple entities participate.
On mobile, provide a back Button that surfaces the conversation list Sheet drawer.
Files to modify:

src/components/messaging/MessagingInterface.tsx - Chat header section
4. Message Thread Visual Cohesion
shadcn Components:

@shadcn/scroll-area - ScrollArea for message thread container
@shadcn/separator - Separator for day changes and message grouping
@shadcn/card - Card, CardContent for system messages (refactored design)
@shadcn/avatar - Avatar for sender avatars (optional, for group chats)
@shadcn/alert - Alert, AlertDescription (optional) for critical system messages
Documentation:

ScrollArea: https://ui.shadcn.com/docs/components/scroll-area
Separator: https://ui.shadcn.com/docs/components/separator
Card: https://ui.shadcn.com/docs/components/card
Avatar: https://ui.shadcn.com/docs/components/avatar
Alert: https://ui.shadcn.com/docs/components/alert
Tasks:

Wrap message thread in ScrollArea component for smooth scrolling.
Keep standard message bubbles but adjust spacing and max width for improved readability (e.g., max-w-[min(70%,36rem)]).
Refactor system messages to use a slimmer Card variant:
Neutral background (bg-muted) and left accent border (border-l-4) to differentiate without overwhelming.
Inline icon only for critical states; otherwise rely on text formatting.
Ensure accessibility semantics (aria-live, descriptive text).
Introduce message grouping by sender/time using Separator component:
Compact timestamp shown for the first message in a cluster.
Subtle Separator for day changes with date label.
Confirm typing indicator positioning stays anchored at the bottom and doesn't shift message history.
Use Avatar component for sender display in group conversations (if applicable).
Files to modify:

src/components/messaging/MessagingInterface.tsx - Message thread container
src/components/messaging/MessageBubble.tsx - System message refactor
5. Composer Enhancements
shadcn Components:

@shadcn/card - Card, CardContent for raised composer surface
@shadcn/textarea - Textarea with auto-resize functionality
@shadcn/input-group - InputGroup, InputGroupTextarea, InputGroupAddon, InputGroupButton for enhanced input
@shadcn/button - Button with icon variants for actions
@shadcn/tooltip - Tooltip for action button labels
@shadcn/popover - Popover, PopoverContent, PopoverTrigger for quick templates/emojis
@shadcn/spinner - Spinner for sending state
@shadcn/alert - Alert, AlertDescription for send error states
Documentation:

Card: https://ui.shadcn.com/docs/components/card
Textarea: https://ui.shadcn.com/docs/components/textarea
InputGroup: https://ui.shadcn.com/docs/components/input-group
Button: https://ui.shadcn.com/docs/components/button
Tooltip: https://ui.shadcn.com/docs/components/tooltip
Popover: https://ui.shadcn.com/docs/components/popover
Spinner: https://ui.shadcn.com/docs/components/spinner
Alert: https://ui.shadcn.com/docs/components/alert
Tasks:

Wrap the composer in a Card component with raised surface (shadow-sm, bg-card, rounded corners) to separate it from the thread.
Use InputGroup with InputGroupTextarea for auto-height growth up to a sensible max (max-h-[200px]), and add placeholder guidance (e.g., "Ask about availability…").
Place action icons (attachment, emoji picker, quick templates) using Button with icon variants to the left of the send button, wrapped in Popover for templates/emojis.
Ensure all action buttons have Tooltip labels and are keyboard-accessible.
Provide sending state feedback using Spinner inside the send button, temporary disabled state on the Button.
Surface send failures with inline Alert component with retry action.
Review validation and accessibility: announce errors, ensure ARIA labels on send button, and support Cmd/Ctrl+Enter shortcut.
Files to modify:

src/components/messaging/MessageInput.tsx - Complete redesign with InputGroup
6. Supplemental Improvements
shadcn Components:

@shadcn/command - CommandDialog for conversation search (Cmd/Ctrl+K shortcut)
@shadcn/input - Input for search field
@shadcn/popover - Popover for filter dropdowns
@shadcn/select - Select for filter state persistence
@shadcn/dialog - Dialog for booking details view
@shadcn/button - Button for quick actions
Documentation:

Command: https://ui.shadcn.com/docs/components/command (CommandDialog example)
Input: https://ui.shadcn.com/docs/components/input
Popover: https://ui.shadcn.com/docs/components/popover
Select: https://ui.shadcn.com/docs/components/select
Dialog: https://ui.shadcn.com/docs/components/dialog
Button: https://ui.shadcn.com/docs/components/button
Tasks:

Implement conversation search using CommandDialog component with Cmd/Ctrl+K keyboard shortcut; handle empty states gracefully using CommandEmpty.
Add filter state alongside unread count badges using Select component; persist user preference in URL query or local storage.
Explore quick actions within header using Dialog component:
View Booking Details opens existing booking panel.
Create Invoice or Schedule Pickup shortcuts if relevant.
Audit dark mode styles to ensure contrast remains consistent with new Card and Badge surfaces.
Files to create/modify:

New component: src/components/messaging/ConversationSearch.tsx - CommandDialog wrapper
src/components/messaging/MessagingInterface.tsx - Add search and filter integration
7. Technical & Delivery Considerations
shadcn Components to install:

Run the following CLI commands to add missing components:

npx shadcn@latest add resizable
npx shadcn@latest add sheet
npx shadcn@latest add scroll-area
npx shadcn@latest add separator
npx shadcn@latest add empty
npx shadcn@latest add command
npx shadcn@latest add popover
npx shadcn@latest add input-group
npx shadcn@latest add spinner
npx shadcn@latest add tooltip
npx shadcn@latest add dropdown-menu
Documentation:

CLI Installation: https://ui.shadcn.com/docs/cli
All Components: https://ui.shadcn.com/docs/components
Tasks:

Factor out reusable layout and card primitives into dedicated components to reduce duplication between renter/owner views.
Introduce storybook (if available) or visual regression tests for conversation list and message bubbles to validate styling.
Document new design tokens or class names in README or design system notes.
Plan QA checklist: viewport coverage (mobile portrait to desktop), unread state toggling, booking vs non-booking conversations, sending errors, system event rendering.
Coordinate with backend for any new metadata (e.g., last message preview, unread counts per conversation) before UI dependency.
Files to create:

src/components/messaging/shared/ConversationListItem.tsx - Reusable conversation row
src/components/messaging/shared/SystemMessage.tsx - Reusable system message component
Milestones
M1 – Responsive Shell: layout refactor with ResizablePanelGroup and Sheet, mobile drawer, ScrollArea fixes.
M2 – Conversation List UX: new row design with Card and Badge, Command search, Select filters, unread handling.
M3 – Chat Header & Thread Styling: metadata consolidation with Avatar and Badge, system event refactor with Card, message grouping with Separator.
M4 – Composer & Extras: enhanced composer with InputGroup and Card, quick actions with Popover, error handling with Alert.
M5 – QA & Polishing: cross-browser review, accessibility audit, documentation update.
Open Questions
Do we need role-specific variants (owner vs renter) or can a unified layout serve both personas?  not for now 
system events remain within the message history
Are attachment uploads and rich content (images, documents) in scope for this iteration? later implement
How do unread counts sync with notifications panel and quick actions — do we need backend updates to support the new UI states? investigate on this 


Next Steps
Install missing shadcn/ui components using CLI commands listed above.
Begin implementation following milestone order, ensuring each stage lands behind feature flags if necessary.