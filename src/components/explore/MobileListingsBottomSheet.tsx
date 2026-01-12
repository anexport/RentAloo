import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type SnapPoint = "closed" | "peek" | "mid" | "full";

type Props = {
  title: string;
  children: React.ReactNode;
  peekContent?: React.ReactNode; // Horizontal carousel for peek state
  defaultSnap?: SnapPoint;
  className?: string;
};

// Bottom nav bar height - sheet positions above this
const BOTTOM_NAV_HEIGHT = 64;

const CLOSED_HEIGHT_PX = 20;
const MID_HEIGHT_RATIO = 0.35;
const FULL_HEIGHT_RATIO = 0.85; // Google Maps allows almost full screen
const MIN_PEEK_PX = 140; // Taller peek to show more content like Google Maps
const MIN_SHEET_GROWTH_PX = 180;

// Google Maps iOS-style spring animation
const SPRING_TRANSITION = "transform 350ms cubic-bezier(0.32, 0.72, 0, 1)";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getViewportHeightPx = () =>
  window.visualViewport?.height ?? window.innerHeight;

const MobileListingsBottomSheet = ({
  title,
  children,
  peekContent,
  defaultSnap = "mid",
  className,
}: Props) => {
  const contentId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null); // For drag-to-scroll handoff

  const [snap, setSnap] = useState<SnapPoint>(defaultSnap);
  const [isDragging, setIsDragging] = useState(false); // For animated handle
  const snapRef = useRef<SnapPoint>(defaultSnap);

  const metricsRef = useRef<{
    closed: number;
    peek: number;
    mid: number;
    full: number;
  }>({
    closed: CLOSED_HEIGHT_PX,
    peek: MIN_PEEK_PX,
    mid: Math.round(getViewportHeightPx() * MID_HEIGHT_RATIO),
    full: Math.round(getViewportHeightPx() * FULL_HEIGHT_RATIO),
  });

  const visibleHeightRef = useRef(0);
  const dragRef = useRef<{
    pointerId: number | null;
    startY: number;
    startVisibleHeight: number;
    didMove: boolean;
    // Velocity tracking for flick gestures
    lastMoveTime: number;
    lastMoveY: number;
    velocity: number; // px/ms, positive = moving up (expanding), negative = moving down
  }>({
    pointerId: null,
    startY: 0,
    startVisibleHeight: 0,
    didMove: false,
    lastMoveTime: 0,
    lastMoveY: 0,
    velocity: 0,
  });

  const applyVisibleHeight = useCallback(
    (
      visibleHeight: number,
      opts?: { animate?: boolean; allowOverscroll?: boolean }
    ) => {
      const sheet = sheetRef.current;
      if (!sheet) return;

      const { closed, full } = metricsRef.current;

      // Apply rubberbanding when dragging past limits
      let nextVisible = visibleHeight;
      if (opts?.allowOverscroll) {
        const maxOverscroll = 60; // Max pixels of overscroll
        if (visibleHeight > full) {
          const overscroll = visibleHeight - full;
          const resistance = 1 - Math.min(overscroll / maxOverscroll, 0.8);
          nextVisible = full + overscroll * resistance * 0.3;
        } else if (visibleHeight < closed) {
          const overscroll = closed - visibleHeight;
          const resistance = 1 - Math.min(overscroll / maxOverscroll, 0.8);
          nextVisible = closed - overscroll * resistance * 0.3;
        }
      } else {
        nextVisible = clamp(visibleHeight, closed, full);
      }

      visibleHeightRef.current = nextVisible;

      // Sheet starts at bottom-0, so we need to account for bottom nav offset
      // When at full height, no offset needed (covers entire screen)
      // When at other heights, add BOTTOM_NAV_HEIGHT to float above bottom nav
      const bottomOffset = BOTTOM_NAV_HEIGHT;
      const totalHeight = full + bottomOffset + 60; // bottom nav space + overscroll

      sheet.style.height = `${totalHeight}px`;
      sheet.style.willChange = "transform";
      sheet.style.transition =
        opts?.animate === false ? "none" : SPRING_TRANSITION;

      // Transform: when visible height is small, push sheet down more (add bottom offset)
      // When at full height, minimal offset to cover entire screen
      sheet.style.transform = `translate3d(0, ${
        totalHeight - nextVisible - bottomOffset
      }px, 0)`;
    },
    []
  );

  const snapTo = useCallback(
    (nextSnap: SnapPoint, opts?: { animate?: boolean }) => {
      const { closed, peek, mid, full } = metricsRef.current;
      const targetHeight =
        nextSnap === "closed"
          ? closed
          : nextSnap === "peek"
          ? peek
          : nextSnap === "mid"
          ? mid
          : full;

      snapRef.current = nextSnap;
      setSnap(nextSnap);
      applyVisibleHeight(targetHeight, opts);
    },
    [applyVisibleHeight]
  );

  const recomputeMetrics = useCallback(() => {
    // Use full viewport height since we want to cover everything at full height
    const viewportHeight = getViewportHeightPx();
    const closed = CLOSED_HEIGHT_PX;
    const peek = MIN_PEEK_PX;

    // Full height should cover the entire viewport
    const rawFull = Math.round(viewportHeight * FULL_HEIGHT_RATIO);
    const full = Math.max(rawFull, peek + MIN_SHEET_GROWTH_PX);

    // Mid height positioned above bottom nav
    const rawMid = Math.round(
      (viewportHeight - BOTTOM_NAV_HEIGHT) * MID_HEIGHT_RATIO
    );
    const mid = clamp(rawMid, peek + 64, full - 64);

    metricsRef.current = { closed, peek, mid, full };

    const currentSnap = snapRef.current;
    const targetHeight =
      currentSnap === "closed"
        ? closed
        : currentSnap === "peek"
        ? peek
        : currentSnap === "mid"
        ? mid
        : full;
    applyVisibleHeight(targetHeight, { animate: false });
  }, [applyVisibleHeight]);

  useEffect(() => {
    snapRef.current = snap;
  }, [snap]);

  useLayoutEffect(() => {
    recomputeMetrics();
  }, [recomputeMetrics]);

  useEffect(() => {
    const handleResize = () => recomputeMetrics();
    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, [recomputeMetrics]);

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    setIsDragging(true);
    const now = performance.now();
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startVisibleHeight:
        visibleHeightRef.current || metricsRef.current[snapRef.current],
      didMove: false,
      lastMoveTime: now,
      lastMoveY: event.clientY,
      velocity: 0,
    };

    const sheet = sheetRef.current;
    if (sheet) sheet.style.transition = "none";

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (dragRef.current.pointerId !== event.pointerId) return;

    const now = performance.now();
    const deltaY = event.clientY - dragRef.current.startY;
    if (Math.abs(deltaY) > 6) dragRef.current.didMove = true;

    // Calculate velocity (smoothed)
    const timeDelta = now - dragRef.current.lastMoveTime;
    if (timeDelta > 0) {
      const moveDelta = dragRef.current.lastMoveY - event.clientY; // Positive = dragging up
      const instantVelocity = moveDelta / timeDelta;
      // Exponential smoothing
      dragRef.current.velocity =
        0.7 * dragRef.current.velocity + 0.3 * instantVelocity;
    }
    dragRef.current.lastMoveTime = now;
    dragRef.current.lastMoveY = event.clientY;

    // Calculate target height with rubberbanding
    const targetHeight = dragRef.current.startVisibleHeight - deltaY;
    applyVisibleHeight(targetHeight, { animate: false, allowOverscroll: true });
  };

  const finishDragOrToggle = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (dragRef.current.pointerId !== event.pointerId) return;
    setIsDragging(false);
    const velocity = dragRef.current.velocity;
    dragRef.current.pointerId = null;

    const { closed, peek, mid, full } = metricsRef.current;
    const currentVisible = visibleHeightRef.current;

    if (!dragRef.current.didMove) {
      // Toggle: closed→mid, peek→mid, mid→full, full→mid
      const nextSnap =
        snapRef.current === "closed"
          ? "mid"
          : snapRef.current === "peek"
          ? "mid"
          : snapRef.current === "mid"
          ? "full"
          : "mid";
      snapTo(nextSnap);
      return;
    }

    const snapPoints: Array<{ snap: SnapPoint; height: number }> = [
      { snap: "closed", height: closed },
      { snap: "peek", height: peek },
      { snap: "mid", height: mid },
      { snap: "full", height: full },
    ];

    // Velocity threshold for flick detection (px/ms)
    const VELOCITY_THRESHOLD = 0.4;

    // If velocity is high enough, snap in the direction of the flick
    if (Math.abs(velocity) > VELOCITY_THRESHOLD) {
      // Find current position in snap order
      const sortedSnaps = snapPoints.sort((a, b) => a.height - b.height);

      if (velocity > 0) {
        // Flicking up - snap to next higher point
        const nextHigher = sortedSnaps.find((s) => s.height > currentVisible);
        if (nextHigher) {
          snapTo(nextHigher.snap);
          return;
        }
      } else {
        // Flicking down - snap to next lower point
        const nextLower = [...sortedSnaps]
          .reverse()
          .find((s) => s.height < currentVisible);
        if (nextLower) {
          snapTo(nextLower.snap);
          return;
        }
      }
    }

    // Fall back to nearest snap point
    let nearest = snapPoints[0];
    for (const candidate of snapPoints) {
      if (
        Math.abs(candidate.height - currentVisible) <
        Math.abs(nearest.height - currentVisible)
      ) {
        nearest = candidate;
      }
    }

    snapTo(nearest.snap);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    const nextSnap =
      snapRef.current === "closed"
        ? "mid"
        : snapRef.current === "peek"
        ? "mid"
        : snapRef.current === "mid"
        ? "full"
        : "mid";
    snapTo(nextSnap);
  };

  const handleClose = () => {
    snapTo("peek");
  };

  const isExpanded = snap === "mid" || snap === "full";

  return (
    <div
      ref={sheetRef}
      className={cn(
        // Google Maps iOS style: larger radius, floating shadow, stronger blur
        // Position at bottom-0 to allow full screen coverage when expanded
        "fixed inset-x-0 bottom-0 z-40",
        "bg-background/98 backdrop-blur-xl",
        "rounded-t-[24px]",
        // Multi-layer shadow for floating effect like Google Maps
        "shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05),0_-10px_15px_-3px_rgba(0,0,0,0.08),0_-20px_40px_-4px_rgba(0,0,0,0.06)]",
        "flex flex-col",
        className
      )}
    >
      {/* Drag handle area - Google Maps style */}
      <button
        ref={handleRef}
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDragOrToggle}
        onPointerCancel={finishDragOrToggle}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex-shrink-0 touch-none select-none",
          "transition-[padding] duration-200",
          snap === "closed" ? "py-2" : "pt-3 pb-2"
        )}
        aria-label="Drag to view listings"
        aria-controls={contentId}
        aria-expanded={isExpanded}
      >
        {/* Animated drag handle - grows during active drag */}
        <div className="flex justify-center">
          <div
            className={cn(
              "rounded-full bg-muted-foreground/40 transition-all duration-200",
              snap === "closed"
                ? "w-10 h-1"
                : isDragging
                ? "w-12 h-[6px] bg-muted-foreground/60" // Larger when dragging
                : "w-9 h-[5px]"
            )}
          />
        </div>
      </button>

      {/* Header with title and close button - Google Maps style */}
      {/* At full height, add extra top padding for dynamic island */}
      {isExpanded && (
        <div
          className="flex items-center justify-between px-4 pb-3 border-b border-border/50"
          style={{
            paddingTop:
              snap === "full"
                ? "max(env(safe-area-inset-top), 12px)"
                : undefined,
          }}
        >
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <button
            type="button"
            onClick={handleClose}
            className={cn(
              "h-8 w-8 rounded-full",
              "flex items-center justify-center",
              "bg-muted/60 hover:bg-muted",
              "text-muted-foreground hover:text-foreground",
              "transition-colors duration-150",
              "-mr-1" // Optical alignment
            )}
            aria-label="Minimize sheet"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Horizontal card carousel - visible in all states including closed */}
      {peekContent && (
        <div
          className={cn(
            "px-4",
            snap === "peek" ? "pb-2" : "pb-3",
            snap === "full" && "border-b border-border/30"
          )}
        >
          {/* Only show title in peek state (mid/full have header with title) */}
          {snap === "peek" && (
            <span className="text-sm font-semibold text-foreground">
              {title}
            </span>
          )}
          {/* Horizontal carousel for quick access */}
          <div
            className={cn(
              "-mx-4 px-4 overflow-x-auto overscroll-x-contain",
              snap === "peek" ? "mt-2" : "mt-0"
            )}
          >
            <div
              className={cn("flex pb-2", snap === "full" ? "gap-2" : "gap-3")}
            >
              {peekContent}
            </div>
          </div>
        </div>
      )}

      {/* Content area with ref for drag-to-scroll handoff */}
      <div
        ref={contentRef}
        id={contentId}
        className={cn(
          "flex-1 min-h-0 overflow-y-auto overscroll-contain",
          "px-4 pb-4"
        )}
      >
        {children}
      </div>
    </div>
  );
};

export default MobileListingsBottomSheet;
