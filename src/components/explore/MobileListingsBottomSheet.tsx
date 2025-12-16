import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type SnapPoint = "closed" | "peek" | "mid" | "full";

type Props = {
  title: string;
  children: React.ReactNode;
  defaultSnap?: SnapPoint;
  className?: string;
};

const CLOSED_HEIGHT_PX = 16; // Just a tiny sliver visible to pull back up
const MID_HEIGHT_RATIO = 0.28;
const FULL_HEIGHT_RATIO = 0.6;
// 48px base + 64px for mobile bottom nav = 112px minimum peek height
const MIN_PEEK_PX = 112;
const MIN_SHEET_GROWTH_PX = 180;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getViewportHeightPx = () =>
  window.visualViewport?.height ?? window.innerHeight;

const MobileListingsBottomSheet = ({
  title,
  children,
  defaultSnap = "mid",
  className,
}: Props) => {
  const contentId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);

  const [snap, setSnap] = useState<SnapPoint>(defaultSnap);
  const snapRef = useRef<SnapPoint>(defaultSnap);

  const metricsRef = useRef<{ closed: number; peek: number; mid: number; full: number }>({
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
  }>({ pointerId: null, startY: 0, startVisibleHeight: 0, didMove: false });

  const applyVisibleHeight = useCallback(
    (visibleHeight: number, opts?: { animate?: boolean }) => {
      const sheet = sheetRef.current;
      if (!sheet) return;

      const { closed, full } = metricsRef.current;
      const nextVisible = clamp(visibleHeight, closed, full);
      visibleHeightRef.current = nextVisible;

      sheet.style.height = `${full}px`;
      sheet.style.willChange = "transform";
      sheet.style.transition =
        opts?.animate === false ? "none" : "transform 200ms ease";
      sheet.style.transform = `translate3d(0, ${full - nextVisible}px, 0)`;
    },
    []
  );

  const snapTo = useCallback(
    (nextSnap: SnapPoint, opts?: { animate?: boolean }) => {
      const { closed, peek, mid, full } = metricsRef.current;
      const targetHeight =
        nextSnap === "closed" ? closed :
        nextSnap === "peek" ? peek : 
        nextSnap === "mid" ? mid : full;

      snapRef.current = nextSnap;
      setSnap(nextSnap);
      applyVisibleHeight(targetHeight, opts);
    },
    [applyVisibleHeight]
  );

  const recomputeMetrics = useCallback(() => {
    const viewportHeight = getViewportHeightPx();
    const closed = CLOSED_HEIGHT_PX;
    const peek = MIN_PEEK_PX;

    const rawFull = Math.round(viewportHeight * FULL_HEIGHT_RATIO);
    const full = Math.max(rawFull, peek + MIN_SHEET_GROWTH_PX);

    const rawMid = Math.round(viewportHeight * MID_HEIGHT_RATIO);
    const mid = clamp(rawMid, peek + 64, full - 64);

    metricsRef.current = { closed, peek, mid, full };

    const currentSnap = snapRef.current;
    const targetHeight =
      currentSnap === "closed" ? closed :
      currentSnap === "peek" ? peek : 
      currentSnap === "mid" ? mid : full;
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

    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startVisibleHeight:
        visibleHeightRef.current || metricsRef.current[snapRef.current],
      didMove: false,
    };

    const sheet = sheetRef.current;
    if (sheet) sheet.style.transition = "none";

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (dragRef.current.pointerId !== event.pointerId) return;

    const deltaY = event.clientY - dragRef.current.startY;
    if (Math.abs(deltaY) > 6) dragRef.current.didMove = true;

    const { closed, full } = metricsRef.current;
    const nextVisible = clamp(
      dragRef.current.startVisibleHeight - deltaY,
      closed,
      full
    );
    applyVisibleHeight(nextVisible, { animate: false });
  };

  const finishDragOrToggle = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (dragRef.current.pointerId !== event.pointerId) return;
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

    const candidates: Array<{ snap: SnapPoint; height: number }> = [
      { snap: "closed", height: closed },
      { snap: "peek", height: peek },
      { snap: "mid", height: mid },
      { snap: "full", height: full },
    ];

    let nearest = candidates[0];
    for (const candidate of candidates) {
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

  return (
    <div
      ref={sheetRef}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 bg-background/95 backdrop-blur border-t border-border rounded-t-2xl shadow-lg flex flex-col",
        className
      )}
    >
      <button
        ref={handleRef}
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDragOrToggle}
        onPointerCancel={finishDragOrToggle}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex-shrink-0 touch-none select-none flex flex-col items-center",
          snap === "closed" ? "h-4 justify-center" :
          snap === "peek" ? "h-12 justify-center" : "pt-3 pb-2"
        )}
        aria-label="Drag to view listings"
        aria-controls={contentId}
        aria-expanded={snap !== "peek" && snap !== "closed"}
      >
        <div className={cn(
          "rounded-full bg-muted-foreground/30",
          snap === "closed" ? "w-16 h-1" : "w-12 h-1"
        )} />
        {snap !== "peek" && snap !== "closed" && (
          <div className="text-center mt-2 text-sm font-semibold">{title}</div>
        )}
      </button>

      <div
        id={contentId}
        className={cn(
          "flex-1 min-h-0 overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] overscroll-contain",
          (snap === "peek" || snap === "closed") && "pointer-events-none"
        )}
      >
        {children}
      </div>
    </div>
  );
};

export default MobileListingsBottomSheet;
